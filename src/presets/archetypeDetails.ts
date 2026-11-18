import type { ArchetypeKey, GripLength } from '../store/configStore';
import { guardHalfHeight, type GuardDef } from './guardShapes';

export type HiltDetailRecipe = {
  guardCollarRadiusTop: number;
  guardCollarRadiusBottom: number;
  guardCollarHeight: number;
  guardCollarScaleZ: number;
  topSpacerRadiusTop: number;
  topSpacerRadiusBottom: number;
  bottomSpacerRadiusTop: number;
  bottomSpacerRadiusBottom: number;
  spacerHeight: number;
  // The cross is forged in one piece with no central block on any guard (the guard*Collar* numbers go unused).
  blockless?: boolean;
};


export type GripDetailRecipe = {
  coreRadiusTop?: number;
  coreRadiusBottom?: number;
  bandCount?: Partial<Record<GripLength, number>>;
  bandTube?: number;
  // Width of the grip in the blade's plane over its thickness: Viking grips were oval, broader across.
  sectionX?: number;
};

export const HILT_DETAIL_RECIPES: Record<ArchetypeKey, HiltDetailRecipe> = {
  armingSword: {
    guardCollarRadiusTop: 0.018,
    guardCollarRadiusBottom: 0.020,
    guardCollarHeight: 0.010,
    guardCollarScaleZ: 0.72,
    topSpacerRadiusTop: 0.015,
    topSpacerRadiusBottom: 0.016,
    bottomSpacerRadiusTop: 0.0155,
    bottomSpacerRadiusBottom: 0.0165,
    spacerHeight: 0.006,
  },
  longsword: {
    guardCollarRadiusTop: 0.019,
    guardCollarRadiusBottom: 0.021,
    guardCollarHeight: 0.012,
    guardCollarScaleZ: 0.74,
    topSpacerRadiusTop: 0.015,
    topSpacerRadiusBottom: 0.0165,
    bottomSpacerRadiusTop: 0.0155,
    bottomSpacerRadiusBottom: 0.0175,
    spacerHeight: 0.0065,
  },
  bastardSword: {
    guardCollarRadiusTop: 0.018,
    guardCollarRadiusBottom: 0.020,
    guardCollarHeight: 0.010,
    guardCollarScaleZ: 0.72,
    topSpacerRadiusTop: 0.0135,
    topSpacerRadiusBottom: 0.015,
    bottomSpacerRadiusTop: 0.0145,
    bottomSpacerRadiusBottom: 0.016,
    spacerHeight: 0.006,
  },
  vikingSword: {
    // Viking crosses are one forged bar (Petersen), the knightly long cross on a late blade too: a block sized for
    // the heavy Viking guards sat on the slim long cross as a second, overlapping bar.
    blockless: true,
    guardCollarRadiusTop: 0.022,
    guardCollarRadiusBottom: 0.024,
    guardCollarHeight: 0.014,
    guardCollarScaleZ: 0.62,
    topSpacerRadiusTop: 0.0185,
    topSpacerRadiusBottom: 0.017,
    bottomSpacerRadiusTop: 0.0165,
    bottomSpacerRadiusBottom: 0.0185,
    spacerHeight: 0.008,
  },
  falchion: {
    guardCollarRadiusTop: 0.0185,
    guardCollarRadiusBottom: 0.0205,
    guardCollarHeight: 0.010,
    guardCollarScaleZ: 0.68,
    topSpacerRadiusTop: 0.0145,
    topSpacerRadiusBottom: 0.016,
    bottomSpacerRadiusTop: 0.015,
    bottomSpacerRadiusBottom: 0.0165,
    spacerHeight: 0.006,
  },
  estoc: {
    guardCollarRadiusTop: 0.013,
    guardCollarRadiusBottom: 0.015,
    guardCollarHeight: 0.0085,
    guardCollarScaleZ: 0.68,
    topSpacerRadiusTop: 0.0115,
    topSpacerRadiusBottom: 0.0128,
    bottomSpacerRadiusTop: 0.012,
    bottomSpacerRadiusBottom: 0.0135,
    spacerHeight: 0.005,
  },
  greatsword: {
    guardCollarRadiusTop: 0.024,
    guardCollarRadiusBottom: 0.027,
    guardCollarHeight: 0.014,
    guardCollarScaleZ: 0.78,
    topSpacerRadiusTop: 0.017,
    topSpacerRadiusBottom: 0.019,
    bottomSpacerRadiusTop: 0.018,
    bottomSpacerRadiusBottom: 0.020,
    spacerHeight: 0.008,
  },
};



