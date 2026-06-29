# AnyField — Design Document

> A personal WebGPU glass-space where posting *a lot* is the point.
> High-volume self-expression composites into a living, liquid collage
> instead of flooding anyone's feed.

---

## 1. The idea, precisely

### The problem
People who post frequently to personal social accounts ("over-posters") create
two bad outcomes under the **feed / push** model:

1. **They annoy their followers.** Every post is force-fed into other people's
   timelines, so volume reads as noise.
2. **They get *low* engagement anyway.** The feed punishes frequency, so the
   prolific poster is both irritating *and* unrewarded.

The instinct to "spam" is really just a high drive for low-friction
self-expression. The feed model is what turns that drive into a problem.

### The reframe — three pillars

**Pillar 1 — Pull, not push. It is not a feed.**
- A user has a **Field** — an infinite, zoomable glass surface that is *theirs*.
- Posting is **frictionless and unlimited**. Drop text, an image, a link, a
  color, a mood. No "is this worth posting?" gate.
- Posts do **not** stream chronologically. A layout engine **composites** them
  into a **liquid collage** that reads as an evolving identity portrait.
- Viewers **visit** a Field and explore it. Nothing is pushed at them.

> **Volume becomes texture, not noise.** The more you post, the richer and more
> "you" your field looks. Spamming is reframed as *painting*.

**Pillar 2 — The eternal present (anti-archive).**
Instagram/Stories are *live-only*: they hold one current thought, and the
moment you move on, the old one is **frozen and archived** — you can't change
it, and it's displayed as the past, not as something still happening.

AnyField inverts this. The Field is a **perpetual present**:
- Posts are **mutable**. "I feel this way today" can be *re-felt* tomorrow —
  edit, layer onto, or re-surface a thought without deleting it.
- Nothing is archived into a dead timeline. Older posts **recede** (sink into
  fog, §6) but stay **alive and editable**, and the whole field always reads as
  *"this is me, now."*
- History isn't erased — it's **composted into the present** (see §10 Q2). You
  build *on* yourself instead of leaving frozen snapshots behind.

> The Field is a *living portrait that is always current*, not a graveyard of
> archived moments.

**Pillar 3 — Many-into-one-frame.**
On Instagram you can't meaningfully collage many messages into one frame —
nobody wants 50 reels stacked on a single image. AnyField is built for exactly
that: **aggregation is the feature.** Many fragments (images, tracks, lyrics,
captions, moods) compose into **one coherent frame** — the liquid collage —
that is pleasant to look at *because* it's many things at once.

### Non-goals (explicitly)
- ❌ Pushing content into other people's feeds / notifications.
- ❌ Mass-messaging, bulk outreach, or any kind of unsolicited contact.
- ❌ Engagement-maximizing dark patterns (infinite scroll, streak guilt, etc.).

AnyField succeeds by making *self-directed* expression beautiful, not by
broadcasting it at others.

---

## 2. Aesthetic direction — "Liquid blend"

Posts are **not** discrete cards on a grid. They **melt and bleed into one
another** by color and theme, sitting somewhere between a mood-board and
generative art. Discrete content is still readable up close, but zoomed out the
Field reads as **one continuous painting**.

Visual principles:

| Principle | Meaning |
|-----------|---------|
| **Continuity over grid** | No visible tile borders. Neighboring posts share edges via color bleed and refraction. |
| **Color as gravity** | Posts of similar hue drift together and merge into regions ("a warm corner," "a blue mood"). |
| **Age as depth** | Fresh posts surface bright and sharp; older posts sink into frosted fog and desaturate. |
| **Glass, not flat** | Everything is refractive frosted glass — light bends through the surface; motion causes subtle parallax. |
| **Calm motion** | Slow, fluid-like drift. Never frantic. The field breathes. |

The emotional target: *opening your Field should feel like looking into a
lava-lamp made of your own thoughts* — mesmerizing, personal, low-pressure.

---

