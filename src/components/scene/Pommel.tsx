import * as THREE from 'three';
import { useMemo } from 'react';
import type { ArchetypeKey, PommelStyle, GemstoneType } from '../../store/configStore';
import { getPommelDetailRecipe } from '../../presets/archetypeDetails';
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
  const pommelDetail = getPommelDetailRecipe(archetype, style);

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
      {(() => {
        const metalDetailMaterial = (
          <meshStandardMaterial
            color={color}
            metalness={1}
            roughness={Math.max(0.3, roughness - 0.08)}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        );

        return (
          <>
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
            {pommelDetail && !gemColor && (
              <>
                {pommelDetail.cap && (
                  <mesh position={[0, bottomY + (pommelDetail.cap.offsetY ?? 0), 0]}>
                    <cylinderGeometry
                      args={[
                        pommelDetail.cap.radiusTop,
                        pommelDetail.cap.radiusBottom,
                        pommelDetail.cap.height,
                        24,
                      ]}
                    />
                    {metalDetailMaterial}
                  </mesh>
                )}
                {pommelDetail.equatorRing && (
                  <mesh position={[0, -0.0002, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[pommelDetail.equatorRing.radius, pommelDetail.equatorRing.tube, 6, 48]} />
                    <meshStandardMaterial color={color} metalness={1} roughness={Math.max(0.34, roughness - 0.05)} emissive={emissive} emissiveIntensity={emissiveIntensity} />
                  </mesh>
                )}
                {pommelDetail.flutes && Array.from({ length: pommelDetail.flutes.count }, (_, i) => {
                  const angle = (i / pommelDetail.flutes!.count) * Math.PI * 2;
                  const x = Math.cos(angle) * pommelDetail.flutes!.radius;
                  const z = Math.sin(angle) * pommelDetail.flutes!.radius;

                  return (
                    <mesh key={i} position={[x, pommelDetail.flutes!.offsetY ?? 0, z]}>
                      <cylinderGeometry args={[pommelDetail.flutes!.tube, pommelDetail.flutes!.tube, pommelDetail.flutes!.height, 6]} />
                      <meshStandardMaterial color={color} metalness={1} roughness={Math.max(0.32, roughness - 0.10)} emissive={emissive} emissiveIntensity={emissiveIntensity} />
                    </mesh>
                  );
                })}
              </>
            )}
          </>
        );
      })()}
    </group>
  );
}
