import { useRef, useState } from 'react'

type Props = { onSend: (text: string) => void }

const ATTACH = [
  { icon: '🎵', label: 'Music', text: '🎵 a song' },
  { icon: '📷', label: 'Photo', text: '📷 a photo' },
  { icon: '🎨', label: 'Color', text: '🎨 a color' },
  { icon: '☁️', label: 'Mood', text: '☁️ wistful' },
]

// The glass chat bubble: + (attachments), verbatim text field, send.
export function ChatDock({ onSend }: Props) {
  const [v, setV] = useState('')
  const [menu, setMenu] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const canSend = v.trim().length > 0

  const submit = () => {
    if (!canSend) return
    onSend(v)
    setV('')
    if (taRef.current) taRef.current.style.height = '40px'
  }
  const quick = (t: string) => {
    onSend(t)
    setMenu(false)
  }

  return (
    <div className="dock">
      {menu && (
        <div className="attach">
          {ATTACH.map((a) => (
            <button key={a.label} onClick={() => quick(a.text)}>
              <span className="ai">{a.icon}</span>
              <span className="al">{a.label}</span>
            </button>
          ))}
        </div>
      )}
      <div className="bar">
        <button className={'rbtn plus' + (menu ? ' on' : '')} aria-label="attach" onClick={() => setMenu((m) => !m)}>
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
        <button className={'rbtn send' + (canSend ? '' : ' off')} aria-label="send" onClick={submit}>
          ➤
        </button>
      </div>
    </div>
  )
}
