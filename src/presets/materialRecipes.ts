import type { ArchetypeKey, GripMaterial, HardwareTone, SteelFinish, SwordCondition, SwordConfig } from '../store/configStore';
import { bladeFinish, gripFinish, hiltFinish } from './finishCharacter';

type BladePhysicalRecipe = {
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  anisotropy: number;
};

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
  };
};

// Forge colours are set so the finish layer's brightest marks (+25 %) never clip; each type tints them.
const BLADE_COLORS: Record<SteelFinish, Record<SwordCondition, string>> = {
  polished: {
    pristine: '#C9CDD0',
    used: '#B4B8BB',
    battleWorn: '#A9A8A2',
    ancient: '#7C756B',
  },
  satin: {
    pristine: '#A7ACAE',
    used: '#9AA0A2',
    battleWorn: '#8E8D88',
    ancient: '#777064',
  },
  patternWelded: {
    pristine: '#B9BFC1',
    used: '#AEB4B6',
    battleWorn: '#9C9B95',
    ancient: '#7B7469',
  },
};

const HARDWARE_COLORS: Record<HardwareTone, Record<SwordCondition, string>> = {
  // Default steel fittings: darker and less even than the blade (decision 2026-11-10).
  steel: {
    pristine: '#B4B8BB',
    used: '#ACB0B2',
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
    pristine: '#955F31',   // darker and redder than brass
    used: '#865B30',
    battleWorn: '#6F4A2B',
    ancient: '#5A3D27',
  },
  gilt: {
    pristine: '#D9B866',
    used: '#CDAE62',
    battleWorn: '#B39657',
    ancient: '#8C7448',
  },
  // Heirloom stays near Carried: the shader's tarnish and patina darken it from there.
  darkIron: {
    pristine: '#585450',
    used: '#4C4A46',
    battleWorn: '#504E4A',
    ancient: '#322E29',
  },
};

// Fittings' roughness: the tone's and type's own at Forge (finishCharacter), then these changes with age.
const HARDWARE_ROUGHNESS_DELTA: Record<SwordCondition, number> = { pristine: 0, used: 0.02, battleWorn: 0.05, ancient: 0.24 };

const HARDWARE_EMISSIVE: Record<HardwareTone, string> = {
  steel: '#000000',
  brass: '#B8925A',
  bronze: '#9B6A35',
  darkIron: '#000000',
  gilt: '#C9A040',
};

const HARDWARE_EMISSIVE_INTENSITY: Record<HardwareTone, number> = {
  steel: 0,
  brass: 0.05,
  bronze: 0.035,
  darkIron: 0,
  gilt: 0.04,
};

// Grip roughness: the material's and type's own at Forge (finishCharacter), then with age: leather and cord gain
// a little sheen from the hand at Carried, then dry and dull (leather 0.58 → 0.50 → 0.70 → 0.90 on the arming sword).
const GRIP_ROUGHNESS_DELTA: Record<SwordCondition, number> = { pristine: 0, used: -0.03, battleWorn: 0.12, ancient: 0.32 };

const GRIP_MATERIAL_RECIPES: Record<GripMaterial, { colorFactor: number; metalness: number }> = {
  leather: { colorFactor: 1.0, metalness: 0 },
  wood: { colorFactor: 1.08, metalness: 0 },
  cord: { colorFactor: 0.92, metalness: 0 },
  wire: { colorFactor: 1.28, metalness: 0.72 },
};

const GRIP_FINISH_SHADE: Record<SwordCondition, number> = {
  pristine: 1.00,
  used: 0.88,
  battleWorn: 0.72,
  ancient: 0.58,
};
// Dyed leather and cord darken less than that by Heirloom (the shader's grime and patina darken them further), so
// the dyes stay apart on an old grip.
const DYE_SHADE: Record<SwordCondition, number> = { pristine: 1.00, used: 0.93, battleWorn: 0.84, ancient: 0.6 };

