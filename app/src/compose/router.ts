import type { Facet, Feat } from './types'
import { TOPICS } from './featurize'

// Online DP-means / leader-follower routing knobs (DESIGN §8.8, tuned for the
// topic+hue+token similarity used here rather than raw n-gram cosine).
export const P = {
  TAU_JOIN: 0.42, // strong match → join
  TAU_NEW: 0.3, // below this → spawn a new facet (keeps hue-adjacent topics apart)
  TAU_DUP: 0.8, // near-duplicate → thicken, don't stack (§8.5)
  ALPHA: 0.18, // centroid EMA rate (recency vs. stability, §8.4)
  MAX_FACETS: 24, // cap before folding into the nearest (§8.6)
  KEEP: 4, // fresh droplets kept discrete per facet before composting (§3.5)
}

const LABELS: Record<string, string> = Object.fromEntries(TOPICS.map((t) => [t.name, t.label]))

export function hueLerp(a: number, b: number, t: number): number {
  const d = ((b - a + 540) % 360) - 180
  return (a + d * t + 360) % 360
}
function hueDist(a: number, b: number): number {
  return Math.abs(((b - a + 540) % 360) - 180)
}
export function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0
  const A = new Set(a)
  const B = new Set(b)
  let i = 0
  for (const x of A) if (B.has(x)) i++
  return i / (A.size + B.size - i)
}

// Combined similarity: topic match dominates, hue + token overlap refine (§8.3).
export function similarity(f: Facet, feat: Feat): number {
  const topicSim = feat.topic ? (f.topic === feat.topic ? 1 : f.topics[feat.topic] ? 0.5 : 0) : 0
  const hueSim = 1 - hueDist(feat.hue, f.hue) / 180
  const tokSim = jaccard(feat.tokens, f.tokenList)
  return 0.6 * topicSim + 0.25 * hueSim + 0.15 * tokSim
}

// Fold a droplet's features into a facet: mass++, centroid drift via EMA,
// re-derive the emergent label. Never touches any stored text.
export function absorb(f: Facet, feat: Feat): void {
  f.mass++
  f.hue = hueLerp(f.hue, feat.hue, P.ALPHA)
  f.sat = f.sat * (1 - P.ALPHA) + feat.sat * P.ALPHA
  if (feat.topic) {
    f.topics[feat.topic] = (f.topics[feat.topic] || 0) + 1
    let tn: string | null = null
    let tc = 0
    for (const k in f.topics) if (f.topics[k] > tc) { tc = f.topics[k]; tn = k }
    f.topic = tn
    if (tn && LABELS[tn]) f.label = LABELS[tn]
  }
  for (const t of feat.tokens) if (!f.tokenList.includes(t)) f.tokenList.push(t)
  if (f.tokenList.length > 40) f.tokenList = f.tokenList.slice(-40)
  f.radius = 48 + Math.sqrt(f.mass) * 17
}
