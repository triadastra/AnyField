# CLAUDE.md

Guidance for AI assistants working in this repository.

## What this repo is (read this first)

**AnyField is still mostly in the _design phase_.** The canonical artifact is
the design doc; there is an early **visual prototype** of the field, but the
full system (composition engine, persistence, episodes, weather) is **not built
yet**.

```
README.md          # the pitch — concept, three pillars, what it is/isn't
docs/DESIGN.md     # the full design document (the source of truth)
prototype/         # index.html — a single-file WebGPU sketch of the UI/UX
app/               # Vite + React + TS + WebGPU app (Dockerized) of the field
```

Most of `docs/DESIGN.md` describes a system that is **planned, not built** —
IndexedDB persistence (§9) and episodes (§3.6) are **not implemented**, and the
composition engine runs on the **main thread**, not yet in a Web Worker (§4).
`app/` renders the Liquid-Glass field and now includes an early **composition
engine** (`src/compose/`): online facet routing (§8), pools that grow/compost,
near-duplicate thickening, emergent labels, and a light emotional-weather tint
(§2). Do not assume a module, dependency, or tool exists — verify with the
filesystem first.

Treat `docs/DESIGN.md` as the **canonical spec**. The README is a summary of
it. When the two ever disagree, the design doc wins, and you should flag the
drift.

## The product, in one paragraph

AnyField is a personal **WebGPU glass-space** where posting *a lot* is the
point. Instead of pushing posts into followers' feeds, each user has a
**Field** — an infinite, zoomable frosted-glass surface. You post via a
familiar **chat panel** (fire off many short "bubbles"); each bubble becomes a
**droplet** that is **classified and routed** to a **facet of self** (a pool)
rather than appended to a chat log. Zoomed out, the Field reads as one
continuous **liquid painting** of your interiority; zoomed in, individual
droplets stay legible. Visitors *pull* (visit) a Field; nothing is pushed.

## The three pillars (every decision serves these)

1. **Pull, not push.** A canvas you *visit*, never a feed. No notifications at
   others, no mass-messaging, no engagement dark patterns.
2. **The eternal present.** Posts are **mutable** and **never deleted**. Old
   droplets recede into fog / compost into pool bodies but stay alive and
   editable. The field always reads as "this is me, now." Edits append to
   `history` (never destroy).
3. **Many-into-one-frame (interiority).** Aggregation *is* the feature. Many
   fragments coexist and blend into one coherent frame organized by **facets**,
   not chronology.

## Non-negotiable conventions (these are baked into the design — honor them)

- **Verbatim text is law.** A user's text is stored and rendered **exactly as
  typed**, to the character. `itttt` stays `itttt`; `h-h-Hi` stays `h-h-Hi`.
  **Never** normalize, trim, autocorrect, canonicalize, translate, or
  "fix" user text anywhere in the pipeline. The routing `vector` is derived
  *from* the text but is a **separate field** and must never feed back into what
  is displayed. (DESIGN §8.2, §8.5, §6.) The elongation/stutter/script-choice
  *is* the meaning — destroying it destroys the product.
- **Nothing is deleted.** Routing, merging, and aggregation only change how
  droplets are **drawn and grouped** — never the underlying data. "Merge" means
  *visually composite*, never *overwrite*. (DESIGN §8.5.)
- **The field must be honest.** It represents the whole person — delight *and*
  grief, pain, defiance — via **emotional weather** (calm drift ↔ turbulent
  storm). Do not prettify difficult affect away. (DESIGN §2.)
- **Boundaries are structural, not an afterthought.** Private by default;
  per-facet/per-episode visibility; revocable, tiered share links; block. On a
  strong storm, offer a single **dismissible** "keep this to yourself?" nudge —
  a *suggestion only*, never automatic, never nagging, never a value judgment.
  (DESIGN §9.1, §2.)
- **Local-first.** The MVP runs with **no server**; all data lives in
  IndexedDB. A sync/multi-user backend is an *additive* later phase that sits
  behind the same store API and does not touch the renderer or composition
  engine. (DESIGN §9.)

## Core concepts / vocabulary

- **Droplet** — the atom; one fragment (text, image, color, mood, link, media).
  One-tap, built for high-frequency posting.
- **Composite** — a droplet with many `layers` (e.g. travel image + track +
  lyrics + captions + mood). Routed/laid out uniformly with droplets.
- **Facet** — a "facet of self"; a **pool** droplets coalesce into by
  similarity. Facets *emerge* (number not fixed in advance); they can be
  auto-labeled, renamed, merged, and split.
- **Aggregate** — the composted body of older droplets in a facet (LOD). Data
  retained; individual quads retired from rendering.
- **Episode** — a burst (droplets within a short idle gap) grouped as one
  *moment with an emotional arc*; a secondary lens, replayable as a current
  through the field. Droplets still live in their facets.
- **Field** — a user's whole surface = all pools, blended.
- **Weather** — local, temporary palette/motion driven by recent droplets'
  affect (valence + arousal + vulnerability).

The full data model (`Field`, `Droplet`, `Layer`, `Affect`, `Episode`,
`Facet`, `Aggregate`, `LayoutNode`, `LexiconEntry`) is in **DESIGN §6** — use
it verbatim when scaffolding TypeScript types.

