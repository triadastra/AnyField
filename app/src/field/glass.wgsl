// AnyField — Liquid Glass material over a granite-white surface.
// Edge lensing (refraction at the rounded rim, clear center), chromatic
// dispersion, specular top edge, soft contact shadow, faint adaptive tint.

struct It { a: vec4<f32>, c: vec4<f32> };  // a.xy=center, a.zw=half-size ; c.rgb=tint, c.a=freshness glow
struct U {
  res: vec2<f32>, time: f32, n: f32,
  weather: vec4<f32>,              // rgb + storminess (§2)
};
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read> items: array<It>;

@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4<f32> {
  var p = array<vec2<f32>, 3>(vec2(-1., -1.), vec2(3., -1.), vec2(-1., 3.));
  return vec4(p[i], 0., 1.);
}

fn h21(p: vec2<f32>) -> f32 { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
fn vn(p: vec2<f32>) -> f32 {
  let i = floor(p); let f = fract(p); let u2 = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1., 0.)), u2.x),
             mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), u2.x), u2.y);
}
// signed distance to a rounded box (the glass pill)
fn sdBox(p: vec2<f32>, b: vec2<f32>, r: f32) -> f32 {
  let q = abs(p) - b + vec2(r, r);
  return length(max(q, vec2(0.0, 0.0))) + min(max(q.x, q.y), 0.0) - r;
}

// granite-white surface behind the glass — fine speckle makes refraction read
fn bg(px: vec2<f32>) -> vec3<f32> {
  let p = px;
  let mottle = vn(p * 0.016) * 0.55 + vn(p * 0.055) * 0.28 + vn(p * 0.14) * 0.17;
  var base = mix(0.80, 0.985, mottle);
  base += (vn(p * 0.9) - 0.5) * 0.10;
  var col = vec3(base, base, base);
  if (h21(floor(p * 0.7)) > 0.945) { col -= vec3(0.30); }
  if (h21(floor(p * 1.7) + 19.) > 0.978) { col -= vec3(0.46); }
  if (h21(floor(p * 0.5) + 7.) > 0.960) { col += vec3(0.06, 0.03, 0.0); }
  if (h21(floor(p * 0.95) + 33.) > 0.965) { col -= vec3(0.0, 0.02, 0.05); }
  // emotional weather: a faint wash over the slab on strong storms
  col = col * mix(vec3(1.0), u.weather.rgb * 1.5, u.weather.a * 0.22) + u.weather.rgb * u.weather.a * 0.04;
  return clamp(col, vec3(0.0), vec3(1.0));
}

@fragment fn fs(@builtin(position) fc: vec4<f32>) -> @location(0) vec4<f32> {
  let px = fc.xy;
  var col = bg(px);
  let n = u32(u.n);

  // soft contact shadows so the glass floats above the slab
  var sh = 0.0;
  for (var k = 0u; k < n; k++) {
    let it = items[k]; let b = it.a.zw;
    if (length(px - it.a.xy - vec2(0.0, 9.0)) > max(b.x, b.y) + 24.0) { continue; }
    let d = sdBox(px - it.a.xy - vec2(0.0, 9.0), b, min(b.x, b.y));
    sh = max(sh, 1.0 - smoothstep(-2.0, 20.0, d));
  }
  col *= 1.0 - sh * 0.16;

  // Liquid Glass pills
  for (var k = 0u; k < n; k++) {
    let it = items[k]; let c = it.a.xy; let b = it.a.zw; let rad = min(b.x, b.y);
    let p = px - c;
    if (abs(p.x) > b.x + 3.0 || abs(p.y) > b.y + 3.0) { continue; }
    let d = sdBox(p, b, rad);
    let cov = 1.0 - smoothstep(-1.1, 1.1, d);
    if (cov < 0.002) { continue; }

    // surface normal (numeric gradient)
    let e = 2.0;
    let gx = sdBox(p + vec2(e, 0.0), b, rad) - sdBox(p - vec2(e, 0.0), b, rad);
    let gy = sdBox(p + vec2(0.0, e), b, rad) - sdBox(p - vec2(0.0, e), b, rad);
    let nrm = normalize(vec2(gx, gy) + vec2(0.0001, 0.0));

    // edge lensing: refraction concentrates at the rim, clear in the center
    let edge = smoothstep(-15.0, 0.0, d);
    let lens = nrm * edge * edge * 22.0;
    let rr = bg(px + lens * 1.08).r;
    let gg = bg(px + lens).g;
    let bb = bg(px + lens * 0.92).b;
    var ref = vec3(rr, gg, bb);
    ref = mix(ref, (bg(px + lens + vec2(2.0, 2.0)) + bg(px + lens + vec2(-2.0, -2.0))) * 0.5, 0.30);

    var glass = ref;
    glass = mix(glass, vec3(1.0, 1.0, 1.0), 0.05);  // milky translucency
    glass += it.c.rgb * 0.10;                        // faint adaptive tint
    glass += it.c.rgb * it.c.a * 0.16;               // freshness glow (fades to clear)

    let L = normalize(vec2(-0.35, -1.0));
    let band = 1.0 - smoothstep(0.0, 3.0, abs(d + 2.0));
    glass += vec3(1.0) * pow(max(dot(nrm, L), 0.0), 1.5) * band * 0.95;   // top specular
    glass -= vec3(0.05) * band * max(dot(nrm, vec2(0.0, 1.0)), 0.0);      // bottom rim
    glass += vec3(1.0) * edge * edge * 0.08;                             // fresnel
    let sheen = clamp(-p.y / (b.y * 1.4), 0.0, 1.0) * (1.0 - edge) * 0.10;
    glass += vec3(sheen);

    col = mix(col, glass, cov);
  }

  let q = px / u.res - 0.5;
  col *= 1.0 - dot(q, q) * 0.14;
  return vec4(pow(clamp(col, vec3(0.), vec3(1.)), vec3(0.96)), 1.0);
}
