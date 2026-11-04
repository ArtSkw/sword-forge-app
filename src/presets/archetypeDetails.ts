import type { ArchetypeKey, GripLength } from '../store/configStore';

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
