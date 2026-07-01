// Composition data model (a small, honest slice of DESIGN §6).

export type Affect = { valence: number; arousal: number; vulnerability: number }

// A featurized read of a message. Derived FROM the text, never altering it.
export type Feat = {
  hue: number
  sat: number
  affect: Affect
  topic: string | null
  topicLabel: string | null
  tokens: string[]
  isEmote: boolean
  weight: number
}

// A droplet: one fragment routed into a facet. `text` is VERBATIM (§8.2).
export type Droplet = {
  id: number
  text: string
  hue: number
  sat: number
  isEmote: boolean
  tokens: string[]
  dup: number // near-duplicate thickness (§8.5) — originals still kept
  facet: Facet
  angle: number
  orbit: number
  x: number
  y: number
  hw: number
  hh: number
  born: number
  state: 'fresh' | 'aggregated'
}

// A post in the right-aligned chat stream (WeChat-like), rendered as glass.
export type Post = {
  id: number
  kind: 'text' | 'song'
  text: string
  title?: string
  artist?: string
  hue: number
  sat: number
  facetId: string
  w: number
  h: number
  x: number
  y: number
  ty: number // target center-y (stack position)
  born: number
  connectPrev: boolean // same facet as the post below it → linked
}

// A facet of self: a pool droplets coalesce into (§3.3). Emergent, labeled,
// with a drifting centroid (here: topic mix + hue EMA + token set).
export type Facet = {
  id: string
  label: string
  topic: string | null
  topics: Record<string, number>
  tokenList: string[]
  hue: number
  sat: number
  mass: number
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  members: Droplet[]
}
