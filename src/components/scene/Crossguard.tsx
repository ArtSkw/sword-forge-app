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

// Cross-section: a rectangle with rounded corners (an arc of CORNER_STEPS per corner), so each long face
// stays flat and every arris catches a thin line of light. Listed CCW seen from +X, in [y, z].
const CORNER_FRACTION = 0.32;   // corner radius as a share of the smaller half-extent
const CORNER_STEPS = 4;
function section(sy: number, sz: number): [number, number][] {
  const r = Math.min(sy, sz) * CORNER_FRACTION, pts: [number, number][] = [];
  const centres: [number, number, number][] = [[sy - r, -(sz - r), -Math.PI / 2], [sy - r, sz - r, 0], [-(sy - r), sz - r, Math.PI / 2], [-(sy - r), -(sz - r), Math.PI]];
  for (const [cy, cz, a0] of centres) {
    for (let k = 0; k <= CORNER_STEPS; k++) { const a = a0 + (k / CORNER_STEPS) * (Math.PI / 2); pts.push([cy + r * Math.cos(a), cz + r * Math.sin(a)]); }
  }
  return pts;
}
const N_CS = 4 * (CORNER_STEPS + 1);
// The arm ends are domed: a few shrinking rings past each tip before the end cap.
const END_RINGS = [0.45, 0.75, 0.93];
// Engraving runs along the arms: u in tiles along the guard, v across the face (0–1 from edge to edge).
const ENGRAVE_TILE = 0.028;   // m per repeat: matches the scroll band's 1.5 : 1 proportion on an 18 mm face

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
  const steps = segments * 3;
  const engraveUv: number[] = [];
  const ringAt = (x: number, py: number, pz: number, sy: number, sz: number) =>
    section(sy, sz).map(([y, z]) => { engraveUv.push(x / ENGRAVE_TILE, 0.5 + 0.5 * (y / sy)); return new THREE.Vector3(x, py + y, pz + z); });

  const rings: THREE.Vector3[][] = [];
  const tip = (side: -1 | 1) => {
    const sy = SECTION_HALF_SPAN * sectionScale * tipScale, sz = SECTION_HALF_REACH * sectionScale * tipScale, len = Math.min(sy, sz) * 0.9;
    // Built in the order the rings are laid (left end: outermost first), so the engraving coordinates line up.
    return (side < 0 ? [...END_RINGS].reverse() : END_RINGS).map((k) => ringAt(side * (width / 2 + k * len), tipY, tipZ, sy * Math.sqrt(1 - k * k), sz * Math.sqrt(1 - k * k)));
  };
  rings.push(...tip(-1));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, x = (t - 0.5) * width, u = Math.abs(2 * t - 1), u2 = u * u;
    const sc = 1.0 - u * (1.0 - tipScale);
    rings.push(ringAt(x, tipY * u2, tipZ * u2, SECTION_HALF_SPAN * sectionScale * sc, SECTION_HALF_REACH * sectionScale * sc));
  }
  rings.push(...tip(1));

  const positions: number[] = [], normals: number[] = [], index: number[] = [];
  const around = new THREE.Vector3(), along = new THREE.Vector3(), n = new THREE.Vector3(), c = new THREE.Vector3();
  rings.forEach((ring, i) => {
    c.set(0, 0, 0); ring.forEach((v) => c.add(v)); c.divideScalar(N_CS);
    ring.forEach((v, j) => {
      around.subVectors(ring[(j + 1) % N_CS], ring[(j - 1 + N_CS) % N_CS]);
      along.subVectors(rings[Math.min(rings.length - 1, i + 1)][j], rings[Math.max(0, i - 1)][j]);
      n.crossVectors(around, along).normalize();
      // The section is convex: point the normal away from the ring's centre.
      if (n.y * (v.y - c.y) + n.z * (v.z - c.z) < 0) n.negate();
      positions.push(v.x, v.y, v.z); normals.push(n.x, n.y, n.z);
    });
  });
  const last = rings.length - 1;
  for (let i = 0; i < last; i++) {
    for (let j = 0; j < N_CS; j++) {
      const j1 = (j + 1) % N_CS, a = i * N_CS + j, b = i * N_CS + j1, cc = (i + 1) * N_CS + j, d = (i + 1) * N_CS + j1;
      index.push(a, b, cc, b, d, cc);
    }
  }
  // End caps close the domes.
  const capL = positions.length / 3, l = rings[0][0];
  positions.push(l.x - 0.0004, tipY, tipZ); normals.push(-1, 0, 0);
  const capR = capL + 1, r0 = rings[last][0];
  positions.push(r0.x + 0.0004, tipY, tipZ); normals.push(1, 0, 0);
  engraveUv.push(0, 0.5, 0, 0.5);
  for (let j = 0; j < N_CS; j++) {
    index.push(capL, (j + 1) % N_CS, j);
    index.push(capR, last * N_CS + j, last * N_CS + (j + 1) % N_CS);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('engraveUv', new THREE.Float32BufferAttribute(engraveUv, 2));
  geo.setIndex(index);
  geo.computeBoundingSphere();
  return geo;
}

