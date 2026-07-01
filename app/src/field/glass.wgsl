// AnyField — Liquid Glass pass (ported from syno/glass-surface.mjs).
// REAL refraction of the offscreen scene texture: rounded-rect SDF -> analytic
// 3D surface normal (rim meniscus + dome + liquid wobble) -> Snell's-law
// refract() -> displaced sample with per-channel chromatic dispersion, frosted
// multi-tap blur (stronger at the rim), Fresnel rim, directional specular.
// The scene pass paints the backdrop; this pass bends it like glass.

// a.xy=center, a.zw=half ; c.rgb=tint, c.a=freshness glow ;
// m.x/m.y = top/bottom corner-radius scale (0..1) — flattens the seam where
// rapid-burst posts fuse flush together (Instagram/iMessage-style grouping)
// m.z = recede (0..1) — how far this pill has melted into the backdrop: the
// glass flattens, frosts over, sheds its shadow/rim, and dissolves toward the
// scene, so risen posts read as a painted background, not floating UI.
struct It { a: vec4<f32>, c: vec4<f32>, m: vec4<f32> };
struct U {
  res: vec2<f32>, time: f32, dpr: f32,
  weather: vec4<f32>,           // rgb + storminess (§2)
  mat: vec4<f32>,               // ior, dispersion, thickness(px), bevel(px)
  mat2: vec4<f32>,              // frost, spec, fresnel, dome
  n: vec4<f32>,                 // count, _, _, _
};
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read> items: array<It>;
@group(0) @binding(2) var samp: sampler;
@group(0) @binding(3) var sceneTex: texture_2d<f32>;

fn ambient(uv: vec2<f32>) -> vec3<f32> {
  return textureSampleLevel(sceneTex, samp, clamp(uv, vec2(0.0), vec2(1.0)), 0.0).rgb;
}

fn h21(p: vec2<f32>) -> f32 { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
fn vn(p: vec2<f32>) -> f32 {
  let i = floor(p); let f = fract(p); let w = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), w.x),
             mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), w.x), w.y);
}
fn fbm(p0: vec2<f32>) -> f32 {
  var p = p0; var v = 0.0; var amp = 0.5;
  for (var i = 0; i < 4; i++) { v += amp * vn(p); p *= 2.02; amp *= 0.5; }
  return v;
}
fn sdBox(p: vec2<f32>, b: vec2<f32>, r: f32) -> f32 {
  let q = abs(p) - b + vec2(r, r);
  return length(max(q, vec2(0.0, 0.0))) + min(max(q.x, q.y), 0.0) - r;
}
// rounded box with independent top/bottom radii (screen space: +y is down,
// so p.y<0 is the top half) — same math as sdBox, picking r per half.
fn sdBoxTB(p: vec2<f32>, b: vec2<f32>, rTop: f32, rBot: f32) -> f32 {
  let r = select(rBot, rTop, p.y < 0.0);
  let q = abs(p) - b + vec2(r, r);
  return length(max(q, vec2(0.0, 0.0))) + min(max(q.x, q.y), 0.0) - r;
}

