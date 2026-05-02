import * as THREE from 'three';
import { useMemo } from 'react';
import type { ArchetypeKey, GuardStyle } from '../../store/configStore';
import { getGuardTerminalRecipe } from '../../presets/archetypeDetails';

// Central slot height used by Sword.tsx for assembly positioning.
export const GUARD_HEIGHT = 0.018;

// Cross-section dimensions at the centre of the guard.
const SECTION_HALF_SPAN  = 0.009; // Y half-extent (blade direction)
const SECTION_HALF_REACH = 0.007; // Z half-extent (front-to-back depth)

// Normalized 8-point octagon (chamfered rectangle) in the YZ plane.
// Listed CCW when viewed from +X (the right-tip direction).
// [y_norm, z_norm] — will be scaled by SECTION_HALF_SPAN and SECTION_HALF_REACH.
const CF = 0.60; // chamfer fraction
const CROSS_SECTION: [number, number][] = [
  [-CF, -1], [ CF, -1],  // bottom face
  [ 1, -CF], [ 1,  CF],  // back face
  [ CF,  1], [-CF,  1],  // top face
  [-1,  CF], [-1, -CF],  // front face
];
const N_CS = CROSS_SECTION.length; // 8

interface GuardParams {
  width:    number; // total guard length
  tipScale: number; // cross-section scale at tip — <1 taper, >1 flare
  tipY:     number; // path Y offset at tip (positive = toward blade)
  tipZ:     number; // path Z offset at tip (positive = toward viewer)
  segments: number;
  sectionScale?: number;
}

const GUARD_PARAMS: Record<GuardStyle, GuardParams> = {
  // Chamfered bar, arms taper toward the ends.
  straight: { width: 0.220, tipScale: 0.60, tipY: 0,      tipZ: 0,      segments: 20 },
  // Same proportions; arms follow a parabolic curve upward toward the blade.
  curved:   { width: 0.220, tipScale: 0.62, tipY:  0.022, tipZ: 0,      segments: 24 },
  // Arms taper aggressively so the scroll terminals read as the visual endpoint.
  ornate:   { width: 0.220, tipScale: 0.20, tipY: 0,      tipZ: 0,      segments: 20 },
  // Wider, flared tips, double-axis sweep (upward + forward) for dramatic flair.
  fantasy:  { width: 0.260, tipScale: 1.25, tipY:  0.030, tipZ: 0.012,  segments: 28 },
};

const VIKING_GUARD_PARAMS: GuardParams = {
  width: 0.165,
  tipScale: 0.82,
  tipY: 0,
  tipZ: 0,
  segments: 18,
  sectionScale: 1.28,
};

const ARMING_GUARD_PARAMS: GuardParams = {
  width: 0.205,
  tipScale: 0.68,
  tipY: 0.010,
  tipZ: 0,
  segments: 22,
  sectionScale: 0.92,
};

const LONGSWORD_GUARD_PARAMS: GuardParams = {
  width: 0.238,
  tipScale: 0.56,
  tipY: 0.012,
  tipZ: 0,
  segments: 24,
  sectionScale: 0.96,
};

const BASTARD_GUARD_PARAMS: GuardParams = {
  width: 0.232,
  tipScale: 0.48,
  tipY: 0.029,
  tipZ: 0,
  segments: 26,
  sectionScale: 0.90,
};

const FALCHION_GUARD_PARAMS: GuardParams = {
  width: 0.206,
  tipScale: 0.52,
  tipY: 0.026,
  tipZ: 0,
  segments: 24,
  sectionScale: 0.88,
};

const ESTOC_GUARD_PARAMS: GuardParams = {
  width: 0.228,
  tipScale: 0.42,
  tipY: 0.006,
  tipZ: 0,
  segments: 24,
  sectionScale: 0.58,
};

const GREATSWORD_GUARD_PARAMS: GuardParams = {
  width: 0.285,
  tipScale: 0.50,
  tipY: 0.034,
  tipZ: 0,
  segments: 30,
  sectionScale: 1.04,
};

function getGuardParams(style: GuardStyle, archetype: ArchetypeKey): GuardParams {
  if (archetype === 'armingSword' && style === 'straight') {
    return ARMING_GUARD_PARAMS;
  }
  if (archetype === 'longsword' && style === 'straight') {
    return LONGSWORD_GUARD_PARAMS;
  }
  if (archetype === 'bastardSword' && style === 'curved') {
    return BASTARD_GUARD_PARAMS;
  }
  if (archetype === 'falchion' && style === 'curved') {
    return FALCHION_GUARD_PARAMS;
  }
  if (archetype === 'estoc' && style === 'straight') {
    return ESTOC_GUARD_PARAMS;
  }
  if (archetype === 'greatsword' && style === 'curved') {
    return GREATSWORD_GUARD_PARAMS;
  }
  if (archetype === 'vikingSword' && style === 'straight') {
    return VIKING_GUARD_PARAMS;
  }
  return GUARD_PARAMS[style];
}

// Onion/scroll finial profile for the ornate terminal (LatheGeometry, Y = axis).
const SCROLL_PROFILE = [
  new THREE.Vector2(0.000,  0),
  new THREE.Vector2(0.004,  0.003),
  new THREE.Vector2(0.009,  0.008),
  new THREE.Vector2(0.010,  0.013), // max width
  new THREE.Vector2(0.008,  0.018),
  new THREE.Vector2(0.010,  0.023), // scroll bump
  new THREE.Vector2(0.006,  0.027),
  new THREE.Vector2(0,      0.026),
];

