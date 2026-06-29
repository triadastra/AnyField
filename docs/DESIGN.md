# AnyField — Design Document

> A personal WebGPU glass-space where posting *a lot* is the point.
> High-volume self-expression composites into a living, liquid portrait of your
> **interiority** — organized by facets of self, not by time.

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
- Posts do **not** stream chronologically. A composition engine **blends** them
  into a **liquid portrait** that reads as your evolving identity.
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
  fog / compost into the field, §7) but stay **alive and editable**, and the
  whole field always reads as *"this is me, now."*
- History isn't erased — it's **composted into the present** (see §11 Q2). You
  build *on* yourself instead of leaving frozen snapshots behind.

> The Field is a *living portrait that is always current*, not a graveyard of
> archived moments.

**Pillar 3 — Many-into-one-frame (interiority).**
On Instagram you can't meaningfully collage many messages into one frame —
nobody wants 50 reels stacked on a single image. AnyField is built for exactly
that: **aggregation is the feature.** Your loving-this-macaron and your
bold-music-taste and today's mood all exist *at the same time* and blend into
**one coherent frame** — a portrait of your **interiority** that others can read.

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
| **Color as gravity** | Posts of similar hue/theme drift together and merge into regions ("a warm corner," "a blue mood"). |
| **Age as depth** | Fresh posts surface bright and sharp; older posts sink into frosted fog and desaturate. |
| **Glass, not flat** | Everything is refractive frosted glass — light bends through the surface; motion causes subtle parallax. |
| **Emotional weather, not always calm** | The field's palette and motion span a full range — serene drift *and* turbulent storm. Calm is the resting state, not the only state. |

The emotional target: *opening your Field should feel like looking into a
lava-lamp made of your own thoughts* — mesmerizing, personal, low-pressure.

### Emotional weather (the field must be honest)

A portrait that can show delight but not pain or defiance is a **lie**. Real
high-volume self-expression includes nervousness (`h-h-Hi`), grief
(*新人们爱的那个镜子已经不在了* — the mirror they loved is gone), pain (*好痛*),
and hard boundaries (*我拒绝再次妥协我的边界* → *get the fuck out*). The Field has
to hold all of it with dignity — not prettify it away.

So the liquid blend has **weather**, driven by the affect of recent droplets
(valence + arousal, §8.2):

| Mood | Palette | Motion | Glass |
|------|---------|--------|-------|
| Calm / content | warm, soft | slow drift, gentle breathing | clear, smooth refraction |
| Tender / wistful | desaturated blues, fog | slow sink, long fades | soft, hazy |
| Excited / loud | bright, saturated | quick ripples, bigger droplets | sharp highlights |
| Pain / anger | deep reds, high contrast, dark | turbulent churn, sharp domain-warp | cracked/streaked refraction |

Weather is **local** (a stormy facet next to a calm one) and **temporary** — it
eases back toward calm as the storm's droplets age, but the droplets themselves
are never deleted or sanitized (Pillar 2). This is also a **care** stance:
difficult feeling is represented respectfully and stays under the user's control
(§9 boundaries), never gamified or auto-cheered-up.

**Heavy moments — honest, with a gentle nudge (decided).** When a strong storm
forms, the field renders it **truthfully** *and* quietly offers a single,
dismissible suggestion — *"keep this to yourself?"* — as a one-tap shortcut to
make that episode/facet private (§9.1). It is **only ever a suggestion**: never
automatic, never repeated naggingly, never a value judgment about the feeling.
The default visibility is unchanged unless the user taps it. The aim is to put a
boundary control *within reach exactly when it's wanted*, while leaving the
choice — and the honesty of the storm — entirely with the user.

---

## 3. Composition model: facets, not a timeline

This is the heart of the product and the hardest design problem: how do you take
**continuous, high-frequency posting (e.g. 20 fragments/minute)** and keep it
**coherent, simultaneous, and observable** instead of a discrete scroll?

### 3.1 Not a timeline, not a blank canvas

| Layout | Why it fails here |
|--------|-------------------|
| **Timeline** (Instagram, feeds) | Chronological → discrete → discontinuous. Punishes frequency, archives the past, can't show simultaneity. This is exactly what we're escaping. |
| **Blank freeform canvas** (you drag things) | At 20 posts/minute you can't place anything by hand. Becomes chaos; no coherence. |

The resolution: **demote time, promote facets of self.** The Field is organized
by **dimensions of your interiority** — taste, mood, music identity, places,
obsessions — **not** by when you posted. Time survives only as a *minor* signal
(freshness → how close to the surface a fragment sits). Everything you've ever
posted is present **simultaneously**, which is what "interiority" *is*: many
facets of you coexisting and blending into one readable whole.

### 3.2 Input: a chat panel of bubbles

The *input* UX is a **chat panel** — you type and send like you're texting a
friend. This is deliberate: **chat is the most accepted high-frequency
interface there is.** Firing off 20 messages a minute to a friend feels
completely normal; firing off 20 *posts* a minute to a feed feels like spam. We
borrow the comfortable interaction and change only where the messages *go*.

- You send **bubbles** in a familiar chat column. Zero ceremony, rapid-fire.
- Each sent bubble is a **droplet**. It doesn't sit in a growing chat log —
  after a beat it **animates out of the panel and drifts onto the Field**,
  flowing to the facet pool it belongs to.
- The chat is the *faucet*; the Field is the *painting*. The transcript is
  retained (you can re-open the raw chat), but the **primary representation is
  the field**, not the log.

