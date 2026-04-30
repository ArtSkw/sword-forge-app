import * as THREE from 'three';
import { useMemo } from 'react';
import type { BladeFinish, BladeLength, BladeWidth, FullerStyle } from '../../store/configStore';

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
    const startT = FULLER_START + 0.04;
    const endT   = FULLER_END   - 0.04;
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
            position={[0, y, halfThick * 1.06]}
            rotation={[0, 0, rot]}
          >
            <boxGeometry args={[hw * 0.18, 0.0055, 0.0003]} />
            <meshStandardMaterial
              color="#90C8FF"
              emissive="#90C8FF"
              emissiveIntensity={1.2}
              metalness={0}
              roughness={0.4}
            />
          </mesh>
        ))
      )}
    </>
  );
}
import { PROFILE_FAMILIES, buildFullProfile, lerpProfiles } from '../../presets/bladeProfiles';
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

const FULLER_START  = 0.10;
const FULLER_END    = 0.68;
const FULLER_BLEND  = 0.05;

function fullerBlend(t: number, fuller: FullerStyle): number {
  if (fuller === 'none') return 0;
  const rampIn  = Math.min(1, Math.max(0, (t - FULLER_START) / FULLER_BLEND));
  const rampOut = Math.min(1, Math.max(0, (FULLER_END - t) / FULLER_BLEND));
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
): THREE.BufferGeometry {
  const family      = PROFILE_FAMILIES[crossSection];
  const baseUpper   = family.none;
  const fullerUpper = family[fuller];

  const rings: THREE.Vector3[][] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const t      = i / SEGMENTS;
    const y      = (t - 0.5) * length;
    const spineW = spineHalfWidth(t, halfWidth, bodyTaperEnd, bodyTaperMidWidth, tipShoulderRound, spineClipT);
    const edgeW  = edgeHalfWidth(t, halfWidth, bodyTaperEnd, bodyTaperMidWidth, tipShoulderRound, edgeBow);
    const tScale = halfThick * (1 - t * (1 - TIP_THICK_T));

    const ft    = fullerBlend(t, fuller);
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
  // Normals are derived from each ring's cross-section instead of from the
  // triangulated side faces. This keeps mirror-bright steel from revealing the
  // quad split pattern as triangular bands in the highlight.
  for (let i = 0; i <= SEGMENTS; i++) {
    const vCoord = i / SEGMENTS;
    for (let j = 0; j < N; j++) {
      const v = rings[i][j];
      const prev = rings[i][(j - 1 + N) % N];
      const next = rings[i][(j + 1) % N];
      const tx = next.x - prev.x;
      const tz = next.z - prev.z;
      const normal = new THREE.Vector3(-tz, 0, tx).normalize();
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

// Shared — generated once for the app lifetime
const BLADE_NORMAL_MAP   = makeBladeNormalMap();
const BLADE_NORMAL_SCALE = new THREE.Vector2(0.045, 0.025);

// Per-finish material recipe. Roughness drives the base specular response;
// clearcoat + anisotropy + iridescence (B1 — MeshPhysicalMaterial) push the
// blade away from "plastic" toward forged steel. Anisotropy direction is
// rotated by π/2 so the streaks run along the blade length, not across it.
export const BLADE_PHYSICAL: Record<BladeFinish, {
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  anisotropy: number;
  iridescence: number;
}> = {
  pristine:   { roughness: 0.15, clearcoat: 0.55, clearcoatRoughness: 0.08, anisotropy: 0.65, iridescence: 0.15 },
  used:       { roughness: 0.28, clearcoat: 0.30, clearcoatRoughness: 0.16, anisotropy: 0.52, iridescence: 0.07 },
  battleWorn: { roughness: 0.42, clearcoat: 0.16, clearcoatRoughness: 0.24, anisotropy: 0.42, iridescence: 0.03 },
  ancient:    { roughness: 0.56, clearcoat: 0.04, clearcoatRoughness: 0.36, anisotropy: 0.30, iridescence: 0.00 },
};

type BladeProps = {
  length: BladeLength;
  width: BladeWidth;
  fuller: FullerStyle;
  bodyTaperEnd: number;
  bodyTaperMidWidth: number;
  tipShoulderRound: number;
  crossSection: ProfileFamily;
  edgeBow: number;
  spineClipT: number;
  color: string;
  finish: BladeFinish;
  runes: boolean;
  position: [number, number, number];
};

export function Blade({ length, width, fuller, bodyTaperEnd, bodyTaperMidWidth, tipShoulderRound, crossSection, edgeBow, spineClipT, color, finish, runes, position }: BladeProps) {
  const bladeLen  = BLADE_LENGTHS[length];
  const halfWidth = BLADE_HALF_WIDTHS[width];
  const phys      = BLADE_PHYSICAL[finish];

  const geo = useMemo(
    () => buildBladeGeometry(bladeLen, halfWidth, BLADE_HALF_THICKNESS, fuller, bodyTaperEnd, bodyTaperMidWidth, tipShoulderRound, crossSection, edgeBow, spineClipT),
    [bladeLen, halfWidth, fuller, bodyTaperEnd, bodyTaperMidWidth, tipShoulderRound, crossSection, edgeBow, spineClipT],
  );

  return (
    <group position={position}>
      <mesh geometry={geo}>
        <meshPhysicalMaterial
          color={color}
          metalness={1.0}
          roughness={phys.roughness}
          normalMap={BLADE_NORMAL_MAP}
          normalScale={BLADE_NORMAL_SCALE}
          clearcoat={phys.clearcoat}
          clearcoatRoughness={phys.clearcoatRoughness}
          anisotropy={phys.anisotropy}
          anisotropyRotation={Math.PI / 2}
          iridescence={phys.iridescence}
          iridescenceIOR={1.3}
          iridescenceThicknessRange={[100, 400]}
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
