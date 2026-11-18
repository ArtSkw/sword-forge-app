import { useEffect, useMemo } from 'react';
import type { ArchetypeKey, HardwareTone } from '../../store/configStore';
import { surface } from './surface';
import { HILT_DETAIL_RECIPES, ferruleHalfHeight, getGripDetailRecipe, guardBlock } from '../../presets/archetypeDetails';
import type { GuardDef } from '../../presets/guardShapes';
import { turnedGeometry } from './turned';
import { GRIP_FLATTEN } from './Grip';
import { gripEndReach } from './gripForm';

// The metal between the parts: a block where the guard sits on the blade, and a turned ferrule at each
// end of the grip (a chamfer, a bead and a lip), oval like the grip itself. All solids, no loose rings.

type HiltDetailsProps = {
  tone: HardwareTone;
  archetype: ArchetypeKey;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  roughness: number;
  guard: GuardDef;      // the cross on this sword (fitted to the blade): the block is sized against its section
  guardY: number;
  gripTopY: number;
  gripBottomY: number;
  ferrules?: boolean;   // false for the Messer, whose scales run to the cap
  topFerrule?: boolean; // false where the grip runs straight into the cross
};

// [radius, y] for a ferrule of half-height h and outer radius r; closed at both ends.
const MOUTH = 0.9;   // the ends are chamfered to this share of the radius
const ferrule = (r: number, h: number): [number, number][] => [
  [0, -h], [r * MOUTH, -h], [r, -h * 0.55], [r + 0.0007, -h * 0.12], [r + 0.0007, h * 0.12], [r, h * 0.55], [r * MOUTH, h], [0, h],
];
// A ferrule closes over the grip with this much to spare, even at its chamfered mouth, whatever the grip's
// shape and wrap (the grip's own ends sit inside the ferrules: see Sword).
const FERRULE_CLEAR = 0.0003;
const ferruleRadius = (archetype: ArchetypeKey, end: 'top' | 'bottom', own: number) =>
  Math.max(own, (gripEndReach(archetype, end) + FERRULE_CLEAR) / MOUTH);
// The guard's central block: a short barrel with chamfered ends, from `bottom` below the cross's centre line
// to h above it (the same depth of chamfer at both ends).
const block = (r: number, h: number, bottom: number): [number, number][] => [[0, -bottom], [r * 0.88, -bottom], [r, -bottom + h * 0.55], [r, h * 0.45], [r * 0.88, h], [0, h]];

export function HiltDetails({ ferrules = true, topFerrule = true, tone, archetype, color, emissive, emissiveIntensity, roughness, guard, guardY, gripTopY, gripBottomY }: HiltDetailsProps) {
  // Brass and bronze age to a brown-green patina, iron and steel to rust.
  // Turned parts are cleaner than the forged guard: the tone's marks at × 0.7.
  const fit = surface(tone === 'brass' || tone === 'bronze' ? 'copper' : 'iron', undefined, undefined, { quiet: true });
  const r = HILT_DETAIL_RECIPES[archetype], h = ferruleHalfHeight(archetype);
  const b = guardBlock(archetype, guard);
  // Oval like the grip, and as broad as the grip across the blade's plane (the Viking grip).
  const sectionX = getGripDetailRecipe(archetype).sectionX ?? 1;
  const geos = useMemo(() => ({
    block: b.shown ? turnedGeometry(block(b.radius, b.halfHeight, b.bottom), { flatten: b.flatten, segments: 64 }) : null,
    top: turnedGeometry(ferrule(ferruleRadius(archetype, 'top', r.topSpacerRadiusBottom), h), { flatten: GRIP_FLATTEN, segments: 64, bevel: 0.0004 }),
    bottom: turnedGeometry(ferrule(ferruleRadius(archetype, 'bottom', r.bottomSpacerRadiusTop), h), { flatten: GRIP_FLATTEN, segments: 64, bevel: 0.0004 }),
  }), [archetype, r, h, b.shown, b.radius, b.halfHeight, b.bottom, b.flatten]);
  useEffect(() => () => Object.values(geos).forEach((g) => g?.dispose()), [geos]);
  const material = <meshStandardMaterial key={fit.key} {...fit.props} color={color} metalness={1} roughness={roughness} emissive={emissive} emissiveIntensity={emissiveIntensity} />;
  return (
    <>
      {geos.block && <mesh geometry={geos.block} position={[0, guardY, 0]}>{material}</mesh>}
      {ferrules && topFerrule && <mesh geometry={geos.top} position={[0, gripTopY - h, 0]} scale={[sectionX, 1, 1]}>{material}</mesh>}
      {ferrules && <mesh geometry={geos.bottom} position={[0, gripBottomY + h, 0]} scale={[sectionX, 1, 1]}>{material}</mesh>}
    </>
  );
}
