import { surface } from './surface';
import * as THREE from 'three';
import { useEffect, useMemo } from 'react';
import { turnedGeometry } from './turned';
import type { ArchetypeKey, GripLength, GripMaterial } from '../../store/configStore';
import { getGripDetailRecipe } from '../../presets/archetypeDetails';
import { GRIP_LENGTHS } from './dimensions';
import { GRIP_NORMAL_MAPS } from './gripTextures';

// Grip: one turned solid, oval in section (wider across the blade than through it), with a gentle swell
// and, for leather and cord, the low ridges of the cord risers under the wrap built into the profile.
const GRIP_RADIUS_TOP = 0.011;
const GRIP_RADIUS_BOT = 0.014;
export const GRIP_FLATTEN = 0.86;
const SWELL = 0.04;
const RISER = { height: 0.0007, width: 0.0016 };
const STEPS = 120;

type GripProps = {
  archetype: ArchetypeKey;
  length: GripLength;
  material: GripMaterial;
  color: string;
  metalness: number;
  normalScale: [number, number];
  roughness: number;
  position: [number, number, number];
};

export function Grip({ archetype, length, material, color, metalness, normalScale, roughness, position }: GripProps) {
  const gripLen = GRIP_LENGTHS[length];
  const halfH   = gripLen / 2;
  const recipe = getGripDetailRecipe(archetype);
  const radiusTop = recipe.coreRadiusTop ?? GRIP_RADIUS_TOP;
  const radiusBot = recipe.coreRadiusBottom ?? GRIP_RADIUS_BOT;
  const normalMap = GRIP_NORMAL_MAPS[material];
  // Leather gets a real grain on top of the wrap pattern.
  const grain = material === 'leather' ? surface('leather') : null;
  const normalScaleVec = useMemo(() => new THREE.Vector2(normalScale[0], normalScale[1]), [normalScale]);
  const risers = material === 'leather' || material === 'cord';
  const count = recipe.bandCount?.[length] ?? (length === 'short' ? 9 : 14);
  const geo = useMemo(() => {
    const profile: [number, number][] = [];
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS, y = -halfH + t * gripLen;
      let r = (radiusBot + (radiusTop - radiusBot) * t) * (1 + SWELL * Math.sin(Math.PI * t));
      if (risers) for (let k = 0; k < count; k++) { const yb = -halfH + ((k + 0.5) / count) * gripLen; r += RISER.height * Math.exp(-(((y - yb) / RISER.width) ** 2)); }
      profile.push([r, y]);
    }
    return turnedGeometry(profile, { flatten: GRIP_FLATTEN, segments: 64, bevel: 0 });
  }, [halfH, gripLen, radiusBot, radiusTop, risers, count]);
  useEffect(() => () => geo.dispose(), [geo]);

  return (
    <group position={position}>
      <mesh geometry={geo}>
        <meshStandardMaterial key={grain?.key} {...grain?.props} color={color} metalness={metalness} roughness={roughness} normalMap={normalMap} normalScale={normalScaleVec} />
      </mesh>
    </group>
  );
}
