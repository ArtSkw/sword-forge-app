import { sectionPerimeter, takesFuller } from '../../presets/bladeSections';
import { halfWidths, type BladeSpec } from '../../lib/bladeSpec';

// The blade's section along its length, shared by the blade's own geometry and by parts that lie on it.

export const TIP_THICK_T = 0.02;
const FULLER_BLEND = 0.05;
export const BLUNT = 0.6;           // ricasso: the edges are flattened to this share of the thickness

export function fullerBlend(t: number, s: BladeSpec): number {
  if (s.fuller === 'none' || !takesFuller(s.section)) return 0;
  return Math.max(0, Math.min(1, (t - s.fullerStart) / FULLER_BLEND, (s.fullerEnd - t) / FULLER_BLEND));
}

/**
 * The blade's front face (z ≥ 0) across its width at t, as z at x (sword space, metres): what a plate laid
 * on the blade (the écusson) is bent to. Same section, fuller and ricasso as the blade's own rings.
 * `side` −1 gives the back face instead, as its depth (−z).
 */
export function bladeFaceAt(s: BladeSpec, t: number, side: 1 | -1 = 1): (x: number) => number {
  const plain = sectionPerimeter(s.section, 'none', s.archetype, s.grooveAt), fullered = sectionPerimeter(s.section, s.fuller, s.archetype, s.grooveAt);
  const { spine, edge, ricasso, shift } = halfWidths(s, t), ft = fullerBlend(t, s), thick = s.halfThick * (1 - t * (1 - TIP_THICK_T));
  const pts = plain.map(([px, pz], j) => {
    const nx = px + (fullered[j][0] - px) * ft;
    let nz = pz + (fullered[j][1] - pz) * ft;
    if (ricasso > 0 && nz !== 0) nz += ricasso * Math.sign(nz) * Math.max(0, BLUNT - Math.abs(nz));
    return [shift + nx * (nx >= 0 ? spine : edge), nz * thick * side] as const;
  }).filter(([, z]) => z > 0).sort((a, b) => a[0] - b[0]);
  return (x) => {
    if (!pts.length || x <= pts[0][0] || x >= pts[pts.length - 1][0]) return 0;
    let k = 1;
    while (pts[k][0] < x) k++;
    const [x0, z0] = pts[k - 1], [x1, z1] = pts[k];
    return z0 + (z1 - z0) * ((x - x0) / Math.max(1e-9, x1 - x0));
  };
}

/** The blade's depth (the deeper of its two faces) across its width at t: what the cross must cover. */
export function bladeDepthAt(s: BladeSpec, t: number): (x: number) => number {
  const front = bladeFaceAt(s, t), back = bladeFaceAt(s, t, -1);
  return (x) => Math.max(front(x), back(x));
}
