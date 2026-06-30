import type { Feat } from './types'

// Keyword -> [hue, saturation] hints. Content lightly tints the glass.
const KW: [number, number, string[]][] = [
  [30, 0.85, ['macaron', 'croissant', '🥐', 'coffee', '☕', 'food', 'cake', '🍰', 'yum', 'eat', 'taste', 'sweet']],
  [285, 0.8, ['song', 'music', '🎵', '🎶', 'lyric', 'sing', 'beat', 'newjeans', 'kiss of life', 'asap', 'belle', 'nothing']],
  [335, 0.85, ['love', '😍', '🥰', '❤️', '😚', 'cute', '好看', '好好看', '💕', 'miss', 'beautiful']],
  [205, 0.65, ['meow', 'again', 'me', '我', 'myself', 'hi', 'back', '似乎']],
  [128, 0.6, ['brugge', 'belgium', 'beach', 'home', 'park', 'travel', 'place', '街']],
  [222, 0.55, ['镜子', 'gone', '朋友', '复活', 'memory', 'wistful', '曾经']],
  [2, 0.9, ['好痛', '痛', 'pain', 'hurt', '边界', '拒绝', '妥协', 'get the fuck out', 'fuck', 'hate', '轰炸']],
]

// Read-only featurization. Returns routing/tint signals WITHOUT touching the text.
export function featurize(text: string): Feat {
  const low = text.toLowerCase()
  let hue: number | null = null
  let sat = 0.7
  for (const [h, s, ws] of KW) {
    for (const w of ws) {
      if (low.includes(w)) {
        hue = h
        sat = s
        break
      }
    }
    if (hue !== null) break
  }
  if (hue === null) {
    let x = 0
    for (let i = 0; i < low.length; i++) x = (x * 31 + low.charCodeAt(i)) >>> 0
    hue = x % 360
    sat = 0.62
  }

  // arousal (measured, never rewritten): elongation + exclamation
  let aro = 0
  const reps = (text.match(/(.)\1\1+/g) || []).length
  if (reps) aro += Math.min(0.6, reps * 0.22)
  aro += Math.min(0.4, (text.match(/!/g) || []).length * 0.15)

  const isEmote = /\*[^*]+\*/.test(text)
  return { hue, sat, aro, isEmote }
}
