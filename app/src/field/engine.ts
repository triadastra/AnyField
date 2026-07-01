import glassWGSL from './glass.wgsl?raw'
import { hsl2rgb } from './color'
import type { RenderMode } from './types'
import type { Droplet, Facet } from '../compose/types'
import { featurize } from '../compose/featurize'
import { P, similarity, absorb, jaccard } from '../compose/router'

const MAXI = 64 // rendered glass instances (pools + fresh droplets)

/**
 * The Field engine. Owns facets + droplets, the composition/routing (§8), the
 * physics, the WebGPU/Canvas2D renderer, and the imperative DOM label layer.
 * Runs its own rAF loop, off React's path.
 */
export class Engine {
  mode: RenderMode = '2d'
  onMode?: (m: RenderMode) => void
  onFirstPost?: () => void

  private facets: Facet[] = []
  private droplets: Droplet[] = []
  private seq = 0
  private fseq = 0
  private raf = 0
  private t0 = performance.now()
  private posted = false

  // emotional weather: global EMA of recent affect (§2)
  private W = { val: 0.15, aro: 0.12, vuln: 0 }

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

  // ---- input: featurize -> route into a facet -> spawn a droplet (§3.3, §8) ----
  spawn(text: string): void {
    if (!text.trim()) return
    if (!this.posted) {
      this.posted = true
      this.onFirstPost?.()
    }
    const feat = featurize(text)

    // weather EMA
    this.W.val = this.W.val * 0.85 + feat.affect.valence * 0.15
    this.W.aro = this.W.aro * 0.85 + feat.affect.arousal * 0.15
    this.W.vuln = this.W.vuln * 0.88 + feat.affect.vulnerability * 0.12

    // classify to nearest facet
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
    if (best && bestSim >= P.TAU_NEW) {
      facet = best
    } else if (this.facets.length >= P.MAX_FACETS && best) {
      facet = best // cap reached → fold into nearest (§8.6)
    } else {
      facet = this.makeFacet(feat)
      this.facets.push(facet)
    }
    absorb(facet, feat)

    // near-duplicate → thicken an existing droplet, don't stack (§8.5)
    let dupT: Droplet | null = null
    let dupB = 0
    for (const m of facet.members) {
      if (m.state === 'aggregated') continue
      const j = jaccard(m.tokens, feat.tokens)
      if (j > dupB) {
        dupB = j
        dupT = m
      }
    }
    if (dupT && dupB >= P.TAU_DUP) {
      dupT.dup++
      this.flash(dupT.id)
      return
    }

    // a new discrete droplet on the pool surface
    const idx = facet.members.length
    const raw = this.measure(text)
    const maxW = 210
    const two = raw > maxW - 24
    const hw = (Math.min(raw, maxW - 24) + 24) / 2
    const hh = two ? 28 : 20
    const d: Droplet = {
      id: this.seq++,
      text,
      hue: feat.hue,
      sat: feat.sat,
      isEmote: feat.isEmote,
      tokens: feat.tokens,
      dup: 1,
      facet,
      angle: idx * 2.399963, // golden angle → even packing
      orbit: 0.55 + (idx % 4) * 0.14,
      state: 'fresh',
      x: this.W_() / 2 + (Math.random() - 0.5) * 30,
      y: this.H_() - 120, // rises from the dock toward its pool
      hw,
      hh,
      born: performance.now(),
    }
    facet.members.push(d)
    this.droplets.push(d)

    // keep only the most recent KEEP discrete; older compost into the pool body
    const fresh = facet.members.filter((m) => m.state !== 'aggregated')
    if (fresh.length > P.KEEP) fresh[0].state = 'aggregated'
  }

