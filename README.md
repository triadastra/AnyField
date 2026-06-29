# AnyField

A personal **WebGPU glass-space** where posting *a lot* is the point.

Instead of force-feeding every post into followers' feeds (annoying, low
engagement), AnyField gives prolific posters a **Field** — an infinite, zoomable
frosted-glass surface that composites high-volume self-expression into a
**liquid collage**. Volume becomes texture, not noise. Viewers *visit* a Field;
nothing is pushed at them.

> Status: **design phase.** No app code yet — see the plan below.

## Three pillars

1. **Pull, not push.** A personal canvas you *visit*, not a feed pushed at
   others. Frictionless, unlimited self-expression.
2. **The eternal present.** Unlike Instagram (live-only, then frozen into a dead
   archive), posts here stay **mutable** and always read as *"this is me, now."*
   You build on yourself instead of leaving frozen snapshots behind — nothing is
   deleted, old thoughts recede into fog but can resurface.
3. **Many-into-one-frame.** Aggregation *is* the feature. A single post is a
   **composite** — a travel image + a Spotify track + its lyrics + several
   captions + a mood — and many posts blend into one coherent liquid collage.

### What it isn't
- ❌ Not a feed. No push, no notifications-at-others, no mass-messaging.
- ❌ Not an archive of frozen moments.

## The plan

See **[`docs/DESIGN.md`](docs/DESIGN.md)** for the full design: the concept,
the liquid-blend aesthetic, architecture, data model, the WebGPU render
pipeline, the layout engine, and the phased roadmap.

The MVP is **local-first** (IndexedDB, no server). A sync/multi-user backend is
an additive later phase.