function buildGuardGeometry(style: GuardStyle, archetype: ArchetypeKey): THREE.BufferGeometry {
  const { width, tipScale, tipY, tipZ, segments, sectionScale = 1 } = getGuardParams(style, archetype);

  const rings: THREE.Vector3[][] = [];

  for (let i = 0; i <= segments; i++) {
    const t  = i / segments;
    const x  = (t - 0.5) * width;
    const u  = Math.abs(2 * t - 1);  // 0 at centre, 1 at tips
    const u2 = u * u;

    const py = tipY * u2;
    const pz = tipZ * u2;
    const sc = 1.0 - u * (1.0 - tipScale);
    const sy = SECTION_HALF_SPAN  * sectionScale * sc;
    const sz = SECTION_HALF_REACH * sectionScale * sc;

    const ring = CROSS_SECTION.map(([yn, zn]) =>
      new THREE.Vector3(x, py + yn * sy, pz + zn * sz)
    );
    rings.push(ring);
  }

  const positions: number[] = [];
  const indexArr:  number[] = [];

  for (const ring of rings) {
    for (const v of ring) positions.push(v.x, v.y, v.z);
  }

  // Cap centres (centroid of each end ring)
  const leftCapIdx = positions.length / 3;
  const lc = rings[0]
    .reduce((a, v) => a.clone().add(v), new THREE.Vector3())
    .divideScalar(N_CS);
  positions.push(lc.x, lc.y, lc.z);

  const rightCapIdx = positions.length / 3;
  const rc = rings[segments]
    .reduce((a, v) => a.clone().add(v), new THREE.Vector3())
    .divideScalar(N_CS);
  positions.push(rc.x, rc.y, rc.z);

  // Side quads — winding (a,b,c),(b,d,c) gives outward normals
  // for a cross-section that is CCW when viewed from +X.
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < N_CS; j++) {
      const j1 = (j + 1) % N_CS;
      const a = i * N_CS + j;
      const b = i * N_CS + j1;
      const c = (i + 1) * N_CS + j;
      const d = (i + 1) * N_CS + j1;
      indexArr.push(a, b, c);
      indexArr.push(b, d, c);
    }
  }

  // Left cap — normal faces −X → winding (cap, j1, j)
  for (let j = 0; j < N_CS; j++) {
    indexArr.push(leftCapIdx, (j + 1) % N_CS, j);
  }

  // Right cap — normal faces +X → winding (cap, j, j1)
  const rightBase = segments * N_CS;
  for (let j = 0; j < N_CS; j++) {
    indexArr.push(rightCapIdx, rightBase + j, rightBase + (j + 1) % N_CS);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indexArr);
  geo.computeVertexNormals();
  return geo;
}

type CrossguardProps = {
  archetype: ArchetypeKey;
  style: GuardStyle;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  roughness: number;
  position: [number, number, number];
};

export function Crossguard({ archetype, style, color, emissive, emissiveIntensity, roughness, position }: CrossguardProps) {
  const params = getGuardParams(style, archetype);
  const geo    = useMemo(() => buildGuardGeometry(style, archetype), [style, archetype]);
  const halfW  = params.width / 2;
  const terminalY = params.tipY;
  const terminalZ = params.tipZ;
  const terminal = getGuardTerminalRecipe(archetype, style);

  return (
    <group position={position}>
      <mesh geometry={geo}>
        <meshStandardMaterial color={color} metalness={1.0} roughness={roughness} emissive={emissive} emissiveIntensity={emissiveIntensity} />
      </mesh>

      {style === 'ornate' && (
        <>
          <mesh position={[-halfW, 0, 0]} rotation={[0, 0,  Math.PI / 2]}>
            <latheGeometry args={[SCROLL_PROFILE, 20]} />
            <meshStandardMaterial color={color} metalness={1.0} roughness={Math.max(0.32, roughness - 0.04)} emissive={emissive} emissiveIntensity={emissiveIntensity} />
          </mesh>
          <mesh position={[ halfW, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <latheGeometry args={[SCROLL_PROFILE, 20]} />
            <meshStandardMaterial color={color} metalness={1.0} roughness={Math.max(0.32, roughness - 0.04)} emissive={emissive} emissiveIntensity={emissiveIntensity} />
          </mesh>
        </>
      )}
      {terminal.kind !== 'none' && style !== 'ornate' && (
        <>
          <mesh
            position={[-halfW, terminalY, terminalZ]}
            scale={[terminal.scaleX ?? 0.72, terminal.scaleY ?? 1, 1]}
            rotation={terminal.kind === 'disc' ? [0, 0, Math.PI / 2] : [0, 0, 0]}
          >
            {terminal.kind === 'disc' ? (
              <cylinderGeometry args={[terminal.radius ?? 0.01, terminal.radius ?? 0.01, terminal.depth ?? 0.004, 24]} />
            ) : (
              <sphereGeometry args={[terminal.radius ?? 0.01, 24, 12]} />
            )}
            <meshStandardMaterial color={color} metalness={1.0} roughness={Math.max(0.32, roughness - 0.04)} emissive={emissive} emissiveIntensity={emissiveIntensity} />
          </mesh>
          <mesh
            position={[halfW, terminalY, terminalZ]}
            scale={[terminal.scaleX ?? 0.72, terminal.scaleY ?? 1, 1]}
            rotation={terminal.kind === 'disc' ? [0, 0, Math.PI / 2] : [0, 0, 0]}
          >
            {terminal.kind === 'disc' ? (
              <cylinderGeometry args={[terminal.radius ?? 0.01, terminal.radius ?? 0.01, terminal.depth ?? 0.004, 24]} />
            ) : (
              <sphereGeometry args={[terminal.radius ?? 0.01, 24, 12]} />
            )}
            <meshStandardMaterial color={color} metalness={1.0} roughness={Math.max(0.32, roughness - 0.04)} emissive={emissive} emissiveIntensity={emissiveIntensity} />
          </mesh>
        </>
      )}
    </group>
  );
}
