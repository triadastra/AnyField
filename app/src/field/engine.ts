import glassWGSL from './glass.wgsl?raw'
import sceneWGSL from './scene.wgsl?raw'
import { hsl2rgb } from './color'
import type { RenderMode } from './types'
import type { Facet, Post } from '../compose/types'
import { featurize } from '../compose/featurize'
import { P, similarity, absorb } from '../compose/router'
import { resolveSong, spotifyTrackUrl, spotifySearchUrl } from '../media/music'
import { ulid } from 'ulid'
import { loadField, putPost, putFacet, putWeather, type PostRecord } from '../store/db'

const MAXI = 64 // rendered glass instances

// Default look (owner request): pure clear solid glass — real refraction only,
// no frost mist, no facet tint, no rim/border highlights. Now a live setting
// (profile panel → "Clear glass"), persisted in the local store.

// one glass instance for the renderer. topScale/botScale (0..1, default 1) shrink
// the rounded corners on that edge — used to fuse rapid-fire bubbles flush together.
type Inst = {
  x: number
  y: number
  hw: number
  hh: number
  hue: number
  sat: number
  light: number
  glow: number
  topScale?: number
  botScale?: number
  recede?: number // 0 = crisp foreground glass, 1 = melted into the backdrop
}

// left-aligned chat geometry
const LEFT = 12
const AV = 17 // avatar radius
const GAP = 8

// sent within this long of the previous post → rapid burst (Instagram/iMessage-
// style grouping): clustered together, ignoring facet — timing, not topic, decides.
const RAPID_MS = 1200

