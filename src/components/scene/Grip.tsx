import * as THREE from 'three';
import { useEffect, useMemo } from 'react';
import type { ArchetypeKey, GripMaterial, GripShape } from '../../store/configStore';
import { getGripDetailRecipe } from '../../presets/archetypeDetails';
import { surface } from './surface';
import { woodTexture } from './gripTextures';

// The grip, built as one solid whose surface is the wrap itself, so each material reads by its shape:
// - wood: two halves around the tang, planed and oiled (grain texture, a fine seam on each edge);
// - leather: a strip wound in a spiral, each turn overlapping the last (a stepped edge running round);
// - cord: tight turns of cord, every turn a rounded ridge;
// - wire: twisted wire in tight turns, each turn beaded like a rope, in the fittings' metal.
// The profile (straight, swelling, waisted or two-stage) is shared by all of them.

const GRIP_RADIUS_TOP = 0.011;
const GRIP_RADIUS_BOT = 0.014;
export const GRIP_FLATTEN = 0.86;
const AROUND = 112;

type Wrap = { pitch: number; height: number; kind: 'none' | 'strip' | 'cord' | 'wire' };
const WRAPS: Record<GripMaterial, Wrap> = {
  wood: { pitch: 0, height: 0, kind: 'none' },
  leather: { pitch: 0.017, height: 0.00055, kind: 'strip' },   // a strip about 17 mm wide
  cord: { pitch: 0.0021, height: 0.00052, kind: 'cord' },      // cord about 2 mm thick
  wire: { pitch: 0.0013, height: 0.00034, kind: 'wire' },      // twisted wire about 1.3 mm
};

const smooth = (a: number, b: number, x: number) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

/** Radius factor along the grip (t = 0 at the pommel, 1 at the guard) for each shape. */
function shapeAt(shape: GripShape, t: number): number {
  switch (shape) {
    case 'straight': return 1;
    case 'swell': return 1 + 0.05 * Math.sin(Math.PI * t);
    // Narrow in the middle, swelling toward both hands (late 15th-c. bastard grips).
    case 'waisted': return 1 + 0.07 * Math.cos(2 * Math.PI * t) - 0.02;
    // Two grips in one, each swelling, parted by a raised moulding (16th-c. two-handers).
    case 'twoStage': { const s = t < 0.52 ? t / 0.52 : (t - 0.52) / 0.48; return 1 + 0.06 * Math.sin(Math.PI * s); }
  }
}
const MOULDING_T = 0.52;

function gripGeometry(len: number, rBot: number, rTop: number, material: GripMaterial, shape: GripShape): THREE.BufferGeometry {
  const w = WRAPS[material];
  const rows = Math.max(140, Math.ceil(w.pitch ? (len / w.pitch) * (w.kind === 'strip' ? 24 : 6) : 140));
  const positions: number[] = [], uvs: number[] = [], index: number[] = [];
  for (let i = 0; i <= rows; i++) {
    const t = i / rows, y = -len / 2 + t * len;
    let base = (rBot + (rTop - rBot) * t) * shapeAt(shape, t);
    // The wrap fades out over the last 3 mm at each end, under the ferrules, and at a two-stage moulding.
    let wrapOn = smooth(0, 0.003, t * len) * smooth(0, 0.003, (1 - t) * len);
    if (shape === 'twoStage') {
      const d = Math.abs(t - MOULDING_T) * len;
      base += 0.0016 * Math.exp(-((d / 0.0028) ** 2));
      wrapOn *= smooth(0.003, 0.006, d);
    }
    for (let j = 0; j <= AROUND; j++) {
      const u = j / AROUND, a = u * Math.PI * 2;
      let r = base;
      if (w.kind !== 'none' && wrapOn > 0) {
        // Phase along the helix: one full turn per pitch.
        const phase = y / w.pitch + u, f = phase - Math.floor(phase);
        if (w.kind === 'cord') r += w.height * wrapOn * Math.sqrt(Math.max(0, 1 - (2 * f - 1) ** 2));
        if (w.kind === 'wire') {
          const bead = 0.5 + 0.5 * Math.cos(a * 28);   // the twist of the strands, a whole number per turn (no seam)
          r += w.height * wrapOn * Math.sqrt(Math.max(0, 1 - (2 * f - 1) ** 2)) * (0.72 + 0.28 * bead);
        }
        // Leather strip: thickest at its overlapping edge, then a rounded step down onto the next turn.
        if (w.kind === 'strip') r += w.height * wrapOn * (f < 0.92 ? 0.35 + 0.65 * (f / 0.92) : 1 - smooth(0.92, 1, f));
      }
      // Wood: a fine seam where the two halves meet, on each edge of the grip.
      if (material === 'wood') r -= 0.00018 * (Math.exp(-((Math.cos(a) - 1) ** 2) / 0.0004) + Math.exp(-((Math.cos(a) + 1) ** 2) / 0.0004));
      positions.push(Math.cos(a) * r, y, Math.sin(a) * r * GRIP_FLATTEN);
      uvs.push(u, t * len);
    }
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < AROUND; j++) {
    const a = i * (AROUND + 1) + j, b = a + 1, c = a + AROUND + 1, d = c + 1;
    index.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

type GripProps = {
  archetype: ArchetypeKey;
  length: number;          // m
  shape: GripShape;
  material: GripMaterial;
  color: string;           // the dyed leather or cord, or the wood's tint
  roughness: number;
  metal: { color: string; roughness: number; tone: 'iron' | 'copper' };   // wire is drawn in the fittings' metal
  position: [number, number, number];
};

export function Grip({ archetype, length, shape, material, color, roughness, metal, position }: GripProps) {
  const len = length;
  const recipe = getGripDetailRecipe(archetype);
  const rTop = recipe.coreRadiusTop ?? GRIP_RADIUS_TOP, rBot = recipe.coreRadiusBottom ?? GRIP_RADIUS_BOT;
  const geo = useMemo(() => gripGeometry(len, rBot, rTop, material, shape), [len, rBot, rTop, material, shape]);
  useEffect(() => () => geo.dispose(), [geo]);
  const leather = surface('leather'), wire = surface(metal.tone);
  return (
    <group position={position}>
      <mesh geometry={geo}>
        {material === 'wire' && <meshStandardMaterial key={wire.key} {...wire.props} color={metal.color} metalness={1} roughness={Math.max(0.22, metal.roughness - 0.08)} />}
        {material === 'wood' && <meshStandardMaterial key="wood" map={woodTexture()} color={color} metalness={0} roughness={Math.max(0.38, roughness - 0.3)} />}
        {(material === 'leather' || material === 'cord') && <meshStandardMaterial key={leather.key} {...leather.props} color={color} metalness={0} roughness={roughness} />}
      </mesh>
    </group>
  );
}
