import type { ArchetypeKey, GuardStyle, GuardTerminal, HardwareTone } from '../../store/configStore';
import { surface } from './surface';
import * as THREE from 'three';
import { useEffect, useMemo } from 'react';
import { turnedGeometry } from './turned';
import { guardDef, type GuardDef } from '../../presets/guardShapes';

// Central slot height used by Sword.tsx for assembly positioning.
export const GUARD_HEIGHT = 0.018;


// Cross-section: a rectangle with rounded corners (an arc of CORNER_STEPS per corner), so each long face
// stays flat and every arris catches a thin line of light. Listed CCW seen from +X, in [y, z].
const CORNER_FRACTION = 0.32;   // corner radius as a share of the smaller half-extent
const CORNER_STEPS = 4;
function section(sy: number, sz: number, round = CORNER_FRACTION): [number, number][] {
  const r = Math.min(sy, sz) * Math.min(0.999, round), pts: [number, number][] = [];
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

// Turned (baluster) finial for an arm tip of 6 mm half-section, as [radius, along the arm]: a neck, a bead,
// a swelling bulb and a small button. Scaled to the arm's real tip and turned around the arm (axis X).
const FINIAL_PROFILE: [number, number][] = [
  [0, 0], [0.0058, 0], [0.0048, 0.002], [0.0072, 0.0042], [0.0072, 0.0056], [0.0046, 0.0074],
  [0.0068, 0.0108], [0.0092, 0.0148], [0.0086, 0.0186], [0.0052, 0.0216], [0.0036, 0.0232], [0.0042, 0.0246], [0, 0.0262],
];

const FLARE = 1.5, HOOK = 0.017;
const ease2 = (a: number, b: number, x: number) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k; };
// Where an arm is at u (0 centre, 1 tip) on side ±1: its bend toward the blade and its front-back offset.
const bendAt = (d: GuardDef, u: number) => (d.linear ? d.tipY * u : d.tipY * u * u);
const recurveAt = (d: GuardDef, u: number, side: number) => side * (d.recurve ?? 0) * u * u;

/** Where the arm ends and how thick it is there (for placing terminals). */
function armEnd(d: GuardDef, terminal: GuardTerminal) {
  const flare = terminal === 'flared' ? 1 + FLARE : 1;
  return { x: d.width / 2, y: bendAt(d, 1) + (terminal === 'hooked' ? HOOK : 0), z: d.recurve ?? 0, sy: d.secY * d.tipScale * flare, sz: d.secZ * d.tipScale * (terminal === 'flared' ? 0.7 : 1) };
}

function buildGuardGeometry(d: GuardDef, terminal: GuardTerminal): THREE.BufferGeometry {
  const { width, tipScale } = d, steps = 72;
  const flared = terminal === 'flared', hooked = terminal === 'hooked';
  // Spatulate ends broaden in the blade's direction and thin front to back; hooked ends turn toward the blade.
  const flareAt = (u: number) => (flared ? ease2(0.62, 1, u) : 0);
  const hookAt = (u: number) => (hooked ? HOOK * ease2(0.84, 1, u) : 0);
  const engraveUv: number[] = [];
  const ringAt = (x: number, py: number, pz: number, sy: number, sz: number) =>
    section(sy, sz, d.round).map(([y, z]) => { engraveUv.push(x / ENGRAVE_TILE, 0.5 + 0.5 * (y / sy)); return new THREE.Vector3(x, py + y, pz + z); });

  const rings: THREE.Vector3[][] = [];
  const tip = (side: -1 | 1) => {
    const sy = d.secY * tipScale * (1 + FLARE * flareAt(1)), sz = d.secZ * tipScale * (1 - 0.3 * flareAt(1)), len = Math.min(sy, sz) * 0.9;
    const ty = bendAt(d, 1) + hookAt(1), tz = recurveAt(d, 1, side);
    // Built in the order the rings are laid (left end: outermost first), so the engraving coordinates line up.
    return (side < 0 ? [...END_RINGS].reverse() : END_RINGS).map((k) => ringAt(side * (width / 2 + k * len), ty, tz, sy * Math.sqrt(1 - k * k), sz * Math.sqrt(1 - k * k)));
  };
  rings.push(...tip(-1));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, x = (t - 0.5) * width, u = Math.abs(2 * t - 1), side = t < 0.5 ? -1 : 1;
    const sc = 1.0 - u * (1.0 - tipScale), fl = flareAt(u);
    rings.push(ringAt(x, bendAt(d, u) + hookAt(u), recurveAt(d, u, side), d.secY * sc * (1 + FLARE * fl), d.secZ * sc * (1 - 0.3 * fl)));
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
  positions.push(l.x - 0.0004, l.y - rings[0][0].y + rings[0].reduce((a, v) => a + v.y, 0) / N_CS, rings[0].reduce((a, v) => a + v.z, 0) / N_CS); normals.push(-1, 0, 0);
  const capR = capL + 1, r0 = rings[last][0];
  positions.push(r0.x + 0.0004, rings[last].reduce((a, v) => a + v.y, 0) / N_CS, rings[last].reduce((a, v) => a + v.z, 0) / N_CS); normals.push(1, 0, 0);
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
  terminal: GuardTerminal;
  ecusson: boolean;
  rings: 0 | 1 | 2;
  archetype: ArchetypeKey;
  style: GuardStyle;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  roughness: number;
  position: [number, number, number];
};

