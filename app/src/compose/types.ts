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

// A post in the left-aligned chat stream (WeChat-like), rendered as glass.
export type Post = {
  id: string // ULID (§5) — lexicographically sortable by time
  kind: 'text' | 'song'
  text: string
  title?: string
  artist?: string
  coverUrl?: string // real album art (Spotify oEmbed / iTunes), display-only
  previewUrl?: string // 30s audio preview — tap the cover to play
  linkUrl?: string // open the track (or a search for it) on Spotify
  hue: number
  sat: number
  facetId: string
  w: number
  h: number
  x: number
  y: number
  tx: number // target center-x (collage slot) — transient
  ty: number // target center-y (collage slot) — transient
  lead: boolean // first post of its cluster — carries the avatar. transient
  at: number // epoch ms — permanent, persisted
  born: number // runtime clock (performance.now) — transient, for animation
  connectPrev: boolean // same facet, sent apart in time → linked by a bead
  attachPrev: boolean // sent in a rapid burst → fused flush to the post above (timing only, any facet)
  attachNext: boolean // the next post fused flush below this one (set retroactively)
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
