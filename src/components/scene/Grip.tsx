import * as THREE from 'three';
import { useMemo } from 'react';
import type { ArchetypeKey, GripLength, GripMaterial } from '../../store/configStore';
import { getGripDetailRecipe } from '../../presets/archetypeDetails';
import { GRIP_LENGTHS } from './dimensions';

// Core cylinder dimensions
const GRIP_RADIUS_TOP = 0.011;
const GRIP_RADIUS_BOT = 0.014;
const GRIP_SEGMENTS   = 12;

// Bands sit this far proud of the core surface (1.6mm wrap thickness).
const BAND_OFFSET = 0.0016;

function noise2d(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function makeGripNormalMap(material: GripMaterial): THREE.CanvasTexture {
  const W = 256, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);

  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const chatter = (noise2d(x, y) + noise2d(x * 0.37, y * 0.61) - 1) * 2.2;
      let red = 0;
      let green = 0;

      if (material === 'wood') {
        const slowGrain = Math.sin((u * 9 + Math.sin(v * Math.PI * 3) * 0.24) * Math.PI * 2) * 3.2;
        const fineGrain = Math.sin((u * 31 + v * 1.6) * Math.PI * 2) * 1.5;
        red = slowGrain + fineGrain + chatter * 0.45;
        green = Math.sin(v * Math.PI * 18 + slowGrain * 0.2) * 0.9;
      } else if (material === 'cord') {
        red = Math.sin((u * 42 + v * 12) * Math.PI * 2) * 2.8 + chatter;
        green = Math.sin(v * Math.PI * 54) * 3.2 + chatter * 0.45;
      } else if (material === 'wire') {
        red = Math.sin(u * Math.PI * 48) * 1.2;
        green = Math.sin(v * Math.PI * 22) * 0.8;
      } else {
        red = Math.sin(u * Math.PI * 24 + v * 5) * 2 + chatter;
        green = Math.sin(v * Math.PI * 32) * 4 + chatter * 0.35;
      }

      const i = (y * W + x) * 4;
      img.data[i] = 128 + Math.round(red);
      img.data[i + 1] = 128 + Math.round(green);
      img.data[i + 2] = 255;
      img.data[i + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if (material === 'wood') {
    tex.repeat.set(1.5, 2.4);
  } else if (material === 'cord') {
    tex.repeat.set(4, 7);
  } else if (material === 'wire') {
    tex.repeat.set(5, 4);
  } else {
    tex.repeat.set(3, 5);
  }
  tex.anisotropy = 8;
  return tex;
}

const GRIP_NORMAL_MAPS: Record<GripMaterial, THREE.CanvasTexture> = {
  leather: makeGripNormalMap('leather'),
  wood: makeGripNormalMap('wood'),
  cord: makeGripNormalMap('cord'),
  wire: makeGripNormalMap('wire'),
};

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
