import * as THREE from 'three';
import { useEffect, useMemo } from 'react';
import type { ArchetypeKey, GripMaterial, GripShape } from '../../store/configStore';
import { getGripDetailRecipe } from '../../presets/archetypeDetails';
import { GRIP_MOULDING, GRIP_MOULDING_T, GRIP_RADIUS_BOT, GRIP_RADIUS_TOP, SEAM, SEAM_ANGLE, SEAM_STITCH, WRAPS, shapeAt } from './gripForm';
import { surface } from './surface';
import { woodTexture } from './gripTextures';
import { LOW_TIER } from '../../lib/tier';

// The grip, built as one solid whose surface is the wrap itself, so each material reads by its shape:
// - wood: two halves around the tang, planed and oiled (grain texture, a fine seam on each edge);
// - leather: a strip wound in a spiral, each turn overlapping the last (a stepped edge running round);
// - cord: tight turns of cord, every turn a rounded ridge;
// - wire: twisted wire in tight turns, each turn beaded like a rope, in the fittings' metal.
// The profile (straight, swelling, waisted or two-stage) is shared by all of them.

export const GRIP_FLATTEN = 0.86;
const AROUND = LOW_TIER ? 72 : 112, ROWS_PER_TURN = LOW_TIER ? 4 : 6, STRIP_ROWS = LOW_TIER ? 14 : 24;

const smooth = (a: number, b: number, x: number) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

