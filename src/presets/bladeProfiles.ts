import type { FullerStyle } from '../store/configStore';

// Normalized upper-half cross-section profiles.
// X: -1 = left edge, +1 = right edge (half-width normalized)
// Z:  0 = edge tip,  +1 = crown peak (half-thickness normalized)
// 15 points per upper half (indices 0-14). Indices 1 and 13 form the
// secondary edge bevel — a steep narrow face at each cutting edge.
// buildFullProfile mirrors these to produce a closed 28-point perimeter.

export type ProfilePoint = readonly [number, number];

export type ProfileFamily = 'lenticular' | 'diamond' | 'hexagonal';

// ─── Lenticular (default — arming, longsword, bastard, viking, falchion) ───
// Smooth convex lens with a steep secondary bevel right at each edge.

const LENTICULAR_NONE: ProfilePoint[] = [
  [-1.000, 0.000], // left edge tip
  [-0.970, 0.022], // secondary bevel transition
  [-0.880, 0.090], // primary bevel start
  [-0.740, 0.420],
  [-0.550, 0.720],
  [-0.280, 0.900],
  [-0.140, 0.960],
  [ 0.000, 1.000], // crown peak
  [ 0.140, 0.960],
  [ 0.280, 0.900],
  [ 0.550, 0.720],
  [ 0.740, 0.420],
  [ 0.880, 0.090],
  [ 0.970, 0.022], // secondary bevel transition
  [ 1.000, 0.000], // right edge tip
];

const LENTICULAR_SINGLE: ProfilePoint[] = [
  [-1.000, 0.000],
  [-0.970, 0.022],
  [-0.880, 0.090],
  [-0.740, 0.420],
  [-0.550, 0.720],
  [-0.280, 0.900],
  [-0.140, 0.680],
  [ 0.000, 0.540],
  [ 0.140, 0.680],
  [ 0.280, 0.900],
  [ 0.550, 0.720],
  [ 0.740, 0.420],
  [ 0.880, 0.090],
  [ 0.970, 0.022],
  [ 1.000, 0.000],
];

const LENTICULAR_DOUBLE: ProfilePoint[] = [
  [-1.000, 0.000],
  [-0.970, 0.022],
  [-0.880, 0.090],
  [-0.740, 0.420],
  [-0.550, 0.720],
  [-0.280, 0.580],
  [-0.140, 0.780],
  [ 0.000, 0.860],
  [ 0.140, 0.780],
  [ 0.280, 0.580],
  [ 0.550, 0.720],
  [ 0.740, 0.420],
  [ 0.880, 0.090],
  [ 0.970, 0.022],
  [ 1.000, 0.000],
];

const LENTICULAR_DECORATIVE: ProfilePoint[] = [
  [-1.000, 0.000],
  [-0.970, 0.022],
  [-0.880, 0.090],
  [-0.740, 0.420],
  [-0.550, 0.720],
  [-0.280, 0.880],
  [-0.140, 0.740],
  [ 0.000, 0.620],
  [ 0.140, 0.740],
  [ 0.280, 0.880],
  [ 0.550, 0.720],
  [ 0.740, 0.420],
  [ 0.880, 0.090],
  [ 0.970, 0.022],
  [ 1.000, 0.000],
];

// ─── Diamond (estoc) ───
// Four flat faces meeting at a central ridge — rigid, needle-like.
// Linear z = 1 - |x| base shape; fuller variants apply a shallow channel.

const DIAMOND_NONE: ProfilePoint[] = [
  [-1.000, 0.000],
  [-0.970, 0.030], // sec bevel — slightly broader than lenticular for the diamond ridge
  [-0.880, 0.120],
  [-0.740, 0.260],
  [-0.550, 0.450],
  [-0.280, 0.720],
  [-0.140, 0.860],
  [ 0.000, 1.000],
  [ 0.140, 0.860],
  [ 0.280, 0.720],
  [ 0.550, 0.450],
  [ 0.740, 0.260],
  [ 0.880, 0.120],
  [ 0.970, 0.030],
  [ 1.000, 0.000],
];

const DIAMOND_SINGLE: ProfilePoint[] = [
  [-1.000, 0.000],
  [-0.970, 0.030],
  [-0.880, 0.120],
  [-0.740, 0.260],
  [-0.550, 0.450],
  [-0.280, 0.720],
  [-0.140, 0.680],
  [ 0.000, 0.580],
  [ 0.140, 0.680],
  [ 0.280, 0.720],
  [ 0.550, 0.450],
  [ 0.740, 0.260],
  [ 0.880, 0.120],
  [ 0.970, 0.030],
  [ 1.000, 0.000],
];

