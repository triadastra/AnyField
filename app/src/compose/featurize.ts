import type { Feat } from './types'

// Topics with an emergent label, a hue/sat, an affect prior, and keywords.
// Content lightly tints the glass and seeds routing.
type Topic = { name: string; label: string; hue: number; sat: number; val: number; aro: number; kw: string[] }
export const TOPICS: Topic[] = [
  { name: 'food', label: 'food', hue: 28, sat: 0.82, val: 0.55, aro: 0.3, kw: ['macaron', 'croissant', '🥐', 'coffee', '☕', 'eat', 'ate', 'taste', 'dessert', 'cake', '🍰', 'yum', 'delicious', 'food', 'snack', '🍵', 'sweet', 'hungry'] },
  { name: 'music', label: 'music', hue: 282, sat: 0.78, val: 0.45, aro: 0.62, kw: ['song', 'music', '🎵', '🎶', 'kiss of life', 'newjeans', 'asap', 'belle', 'lyric', 'lyrics', 'beat', 'sing', 'track', 'spotify', 'melody', 'nothing', 'idol'] },
  { name: 'love', label: 'love', hue: 332, sat: 0.82, val: 0.9, aro: 0.5, kw: ['love', '😍', '🥰', '❤️', '😚', '😘', '💕', 'cute', '好看', '好好看', 'adore', '美', 'beautiful', 'pretty', 'miss you'] },
  { name: 'identity', label: 'me', hue: 205, sat: 0.62, val: 0.4, aro: 0.3, kw: ['meow', 'again', "i'm back", 'im back', 'myself', 'persona', 'self', '我', '似乎'] },
  { name: 'place', label: 'places', hue: 128, sat: 0.58, val: 0.42, aro: 0.32, kw: ['brugge', 'belgium', 'beach', 'city', 'home', 'park', 'travel', 'trip', 'place', '街'] },
  { name: 'grief', label: 'wistful', hue: 222, sat: 0.5, val: -0.45, aro: 0.32, kw: ['镜子', '不在了', 'gone', '朋友', '复活', 'memory', 'remember', 'wistful', '曾经', '过去'] },
  { name: 'pain', label: 'storm', hue: 2, sat: 0.88, val: -0.82, aro: 0.88, kw: ['好痛', '痛', 'pain', 'hurt', '边界', '拒绝', '妥协', 'get the fuck out', 'fuck', 'hate', '轰炸', 'rage', 'angry'] },
  { name: 'calm', label: 'calm', hue: 165, sat: 0.5, val: 0.32, aro: 0.15, kw: ['calm', 'ok', 'okay', '好吧', 'fine', 'chill', 'relax', 'quiet', 'breathe', 'rest'] },
]

const POS_EMO = ['😍', '🥰', '❤️', '😚', '😘', '💕', '😊', '🥹', '✨', '😄']
const NEG_EMO = ['💔', '😭', '😡', '🤬', '😢', '😞']
const HI_EMO = ['🔥', '‼️', '😳', '😱']

function tokenize(low: string): string[] {
  return low.match(/[a-z0-9']+|[一-鿿가-힯]/g) || []
}

// Read-only featurization — measures the text, never rewrites it (§8.2).
export function featurize(text: string): Feat {
  const low = text.toLowerCase()
  const isEmote = /\*[^*]+\*/.test(text)

  let best: Topic | null = null
  let bestScore = 0
  for (const t of TOPICS) {
    let s = 0
    for (const k of t.kw) if (low.includes(k)) s += 1 + k.length * 0.04
    if (s > bestScore) {
      bestScore = s
      best = t
    }
  }

  let hue: number
  let sat: number
  let val = 0
  let aro = 0
  let vuln = 0
  if (best) {
    hue = best.hue
    sat = best.sat
    val = best.val
    aro = best.aro
  } else {
    let x = 0
    for (let i = 0; i < low.length; i++) x = (x * 31 + low.charCodeAt(i)) >>> 0
    hue = x % 360
    sat = 0.6
  }

  for (const e of POS_EMO) if (text.includes(e)) { val += 0.5; aro += 0.25 }
  for (const e of NEG_EMO) if (text.includes(e)) { val -= 0.5; aro += 0.4 }
  for (const e of HI_EMO) if (text.includes(e)) { aro += 0.45 }
  const reps = (text.match(/(.)\1\1+/g) || []).length // itttt / 😚😚😚
  if (reps) aro += Math.min(0.5, reps * 0.2)
  const letters = text.replace(/[^a-zA-Z]/g, '')
  if (letters.length > 3) {
    const caps = (text.match(/[A-Z]/g) || []).length / letters.length
    if (caps > 0.5) aro += 0.3
  }
  aro += Math.min(0.4, (text.match(/!/g) || []).length * 0.15)
  if (/(\b\w)-\1/i.test(text) || /\b\w-\w-/i.test(text)) { vuln += 0.6; aro = Math.max(0, aro - 0.2); val -= 0.05 } // h-h-Hi

  val = Math.max(-1, Math.min(1, val))
  aro = Math.max(0, Math.min(1, aro))
  vuln = Math.max(0, Math.min(1, vuln))

  const tokens = tokenize(low)
  if (best) tokens.push('#' + best.name)

  return {
    hue,
    sat,
    affect: { valence: val, arousal: aro, vulnerability: vuln },
    topic: best ? best.name : null,
    topicLabel: best ? best.label : null,
    tokens,
    isEmote,
    weight: 1 + aro * 1.4 + Math.min(reps, 4) * 0.25,
  }
}