// "5 min ago" / "3 hr ago" / "2 days ago" — coarsest tier that fits
function ago(at: number): string {
  const m = (Date.now() - at) / 60000
  if (m < 1) return 'just now'
  if (m < 60) return Math.floor(m) + ' min ago'
  if (m < 1440) return Math.floor(m / 60) + ' hr ago'
  return Math.floor(m / 1440) + (m < 2880 ? ' day ago' : ' days ago')
}
function stamp(at: number): string {
  return new Date(at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/**
 * The Field engine — a left-aligned rising glass chat (WeChat-like).
 * Each post is classified into a facet (§8, for tint + linking), then laid out
 * as a glass bubble hugging the left edge. New posts float up from the dock and
 * the column scrolls upward; drag or wheel scrolls back through history. Songs
 * render as glass cover-blocks with a title.
 */
export class Engine {
  mode: RenderMode = '2d'
  onMode?: (m: RenderMode) => void
  onFirstPost?: () => void
  onStats?: (s: { facets: number; mood: string }) => void
  private lastStats = 0

  private posts: Post[] = []
  private facets: Facet[] = []
  private fseq = 0
  private raf = 0
  private t0 = performance.now()
  private posted = false

  private W = { val: 0.15, aro: 0.12, vuln: 0 } // emotional weather EMA (§2)

  // live settings + owner avatar (profile panel; persisted by App, not here)
  private clearGlass = true
  private weatherTint = true
  private avatar = '🦊'
  private showTimes = false

  // drag/wheel scroll through history: 0 = pinned live (bottom); + reveals older posts
  private scrollY = 0
  private maxScroll = 0
  private dragging = false
  private dragStartY = 0
  private dragStartScroll = 0

  private readonly mc = document.createElement('canvas').getContext('2d')!
  private readonly elMap = new Map<string, HTMLDivElement>()

  // song preview playback (one shared player)
  private readonly audio = new Audio()
  private playingId: string | null = null

  // WebGPU state
  private device?: GPUDevice
  private ctx?: GPUCanvasContext
  private pipe?: GPURenderPipeline       // glass pass (refracts the scene texture)
  private scenePipe?: GPURenderPipeline  // scene pass (paints the backdrop)
  private glassBind?: GPUBindGroup
  private sceneBind?: GPUBindGroup
  private uBuf?: GPUBuffer
  private iBuf?: GPUBuffer
  private samp?: GPUSampler
  private sceneTex?: GPUTexture
  private sceneView?: GPUTextureView
  private texW = 0
  private texH = 0
  private readonly sceneFmt: GPUTextureFormat = 'rgba8unorm'
  private uArr!: Float32Array<ArrayBuffer>
  private iArr!: Float32Array<ArrayBuffer>

  // Canvas2D fallback state
  private c2d?: CanvasRenderingContext2D
  private granite?: HTMLCanvasElement

  constructor(private canvas: HTMLCanvasElement, private labels: HTMLElement) {
    this.mc.font = '600 14px -apple-system,system-ui,sans-serif'
    this.audio.addEventListener('ended', () => (this.playingId = null))
    this.bindScroll()
  }

  // ---- drag/wheel scroll: pan the camera back through history ----
  private bindScroll(): void {
    const el = this.canvas
    el.style.touchAction = 'none'
    el.addEventListener('pointerdown', (e) => {
      this.dragging = true
      this.dragStartY = e.clientY
      this.dragStartScroll = this.scrollY
      el.setPointerCapture(e.pointerId)
    })
    el.addEventListener('pointermove', (e) => {
      if (!this.dragging) return
      // drag down (finger/cursor moves down) reveals older posts above, like iMessage
      const dy = e.clientY - this.dragStartY
      this.scrollY = Math.min(Math.max(this.dragStartScroll + dy, 0), this.maxScroll)
    })
    const endDrag = () => (this.dragging = false)
    el.addEventListener('pointerup', endDrag)
    el.addEventListener('pointercancel', endDrag)
    el.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault()
        // scroll up (deltaY<0) reveals history; scroll down returns toward live
        this.scrollY = Math.min(Math.max(this.scrollY - e.deltaY, 0), this.maxScroll)
      },
      { passive: false },
    )
  }

  // ---- lifecycle ----
  async init(): Promise<void> {
    this.resize()
    let ok = false
    try {
      ok = await this.initGPU()
    } catch {
      ok = false
    }
    this.mode = ok ? 'gpu' : '2d'
    this.onMode?.(this.mode)
    await this.restore()
  }

  // ---- restore the field from the local store (IndexedDB, §9) ----
  private async restore(): Promise<void> {
    try {
      const { posts, facets, weather } = await loadField()
      if (weather) this.W = weather
      this.facets = facets.map((f) => ({ ...f, members: [] }))
      // facet ids are 'f<n>' — keep the counter past everything restored
      for (const f of this.facets) {
        const n = /^f(\d+)$/.exec(f.id)
        if (n) this.fseq = Math.max(this.fseq, Number(n[1]) + 1)
      }
      const nowP = performance.now()
      const nowE = Date.now()
      this.posts = posts.map((r) => ({
        ...r,
        x: 0,
        y: 0,
        tx: 0,
        ty: 0,
        lead: false,
        born: nowP - (nowE - r.at), // age carries over; old posts don't re-glow
      }))
      if (this.posts.length) {
        this.posted = true
        this.onFirstPost?.()
        this.layout()
        for (const p of this.posts) {
          p.y = p.ty // snap — no reflow animation on load
          p.x = p.tx
        }
        // a song saved before its metadata resolved: finish the job now
        for (const p of this.posts) {
          if (p.kind === 'song' && !p.coverUrl) this.enrichSong(p)
        }
      }
    } catch {
      // a broken/blocked IndexedDB must never keep the field from opening
    }
  }

  applySettings(s: { clearGlass: boolean; weatherTint: boolean }): void {
    this.clearGlass = s.clearGlass
    this.weatherTint = s.weatherTint
  }

  setAvatar(emoji: string): void {
    if (emoji.trim()) this.avatar = emoji.trim()
  }

  setShowTimes(v: boolean): void {
    this.showTimes = v
  }

  // strip transient layout, keep the permanent identity (store shape)
  private toRecord(p: Post): PostRecord {
    const { x: _x, y: _y, tx: _tx, ty: _ty, lead: _lead, born: _born, ...rec } = p
    return rec
  }

  start(): void {
    const loop = () => {
      this.frame()
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop(): void {
    cancelAnimationFrame(this.raf)
    this.audio.pause()
    for (const [, e] of this.elMap) e.remove()
    this.elMap.clear()
  }

  resize(): void {
    const w = Math.round(this.W_())
    const h = Math.round(this.H_())
    this.canvas.width = w
    this.canvas.height = h
    this.canvas.style.width = w + 'px'
    this.canvas.style.height = h + 'px'
  }

  // ---- input: featurize → route → append a glass post ----
  spawn(text: string): void {
    if (!text.trim()) return
    if (!this.posted) {
      this.posted = true
      this.onFirstPost?.()
    }
    const feat = featurize(text)
    this.W.val = this.W.val * 0.85 + feat.affect.valence * 0.15
    this.W.aro = this.W.aro * 0.85 + feat.affect.arousal * 0.15
    this.W.vuln = this.W.vuln * 0.88 + feat.affect.vulnerability * 0.12

    // classify to nearest facet (for tint + linking)
    let best: Facet | null = null
    let bestSim = -1
    for (const f of this.facets) {
      const s = similarity(f, feat)
      if (s > bestSim) {
        bestSim = s
        best = f
      }
    }
    let facet: Facet
    if (best && bestSim >= P.TAU_NEW) facet = best
    else if (this.facets.length >= P.MAX_FACETS && best) facet = best
    else {
      facet = this.makeFacet(feat)
      this.facets.push(facet)
    }
    absorb(facet, feat)

    // song? "🎵 Title — Artist" or a pasted Spotify track link
    const trimmed = text.trim()
    const spUrl = spotifyTrackUrl(trimmed)
    const isSong = /^🎵/.test(trimmed) || !!spUrl
    let title: string | undefined
    let artist: string | undefined
    if (isSong) {
      let body = trimmed.replace(/^🎵\s*/, '')
      if (spUrl) body = body.replace(spUrl, '').trim()
      const parts = body.split(/\s+[—-]\s+/)
      title = parts[0] || undefined
      artist = parts[1]
    }

    const maxW = Math.min(280, this.availW())
    let w: number
    let h: number
    if (isSong) {
      // square cover across the top + title/artist underneath
      w = Math.min(maxW, 212)
      h = w - 28 + 78
    } else {
      const raw = this.measure(text)
      const lines = Math.max(1, Math.ceil((raw + 4) / (maxW - 40)))
      w = Math.min(maxW, raw + 40)
      h = lines * 19 + 24
    }

    const prev = this.posts[this.posts.length - 1]
    const born = performance.now()
    // rapid burst, independent of facet — a fast double-tap fuses regardless of topic
    const rapid = !!prev && born - prev.born < RAPID_MS
    const post: Post = {
      id: ulid(),
      kind: isSong ? 'song' : 'text',
      text,
      title,
      artist,
      hue: feat.hue,
      sat: feat.sat,
      facetId: facet.id,
      linkUrl: spUrl || (isSong && title ? spotifySearchUrl([title, artist].filter(Boolean).join(' ')) : undefined),
      w,
      h,
      x: this.gutterL() + w / 2, // layout takes it to its collage slot
      y: this.botY() + h, // starts below the dock, floats up
      tx: this.gutterL() + w / 2,
      ty: this.botY() - h / 2,
      lead: false,
      at: Date.now(),
      born,
      connectPrev: !!prev && prev.facetId === facet.id && !rapid,
      attachPrev: rapid,
      attachNext: false,
    }
    this.posts.push(post)
    if (rapid && prev) prev.attachNext = true
    this.scrollY = 0 // sending always jumps back to live, like any chat app

    // persist: the post (verbatim), the facet's drifted centroid, the weather.
    // Fire-and-forget — the glass never waits on the disk.
    putPost(this.toRecord(post))
    if (rapid && prev) putPost(this.toRecord(prev)) // attachNext changed
    putFacet(facet)
    putWeather(this.W)

    if (isSong) this.enrichSong(post, spUrl)
  }

  // enrich a song card with real cover art + a playable preview (display-only;
  // post.text stays verbatim), then persist what resolved
  private enrichSong(post: Post, spUrl?: string | null): void {
    resolveSong({ title: post.title, artist: post.artist, spotifyUrl: spUrl ?? spotifyTrackUrl(post.text.trim()) })
      .then((m) => {
        if (m.cover) post.coverUrl = m.cover
        if (m.preview) post.previewUrl = m.preview
        if (m.link) post.linkUrl = m.link
        if (!post.title && m.title) post.title = m.title
        if (!post.artist && m.artist) post.artist = m.artist
        putPost(this.toRecord(post))
      })
      .catch(() => {})
  }

  private togglePlay(p: Post): void {
    if (this.playingId === p.id) {
      this.audio.pause()
      this.playingId = null
      return
    }
    if (!p.previewUrl) {
      if (p.linkUrl) window.open(p.linkUrl, '_blank', 'noopener')
      return
    }
    this.audio.src = p.previewUrl
    this.playingId = p.id
    this.audio.play().catch(() => (this.playingId = null))
  }

  private makeFacet(feat: ReturnType<typeof featurize>): Facet {
    return {
      id: 'f' + this.fseq++,
      label: feat.topicLabel || feat.tokens.find((t) => t[0] !== '#') || '…',
      topic: feat.topic,
      topics: {},
      tokenList: [],
      hue: feat.hue,
      sat: feat.sat,
      mass: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 0,
      members: [],
    }
  }

  // ---- helpers ----
  private W_() {
    return document.documentElement.clientWidth
  }
  private H_() {
    return document.documentElement.clientHeight
  }
  private botY() {
    return this.H_() - 138
  }
  // left edge of the collage column (right of the fixed avatar gutter)
  private gutterL() {
    return LEFT + AV * 2 + GAP
  }
  // typesettable width — the full remaining span of the screen
  private availW() {
    return this.W_() - this.gutterL() - 12
  }
  private measure(text: string) {
    let mw = 0
    for (const ln of text.split('\n')) mw = Math.max(mw, this.mc.measureText(ln).width)
    return mw
  }
  // per-post geometry: x now comes from the collage slot; avatars keep a fixed column
  private geom(p: Post) {
    return { avatarCX: LEFT + AV, cx: p.x }
  }

  // screen-space y for a post: its eased stack position, shifted by the scroll
  // camera. Kept out of the p.y/p.ty easing itself so dragging tracks 1:1
  // instead of lagging through the stack-reflow filter.
  private sy(p: Post): number {
    return p.y + this.scrollY
  }

  // how far a pill at screen-y has melted into the backdrop: crisp near the
  // dock (the eternal present), fully background by the upper reaches — the
  // risen collage reads as a painting, not floating UI (§2, pillar 2)
  private recede(y: number): number {
    const t = (this.botY() - y) / Math.max(1, this.botY() - 60) // 0 at dock → 1 at top
    const r = Math.min(1, Math.max(0, (t - 0.3) / 0.55))
    return r * r * (3 - 2 * r) // smoothstep
  }

  // ---- layout: collage typesetting ----
  // Related messages use the whole width: consecutive same-facet posts (and
  // rapid bursts, regardless of facet) form a CLUSTER. Within a cluster,
  // follow-ups flow to the RIGHT of their anchor like words in a line of type,
  // wrap when the width runs out, and every wrapped line except the last is
  // justified across the full span — a typeset paragraph of glass. Clusters
  // stack chronologically from the bottom, newest lowest.
  private layout() {
    const availW = this.availW()
    const gutterL = this.gutterL()
    const ITEM_GAP = 8
    const ROW_GAP = 8
    const CLUSTER_GAP = 20

    // group consecutive posts: a rapid burst always attaches; else same facet
    const clusters: Post[][] = []
    for (const p of this.posts) {
      const cur = clusters[clusters.length - 1]
      const prev = cur?.[cur.length - 1]
      if (prev && (p.attachPrev || p.facetId === prev.facetId)) cur.push(p)
      else clusters.push([p])
      p.lead = false
    }

    type Row = { items: Post[]; w: number; h: number }
    let cursor = this.botY() // bottom edge of the newest cluster
    for (let c = clusters.length - 1; c >= 0; c--) {
      const cluster = clusters[c]
      // typeset into rows, chronological left→right
      const rows: Row[] = []
      let row: Row = { items: [], w: 0, h: 0 }
      for (const p of cluster) {
        if (row.items.length && row.w + ITEM_GAP + p.w > availW) {
          rows.push(row)
          row = { items: [], w: 0, h: 0 }
        }
        row.w += (row.items.length ? ITEM_GAP : 0) + p.w
        row.h = Math.max(row.h, p.h)
        row.items.push(p)
      }
      rows.push(row)

      const totalH = rows.reduce((s, r) => s + r.h, 0) + (rows.length - 1) * ROW_GAP
      let top = cursor - totalH // rows read top→bottom inside the cluster
      for (let ri = 0; ri < rows.length; ri++) {
        const r = rows[ri]
        // justify every wrapped line except the paragraph's last
        const justify = rows.length > 1 && ri < rows.length - 1 && r.items.length > 1
        const gap = justify ? ITEM_GAP + (availW - r.w) / (r.items.length - 1) : ITEM_GAP
        let x = gutterL
        for (const p of r.items) {
          p.tx = x + p.w / 2
          p.ty = top + r.h / 2 // items center on their line, like inline blocks
          x += p.w + gap
        }
        top += r.h + ROW_GAP
      }
      cluster[0].lead = true // the anchor carries the avatar
      cursor -= totalH + CLUSTER_GAP
    }

    // how far you can drag/scroll into history before the very first post hits the top
    const oldestTop = this.posts.length ? this.posts[0].ty - this.posts[0].h / 2 : this.botY()
    this.maxScroll = Math.max(0, 70 - oldestTop)
    this.scrollY = Math.min(Math.max(this.scrollY, 0), this.maxScroll)
    for (const p of this.posts) {
      p.y += (p.ty - p.y) * 0.14
      p.x += (p.tx - p.x) * 0.14
    }
  }

  private visible(): Post[] {
    const top = -80
    const bot = this.H_() + 80
    const out: Post[] = []
    for (let i = this.posts.length - 1; i >= 0 && out.length < 30; i--) {
      const p = this.posts[i]
      const y = this.sy(p)
      if (y > top && y < bot) out.push(p)
    }
    return out.reverse()
  }

  private frame() {
    const now = performance.now()
    const time = (now - this.t0) / 1000
    this.layout()
    try {
      if (this.mode === 'gpu') this.drawGPU(time)
      else this.drawCanvas()
    } catch {
      // never let a render error kill the loop
    }
    this.drawLabels(now)
    if (now - this.lastStats > 400) {
      this.lastStats = now
      this.onStats?.({ facets: this.facets.length, mood: this.mood() })
    }
  }

  private mood(): string {
    if (this.weather().a > 0.28) return 'storm'
    if (this.W.aro > 0.55) return 'excited'
    if (this.W.val < -0.15) return 'wistful'
    if (this.W.aro < 0.2) return 'calm'
    return 'content'
  }
  private weather(): { r: number; g: number; b: number; a: number } {
    const storm = Math.max(0, (this.W.aro - 0.45) * 1.4) * Math.max(0, (-this.W.val + 0.1) * 1.2)
    const hue = this.W.val > 0 ? 40 : 2 + (1 - Math.min(1, -this.W.val)) * 30
    const [r, g, b] = hsl2rgb(hue, 0.6, 0.5)
    return { r, g, b, a: Math.min(1, storm) }
  }

  // ---- build the glass instance list (shared by GPU + Canvas) ----
  private buildInstances(now: number): Inst[] {
    const vis = this.visible()
    const list: Inst[] = []
    for (const p of vis) {
      const g = this.geom(p)
      const y = this.sy(p)
      const age = Math.min(1, (now - p.born) / 2500)
      const glow = (1 - age) * 0.5
      const rec = this.recede(y)
      // bubble / card — relatedness reads spatially now (collage adjacency),
      // so no connector beads and no fused vertical seams
      list.push({
        x: g.cx,
        y,
        hw: p.w / 2,
        hh: p.h / 2,
        hue: p.hue,
        sat: Math.min(1, p.sat + 0.05),
        light: 0.63,
        glow,
        recede: rec,
      })
      if (p.kind === 'song') {
        // square album cover across the card's top (art rendered on the glass)
        const cs = (p.w - 28) / 2
        list.push({ x: g.cx, y: y - p.h / 2 + 14 + cs, hw: cs, hh: cs, hue: p.hue, sat: Math.min(1, p.sat + 0.2), light: 0.55, glow: 0.8, recede: rec })
      }
      // avatar — clear warm glass, only on a cluster's anchor post
      if (p.lead) list.push({ x: g.avatarCX, y, hw: AV, hh: AV, hue: 32, sat: 0.18, light: 0.78, glow: 0.25, recede: rec })
    }
    return list.slice(0, MAXI)
  }

  // ---- WebGPU ----
  private async initGPU(): Promise<boolean> {
    try {
      if (!navigator.gpu) return false
      const adapter = await navigator.gpu.requestAdapter()
      if (!adapter) return false
      this.device = await adapter.requestDevice()
      this.device.lost.then(() => {
        this.mode = '2d'
        this.onMode?.('2d')
      })
      const fmt = navigator.gpu.getPreferredCanvasFormat()
      const mod = this.device.createShaderModule({ code: glassWGSL })
      const sceneMod = this.device.createShaderModule({ code: sceneWGSL })
      for (const [name, m] of [['glass', mod], ['scene', sceneMod]] as const) {
        const info = await m.getCompilationInfo()
        if (info.messages.some((msg) => msg.type === 'error')) {
          console.warn(`WGSL compile errors (${name}):`, info.messages)
          return false
        }
      }
      this.pipe = await this.device.createRenderPipelineAsync({
        layout: 'auto',
        vertex: { module: mod, entryPoint: 'vs' },
        fragment: { module: mod, entryPoint: 'fs', targets: [{ format: fmt }] },
        primitive: { topology: 'triangle-list' },
      })
      this.scenePipe = await this.device.createRenderPipelineAsync({
        layout: 'auto',
        vertex: { module: sceneMod, entryPoint: 'vs' },
        fragment: { module: sceneMod, entryPoint: 'fs', targets: [{ format: this.sceneFmt }] },
        primitive: { topology: 'triangle-list' },
      })
      const ctx = this.canvas.getContext('webgpu')
      if (!ctx) return false
      this.ctx = ctx
      ctx.configure({ device: this.device, format: fmt, alphaMode: 'opaque' })
      this.uArr = new Float32Array(new ArrayBuffer(24 * 4)) // res,time,dpr | weather | mat | mat2 | n
      this.iArr = new Float32Array(new ArrayBuffer(MAXI * 12 * 4)) // a | c | m(topScale,botScale,_,_)
      this.uBuf = this.device.createBuffer({ size: this.uArr.byteLength, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
      this.iBuf = this.device.createBuffer({ size: this.iArr.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST })
      this.samp = this.device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge',
      })
      // scene pass only needs the uniforms + instances; glass pass also samples the scene texture
      this.sceneBind = this.device.createBindGroup({
        layout: this.scenePipe.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.uBuf } },
          { binding: 1, resource: { buffer: this.iBuf } },
        ],
      })
      this.ensureTargets()
      return true
    } catch (e) {
      console.warn('WebGPU init failed, using Canvas2D:', e instanceof Error ? e.message : e)
      return false
    }
  }

  // (re)create the offscreen scene texture + glass bind group when the size changes
  private ensureTargets() {
    const { device, pipe, uBuf, iBuf, samp } = this
    if (!device || !pipe || !uBuf || !iBuf || !samp) return
    const w = this.canvas.width
    const h = this.canvas.height
    if (this.sceneTex && this.texW === w && this.texH === h) return
    this.texW = w
    this.texH = h
    this.sceneTex?.destroy()
    this.sceneTex = device.createTexture({
      size: [Math.max(1, w), Math.max(1, h)],
      format: this.sceneFmt,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    })
    this.sceneView = this.sceneTex.createView()
    this.glassBind = device.createBindGroup({
      layout: pipe.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uBuf } },
        { binding: 1, resource: { buffer: iBuf } },
        { binding: 2, resource: samp },
        { binding: 3, resource: this.sceneView },
      ],
    })
  }

  private drawGPU(time: number) {
    this.ensureTargets()
    const { device, ctx, pipe, scenePipe, glassBind, sceneBind, sceneView, uBuf, iBuf, uArr, iArr } = this
    if (!device || !ctx || !pipe || !scenePipe || !glassBind || !sceneBind || !sceneView || !uBuf || !iBuf) return
    const list = this.buildInstances(performance.now())
    iArr.fill(0)
    list.forEach((it, i) => {
      const [r, g, b] = hsl2rgb(it.hue, it.sat, it.light)
      const o = i * 12
      iArr[o] = it.x
      iArr[o + 1] = it.y
      iArr[o + 2] = it.hw
      iArr[o + 3] = it.hh
      iArr[o + 4] = r
      iArr[o + 5] = g
      iArr[o + 6] = b
      iArr[o + 7] = it.glow
      iArr[o + 8] = it.topScale ?? 1
      iArr[o + 9] = it.botScale ?? 1
      iArr[o + 10] = it.recede ?? 0
    })
    const w = this.weather()
    if (!this.weatherTint) w.a = 0 // tint muted; mood stays honest in the header
    // res, time, dpr
    uArr[0] = this.canvas.width
    uArr[1] = this.canvas.height
    uArr[2] = time
    uArr[3] = 1
    // weather rgb + storminess
    uArr[4] = w.r
    uArr[5] = w.g
    uArr[6] = w.b
    uArr[7] = w.a
    // mat: ior, dispersion, thickness(px), bevel(px)
    uArr[8] = 1.34
    uArr[9] = 0.042
    uArr[10] = 46
    uArr[11] = 24
    // mat2: frost, spec, fresnel, dome (clear mode: no mist, no fresnel rim)
    uArr[12] = this.clearGlass ? 0 : 0.2
    uArr[13] = 0.75
    uArr[14] = this.clearGlass ? 0 : 0.75
    uArr[15] = 0.55
    // n: count, clear mode
    uArr[16] = list.length
    uArr[17] = this.clearGlass ? 1 : 0
    device.queue.writeBuffer(uBuf, 0, uArr)
    device.queue.writeBuffer(iBuf, 0, iArr)

    const enc = device.createCommandEncoder()
    // pass 1 — paint the backdrop into the offscreen scene texture
    const scenePass = enc.beginRenderPass({
      colorAttachments: [{ view: sceneView, clearValue: { r: 0.9, g: 0.9, b: 0.89, a: 1 }, loadOp: 'clear', storeOp: 'store' }],
    })
    scenePass.setPipeline(scenePipe)
    scenePass.setBindGroup(0, sceneBind)
    scenePass.draw(3)
    scenePass.end()
    // pass 2 — refract the scene texture as glass, straight to the canvas
    const glassPass = enc.beginRenderPass({
      colorAttachments: [
        { view: ctx.getCurrentTexture().createView(), clearValue: { r: 0.91, g: 0.91, b: 0.9, a: 1 }, loadOp: 'clear', storeOp: 'store' },
      ],
    })
    glassPass.setPipeline(pipe)
    glassPass.setBindGroup(0, glassBind)
    glassPass.draw(3)
    glassPass.end()
    device.queue.submit([enc.finish()])
  }

  // ---- Canvas2D fallback ----
  private makeGranite(w: number, h: number) {
    // warm white marble: soft gradient + wandering warm veins + faint grain
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d')!
    const grd = g.createLinearGradient(0, 0, w, h)
    grd.addColorStop(0, '#f7f5f2')
    grd.addColorStop(1, '#ece8e2')
    g.fillStyle = grd
    g.fillRect(0, 0, w, h)
    for (let v = 0; v < 7; v++) {
      let x = Math.random() * w
      let y = Math.random() * h * 0.3
      g.strokeStyle = `rgba(178,164,146,${0.1 + Math.random() * 0.14})`
      g.lineWidth = 0.8 + Math.random() * 1.6
      g.beginPath()
      g.moveTo(x, y)
      while (y < h + 40) {
        const nx = x + (Math.random() - 0.5) * 90
        const ny = y + 50 + Math.random() * 90
        g.quadraticCurveTo(x + (Math.random() - 0.5) * 60, (y + ny) / 2, nx, ny)
        x = nx
        y = ny
      }
      g.stroke()
    }
    for (let i = 0; i < (w * h) / 700; i++) {
      g.fillStyle = Math.random() > 0.5 ? 'rgba(190,180,165,0.08)' : 'rgba(255,255,255,0.16)'
      g.beginPath()
      g.arc(Math.random() * w, Math.random() * h, Math.random() * 1.2, 0, 7)
      g.fill()
    }
    return c
  }

  private drawCanvas() {
    if (!this.c2d) this.c2d = this.canvas.getContext('2d')!
    const g = this.c2d
    const w = this.canvas.width
    const h = this.canvas.height
    if (!this.granite || this.granite.width !== w || this.granite.height !== h) this.granite = this.makeGranite(w, h)
    g.drawImage(this.granite, 0, 0)
    const wc = this.weather()
    if (this.weatherTint && wc.a > 0.02) {
      g.fillStyle = `rgba(${(wc.r * 255) | 0},${(wc.g * 255) | 0},${(wc.b * 255) | 0},${wc.a * 0.12})`
      g.fillRect(0, 0, w, h)
    }
    for (const it of this.buildInstances(performance.now())) {
      const [r, gg, b] = hsl2rgb(it.hue, it.sat, 0.62).map((v) => (v * 255) | 0)
      const rec = it.recede ?? 0
      const keep = 1 - rec // foreground presence
      const x = it.x - it.hw
      const y = it.y - it.hh
      const w2 = it.hw * 2
      const h2 = it.hh * 2
      const rad = Math.min(it.hw, it.hh, 26)
      const rTop = rad * (it.topScale ?? 1)
      const rBot = rad * (it.botScale ?? 1)
      g.save()
      // receded glass sits IN the backdrop: shadow and body fade away together
      g.shadowColor = `rgba(40,44,60,${0.22 * keep})`
      g.shadowBlur = 14 * keep
      g.shadowOffsetY = 6 * keep
      this.rrectTB(g, x, y, w2, h2, rTop, rBot)
      g.fillStyle = this.clearGlass ? `rgba(255,255,255,${0.3 * (1 - 0.5 * rec)})` : `rgba(255,255,255,${0.5 * (1 - 0.5 * rec)})`
      g.fill()
      g.restore()
      if (!this.clearGlass) {
        this.rrectTB(g, x, y, w2, h2, rTop, rBot)
        const grd = g.createLinearGradient(x, y, x, y + h2)
        grd.addColorStop(0, `rgba(${r},${gg},${b},${0.44 * (1 - 0.55 * rec)})`)
        grd.addColorStop(1, `rgba(${r},${gg},${b},${0.22 * (1 - 0.55 * rec)})`)
        g.fillStyle = grd
        g.fill()
        g.lineWidth = 1.1
        g.strokeStyle = `rgba(255,255,255,${0.7 * keep})`
        this.rrectTB(g, x + 0.6, y + 0.6, w2 - 1.2, h2 - 1.2, rTop, rBot)
        g.stroke()
      }
    }
  }

  // rounded rect with independent top/bottom corner radii — used to flatten
  // the seam where rapid-burst bubbles fuse together
  private rrectTB(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rTop: number, rBot: number) {
    rTop = Math.min(rTop, w / 2, h / 2)
    rBot = Math.min(rBot, w / 2, h / 2)
    g.beginPath()
    g.moveTo(x + rTop, y)
    g.arcTo(x + w, y, x + w, y + rTop, rTop)
    g.arcTo(x + w, y + h, x + w - rBot, y + h, rBot)
    g.arcTo(x, y + h, x, y + h - rBot, rBot)
    g.arcTo(x, y, x + rTop, y, rTop)
    g.closePath()
  }

  // ---- DOM overlay: verbatim text, left-aligned; song titles; avatars ----
  private ov(id: string, cls: string): HTMLDivElement {
    let e = this.elMap.get(id)
    if (!e) {
      e = document.createElement('div')
      e.className = 'ov ' + cls
      this.labels.appendChild(e)
      this.elMap.set(id, e)
    }
    return e
  }

  private drawLabels(now: number) {
    const alive = new Set<string>()
    const vis = this.visible()
    for (const p of vis) {
      const g = this.geom(p)
      const y = this.sy(p)
      const age = Math.min(1, (now - p.born) / 9000)
      const rec = this.recede(y)
      // text sinks with its glass: fades + softly defocuses into the painting,
      // still readable when you scroll it back down (nothing is ever gone)
      const fade = (o: number) => String(o * (1 - 0.72 * rec))
      const soften = rec > 0.02 ? `blur(${(rec * 2.2).toFixed(2)}px)` : ''

      // avatar — only on a cluster's anchor post
      if (p.lead) {
        const aid = 'a' + p.id
        alive.add(aid)
        const ae = this.ov(aid, 'avatar')
        if (ae.dataset.av !== this.avatar) {
          ae.dataset.av = this.avatar
          const s = document.createElement('span')
          s.className = 'in'
          s.textContent = this.avatar
          ae.replaceChildren(s)
        }
        ae.style.transform = `translate(${g.avatarCX}px,${y}px) translate(-50%,-50%)`
        ae.style.opacity = fade(1)
        ae.style.filter = soften
      }

      // timestamp — relative tier + absolute, shown while the 🕒 toggle is on
      if (this.showTimes) {
        const tid = 't' + p.id
        alive.add(tid)
        const te = this.ov(tid, 'ts')
        const label = ago(p.at) + ' · ' + stamp(p.at)
        if (te.textContent !== label) te.textContent = label
        te.style.transform = `translate(${g.cx}px,${y + p.h / 2 + 11}px) translate(-50%,-50%)`
        te.style.opacity = String(1 - 0.45 * rec) // stays a bit more legible than its glass
      }

      const bid = 'b' + p.id
      alive.add(bid)
      if (p.kind === 'song') {
        const e = this.ov(bid, 'song')
        if (!e.dataset.init) {
          e.dataset.init = '1'
          e.innerHTML = `<span class="in"><span class="st"></span><span class="sa"></span></span>`
          e.onclick = () => {
            if (p.linkUrl) window.open(p.linkUrl, '_blank', 'noopener')
          }
        }
        // refresh title/artist when async metadata (oEmbed/iTunes) lands
        const meta = (p.title || '') + '|' + (p.artist || '')
        if (e.dataset.meta !== meta) {
          e.dataset.meta = meta
          ;(e.querySelector('.st') as HTMLElement).textContent = p.title || (p.linkUrl ? '…' : p.text)
          ;(e.querySelector('.sa') as HTMLElement).textContent = p.artist || 'now playing'
        }
        // title/artist sit under the square cover
        const cs = (p.w - 28) / 2
        const coverCY = y - p.h / 2 + 14 + cs
        e.style.width = p.w - 28 + 'px'
        e.style.transform = `translate(${g.cx}px,${y + p.h / 2 - 36}px) translate(-50%,-50%)`
        e.style.opacity = fade(0.98 - age * 0.12)
        e.style.filter = soften
        // album cover: real art when resolved, tap to play/pause the preview
        const cid = 'c' + p.id
        alive.add(cid)
        const ce = this.ov(cid, 'cov')
        if (!ce.dataset.init) {
          ce.dataset.init = '1'
          ce.innerHTML = '<span class="in"><span class="art">🎵</span><span class="badge"></span></span>'
          ce.onclick = (ev) => {
            ev.stopPropagation()
            this.togglePlay(p)
          }
        }
        if (p.coverUrl && ce.dataset.cover !== p.coverUrl) {
          ce.dataset.cover = p.coverUrl
          const img = document.createElement('img')
          img.alt = ''
          img.referrerPolicy = 'no-referrer'
          img.src = p.coverUrl
          ;(ce.querySelector('.art') as HTMLElement).replaceChildren(img)
        }
        const playing = this.playingId === p.id
        ce.classList.toggle('playing', playing)
        const badge = ce.querySelector('.badge') as HTMLElement
        const glyph = playing ? '⏸' : p.previewUrl ? '▶' : p.linkUrl ? '↗' : ''
        if (badge.textContent !== glyph) badge.textContent = glyph
        const inEl = ce.querySelector('.in') as HTMLElement
        inEl.style.width = cs * 2 + 'px'
        inEl.style.height = cs * 2 + 'px'
        ce.style.transform = `translate(${g.cx}px,${coverCY}px) translate(-50%,-50%)`
        ce.style.opacity = fade(1)
        ce.style.filter = soften
      } else {
        const e = this.ov(bid, 'bub' + (/\*[^*]+\*/.test(p.text) ? ' emote' : ''))
        if (!e.dataset.init) {
          e.dataset.init = '1'
          const s = document.createElement('span')
          s.className = 'in'
          s.textContent = p.text // VERBATIM
          e.appendChild(s)
        }
        e.style.width = p.w - 40 + 'px'
        e.style.transform = `translate(${g.cx}px,${y}px) translate(-50%,-50%)`
        e.style.opacity = fade(0.98 - age * 0.14)
        e.style.filter = soften
      }
    }
    for (const [id, e] of this.elMap) {
      if (!alive.has(id)) {
        e.remove()
        this.elMap.delete(id)
      }
    }
  }
}
