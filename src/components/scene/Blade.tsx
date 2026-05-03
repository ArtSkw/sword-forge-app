import * as THREE from 'three';
import { useMemo } from 'react';
import type { ArchetypeKey, BladeLength, BladeWidth, FullerStyle, SteelFinish, SwordCondition } from '../../store/configStore';
import { getBladePhysicalRecipe } from '../../presets/materialRecipes';

// 9 rune patterns — each is a rotation in radians applied to the main stroke mark.
// Secondary entries add a crossing stroke at a different angle.
const RUNE_ROTATIONS: number[][] = [
  [0],           // ᛁ upright
  [0.4],         // ᚱ leaning right
  [0, 0.35],     // ᚠ upright + branch
  [-0.4],        // ᛚ leaning left
  [0, -0.35],    // mirror branch
  [0.55],        // steep lean
  [-0.55],       // steep lean left
  [0.35, -0.35], // ᚷ X-cross
  [0],           // ᛇ upright
];

type RunesProps = { length: number; halfThick: number; bodyTaperEnd: number; bodyTaperMidWidth: number; halfWidth: number };

function Runes({ length, halfThick, bodyTaperEnd, bodyTaperMidWidth, halfWidth }: RunesProps) {
  const marks = useMemo(() => {
    const startT = DEFAULT_FULLER_START + 0.04;
    const endT   = DEFAULT_FULLER_END   - 0.04;
    const n      = RUNE_ROTATIONS.length;
    return RUNE_ROTATIONS.map((rotations, i) => {
      const t  = startT + (i / (n - 1)) * (endT - startT);
      const y  = (t - 0.5) * length;
      // Runes live in the body section; shoulder rounding is irrelevant here.
      const hw = widthScale(t, halfWidth, bodyTaperEnd, bodyTaperMidWidth, 0);
      return { y, hw, rotations };
    });
  }, [length, halfWidth, bodyTaperEnd, bodyTaperMidWidth]);

  return (
    <>
      {marks.map(({ y, hw, rotations }, i) =>
        rotations.map((rot, j) => (
          <mesh
            key={`${i}-${j}`}
            position={[0, y, halfThick * 1.18]}
            rotation={[0, 0, rot]}
          >
            <planeGeometry args={[hw * 0.12, 0.0015]} />
            <meshBasicMaterial
              color="#90C8FF"
              transparent
              opacity={0.78}
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-2}
              polygonOffsetUnits={-2}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))
      )}
    </>
  );
}
import { PROFILE_FAMILIES, VIKING_LENTICULAR_SINGLE, buildFullProfile, lerpProfiles } from '../../presets/bladeProfiles';
import type { ProfileFamily } from '../../presets/bladeProfiles';

export const BLADE_LENGTHS: Record<BladeLength, number> = {
  short:     0.70,
  medium:    0.82,
  long:      0.98,
  extraLong: 1.18,
};

const BLADE_HALF_WIDTHS: Record<BladeWidth, number> = {
  narrow:   0.014,
  standard: 0.022,
  wide:     0.030,
};

const BLADE_HALF_THICKNESS = 0.005;

const SEGMENTS = 144;

const TIP_THICK_T = 0.02;

const EDGE_NICK_POSITIONS = [0.23, 0.36, 0.51, 0.67, 0.82];
const SPINE_NICK_POSITIONS = [0.31, 0.58, 0.76];

const EDGE_NICK_DEPTH: Record<SwordCondition, number> = {
  pristine: 0,
  used: 0,
  battleWorn: 0.026,
  ancient: 0.042,
};

function conditionEdgeWear(t: number, side: 'edge' | 'spine', condition: SwordCondition): number {
  const depth = EDGE_NICK_DEPTH[condition];
  if (depth <= 0 || t < 0.13 || t > 0.94) return 0;

  const positions = side === 'edge' ? EDGE_NICK_POSITIONS : SPINE_NICK_POSITIONS;
  const sideDepth = side === 'edge' ? depth : depth * 0.55;

  return positions.reduce((wear, center, index) => {
    const width = 0.010 + index * 0.0015;
    const d = Math.abs(t - center) / width;
    if (d >= 1) return wear;
    const profile = 0.5 + Math.cos(d * Math.PI) * 0.5;
    return wear + sideDepth * profile;
  }, 0);
}

