import { useRef, useState } from 'react'

type Props = { onSend: (text: string) => void }

// The glass chat bubble: + (attachments), verbatim text field, send.
export function ChatDock({ onSend }: Props) {
  const [v, setV] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)

  const submit = () => {
    if (!v.trim()) return
    onSend(v)
    setV('')
    if (taRef.current) taRef.current.style.height = '40px'
  }

  return (
    <div className="dock">
      <div className="bar">
        <button className="rbtn" aria-label="attach" onClick={() => onSend('📎 attachment')}>
          ＋
        </button>
        <textarea
          ref={taRef}
          className="msg"
          rows={1}
          value={v}
          placeholder="say anything…"
          autoCapitalize="sentences"
          autoComplete="off"
          onChange={(e) => {
            setV(e.target.value)
            const el = e.target
            el.style.height = '40px'
            el.style.height = Math.min(104, el.scrollHeight) + 'px'
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
        />
        <button className="rbtn send" aria-label="send" onClick={submit}>
          ➤
        </button>
      </div>
    </div>
  )
}
