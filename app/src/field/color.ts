// HSL -> linear-ish RGB (0..1). Small, dependency-free.
export function hsl2rgb(h: number, s: number, l: number): [number, number, number] {
  h = (((h % 360) + 360) % 360) / 360
  s = Math.max(0, Math.min(1, s))
  l = Math.max(0, Math.min(1, l))
  const a = s * Math.min(l, 1 - l)
  const k = (n: number) => (n + h * 12) % 12
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0), f(8), f(4)]
}