function widthScale(
  t: number,
  halfWidth: number,
  bodyTaperEnd: number,
  midWidth: number,
  shoulderRound: number = 0,
): number {
  // Two linear pieces meeting at bodyTaperEnd with value halfWidth*midWidth.
  const body = halfWidth * (1 - (t / bodyTaperEnd) * (1 - midWidth));
  const tip  = halfWidth * midWidth * (1 - (t - bodyTaperEnd) / (1 - bodyTaperEnd));

  if (shoulderRound <= 0) {
    return t <= bodyTaperEnd ? body : tip;
  }
  // Smoothstep blend over ±shoulderRound around the kink — turns the sharp
  // corner into a rounded shoulder (Viking-style stubby tip).
  const d = (t - bodyTaperEnd) / shoulderRound; // −1 .. +1 across blend window
  if (d <= -1) return body;
  if (d >=  1) return tip;
  const s = (d + 1) * 0.5;
  const w = s * s * (3 - 2 * s);
  return body * (1 - w) + tip * w;
}

const DEFAULT_FULLER_START = 0.10;
const DEFAULT_FULLER_END   = 0.68;
const FULLER_BLEND  = 0.05;

function fullerBlend(t: number, fuller: FullerStyle, fullerStart: number, fullerEnd: number): number {
  if (fuller === 'none') return 0;
  const rampIn  = Math.min(1, Math.max(0, (t - fullerStart) / FULLER_BLEND));
  const rampOut = Math.min(1, Math.max(0, (fullerEnd - t) / FULLER_BLEND));
  return Math.min(rampIn, rampOut);
}

// Spine half-width — straight until clipT then linear drop to 0 (falchion clip tip).
// When clipT >= 1, falls back to the default symmetric taper.
function spineHalfWidth(t: number, halfWidth: number, bodyTaperEnd: number, midWidth: number, shoulderRound: number, clipT: number): number {
  if (clipT >= 1) return widthScale(t, halfWidth, bodyTaperEnd, midWidth, shoulderRound);
  if (t < clipT)  return halfWidth;
  return halfWidth * (1 - (t - clipT) / (1 - clipT));
}

// Edge half-width — default taper plus a sin-arc outward bow (falchion belly).
function edgeHalfWidth(t: number, halfWidth: number, bodyTaperEnd: number, midWidth: number, shoulderRound: number, bow: number): number {
  const base = widthScale(t, halfWidth, bodyTaperEnd, midWidth, shoulderRound);
  if (bow === 0) return base;
  return base + halfWidth * bow * Math.sin(t * Math.PI);
}

