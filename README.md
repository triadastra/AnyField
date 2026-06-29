# AnyField

A personal **WebGPU glass-space** where posting *a lot* is the point.

Instead of force-feeding every post into followers' feeds (annoying, low
engagement), AnyField gives prolific posters a **Field** — an infinite, zoomable
frosted-glass surface that composites high-volume self-expression into a
**liquid collage**. Volume becomes texture, not noise. Viewers *visit* a Field;
nothing is pushed at them.

> Status: **design phase.** No app code yet — see the plan below.

## How it works in one breath

You post the way you text a friend — a **chat panel**, fire off 20 bubbles a
minute, no friction. But the bubbles don't pile up as a chat log. Each one is
**classified** and flows out onto your **Field**, drifting to the *facet of you*
it belongs to (your food-taste pool, your bold-music pool, today's mood). The
Field is a **WebGPU liquid-glass painting** of your interiority — organized by
facet, not by time — that others can *visit* and read at a glance.

## Three pillars

1. **Pull, not push.** A personal canvas you *visit*, not a feed pushed at
   others. Input is a familiar chat panel; output is a painting.
2. **The eternal present.** Unlike Instagram (live-only, then frozen into a dead
   archive), posts stay **mutable** and always read as *"this is me, now."*
   Nothing is deleted — old thoughts recede into fog but can resurface.
3. **Many-into-one-frame (interiority).** Aggregation *is* the feature. Many
   fragments — a macaron, a track + lyrics, a mood — coexist and blend into one
   coherent frame organized by **facets of self**, not chronology.

## The hard part

Turning a fast chat stream into a coherent painting is a **classification +
continuous-merge** problem: online clustering routes each message to a facet,
near-duplicates *thicken* a region instead of stacking as spam, and **no original
message is ever modified, suppressed, or deleted** — `itttt` stays `itttt`,
because the elongation *is* the meaning. See §3 and §8 of the design.

## Honest, and yours

The field shows the **whole** person, not just the highlights: it has
**emotional weather** — calm drift *and* turbulent storm — so delight, grief,
pain, and defiance are all represented with dignity rather than prettified away.
And it's **private by default** with granular **boundaries** (per-facet
visibility, revocable share links, block) — express everything; share only what
you choose.

### What it isn't
- ❌ Not a feed. No push, no notifications-at-others, no mass-messaging.
- ❌ Not an archive of frozen moments. Not a chat log.

## The plan

See **[`docs/DESIGN.md`](docs/DESIGN.md)** for the full design: the concept,
the liquid-blend aesthetic, architecture, data model, the WebGPU render
pipeline, the layout engine, and the phased roadmap.

The MVP is **local-first** (IndexedDB, no server). A sync/multi-user backend is
an additive later phase.
