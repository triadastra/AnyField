import type { Profile, Settings } from '../store/db'

type Props = {
  profile: Profile
  settings: Settings
  onProfile: (patch: Partial<Profile>) => void
  onSettings: (patch: Partial<Settings>) => void
  onClose: () => void
}

const AVATARS = ['🦊', '🐱', '🐰', '🐻', '🐼', '🦉', '🐸', '🌙', '🌊', '🔥', '🌸', '⭐']

// The owner's identity + the two live look settings, in a glass sheet.
// Local-only (DESIGN §6 Field / §9 local-first) — real accounts are §9.2.
export function ProfilePanel({ profile, settings, onProfile, onSettings, onClose }: Props) {
  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div className="sheet-title">Your field</div>
          <button className="sheet-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="sheet-sec">Avatar</div>
        <div className="avgrid">
          {AVATARS.map((a) => (
            <button key={a} className={'av' + (profile.avatar === a ? ' on' : '')} onClick={() => onProfile({ avatar: a })}>
              {a}
            </button>
          ))}
        </div>

        <div className="sheet-sec">Profile</div>
        <label className="frow">
          <span>Name</span>
          <input value={profile.displayName} onChange={(e) => onProfile({ displayName: e.target.value })} placeholder="me" />
        </label>
        <label className="frow">
          <span>Handle</span>
          <input value={profile.ownerHandle} onChange={(e) => onProfile({ ownerHandle: e.target.value })} placeholder="@me" />
        </label>
        <label className="frow">
          <span>Field title</span>
          <input value={profile.title} onChange={(e) => onProfile({ title: e.target.value })} placeholder="My Field" />
        </label>
        <div className="sheet-note">Local-only for now — accounts arrive with the backend. Field since {new Date(profile.createdAt).toLocaleDateString()}.</div>

        <div className="sheet-sec">Glass</div>
        <label className="frow tog">
          <span>
            Clear glass
            <em>pure refraction — no frost, no facet tint</em>
          </span>
          <input type="checkbox" checked={settings.clearGlass} onChange={(e) => onSettings({ clearGlass: e.target.checked })} />
          <i />
        </label>
        <label className="frow tog">
          <span>
            Emotional weather
            <em>let recent mood wash the backdrop</em>
          </span>
          <input type="checkbox" checked={settings.weatherTint} onChange={(e) => onSettings({ weatherTint: e.target.checked })} />
          <i />
        </label>
      </div>
    </div>
  )
}