type CrossguardProps = {
  tone: HardwareTone;
  engraved?: boolean;
  archetype: ArchetypeKey;
  style: GuardStyle;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  roughness: number;
  position: [number, number, number];
};

export function Crossguard({ tone, engraved, archetype, style, color, emissive, emissiveIntensity, roughness, position }: CrossguardProps) {
  // Brass and bronze age to a brown-green patina, iron and steel to rust.
  const metal = tone === 'brass' || tone === 'bronze' ? 'copper' : 'iron';
  const fit = surface(metal);
  // An engraved guard carries a running scroll along the faces of its arms.
  const bar = engraved ? surface(metal, { kind: 'guard' }) : fit;
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
        <meshStandardMaterial key={bar.key} {...bar.props} color={color} metalness={1.0} roughness={roughness} emissive={emissive} emissiveIntensity={emissiveIntensity} />
      </mesh>

      {style === 'ornate' && (
        <>
          <mesh position={[-halfW, 0, 0]} rotation={[0, 0,  Math.PI / 2]}>
            <latheGeometry args={[SCROLL_PROFILE, 64]} />
            <meshStandardMaterial key={fit.key} {...fit.props} color={color} metalness={1.0} roughness={Math.max(0.32, roughness - 0.04)} emissive={emissive} emissiveIntensity={emissiveIntensity} />
          </mesh>
          <mesh position={[ halfW, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <latheGeometry args={[SCROLL_PROFILE, 64]} />
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
              <cylinderGeometry args={[terminal.radius ?? 0.01, terminal.radius ?? 0.01, terminal.depth ?? 0.004, 64]} />
            ) : (
              <sphereGeometry args={[terminal.radius ?? 0.01, 48, 32]} />
            )}
            <meshStandardMaterial key={fit.key} {...fit.props} color={color} metalness={1.0} roughness={Math.max(0.32, roughness - 0.04)} emissive={emissive} emissiveIntensity={emissiveIntensity} />
          </mesh>
          <mesh
            position={[halfW, terminalY, terminalZ]}
            scale={[terminal.scaleX ?? 0.72, terminal.scaleY ?? 1, 1]}
            rotation={terminal.kind === 'disc' ? [0, 0, Math.PI / 2] : [0, 0, 0]}
          >
            {terminal.kind === 'disc' ? (
              <cylinderGeometry args={[terminal.radius ?? 0.01, terminal.radius ?? 0.01, terminal.depth ?? 0.004, 64]} />
            ) : (
              <sphereGeometry args={[terminal.radius ?? 0.01, 48, 32]} />
            )}
            <meshStandardMaterial key={fit.key} {...fit.props} color={color} metalness={1.0} roughness={Math.max(0.32, roughness - 0.04)} emissive={emissive} emissiveIntensity={emissiveIntensity} />
          </mesh>
        </>
      )}
    </group>
  );
}
