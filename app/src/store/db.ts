// Local-first persistence (DESIGN §9): IndexedDB via `idb`.
//
// The engine is the only consumer of this store; nothing here ever touches
// HTTP or auth. Records are put (append/update) only — nothing is ever
// deleted (pillar 2, the eternal present). Post ids are ULIDs (§5), so the
// `posts` store's key order IS chronological order.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Facet, Post } from '../compose/types'

// The permanent identity of a post — what survives a reload. Transient layout
// (x/y/ty and the runtime `born` clock) is rebuilt by the engine on restore.
// `text` is stored VERBATIM, to the character (§8.2).
export type PostRecord = Omit<Post, 'x' | 'y' | 'tx' | 'ty' | 'lead' | 'born'> & { at: number }

// A facet's routing state (centroid, label, mass). `members` is a legacy
// pool-layout field the router never reads — not persisted.
export type FacetRecord = Omit<Facet, 'members'>

export type Weather = { val: number; aro: number; vuln: number }

// The owner's local identity — a slice of DESIGN §6 `Field` (ownerHandle is
// local-only for now, e.g. "@me"; real accounts come with the §9.2 backend).
export type Profile = {
  ownerHandle: string
  displayName: string
  avatar: string // an emoji for now; avatarUrl arrives with accounts (§9.2)
  title: string // Field.title
  createdAt: number
}

// Only knobs that actually do something today — no aspirational settings.
export type Settings = {
  clearGlass: boolean // pure clear solid glass vs. the full liquid-glass tint
  weatherTint: boolean // emotional-weather wash on the backdrop (§2)
}

export const DEFAULT_SETTINGS: Settings = { clearGlass: true, weatherTint: true }

interface FieldDB extends DBSchema {
  posts: { key: string; value: PostRecord }
  facets: { key: string; value: FacetRecord }
  meta: { key: string; value: Weather | Profile | Settings }
}

let dbp: Promise<IDBPDatabase<FieldDB>> | null = null

function db(): Promise<IDBPDatabase<FieldDB>> {
  dbp ??= openDB<FieldDB>('anyfield', 1, {
    upgrade(d) {
      d.createObjectStore('posts', { keyPath: 'id' })
      d.createObjectStore('facets', { keyPath: 'id' })
      d.createObjectStore('meta')
    },
  })
  return dbp
}

export async function loadField(): Promise<{ posts: PostRecord[]; facets: FacetRecord[]; weather: Weather | null }> {
  const d = await db()
  const [posts, facets, weather] = await Promise.all([
    d.getAll('posts'), // keyPath is a ULID → getAll returns time order
    d.getAll('facets'),
    d.get('meta', 'weather'),
  ])
  return { posts, facets, weather: (weather as Weather | undefined) ?? null }
}

export async function getProfile(): Promise<Profile | null> {
  try {
    const d = await db()
    return ((await d.get('meta', 'profile')) as Profile | undefined) ?? null
  } catch {
    return null
  }
}

export async function getSettings(): Promise<Settings> {
  try {
    const d = await db()
    const s = (await d.get('meta', 'settings')) as Settings | undefined
    return { ...DEFAULT_SETTINGS, ...s }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function putProfile(p: Profile): void {
  db()
    .then((d) => d.put('meta', { ...p }, 'profile'))
    .catch(() => {})
}

export function putSettings(s: Settings): void {
  db()
    .then((d) => d.put('meta', { ...s }, 'settings'))
    .catch(() => {})
}

// Writes are fire-and-forget: persistence must never stall or break posting.
export function putPost(r: PostRecord): void {
  db()
    .then((d) => d.put('posts', r))
    .catch(() => {})
}

export function putFacet(f: Facet | FacetRecord): void {
  const { members: _members, ...rec } = f as Facet
  db()
    .then((d) => d.put('facets', rec))
    .catch(() => {})
}

export function putWeather(w: Weather): void {
  db()
    .then((d) => d.put('meta', { ...w }, 'weather'))
    .catch(() => {})
}