// A quatrefoil plate: four overlapping lobes, extruded with a bevel (the plane of the blade's flat).
function quatrefoil(r: number, depth: number): THREE.BufferGeometry {
  const shape = new THREE.Shape(), steps = 96;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2, rr = r * (0.72 + 0.28 * Math.abs(Math.cos(2 * a)) ** 0.6);
    const p = [Math.cos(a) * rr, Math.sin(a) * rr] as const;
    if (i === 0) shape.moveTo(p[0], p[1]); else shape.lineTo(p[0], p[1]);
  }
  const bevel = Math.min(0.0012, depth * 0.3);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: depth - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 3 });
  geo.translate(0, 0, -(depth - 2 * bevel) / 2);
  geo.computeVertexNormals();
  return geo;
}

// Écusson: a leaf-shaped plate rising from the cross over the blade, one on each face.
function ecusson(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.012, 0);
  shape.bezierCurveTo(-0.012, 0.012, -0.006, 0.022, 0, 0.03);
  shape.bezierCurveTo(0.006, 0.022, 0.012, 0.012, 0.012, 0);
  shape.lineTo(-0.012, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.0008, bevelEnabled: true, bevelThickness: 0.0004, bevelSize: 0.0006, bevelSegments: 3, curveSegments: 24 });
  geo.computeVertexNormals();
  return geo;
}

export function Crossguard({ tone, engraved, archetype, style, terminal, ecusson: withEcusson, rings, color, emissive, emissiveIntensity, roughness, position }: CrossguardProps) {
  // Brass and bronze age to a brown-green patina, iron and steel to rust.
  const metal = tone === 'brass' || tone === 'bronze' ? 'copper' : 'iron';
  const fit = surface(metal);
  // An engraved guard carries a running scroll along the faces of its arms.
  const bar = engraved ? surface(metal, { kind: 'guard' }) : fit;
  const def = useMemo(() => guardDef(style, archetype), [style, archetype]);
  const geo = useMemo(() => buildGuardGeometry(def, terminal), [def, terminal]);
  const end = armEnd(def, terminal);
  const tipR = Math.max(end.sy, end.sz);
  const parts = useMemo(() => ({
    knob: terminal === 'knob' ? new THREE.SphereGeometry(Math.max(0.0068, tipR * 1.45), 64, 40) : null,
    finial: terminal === 'finial' ? turnedGeometry(FINIAL_PROFILE.map(([r, y]) => [r * (tipR / 0.006), y * (tipR / 0.006)] as [number, number]), { axis: 'x', segments: 64 }) : null,
    foil: terminal === 'quatrefoil' ? quatrefoil(tipR * 2.1, end.sz * 1.6) : null,
    ecusson: withEcusson ? ecusson() : null,
    ring: rings ? new THREE.TorusGeometry(0.022, 0.0023, 20, 96) : null,
  }), [terminal, tipR, end.sz, withEcusson, rings]);
  useEffect(() => () => geo.dispose(), [geo]);
  useEffect(() => () => Object.values(parts).forEach((g) => g?.dispose()), [parts]);

  const mat = <meshStandardMaterial key={fit.key} {...fit.props} color={color} metalness={1.0} roughness={Math.max(0.32, roughness - 0.04)} emissive={emissive} emissiveIntensity={emissiveIntensity} />;
  const ends = [-1, 1] as const;
  // Side rings lean out in front of the cross toward the blade, their lower edge on the guard block.
  const tilt = 0.7, ringC = (side: 1 | -1) => [0, 0.022 * Math.cos(tilt), side * (0.0075 + 0.022 * Math.sin(tilt))] as [number, number, number];
  return (
    <group position={position}>
      <mesh geometry={geo}>
        <meshStandardMaterial key={bar.key} {...bar.props} color={color} metalness={1.0} roughness={roughness} emissive={emissive} emissiveIntensity={emissiveIntensity} />
      </mesh>
      {ends.map((side) => (
        <group key={side} position={[side * end.x, end.y, end.z]}>
          {parts.knob && <mesh geometry={parts.knob} position={[side * Math.max(0.0068, tipR * 1.45) * 0.75, 0, 0]} scale={[1, 1, end.sz / end.sy > 0.9 ? 1 : 0.85]}>{mat}</mesh>}
          {parts.finial && <mesh geometry={parts.finial} rotation={[0, side < 0 ? Math.PI : 0, 0]}>{mat}</mesh>}
          {parts.foil && <mesh geometry={parts.foil} position={[side * tipR * 1.7, 0, 0]}>{mat}</mesh>}
        </group>
      ))}
      {parts.ecusson && [1, -1].map((side) => (
        <mesh key={side} geometry={parts.ecusson!} position={[0, GUARD_HEIGHT * 0.3, side * 0.0066]} rotation={[0, side < 0 ? Math.PI : 0, 0]}>{mat}</mesh>
      ))}
      {parts.ring && ([1, -1] as const).slice(0, rings).map((side) => (
        <mesh key={side} geometry={parts.ring!} position={ringC(side)} rotation={[side * tilt, 0, 0]}>{mat}</mesh>
      ))}
    </group>
  );
}
