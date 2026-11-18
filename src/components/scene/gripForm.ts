import type { ArchetypeKey, GripMaterial, GripShape } from '../../store/configStore';
import { getGripDetailRecipe } from '../../presets/archetypeDetails';
import { DEFAULT_GRIP_SHAPE, GRIP_SHAPES, GRIP_SHAPE_OFFERED } from '../../presets/forge';

// The grip's form as numbers (radii, wraps, shapes), shared by the grip's geometry (Grip.tsx) and the
// ferrules that close over its ends (HiltDetails.tsx).

export const GRIP_RADIUS_TOP = 0.011;
export const GRIP_RADIUS_BOT = 0.014;

export type Wrap = { pitch: number; height: number; kind: 'none' | 'strip' | 'cord' | 'wire' };
export const WRAPS: Record<GripMaterial, Wrap> = {
  wood: { pitch: 0, height: 0, kind: 'none' },
  leather: { pitch: 0.017, height: 0.00055, kind: 'strip' },   // a strip about 17 mm wide
  cord: { pitch: 0.0021, height: 0.00052, kind: 'cord' },      // cord about 2 mm thick
  wire: { pitch: 0.0013, height: 0.00034, kind: 'wire' },      // twisted wire about 1.3 mm
};

// The leather's seam: on the back of the grip (−z, the side turned away in the default view).
export const SEAM_ANGLE = -Math.PI / 2, SEAM_STITCH = 0.004;
export const SEAM = { height: 0.00025, width: 0.0012 };

/**
 * Radius factor along the grip (t = 0 at the pommel, 1 at the guard) for each shape: strong enough to read in the
 * grip's own shot (a few millimetres of silhouette). The ferrules close over whatever the shapes reach near the ends
 * (gripEndReach).
 */
export function shapeAt(shape: GripShape, t: number): number {
  switch (shape) {
    case 'straight': return 1;
    // A full swell in the middle that fills the palm (+15 %), easing in from the ends.
    case 'swell': return 1 + 0.15 * Math.sin(Math.PI * t) ** 1.5;
    // Narrow in the middle (−22 %), swelling toward both hands (late 15th-c. bastard grips).
    case 'waisted': return 1.05 - 0.27 * Math.sin(Math.PI * t) ** 2;
    // Two grips in one, each swelling (+14 %), parted by a raised moulding (16th-c. two-handers; see Grip).
    case 'twoStage': { const s = t < GRIP_MOULDING_T ? t / GRIP_MOULDING_T : (t - GRIP_MOULDING_T) / (1 - GRIP_MOULDING_T); return 1 + 0.14 * Math.sin(Math.PI * s) ** 2; }
  }
}
// The two-stage grip's moulding: where it sits along the grip, how far it stands (m) and its half-width (m).
export const GRIP_MOULDING_T = 0.52, GRIP_MOULDING = { height: 0.0036, width: 0.0036 };

/**
 * The most a grip of this type reaches out near one end (radius before the oval and the Viking breadth),
 * over every shape the type offers and every wrap: what that end's ferrule must close over. `span` is how
 * far from the end it looks, as a share of the grip's length.
 */
export function gripEndReach(archetype: ArchetypeKey, end: 'top' | 'bottom', span = 0.15): number {
  const recipe = getGripDetailRecipe(archetype);
  const core = end === 'top' ? recipe.coreRadiusTop ?? GRIP_RADIUS_TOP : recipe.coreRadiusBottom ?? GRIP_RADIUS_BOT;
  const shapes = GRIP_SHAPE_OFFERED.includes(archetype) ? GRIP_SHAPES.map((s) => s.id) : [DEFAULT_GRIP_SHAPE[archetype]];
  let swell = 0;
  for (const shape of shapes) for (let k = 0; k <= 30; k++) { const t = (k / 30) * span; swell = Math.max(swell, shapeAt(shape, end === 'top' ? 1 - t : t)); }
  const wrap = Math.max(...Object.values(WRAPS).map((w) => w.height)) + SEAM.height;
  return core * swell + wrap;
}
