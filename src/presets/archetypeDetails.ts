import type { ArchetypeKey, GripLength, GuardStyle, PommelStyle } from '../store/configStore';

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
  decorativeBands?: Array<{
    anchor: 'guardCollar' | 'topSpacer' | 'bottomSpacer';
    radius: number;
    tube: number;
    offsetY?: number;
  }>;
  parryingLugs?: {
    offsetY: number;
    length: number;
    baseRadius: number;
    tipRadius: number;
  };
};

export type GuardTerminalRecipe = {
  kind: 'none' | 'rounded' | 'disc';
  radius?: number;
  scaleX?: number;
  scaleY?: number;
  depth?: number;
};

export type PommelDetailRecipe = {
  cap?: {
    radiusTop: number;
    radiusBottom: number;
    height: number;
    offsetY?: number;
  };
  equatorRing?: {
    radius: number;
    tube: number;
  };
  flutes?: {
    count: number;
    radius: number;
    tube: number;
    height: number;
    offsetY?: number;
  };
};

export type GripDetailRecipe = {
  wrap: 'crossCord' | 'bands' | 'wire';
  coreRadiusTop?: number;
  coreRadiusBottom?: number;
  bandCount?: Partial<Record<GripLength, number>>;
  bandTube?: number;
  wireColor?: string;
  wireMetalness?: number;
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
    decorativeBands: [
      { anchor: 'topSpacer', radius: 0.0157, tube: 0.00045 },
      { anchor: 'bottomSpacer', radius: 0.0167, tube: 0.00045 },
    ],
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
    decorativeBands: [
      { anchor: 'guardCollar', radius: 0.0255, tube: 0.00065, offsetY: -0.003 },
      { anchor: 'guardCollar', radius: 0.0255, tube: 0.00065, offsetY: 0.003 },
      { anchor: 'topSpacer', radius: 0.0195, tube: 0.00055 },
      { anchor: 'bottomSpacer', radius: 0.0205, tube: 0.00055 },
    ],
    parryingLugs: {
      offsetY: 0.068,
      length: 0.060,
      baseRadius: 0.0065,
      tipRadius: 0.0018,
    },
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

export const POMMEL_DETAIL_RECIPES: Record<ArchetypeKey, Partial<Record<PommelStyle, PommelDetailRecipe>>> = {
  armingSword: {
    wheel: {
      cap: { radiusTop: 0.006, radiusBottom: 0.0085, height: 0.0022, offsetY: -0.0004 },
    },
  },
  longsword: {
    wheel: {
      cap: { radiusTop: 0.0055, radiusBottom: 0.008, height: 0.002, offsetY: -0.0004 },
    },
    scentStopper: {
      cap: { radiusTop: 0.005, radiusBottom: 0.0075, height: 0.0021, offsetY: -0.00045 },
    },
  },
  bastardSword: {
    scentStopper: {
      cap: { radiusTop: 0.005, radiusBottom: 0.0075, height: 0.002, offsetY: -0.0005 },
    },
    fishtail: {
      cap: { radiusTop: 0.0055, radiusBottom: 0.0085, height: 0.0022, offsetY: -0.0005 },
      flutes: { count: 12, radius: 0.024, tube: 0.00045, height: 0.029, offsetY: -0.004 },
    },
  },
  vikingSword: {
    brazilNut: {
      cap: { radiusTop: 0.0075, radiusBottom: 0.0105, height: 0.0025, offsetY: -0.0006 },
      equatorRing: { radius: 0.0335, tube: 0.0007 },
    },
  },
  falchion: {
    disc: {
      cap: { radiusTop: 0.0065, radiusBottom: 0.009, height: 0.002, offsetY: -0.0004 },
      equatorRing: { radius: 0.0265, tube: 0.00055 },
    },
  },
  estoc: {
    wheel: {
      cap: { radiusTop: 0.0045, radiusBottom: 0.0065, height: 0.0018, offsetY: -0.0003 },
      equatorRing: { radius: 0.026, tube: 0.0005 },
    },
  },
  greatsword: {
    fishtail: {
      cap: { radiusTop: 0.006, radiusBottom: 0.009, height: 0.0024, offsetY: -0.0005 },
      flutes: { count: 10, radius: 0.024, tube: 0.00042, height: 0.026, offsetY: -0.003 },
    },
  },
};

export function getPommelDetailRecipe(archetype: ArchetypeKey, style: PommelStyle): PommelDetailRecipe | null {
  return POMMEL_DETAIL_RECIPES[archetype][style] ?? null;
}

export const GRIP_DETAIL_RECIPES: Record<ArchetypeKey, GripDetailRecipe> = {
  armingSword: {
    wrap: 'bands',
    bandCount: { short: 9, long: 14 },
    bandTube: 0.0007,
  },
  longsword: {
    wrap: 'bands',
    coreRadiusTop: 0.0115,
    coreRadiusBottom: 0.013,
    bandCount: { short: 10, long: 15 },
    bandTube: 0.0007,
  },
  bastardSword: {
    wrap: 'bands',
    coreRadiusTop: 0.0105,
    coreRadiusBottom: 0.0125,
    bandCount: { short: 8, long: 11 },
    bandTube: 0.00065,
  },
  vikingSword: {
    wrap: 'bands',
    coreRadiusTop: 0.013,
    coreRadiusBottom: 0.0135,
    bandCount: { short: 12, long: 18 },
    bandTube: 0.00075,
  },
  falchion: {
    wrap: 'bands',
    coreRadiusTop: 0.0105,
    coreRadiusBottom: 0.0125,
    bandCount: { short: 10, long: 14 },
    bandTube: 0.00072,
  },
  estoc: {
    wrap: 'bands',
    coreRadiusTop: 0.0105,
    coreRadiusBottom: 0.0128,
    bandCount: { short: 5, long: 7 },
    bandTube: 0.00058,
  },
  greatsword: {
    wrap: 'bands',
    coreRadiusTop: 0.012,
    coreRadiusBottom: 0.014,
    bandCount: { short: 11, long: 16 },
    bandTube: 0.00078,
  },
};

export function getGripDetailRecipe(archetype: ArchetypeKey): GripDetailRecipe {
  return GRIP_DETAIL_RECIPES[archetype];
}