function buildBladeGeometry(
  archetype: ArchetypeKey,
  length: number,
  halfWidth: number,
  halfThick: number,
  fuller: FullerStyle,
  bodyTaperEnd: number,
  bodyTaperMidWidth: number,
  tipShoulderRound: number,
  crossSection: ProfileFamily,
  edgeBow: number,
  spineClipT: number,
  fullerStart: number,
  fullerEnd: number,
  condition: SwordCondition,
): THREE.BufferGeometry {
  const family      = PROFILE_FAMILIES[crossSection];
  const baseUpper   = family.none;
  const fullerUpper = archetype === 'vikingSword' && crossSection === 'lenticular' && fuller === 'single'
    ? VIKING_LENTICULAR_SINGLE
    : family[fuller];

  const rings: THREE.Vector3[][] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const t      = i / SEGMENTS;
    const y      = (t - 0.5) * length;
    const spineWear = conditionEdgeWear(t, 'spine', condition);
    const edgeWear = conditionEdgeWear(t, 'edge', condition);
    const spineW = spineHalfWidth(t, halfWidth, bodyTaperEnd, bodyTaperMidWidth, tipShoulderRound, spineClipT) * (1 - spineWear);
    const edgeW  = edgeHalfWidth(t, halfWidth, bodyTaperEnd, bodyTaperMidWidth, tipShoulderRound, edgeBow) * (1 - edgeWear);
    const tScale = halfThick * (1 - t * (1 - TIP_THICK_T));

    const ft    = fullerBlend(t, fuller, fullerStart, fullerEnd);
    const upper = ft > 0 ? lerpProfiles(baseUpper, fullerUpper, ft) : baseUpper;
    const perim = buildFullProfile(upper);

    rings.push(perim.map(([nx, nz]) => {
      const w = nx >= 0 ? spineW : edgeW;
      return new THREE.Vector3(nx * w, y, nz * tScale);
    }));
  }

  const N = rings[0].length; // 24
  const positions: number[] = [];
  const normals: number[]   = [];
  const uvs: number[]       = [];
  const indexArr: number[]  = [];

  // Ring vertices with UV coords (u = around cross-section, v = along blade).
  // Normals are derived from the cross-section tangent and the blade-length
  // tangent. This keeps mirror-bright steel smooth while still accounting for
  // aggressive tip taper and rounded Viking shoulders.
  for (let i = 0; i <= SEGMENTS; i++) {
    const vCoord = i / SEGMENTS;
    for (let j = 0; j < N; j++) {
      const v = rings[i][j];
      const prev = rings[i][(j - 1 + N) % N];
      const next = rings[i][(j + 1) % N];
      const prevRing = rings[Math.max(0, i - 1)][j];
      const nextRing = rings[Math.min(SEGMENTS, i + 1)][j];
      const around = new THREE.Vector3().subVectors(next, prev);
      const along = new THREE.Vector3().subVectors(nextRing, prevRing);
      let normal = new THREE.Vector3().crossVectors(around, along).normalize();
      const outward = new THREE.Vector3(v.x, 0, v.z);
      if (outward.lengthSq() > 0.0000001 && normal.dot(outward) < 0) {
        normal = normal.negate();
      }
      positions.push(v.x, v.y, v.z);
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(j / N, vCoord);
    }
  }

  // Base center
  const baseCenterIdx = positions.length / 3;
  positions.push(0, -length / 2, 0);
  normals.push(0, -1, 0);
  uvs.push(0.5, 0);

  // Tip center
  const tipCenterIdx = positions.length / 3;
  positions.push(0, length / 2, 0);
  normals.push(0, 1, 0);
  uvs.push(0.5, 1);

  // Side quads
  for (let i = 0; i < SEGMENTS; i++) {
    for (let j = 0; j < N; j++) {
      const j1 = (j + 1) % N;
      const a = i * N + j;
      const b = i * N + j1;
      const c = (i + 1) * N + j;
      const d = (i + 1) * N + j1;
      indexArr.push(a, b, c);
      indexArr.push(b, d, c);
    }
  }

  // Base cap
  for (let j = 0; j < N; j++) {
    indexArr.push(baseCenterIdx, (j + 1) % N, j);
  }

  // Tip cap
  const tipBase = SEGMENTS * N;
  for (let j = 0; j < N; j++) {
    indexArr.push(tipCenterIdx, tipBase + j, tipBase + (j + 1) % N);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indexArr);
  geo.computeBoundingSphere();
  return geo;
}

// Normal map: mostly lengthwise grind marks with a little irregular forge grit.
// The previous isotropic noise fought the blade's glossy anisotropic shader and
// could read as pixel/grid sparkle. These marks run along the blade instead.
function makeBladeNormalMap(): THREE.CanvasTexture {
  const W = 512, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);

  const columnGrain = Array.from({ length: W }, (_, x) => {
    const u = x / W;
    const broad = Math.sin(u * Math.PI * 18) * 4;
    const fine = Math.sin(u * Math.PI * 91 + 0.8) * 2;
    const noise = (Math.random() + Math.random() - 1) * 2.5;
    return broad + fine + noise;
  });

  for (let y = 0; y < H; y++) {
    const v = y / H;
    const lengthStreak = Math.sin(v * Math.PI * 38) * 0.9;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const chatter = (Math.random() + Math.random() - 1) * 1.8;
      img.data[i]   = 128 + Math.round(columnGrain[x] + chatter);
      img.data[i+1] = 128 + Math.round(lengthStreak + chatter * 0.35);
      img.data[i+2] = 255;
      img.data[i+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 5);
  tex.anisotropy = 8;
  return tex;
}

