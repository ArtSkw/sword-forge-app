import type { ArchetypeKey, FullerStyle } from '../store/configStore';
import { PROFILE_FAMILIES, VIKING_LENTICULAR_SINGLE, buildFullProfile, type ProfilePoint } from './bladeProfiles';

// Blade cross-sections as closed perimeters, x across the blade (−1 = edge, +1 = the other edge or the
// back of a single-edged blade), z through it (scaled by the section's half-thickness). Every variant of
// one section has the same number of points, so a fuller can blend in and out along the blade.

export type Section = 'lenticular' | 'diamond' | 'hexagonal' | 'hollow' | 'triangular' | 'square' | 'wedge';

const X15 = [-1, -0.97, -0.88, -0.74, -0.55, -0.28, -0.14, 0, 0.14, 0.28, 0.55, 0.74, 0.88, 0.97, 1];

// Hollow-ground faces: concave between a sharp ridge and the edge bevel.
const hollowZ = (x: number) => (Math.abs(x) >= 1 ? 0 : Math.abs(x) >= 0.97 ? 0.03 : (1 - Math.abs(x)) ** 1.5);
const HOLLOW: ProfilePoint[] = buildFullProfile(X15.map((x) => [x, hollowZ(x)]));

// Triangular (estoc): a hollow-faced ridge over a flat, slightly hollowed back face. Three arrises.
const TRI_BASE = -0.34;
const TRIANGULAR: ProfilePoint[] = [
  ...X15.map((x): ProfilePoint => [x, TRI_BASE + (1 - TRI_BASE) * hollowZ(x)]),
  ...X15.slice(1, -1).reverse().map((x): ProfilePoint => [x, TRI_BASE + 0.08 * (1 - x * x)]),
];

// Single-edged wedge (falchion): faces rise from the edge to a thick, squared back at +1.
// A distinct edge bevel (to x = −0.88) gives the edge its own line of light against the broad face.
const WEDGE_UPPER: ProfilePoint[] = [
  [-1, 0], [-0.97, 0.04], [-0.88, 0.18], [-0.7, 0.26], [-0.45, 0.38], [-0.2, 0.5], [0.05, 0.62],
  [0.3, 0.73], [0.5, 0.82], [0.65, 0.88], [0.8, 0.94], [0.92, 0.98], [0.975, 0.99], [1, 0.75], [1, 0],
];
// A narrow groove run near the back (the Conyers falchion: about 25 mm from the back).
const WEDGE_GROOVE_UPPER: ProfilePoint[] = WEDGE_UPPER.map(([x, z], i): ProfilePoint =>
  i === 7 ? [0.36, 0.76] : i === 8 ? [0.47, 0.6] : i === 9 ? [0.58, 0.84] : [x, z]);
const WEDGE = buildFullProfile(WEDGE_UPPER), WEDGE_GROOVE = buildFullProfile(WEDGE_GROOVE_UPPER);

/** The perimeter for a section and fuller (sections that take no fuller ignore it). */
export function sectionPerimeter(section: Section, fuller: FullerStyle, archetype: ArchetypeKey): ProfilePoint[] {
  switch (section) {
    case 'lenticular':
      return buildFullProfile(archetype === 'vikingSword' && fuller === 'single' ? VIKING_LENTICULAR_SINGLE : PROFILE_FAMILIES.lenticular[fuller]);
    case 'diamond': return buildFullProfile(PROFILE_FAMILIES.diamond[fuller]);
    case 'hexagonal': return buildFullProfile(PROFILE_FAMILIES.hexagonal[fuller]);
    case 'hollow': case 'square': return HOLLOW;
    case 'triangular': return TRIANGULAR;
    case 'wedge': return fuller === 'none' ? WEDGE : WEDGE_GROOVE;
  }
}

// Hard-shaded points of each section (indices into the 28-point perimeter: upper half 0–14, and the lower
// mirror of upper point j at 28 − j): edges, bevel lines, ridges, shoulders and arrises. Listed by hand,
// because measured angles miss the shallow ridge of a flat diamond and catch the gentle curve of a lens.
const both = (js: number[]) => js.flatMap((j) => (j === 0 || j === 14 ? [j] : [j, 28 - j]));
export function sectionCreases(section: Section, fuller: FullerStyle): Set<number> {
  switch (section) {
    case 'lenticular': return new Set(both([0, 14, 1, 13]));
    case 'diamond': case 'hollow': case 'square': return new Set(both([0, 14, 1, 13, 7]));
    case 'hexagonal': return new Set(both([0, 14, 1, 13, 5, 9]));
    case 'triangular': return new Set([0, 14, 1, 13, 7]);
    case 'wedge': return new Set([...both([0, 1, 2, 13]), ...(fuller === 'none' ? [] : both([7, 9]))]);
  }
}

/** Area of a perimeter (shoelace), in normalised units: x across −1..1, z through as listed. */
const area = (per: ProfilePoint[]) => Math.abs(per.reduce((a, [x, z], i) => { const [nx, nz] = per[(i + 1) % per.length]; return a + x * nz - nx * z; }, 0)) / 2;

/** Half-thickness at the base of the blade (m). Stiff thrusting sections are much thicker for their width. */
export function sectionHalfThickness(section: Section, halfWidth: number): number {
  switch (section) {
    case 'triangular': return Math.max(0.0075, halfWidth * 0.55);
    case 'square': return halfWidth * 0.8;
    case 'hollow': return 0.0055;
    case 'diamond': return 0.0062;     // a ridged blade is thicker at its ridge than a lens at its crown
    case 'hexagonal': return 0.0058;
    case 'wedge': return 0.0034;
    default: return 0.005;
  }
}

/** The section's area relative to the plain lens, for the weight estimate (the lens is the calibrated case). */
export function sectionArea(section: Section, archetype: ArchetypeKey): number {
  return area(sectionPerimeter(section, 'none', archetype)) / area(sectionPerimeter('lenticular', 'none', archetype));
}

export const takesFuller = (section: Section) => section === 'lenticular' || section === 'diamond' || section === 'hexagonal' || section === 'wedge';
