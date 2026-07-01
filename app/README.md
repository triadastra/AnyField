# AnyField — app

A WebGPU **liquid-glass field** built with **Vite + React + TypeScript**.

This is the interactive prototype turned into a real project. You post from a
glass chat bubble; each message floats up and **sticks** into the field as a
Liquid-Glass pill — edge-lensing refraction, specular rim, soft contact shadow —
tinted faintly by its content. Text is stored and rendered **verbatim**.

## Architecture

The render loop lives outside React, in a plain TS engine; React only owns the
UI overlay (DESIGN §4 — "the app is the canvas, HTML is chrome").

```
src/
  main.tsx              # React entry (no StrictMode — single rAF loop)
  App.tsx               # composes the overlay + the field
  compose/              # the composition engine (main-thread for now; DESIGN §8)
    featurize.ts        # text -> hue/affect/topic/tokens (read-only; never edits text)
    router.ts           # online DP-means-ish routing: similarity, centroid drift, thicken
    types.ts            # Feat, Droplet, Facet
  field/
    engine.ts           # facets + droplets, physics, WebGPU + Canvas2D renderer, labels
    glass.wgsl          # the Liquid Glass shader (imported as ?raw)
    color.ts  types.ts
  ui/
    Field.tsx           # mounts the canvas + label layer, owns the Engine
    ChatDock.tsx        # the glass chat bubble (+ / text / send)
    Chips.tsx           # tap-to-send examples
```

**Layout** is a right-aligned **rising glass chat** (WeChat-like): posts hug the
right edge with an avatar, new ones float up from the dock and the column scrolls
upward, songs render as glass **cover-blocks** with the title/artist attached.

**Composition** (`src/compose/`): each sent message is featurized (hue, affect,
topic, tokens) read-only, then routed to the nearest **facet** by combined
similarity (join or spawn; centroids drift via EMA). The facet drives each post's
**tint**, and consecutive same-facet posts **link** together. Recent affect
drives a light emotional-weather tint. Text is always stored and shown
**verbatim**.

**Rendering** is WebGPU-first with a **Canvas2D fallback**: the shader is
compiled and the pipeline built *before* the canvas is claimed, so if WebGPU is
unavailable or the shader fails, it falls back cleanly. The frame loop always
runs. The badge (top-right) shows which renderer is active.

## Develop

```bash
cd app
npm install
npm run dev          # http://localhost:5173
```

## Build

```bash
npm run build        # type-check + bundle to dist/
npm run preview      # serve the built bundle
```

## Run with Docker

Multi-stage build (Node to build → nginx to serve the static bundle):

```bash
cd app
docker compose up --build         # http://localhost:8080
# or:
docker build -t anyfield-app .
docker run --rm -p 8080:80 anyfield-app
```

> **WebGPU needs a secure context.** `http://localhost:8080` qualifies, so
> WebGPU works on a desktop browser that supports it. If you open the container
> from another device over a plain-`http` LAN IP, the browser disables WebGPU
> and the app uses the Canvas2D fallback. To get WebGPU over the LAN, put it
> behind HTTPS (e.g. a Caddy/Traefik TLS proxy in front of this container).

## Status / scope

This is the visual + interaction sketch. The full composition engine (Web
Worker facet router, IndexedDB persistence, episodes, weather) from
`docs/DESIGN.md` is **not** wired in yet — see the roadmap there.
