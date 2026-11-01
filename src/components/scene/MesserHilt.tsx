import * as THREE from 'three';
import { useEffect, useMemo } from 'react';
import type { GripMaterial, MesserCap } from '../../store/configStore';
import { surface } from './surface';
import { turnedGeometry } from './turned';
import { MESSER_CAP_HALF } from './swordLayout';
import { woodTexture } from './gripTextures';

// The Messer's knife hilt (KHM A 123, A 173): two wooden scales riveted to a flat tang that shows as a
// thin steel line along both narrow edges, a lug (Nagel) on the cross guarding the knuckles, and a metal
// cap over the end, plain or bent into a bird's beak toward the edge. The grip widens toward the cap.

const SCALE_POWER = 2.8;            // rounded-rectangle section
const RIVETS = 3;

type Props = {
  gripTopY: number;
  gripBottomY: number;
  guardY: number;
  cap: MesserCap;
  material: GripMaterial;
  color: string;
  roughness: number;
  metal: { color: string; roughness: number; tone: 'iron' | 'copper' };
};

const half = (t: number) => ({ w: 0.0158 - 0.0034 * t, z: 0.0104 - 0.0016 * t });   // t = 0 at the cap, 1 at the guard

// A swept body of rounded-rectangle section from y0 to y1; `grow` widens the section (for the tang).
function sweep(y0: number, y1: number, grow: { w: number; z: number; zAbs?: number; atT?: number; edge?: boolean }) {
  const rows = 80, around = 72, positions: number[] = [], index: number[] = [];
  for (let i = 0; i <= rows; i++) {
    const t = i / rows, y = y0 + (y1 - y0) * t, h = half(grow.atT ?? t);
    // edge: a rounded lower edge (the cap's end), easing the section in over the first fifth.
    const k = grow.edge && t < 0.2 ? 0.86 + 0.14 * Math.sin((t / 0.2) * Math.PI / 2) : 1;
    const w = (h.w + grow.w) * k, z = (grow.zAbs ?? h.z + grow.z) * k;
    for (let j = 0; j <= around; j++) {
      const a = (j / around) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      positions.push(w * Math.sign(c) * Math.abs(c) ** (2 / SCALE_POWER), y, z * Math.sign(s) * Math.abs(s) ** (2 / SCALE_POWER));
    }
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < around; j++) {
    const a = i * (around + 1) + j, b = a + 1, c = a + around + 1, d = c + 1;
    index.push(a, c, b, b, c, d);
  }
  // Close both ends.
  const bottom = positions.length / 3; positions.push(0, y0, 0);
  const top = bottom + 1; positions.push(0, y1, 0);
  for (let j = 0; j < around; j++) {
    index.push(bottom, j, j + 1);
    index.push(top, rows * (around + 1) + j + 1, rows * (around + 1) + j);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

// The bird's-beak cap in side view (x across the grip, edge side +x), extruded through the grip's depth.
function beakCap(w: number, depth: number) {
  const s = new THREE.Shape();
  s.moveTo(-w, 0.006);
  s.lineTo(w, 0.006);
  s.lineTo(w, 0.0005);
  s.bezierCurveTo(w + 0.006, -0.0005, w + 0.012, -0.004, w + 0.0145, -0.0125);   // beak, bent toward the edge
  s.quadraticCurveTo(w + 0.0085, -0.0105, w + 0.003, -0.0102);
  s.quadraticCurveTo(0, -0.0098, -w * 0.55, -0.0088);
  s.quadraticCurveTo(-w, -0.0078, -w, -0.004);
  s.closePath();
  const bevel = 0.0016;
  const geo = new THREE.ExtrudeGeometry(s, { depth: depth - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: 0.0012, bevelSegments: 5, curveSegments: 24 });
  geo.translate(0, 0, -(depth - 2 * bevel) / 2);
  geo.computeVertexNormals();
  return geo;
}

export function MesserHilt({ gripTopY, gripBottomY, guardY, cap, material, color, roughness, metal }: Props) {
  const len = gripTopY - gripBottomY;
  const geos = useMemo(() => {
    const end = half(0);
    return {
      scales: sweep(gripBottomY, gripTopY, { w: 0, z: 0 }),
      tang: sweep(gripBottomY + 0.001, gripTopY, { w: 0.0004, z: 0, zAbs: 0.0021 }),
      rivet: new THREE.SphereGeometry(0.0027, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      cap: cap === 'beak'
        ? beakCap(end.w + 0.0006, 2 * (end.z + 0.0009))
        : sweep(-0.0072, 0.0062, { w: 0.0009, z: 0.0009, atT: 0, edge: true }),
      nagel: turnedGeometry([[0, 0], [0.0046, 0], [0.0041, 0.0055], [0.0029, 0.0102], [0.0034, 0.0122], [0, 0.0138]], { axis: 'z', segments: 48, bevel: 0.0004 }),
    };
  }, [gripBottomY, gripTopY, cap]);
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);

  const steel = surface(metal.tone), leather = surface('leather'), wood = surface('wood');
  const metalMat = <meshStandardMaterial key={steel.key} {...steel.props} color={metal.color} metalness={1} roughness={metal.roughness} />;
  const scaleMat = material === 'leather'
    ? <meshStandardMaterial key={leather.key} {...leather.props} color={color} metalness={0} roughness={roughness} />
    : <meshStandardMaterial key={wood.key} {...wood.props} map={woodTexture()} color={material === 'wood' ? color : '#c9ab8a'} metalness={0} roughness={Math.max(0.4, roughness - 0.25)} />;
  const rivets = Array.from({ length: RIVETS }, (_, k) => {
    const t = 0.18 + (k / (RIVETS - 1)) * 0.64;
    return { y: gripBottomY + t * len, z: half(t).z - 0.0004 };
  });
  return (
    <group>
      <mesh geometry={geos.scales}>{scaleMat}</mesh>
      <mesh geometry={geos.tang}>{metalMat}</mesh>
      {rivets.flatMap((r, k) => [1, -1].map((side) => (
        <mesh key={`${k}${side}`} geometry={geos.rivet} position={[0, r.y, side * r.z]} rotation={[side * Math.PI / 2, 0, 0]}>{metalMat}</mesh>
      )))}
      <mesh geometry={geos.cap} position={[0, gripBottomY - MESSER_CAP_HALF + 0.0065, 0]}>{metalMat}</mesh>
      <mesh geometry={geos.nagel} position={[0, guardY, 0.0058]}>{metalMat}</mesh>
    </group>
  );
}
