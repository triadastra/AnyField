// Song metadata — display-side enrichment only; the typed text stays verbatim (§8.2).
// No-auth, browser-only sources (DESIGN §5: "Spotify oEmbed/IFrame, no auth"):
//   - Spotify oEmbed for pasted track links → real cover art + canonical title
//   - iTunes Search for "🎵 Title — Artist" text → cover art + a playable 30s preview

export type SongMeta = { cover?: string; preview?: string; link?: string; title?: string; artist?: string }

const TRACK_RE = /https?:\/\/open\.spotify\.com\/(?:intl-[\w-]+\/)?track\/[A-Za-z0-9]+(?:\?\S*)?/

export function spotifyTrackUrl(text: string): string | null {
  const m = text.match(TRACK_RE)
  return m ? m[0] : null
}

export function spotifySearchUrl(term: string): string {
  return 'https://open.spotify.com/search/' + encodeURIComponent(term)
}

// iTunes supports ?callback= JSONP — the fallback when CORS is blocked.
let jseq = 0
function jsonp(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const name = '__anyfield_jsonp' + jseq++
    const s = document.createElement('script')
    const done = (fn: () => void) => {
      delete (window as unknown as Record<string, unknown>)[name]
      s.remove()
      fn()
    }
    ;(window as unknown as Record<string, unknown>)[name] = (d: unknown) => done(() => resolve(d))
    s.onerror = () => done(() => reject(new Error('jsonp failed')))
    s.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + name
    document.head.appendChild(s)
  })
}

async function getJSON(url: string): Promise<any> {
  try {
    const r = await fetch(url)
    if (!r.ok) throw new Error(String(r.status))
    return await r.json()
  } catch {
    return jsonp(url)
  }
}

async function oembed(trackUrl: string): Promise<SongMeta> {
  const r = await fetch('https://open.spotify.com/oembed?url=' + encodeURIComponent(trackUrl))
  if (!r.ok) throw new Error(String(r.status))
  const d = await r.json()
  return { cover: d.thumbnail_url, title: d.title, link: trackUrl }
}

async function itunes(term: string): Promise<SongMeta> {
  const url = 'https://itunes.apple.com/search?media=music&entity=song&limit=1&term=' + encodeURIComponent(term)
  const d = await getJSON(url)
  const t = d?.results?.[0]
  if (!t) return {}
  return {
    cover: typeof t.artworkUrl100 === 'string' ? t.artworkUrl100.replace('100x100', '300x300') : undefined,
    preview: t.previewUrl,
    title: t.trackName,
    artist: t.artistName,
  }
}

// Best-effort: every step may fail independently; the card still links out.
export async function resolveSong(q: { title?: string; artist?: string; spotifyUrl?: string | null }): Promise<SongMeta> {
  const out: SongMeta = {}
  if (q.spotifyUrl) {
    out.link = q.spotifyUrl
    try {
      const o = await oembed(q.spotifyUrl)
      out.cover = o.cover
      out.title = o.title
    } catch {
      /* keep going — iTunes may still resolve it from the typed title */
    }
  }
  const term = [q.title || out.title, q.artist].filter(Boolean).join(' ')
  if (term) {
    if (!out.link) out.link = spotifySearchUrl(term)
    try {
      const it = await itunes(term)
      out.cover = out.cover || it.cover
      out.preview = it.preview
      out.title = out.title || it.title
      out.artist = out.artist || it.artist
    } catch {
      /* no preview then — cover/link may still be set */
    }
  }
  return out
}