// The glass material for one pill, refracting the scene texture. (syno glassShade)
fn glassShade(frag: vec2<f32>, it: It) -> vec4<f32> {
  let res = u.res; let t = u.time; let dpr = u.dpr;
  let center = it.a.xy; let half = it.a.zw;
  // full pill for short bubbles, softly-rounded card corners for tall ones;
  // top/bottom scaled independently to flatten a fused rapid-burst seam
  let radiusBase = min(min(half.x, half.y), 28.0 * dpr);
  let rTop = radiusBase * clamp(it.m.x, 0.0, 1.0);
  let rBot = radiusBase * clamp(it.m.y, 0.0, 1.0);
  let radius = min(rTop, rBot);
  let d0 = sdBoxTB(frag - center, half, rTop, rBot);
  if (d0 > 1.5 * dpr) { return vec4(0.0); }
  // clear mode (u.n.y): pure solid glass — refraction only; tint/rim skipped
  // below, frost/fresnel zeroed via uniforms.

  let recede = clamp(it.m.z, 0.0, 1.0);
  let ior = u.mat.x; let dispersion = u.mat.y;
  // scale optical depth by pill size so tiny avatars aren't over-refracted
  let sizeScale = clamp(radius / 40.0, 0.35, 1.4);
  // receded glass goes optically flat — it stops bending the world behind it
  let thickness = u.mat.z * dpr * sizeScale * (1.0 - 0.75 * recede);
  let bevelIn = u.mat.w * dpr;
  // ...and frosts over even in clear mode, blurring into the backdrop
  let frost = max(u.mat2.x, 0.5 * recede);
  let specStrength = u.mat2.y * (1.0 - 0.8 * recede);
  let fresnelStrength = u.mat2.z * (1.0 - 0.8 * recede);
  let domeAmp = u.mat2.w * (1.0 - recede);
  let wobbleAmp = 0.22;

  let bevelW = max(min(bevelIn, min(half.x, half.y) * 0.95), 4.0 * dpr);

  // analytic surface normal from the SDF gradient
  let EPS = 1.25 * dpr;
  let gx = sdBoxTB(frag - center + vec2(EPS, 0.0), half, rTop, rBot) - sdBoxTB(frag - center - vec2(EPS, 0.0), half, rTop, rBot);
  let gy = sdBoxTB(frag - center + vec2(0.0, EPS), half, rTop, rBot) - sdBoxTB(frag - center - vec2(0.0, EPS), half, rTop, rBot);
  var grad = vec2(gx, gy) / (2.0 * EPS);
  grad = grad / max(length(grad), 1e-4);

  let inAmt = clamp(-d0 / bevelW, 0.0, 1.0);
  let uEdge = 1.0 - inAmt;
  let slope = min(uEdge / sqrt(max(1.0 - uEdge * uEdge, 1e-3)), 6.0);   // meniscus rises steeply at the rim

  // gentle dome across the body + drifting liquid wobble
  let nrm = (frag - center) / max(half, vec2(1.0));
  let rr = length(nrm);
  let domeDir = normalize(frag - center + vec2(1e-3));
  let domeSlope = domeAmp * smoothstep(0.0, 1.0, rr) * rr;
  let wq = frag / max(res.y, 1.0) * 6.0;
  let n1 = fbm(wq + vec2(t * 0.10, t * 0.07));
  let n2 = fbm(wq + vec2(5.2 - t * 0.08, 1.7 + t * 0.05));
  let wob = vec2(n1 - 0.5, n2 - 0.5) * wobbleAmp * 0.9;

  let tilt = grad * slope * 0.9 + domeDir * domeSlope + wob * (0.35 + 0.65 * (1.0 - inAmt));
  let N = normalize(vec3(-tilt, 1.0));
  let I = vec3(0.0, 0.0, -1.0);

  // Snell refraction, split per channel for chromatic dispersion
  let etaR = 1.0 / (ior - dispersion);
  let etaG = 1.0 / ior;
  let etaB = 1.0 / (ior + dispersion);
  let rR = refract(I, N, etaR); let rG = refract(I, N, etaG); let rB = refract(I, N, etaB);
  let offR = rR.xy * (thickness / max(-rR.z, 0.25));
  let offG = rG.xy * (thickness / max(-rG.z, 0.25));
  let offB = rB.xy * (thickness / max(-rB.z, 0.25));

  // frosted multi-tap: blur grows toward the rim (thicker optical path)
  let blurR = frost * (5.0 + 16.0 * (1.0 - inAmt)) * dpr;
  var acc = vec3(0.0);
  let TAPS = 5;
  for (var i = 0; i < TAPS; i++) {
    let fi = f32(i);
    let ang = fi * 2.39996 + (frag.x + frag.y) * 0.01;          // golden-angle spiral
    let rad2 = sqrt((fi + 0.5) / f32(TAPS)) * blurR;
    let j = vec2(cos(ang), sin(ang)) * rad2;
    acc.r += ambient((frag + offR + j) / res).r;
    acc.g += ambient((frag + offG + j) / res).g;
    acc.b += ambient((frag + offB + j) / res).b;
  }
  var refr = acc / f32(TAPS);
  let luma = dot(refr, vec3(0.299, 0.587, 0.114));
  refr = mix(vec3(luma), refr, 1.10);          // slight saturation lift
  refr = refr * 1.05 + 0.006;

  if (u.n.y < 0.5) {
    // AnyField identity: candy-glass facet tint — multiplicative color depth +
    // additive glow, a touch stronger while the post is fresh. A receded pill
    // keeps a whisper of its facet color (the painting) but loses the shine.
    refr = refr * mix(vec3(1.0), it.c.rgb, 0.30 * (1.0 - 0.55 * recede));
    refr += it.c.rgb * (0.10 + 0.14 * it.c.a) * (1.0 - 0.7 * recede);

    // bright rim line along the edge
    let rimLine = exp(-pow((d0 + 2.0 * dpr) / (1.6 * dpr), 2.0));
    refr += mix(vec3(1.0, 0.97, 0.9), it.c.rgb * 1.4, 0.55) * rimLine * 0.5 * (1.0 - 0.8 * recede);
  }

  // Fresnel rim (view-angle; zero-strength uniform in clear mode), specular glint
  let edgeMask = 1.0 - smoothstep(0.0, 1.0, inAmt);
  let fres = pow(1.0 - N.z, 3.0) * fresnelStrength;
  refr += vec3(0.70, 0.80, 1.0) * fres * (0.35 + 0.65 * edgeMask);
  let L = normalize(vec3(-0.55, -0.72, 0.65));
  let Rr = reflect(I, N);
  let spec = pow(max(dot(Rr, L), 0.0), 48.0) * specStrength;
  refr += vec3(1.0, 0.98, 0.94) * spec;

  // dissolve toward the scene as the pill recedes — background, not UI
  refr = mix(refr, ambient(frag / res), 0.30 * recede);
  let mask = (1.0 - smoothstep(-1.0 * dpr, 1.0 * dpr, d0)) * (1.0 - 0.45 * recede);
  return vec4(refr, mask);
}