// Age darkens and varies steel, it does not blur it: a rough metal in a bright studio reads milky white.
// Roughness stays close to the finish's own until rust takes over; the tarnish and wear live in the shader.
// These are the changes from Forge; the Forge values come from the sword type's finish (finishCharacter).
const BLADE_AGE_DELTA: Record<SwordCondition, { roughness: number; clearcoatRoughness: number; anisotropy: number }> = {
  pristine: { roughness: 0, clearcoatRoughness: 0, anisotropy: 0 },
  used: { roughness: 0.02, clearcoatRoughness: 0.02, anisotropy: -0.04 },
  battleWorn: { roughness: 0.05, clearcoatRoughness: 0.04, anisotropy: -0.08 },
  ancient: { roughness: 0.24, clearcoatRoughness: 0.2, anisotropy: -0.3 },
};
// Satin and pattern-welded have no lacquer lobe at all. Polished keeps a thin, fairly rough one: a strong,
// sharp clearcoat lays a perfect highlight over the haze and hides it. Constant over age, so scrubbing the
// age never switches the clearcoat on or off (that would recompile the program).
const CLEARCOAT: Record<SteelFinish, number> = { polished: 0.12, satin: 0, patternWelded: 0 };
const CLEARCOAT_AGE: Record<SwordCondition, number> = { pristine: 1, used: 0.3, battleWorn: 0.25, ancient: 0.2 };
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
const delta = <K extends keyof (typeof BLADE_AGE_DELTA)['pristine']>(key: K) =>
  Object.fromEntries(STOPS.map((c) => [c, BLADE_AGE_DELTA[c][key]])) as Record<SwordCondition, number>;

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

export function getBladePhysicalRecipe(age: number, steelFinish: SteelFinish, archetype: ArchetypeKey): BladePhysicalRecipe {
  const f = bladeFinish(archetype, steelFinish);
  return {
    roughness: clamp(f.rough + atAge(delta('roughness'), age), 0.04, 0.82),
    // A hazed mirror loses its sharp lobe: the thin coat fades with use (never to 0, which would recompile).
    clearcoat: CLEARCOAT[steelFinish] * atAge(CLEARCOAT_AGE, age),
    clearcoatRoughness: clamp(0.14 + atAge(delta('clearcoatRoughness'), age), 0.05, 0.55),
    // Floored above zero: anisotropy reaching 0 mid-scrub would recompile the material (a visible hitch).
    anisotropy: clamp(f.aniso + atAge(delta('anisotropy'), age), 0.02, 0.9),
  };
}

/** Multiplies a colour by a per-channel tint (sRGB values, as the tables are written). */
function tintHex(hex: string, [tr, tg, tb]: [number, number, number]): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number, k: number) => clamp(Math.round(v * k), 0, 255);
  return `#${((1 << 24) + (c((n >> 16) & 255, tr) << 16) + (c((n >> 8) & 255, tg) << 8) + c(n & 255, tb)).toString(16).slice(1)}`;
}

export function getSwordMaterialRecipes(archetype: ArchetypeKey, finish: SwordConfig['finish'], woodTint?: string): SwordMaterialRecipes {
  const { age, steelFinish, hardwareTone, gripColor, gripMaterial } = finish;
  const gripRecipe = GRIP_MATERIAL_RECIPES[gripMaterial];

  return {
    blade: {
      color: tintHex(hexAtAge(BLADE_COLORS[steelFinish], age), bladeFinish(archetype, steelFinish).tint),
    },
    hardware: {
      color: hexAtAge(HARDWARE_COLORS[hardwareTone], age),
      emissive: HARDWARE_EMISSIVE[hardwareTone],
      emissiveIntensity: HARDWARE_EMISSIVE_INTENSITY[hardwareTone],
      roughness: clamp(hiltFinish(archetype, hardwareTone).rough + atAge(HARDWARE_ROUGHNESS_DELTA, age), 0.12, 0.85),
    },
    grip: {
      material: gripMaterial,
      // Wood shows its own grain (a white tint that darkens with age); leather and cord take the dye.
      // A Form may give its wood a colour of its own (the Milanese court sword's black horn).
      color: gripMaterial === 'wood' ? shadeHex(woodTint ?? '#c9ab8a', atAge(GRIP_FINISH_SHADE, age)) : shadeHex(gripColor, atAge(gripMaterial === 'wire' ? GRIP_FINISH_SHADE : DYE_SHADE, age) * gripRecipe.colorFactor),
      metalness: gripRecipe.metalness,
      roughness: clamp(gripFinish(archetype, gripMaterial).rough + atAge(GRIP_ROUGHNESS_DELTA, age) * (gripMaterial === 'leather' ? 1 : 0.5), 0.18, 0.98),
    },
  };
}