So: **chat-familiar input → painting output.** The bridge between them is the
classification + merge algorithm (§8) — the genuinely hard part.

### 3.3 The droplet → pool model (how spam becomes coherent)

This is the mechanic that makes continuous posting *work*:

1. **Droplet.** Each sent bubble is a droplet — one fragment ("I love this
   macaron today", a color, a mood, a lyric). One tap, no friction. This is the
   unit of spam.
2. **Routing.** On send, a droplet is **classified and routed** to a facet by
   similarity (text features + color + theme, §8). If it matches an existing
   facet pool, it joins it; if it's genuinely new, it **seeds a new facet**.
3. **Coalescence.** Droplets in a facet **pool together**. Posting 20×/minute
   **raises the density/mass** of a pool — volume becomes *thickness and texture*,
   not a longer list.
4. **Surface vs. body.** The most **recent** droplets stay **discrete** near the
   pool's surface (individually readable). **Older** droplets **compost into the
   pool's body** — they lose individual borders and merge into the facet's
   color/mass. Nothing is deleted (Pillar 2); old droplets become *substance*.
5. **The whole field** = all pools, blended. Zoom out → one painting of you.
   Zoom into a pool → its recent droplets and composite posts separate out again.

> Spamming literally *paints*: each droplet adds a brushstroke to whichever facet
> of you it belongs to.

### 3.4 Two granularities of posting

Both flow into the same facet pools:

- **Droplet** — a single fragment, one-tap. Built for high-frequency spamming.
- **Composite** — a curated artifact (travel image + Spotify track + lyrics +
  several captions + a mood; §6). Built for "I feel this way today" set-pieces.

A composite is just a droplet with many layers; the system treats them uniformly
for routing and layout.

### 3.5 Surviving 20 messages/minute (scale + coherence)

20/min ≈ 1,200/hour ≈ ~28k/day. Three mechanisms keep this smooth and meaningful
rather than overwhelming:

- **Batched ingest.** Droplets are buffered and flushed to the layout engine at a
  fixed tick (~10 Hz), so bursts coalesce in batches instead of triggering a
  re-layout per droplet.
- **Aggregation (LOD).** Each facet keeps its most recent *N* droplets discrete;
  older ones fold into an **Aggregate** (the pool body) — mass increments, color
  averages, individual quads retire from rendering but the data is retained. This
  bounds the *renderable* set to hundreds of units while preserving density as a
  felt quality.
- **Stability bias.** New droplets ease into their pool; existing pools barely
  move. The field is a *place*, not a kaleidoscope that reshuffles on every post.

### 3.6 Episodes — a burst is a moment with an arc

Facets answer *"which part of me?"* but a rapid burst often also has a **shape in
time**: a single sitting that travels nervous → eager → delighted → wistful →
hurt → defiant. Routing each droplet to its facet would scatter that arc and lose
something true.

So, alongside facet routing, a burst (droplets within a short idle gap) is also
grouped into an **Episode** — a lightweight thread that records the **emotional
trajectory** of that moment. Episodes are a *secondary* lens:

- Droplets still live in their facets (the spatial portrait is unchanged).
- An episode adds a faint **current/eddy** through the field connecting that
  burst, and stores its affect arc — so a moment can be *replayed* as a small
  emotional journey, not just seen as scattered points.
- This is how the field honors that *"h-h-Hi … good好多朋友复活了 … 好痛 … get the
  fuck out"* was **one episode**, a real swing of feeling, without flattening it
  into either a timeline or a single mood.

### 3.7 Observable by others (the portrait)

Because the field is organized by facets rather than time, a visitor sees a
**coherent portrait** at a glance: the warm food-pool, the dense bold-music pool,
the small wistful-mood eddy, a stormy red corner. They can read *who you are right
now* without scrolling a history — and zoom into any facet (or replay an episode,
§3.6) for the individual droplets. This is what makes high-volume, simultaneous
expression **legible to others** — within the boundaries you set (§9).

---

## 4. Architecture overview

```
┌──────────────────────────────────────────────────────────────────┐
│                             Browser                                │
│                                                                    │
│  ┌────────────────┐      ┌────────────────────────────────────┐   │
│  │  UI Overlay     │      │        WebGPU Field Renderer        │   │
│  │  (HTML/CSS)     │      │  (canvas, full viewport)            │   │
│  │  - chat panel   │      │  - pool/metaball pass (facets)      │   │
│  │  - composer     │◄────►│  - instanced glass droplets         │   │
│  │  - zoom/search  │ msgs │  - liquid-blend + glass shaders     │   │
│  └────────────────┘      └──────────────┬─────────────────────┘   │
│           │                             │ pools + droplet buffer    │
│           ▼                             ▼                           │
│  ┌────────────────┐      ┌────────────────────────────────────┐   │
│  │  App State      │◄────►│   Composition Engine (Web Worker)   │   │
│  │  (store)        │      │  - facet router (route droplets)    │   │
│  └───────┬────────┘      │  - pool layout (fluid/force)        │   │
│          │               │  - aggregation / LOD / depth        │   │
│          ▼               └────────────────────────────────────┘   │
│  ┌────────────────┐                                                │
│  │  Persistence    │  IndexedDB (droplets, facets, blobs, cache)   │
│  │  (local-first)  │                                                │
│  └────────────────┘                                                │
└──────────────────────────────────────────────────────────────────┘
```

**Local-first:** the entire MVP runs with **no server**. All data lives in
IndexedDB. A future backend is additive (sync layer), not a rewrite — see §9.

---

## 5. Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Language | **TypeScript** | Type safety for shader/buffer plumbing. |
| Build | **Vite** | Fast dev server, easy WGSL imports, simple static build. |
| Render | **WebGPU** (WebGL2 fallback) | GPU instancing + metaballs for hundreds of liquid units at 60fps. |
| Shaders | **WGSL** | Native WebGPU shading language. |
| Composition | **Web Worker** | Facet routing + fluid layout off the main thread. |
| Routing | Lightweight on-device features (MVP) | Hue + tags + keyword/sentiment vector; tiny embedding model later. |
| State | Tiny custom store / **Zustand** | No framework lock-in; UI is thin. |
| UI overlay | Plain DOM (or Lit) | The "app" is the canvas; HTML is just chrome. |
| Storage | **IndexedDB** via `idb` | Droplets, facets, image/artwork blobs; offline-capable. |
| Music | **Spotify oEmbed / IFrame** (no auth) | Drop a track link → embedded player + artwork, zero backend. Web API later. |
| Lyrics | Paste / `.lrc` import (MVP) | User-supplied synced lyrics now; licensed provider later. |
| Tests | **Vitest** + Playwright | Unit (routing/layout/store) + smoke (canvas renders). |

> WebGPU has no universal support guarantee. We **feature-detect** and degrade:
> WebGPU → WebGL2 (simpler blend, fewer units) → static DOM clusters (no shaders).

---

## 6. Data model

All persisted locally. IDs are ULIDs (sortable by time).

The atom is a **Droplet** (a fragment). A **composite** is a droplet with many
`layers`. Droplets are **routed into Facets** (pools). Old droplets **compost
into an Aggregate** (the pool body). Everything is **mutable** and nothing is
deleted (Pillar 2).

```ts
type Field = {
  id: string;
  ownerHandle: string;        // local-only for now, e.g. "@me"
  title: string;
  createdAt: number;
  theme: FieldTheme;          // palette + motion config
  lexicon: LexiconEntry[];    // user-taught meanings (§8.2): "meow" -> identity
};

// User-taught routing hints — meaning is personal. Never auto-applied to text;
// only influences which facet a matching bubble routes to.
type LexiconEntry = {
  token: string;              // e.g. "meow", "Belle", an inside joke
  facetHint?: string;         // facet id/label to bias toward
  role?: "identity" | "person" | "place" | "topic";
};

// A single layer of a droplet (a droplet may have just one).
// NOTE: all human text (`body`, captions) is stored VERBATIM — never normalized.
type Layer =
  | { kind: "image"; blobKey: string; alt?: string }
  | { kind: "text";  body: string }                       // a caption / thought
  | { kind: "emote"; body: string }                       // *震惊/诧异* — self-narrated affect
  | { kind: "link";  url: string; title?: string }
  | { kind: "color"; hex: string }
  | { kind: "mood";  label: string }                      // e.g. "wistful"
  | { kind: "media";                                      // music/video share, any provider
      provider: "spotify" | "qqmusic" | "youtube" | "applemusic" | "other";
      uri: string; title: string; artist?: string;
      artworkBlobKey?: string;
      place?: GeoTag;                                      // e.g. Belgium · Brugge
      sourceTime?: number;                                // original share time
      lyrics?: { line: string; tMs?: number }[] };        // optional synced lyrics

type GeoTag = { label: string; lat?: number; lon?: number };

// The atom: a droplet (single fragment) OR a composite (many layers).
type Droplet = {
  id: string;                 // ULID — encodes creation time
  fieldId: string;
  granularity: "droplet" | "composite";
  layers: Layer[];            // 1 for a droplet; many for a composite
  caption?: string;
  episodeId?: string;         // burst this droplet belongs to (§3.6)
  // --- routing / blend signals ---
  hue: number;                // 0..360, dominant color
  saturation: number;         // 0..1
  affect: Affect;             // valence/arousal/vulnerability → routing + weather
  tags: string[];             // user or auto ("calm", "rant", "food"…)
  vector?: number[];          // lightweight semantic vector for facet routing
  facetId?: string;           // pool it coalesced into (assigned by router)
  // --- lifecycle (drives surface vs. composted body) ---
  state: "fresh" | "settling" | "aggregated";
  weight: number;             // visual size; from intensity + age decay
  // --- living/eternal-present signals (Pillar 2) ---
  createdAt: number;
  updatedAt: number;          // bumps on any edit; resurfaces the droplet
  revivedAt?: number;         // last time the user re-surfaced it
  history?: Revision[];       // append-only edits — nothing is destroyed
  pinnedPresent?: boolean;    // "this is me right now" — resists sinking
};

type Affect = { valence: number; arousal: number; vulnerability: number }; // each -1..1 / 0..1

type Revision = { at: number; layers: Layer[]; caption?: string };

// A burst grouped as one moment with an emotional arc (§3.6).
type Episode = {
  id: string; fieldId: string;
  startedAt: number; endedAt: number;
  dropletIds: string[];       // in order
  arc: Affect[];              // affect trajectory across the burst
};

// A facet of self: a pool that droplets coalesce into.
type Facet = {
  id: string;
  label?: string;             // emergent or user-named ("food", "bold music")
  centroid: number[];         // routing centroid (hue + tags + vector)
  hue: number;                // dominant pool color
  mass: number;               // accumulated density (fresh + aggregated)
  x: number; y: number;       // pool center in field space
  radius: number;             // grows with mass
};

// Composted body of many old droplets in a facet (LOD; §3.5).
type Aggregate = {
  id: string; facetId: string;
  count: number;              // how many droplets folded in
  hue: number; saturation: number;
  dropletIds: string[];       // retained data; not individually rendered
};

type LayoutNode = {           // computed, cached, not authored
  refId: string;              // droplet or facet/aggregate id
  kind: "droplet" | "pool";
  x: number; y: number;
  scale: number;              // age + weight (droplet) / mass (pool)
  depth: number;              // 0 = surface (fresh), 1 = sunk (old)
  facetId: string;            // for color bleed within a pool
};
```

**Facet routing (§3.2):** on create/edit, compute `hue`, `tags`, and a
lightweight `vector` (MVP: hashed keyword + sentiment + hue features; a tiny
on-device embedding model later). Route to the nearest facet by combined
similarity; if no facet is close enough, **seed a new facet**. Facets can be
auto-labeled and renamed by the user.

**Aggregation (§3.5):** a facet keeps its most recent *N* droplets `fresh`/
`settling`; older ones flip to `aggregated` and fold into the facet's `Aggregate`
(`mass`/`hue` updated, quad retired). Data is retained, density is preserved,
render cost stays bounded.

**Mutability without loss (Pillar 2):** edits bump `updatedAt` and push prior
state into `history` (append-only). `revivedAt`/`pinnedPresent` let an old
droplet float back to the surface, keeping the field in the eternal present.

**Verbatim text (Pillar 2, character level):** a `text` layer's `body` and any
`caption` are stored **exactly as typed** and rendered exactly as stored. The
pipeline never normalizes, trims, autocorrects, or canonicalizes a user's
words — `itttt` is `itttt`. The routing `vector` is derived *from* the text but
is a separate field; it never feeds back into what's shown.

**Color extraction:** dominant `hue`/`saturation` from the strongest visual
layer (image pixels / track artwork), falling back to text-sentiment → palette.

**Spotify / music layers:** the `track` layer stores a Spotify URI + metadata
(and optional time-synced `lyrics`). The MVP embeds the Spotify **oEmbed/IFrame**
player (no auth) and lets users paste lyrics or import an `.lrc` file; a later
phase uses the Spotify Web API + a licensed lyrics provider for true synced
playback. Lyrics render *as glass text* and can drive the liquid motion.

---

## 7. The liquid-blend renderer

The challenge: render facet **pools** as one continuous liquid surface while
keeping recent droplets and composites legible up close.

### Pipeline (per frame)
1. **Camera** — pan/zoom → view-projection matrix (2.5D orthographic with a
   slight perspective tilt for parallax).
2. **Pool / metaball pass** — facets render as **metaball/SDF fields**: each
   pool is a smooth blob whose size = `mass` and color = pool `hue`. Overlapping
   pools merge organically (this is the "liquid" base of the painting and how
   thousands of composted droplets show up as *density*, not quads).
3. **Instanced glass droplets** — one instanced draw for the *discrete* (fresh)
   droplets floating on their pools. Per-instance: position, scale, hue, depth,
   facetId, texture index.
4. **Field-blur pass** — depth-scaled Kawase blur (older/deeper = blurrier →
   frosted fog).
5. **Liquid-blend pass** — full-screen shader bleeds droplets toward their pool
   and toward same-facet neighbors, dissolving hard edges; a flow-noise
   domain-warp makes edges feel fluid.
6. **Refraction / glass** — refraction through an edge-derived normal map +
   fresnel rim + specular for the glass read.
7. **Composite** — tone-map, vignette, grain → canvas.

### Key shaders (WGSL modules)
- `pool.metaball.wgsl` — SDF metaball field for facet pools.
- `droplet.instanced.wgsl` — place/scale droplet quads; hue shift + depth
  desaturation.
- `blend.fullscreen.wgsl` — liquid bleed (neighbor/pool lerp + flow-noise warp).
- `glass.refract.wgsl` — refraction, fresnel, specular.
- `blur.kawase.wgsl` — depth-scaled fog blur.

### Composite & droplet tiles (Pillar 3)
- A droplet's strongest visual layer is its base texture; a **color/mood** droplet
  is just a tinted glass lozenge.
- **Captions and lyrics** render as **glass text** (SDF text in WebGPU, or a DOM
  overlay anchored to screen position for the MVP). A composite's multiple
  captions fan out when focused.
- A **music layer** shows a play glyph; selecting it opens the embedded Spotify
  player, and lyrics can **drift on the beat** to drive local liquid motion.
- Zoomed out → everything collapses into pool color; zoomed in → layers separate
  and become readable/playable.

### Legibility safeguard
Liquid blending is **zoom-dependent**: blend strength → 0 when zoomed in on a
droplet (text/lyrics stay crisp), → max when zoomed out (the field reads as one
painting). One uniform (`blendStrength = f(zoom)`) drives this.

### Performance budget
- Target **60fps** with **≤ ~600** discrete droplets + **≤ ~64** pools on
  mid-range hardware; older droplets are aggregated into pools (§3.5) so the
  discrete count stays bounded under 20/min spam.
- Pools = cheap SDF passes; droplets = a single instanced draw; blend/blur are
  fixed full-screen passes.
- Off-screen / far-zoom droplets cull or drop to a lower mip.
- Composition runs in a worker; the renderer consumes flat pool + droplet buffers.

---

## 8. Classifying & merging the chat stream (the core algorithm)

This is the part that actually makes or breaks the product (and the part you
flagged as the real question). The job: take a fast stream of chat bubbles and
**(a) classify each into a facet, (b) merge them continuously so the field stays
coherent and doesn't read as spam, and (c) never suppress or destroy the
original messages.** It all runs in the composition Web Worker, off the main
thread, driven by the ~10 Hz ingest tick (§3.5).

### 8.1 Why this is hard
- We **don't know the facets in advance** — they must *emerge* from what the user
  actually says, and there's no fixed number of them.
- It's a **stream**, not a batch — we can't re-cluster everything on every
  message at 20/min.
- Output must be **stable** — the field is a place; a new bubble must not
  reshuffle everything.
- We must **classify text cheaply and locally** (no server in the MVP).

This is a **streaming / online clustering** problem. We use a **DP-means /
leader-follower** approach (k-means-like, but the number of clusters grows on
demand), which fits all four constraints.

### 8.2 Step 1 — Featurize each message

> **Verbatim is law — the bubble is never modified.** `itttt` stays `itttt`,
> everywhere: in storage *and* on screen. The elongation **is the meaning** —
> the emphasis, the affect, the *you* of it — and rewriting it to `it` destroys
> exactly that. Featurizing only *reads* the text to derive a separate routing
> vector; it **never** edits, canonicalizes, or replaces the original. This is
> Pillar 2 taken to the character level. (See §8.5 for the hard guarantee.)

With that rule fixed, compute a read-only feature vector `v` from the raw text
(cheap, on-device, per message):

- **Text features:** hashed **character n-grams** over the *raw* bubble (no
  rewriting), weighted by the user's *own* TF-IDF so words distinctive to *you*
  matter more. Cheap, model-free, and naturally elongation- and script-tolerant
  for *matching* — without ever altering what's stored.
- **Affect (valence + arousal + vulnerability):** a small multi-axis score that
  feeds both routing *and* the field's emotional weather (§2). It reads a wide
  affect vocabulary, all kept verbatim and only *measured*:
  - **Emoji & kaomoji:** `😳`, and ASCII/CJK emoticons like `TwT` (crying), `:)`,
    `T_T`, `>_<` — a cross-cultural affect lexicon, not just Unicode emoji.
  - **Roleplay / emote markers:** asterisk-wrapped stage directions like
    `*震惊/诧异*` (*shocked/baffled*) are recognized as **self-narrated affect**
    (an emote), tagged and rendered as a gesture, not as a literal topic.
  - **Disfluency / stutter:** `h-h-Hi` reads as **nervousness/vulnerability** (low
    arousal, tender), distinct from loud emphasis — never "corrected" to `Hi`.
  - **Onomatopoeia:** `Tiktoktiktoktiktoktiktik` is treated as rhythmic/affective
    sound, not a topic word.
- **Multilingual & code-switching:** char n-grams are script-agnostic, so a bubble
  like `Belle好好看` (Latin + Chinese together) still produces a usable vector,
  and emoji carry meaning across languages. **Which** language/script you choose
  (English vs. 简体 vs. 繁體 `謝謝妳們` vs. Korean) is itself an identity/register
  signal — preserved, never auto-translated. A multilingual embedding model later
  improves cross-language grouping; n-grams are the zero-dependency floor.
- **Intensity from elongation/repetition (read, don't rewrite):** the *length* of
  an elongation (`itttt`), repeated emoji (`😚😚😚`), and ALL-CAPS are read as an
  **arousal** signal that raises the droplet's `weight` — louder, more emphatic,
  bigger on the field. The characters themselves are kept exactly as typed; we
  only *measure* the emphasis, never strip it.
- **Entities (anchor-aware):** known names resolve against the active context —
  e.g. while sharing KISS OF LIFE, **"Belle" resolves to the group's member**,
  so `Belle好好看` reads as idol appreciation tied to *that* musical moment, not a
  stray word. Entities come from shared-track metadata + a **personal lexicon**
  the user can teach (see below).
- **Personal lexicon (meaning is personal):** idiosyncratic tokens carry identity
  the model can't guess — e.g. **"Meow" may be self-identity**, not noise. Users
  can pin a token/phrase to a facet ("meow → *me / my persona*") and the router
  respects it. The system never *flattens* a short or playful bubble into
  "whimsy" by default.
- **Color/hue:** from any image/artwork, or a word→palette mapping for text.
- Concatenate + L2-normalize the *vector* (not the text) → `v` (stored alongside
  the verbatim bubble as `Droplet.vector`).

> Upgrade path: swap the bag-of-words for a **tiny quantized sentence-embedding
> model** (e.g. transformers.js, optionally WebGPU-accelerated). The rest of the
> algorithm is unchanged — only `v` gets smarter. (§11 Q1)

### 8.3 Step 2 — Online classify (DP-means / leader-follower)
Maintain a small set of facet **centroids** `c_f`. For each new `v`:

```
sim*  = max over facets f of  cosine(v, c_f)     // best-matching facet
if sim* >= τ_join:           assign to that facet f*        // joins existing pool
else if sim* <  τ_new:       create a new facet seeded by v // genuinely new
else (τ_new <= sim* < τ_join): assign to f* but mark "weak" // borderline; may split later
```

- `τ_join` / `τ_new` are similarity thresholds (the **DP-means λ** in disguise):
  they control how readily the system spawns a *new* facet vs. folding into an
  existing one — i.e. the **resolution of the portrait**. Exposed to the user as
  a single "**field resolution**" slider (fewer big pools ↔ many fine pools).
- Cost is **O(#facets)** cosine per message — trivial (#facets is bounded to a
  few dozen by maintenance, §8.6). Easily keeps up with 20/min, or far more.

**Context anchor (now-playing / session).** A recent **share** or the actively
playing track creates a short-lived **prior** that biases routing: fragments
fired in the seconds after a song share lean toward that track's facet (bursts
are usually *about* the thing you just shared). Two special cases:

- **Lyric binding.** If a message matches the shared/playing track's lyrics
  (e.g. *"it's not worth ittt"* while sharing that song), **bind it to the track
  post** as a lyric layer instead of floating it off as a lone droplet.
- **Affect-only bubbles.** A pure-emoji bubble (`😚😚😚`) with no text content
  doesn't seed its own facet; it **tints the current context** — warming the
  hue/saturation of whatever was just posted — so reactions decorate the moment
  rather than littering the field.

### 8.4 Step 3 — Centroid drift = the eternal present
When a droplet joins facet `f`, update the centroid with an **exponential moving
average**, not a plain mean:

```
c_f ← normalize( (1 - α)·c_f + α·v )      // α ≈ 0.05–0.2; recent says more
mass_f ← mass_f + 1 ;  hue_f ← ema(hue_f, hue_v)
```

EMA (rather than a full average) means a facet's *meaning* gently **tracks who
you are now** — if your "music" taste shifts from soft to bold, the pool drifts
with you. That's Pillar 2 (the eternal present) falling out of the math for free,
**without deleting** any past droplet — the old ones still live in the pool body.

### 8.5 Step 4 — Continuous merge without looking like spam
This is the "merged continuous, not spammy, originals preserved" requirement,
and it's a **rendering/aggregation** concern, *never* a deletion:

- **Near-duplicate coalescence.** If `v` is *very* close (`cosine ≥ τ_dup`) to a
  recent droplet in the same facet — e.g. "I love macarons" sent five times — we
  **don't draw five identical bubbles**. We **thicken** the existing spot:
  bump its `weight`/density (and optionally a soft "×5"), so repetition reads as
  *emphasis/intensity*, not clutter. **All five originals are stored** as
  droplets with full text + `history`; you can zoom in and read every one.
- **Density over count.** Within a facet, raising mass grows the pool's
  metaball radius and saturates its color (§7) — 20 fast messages make the pool
  *richer and bolder*, which looks intentional, not spammy.
- **Temporal smoothing.** Mass/hue/radius update through EMA, so a burst eases
  the pool up smoothly instead of popping new cards onto the screen.
- **Aggregation (LOD, §3.5).** Older droplets flip `fresh → settling →
  aggregated` and fold into the facet `Aggregate` — they stop being individual
  quads and become pool *substance*. Bounded render cost; nothing lost.

> The guarantee: **classification and merging only ever change how things are
> *drawn and grouped* — never the text itself.** The source bubble is retained
> **verbatim, to the character** (`itttt` stays `itttt`); routing/merging touch
> only position, grouping, and visual weight, never the words (Pillar 2). "Merge"
> means *visually composite*, never *rewrite* or *overwrite*.

### 8.6 Step 5 — Periodic facet maintenance
On a slower cadence (e.g. every few seconds / N droplets), tidy the facet set so
it stays meaningful:

- **Merge** two facets whose centroids have drifted within `τ_merge` (your "soft
  music" and "bold music" converged → one "music" pool).
- **Split** a facet with high internal variance / a dense cluster of "weak"
  members into two.
- **Relabel** facets from their top TF-IDF terms (auto names like "food",
  "late-night", "bold music"); the user can rename or lock a label.
- **Cap** the number of facets; the weakest/least-massive merge into neighbors.

### 8.7 Then: layout (positions for the renderer)
After routing/aggregation, the engine produces positions and emits flat
`Float32Array` buffers (pools + droplet `LayoutNode`s) the renderer uploads:

1. **Lay out pools** — force-directed/fluid relaxation: similar facets attract,
   dissimilar repel, mild centering. `radius ∝ √mass`.
2. **Lay out fresh droplets** — pack discrete droplets within their pool; set
   `depth`/`scale` from age + `weight` (fresh/heavy float forward and larger).
3. **Stabilize** — ease new items in; keep existing pools near-still; persist the
   layout cache so reopening the Field is instant.

> Design tension: **stability vs. responsiveness.** Pools are *places*. Only
> re-flow facets whose mass actually changed; never reshuffle the whole field
> because one bubble landed.

### 8.8 Parameters (all tunable, sane defaults)
| Param | Meaning | Default |
|-------|---------|---------|
| `τ_join` | min similarity to join a facet | ~0.55 |
| `τ_new` | below this → spawn a new facet | ~0.35 |
| `τ_dup` | near-duplicate → thicken, don't add | ~0.92 |
| `τ_merge` | centroids closer than this → merge facets | ~0.85 |
| `α` | centroid EMA rate (recency vs. stability) | ~0.1 |
| keep-window `N` | fresh droplets kept discrete per facet | ~40 |
| ingest tick | batch flush rate | ~10 Hz |
| max facets | cap before forced merges | ~48 |

These are the knobs that decide whether the field feels like a *coherent
painting* or a *noisy mess*; they're worth tuning against real spam sessions.

### 8.9 Worked example — a real burst
A typical rapid-fire session, just after sharing **"Nothing" — KISS OF LIFE**:

| Bubble sent | Featurize / route | Result on the Field |
|-------------|-------------------|---------------------|
| 🎵 *share "Nothing"* | `track` layer (Spotify); opens a **now-playing context anchor** | seeds / feeds the **music pool** |
| *"it's not worth ittt it's not worth ittt"* | kept **verbatim** (`ittt` stays `ittt`); the elongation + in-message repeat *read* as high arousal → bigger `weight`; **matches the track's lyrics** → **lyric-binds to the song** | a lyric layer on the music post, sung loud — not a stray droplet |
| *"Meow"* | **not** dismissed as filler — can be **self-identity**; if pinned in the personal lexicon, routes to an **identity facet** ("me / my persona") | feeds your **identity** pool (or seeds one) |
| *"Belle好好看"* | mixed Latin+Chinese via char n-grams; **"Belle" resolves to the KISS OF LIFE member** via the now-playing anchor → idol appreciation | **binds to the same musical moment** (KOF), strengthening that pool |
| *😚😚😚* | affect-only, no text; kept verbatim, the **count** *reads* as intensity (we measure, never trim) | **warms the context** — tints the musical moment, seeds nothing |

**On Twitter:** five separate posts shoved into followers' feeds — textbook spam.
**On AnyField:** **one warm musical moment, plus a touch of you.** The KOF music
pool brightens and grows (share + the verbatim *"it's not worth ittt"* lyric +
Belle's idol-appreciation + the 😚 affection tint), while *"Meow"* drifts to your
**identity** pool — a little flicker of self alongside the music. Pulled, not
pushed; nothing rewritten; every original bubble still readable verbatim when you
zoom in (Pillar 2). The exact behavior the product exists to create.

### 8.10 Worked example — a real emotional burst (Tess)

A longer, harder burst — nervous arrival, a geo-tagged share, joy, grief, pain,
and a hard boundary, across English + 简体 + 繁體 + Korean. **All one Episode**
(§3.6); each line kept **verbatim**:

| Bubbles (verbatim) | Read as | Lands |
|--------------------|---------|-------|
| `h-h-Hi it's me again` / `I'm back` / `Let's talk ASAP` / `Do you have the time?` | disfluency → nervous/tender; self-reference "again/back" → **identity**; eager | identity pool, low-arousal; opens the episode |
| 🎵 *share* `ASAP – NewJeans` · Belgium·Brugge · QQMusic · 1h ago | `media` layer (provider **qqmusic**, `place`, `sourceTime`); anchor | **music pool** + a small **places** eddy (Brugge) |
| `Tiktoktiktoktiktoktiktik` ×2 | onomatopoeia (echoes "the time?"); near-dup → **thicken, not stack** | one ticking accent on the music moment |
| `哦 我似乎` / `突然好多朋友复活了` / 😳 | delight + surprise; high valence | warms the episode; a bright ripple |
| `所以我说Asdan是极好的` | positive appraisal; entity `Asdan` (lexicon-teachable) | a topic/identity droplet |
| `哦 好吧*震惊/诧异*` | `*震惊/诧异*` → **emote layer** (self-narrated affect), rendered as a gesture | emote on that droplet, not a topic |
| `謝謝妳們!` (繁體, gendered 妳) | gratitude; **script choice = register/identity**, preserved | gratitude/identity, tender-bright |
| `全部都是 2023 2024 2025 的朋友们…新人们爱的那个镜子已经不在了。` | wistful/grief; community reflection | a **wistful** facet; weather cools to foggy blue |
| `好痛..感觉我连同我的边界被轰炸了一遍` / `我拒绝再次妥协我的边界。` | **pain + boundary**; high vulnerability, then resolve | a **storm** corner: deep reds, turbulent churn (§2) |
| `要是你看我不爽，get the fuck out` | defiance; boundary aimed at viewers | storm peak — *and* a cue toward visibility controls (§9.1) |

**On Twitter/QQ:** ~15 rapid messages — a wall of spam someone scrolls past, and
the pain gets the same flat treatment as the K-pop share.
**On AnyField:** **one honest episode.** A nervous arrival brightens into joy
around the music+Brugge moment, cools into a wistful blue as the reflection lands,
then darkens into a real storm at the boundary — a current you can *replay* as the
emotional journey it actually was. Nothing prettified, nothing deleted, every word
verbatim, and the storm stays **private unless Tess chooses to share it** (§9.1).
This is the case that proves the field has to hold the whole person, not just the
highlights.

---

## 9. Local-first now, sync later

**Phase A (MVP, this plan): no server.**
- Droplets, facets, aggregates, blobs, and layout cache in IndexedDB.
- Everything works offline. Instant. Private by default.

**Phase B (additive): sync + visiting.**
- A thin posts API + object storage; IndexedDB becomes the local cache/offline
  buffer (last-write-wins or CRDT for multi-device).
- A **share link** renders a read-only Field for visitors (the "pull" model).
- Accounts/handles become real; until then `@me` is local.

Because the renderer and composition engine only consume the local store, adding
sync does **not** touch them — it's a new data source behind the same store API.

### 9.1 Boundaries & control (the field is yours)

*"我拒绝再次妥协我的边界 … get the fuck out."* Boundaries aren't an afterthought
here — they're structural. Because AnyField is **pull, not push** (Pillar 1), the
default posture already protects the user, and we make control explicit:

- **Private by default.** A Field is yours and unshared until *you* publish a
  view. Spamming freely is safe because no one is watching unless invited.
- **Per-facet / per-episode visibility.** Share your music and food pools but keep
  the stormy red corner private. Visibility is granular, not all-or-nothing — you
  can vent on the same surface you show off, without exposing the venting.
- **Tiered share links.** Public, unlisted, or per-person; revocable any time.
  Visiting is always read-only and opt-in — no one can post *into* your field.
- **"Get the fuck out" as a real control.** Block/remove a visitor instantly;
  a removed viewer loses access immediately. Boundary-setting is a button, not a
  plea.
- **Care, not surveillance.** No engagement metrics shown to others, no “seen by”
  pressure, no algorithmic redistribution of your hard moments. Difficult feeling
  stays represented with dignity (§2) and under your control.
- **Gentle nudge on storms (decided).** When a strong storm forms, surface a
  single dismissible *"keep this to yourself?"* — a one-tap shortcut to privatize
  that episode/facet. A suggestion only: never automatic, never nagging, never a
  judgment; default visibility is unchanged unless the user taps it.

> The product's job is to let someone express *everything* — delight and pain and
> defiance — while never taking the boundary decision away from them.

---

## 10. Roadmap

| Phase | Deliverable | Proves |
|-------|-------------|--------|
| **0** | Scaffold (Vite + TS), WebGPU init + capability detection, blank canvas with pan/zoom. | Pipeline + fallbacks work. |
| **1** | Pool metaball pass + instanced glass droplets (static fake data), depth-blur fog. | The "glass + liquid" read at scale. |
| **2** | Liquid-blend pass + zoom-dependent blend strength. | The signature aesthetic; legibility holds. |
| **3** | Featurizer + online facet router (DP-means) + pool layout in a worker. | Chat bubbles → coherent facets (§8.2–8.4). |
| **4** | Chat panel: text bubbles, rapid-fire send → animate into the field; batched ingest + IndexedDB; live re-layout under load. | Chat-familiar input; 20/min stays smooth (§3.2, §3.5). |
| **5** | Continuous merge: near-duplicate coalescence + aggregation/LOD; old droplets compost into pool bodies. | "Merged, not spammy, originals kept" (§8.5–8.6). |
| **6** | Affect + emotional weather: multi-axis affect (valence/arousal/vulnerability incl. kaomoji, emotes, disfluency) drives palette/motion calm↔storm. | The field is *honest* (§2, §8.2). |
| **7** | Composite composer + media shares (Spotify/QQMusic/…): embedded player, artwork, place/time; paste/import lyrics as glass text. | "I feel this way today" + the share loop (Pillar 3). |
| **8** | Episodes: group bursts, store the affect arc, replay a moment as a current through the field. | A burst is a moment, not scatter (§3.6). |
| **9** | Eternal-present mechanics: edit (append-only `history`), re-surface/pin "now," age→fog without archiving. | Pillar 2 — the living portrait. |
| **10** | Identity & boundaries: facet labels/themes, search/zoom-to-facet, per-facet visibility, tiered/revocable read-only share-views, block. | Observable *within your boundaries* (§3.7, §9.1). |
| **11** | *(future)* Backend sync, accounts, Web APIs + licensed synced lyrics, visiting others' Fields. | Multi-user pull network. |

MVP = Phases 0–10, all local.

---

## 11. Open questions for later

1. **Facet routing quality** — start with char n-grams + sentiment + hue
   (cheap, on-device). When is a real embedding model worth the weight? How do we
   let users **merge/split/rename** facets when the router gets it wrong?
2. **Entity & identity resolution** — the now-playing anchor resolves names like
   *Belle* against a shared track's members, and the **personal lexicon** lets a
   user teach idiosyncratic meaning (*"meow" = my identity*). How much should the
   system *infer* vs. *ask*? How do we surface "I think this means X — right?"
   without nagging? How does the lexicon bootstrap from almost nothing?
3. **Composting depth** — should fully-composted droplets eventually dissolve
   into pure pool color (true "season" compost), or always stay zoomable-to?
   (Lean: dissolve *visually*, retain data.)
4. **One field with facets vs. multiple fields** (e.g. a "private" field vs. a
   shared one). Facets may make multiple fields unnecessary.
5. **Spam guardrails for *self*** — at 20/min, do we want gentle de-duplication
   (near-identical droplets thicken one spot instead of multiplying)? Probably
   yes, as a routing nicety, not a limit. (Visual only — originals kept verbatim.)
6. **Emotional weather & care** — *Decided:* honest rendering + a gentle,
   dismissible "keep this to yourself?" nudge on strong storms (§2, §9.1) — a
   suggestion, never automatic. Still open: how strongly should affect drive
   palette/motion before it feels performative, and what exactly counts as a
   "strong storm" trigger (intensity threshold, sustained vs. spike)? Tune
   against real sessions; never gamify, never decide for the user.
7. **Moderation/safety** once sharing exists (Phase 11): visiting is opt-in, no
   push, report/block on share links; per-facet visibility is the primary control.

---

## Appendix: directory layout (proposed)

```
src/
  main.ts                 # bootstrap, capability detection
  gpu/
    device.ts             # WebGPU init + WebGL2 fallback
    renderer.ts           # frame loop, passes
    pipelines/            # pool, droplet, blend, glass, blur pipelines
    shaders/*.wgsl
  compose/                # composition engine (worker)
    worker.ts             # entry; ingest tick
    featurize.ts          # message → feature vector (§8.2)
    router.ts             # online DP-means facet routing (§8.3–8.4)
    merge.ts              # near-dup coalescence + facet maintenance (§8.5–8.6)
    pools.ts  aggregate.ts  layout.ts
  store/
    state.ts              # app store
    db.ts                 # IndexedDB (idb)
    color.ts              # dominant-hue extraction
  ui/
    chat-panel.ts  composer.ts  controls.ts  overlay.css
docs/
  DESIGN.md               # this file
```
