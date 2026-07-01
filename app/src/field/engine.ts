import glassWGSL from './glass.wgsl?raw'
import { hsl2rgb } from './color'
import type { RenderMode } from './types'
import type { Facet, Post } from '../compose/types'
import { featurize } from '../compose/featurize'
import { P, similarity, absorb } from '../compose/router'

const MAXI = 64 // rendered glass instances

// one glass instance for the renderer
type Inst = { x: number; y: number; hw: number; hh: number; hue: number; sat: number; light: number; glow: number }

// right-aligned chat geometry
const RIGHT = 12
const AV = 17 // avatar radius
const GAP = 8

/**
 * The Field engine — a right-aligned rising glass chat (WeChat-like).
 * Each post is classified into a facet (§8, for tint + linking), then laid out
 * as a glass bubble hugging the right edge. New posts float up from the dock and
 * the column scrolls upward. Songs render as glass cover-blocks with a title.
 */
export class Engine {
  mode: RenderMode = '2d'
  onMode?: (m: RenderMode) => void
  onFirstPost?: () => void
  onStats?: (s: { facets: number; mood: string }) => void
  private lastStats = 0

  private posts: Post[] = []
  private facets: Facet[] = []
  private seq = 0
  private fseq = 0
  private raf = 0
  private t0 = performance.now()
  private posted = false

  private W = { val: 0.15, aro: 0.12, vuln: 0 } // emotional weather EMA (§2)

  private readonly mc = document.createElement('canvas').getContext('2d')!
  private readonly elMap = new Map<string, HTMLDivElement>()

  // WebGPU state
  private device?: GPUDevice
  private ctx?: GPUCanvasContext
  private pipe?: GPURenderPipeline
  private bind?: GPUBindGroup
  private uBuf?: GPUBuffer
  private iBuf?: GPUBuffer
  private uArr!: Float32Array<ArrayBuffer>
  private iArr!: Float32Array<ArrayBuffer>

  // Canvas2D fallback state
  private c2d?: CanvasRenderingContext2D
  private granite?: HTMLCanvasElement

