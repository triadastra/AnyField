type Props = { onSend: (text: string) => void }

const CHIPS = [
  'I love this macaron 🥐',
  '🎵 Nothing — KISS OF LIFE',
  "it's not worth ittt",
  'Belle好好看',
  '😚😚😚',
  'Meow',
  '好痛',
  '*震惊/诧异*',
]

// Tap-to-send examples — handy on a phone where typing is friction.
export function Chips({ onSend }: Props) {
  return (
    <div className="chips">
      {CHIPS.map((c) => (
        <button key={c} className="chip" onClick={() => onSend(c)}>
          {c}
        </button>
      ))}
    </div>
  )
}
