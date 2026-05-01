import * as THREE from 'three';
import { useMemo } from 'react';
import type { ArchetypeKey, PommelStyle, GemstoneType } from '../../store/configStore';
import { POMMEL_PROFILES, POMMEL_HALF_HEIGHTS, POMMEL_GEM_BOTTOM_Y } from '../../presets/pommelProfiles';

export { POMMEL_HALF_HEIGHTS };

const LATHE_SEGMENTS = 32;

// Faceted cut-gem dimensions (girdle is the reference plane, y=0)
const GEM_R_GIRDLE  = 0.0075; // widest point
const GEM_R_TABLE   = 0.0038; // flat visible face (50% of girdle)
const GEM_H_CROWN   = 0.0025; // crown projects below pommel surface (visible)
const GEM_H_PAVILION = 0.0080; // pavilion goes into pommel

// 8 facets gives a realistic octagonal brilliant cut
const GEM_FACETS = 8;

const GEM_PROFILE = [
  new THREE.Vector2(0,           -GEM_H_CROWN),   // table centre
  new THREE.Vector2(GEM_R_TABLE, -GEM_H_CROWN),   // table edge
  new THREE.Vector2(GEM_R_GIRDLE, 0),             // girdle
  new THREE.Vector2(0,            GEM_H_PAVILION), // pavilion culet
];

const GEM_COLORS: Record<Exclude<GemstoneType, 'none'>, string> = {
  ruby:     '#FF2010',
  sapphire: '#1040FF',
  emerald:  '#08C038',
  amber:    '#FF8800',
};

type PommelProps = {
  archetype: ArchetypeKey;
  style: PommelStyle;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  roughness: number;
  gemstone: GemstoneType;
  position: [number, number, number];
};

export function Pommel({ archetype, style, color, emissive, emissiveIntensity, roughness, gemstone, position }: PommelProps) {
  const points   = POMMEL_PROFILES[style];
  const bottomY  = POMMEL_GEM_BOTTOM_Y[style];
  const gemColor = gemstone !== 'none' ? GEM_COLORS[gemstone] : null;
  const isVikingBrazilNut = archetype === 'vikingSword' && style === 'brazilNut';

  // Girdle sits flush with the pommel bottom face; pavilion goes inside, crown protrudes below.
  // polygonOffset pushes the pommel surface back in depth so the gem wins where they overlap.
  const gemY = bottomY;

  const gemGeo = useMemo(() => {
    const geo = new THREE.LatheGeometry(GEM_PROFILE, GEM_FACETS);
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <group position={position}>
      <mesh>
        <latheGeometry args={[points, LATHE_SEGMENTS]} />
        <meshStandardMaterial
          color={color} metalness={1.0} roughness={roughness}
          emissive={emissive} emissiveIntensity={emissiveIntensity}
          polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1}
        />
      </mesh>
      {gemColor && (
        <mesh position={[0, gemY, 0]} geometry={gemGeo}>
          <meshStandardMaterial
            color={gemColor}
            emissive={gemColor}
            emissiveIntensity={0.9}
            metalness={0.1}
            roughness={0.05}
            flatShading
          />
        </mesh>
      )}
      {isVikingBrazilNut && !gemColor && (
        <>
          <mesh position={[0, bottomY - 0.0006, 0]}>
            <cylinderGeometry args={[0.0075, 0.0105, 0.0025, 24]} />
            <meshStandardMaterial color={color} metalness={1} roughness={Math.max(0.3, roughness - 0.08)} emissive={emissive} emissiveIntensity={emissiveIntensity} />
          </mesh>
          <mesh position={[0, -0.0002, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.0335, 0.0007, 6, 48]} />
            <meshStandardMaterial color={color} metalness={1} roughness={Math.max(0.34, roughness - 0.05)} emissive={emissive} emissiveIntensity={emissiveIntensity} />
          </mesh>
        </>
      )}
    </group>
  );
}
