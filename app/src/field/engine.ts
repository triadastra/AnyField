import glassWGSL from './glass.wgsl?raw'
import { hsl2rgb } from './color'
import { featurize } from './featurize'
import type { Item, RenderMode } from './types'

const MAXI = 48 // sketch cap on rendered pills (the real product never deletes)

/**
 * The Field engine. Owns the item list, physics, the WebGPU/Canvas2D renderer,
 * and the imperative DOM label layer. Runs its own rAF loop, off React's path.
 */
export class Engine {
  mode: RenderMode = '2d'
  onMode?: (m: RenderMode) => void
  onFirstPost?: () => void

  private items: Item[] = []
  private seq = 0
  private raf = 0
  private t0 = performance.now()
  private posted = false

  private readonly mc = document.createElement('canvas').getContext('2d')!
  private readonly elMap = new Map<number, HTMLDivElement>()

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
    const w = Math.round(this.W())
    const h = Math.round(this.H())
    this.canvas.width = w
    this.canvas.height = h
    this.canvas.style.width = w + 'px'
    this.canvas.style.height = h + 'px'
  }

  // ---- input ----
  spawn(text: string): void {
    if (!text.trim()) return
    if (!this.posted) {
      this.posted = true
      this.onFirstPost?.()
    }
    const f = featurize(text)
    const raw = this.measure(text)
    const maxW = 224
    const two = raw > maxW - 26
    const hw = (Math.min(raw, maxW - 26) + 26) / 2
    const hh = two ? 30 : 21
    this.items.push({
      id: this.seq++,
      text,
      hue: f.hue,
      sat: f.sat,
      isEmote: f.isEmote,
      x: this.W() / 2 + (Math.random() - 0.5) * 30,
      y: this.H() - 130,
      hw,
      hh,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -3.4 - Math.random() * 1.2,
      born: performance.now(),
    })
    if (this.items.length > MAXI) this.items.shift()
  }

  // ---- helpers ----
  private W() {
    return document.documentElement.clientWidth
  }
  private H() {
    return document.documentElement.clientHeight
  }
  private TOP() {
    return 78
  }
  private BOT() {
    return this.H() - 150
  }
  private measure(text: string) {
    let mw = 0
    for (const ln of text.split('\n')) mw = Math.max(mw, this.mc.measureText(ln).width)
    return mw
  }

  // ---- physics: buoyancy + box packing ----
  private physics() {
    const top = this.TOP()
    const bot = this.BOT()
    const L = 22
    const R = this.W() - 22
    for (const it of this.items) {
      it.vy += -0.16
      it.vy *= 0.985
      it.vx *= 0.985
      it.x += it.vx
      it.y += it.vy
      if (it.y < top + it.hh) {
        it.y = top + it.hh
        it.vy *= -0.18
      }
      if (it.y > bot + it.hh) {
        it.y = bot + it.hh
        it.vy = 0
      }
      if (it.x < L + it.hw) {
        it.x = L + it.hw
        it.vx *= -0.4
      }
      if (it.x > R - it.hw) {
        it.x = R - it.hw
        it.vx *= -0.4
      }
    }
    const a = this.items
    for (let i = 0; i < a.length; i++) {
      for (let j = i + 1; j < a.length; j++) {
        const p = a[i]
        const q = a[j]
        const dx = q.x - p.x
        const dy = q.y - p.y
        const minx = (p.hw + q.hw) * 0.94
        const miny = (p.hh + q.hh) * 0.94 + 6
        const ox = minx - Math.abs(dx)
        const oy = miny - Math.abs(dy)
        if (ox > 0 && oy > 0) {
          if (ox < oy) {
            const s = (dx < 0 ? -1 : 1) * ox * 0.5
            p.x -= s
            q.x += s
            p.vx -= s * 0.06
            q.vx += s * 0.06
          } else {
            const s = (dy < 0 ? -1 : 1) * oy * 0.5
            p.y -= s
            q.y += s
            p.vy -= s * 0.06
            q.vy += s * 0.06
          }
        }
      }
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

      // compile + build pipeline BEFORE claiming the canvas, so a shader
      // failure can still fall back cleanly to Canvas2D (the contexts are
      // mutually exclusive on a single canvas).
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

      this.uArr = new Float32Array(new ArrayBuffer(4 * 4))
      this.iArr = new Float32Array(new ArrayBuffer(MAXI * 8 * 4))
      this.uBuf = this.device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
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
    iArr.fill(0)
    const list = this.items.slice(-MAXI)
    list.forEach((it, i) => {
      const [r, g, b] = hsl2rgb(it.hue, it.sat, 0.6)
      const age = Math.min(1, (performance.now() - it.born) / 2500)
      const o = i * 8
      iArr[o] = it.x
      iArr[o + 1] = it.y
      iArr[o + 2] = it.hw
      iArr[o + 3] = it.hh
      iArr[o + 4] = r
      iArr[o + 5] = g
      iArr[o + 6] = b
      iArr[o + 7] = 1 - age
    })
    uArr[0] = this.canvas.width
    uArr[1] = this.canvas.height
    uArr[2] = time
    uArr[3] = list.length
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
      g.fillStyle =
        v > 0.7 ? `rgba(60,60,64,${0.18 + Math.random() * 0.25})` : v > 0.4 ? 'rgba(150,150,150,0.18)' : 'rgba(255,255,255,0.22)'
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
    for (const it of this.items.slice(-MAXI)) {
      const [r, gg, b] = hsl2rgb(it.hue, it.sat, 0.62).map((v) => (v * 255) | 0)
      const x = it.x - it.hw
      const y = it.y - it.hh
      const w2 = it.hw * 2
      const h2 = it.hh * 2
      const rad = Math.min(it.hw, it.hh)
      g.save()
      g.shadowColor = 'rgba(40,44,60,0.28)'
      g.shadowBlur = 18
      g.shadowOffsetY = 8
      this.rrect(g, x, y, w2, h2, rad)
      g.fillStyle = 'rgba(255,255,255,0.55)'
      g.fill()
      g.restore()
      this.rrect(g, x, y, w2, h2, rad)
      const grd = g.createLinearGradient(x, y, x, y + h2)
      grd.addColorStop(0, `rgba(${r},${gg},${b},0.26)`)
      grd.addColorStop(1, `rgba(${r},${gg},${b},0.10)`)
      g.fillStyle = grd
      g.fill()
      g.lineWidth = 1.2
      g.strokeStyle = 'rgba(255,255,255,0.75)'
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

  // ---- crisp verbatim text labels over the glass ----
  private drawLabels(now: number) {
    const alive = new Set<number>()
    for (const it of this.items) {
      alive.add(it.id)
      let e = this.elMap.get(it.id)
      if (!e) {
        e = document.createElement('div')
        e.className = 'lbl' + (it.isEmote ? ' emote' : '')
        e.textContent = it.text // VERBATIM
        this.labels.appendChild(e)
        this.elMap.set(it.id, e)
      }
      const age = Math.min(1, (now - it.born) / 8000)
      e.style.transform = `translate(${it.x}px,${it.y}px) translate(-50%,-50%)`
      e.style.maxWidth = it.hw * 2 - 14 + 'px'
      e.style.opacity = String(0.96 - age * 0.12)
    }
    for (const [id, e] of this.elMap) {
      if (!alive.has(id)) {
        e.remove()
        this.elMap.delete(id)
      }
    }
  }
}
