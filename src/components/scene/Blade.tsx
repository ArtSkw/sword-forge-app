import * as THREE from 'three';
import { useMemo } from 'react';
import type { BladeLength, BladeWidth, FullerStyle } from '../../store/configStore';

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

type RunesProps = { length: number; halfThick: number; bodyTaperEnd: number; halfWidth: number };

function Runes({ length, halfThick, bodyTaperEnd, halfWidth }: RunesProps) {
  const marks = useMemo(() => {
    const startT = FULLER_START + 0.04;
    const endT   = FULLER_END   - 0.04;
    const n      = RUNE_ROTATIONS.length;
    return RUNE_ROTATIONS.map((rotations, i) => {
      const t  = startT + (i / (n - 1)) * (endT - startT);
      const y  = (t - 0.5) * length;
      const hw = widthScale(t, halfWidth, bodyTaperEnd);
      return { y, hw, rotations };
    });
  }, [length, halfWidth, bodyTaperEnd]);

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
import { UPPER_PROFILES, buildFullProfile, lerpProfiles } from '../../presets/bladeProfiles';

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

const SEGMENTS = 48;

const TAPER_MID_WIDTH = 0.34;
const TIP_THICK_T     = 0.02;

function widthScale(t: number, halfWidth: number, bodyTaperEnd: number): number {
  if (t <= bodyTaperEnd) {
    return halfWidth * (1 - (t / bodyTaperEnd) * (1 - TAPER_MID_WIDTH));
  }
  const dt = (t - bodyTaperEnd) / (1 - bodyTaperEnd);
  return halfWidth * TAPER_MID_WIDTH * (1 - dt);
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

function buildBladeGeometry(
  length: number,
  halfWidth: number,
  halfThick: number,
  fuller: FullerStyle,
  bodyTaperEnd: number,
): THREE.BufferGeometry {
  const baseUpper   = UPPER_PROFILES.none;
  const fullerUpper = UPPER_PROFILES[fuller];

  const rings: THREE.Vector3[][] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const t      = i / SEGMENTS;
    const y      = (t - 0.5) * length;
    const wScale = widthScale(t, halfWidth, bodyTaperEnd);
    const tScale = halfThick * (1 - t * (1 - TIP_THICK_T));

    const ft    = fullerBlend(t, fuller);
    const upper = ft > 0 ? lerpProfiles(baseUpper, fullerUpper, ft) : baseUpper;
    const perim = buildFullProfile(upper);

    rings.push(perim.map(([nx, nz]) => new THREE.Vector3(nx * wScale, y, nz * tScale)));
  }

  const N = rings[0].length; // 24
  const positions: number[] = [];
  const uvs: number[]       = [];
  const indexArr: number[]  = [];

  // Ring vertices with UV coords (u = around cross-section, v = along blade)
  for (let i = 0; i <= SEGMENTS; i++) {
    const vCoord = i / SEGMENTS;
    for (let j = 0; j < N; j++) {
      const v = rings[i][j];
      positions.push(v.x, v.y, v.z);
      uvs.push(j / N, vCoord);
    }
  }

  // Base center
  const baseCenterIdx = positions.length / 3;
  positions.push(0, -length / 2, 0);
  uvs.push(0.5, 0);

  // Tip center
  const tipCenterIdx = positions.length / 3;
  positions.push(0, length / 2, 0);
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
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indexArr);
  geo.computeVertexNormals();
  return geo;
}

// Normal map: organic random grain at low resolution, bilinearly filtered for smooth
// micro-surface noise — no regular stripes or patterns, just metal grit.
// Generated at 64×64 and magnified by the GPU with LinearFilter.
function makeBladeNormalMap(): THREE.CanvasTexture {
  const W = 64, H = 64;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    // Subtle random tilt — mostly X (across blade width = grinding direction),
    // very little Y (along blade length stays mostly flat).
    img.data[i]   = 128 + Math.round((Math.random() - 0.5) * 28); // nx
    img.data[i+1] = 128 + Math.round((Math.random() - 0.5) * 12); // ny
    img.data[i+2] = 255;                                            // nz full outward
    img.data[i+3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Shared — generated once for the app lifetime
const BLADE_NORMAL_MAP   = makeBladeNormalMap();
const BLADE_NORMAL_SCALE = new THREE.Vector2(0.22, 0.22);

type BladeProps = {
  length: BladeLength;
  width: BladeWidth;
  fuller: FullerStyle;
  bodyTaperEnd: number;
  color: string;
  roughness: number;
  runes: boolean;
  position: [number, number, number];
};

export function Blade({ length, width, fuller, bodyTaperEnd, color, roughness, runes, position }: BladeProps) {
  const bladeLen  = BLADE_LENGTHS[length];
  const halfWidth = BLADE_HALF_WIDTHS[width];

  const geo = useMemo(
    () => buildBladeGeometry(bladeLen, halfWidth, BLADE_HALF_THICKNESS, fuller, bodyTaperEnd),
    [bladeLen, halfWidth, fuller, bodyTaperEnd],
  );

  return (
    <group position={position}>
      <mesh geometry={geo}>
        <meshStandardMaterial
          color={color}
          metalness={1.0}
          roughness={roughness}
          normalMap={BLADE_NORMAL_MAP}
          normalScale={BLADE_NORMAL_SCALE}
        />
      </mesh>
      {runes && (
        <Runes
          length={bladeLen}
          halfThick={BLADE_HALF_THICKNESS}
          bodyTaperEnd={bodyTaperEnd}
          halfWidth={halfWidth}
        />
      )}
    </group>
  );
}
