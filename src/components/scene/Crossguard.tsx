import type { ArchetypeKey, GuardStyle, HardwareTone } from '../../store/configStore';
import { surface } from './surface';
import * as THREE from 'three';
import { useEffect, useMemo } from 'react';
import { getGuardTerminalRecipe } from '../../presets/archetypeDetails';
import { getGuardParams } from '../../presets/guardShapes';

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
  tone: HardwareTone;
  archetype: ArchetypeKey;
  style: GuardStyle;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  roughness: number;
  position: [number, number, number];
};

export function Crossguard({ tone, archetype, style, color, emissive, emissiveIntensity, roughness, position }: CrossguardProps) {
  // Brass and bronze age to a brown-green patina, iron and steel to rust.
  const fit = surface(tone === 'brass' || tone === 'bronze' ? 'copper' : 'iron');
  const params = getGuardParams(style, archetype);
  const geo    = useMemo(() => buildGuardGeometry(style, archetype), [style, archetype]);
  // Geometry passed via prop is not owned by R3F, so release the old one ourselves.
  useEffect(() => () => geo.dispose(), [geo]);
  const halfW  = params.width / 2;
  const terminalY = params.tipY;
  const terminalZ = params.tipZ;
  const terminal = getGuardTerminalRecipe(archetype, style);

  return (
    <group position={position}>
      <mesh geometry={geo}>
        <meshStandardMaterial key={fit.key} {...fit.props} color={color} metalness={1.0} roughness={roughness} emissive={emissive} emissiveIntensity={emissiveIntensity} />
      </mesh>

      {style === 'ornate' && (
        <>
          <mesh position={[-halfW, 0, 0]} rotation={[0, 0,  Math.PI / 2]}>
            <latheGeometry args={[SCROLL_PROFILE, 20]} />
            <meshStandardMaterial key={fit.key} {...fit.props} color={color} metalness={1.0} roughness={Math.max(0.32, roughness - 0.04)} emissive={emissive} emissiveIntensity={emissiveIntensity} />
          </mesh>
          <mesh position={[ halfW, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <latheGeometry args={[SCROLL_PROFILE, 20]} />
            <meshStandardMaterial key={fit.key} {...fit.props} color={color} metalness={1.0} roughness={Math.max(0.32, roughness - 0.04)} emissive={emissive} emissiveIntensity={emissiveIntensity} />
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
            <meshStandardMaterial key={fit.key} {...fit.props} color={color} metalness={1.0} roughness={Math.max(0.32, roughness - 0.04)} emissive={emissive} emissiveIntensity={emissiveIntensity} />
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
            <meshStandardMaterial key={fit.key} {...fit.props} color={color} metalness={1.0} roughness={Math.max(0.32, roughness - 0.04)} emissive={emissive} emissiveIntensity={emissiveIntensity} />
          </mesh>
        </>
      )}
    </group>
  );
}
