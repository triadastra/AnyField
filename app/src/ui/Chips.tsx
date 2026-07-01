type Props = { onSend: (text: string) => void }

// label = what the chip shows; text = what it sends (defaults to the label)
type Chip = { label: string; text?: string }
const CHIPS: Chip[] = [
  { label: 'tea? ☕' },
  { label: 'miss u' },
  { label: 'park 🌿' },
  { label: 'song rec 🎵', text: '🎵 Nothing — KISS OF LIFE' },
  { label: 'tiny win ✨' },
  { label: 'Belle好好看' },
  { label: '*震惊/诧异*' },
]

// Tap-to-send examples — handy on a phone where typing is friction.
export function Chips({ onSend }: Props) {
  return (
    <div className="chips">
      {CHIPS.map((c) => (
        <button key={c.label} className="chip" onClick={() => onSend(c.text ?? c.label)}>
          {c.label}
        </button>
      ))}
    </div>
  )
}