const DIAMOND_DOUBLE: ProfilePoint[] = [
  [-1.000, 0.000],
  [-0.970, 0.030],
  [-0.880, 0.120],
  [-0.740, 0.260],
  [-0.550, 0.450],
  [-0.280, 0.560],
  [-0.140, 0.780],
  [ 0.000, 0.880],
  [ 0.140, 0.780],
  [ 0.280, 0.560],
  [ 0.550, 0.450],
  [ 0.740, 0.260],
  [ 0.880, 0.120],
  [ 0.970, 0.030],
  [ 1.000, 0.000],
];

const DIAMOND_DECORATIVE: ProfilePoint[] = [
  [-1.000, 0.000],
  [-0.970, 0.030],
  [-0.880, 0.120],
  [-0.740, 0.260],
  [-0.550, 0.450],
  [-0.280, 0.700],
  [-0.140, 0.700],
  [ 0.000, 0.640],
  [ 0.140, 0.700],
  [ 0.280, 0.700],
  [ 0.550, 0.450],
  [ 0.740, 0.260],
  [ 0.880, 0.120],
  [ 0.970, 0.030],
  [ 1.000, 0.000],
];

// ─── Hexagonal (greatsword) ───
// Broad bevelled edges rising to a distinct shoulder at ±0.74, then a
// gentler face climbs to the central ridge. Creates a sharp bright edge.

const HEXAGONAL_NONE: ProfilePoint[] = [
  [-1.000, 0.000],
  [-0.970, 0.060], // steeper sec bevel — hexagonal edges already rise sharply
  [-0.880, 0.240],
  [-0.740, 0.450],
  [-0.550, 0.650],
  [-0.280, 0.820],
  [-0.140, 0.920],
  [ 0.000, 1.000],
  [ 0.140, 0.920],
  [ 0.280, 0.820],
  [ 0.550, 0.650],
  [ 0.740, 0.450],
  [ 0.880, 0.240],
  [ 0.970, 0.060],
  [ 1.000, 0.000],
];

const HEXAGONAL_SINGLE: ProfilePoint[] = [
  [-1.000, 0.000],
  [-0.970, 0.060],
  [-0.880, 0.240],
  [-0.740, 0.450],
  [-0.550, 0.650],
  [-0.280, 0.820],
  [-0.140, 0.660],
  [ 0.000, 0.540],
  [ 0.140, 0.660],
  [ 0.280, 0.820],
  [ 0.550, 0.650],
  [ 0.740, 0.450],
  [ 0.880, 0.240],
  [ 0.970, 0.060],
  [ 1.000, 0.000],
];

const HEXAGONAL_DOUBLE: ProfilePoint[] = [
  [-1.000, 0.000],
  [-0.970, 0.060],
  [-0.880, 0.240],
  [-0.740, 0.450],
  [-0.550, 0.650],
  [-0.280, 0.560],
  [-0.140, 0.800],
  [ 0.000, 0.900],
  [ 0.140, 0.800],
  [ 0.280, 0.560],
  [ 0.550, 0.650],
  [ 0.740, 0.450],
  [ 0.880, 0.240],
  [ 0.970, 0.060],
  [ 1.000, 0.000],
];

const HEXAGONAL_DECORATIVE: ProfilePoint[] = [
  [-1.000, 0.000],
  [-0.970, 0.060],
  [-0.880, 0.240],
  [-0.740, 0.450],
  [-0.550, 0.650],
  [-0.280, 0.800],
  [-0.140, 0.720],
  [ 0.000, 0.640],
  [ 0.140, 0.720],
  [ 0.280, 0.800],
  [ 0.550, 0.650],
  [ 0.740, 0.450],
  [ 0.880, 0.240],
  [ 0.970, 0.060],
  [ 1.000, 0.000],
];

export const PROFILE_FAMILIES: Record<ProfileFamily, Record<FullerStyle, ProfilePoint[]>> = {
  lenticular: {
    none:       LENTICULAR_NONE,
    single:     LENTICULAR_SINGLE,
    double:     LENTICULAR_DOUBLE,
    decorative: LENTICULAR_DECORATIVE,
  },
  diamond: {
    none:       DIAMOND_NONE,
    single:     DIAMOND_SINGLE,
    double:     DIAMOND_DOUBLE,
    decorative: DIAMOND_DECORATIVE,
  },
  hexagonal: {
    none:       HEXAGONAL_NONE,
    single:     HEXAGONAL_SINGLE,
    double:     HEXAGONAL_DOUBLE,
    decorative: HEXAGONAL_DECORATIVE,
  },
};

// Builds the full closed perimeter from an upper-half profile.
// Perimeter is CCW when viewed from +Y (looking down toward base).
export function buildFullProfile(upper: ProfilePoint[]): ProfilePoint[] {
  const lowerMid = upper
    .slice(1, -1)
    .reverse()
    .map(([x, z]): ProfilePoint => [x, -z]);
  return [...upper, ...lowerMid];
}

export function lerpProfiles(a: ProfilePoint[], b: ProfilePoint[], t: number): ProfilePoint[] {
  return a.map(([ax, az], i) => [ax + (b[i][0] - ax) * t, az + (b[i][1] - az) * t]);
}
