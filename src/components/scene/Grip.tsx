import * as THREE from 'three';
import { useMemo } from 'react';
import type { ArchetypeKey, GripLength, GripMaterial } from '../../store/configStore';
import { getGripDetailRecipe } from '../../presets/archetypeDetails';
import { GRIP_LENGTHS } from './dimensions';
import { GRIP_NORMAL_MAPS } from './gripTextures';

// Core cylinder dimensions
const GRIP_RADIUS_TOP = 0.011;
const GRIP_RADIUS_BOT = 0.014;
const GRIP_SEGMENTS   = 12;

// Bands sit this far proud of the core surface (1.6mm wrap thickness).
const BAND_OFFSET = 0.0016;

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
  const wrapRadius = (radiusTop + radiusBot) / 2 + BAND_OFFSET;
  const normalMap = GRIP_NORMAL_MAPS[material];
  const normalScaleVec = useMemo(() => new THREE.Vector2(normalScale[0], normalScale[1]), [normalScale]);

  const bands = useMemo(() => {
    const count = recipe.bandCount?.[length] ?? (length === 'short' ? 9 : 14);
    return Array.from({ length: count }, (_, i) => -halfH + ((i + 0.5) / count) * gripLen);
  }, [gripLen, halfH, length, recipe.bandCount]);

  return (
    <group position={position}>
      {/* Grip core — slightly recessed so the wrap bands sit proud */}
      <mesh>
        <cylinderGeometry args={[radiusTop, radiusBot, gripLen, GRIP_SEGMENTS]} />
        <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} normalMap={normalMap} normalScale={normalScaleVec} />
      </mesh>

      {bands.map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[wrapRadius, recipe.bandTube ?? 0.00075, 6, 28]} />
          <meshStandardMaterial color={color} metalness={metalness} roughness={Math.max(0.22, roughness - 0.05)} normalMap={normalMap} normalScale={normalScaleVec} />
        </mesh>
      ))}
    </group>
  );
}
