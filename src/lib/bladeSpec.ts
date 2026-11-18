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
  // A back that runs straight to the point (see singleEdged): widest width and the section's back half (m), and that
  // half at the hilt (the groove, at a fixed place in it, runs out from the back along the blade).
  backPoint?: { widest: number; back: number; backHilt: number };
  grooveAt?: number;            // where the groove lies across the section (−1…1), when placed by measure
  ricasso: { t: number; cover: RicassoCover; hooks: 'lugs' | 'crescent' } | null;
  flame: boolean;
};

function build(archetype: ArchetypeKey, profile: BladeProfile | undefined, blade: Partial<SwordConfig['blade']> & Pick<SwordConfig['blade'], 'length' | 'width' | 'fuller'>): BladeSpec {
  const preset = SWORD_TYPES[archetype];
  // A profile's measured size wins over the length/width classes (which remain for older saved configs).
  const length = profile?.cm ? profile.cm / 100 : BLADE_LENGTHS[blade.length];
  const halfWidth = profile?.widthCm ? profile.widthCm / 200 : BLADE_HALF_WIDTHS[blade.width];
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
    ...(singleEdged && profile?.backPoint ? {
      backPoint: {
        widest: profile.backPoint.widestCm / 100, back: profile.backPoint.backCm / 100,
        backHilt: (profile.backPoint.backCm * (profile.backPoint.grooveHiltCm ?? profile.backPoint.grooveCm)) / profile.backPoint.grooveCm / 100,
      },
      grooveAt: 1 - profile.backPoint.grooveCm / profile.backPoint.backCm,
    } : {}),
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

// Polished steel shows every break in the curvature of an outline as a kink in its reflections, so corners
// in the outline are rounded by easing the slope (not the width) from one line to the next: the curvature
// rises and falls to nothing, the outline stays convex and the lines meet where the sharp corner would.
// The corner at tc (value vc) between slopes s0 and s1, rounded over tc ± r.
const MIN_ROUND = 0.025;   // even a "sharp" shoulder is ground round over a couple of centimetres
function corner(t: number, tc: number, vc: number, s0: number, s1: number, r: number): number {
  const d = t - tc;
  if (r <= 0 || d >= r) return vc + (d < 0 ? s0 : s1) * d;
  if (d <= -r) return vc + s0 * d;
  const u = (d + r) / (2 * r), area = u ** 4 * (2.5 + u * (u - 3));   // ∫ smootherstep from 0 to u
  return vc + s0 * d + (s1 - s0) * 2 * r * area;
}

// The double-edged taper: straight to taperEnd, then straight to the point, the shoulder between rounded.
function taper(s: BladeSpec, t: number) {
  const hw = s.halfWidth, te = s.taperEnd, mid = hw * s.midWidth;
  const r = Math.min(Math.max(s.shoulder, MIN_ROUND), 0.9 * (1 - te), 0.5 * te);
  return Math.max(0, corner(t, te, mid, -(hw - mid) / te, -mid / (1 - te), r));
}

// Single-edged blades. The back runs straight and turns down at the clip (rounded like a shoulder); the edge
// swells to the clip, then sweeps up to meet the back in a point. The sweep, top·(1 − g(u)), starts with the
// swell's own curvature (the a·u² part) and reaches the point at a finite angle, so the tip is a point.
const CLIP_ROUND = 0.04, SWEEP = 2.6, BACK_POINT_ROUND = 0.06, GROOVE_SETTLE = 0.45;
// A back that runs straight to the point (the Conyers cleaver: Hodges 1892, pl. XX, and the Durham photograph): the
// width W grows in a nearly straight line from the root to its widest at `clipT`, rounded over BACK_POINT_ROUND into
// the end, which curves round in one convex sweep, W·(1 − u^SWEEP), to a point on the back's line. The section
// keeps its own back half (the groove sits at a fixed place in it; the half grows from backHilt to back by
// GROOVE_SETTLE, so the groove runs out from the back as on the original) as long as the edge side is at least a fifth
// of the width; the section is moved across (`shift`) so the back stays on one straight line, centred on the tang at
// the root.
function backPointEdged(s: BladeSpec & { backPoint: { widest: number; back: number; backHilt: number } }, t: number) {
  const hw = s.halfWidth, W0 = 2 * hw, Wm = s.backPoint.widest, peak = Math.min(s.clipT, 0.92);
  const S = s.backPoint.backHilt + (s.backPoint.back - s.backPoint.backHilt) * Math.min(1, t / GROOVE_SETTLE);
  const u = Math.max(0, (t - peak) / (1 - peak));
  const W = Math.max(0, corner(t, peak, Wm, (Wm - W0) / peak, 0, Math.min(BACK_POINT_ROUND, 0.45 * (1 - peak))) * (1 - Math.min(1, u) ** SWEEP));
  const edge = Math.max(W - S, 0.18 * W), spine = W - edge;
  return { spine, edge, shift: hw - spine };
}

function singleEdged(s: BladeSpec, t: number): { spine: number; edge: number; shift?: number } {
  if (s.backPoint) return backPointEdged(s as BladeSpec & { backPoint: { widest: number; back: number; backHilt: number } }, t);
  const hw = s.halfWidth, clip = s.clipT, peak = Math.min(clip, 0.92), top = hw * (1 + s.swell);
  const spine = Math.max(0, corner(t, clip, hw, 0, -hw / (1 - clip), Math.min(CLIP_ROUND, 0.45 * (1 - clip))));
  if (t <= peak) return { spine, edge: hw + (top - hw) * Math.sin((Math.PI / 2) * (t / peak)) };
  const a = Math.min(1, ((top - hw) * (Math.PI / (2 * peak)) ** 2 * (1 - peak) ** 2) / (2 * top));
  const u = Math.min(1, (t - peak) / (1 - peak));
  return { spine, edge: top * (1 - a * u * u - (1 - a) * u ** SWEEP) };
}

/**
 * Half-widths at t (0 = hilt, 1 = point): toward the back/right (`spine`) and toward the edge/left (`edge`),
 * how far into the ricasso t is (1 = fully, for blunting the edges there), and how far the section's centre lies
 * off the tang's line toward the back (`shift`, m; 0 but on a back-pointed blade).
 */
export function halfWidths(s: BladeSpec, t: number): { spine: number; edge: number; ricasso: number; shift: number } {
  let spine: number, edge: number, shift = 0;
  if (s.singleEdged) ({ spine, edge, shift = 0 } = singleEdged(s, t));
  else spine = edge = taper(s, t);
  let ricasso = 0;
  if (s.ricasso) {
    ricasso = 1 - smooth(s.ricasso.t, s.ricasso.t + RICASSO_STEP, t);
    const r = s.halfWidth * RICASSO_WIDTH;
    spine += (r - spine) * ricasso; edge += (r - edge) * ricasso;
  }
  return { spine, edge, ricasso, shift };
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
