import { useRef, useState } from 'react'
import { Field } from './ui/Field'
import { ChatDock } from './ui/ChatDock'
import { Chips } from './ui/Chips'
import type { Engine } from './field/engine'

export default function App() {
  const engineRef = useRef<Engine | null>(null)
  const [posted, setPosted] = useState(false)

  const send = (text: string) => engineRef.current?.spawn(text)

  return (
    <div className="app">
      <Field onReady={(e) => (engineRef.current = e)} onFirstPost={() => setPosted(true)} />

      <div className="brand">
        Any<b>Field</b>
      </div>

      {!posted && (
        <div className="hint">
          Send anything.
          <br />
          It floats up and sticks in the glass —
          <br />
          tinting it as it goes.
        </div>
      )}

      <div className="scrim" />
      <Chips onSend={send} />
      <ChatDock onSend={send} />
    </div>
  )
}
