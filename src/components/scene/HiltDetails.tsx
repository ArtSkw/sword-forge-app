import { useEffect, useMemo } from 'react';
import type { ArchetypeKey, HardwareTone } from '../../store/configStore';
import { surface } from './surface';
import { HILT_DETAIL_RECIPES } from '../../presets/archetypeDetails';
import { turnedGeometry } from './turned';
import { GRIP_FLATTEN } from './Grip';

// The metal between the parts: a block where the guard sits on the blade, and a turned ferrule at each
// end of the grip (a chamfer, a bead and a lip), oval like the grip itself. All solids, no loose rings.

type HiltDetailsProps = {
  tone: HardwareTone;
  archetype: ArchetypeKey;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  roughness: number;
  guardY: number;
  gripTopY: number;
  gripBottomY: number;
  ferrules?: boolean;   // false for the Messer, whose scales run to the cap
};

// [radius, y] for a ferrule of half-height h and outer radius r; closed at both ends.
const ferrule = (r: number, h: number): [number, number][] => [
  [0, -h], [r * 0.9, -h], [r, -h * 0.55], [r + 0.0007, -h * 0.12], [r + 0.0007, h * 0.12], [r, h * 0.55], [r * 0.9, h], [0, h],
];
// The guard's central block: a short barrel with chamfered ends.
const block = (r: number, h: number): [number, number][] => [[0, -h], [r * 0.88, -h], [r, -h * 0.45], [r, h * 0.45], [r * 0.88, h], [0, h]];

export function HiltDetails({ ferrules = true, tone, archetype, color, emissive, emissiveIntensity, roughness, guardY, gripTopY, gripBottomY }: HiltDetailsProps) {
  // Brass and bronze age to a brown-green patina, iron and steel to rust.
  const fit = surface(tone === 'brass' || tone === 'bronze' ? 'copper' : 'iron');
  const r = HILT_DETAIL_RECIPES[archetype], h = r.spacerHeight * 0.7;
  const geos = useMemo(() => ({
    block: turnedGeometry(block((r.guardCollarRadiusTop + r.guardCollarRadiusBottom) / 2, r.guardCollarHeight * 0.36), { flatten: r.guardCollarScaleZ, segments: 64 }),
    top: turnedGeometry(ferrule(r.topSpacerRadiusBottom, h), { flatten: GRIP_FLATTEN, segments: 64, bevel: 0.0004 }),
    bottom: turnedGeometry(ferrule(r.bottomSpacerRadiusTop, h), { flatten: GRIP_FLATTEN, segments: 64, bevel: 0.0004 }),
  }), [r, h]);
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);
  const material = <meshStandardMaterial key={fit.key} {...fit.props} color={color} metalness={1} roughness={Math.max(0.32, roughness - 0.06)} emissive={emissive} emissiveIntensity={emissiveIntensity} />;
  return (
    <>
      <mesh geometry={geos.block} position={[0, guardY, 0]}>{material}</mesh>
      {ferrules && <mesh geometry={geos.top} position={[0, gripTopY - h, 0]}>{material}</mesh>}
      {ferrules && <mesh geometry={geos.bottom} position={[0, gripBottomY + h, 0]}>{material}</mesh>}
    </>
  );
}
