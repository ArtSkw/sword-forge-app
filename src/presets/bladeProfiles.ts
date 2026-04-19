import type { FullerStyle } from '../store/configStore';

// Normalized upper-half cross-section profiles.
// X: -1 = left edge, +1 = right edge (half-width normalized)
// Z:  0 = edge tip,  +1 = crown peak (half-thickness normalized)
// 13 points per upper half (indices 0-12).
// buildFullProfile mirrors these to produce a closed 24-point perimeter.

export type ProfilePoint = readonly [number, number];

// Plain lenticular — smooth convex lens with secondary edge bevel
const UPPER_NONE: ProfilePoint[] = [
  [-1.00, 0.00], // left edge
  [-0.88, 0.09], // left bevel inner
  [-0.74, 0.42],
  [-0.55, 0.72],
  [-0.28, 0.90],
  [-0.14, 0.96], // on smooth curve (same x positions as fuller variants)
  [ 0.00, 1.00], // crown peak
  [ 0.14, 0.96],
  [ 0.28, 0.90],
  [ 0.55, 0.72],
  [ 0.74, 0.42],
  [ 0.88, 0.09], // right bevel inner
  [ 1.00, 0.00], // right edge
];

// Single central fuller groove
const UPPER_SINGLE: ProfilePoint[] = [
  [-1.00, 0.00],
  [-0.88, 0.09],
  [-0.74, 0.42],
  [-0.55, 0.72],
  [-0.28, 0.90],
  [-0.14, 0.68], // left fuller outer
  [ 0.00, 0.54], // fuller center (groove)
  [ 0.14, 0.68], // right fuller outer
  [ 0.28, 0.90],
  [ 0.55, 0.72],
  [ 0.74, 0.42],
  [ 0.88, 0.09],
  [ 1.00, 0.00],
];

// Two parallel grooves
const UPPER_DOUBLE: ProfilePoint[] = [
  [-1.00, 0.00],
  [-0.88, 0.09],
  [-0.74, 0.42],
  [-0.55, 0.72],
  [-0.28, 0.58], // left fuller center
  [-0.14, 0.78], // raised land between fullers
  [ 0.00, 0.86], // center land
  [ 0.14, 0.78],
  [ 0.28, 0.58], // right fuller center
  [ 0.55, 0.72],
  [ 0.74, 0.42],
  [ 0.88, 0.09],
  [ 1.00, 0.00],
];

// Wide shallow decorative groove
const UPPER_DECORATIVE: ProfilePoint[] = [
  [-1.00, 0.00],
  [-0.88, 0.09],
  [-0.74, 0.42],
  [-0.55, 0.72],
  [-0.28, 0.88],
  [-0.14, 0.74], // gentle slope into groove
  [ 0.00, 0.62], // wide shallow center
  [ 0.14, 0.74],
  [ 0.28, 0.88],
  [ 0.55, 0.72],
  [ 0.74, 0.42],
  [ 0.88, 0.09],
  [ 1.00, 0.00],
];

export const UPPER_PROFILES: Record<FullerStyle, ProfilePoint[]> = {
  none:       UPPER_NONE,
  single:     UPPER_SINGLE,
  double:     UPPER_DOUBLE,
  decorative: UPPER_DECORATIVE,
};

// Builds the full 24-point closed perimeter from a 13-point upper half.
// Perimeter is CCW when viewed from +Y (looking down toward base).
export function buildFullProfile(upper: ProfilePoint[]): ProfilePoint[] {
  // Lower half: mirror of upper, excluding shared edge points, reversed
  const lowerMid = upper
    .slice(1, -1)
    .reverse()
    .map(([x, z]): ProfilePoint => [x, -z]);
  return [...upper, ...lowerMid]; // 13 + 11 = 24 points
}

export function lerpProfiles(a: ProfilePoint[], b: ProfilePoint[], t: number): ProfilePoint[] {
  return a.map(([ax, az], i) => [ax + (b[i][0] - ax) * t, az + (b[i][1] - az) * t]);
}
