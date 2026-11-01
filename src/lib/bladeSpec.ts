import type { ArchetypeKey, BladeWidth, FullerStyle, SwordConfig } from '../store/configStore';
import { SWORD_TYPES } from '../presets/swordTypes';
import { BLADE_PROFILES } from '../presets/catalogue';
import { BLADE_LENGTHS } from '../components/scene/dimensions';
import { sectionHalfThickness, type Section } from '../presets/bladeSections';
import type { BladeProfile, RicassoCover } from '../presets/forge';

// The full description of a blade, merged from the sword type, the chosen blade profile and the user's
// own choices. One source for the 3D blade, the card silhouettes and the weight estimate.

export const BLADE_HALF_WIDTHS: Record<BladeWidth, number> = { narrow: 0.014, standard: 0.022, wide: 0.030 };
const DEFAULT_FULLER: [number, number] = [0.10, 0.68];
const RICASSO_WIDTH = 0.72;     // the ricasso steps in to this share of the blade's width
const RICASSO_STEP = 0.012;     // length of the step from ricasso to blade (share of blade length)
const FLAME = { amp: 0.12, wavelength: 0.062, end: 0.86 };   // m per wave: the Wallace A470 flame runs ~6 cm a wave

export type BladeSpec = {
  archetype: ArchetypeKey;
  length: number;               // m
  halfWidth: number;            // m
  halfThick: number;            // m, at the base
  section: Section;
  fuller: FullerStyle;
  fullerStart: number; fullerEnd: number;
  taperEnd: number; midWidth: number; shoulder: number;
  singleEdged: boolean; swell: number; clipT: number;
  ricasso: { t: number; cover: RicassoCover; hooks: 'lugs' | 'crescent' } | null;
  flame: boolean;
};

function build(archetype: ArchetypeKey, profile: BladeProfile | undefined, blade: Partial<SwordConfig['blade']> & Pick<SwordConfig['blade'], 'length' | 'width' | 'fuller'>): BladeSpec {
  const preset = SWORD_TYPES[archetype];
  const length = BLADE_LENGTHS[blade.length], halfWidth = BLADE_HALF_WIDTHS[blade.width];
  const section = blade.section ?? profile?.section ?? preset.section;
  const singleEdged = section === 'wedge';
  const cover = blade.ricasso === undefined ? profile?.ricasso?.cover : blade.ricasso === 'none' ? undefined : blade.ricasso;
  const ricassoT = cover ? Math.min(0.4, (profile?.ricasso?.cm ?? 24) / 100 / length) : 0;
  const [fs, fe] = profile?.fullerSpan ?? [preset.fullerStart ?? DEFAULT_FULLER[0], preset.fullerEnd ?? DEFAULT_FULLER[1]];
  return {
    archetype, length, halfWidth, halfThick: sectionHalfThickness(section, halfWidth), section,
    fuller: blade.fuller,
    fullerStart: Math.max(fs, ricassoT ? ricassoT + 0.03 : 0), fullerEnd: fe,
    taperEnd: blade.shape?.bodyTaperEnd ?? profile?.shape?.bodyTaperEnd ?? preset.bodyTaperEnd,
    midWidth: blade.shape?.bodyTaperMidWidth ?? profile?.shape?.bodyTaperMidWidth ?? preset.bodyTaperMidWidth,
    shoulder: blade.shape?.tipShoulderRound ?? profile?.shape?.tipShoulderRound ?? preset.tipShoulderRound,
    singleEdged,
    swell: singleEdged ? profile?.swell ?? preset.swell : 0,
    clipT: singleEdged ? profile?.clip ?? preset.clipT : 1,
    ricasso: cover ? { t: ricassoT, cover, hooks: profile?.ricasso?.hooks ?? 'lugs' } : null,
    flame: !!blade.flame,
  };
}

export function bladeSpec(config: SwordConfig): BladeSpec {
  const profiles = BLADE_PROFILES[config.archetype] ?? [];
  const profile = profiles.find((p) => p.id === config.blade.profile) ?? profiles[0];
  return build(config.archetype, profile, config.blade);
}

/** A profile as drawn on its card: the profile's own section, ricasso and shape, nothing chosen on top. */
export const profileSpec = (archetype: ArchetypeKey, profile: BladeProfile) =>
  build(archetype, profile, { length: profile.length, width: profile.width, fuller: profile.fuller, shape: profile.shape });

const smooth = (a: number, b: number, x: number) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

// The double-edged taper: straight to taperEnd, then to the point, with an optional rounded shoulder.
function taper(s: BladeSpec, t: number) {
  const hw = s.halfWidth, body = hw * (1 - (t / s.taperEnd) * (1 - s.midWidth));
  const tip = hw * s.midWidth * (1 - (t - s.taperEnd) / (1 - s.taperEnd));
  if (s.shoulder <= 0) return t <= s.taperEnd ? body : tip;
  const d = (t - s.taperEnd) / s.shoulder;
  if (d <= -1) return body;
  if (d >= 1) return tip;
  const k = smooth(-1, 1, d);
  return body * (1 - k) + tip * k;
}

/**
 * Half-widths at t (0 = hilt, 1 = point): toward the back/right (`spine`) and toward the edge/left (`edge`),
 * and how far into the ricasso t is (1 = fully, for blunting the edges there).
 */
export function halfWidths(s: BladeSpec, t: number): { spine: number; edge: number; ricasso: number } {
  let spine: number, edge: number;
  if (s.singleEdged) {
    const hw = s.halfWidth, peak = Math.min(s.clipT, 0.92);
    // The back runs straight, then drops to the point; the edge swells toward the clip and sweeps up to meet it.
    spine = t < s.clipT ? hw : hw * (1 - (t - s.clipT) / (1 - s.clipT));
    const top = hw * (1 + s.swell);
    edge = t <= peak ? hw + (top - hw) * Math.sin((Math.PI / 2) * (t / peak)) : top * Math.sqrt(Math.max(0, 1 - ((t - peak) / (1 - peak)) ** 2));
  } else spine = edge = taper(s, t);
  let ricasso = 0;
  if (s.ricasso) {
    ricasso = 1 - smooth(s.ricasso.t, s.ricasso.t + RICASSO_STEP, t);
    const r = s.halfWidth * RICASSO_WIDTH;
    spine += (r - spine) * ricasso; edge += (r - edge) * ricasso;
  }
  return { spine, edge, ricasso };
}

/**
 * The flamboyant edge: a sideways wave at t, from below the hooks to near the point. It is applied in full at
 * the edges and fades to nothing at the ridge, so the edges snake while the middle of the blade runs straight.
 */
export function flameOffset(s: BladeSpec, t: number): number {
  if (!s.flame) return 0;
  const start = (s.ricasso ? s.ricasso.t + 0.05 : 0.06), span = FLAME.end - start;
  if (t <= start || t >= FLAME.end) return 0;
  const u = (t - start) / span, fade = smooth(0, 0.06, u) * (1 - smooth(0.85, 1, u));
  const waves = Math.max(4, Math.round((span * s.length) / FLAME.wavelength));
  return s.halfWidth * FLAME.amp * Math.sin(u * waves * Math.PI * 2) * fade;
}

export const RICASSO = { width: RICASSO_WIDTH };
