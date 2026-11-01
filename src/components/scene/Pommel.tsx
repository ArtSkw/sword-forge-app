import type { GemstoneType, HardwareTone, PommelStyle } from '../../store/configStore';
import * as THREE from 'three';
import { useEffect, useMemo } from 'react';
import { surface } from './surface';
import { POMMEL_FORM, POMMEL_HALF_HEIGHTS, POMMEL_PROFILES, POMMEL_GEM_BOTTOM_Y } from '../../presets/pommelProfiles';
import { hasPeen, peenGeometry, peenY, pommelGeometry } from './pommelGeometry';

export { POMMEL_HALF_HEIGHTS };

// Faceted cut gem (girdle at y = 0), for the fantasy option.
const GEM_PROFILE = [
  new THREE.Vector2(0, -0.0025),
  new THREE.Vector2(0.0038, -0.0025),
  new THREE.Vector2(0.0075, 0),
  new THREE.Vector2(0, 0.008),
];
const GEM_COLORS: Record<Exclude<GemstoneType, 'none'>, string> = { ruby: '#FF2010', sapphire: '#1040FF', emerald: '#08C038', amber: '#FF8800' };
// An engraved wheel or disc carries its medallion inside the rim's bevel.
const ENGRAVE_RADIUS: Partial<Record<PommelStyle, number>> = { wheel: 0.0205, disc: 0.0185, ornate: 0.0195 };

type PommelProps = {
  tone: HardwareTone;
  engraved?: boolean;
  style: PommelStyle;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  roughness: number;
  gemstone: GemstoneType;
  position: [number, number, number];
};

export function Pommel({ tone, engraved, style, color, emissive, emissiveIntensity, roughness, gemstone, position }: PommelProps) {
  // Brass and bronze age to a brown-green patina, iron and steel to rust.
  const metal = tone === 'brass' || tone === 'bronze' ? 'copper' : 'iron';
  const fit = surface(metal);
  const form = POMMEL_FORM[style];
  const faceOn = form.axis === 'z';
  const body = engraved && faceOn ? surface(metal, { kind: 'face', radius: ENGRAVE_RADIUS[style] ?? 0.019 }) : fit;

  const geo = useMemo(() => pommelGeometry(style), [style]);
  const peen = useMemo(() => (hasPeen(style) ? peenGeometry() : null), [style]);
  const gemGeo = useMemo(() => new THREE.LatheGeometry(GEM_PROFILE, 8), []);
  useEffect(() => () => geo.dispose(), [geo]);
  useEffect(() => () => peen?.dispose(), [peen]);
  useEffect(() => () => gemGeo.dispose(), [gemGeo]);

  const gemColor = gemstone !== 'none' ? GEM_COLORS[gemstone] : null;
  // A face-on pommel shows its gem in the face's centre; a turned one in its end cap.
  const faceDepth = faceOn ? Math.max(...POMMEL_PROFILES[style].map(([, z]) => z)) : 0;
  const metalProps = { color, metalness: 1, emissive, emissiveIntensity };

  return (
    <group position={position}>
      <mesh geometry={geo}>
        <meshStandardMaterial key={body.key} {...body.props} {...metalProps} roughness={roughness} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
      </mesh>
      {peen && (
        <mesh geometry={peen} position={[0, peenY(style), 0]}>
          <meshStandardMaterial key={fit.key} {...fit.props} {...metalProps} roughness={Math.max(0.3, roughness - 0.06)} />
        </mesh>
      )}
      {gemColor && (
        <mesh geometry={gemGeo} position={faceOn ? [0, 0, faceDepth] : [0, POMMEL_GEM_BOTTOM_Y[style], 0]} rotation={faceOn ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}>
          <meshStandardMaterial color={gemColor} emissive={gemColor} emissiveIntensity={0.9} metalness={0.1} roughness={0.05} flatShading />
        </mesh>
      )}
    </group>
  );
}
