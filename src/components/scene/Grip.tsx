import * as THREE from 'three';
import { useMemo } from 'react';
import type { ArchetypeKey, GripLength } from '../../store/configStore';
import { getGripDetailRecipe } from '../../presets/archetypeDetails';

export const GRIP_LENGTHS: Record<GripLength, number> = {
  short: 0.112,
  long:  0.220,
};

// Core cylinder dimensions
const GRIP_RADIUS_TOP = 0.011;
const GRIP_RADIUS_BOT = 0.014;
const GRIP_SEGMENTS   = 12;

// Cord wrap geometry
const CORD_TUBE_RADIUS   = 0.0016; // 1.6mm cord cross-section
const CORD_TUBE_SIDES    = 7;
const CORD_SEGS_PER_TURN = 24;

// Number of wraps for each grip length
const CORD_TURNS: Record<GripLength, number> = {
  short: 9,
  long:  16,
};

// A helix sweeping from -halfH to +halfH around the Y axis.
// chirality: 1 = counter-clockwise from above, -1 = clockwise.
class HelixCurve extends THREE.Curve<THREE.Vector3> {
  private r: number;
  private halfH: number;
  private turns: number;
  private chirality: 1 | -1;

  constructor(r: number, halfH: number, turns: number, chirality: 1 | -1) {
    super();
    this.r = r;
    this.halfH = halfH;
    this.turns = turns;
    this.chirality = chirality;
  }

  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const theta = this.chirality * t * Math.PI * 2 * this.turns;
    return target.set(
      this.r * Math.cos(theta),
      (t - 0.5) * 2 * this.halfH,
      this.r * Math.sin(theta),
    );
  }
}

type GripProps = {
  archetype: ArchetypeKey;
  length: GripLength;
  color: string;
  roughness: number;
  position: [number, number, number];
};

export function Grip({ archetype, length, color, roughness, position }: GripProps) {
  const gripLen = GRIP_LENGTHS[length];
  const halfH   = gripLen / 2;
  const turns   = CORD_TURNS[length];
  const recipe = getGripDetailRecipe(archetype);
  const radiusTop = recipe.coreRadiusTop ?? GRIP_RADIUS_TOP;
  const radiusBot = recipe.coreRadiusBottom ?? GRIP_RADIUS_BOT;
  const wrapRadius = (radiusTop + radiusBot) / 2 + CORD_TUBE_RADIUS;

  const [cordGeo1, cordGeo2, wireGeo] = useMemo(() => {
    const segs = turns * CORD_SEGS_PER_TURN;
    return [
      new THREE.TubeGeometry(new HelixCurve(wrapRadius, halfH, turns,  1), segs, CORD_TUBE_RADIUS, CORD_TUBE_SIDES, false),
      new THREE.TubeGeometry(new HelixCurve(wrapRadius, halfH, turns, -1), segs, CORD_TUBE_RADIUS, CORD_TUBE_SIDES, false),
      new THREE.TubeGeometry(new HelixCurve(wrapRadius + 0.0005, halfH, turns * 1.15, 1), Math.round(segs * 1.15), 0.00055, 6, false),
    ];
  }, [halfH, turns, wrapRadius]);

  const bands = useMemo(() => {
    const count = recipe.bandCount?.[length] ?? (length === 'short' ? 9 : 14);
    return Array.from({ length: count }, (_, i) => -halfH + ((i + 0.5) / count) * gripLen);
  }, [gripLen, halfH, length, recipe.bandCount]);

  return (
    <group position={position}>
      {/* Grip core — slightly recessed so cord wrapping sits proud */}
      <mesh>
        <cylinderGeometry args={[radiusTop, radiusBot, gripLen, GRIP_SEGMENTS]} />
        <meshStandardMaterial color={color} metalness={0} roughness={roughness} />
      </mesh>

      {recipe.wrap === 'bands' ? (
        bands.map((y, i) => (
          <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[wrapRadius, recipe.bandTube ?? 0.00075, 6, 28]} />
            <meshStandardMaterial color={color} metalness={0} roughness={Math.max(0.78, roughness - 0.05)} />
          </mesh>
        ))
      ) : recipe.wrap === 'wire' ? (
        <>
          <mesh geometry={wireGeo}>
            <meshStandardMaterial
              color={recipe.wireColor ?? '#8A7A64'}
              metalness={recipe.wireMetalness ?? 0.7}
              roughness={0.34}
            />
          </mesh>
          {bands.filter((_, i) => i % 4 === 0).map((y, i) => (
            <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[wrapRadius + 0.0006, 0.0005, 6, 28]} />
              <meshStandardMaterial color={recipe.wireColor ?? '#8A7A64'} metalness={recipe.wireMetalness ?? 0.7} roughness={0.34} />
            </mesh>
          ))}
        </>
      ) : (
        <>
          {/* Cross-wrapped cord — two helices of opposite chirality form a diamond pattern */}
          <mesh geometry={cordGeo1}>
            <meshStandardMaterial color={color} metalness={0} roughness={Math.max(0.72, roughness - 0.08)} />
          </mesh>
          <mesh geometry={cordGeo2}>
            {/* polygonOffset pushes this helix slightly back so cord1 wins at crossings */}
            <meshStandardMaterial
              color={color}
              metalness={0}
              roughness={Math.max(0.72, roughness - 0.08)}
              polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1}
            />
          </mesh>
        </>
      )}
    </group>
  );
}
