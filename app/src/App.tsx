import { useEffect, useRef, useState } from 'react'
import { Field } from './ui/Field'
import { Header } from './ui/Header'
import { ChatDock } from './ui/ChatDock'
import { Chips } from './ui/Chips'
import { ProfilePanel } from './ui/ProfilePanel'
import type { Engine } from './field/engine'
import type { RenderMode } from './field/types'
import { DEFAULT_SETTINGS, getProfile, getSettings, putProfile, putSettings, type Profile, type Settings } from './store/db'

const defaultProfile = (): Profile => ({
  ownerHandle: '@me', // local-only (DESIGN §6) — real handles arrive with §9.2
  displayName: 'me',
  avatar: '🦊',
  title: '',
  createdAt: Date.now(),
})

export default function App() {
  const engineRef = useRef<Engine | null>(null)
  const [engine, setEngine] = useState<Engine | null>(null)
  const [posted, setPosted] = useState(false)
  const [mode, setMode] = useState<RenderMode | null>(null)
  const [stats, setStats] = useState({ facets: 0, mood: 'calm' })
  const [profile, setProfile] = useState<Profile | null>(null)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [sheet, setSheet] = useState(false)
  const [times, setTimes] = useState(false)

  useEffect(() => {
    getProfile().then((p) => {
      const prof = p ?? defaultProfile()
      if (!p) putProfile(prof)
      setProfile(prof)
    })
    getSettings().then(setSettings)
  }, [])

  // push look settings + avatar into the engine whenever either side changes
  useEffect(() => {
    engine?.applySettings(settings)
  }, [engine, settings])
  useEffect(() => {
    if (engine && profile) engine.setAvatar(profile.avatar)
  }, [engine, profile])
  useEffect(() => {
    engine?.setShowTimes(times)
  }, [engine, times])

  const updateProfile = (patch: Partial<Profile>) => {
    if (!profile) return
    const next = { ...profile, ...patch }
    setProfile(next)
    putProfile(next)
  }
  const updateSettings = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    putSettings(next)
  }

  const send = (text: string) => engineRef.current?.spawn(text)

  return (
    <div className="app">
      <Field
        onReady={(e) => {
          engineRef.current = e
          setEngine(e)
        }}
        onFirstPost={() => setPosted(true)}
        onMode={setMode}
        onStats={setStats}
      />

      <Header
        facets={stats.facets}
        mood={stats.mood}
        mode={mode}
        title={profile?.title ?? ''}
        avatar={profile?.avatar ?? '🦊'}
        times={times}
        onTimes={() => setTimes((v) => !v)}
        onProfile={() => setSheet(true)}
      />

      {!posted && (
        <div className="hint">
          <div className="hint-card">
            <div className="hint-title">This is your field.</div>
            <div className="hint-sub">
              Send anything — it floats up as <b>glass</b> and the stream scrolls on. <b>🎵 Title — Artist</b> (or a pasted Spotify link) becomes a playable cover-block.
            </div>
          </div>
        </div>
      )}

      <div className="scrim" />
      <Chips onSend={send} />
      <ChatDock onSend={send} />

      {sheet && profile && (
        <ProfilePanel profile={profile} settings={settings} onProfile={updateProfile} onSettings={updateSettings} onClose={() => setSheet(false)} />
      )}
    </div>
  )
}