## 3. Architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│                          Browser                             │
│                                                              │
│  ┌────────────────┐      ┌──────────────────────────────┐   │
│  │  UI Overlay     │      │      WebGPU Field Renderer    │   │
│  │  (HTML/CSS)     │      │  (canvas, full viewport)      │   │
│  │  - compose box  │      │  - liquid-blend shaders       │   │
│  │  - zoom/search  │◄────►│  - instanced post quads       │   │
│  │  - controls     │ msgs │  - pan / zoom camera          │   │
│  └────────────────┘      └──────────────┬───────────────┘   │
│           │                             │ positions/textures  │
│           ▼                             ▼                     │
│  ┌────────────────┐      ┌──────────────────────────────┐   │
│  │  App State      │◄────►│  Layout Engine (Web Worker)   │   │
│  │  (store)        │      │  - color/theme clustering     │   │
│  └───────┬────────┘      │  - force-directed packing     │   │
│          │               │  - depth-by-age               │   │
│          ▼               └──────────────────────────────┘   │
│  ┌────────────────┐                                          │
│  │  Persistence    │   IndexedDB (posts, blobs, layout cache)│
│  │  (local-first)  │                                          │
│  └────────────────┘                                          │
└─────────────────────────────────────────────────────────────┘
```

**Local-first:** the entire MVP runs with **no server**. All data lives in
IndexedDB. A future backend is additive (sync layer), not a rewrite — see §8.

---

## 4. Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Language | **TypeScript** | Type safety for shader/buffer plumbing. |
| Build | **Vite** | Fast dev server, easy WGSL imports, simple static build. |
| Render | **WebGPU** (WebGL2 fallback) | GPU instancing + compute for 500+ liquid tiles at 60fps. |
| Shaders | **WGSL** | Native WebGPU shading language. |
| Layout | **Web Worker** | Keep physics/clustering off the main thread. |
| State | Tiny custom store / **Zustand** | No framework lock-in; UI is thin. |
| UI overlay | Plain DOM (or Lit) | The "app" is the canvas; HTML is just chrome. |
| Storage | **IndexedDB** via `idb` | Structured posts + image/artwork blobs, offline-capable. |
| Music | **Spotify oEmbed / IFrame** (no auth) | Drop a track link → embedded player + artwork, zero backend. Web API later. |
| Lyrics | Paste / `.lrc` import (MVP) | User-supplied synced lyrics now; licensed provider later. |
| Tests | **Vitest** + Playwright | Unit (layout/store) + smoke (canvas renders). |

> WebGPU has no universal support guarantee. We **feature-detect** and degrade:
> WebGPU → WebGL2 (simpler blend, fewer tiles) → static DOM grid (no shaders).

---

## 5. Data model

All persisted locally. IDs are ULIDs (sortable by time).

A **Post is a composite** (Pillar 3): one post is an *artifact* made of stacked
**layers** — e.g. a travel photo + a Spotify track + its lyrics + five captions
+ a mood — that together express a single "I feel this way today." Posts are
**mutable** (Pillar 2): you keep editing, adding layers, and re-surfacing them
without deleting history.

```ts
type Field = {
  id: string;
  ownerHandle: string;        // local-only for now, e.g. "@me"
  title: string;
  createdAt: number;
  theme: FieldTheme;          // palette + motion config
};

// A single layer of a composite post.
type Layer =
  | { kind: "image"; blobKey: string; alt?: string }
  | { kind: "text";  body: string }                       // a caption / thought
  | { kind: "link";  url: string; title?: string }
  | { kind: "color"; hex: string }
  | { kind: "mood";  label: string }                      // e.g. "wistful"
  | { kind: "track"; provider: "spotify";                 // music
      uri: string; title: string; artist: string;
      artworkBlobKey?: string;
      lyrics?: { line: string; tMs?: number }[] };        // optional synced lyrics

type Post = {
  id: string;                 // ULID — encodes creation time
  fieldId: string;
  layers: Layer[];            // the composite: image + track + lyrics + captions…
  caption?: string;           // primary caption; extra captions live as text layers
  // --- collage signals (drive the liquid blend) ---
  hue: number;                // 0..360, dominant color (auto-extracted)
  saturation: number;         // 0..1
  tags: string[];             // user or auto ("calm", "rant", "food"…)
  weight: number;             // visual size; default 1, decays with age
  // --- living/eternal-present signals (Pillar 2) ---
  createdAt: number;
  updatedAt: number;          // bumps on any edit; drives "freshness" resurfacing
  revivedAt?: number;         // last time the user re-surfaced an old post
  history?: PostRevision[];   // append-only edits — nothing is destroyed
  pinnedPresent?: boolean;    // "this is me right now" — resists sinking into fog
};

