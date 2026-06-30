import { useEffect, useRef, useState } from 'react'
import { Engine } from '../field/engine'
import type { RenderMode } from '../field/types'

type Props = {
  onReady: (engine: Engine) => void
  onFirstPost: () => void
}

// Mounts the WebGPU canvas + the imperative label layer and owns the Engine.
export function Field({ onReady, onFirstPost }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const labelsRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<RenderMode | null>(null)

  useEffect(() => {
    const engine = new Engine(canvasRef.current!, labelsRef.current!)
    engine.onMode = (m) => setMode(m)
    engine.onFirstPost = onFirstPost
    engine.init().then(() => {
      engine.start()
      onReady(engine)
    })
    const onResize = () => engine.resize()
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      engine.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <canvas ref={canvasRef} className="gfx" />
      <div ref={labelsRef} className="labels" />
      <div className="badge">{mode === null ? '…' : mode === 'gpu' ? 'WebGPU ✓' : 'Canvas2D'}</div>
    </>
  )
}
