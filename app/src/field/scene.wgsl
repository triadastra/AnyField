// AnyField — Scene pass. Renders the backdrop the glass refracts into an
// offscreen texture: a warm white-marble slab + emotional-weather wash + soft
// facet-color pools behind each post. Giving the glass a real, colored
// backdrop (instead of flat noise) is what makes the refraction read as glass.

// a.xy=center, a.zw=half ; c.rgb=tint, c.a=freshness glow ; m=corner-radius
// scale (unused here) — struct layout must match glass.wgsl (same buffer, same stride)
struct It { a: vec4<f32>, c: vec4<f32>, m: vec4<f32> };
struct U {
  res: vec2<f32>, time: f32, dpr: f32,
  weather: vec4<f32>,           // rgb + storminess (§2)
  mat: vec4<f32>,               // ior, dispersion, thickness, bevel
  mat2: vec4<f32>,              // frost, spec, fresnel, dome
  n: vec4<f32>,                 // count, _, _, _
};
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read> items: array<It>;

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

@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4<f32> {
  var p = array<vec2<f32>, 3>(vec2(-1., -1.), vec2(3., -1.), vec2(-1., 3.));
  return vec4(p[i], 0., 1.);
}

@fragment fn fs(@builtin(position) fc: vec4<f32>) -> @location(0) vec4<f32> {
  let px = fc.xy;
  // warm white-marble slab: soft base with drifting warm veins
  let q = px * 0.004;
  let warp = fbm(q * 2.1);
  let band1 = sin(px.x * 0.0022 + px.y * 0.0009 + warp * 5.0);
  let vein1 = pow(1.0 - abs(band1), 9.0);
  let band2 = sin(px.x * 0.0007 - px.y * 0.0016 + fbm(q * 1.3 + vec2(7.0, 3.0)) * 4.0);
  let vein2 = pow(1.0 - abs(band2), 14.0);
  let grain = (vn(px * 0.5) - 0.5) * 0.035 + (fbm(px * 0.012) - 0.5) * 0.05;
  var col = vec3(0.965, 0.955, 0.943) + vec3(grain, grain, grain);
  col = mix(col, vec3(0.80, 0.74, 0.66), vein1 * 0.32 * (0.4 + 0.6 * fbm(q * 3.7)));
  col = mix(col, vec3(0.86, 0.82, 0.76), vein2 * 0.22);

  // emotional weather: a faint wash over the slab on strong storms
  col = col * mix(vec3(1.0), u.weather.rgb * 1.5, u.weather.a * 0.22) + u.weather.rgb * u.weather.a * 0.04;

  // soft facet-color pools behind each post — the glass bends THIS color
  // (skipped in clear mode, u.n.y: the glass stays truly untinted)
  if (u.n.y < 0.5) {
    let n = i32(u.n.x);
    for (var k = 0; k < n; k++) {
      let it = items[k];
      let b = it.a.zw;
      let rad = min(b.x, b.y);
      let d = sdBox(px - it.a.xy, b * 1.3, rad * 1.5);
      // a broad soft glow, brightest just outside the pill's footprint
      let glow = (1.0 - smoothstep(-rad * 1.3, rad * 2.6, d)) * 0.48;
      col += it.c.rgb * glow * (0.55 + 0.55 * it.c.a);
    }
  }

  return vec4(clamp(col, vec3(0.0), vec3(1.4)), 1.0);
}
