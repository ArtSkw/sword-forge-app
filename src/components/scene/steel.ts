import * as THREE from 'three';
import type { ArchetypeKey, SteelFinish } from '../../store/configStore';
import { getBladePhysicalRecipe } from '../../presets/materialRecipes';
import { surface } from './surface';

// The steel's look comes from the shared surface shader: the finish layer (texture-driven, set per sword
// type through uniforms) under the age layers.
// One steel material per finish, made once and never disposed: each keeps its own program (clearcoat on
// Polished, the core map on pattern-welded), so switching the finish, the type or the age never compiles
// once the program is built (warmPrograms builds all three ahead of use).
const STEEL: Partial<Record<SteelFinish, THREE.MeshPhysicalMaterial>> = {};
const FINISHES: SteelFinish[] = ['polished', 'satin', 'patternWelded'];

export function steelMaterial(finish: SteelFinish): THREE.MeshPhysicalMaterial {
  if (!STEEL[finish]) {
    const wear = surface('blade', undefined, undefined, { pattern: finish === 'patternWelded' });
    const m = new THREE.MeshPhysicalMaterial({ metalness: 1, anisotropyRotation: Math.PI / 2 });
    m.onBeforeCompile = wear.props.onBeforeCompile;
    m.customProgramCacheKey = wear.props.customProgramCacheKey;
    STEEL[finish] = m;
  }
  return STEEL[finish]!;
}

// Sets the material's age- and type-dependent values (none of them changes the program).
export function updateSteel(finish: SteelFinish, color: string, age: number, archetype: ArchetypeKey) {
  const m = steelMaterial(finish), phys = getBladePhysicalRecipe(age, finish, archetype);
  m.color.set(color);
  m.roughness = phys.roughness;
  m.clearcoat = phys.clearcoat;
  m.clearcoatRoughness = phys.clearcoatRoughness;
  m.anisotropy = phys.anisotropy;
}

/** The steels not made yet, made now with the values that decide their program (clearcoat, anisotropy), for warming. */
export function unmadeSteels(): THREE.MeshPhysicalMaterial[] {
  return FINISHES.filter((f) => !STEEL[f]).map((f) => {
    const m = steelMaterial(f), phys = getBladePhysicalRecipe(0, f, 'armingSword');
    m.clearcoat = phys.clearcoat;
    m.anisotropy = phys.anisotropy;
    return m;
  });
}
