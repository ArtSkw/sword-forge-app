import * as THREE from 'three';
import { useMemo } from 'react';
import type { GripLength } from '../../store/configStore';

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
const CORD_HELIX_RADIUS  = (GRIP_RADIUS_TOP + GRIP_RADIUS_BOT) / 2 + CORD_TUBE_RADIUS;
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
  length: GripLength;
  color: string;
  roughness: number;
  position: [number, number, number];
};

export function Grip({ length, color, roughness, position }: GripProps) {
  const gripLen = GRIP_LENGTHS[length];
  const halfH   = gripLen / 2;
  const turns   = CORD_TURNS[length];

  const [cordGeo1, cordGeo2] = useMemo(() => {
    const segs = turns * CORD_SEGS_PER_TURN;
    return [
      new THREE.TubeGeometry(new HelixCurve(CORD_HELIX_RADIUS, halfH, turns,  1), segs, CORD_TUBE_RADIUS, CORD_TUBE_SIDES, false),
      new THREE.TubeGeometry(new HelixCurve(CORD_HELIX_RADIUS, halfH, turns, -1), segs, CORD_TUBE_RADIUS, CORD_TUBE_SIDES, false),
    ];
  }, [halfH, turns]);

  return (
    <group position={position}>
      {/* Grip core — slightly recessed so cord wrapping sits proud */}
      <mesh>
        <cylinderGeometry args={[GRIP_RADIUS_TOP, GRIP_RADIUS_BOT, gripLen, GRIP_SEGMENTS]} />
        <meshStandardMaterial color={color} metalness={0} roughness={roughness} />
      </mesh>

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
    </group>
  );
}
