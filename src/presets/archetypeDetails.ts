import type { ArchetypeKey, GripLength, GuardStyle } from '../store/configStore';

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

export type GuardTerminalRecipe = {
  kind: 'none' | 'rounded' | 'disc';
  radius?: number;
  scaleX?: number;
  scaleY?: number;
  depth?: number;
};

export type GripDetailRecipe = {
  coreRadiusTop?: number;
  coreRadiusBottom?: number;
  bandCount?: Partial<Record<GripLength, number>>;
  bandTube?: number;
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

const DEFAULT_TERMINALS: Partial<Record<GuardStyle, GuardTerminalRecipe>> = {
  straight: { kind: 'none' },
  curved: { kind: 'none' },
  ornate: { kind: 'none' },
  fantasy: { kind: 'rounded', radius: 0.015, scaleX: 0.72, scaleY: 1.08 },
};

export const GUARD_TERMINAL_RECIPES: Record<ArchetypeKey, Partial<Record<GuardStyle, GuardTerminalRecipe>>> = {
  armingSword: {
    ...DEFAULT_TERMINALS,
  },
  longsword: {
    ...DEFAULT_TERMINALS,
  },
  bastardSword: {
    ...DEFAULT_TERMINALS,
    curved: { kind: 'rounded', radius: 0.009, scaleX: 0.64, scaleY: 0.72 },
  },
  vikingSword: {
    ...DEFAULT_TERMINALS,
    straight: { kind: 'disc', radius: 0.010, depth: 0.004, scaleY: 0.76 },
  },
  falchion: {
    ...DEFAULT_TERMINALS,
    curved: { kind: 'rounded', radius: 0.009, scaleX: 0.55, scaleY: 0.72 },
  },
  estoc: {
    ...DEFAULT_TERMINALS,
    straight: { kind: 'rounded', radius: 0.0068, scaleX: 0.82, scaleY: 0.82 },
  },
  greatsword: {
    ...DEFAULT_TERMINALS,
    curved: { kind: 'rounded', radius: 0.013, scaleX: 0.66, scaleY: 0.82 },
  },
};

export function getGuardTerminalRecipe(archetype: ArchetypeKey, style: GuardStyle): GuardTerminalRecipe {
  return GUARD_TERMINAL_RECIPES[archetype][style] ?? DEFAULT_TERMINALS[style] ?? { kind: 'none' };
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
