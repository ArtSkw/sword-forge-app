// Integer hash → [0, 1), and 1D value noise built on it (smoothstep between hashed lattice values): organic,
// non-periodic motion for the embers and the firelight, cheap enough to call every frame.
export function hash(i: number) {
  let h = Math.imul(i | 0, 0x27d4eb2d) ^ 0x165667b1;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}
export function noise(x: number) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), a = hash(i);
  return a + (hash(i + 1) - a) * u;
}
/** Value noise centred on 0, in −1..1. */
export const snoise = (x: number) => noise(x) * 2 - 1;
