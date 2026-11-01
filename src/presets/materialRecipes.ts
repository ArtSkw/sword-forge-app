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
    pristine: '#DADEE2',
    used: '#CBD0D3',
    battleWorn: '#A9A8A2',
    ancient: '#7C756B',
  },
  satin: {
    pristine: '#A2A9AB',
    used: '#9AA0A2',
    battleWorn: '#8E8D88',
    ancient: '#777064',
  },
  patternWelded: {
    pristine: '#BFC7C8',
    used: '#B4BBBC',
    battleWorn: '#9C9B95',
    ancient: '#7B7469',
  },
};

const HARDWARE_COLORS: Record<HardwareTone, Record<SwordCondition, string>> = {
  steel: {
    pristine: '#C8CCD0',
    used: '#BCC0C2',
    battleWorn: '#9C9C97',
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
  pristine: 0.34,
  used: 0.36,
  battleWorn: 0.39,
  ancient: 0.58,
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

// Age darkens and varies steel, it does not blur it: a rough metal in a bright studio reads milky white.
// Roughness stays close to the finish's own until rust takes over; the tarnish and wear live in the shader.
const BLADE_PHYSICAL_BY_CONDITION: Record<SwordCondition, BladePhysicalRecipe> = {
  pristine: { roughness: 0.14, clearcoat: 0.50, clearcoatRoughness: 0.10, anisotropy: 0.60 },
  used: { roughness: 0.16, clearcoat: 0.40, clearcoatRoughness: 0.12, anisotropy: 0.56 },
  battleWorn: { roughness: 0.19, clearcoat: 0.30, clearcoatRoughness: 0.14, anisotropy: 0.52 },
  ancient: { roughness: 0.38, clearcoat: 0.05, clearcoatRoughness: 0.30, anisotropy: 0.30 },
};

const STEEL_FINISH_PHYSICAL_MODIFIERS: Record<SteelFinish, BladePhysicalModifier> = {
  // Mirror polish against a brushed grey: the two must read apart at a glance.
  polished: { roughness: -0.1, clearcoat: 0.08, clearcoatRoughness: -0.04, anisotropy: -0.3 },
  satin: { roughness: 0.14, clearcoat: -0.3, clearcoatRoughness: 0.08, anisotropy: 0.25 },
  patternWelded: { roughness: 0.02, clearcoat: -0.02, clearcoatRoughness: 0.03, anisotropy: 0.02 },
};

const STOPS: SwordCondition[] = ['pristine', 'used', 'battleWorn', 'ancient'];
/** Reads a four-stop table at a continuous age (0–1). */
function atAge(table: Record<SwordCondition, number>, age: number): number {
  const x = clamp(age, 0, 1) * 3, i = Math.min(2, Math.floor(x)), k = x - i;
  return table[STOPS[i]] * (1 - k) + table[STOPS[i + 1]] * k;
}
function hexAtAge(table: Record<SwordCondition, string>, age: number): string {
  const x = clamp(age, 0, 1) * 3, i = Math.min(2, Math.floor(x)), k = x - i;
  const a = parseInt(table[STOPS[i]].slice(1), 16), b = parseInt(table[STOPS[i + 1]].slice(1), 16);
  const ch = (sh: number) => Math.round(((a >> sh) & 255) * (1 - k) + ((b >> sh) & 255) * k);
  return `#${((1 << 24) + (ch(16) << 16) + (ch(8) << 8) + ch(0)).toString(16).slice(1)}`;
}
const pick = <K extends keyof BladePhysicalRecipe>(key: K) =>
  Object.fromEntries(STOPS.map((c) => [c, BLADE_PHYSICAL_BY_CONDITION[c][key]])) as Record<SwordCondition, number>;

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

export function getBladePhysicalRecipe(age: number, steelFinish: SteelFinish): BladePhysicalRecipe {
  const base = { roughness: atAge(pick('roughness'), age), clearcoat: atAge(pick('clearcoat'), age), clearcoatRoughness: atAge(pick('clearcoatRoughness'), age), anisotropy: atAge(pick('anisotropy'), age) };
  const modifier = STEEL_FINISH_PHYSICAL_MODIFIERS[steelFinish];

  return {
    roughness: clamp(base.roughness + (modifier.roughness ?? 0), 0.05, 0.82),
    // Floors above zero: a feature reaching 0 mid-scrub would recompile the material (a visible hitch).
    clearcoat: clamp(base.clearcoat + (modifier.clearcoat ?? 0), 0.001, 0.72),
    clearcoatRoughness: clamp(base.clearcoatRoughness + (modifier.clearcoatRoughness ?? 0), 0.05, 0.55),
    anisotropy: clamp(base.anisotropy + (modifier.anisotropy ?? 0), 0.001, 0.9),
  };
}

export function getSwordMaterialRecipes(finish: SwordConfig['finish'], woodTint?: string): SwordMaterialRecipes {
  const { age, steelFinish, hardwareTone, gripColor, gripMaterial } = finish;
  const gripRecipe = GRIP_MATERIAL_RECIPES[gripMaterial];

  return {
    blade: {
      color: hexAtAge(BLADE_COLORS[steelFinish], age),
    },
    hardware: {
      color: hexAtAge(HARDWARE_COLORS[hardwareTone], age),
      emissive: HARDWARE_EMISSIVE[hardwareTone],
      emissiveIntensity: HARDWARE_EMISSIVE_INTENSITY[hardwareTone],
      roughness: atAge(HARDWARE_ROUGHNESS, age),
    },
    grip: {
      material: gripMaterial,
      // Wood shows its own grain (a white tint that darkens with age); leather and cord take the dye.
      // A Form may give its wood a colour of its own (the Milanese court sword's black horn).
      color: gripMaterial === 'wood' ? shadeHex(woodTint ?? '#c9ab8a', atAge(GRIP_FINISH_SHADE, age)) : shadeHex(gripColor, atAge(GRIP_FINISH_SHADE, age) * gripRecipe.colorFactor),
      metalness: gripRecipe.metalness,
      roughness: clamp(atAge(GRIP_ROUGHNESS, age) + gripRecipe.roughnessOffset, 0.18, 0.98),
      normalScale: gripRecipe.normalScale,
    },
  };
}
