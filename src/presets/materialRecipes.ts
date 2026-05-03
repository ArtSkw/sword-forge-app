import type { GripMaterial, HardwareTone, SteelFinish, SwordCondition, SwordConfig } from '../store/configStore';

type BladePhysicalRecipe = {
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  anisotropy: number;
};

type BladePhysicalModifier = Partial<BladePhysicalRecipe>;

export type SwordMaterialRecipes = {
  blade: {
    color: string;
  };
  hardware: {
    color: string;
    emissive: string;
    emissiveIntensity: number;
    roughness: number;
  };
  grip: {
    material: GripMaterial;
    color: string;
    metalness: number;
    roughness: number;
    normalScale: [number, number];
  };
};

const BLADE_COLORS: Record<SteelFinish, Record<SwordCondition, string>> = {
  polished: {
    pristine: '#C8CCD0',
    used: '#AEB5B7',
    battleWorn: '#8A908C',
    ancient: '#7C756B',
  },
  satin: {
    pristine: '#B8C0C2',
    used: '#A4ABAC',
    battleWorn: '#858B87',
    ancient: '#777064',
  },
  darkened: {
    pristine: '#6A6660',
    used: '#5C5A56',
    battleWorn: '#4A4A46',
    ancient: '#403B35',
  },
  patternWelded: {
    pristine: '#BFC7C8',
    used: '#AAB2B2',
    battleWorn: '#8B918D',
    ancient: '#7B7469',
  },
};

const HARDWARE_COLORS: Record<HardwareTone, Record<SwordCondition, string>> = {
  steel: {
    pristine: '#C8CCD0',
    used: '#AEB2B1',
    battleWorn: '#868B86',
    ancient: '#756E64',
  },
  brass: {
    pristine: '#B8925A',
    used: '#A27D4D',
    battleWorn: '#80633E',
    ancient: '#695136',
  },
  bronze: {
    pristine: '#9B6A35',
    used: '#865B30',
    battleWorn: '#6F4A2B',
    ancient: '#5A3D27',
  },
  darkIron: {
    pristine: '#585450',
    used: '#4C4A46',
    battleWorn: '#3C3B38',
    ancient: '#322E29',
  },
};

const HARDWARE_ROUGHNESS: Record<SwordCondition, number> = {
  pristine: 0.36,
  used: 0.45,
  battleWorn: 0.56,
  ancient: 0.68,
};

const HARDWARE_EMISSIVE: Record<HardwareTone, string> = {
  steel: '#000000',
  brass: '#B8925A',
  bronze: '#9B6A35',
  darkIron: '#000000',
};

const HARDWARE_EMISSIVE_INTENSITY: Record<HardwareTone, number> = {
  steel: 0,
  brass: 0.05,
  bronze: 0.035,
  darkIron: 0,
};

const GRIP_ROUGHNESS: Record<SwordCondition, number> = {
  pristine: 0.84,
  used: 0.88,
  battleWorn: 0.92,
  ancient: 0.96,
};

const GRIP_MATERIAL_RECIPES: Record<GripMaterial, {
  colorFactor: number;
  metalness: number;
  roughnessOffset: number;
  normalScale: [number, number];
}> = {
  leather: {
    colorFactor: 1.0,
    metalness: 0,
    roughnessOffset: 0,
    normalScale: [0.030, 0.050],
  },
  wood: {
    colorFactor: 1.08,
    metalness: 0,
    roughnessOffset: -0.06,
    normalScale: [0.022, 0.035],
  },
  cord: {
    colorFactor: 0.92,
    metalness: 0,
    roughnessOffset: 0.05,
    normalScale: [0.045, 0.070],
  },
  wire: {
    colorFactor: 1.28,
    metalness: 0.72,
    roughnessOffset: -0.36,
    normalScale: [0.012, 0.018],
  },
};

const GRIP_FINISH_SHADE: Record<SwordCondition, number> = {
  pristine: 1.00,
  used: 0.88,
  battleWorn: 0.72,
  ancient: 0.58,
};

const BLADE_PHYSICAL_BY_CONDITION: Record<SwordCondition, BladePhysicalRecipe> = {
  pristine: { roughness: 0.16, clearcoat: 0.50, clearcoatRoughness: 0.10, anisotropy: 0.60 },
  used: { roughness: 0.28, clearcoat: 0.30, clearcoatRoughness: 0.16, anisotropy: 0.50 },
  battleWorn: { roughness: 0.42, clearcoat: 0.16, clearcoatRoughness: 0.24, anisotropy: 0.40 },
  ancient: { roughness: 0.56, clearcoat: 0.04, clearcoatRoughness: 0.36, anisotropy: 0.28 },
};

const STEEL_FINISH_PHYSICAL_MODIFIERS: Record<SteelFinish, BladePhysicalModifier> = {
  polished: { roughness: -0.03, clearcoat: 0.08, clearcoatRoughness: -0.02, anisotropy: 0.06 },
  satin: { roughness: 0.04, clearcoat: -0.04, clearcoatRoughness: 0.04, anisotropy: -0.02 },
  darkened: { roughness: 0.10, clearcoat: -0.12, clearcoatRoughness: 0.08, anisotropy: -0.08 },
  patternWelded: { roughness: 0.02, clearcoat: -0.02, clearcoatRoughness: 0.03, anisotropy: 0.02 },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function shadeHex(hex: string, factor: number): string {
  const raw = hex.replace('#', '');
  const n = parseInt(raw, 16);
  const r = clamp(Math.round(((n >> 16) & 255) * factor), 0, 255);
  const g = clamp(Math.round(((n >> 8) & 255) * factor), 0, 255);
  const b = clamp(Math.round((n & 255) * factor), 0, 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function getBladePhysicalRecipe(condition: SwordCondition, steelFinish: SteelFinish): BladePhysicalRecipe {
  const base = BLADE_PHYSICAL_BY_CONDITION[condition];
  const modifier = STEEL_FINISH_PHYSICAL_MODIFIERS[steelFinish];

  return {
    roughness: clamp(base.roughness + (modifier.roughness ?? 0), 0.08, 0.82),
    clearcoat: clamp(base.clearcoat + (modifier.clearcoat ?? 0), 0, 0.72),
    clearcoatRoughness: clamp(base.clearcoatRoughness + (modifier.clearcoatRoughness ?? 0), 0.05, 0.55),
    anisotropy: clamp(base.anisotropy + (modifier.anisotropy ?? 0), 0.12, 0.78),
  };
}

export function getSwordMaterialRecipes(finish: SwordConfig['finish']): SwordMaterialRecipes {
  const { condition, steelFinish, hardwareTone, gripColor, gripMaterial } = finish;
  const gripRecipe = GRIP_MATERIAL_RECIPES[gripMaterial];

  return {
    blade: {
      color: BLADE_COLORS[steelFinish][condition],
    },
    hardware: {
      color: HARDWARE_COLORS[hardwareTone][condition],
      emissive: HARDWARE_EMISSIVE[hardwareTone],
      emissiveIntensity: HARDWARE_EMISSIVE_INTENSITY[hardwareTone],
      roughness: HARDWARE_ROUGHNESS[condition],
    },
    grip: {
      material: gripMaterial,
      color: shadeHex(gripColor, GRIP_FINISH_SHADE[condition] * gripRecipe.colorFactor),
      metalness: gripRecipe.metalness,
      roughness: clamp(GRIP_ROUGHNESS[condition] + gripRecipe.roughnessOffset, 0.18, 0.98),
      normalScale: gripRecipe.normalScale,
    },
  };
}