## Planned architecture (not yet built — DESIGN §4, §5)

Three cooperating parts in the browser:

1. **UI overlay** (plain DOM / Lit) — chat panel, composer, zoom/search. The
   "app" is the canvas; HTML is just chrome.
2. **WebGPU Field renderer** — pool/metaball pass, instanced glass droplets,
   liquid-blend + glass + blur shaders (WGSL). WebGL2 → static-DOM fallbacks
   via **feature detection** (WebGPU has no universal support).
3. **Composition engine (Web Worker)** — facet router, pool layout,
   aggregation/LOD, driven by a ~10 Hz ingest tick. Runs off the main thread.

Persistence is **IndexedDB** (via `idb`). The renderer and worker only consume
the local store, so adding sync later is a new data source, not a rewrite.

**Planned tech stack (DESIGN §5):** TypeScript · Vite · WebGPU (WGSL) with
WebGL2 fallback · Web Worker composition · Zustand or a tiny custom store ·
IndexedDB via `idb` · Spotify oEmbed/IFrame (no auth) for music · Vitest +
Playwright for tests. IDs are **ULIDs** (sortable by time).

## The hard part — the core algorithm (DESIGN §8)

Turning a fast chat stream into a coherent painting is a **streaming online
clustering** problem solved with a **DP-means / leader-follower** approach
(k-means-like, but clusters grow on demand):

1. **Featurize** each message read-only into a vector `v` (hashed char n-grams +
   multi-axis affect + hue) — *without ever altering the text*.
2. **Online classify** to the nearest facet centroid by cosine similarity;
   join (`τ_join`), spawn a new facet (`τ_new`), or mark "weak" in between.
3. **Centroid drift** via EMA so a facet tracks who you are *now* (the eternal
   present falling out of the math).
4. **Continuous merge** — near-duplicates *thicken* a spot (`τ_dup`) instead of
   stacking; density over count; all originals retained verbatim.
5. **Periodic maintenance** — merge/split/relabel/cap facets.
6. **Layout** — force-directed pool relaxation → flat `Float32Array` buffers the
   renderer uploads.

Tunable parameters with defaults are in **DESIGN §8.8**. Two worked examples
(§8.9 a music burst, §8.10 "Tess" — an emotional episode across four
languages) are the **acceptance scenarios** for this algorithm; check work
against them.

## Proposed directory layout (DESIGN appendix — for when code starts)

```
src/
  main.ts                 # bootstrap, capability detection
  gpu/                    # device.ts, renderer.ts, pipelines/, shaders/*.wgsl
  compose/                # worker.ts, featurize.ts, router.ts, merge.ts,
                          # pools.ts, aggregate.ts, layout.ts
  store/                  # state.ts, db.ts (IndexedDB), color.ts
  ui/                     # chat-panel.ts, composer.ts, controls.ts, overlay.css
docs/
  DESIGN.md
```

## Roadmap (DESIGN §10)

MVP = **Phases 0–10, all local**: scaffold + WebGPU init (0) → metaball pools +
glass droplets (1) → liquid-blend (2) → featurizer + router (3) → chat panel +
batched ingest (4) → continuous merge + LOD (5) → affect/weather (6) →
composite composer + media shares (7) → episodes (8) → eternal-present
mechanics (9) → identity & boundaries (10). Phase 11+ is the additive backend /
sync / commons ("the Square & the Abouts", DESIGN §12 — vision, not MVP).

## Working in this repo

- **Today the work is documentation.** When editing `README.md` or
  `docs/DESIGN.md`, preserve the existing voice (precise, opinionated, uses
  `§`-section cross-references and the established vocabulary above). Keep the
  README a faithful summary of the design doc; if you change a decision, update
  both and any affected `§` cross-references.
- **Build/run commands live in `app/`** (the only `package.json`). From `app/`:
  `npm install`, then `npm run dev` (Vite dev server), `npm run build`
  (type-check + bundle to `dist/`), `npm run preview` (serve the build). Docker:
  `docker compose up --build` (serves the static bundle via nginx on `:8080`).
  The repo root and `docs/`/`prototype/` have **no** build tooling — don't invent
  commands there. The app diverges from DESIGN §5 in one way: it uses **React**
  for the overlay (DESIGN suggested plain DOM/Lit) and does not yet have the Web
  Worker / IndexedDB / Vitest+Playwright layers — add those per DESIGN as the app
  grows, and update this file when you do.
- **WebGPU needs a secure context.** It works on `localhost` and HTTPS; over a
  plain-`http` LAN IP the browser disables it and the app uses the Canvas2D
  fallback. The renderer compiles the shader and builds the pipeline *before*
  claiming the canvas, so a WebGPU/shader failure degrades cleanly to Canvas2D.
- **When you add code,** mirror the data model (§6) and module boundaries (§4,
  appendix) from the design rather than improvising a new structure, and keep
  the non-negotiable conventions above true in code (especially verbatim text
  and never-delete).

## Git / contribution workflow

- Active development branch for current work: **`claude/webgpu-glass-social-space-jcfei6`**.
- Commit with clear, descriptive messages (see `git log` for the established
  style — short imperative subjects describing the design decision made).
- Push with `git push -u origin <branch-name>`.
- **Do not open a pull request unless explicitly asked.**