@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4<f32> {
  var p = array<vec2<f32>, 3>(vec2(-1., -1.), vec2(3., -1.), vec2(-1., 3.));
  return vec4(p[i], 0., 1.);
}

@fragment fn fs(@builtin(position) fc: vec4<f32>) -> @location(0) vec4<f32> {
  let px = fc.xy; let res = u.res; let dpr = u.dpr;
  var col = ambient(px / res);
  let n = i32(u.n.x);

  // soft contact shadows so the glass floats above the slab
  for (var k = 0; k < n; k++) {
    let it = items[k]; let c = it.a.xy; let b = it.a.zw; let r = min(b.x, b.y);
    let sd = sdBox(px - c - vec2(0.0, 9.0 * dpr), b, r);
    let d0 = sdBox(px - c, b, r);
    // receded glass sits IN the backdrop, so it stops casting a shadow
    let sh = (1.0 - smoothstep(0.0, 24.0 * dpr, sd)) * 0.16 * (1.0 - 0.9 * clamp(it.m.z, 0.0, 1.0));
    col *= 1.0 - sh * smoothstep(-1.0 * dpr, 3.0 * dpr, d0);
  }

  // glass pills, refracting the scene
  for (var k = 0; k < n; k++) {
    let g = glassShade(px, items[k]);
    col = mix(col, g.rgb, g.a);
  }

  let q = px / res - 0.5;
  col *= 1.0 - dot(q, q) * 0.14;
  return vec4(pow(clamp(col, vec3(0.), vec3(1.)), vec3(0.96)), 1.0);
}