  constructor(private canvas: HTMLCanvasElement, private labels: HTMLElement) {
    this.mc.font = '600 13px -apple-system,system-ui,sans-serif'
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

    // song? "🎵 Title — Artist"
    const trimmed = text.trim()
    const isSong = /^🎵/.test(trimmed)
    let title: string | undefined
    let artist: string | undefined
    if (isSong) {
      const body = trimmed.replace(/^🎵\s*/, '')
      const parts = body.split(/\s+[—-]\s+/)
      title = parts[0] || body
      artist = parts[1]
    }

    const maxW = Math.min(280, this.W_() * 0.72)
    let w: number
    let h: number
    if (isSong) {
      w = Math.min(maxW, 240)
      h = 66
    } else {
      const raw = this.measure(text)
      const lines = Math.max(1, Math.ceil((raw + 4) / (maxW - 28)))
      w = Math.min(maxW, raw + 28)
      h = lines * 20 + 16
    }

    const prev = this.posts[this.posts.length - 1]
    const post: Post = {
      id: this.seq++,
      kind: isSong ? 'song' : 'text',
      text,
      title,
      artist,
      hue: feat.hue,
      sat: feat.sat,
      facetId: facet.id,
      w,
      h,
      x: 0,
      y: this.botY() + h, // starts below the dock, floats up
      ty: this.botY() - h / 2,
      born: performance.now(),
      connectPrev: !!prev && prev.facetId === facet.id,
    }
    this.posts.push(post)
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
  private measure(text: string) {
    let mw = 0
    for (const ln of text.split('\n')) mw = Math.max(mw, this.mc.measureText(ln).width)
    return mw
  }
  // per-post right-aligned geometry
  private geom(p: Post) {
    const avatarCX = this.W_() - RIGHT - AV
    const bubbleRight = avatarCX - AV - GAP
    const cx = bubbleRight - p.w / 2
    return { avatarCX, bubbleRight, cx }
  }

  // ---- layout: stack from the bottom; the column scrolls up as you post ----
  private layout() {
    let cursor = this.botY() // bottom baseline (bottom edge of newest post)
    for (let i = this.posts.length - 1; i >= 0; i--) {
      const p = this.posts[i]
      p.ty = cursor - p.h / 2
      const gap = p.connectPrev ? 7 : 15
      cursor = p.ty - p.h / 2 - gap
    }
    for (const p of this.posts) p.y += (p.ty - p.y) * 0.14
  }

  private visible(): Post[] {
    const top = -80
    const bot = this.H_() + 80
    const out: Post[] = []
    for (let i = this.posts.length - 1; i >= 0 && out.length < 18; i--) {
      const p = this.posts[i]
      if (p.y > top && p.y < bot) out.push(p)
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
    // connectors (behind), for linked same-facet posts
    for (let i = 1; i < vis.length; i++) {
      const p = vis[i]
      if (!p.connectPrev) continue
      const q = vis[i - 1]
      const g = this.geom(p)
      const y1 = q.y + q.h / 2
      const y2 = p.y - p.h / 2
      if (y2 <= y1) continue
      list.push({ x: g.bubbleRight - 14, y: (y1 + y2) / 2, hw: 3, hh: (y2 - y1) / 2 + 2, hue: p.hue, sat: p.sat, light: 0.6, glow: 0.4 })
    }
    for (const p of vis) {
      const g = this.geom(p)
      const age = Math.min(1, (now - p.born) / 2500)
      const glow = (1 - age) * 0.5
      // bubble / card
      list.push({ x: g.cx, y: p.y, hw: p.w / 2, hh: p.h / 2, hue: p.hue, sat: Math.min(1, p.sat + 0.05), light: 0.63, glow })
      if (p.kind === 'song') {
        // album cover block on the card's left
        const coverCX = g.bubbleRight - p.w + 8 + 22
        list.push({ x: coverCX, y: p.y, hw: 22, hh: 22, hue: p.hue, sat: Math.min(1, p.sat + 0.2), light: 0.5, glow: 0.85 })
      }
      // avatar
      list.push({ x: g.avatarCX, y: p.y, hw: AV, hh: AV, hue: 210, sat: 0.5, light: 0.62, glow: 0.4 })
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
      const info = await mod.getCompilationInfo()
      if (info.messages.some((m) => m.type === 'error')) {
        console.warn('WGSL compile errors:', info.messages)
        return false
      }
      this.pipe = await this.device.createRenderPipelineAsync({
        layout: 'auto',
        vertex: { module: mod, entryPoint: 'vs' },
        fragment: { module: mod, entryPoint: 'fs', targets: [{ format: fmt }] },
        primitive: { topology: 'triangle-list' },
      })
      const ctx = this.canvas.getContext('webgpu')
      if (!ctx) return false
      this.ctx = ctx
      ctx.configure({ device: this.device, format: fmt, alphaMode: 'opaque' })
      this.uArr = new Float32Array(new ArrayBuffer(8 * 4))
      this.iArr = new Float32Array(new ArrayBuffer(MAXI * 8 * 4))
      this.uBuf = this.device.createBuffer({ size: this.uArr.byteLength, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
      this.iBuf = this.device.createBuffer({ size: this.iArr.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST })
      this.bind = this.device.createBindGroup({
        layout: this.pipe.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.uBuf } },
          { binding: 1, resource: { buffer: this.iBuf } },
        ],
      })
      return true
    } catch (e) {
      console.warn('WebGPU init failed, using Canvas2D:', e instanceof Error ? e.message : e)
      return false
    }
  }

  private drawGPU(time: number) {
    const { device, ctx, pipe, bind, uBuf, iBuf, uArr, iArr } = this
    if (!device || !ctx || !pipe || !bind || !uBuf || !iBuf) return
    const list = this.buildInstances(performance.now())
    iArr.fill(0)
    list.forEach((it, i) => {
      const [r, g, b] = hsl2rgb(it.hue, it.sat, it.light)
      const o = i * 8
      iArr[o] = it.x
      iArr[o + 1] = it.y
      iArr[o + 2] = it.hw
      iArr[o + 3] = it.hh
      iArr[o + 4] = r
      iArr[o + 5] = g
      iArr[o + 6] = b
      iArr[o + 7] = it.glow
    })
    const w = this.weather()
    uArr[0] = this.canvas.width
    uArr[1] = this.canvas.height
    uArr[2] = time
    uArr[3] = list.length
    uArr[4] = w.r
    uArr[5] = w.g
    uArr[6] = w.b
    uArr[7] = w.a
    device.queue.writeBuffer(uBuf, 0, uArr)
    device.queue.writeBuffer(iBuf, 0, iArr)
    const enc = device.createCommandEncoder()
    const pass = enc.beginRenderPass({
      colorAttachments: [
        { view: ctx.getCurrentTexture().createView(), clearValue: { r: 0.91, g: 0.91, b: 0.9, a: 1 }, loadOp: 'clear', storeOp: 'store' },
      ],
    })
    pass.setPipeline(pipe)
    pass.setBindGroup(0, bind)
    pass.draw(3)
    pass.end()
    device.queue.submit([enc.finish()])
  }

  // ---- Canvas2D fallback ----
  private makeGranite(w: number, h: number) {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d')!
    const grd = g.createLinearGradient(0, 0, 0, h)
    grd.addColorStop(0, '#f2f2ef')
    grd.addColorStop(1, '#e4e4e0')
    g.fillStyle = grd
    g.fillRect(0, 0, w, h)
    for (let i = 0; i < (w * h) / 90; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      const r = Math.random() * 1.6
      const v = Math.random()
      g.fillStyle = v > 0.7 ? `rgba(60,60,64,${0.18 + Math.random() * 0.25})` : v > 0.4 ? 'rgba(150,150,150,0.18)' : 'rgba(255,255,255,0.22)'
      g.beginPath()
      g.arc(x, y, r, 0, 7)
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
    if (wc.a > 0.02) {
      g.fillStyle = `rgba(${(wc.r * 255) | 0},${(wc.g * 255) | 0},${(wc.b * 255) | 0},${wc.a * 0.12})`
      g.fillRect(0, 0, w, h)
    }
    for (const it of this.buildInstances(performance.now())) {
      const [r, gg, b] = hsl2rgb(it.hue, it.sat, 0.62).map((v) => (v * 255) | 0)
      const x = it.x - it.hw
      const y = it.y - it.hh
      const w2 = it.hw * 2
      const h2 = it.hh * 2
      const rad = Math.min(it.hw, it.hh, 18)
      g.save()
      g.shadowColor = 'rgba(40,44,60,0.22)'
      g.shadowBlur = 14
      g.shadowOffsetY = 6
      this.rrect(g, x, y, w2, h2, rad)
      g.fillStyle = 'rgba(255,255,255,0.5)'
      g.fill()
      g.restore()
      this.rrect(g, x, y, w2, h2, rad)
      const grd = g.createLinearGradient(x, y, x, y + h2)
      grd.addColorStop(0, `rgba(${r},${gg},${b},0.34)`)
      grd.addColorStop(1, `rgba(${r},${gg},${b},0.16)`)
      g.fillStyle = grd
      g.fill()
      g.lineWidth = 1.1
      g.strokeStyle = 'rgba(255,255,255,0.7)'
      this.rrect(g, x + 0.6, y + 0.6, w2 - 1.2, h2 - 1.2, rad)
      g.stroke()
    }
  }

  private rrect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    r = Math.min(r, w / 2, h / 2)
    g.beginPath()
    g.moveTo(x + r, y)
    g.arcTo(x + w, y, x + w, y + h, r)
    g.arcTo(x + w, y + h, x, y + h, r)
    g.arcTo(x, y + h, x, y, r)
    g.arcTo(x, y, x + w, y, r)
    g.closePath()
  }

  // ---- DOM overlay: verbatim text, right-aligned; song titles; avatars ----
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
      const age = Math.min(1, (now - p.born) / 9000)

      // avatar
      const aid = 'a' + p.id
      alive.add(aid)
      const ae = this.ov(aid, 'avatar')
      if (!ae.dataset.init) {
        ae.dataset.init = '1'
        ae.innerHTML = '<span class="in">🦊</span>'
      }
      ae.style.transform = `translate(${g.avatarCX}px,${p.y}px) translate(-50%,-50%)`

      const bid = 'b' + p.id
      alive.add(bid)
      if (p.kind === 'song') {
        const e = this.ov(bid, 'song')
        if (!e.dataset.init) {
          e.dataset.init = '1'
          e.innerHTML = `<span class="in"><span class="st"></span><span class="sa"></span></span>`
          ;(e.querySelector('.st') as HTMLElement).textContent = p.title || p.text
          ;(e.querySelector('.sa') as HTMLElement).textContent = p.artist || 'now playing'
        }
        // title block sits to the right of the cover
        const coverRight = g.bubbleRight - p.w + 8 + 44
        const cx = (coverRight + g.bubbleRight) / 2
        e.style.width = g.bubbleRight - coverRight - 10 + 'px'
        e.style.transform = `translate(${cx}px,${p.y}px) translate(-50%,-50%)`
        e.style.opacity = String(0.98 - age * 0.12)
        // cover glyph
        const cid = 'c' + p.id
        alive.add(cid)
        const ce = this.ov(cid, 'cov')
        if (!ce.dataset.init) {
          ce.dataset.init = '1'
          ce.innerHTML = '<span class="in">🎵</span>'
        }
        ce.style.transform = `translate(${g.bubbleRight - p.w + 8 + 22}px,${p.y}px) translate(-50%,-50%)`
      } else {
        const e = this.ov(bid, 'bub' + (/\*[^*]+\*/.test(p.text) ? ' emote' : ''))
        if (!e.dataset.init) {
          e.dataset.init = '1'
          const s = document.createElement('span')
          s.className = 'in'
          s.textContent = p.text // VERBATIM
          e.appendChild(s)
        }
        e.style.width = p.w - 22 + 'px'
        e.style.transform = `translate(${g.cx}px,${p.y}px) translate(-50%,-50%)`
        e.style.opacity = String(0.98 - age * 0.14)
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
