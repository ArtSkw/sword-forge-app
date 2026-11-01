import type { HardwareTone, PommelStyle } from '../../store/configStore';
import { useEffect, useMemo } from 'react';
import { surface } from './surface';
import { POMMEL_FORM, POMMEL_HALF_HEIGHTS } from '../../presets/pommelProfiles';
import { hasPeen, peenGeometry, peenY, pommelGeometry } from './pommelGeometry';

export { POMMEL_HALF_HEIGHTS };

// An engraved wheel or disc carries its medallion inside the rim's bevel.
const ENGRAVE_RADIUS: Partial<Record<PommelStyle, number>> = { wheel: 0.0205, disc: 0.0185, ornate: 0.0195 };

type PommelProps = {
  tone: HardwareTone;
  engraved?: boolean;
  enamel?: 'azure' | 'gules';
  wire?: 'chequer' | 'lozenge' | 'bands';   // a Viking pommel's upper guard is inlaid like the guard
  style: PommelStyle;
  scale?: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  roughness: number;
  position: [number, number, number];
};

export function Pommel({ tone, engraved, enamel, wire, style, scale = 1, color, emissive, emissiveIntensity, roughness, position }: PommelProps) {
  // Brass and bronze age to a brown-green patina, iron and steel to rust.
  const metal = tone === 'brass' || tone === 'bronze' ? 'copper' : 'iron';
  const fit = surface(metal);
  const form = POMMEL_FORM[style];
  const faceOn = form.axis === 'z';
  const viking = form.axis === 'viking';
  const body = engraved && faceOn ? surface(metal, { kind: 'face', radius: ENGRAVE_RADIUS[style] ?? 0.019, enamel }) : viking && wire ? surface(metal, undefined, wire) : fit;

  const geo = useMemo(() => pommelGeometry(style), [style]);
  const peen = useMemo(() => (hasPeen(style) ? peenGeometry() : null), [style]);
  useEffect(() => () => geo.dispose(), [geo]);
  useEffect(() => () => peen?.dispose(), [peen]);

  const metalProps = { color, metalness: 1, emissive, emissiveIntensity };

  return (
    <group position={position} scale={scale}>
      <mesh geometry={geo}>
        <meshStandardMaterial key={body.key} {...body.props} {...metalProps} roughness={roughness} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
      </mesh>
      {peen && (
        <mesh geometry={peen} position={[0, peenY(style), 0]}>
          <meshStandardMaterial key={fit.key} {...fit.props} {...metalProps} roughness={Math.max(0.3, roughness - 0.06)} />
        </mesh>
      )}
    </group>
  );
}