type PostRevision = { at: number; layers: Layer[]; caption?: string };

type LayoutNode = {           // computed, cached, not authored
  postId: string;
  x: number; y: number;       // field-space position
  scale: number;              // age + weight
  depth: number;              // 0 = surface (fresh), 1 = sunk (old)
  blendRegion: number;        // cluster id for color bleed
};
```

**Mutability without loss (Pillar 2):** edits bump `updatedAt` and push the prior
state into `history` (append-only) — so a post can change and resurface as
"current" *without erasing* what it was. `revivedAt`/`pinnedPresent` let an old
thought float back to the surface, keeping the field in the eternal present.

**Color extraction:** on post creation/edit, compute dominant `hue`/`saturation`
from the strongest visual layer (image pixels or track artwork), falling back to
text-sentiment → palette mapping. This is what lets the layout cluster by color
and the shader bleed neighbors.

**Spotify / music layers:** the `track` layer stores a Spotify URI + metadata
(and optional time-synced `lyrics`). In the local-first MVP we embed the Spotify
**oEmbed/IFrame** player (no auth, no backend) and let users paste lyrics or
import an `.lrc` file; a later phase can use the Spotify Web API + a licensed
lyrics provider for true synced playback. Lyrics render *as glass text* over the
tile and can drive the liquid motion (lines drift on the beat).

---

## 6. The liquid-blend renderer

The core technical challenge: make discrete posts look like one continuous
liquid surface while keeping content legible up close.

### Pipeline (per frame)
1. **Camera** — pan/zoom transform → view-projection matrix (2.5D orthographic
   with a small perspective tilt for parallax).
2. **Instanced quads** — one instanced draw call for all post tiles. Per-instance
   data: position, scale, hue, depth, blendRegion, texture index.
3. **Field-blur pass** — render tiles to an offscreen texture, then a separable
   Gaussian / Kawase blur whose radius scales with each tile's `depth` (old =
   blurrier → "frosted fog").
4. **Liquid-blend pass** — a full-screen shader samples the tile texture plus a
   low-res **color field** (a downsampled, heavily-blurred version of the scene)
   and **lerps toward neighbors of the same `blendRegion`**, dissolving hard
   edges. A subtle domain-warp (flow noise) makes edges feel fluid.
5. **Refraction / glass** — sample background through a normal map derived from
   tile edges; add fresnel rim + specular for the "glass" read.
6. **Composite** — tone-map, vignette, grain. Output to canvas.

### Key shaders (WGSL modules)
- `tile.instanced.wgsl` — vertex: place/scale quads; fragment: sample post
  texture, apply hue shift + depth desaturation.
- `blend.fullscreen.wgsl` — the liquid bleed (neighbor lerp + flow-noise warp).
- `glass.refract.wgsl` — refraction, fresnel, specular highlight.
- `blur.kawase.wgsl` — cheap depth-scaled blur for the fog effect.

### Composite tiles (Pillar 3)
A tile is **not** a single image — it renders a composite post:
- The strongest visual layer (image / track artwork) is the tile's base texture.
- **Captions and lyrics** render as **glass text** layered over the tile (SDF
  text in WebGPU, or a DOM overlay anchored to the tile's screen position for
  the MVP). Multiple captions fan out around the tile when focused.
- A **music layer** shows a small play glyph; selecting the tile opens the
  embedded Spotify player in the UI overlay, and lyrics can **drift on the beat**
  to drive local liquid motion.
- Zoomed out, all of this collapses into the tile's color contribution to the
  field; zoomed in, the layers separate and become individually readable/playable.

### Legibility safeguard
Liquid blending is **zoom-dependent**: blend strength → 0 as the user zooms in
on a post (so text/lyrics stay crisp), → max when zoomed out (so the field reads
as one painting). One uniform (`blendStrength = f(zoom)`) drives this.

### Performance budget
- Target **60fps** with **≤ 500** live tiles on mid-range hardware.
- Single instanced draw for tiles; blur/blend are fixed full-screen passes.
- Off-screen / far-zoom tiles use a lower mip / get culled.
- Layout runs in a worker; renderer only consumes a flat positions buffer.

---

## 7. The layout engine (Web Worker)

Turns an unordered pile of posts into a composition. Runs off-thread; emits a
`Float32Array` of `LayoutNode`s the renderer uploads directly.

Algorithm (incremental, re-runs on new posts / resize):
1. **Cluster by signal** — group posts by `hue` (primary) and shared `tags`
   (secondary) into `blendRegion`s. (k-means on hue, or simple hue bucketing.)
2. **Pack within regions** — force-directed relaxation: same-region posts attract,
   different-region repel, with a mild centering force. A few hundred iterations,
   then settle.
3. **Apply depth & scale** — `depth` and `scale` from `createdAt` (age) and
   `weight`. Fresh + heavy posts float forward and larger.
4. **Stabilize** — new posts ease into place; existing posts barely move
   (avoid the whole field jumping every time you post). Persist the layout cache
   so reopening the Field is instant.

> Design tension to watch: **stability vs. optimal packing.** Users should feel
> their field is a *place*, not a kaleidoscope that reshuffles on every post.
> Bias hard toward stability; only re-flow regions that actually changed.

---

## 8. Local-first now, sync later

**Phase A (MVP, this plan): no server.**
- Posts + image blobs + layout cache in IndexedDB.
- Everything works offline. Instant. Private by default.

**Phase B (additive): sync + visiting.**
- A thin posts API + object storage; IndexedDB becomes the local cache/offline
  buffer (last-write-wins or CRDT for multi-device).
- A **share link** renders a read-only Field for visitors (the "pull" model).
- Accounts/handles become real; until then `@me` is local.

Because the renderer and layout engine only consume the local store, adding sync
does **not** touch them — it's a new data source behind the same store API.

---

## 9. Roadmap

| Phase | Deliverable | Proves |
|-------|-------------|--------|
| **0** | Project scaffold (Vite + TS), WebGPU init + capability detection, blank canvas with pan/zoom camera. | Pipeline + fallbacks work. |
| **1** | Instanced glass tiles (static fake data), depth-blur fog. | The "glass" read at scale. |
| **2** | Liquid-blend pass + zoom-dependent blend strength. | The signature aesthetic; legibility holds. |
| **3** | Layout engine in a worker (cluster + pack + depth). | Spam → composition. |
| **4** | Composite compose box (image + captions + mood) + IndexedDB persistence + color extraction; live re-layout. | The actual product loop. |
| **5** | Music layers: paste a Spotify link → embedded player + artwork; paste/import lyrics; lyrics render as glass text. | The "drop in Spotify + lyrics" loop. |
| **6** | Eternal-present mechanics: edit posts (append-only `history`), re-surface/pin "this is me now," age→fog without archiving. | Pillar 2 — the living portrait. |
| **7** | Identity layer: tags, field theme/palette, search/zoom-to-region, share-view (read-only). | "Meaningful / identity-driven." |
| **8** | *(future)* Backend sync, real accounts, Spotify Web API + licensed synced lyrics, visiting others' Fields. | Multi-user pull network. |

MVP = Phases 0–7, all local.

---

## 10. Open questions for later

1. **Auto-tagging/sentiment** for non-visual posts — on-device model, or simple
   keyword/palette mapping to start? (Start simple.)
2. **Field "seasons"** — should very old posts eventually fully dissolve into the
   background palette (compost), or always be zoomable-to? (Lean: dissolve
   visually, retain data.)
3. **Multiple fields per user** (e.g. "rants" vs "art") vs one field with regions.
4. **Moderation/safety** once sharing exists (out of scope until Phase 6, but
   note it now: visiting is opt-in, no push, report/block on share links).

---

## Appendix: directory layout (proposed)

```
src/
  main.ts                 # bootstrap, capability detection
  gpu/
    device.ts             # WebGPU init + WebGL2 fallback
    renderer.ts           # frame loop, passes
    pipelines/            # tile, blend, glass, blur pipelines
    shaders/*.wgsl
  layout/
    worker.ts             # layout engine entry
    cluster.ts  pack.ts  depth.ts
  store/
    state.ts              # app store
    db.ts                 # IndexedDB (idb)
    color.ts              # dominant-hue extraction
  ui/
    compose.ts  controls.ts  overlay.css
docs/
  DESIGN.md               # this file
```