function gripGeometry(len: number, rBot: number, rTop: number, material: GripMaterial, shape: GripShape): THREE.BufferGeometry {
  const w = WRAPS[material];
  const rows = Math.max(140, Math.ceil(w.pitch ? (len / w.pitch) * (w.kind === 'strip' ? STRIP_ROWS : ROWS_PER_TURN) : 140));
  // A dense wrap is a few hundred thousand vertices, rebuilt on every grip choice: typed arrays filled in place, and
  // whatever depends only on the column (the angle round the grip) or only on the row computed once.
  const cols = AROUND + 1, count = (rows + 1) * cols;
  const positions = new Float32Array(count * 3), uvs = new Float32Array(count * 2), crown = new Float32Array(count);
  const index = count > 65535 ? new Uint32Array(rows * AROUND * 6) : new Uint16Array(rows * AROUND * 6);
  const cosA = new Float64Array(cols), sinA = new Float64Array(cols), bead = new Float64Array(cols), seamAng = new Float64Array(cols), woodSeam = new Float64Array(cols);
  for (let j = 0; j <= AROUND; j++) {
    const a = (j / AROUND) * Math.PI * 2;
    cosA[j] = Math.cos(a); sinA[j] = Math.sin(a);
    bead[j] = 0.5 + 0.5 * Math.cos(a * (LOW_TIER ? 18 : 28));   // the wire's twist of the strands, a whole number per turn (no seam)
    seamAng[j] = Math.atan2(Math.sin(a - SEAM_ANGLE), Math.cos(a - SEAM_ANGLE));   // angle from the leather's seam
    woodSeam[j] = Math.exp(-((Math.cos(a) - 1) ** 2) / 0.0004) + Math.exp(-((Math.cos(a) + 1) ** 2) / 0.0004);
  }
  // The shape's crowns (the swell, the waist's rims, the stages and the moulding), 0–1 by how far the profile stands
  // above its lowest point: where an old grip is burnished by the hand (surface.ts reads it as surfEdge).
  const prof = (t: number) => shapeAt(shape, t) + (shape === 'twoStage' ? (GRIP_MOULDING.height / rBot) * Math.exp(-((((t - GRIP_MOULDING_T) * len) / GRIP_MOULDING.width) ** 2)) : 0);
  let pMin = Infinity, pMax = -Infinity;
  for (let i = 0; i <= 200; i++) { const v = prof(i / 200); pMin = Math.min(pMin, v); pMax = Math.max(pMax, v); }
  let p = 0;
  for (let i = 0; i <= rows; i++) {
    const t = i / rows, y = -len / 2 + t * len;
    let base = (rBot + (rTop - rBot) * t) * shapeAt(shape, t);
    // The wrap fades out over the last 3 mm at each end, under the ferrules, and at a two-stage moulding.
    let wrapOn = smooth(0, 0.003, t * len) * smooth(0, 0.003, (1 - t) * len);
    if (shape === 'twoStage') {
      const d = Math.abs(t - GRIP_MOULDING_T) * len;
      base += GRIP_MOULDING.height * Math.exp(-((d / GRIP_MOULDING.width) ** 2));
      wrapOn *= smooth(0.0035, 0.007, d);
    }
    const rowCrown = pMax - pMin > 0.01 ? ((prof(t) - pMin) / (pMax - pMin)) ** 1.5 : 0;
    const stitch = 0.65 + 0.35 * Math.cos((y / SEAM_STITCH) * Math.PI * 2);
    for (let j = 0; j <= AROUND; j++, p++) {
      const u = j / AROUND;
      let r = base;
      if (w.kind !== 'none' && wrapOn > 0) {
        // Phase along the helix: one full turn per pitch.
        const phase = y / w.pitch + u, f = phase - Math.floor(phase);
        if (w.kind === 'cord') r += w.height * wrapOn * Math.sqrt(Math.max(0, 1 - (2 * f - 1) ** 2));
        if (w.kind === 'wire') r += w.height * wrapOn * Math.sqrt(Math.max(0, 1 - (2 * f - 1) ** 2)) * (0.72 + 0.28 * bead[j]);
        // Leather strip: thickest at its overlapping edge, then a rounded step down onto the next turn.
        if (w.kind === 'strip') r += w.height * wrapOn * (f < 0.92 ? 0.35 + 0.65 * (f / 0.92) : 1 - smooth(0.92, 1, f));
      }
      // Leather: the cover's stitched seam runs straight down the back (away from the default view): a ridge
      // 0.25 mm high and 1.2 mm wide, its stitches every 4 mm.
      if (material === 'leather' && wrapOn > 0) {
        const da = seamAng[j] * base;   // arc distance from the seam (m)
        r += SEAM.height * wrapOn * stitch * Math.exp(-((da / (SEAM.width / 2)) ** 2));
      }
      // Wood: a fine seam where the two halves meet, on each edge of the grip.
      if (material === 'wood') r -= 0.00018 * woodSeam[j];
      positions[p * 3] = cosA[j] * r; positions[p * 3 + 1] = y; positions[p * 3 + 2] = sinA[j] * r * GRIP_FLATTEN;
      uvs[p * 2] = u; uvs[p * 2 + 1] = t * len;
      crown[p] = rowCrown;
    }
  }
  let k = 0;
  for (let i = 0; i < rows; i++) for (let j = 0; j < AROUND; j++) {
    const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1;
    index[k++] = a; index[k++] = c; index[k++] = b; index[k++] = b; index[k++] = c; index[k++] = d;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute('surfEdge', new THREE.BufferAttribute(crown, 1));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
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
  // Each wrap reads its helix from the grip's uv (u around, v along in metres): strip, cord or wire.
  const leather = surface('leather', undefined, undefined, { wrap: material === 'cord' ? 'cord' : 'strip' }), wire = surface(metal.tone, undefined, undefined, { wrap: 'wire' }), wood = surface('wood');
  return (
    <group position={position}>
      <mesh geometry={geo} scale={[recipe.sectionX ?? 1, 1, 1]}>
        {material === 'wire' && <meshStandardMaterial key={wire.key} {...wire.props} color={metal.color} metalness={1} roughness={metal.roughness} />}
        {material === 'wood' && <meshStandardMaterial key={wood.key} {...wood.props} map={woodTexture()} color={color} metalness={0} roughness={Math.max(0.38, roughness - 0.3)} />}
        {(material === 'leather' || material === 'cord') && <meshStandardMaterial key={leather.key} {...leather.props} color={color} metalness={0} roughness={roughness} />}
      </mesh>
    </group>
  );
}
