import type { RenderMode } from '../field/types'

type Props = {
  facets: number
  mood: string
  mode: RenderMode | null
  title: string
  avatar: string
  times: boolean
  onTimes: () => void
  onProfile: () => void
}

// Frosted top bar: field title + live weather (mood) + facet count + the
// timestamp toggle + the owner's avatar (tap → profile & settings sheet).
export function Header({ facets, mood, mode, title, avatar, times, onTimes, onProfile }: Props) {
  return (
    <div className="header">
      <div className="wordmark">
        {title.trim() ? (
          title
        ) : (
          <>
            Any<b>Field</b>
          </>
        )}
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
        <button className={'hbtn' + (times ? ' on' : '')} onClick={onTimes} aria-label="Show timestamps">
          🕒
        </button>
        <button className="hav" onClick={onProfile} aria-label="Profile & settings">
          {avatar}
        </button>
      </div>
    </div>
  )
}