/** Half the height of the turned ferrule at each end of the grip. */
export const ferruleHalfHeight = (archetype: ArchetypeKey) => HILT_DETAIL_RECIPES[archetype].spacerHeight * 0.7;

// The guard's central block (a short chamfered barrel where the cross sits on the blade) only reads as a
// block where it stands well proud of the cross: on a slim bar it is a clear boss on each face. On a heavy
// guard nearly as deep as the block (the Viking guards' elliptical bars, a centre swollen over a very thick
// blade) it would break through the domed faces as thin crescents, so there the guard itself is the block and
// none is drawn. Where the arms climb steeply out of the centre (the Highland cross's straight, forward-sloping
// quillons), they would leave the block through its bottom face at a grazing angle, cutting thin slivers off
// it: there the block reaches down past the cross's lowest point, so the arms leave through its wall and top.
const BLOCK_PROUD = 1.35;   // the block must be this many times deeper than the cross's centre section
const BLOCK_RISE = 0.6;     // arms climbing more than this share of the block's half-height across it are steep

export type GuardBlock = { radius: number; flatten: number; halfHeight: number; bottom: number; shown: boolean; faceZ: number };

/** The central block for this sword type on this guard, and the depth of the face the side rings sit on. */
export function guardBlock(archetype: ArchetypeKey, guard: Pick<GuardDef, 'secY' | 'secZ' | 'swell' | 'tipY' | 'width' | 'linear' | 'blockless'>): GuardBlock {
  const r = HILT_DETAIL_RECIPES[archetype];
  const radius = (r.guardCollarRadiusTop + r.guardCollarRadiusBottom) / 2, halfHeight = r.guardCollarHeight * 0.36;
  const centre = guard.secZ + (guard.swell ?? 0), u = Math.min(1, radius / (guard.width / 2));
  const rise = guard.tipY * (guard.linear ? u : u * u);   // the arm's climb at the block's rim (Crossguard's bendAt)
  const bottom = rise > halfHeight * BLOCK_RISE ? Math.max(halfHeight, guardHalfHeight(guard) + 0.0003) : halfHeight;
  // A centre swollen over a thick blade keeps its block, rounder (up to a round barrel) to stay proud of it.
  let flatten = r.guardCollarScaleZ;
  if (guard.swell && radius * flatten < centre * BLOCK_PROUD) flatten = Math.min(1, (centre * BLOCK_PROUD) / radius);
  const depth = radius * flatten, shown = !r.blockless && !guard.blockless && depth >= centre * BLOCK_PROUD - 1e-9;
  return { radius, flatten, halfHeight, bottom, shown, faceZ: shown ? depth : centre };
}

export const GRIP_DETAIL_RECIPES: Record<ArchetypeKey, GripDetailRecipe> = {
  armingSword: {
    bandCount: { short: 9, long: 14 },
    bandTube: 0.0007,
  },
  longsword: {
    coreRadiusTop: 0.0115,
    coreRadiusBottom: 0.013,
    bandCount: { short: 10, long: 15 },
    bandTube: 0.0007,
  },
  bastardSword: {
    coreRadiusTop: 0.0105,
    coreRadiusBottom: 0.0125,
    bandCount: { short: 8, long: 11 },
    bandTube: 0.00065,
  },
  vikingSword: {
    coreRadiusTop: 0.013,
    coreRadiusBottom: 0.0135,
    sectionX: 1.22,   // ~3.2 cm across in the blade's plane, ~2.7 cm thick (a broad Viking blade is ~5.5 cm)
    bandCount: { short: 12, long: 18 },
    bandTube: 0.00075,
  },
  falchion: {
    coreRadiusTop: 0.0105,
    coreRadiusBottom: 0.0125,
    bandCount: { short: 10, long: 14 },
    bandTube: 0.00072,
  },
  estoc: {
    coreRadiusTop: 0.0105,
    coreRadiusBottom: 0.0128,
    bandCount: { short: 5, long: 7 },
    bandTube: 0.00058,
  },
  greatsword: {
    coreRadiusTop: 0.012,
    coreRadiusBottom: 0.014,
    bandCount: { short: 11, long: 16 },
    bandTube: 0.00078,
  },
};

export function getGripDetailRecipe(archetype: ArchetypeKey): GripDetailRecipe {
  return GRIP_DETAIL_RECIPES[archetype];
}
