import type { RenderMode } from '../field/types'

type Props = { facets: number; mood: string; mode: RenderMode | null }

// Frosted top bar: wordmark + live weather (mood) + facet count.
export function Header({ facets, mood, mode }: Props) {
  return (
    <div className="header">
      <div className="wordmark">
        Any<b>Field</b>
      </div>
      <div className="status">
        <span className={'mood mood-' + mood}>
          <i className="mdot" /> {mood}
        </span>
        <span className="sep">·</span>
        <span className="facets">
          {facets} {facets === 1 ? 'facet' : 'facets'}
        </span>
        {mode && <span className="rmode">{mode === 'gpu' ? 'WebGPU' : '2D'}</span>}
      </div>
    </div>
  )
}
