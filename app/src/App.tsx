import { useRef, useState } from 'react'
import { Field } from './ui/Field'
import { Header } from './ui/Header'
import { ChatDock } from './ui/ChatDock'
import { Chips } from './ui/Chips'
import type { Engine } from './field/engine'
import type { RenderMode } from './field/types'

export default function App() {
  const engineRef = useRef<Engine | null>(null)
  const [posted, setPosted] = useState(false)
  const [mode, setMode] = useState<RenderMode | null>(null)
  const [stats, setStats] = useState({ facets: 0, mood: 'calm' })

  const send = (text: string) => engineRef.current?.spawn(text)

  return (
    <div className="app">
      <Field
        onReady={(e) => (engineRef.current = e)}
        onFirstPost={() => setPosted(true)}
        onMode={setMode}
        onStats={setStats}
      />

      <Header facets={stats.facets} mood={stats.mood} mode={mode} />

      {!posted && (
        <div className="hint">
          <div className="hint-card">
            <div className="hint-title">This is your field.</div>
            <div className="hint-sub">
              Send anything — it floats up as <b>glass</b> and the stream scrolls on. Songs become cover-blocks; related posts link together.
            </div>
          </div>
        </div>
      )}

      <div className="scrim" />
      <Chips onSend={send} />
      <ChatDock onSend={send} />
    </div>
  )
}
