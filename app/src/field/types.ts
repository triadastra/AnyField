// A featurized read of a message (derived FROM the text, never altering it).
export type Feat = {
  hue: number
  sat: number
  aro: number
  isEmote: boolean
}

// A glass pill on the field. `text` is stored VERBATIM (DESIGN §8.2).
export type Item = {
  id: number
  text: string
  hue: number
  sat: number
  isEmote: boolean
  x: number
  y: number
  hw: number // half-width
  hh: number // half-height
  vx: number
  vy: number
  born: number
}

export type RenderMode = 'gpu' | '2d'