  private makeFacet(feat: ReturnType<typeof featurize>): Facet {
    const a = Math.random() * Math.PI * 2
    const r = 90 + Math.random() * 130
    return {
      id: 'f' + this.fseq++,
      label: feat.topicLabel || feat.tokens.find((t) => t[0] !== '#') || '…',
      topic: feat.topic,
      topics: {},
      tokenList: [],
      hue: feat.hue,
      sat: feat.sat,
      mass: 0,
      x: this.W_() / 2 + Math.cos(a) * r,
      y: this.midY() + Math.sin(a) * r,
      vx: 0,
      vy: 0,
      radius: 66,
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
  private topY() {
    return 84
  }
  private botY() {
    return this.H_() - 150
  }
  private midY() {
    return (this.topY() + this.botY()) / 2
  }
  private measure(text: string) {
    let mw = 0
    for (const ln of text.split('\n')) mw = Math.max(mw, this.mc.measureText(ln).width)
    return mw
  }

  // ---- physics: pools relax; droplets orbit their pool ----
  private physics() {
    const cx = this.W_() / 2
    const cy = this.midY()
    const F = this.facets
    for (let i = 0; i < F.length; i++) {
      const a = F[i]
      let fx = (cx - a.x) * 0.0018
      let fy = (cy - a.y) * 0.0018
      for (let j = 0; j < F.length; j++) {
        if (i === j) continue
        const b = F[j]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const d2 = dx * dx + dy * dy + 1
        const want = (a.radius + b.radius) * 0.82
        if (d2 < want * want) {
          const d = Math.sqrt(d2)
          const push = (want - d) / want
          fx += (dx / d) * push * 1.4
          fy += (dy / d) * push * 1.4
        }
      }
      a.vx = (a.vx + fx) * 0.85
      a.vy = (a.vy + fy) * 0.85
      a.x += a.vx
      a.y += a.vy
      // keep pools on-screen
      a.x = Math.max(a.radius * 0.5 + 8, Math.min(this.W_() - a.radius * 0.5 - 8, a.x))
      a.y = Math.max(this.topY() + a.radius * 0.4, Math.min(this.botY(), a.y))
    }
    for (const d of this.droplets) {
      if (d.state === 'aggregated') continue
      const f = d.facet
      const tx = f.x + Math.cos(d.angle) * f.radius * d.orbit
      const ty = f.y + Math.sin(d.angle) * f.radius * d.orbit
      d.x += (tx - d.x) * 0.08
      d.y += (ty - d.y) * 0.08
      d.angle += 0.0007
    }
  }

  private frame() {
    const now = performance.now()
    const time = (now - this.t0) / 1000
    this.physics()
    try {
      if (this.mode === 'gpu') this.drawGPU(time)
      else this.drawCanvas()
    } catch {
      // never let a render error kill the loop — labels still draw
    }
    this.drawLabels(now)
  }

  // weather color: storm = low valence + high arousal → red; else warm/cool by mood
  private weather(): { r: number; g: number; b: number; a: number } {
    const storm = Math.max(0, (this.W.aro - 0.45) * 1.4) * Math.max(0, (-this.W.val + 0.1) * 1.2)
    const hue = this.W.val > 0 ? 40 : 2 + (1 - Math.min(1, -this.W.val)) * 30
    const [r, g, b] = hsl2rgb(hue, 0.6, 0.5)
    return { r, g, b, a: Math.min(1, storm) }
  }

  private freshDroplets(): Droplet[] {
    return this.droplets.filter((d) => d.state !== 'aggregated').slice(-40)
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

  // pack pools (behind) + fresh droplets (in front) into the instance buffer
  private packInstances(): number {
    const arr = this.iArr
    arr.fill(0)
    let n = 0
    const put = (x: number, y: number, hw: number, hh: number, hue: number, sat: number, light: number, glow: number) => {
      if (n >= MAXI) return
      const [r, g, b] = hsl2rgb(hue, sat, light)
      const o = n * 8
      arr[o] = x
      arr[o + 1] = y
      arr[o + 2] = hw
      arr[o + 3] = hh
      arr[o + 4] = r
      arr[o + 5] = g
      arr[o + 6] = b
      arr[o + 7] = glow
      n++
    }
    for (const f of this.facets) put(f.x, f.y, f.radius, f.radius * 0.72, f.hue, Math.min(1, f.sat + 0.05), 0.58, 0.85)
    const now = performance.now()
    for (const d of this.freshDroplets()) {
      const age = Math.min(1, (now - d.born) / 2500)
      put(d.x, d.y, d.hw, d.hh, d.hue, Math.min(1, d.sat || 0.7), 0.66, (1 - age) * 0.7)
    }
    return n
  }

  private drawGPU(time: number) {
    const { device, ctx, pipe, bind, uBuf, iBuf, uArr, iArr } = this
    if (!device || !ctx || !pipe || !bind || !uBuf || !iBuf) return
    const n = this.packInstances()
    const w = this.weather()
    uArr[0] = this.canvas.width
    uArr[1] = this.canvas.height
    uArr[2] = time
    uArr[3] = n
    uArr[4] = w.r
    uArr[5] = w.g
    uArr[6] = w.b
    uArr[7] = w.a
    device.queue.writeBuffer(uBuf, 0, uArr)
    device.queue.writeBuffer(iBuf, 0, iArr)
    const enc = device.createCommandEncoder()
    const pass = enc.beginRenderPass({
      colorAttachments: [
        {
          view: ctx.getCurrentTexture().createView(),
          clearValue: { r: 0.91, g: 0.91, b: 0.9, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
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
    for (const f of this.facets) this.glassRect(g, f.x, f.y, f.radius, f.radius * 0.72, f.hue, f.sat, 0.34)
    const now = performance.now()
    for (const d of this.freshDroplets()) {
      const age = Math.min(1, (now - d.born) / 2500)
      this.glassRect(g, d.x, d.y, d.hw, d.hh, d.hue, d.sat || 0.7, 0.22 + (1 - age) * 0.12)
    }
  }

  private glassRect(g: CanvasRenderingContext2D, cx: number, cy: number, hw: number, hh: number, hue: number, sat: number, alpha: number) {
    const [r, gg, b] = hsl2rgb(hue, sat, 0.62).map((v) => (v * 255) | 0)
    const x = cx - hw
    const y = cy - hh
    const w2 = hw * 2
    const h2 = hh * 2
    const rad = Math.min(hw, hh)
    g.save()
    g.shadowColor = 'rgba(40,44,60,0.24)'
    g.shadowBlur = 16
    g.shadowOffsetY = 7
    this.rrect(g, x, y, w2, h2, rad)
    g.fillStyle = 'rgba(255,255,255,0.5)'
    g.fill()
    g.restore()
    this.rrect(g, x, y, w2, h2, rad)
    const grd = g.createLinearGradient(x, y, x, y + h2)
    grd.addColorStop(0, `rgba(${r},${gg},${b},${alpha + 0.06})`)
    grd.addColorStop(1, `rgba(${r},${gg},${b},${alpha * 0.5})`)
    g.fillStyle = grd
    g.fill()
    g.lineWidth = 1.1
    g.strokeStyle = 'rgba(255,255,255,0.7)'
    this.rrect(g, x + 0.6, y + 0.6, w2 - 1.2, h2 - 1.2, rad)
    g.stroke()
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

  // ---- DOM labels: emergent facet names + verbatim droplet text ----
  private el(id: string, cls: string): HTMLDivElement {
    let e = this.elMap.get(id)
    if (!e) {
      e = document.createElement('div')
      e.className = cls
      this.labels.appendChild(e)
      this.elMap.set(id, e)
    }
    return e
  }
  private flash(dropId: number) {
    const e = this.elMap.get('d' + dropId)
    if (e) {
      e.animate([{ transform: e.style.transform + ' scale(1.14)' }, { transform: e.style.transform }], { duration: 200 })
    }
  }

  private drawLabels(now: number) {
    const alive = new Set<string>()
    for (const f of this.facets) {
      const id = 'f' + f.id
      alive.add(id)
      const e = this.el(id, 'facet-lbl')
      e.style.transform = `translate(${f.x}px,${f.y - f.radius * 0.72 - 12}px) translate(-50%,-50%)`
      e.innerHTML = `${escapeHtml(f.label)}<span class="m">${f.mass}</span>`
    }
    for (const d of this.droplets) {
      const id = 'd' + d.id
      if (d.state === 'aggregated') {
        const ex = this.elMap.get(id)
        if (ex) {
          ex.remove()
          this.elMap.delete(id)
        }
        continue
      }
      alive.add(id)
      const e = this.el(id, 'lbl' + (d.isEmote ? ' emote' : ''))
      const age = Math.min(1, (now - d.born) / 8000)
      e.style.transform = `translate(${d.x}px,${d.y}px) translate(-50%,-50%)`
      e.style.maxWidth = d.hw * 2 - 14 + 'px'
      e.style.opacity = String(0.96 - age * 0.14)
      e.innerHTML = escapeHtml(d.text) + (d.dup > 1 ? `<span class="x">×${d.dup}</span>` : '')
    }
    for (const [id, e] of this.elMap) {
      if (!alive.has(id)) {
        e.remove()
        this.elMap.delete(id)
      }
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string)
}