function makePatternWeldedMap(): THREE.CanvasTexture {
  const W = 512, H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);

  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const waveA = Math.sin((u * 9.0 + Math.sin(v * Math.PI * 11) * 0.22) * Math.PI * 2);
      const waveB = Math.sin((u * 17.0 - Math.cos(v * Math.PI * 7) * 0.13) * Math.PI * 2);
      const lengthBreakup = Math.sin(v * Math.PI * 31 + waveA * 0.8) * 0.18;
      const value = 187 + Math.round((waveA * 0.55 + waveB * 0.22 + lengthBreakup) * 16);
      const i = (y * W + x) * 4;
      img.data[i] = value;
      img.data[i + 1] = value + 2;
      img.data[i + 2] = value + 5;
      img.data[i + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  tex.anisotropy = 8;
  return tex;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Roughness map: a broad, smooth maintenance gradient. The base and very tip
// read a touch duller, while the mid-blade stays cleaner and sharper.
function makeBladeRoughnessMap(): THREE.CanvasTexture {
  const W = 96, H = 768;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);

  for (let y = 0; y < H; y++) {
    const v = y / (H - 1);
    const baseDullness = 0.18 * (1 - smoothstep(0.04, 0.24, v));
    const tipDullness = 0.10 * smoothstep(0.72, 1.0, v);
    const midPolish = 0.12 * smoothstep(0.14, 0.42, v) * (1 - smoothstep(0.62, 0.92, v));

    for (let x = 0; x < W; x++) {
      const u = x / (W - 1);
      const edgeDullness = 0.05 * Math.pow(Math.abs(u - 0.5) * 2, 1.6);
      const value = Math.round(255 * Math.max(0.68, Math.min(1, 0.91 + baseDullness + tipDullness + edgeDullness - midPolish)));
      const i = (y * W + x) * 4;
      img.data[i] = value;
      img.data[i + 1] = value;
      img.data[i + 2] = value;
      img.data[i + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  return tex;
}

// Shared — generated once for the app lifetime
const BLADE_NORMAL_MAP   = makeBladeNormalMap();
const BLADE_NORMAL_SCALE = new THREE.Vector2(0.045, 0.025);
const PATTERN_WELDED_MAP = makePatternWeldedMap();
const BLADE_ROUGHNESS_MAP = makeBladeRoughnessMap();

type BladeProps = {
  archetype: ArchetypeKey;
  length: BladeLength;
  width: BladeWidth;
  fuller: FullerStyle;
  bodyTaperEnd: number;
  bodyTaperMidWidth: number;
  tipShoulderRound: number;
  crossSection: ProfileFamily;
  edgeBow: number;
  spineClipT: number;
  fullerStart?: number;
  fullerEnd?: number;
  color: string;
  steelFinish: SteelFinish;
  condition: SwordCondition;
  runes: boolean;
  position: [number, number, number];
};

export function Blade({ archetype, length, width, fuller, bodyTaperEnd, bodyTaperMidWidth, tipShoulderRound, crossSection, edgeBow, spineClipT, fullerStart = DEFAULT_FULLER_START, fullerEnd = DEFAULT_FULLER_END, color, steelFinish, condition, runes, position }: BladeProps) {
  const bladeLen  = BLADE_LENGTHS[length];
  const halfWidth = BLADE_HALF_WIDTHS[width];
  const phys      = getBladePhysicalRecipe(condition, steelFinish);
  const steelMap  = steelFinish === 'patternWelded' ? PATTERN_WELDED_MAP : null;

  const geo = useMemo(
    () => buildBladeGeometry(archetype, bladeLen, halfWidth, BLADE_HALF_THICKNESS, fuller, bodyTaperEnd, bodyTaperMidWidth, tipShoulderRound, crossSection, edgeBow, spineClipT, fullerStart, fullerEnd, condition),
    [archetype, bladeLen, halfWidth, fuller, bodyTaperEnd, bodyTaperMidWidth, tipShoulderRound, crossSection, edgeBow, spineClipT, fullerStart, fullerEnd, condition],
  );

  return (
    <group position={position}>
      <mesh geometry={geo}>
        <meshPhysicalMaterial
          color={color}
          map={steelMap}
          metalness={1.0}
          roughness={phys.roughness}
          roughnessMap={BLADE_ROUGHNESS_MAP}
          normalMap={BLADE_NORMAL_MAP}
          normalScale={BLADE_NORMAL_SCALE}
          clearcoat={phys.clearcoat}
          clearcoatRoughness={phys.clearcoatRoughness}
          anisotropy={phys.anisotropy}
          anisotropyRotation={Math.PI / 2}
        />
      </mesh>
      {runes && (
        <Runes
          length={bladeLen}
          halfThick={BLADE_HALF_THICKNESS}
          bodyTaperEnd={bodyTaperEnd}
          bodyTaperMidWidth={bodyTaperMidWidth}
          halfWidth={halfWidth}
        />
      )}
    </group>
  );
}
