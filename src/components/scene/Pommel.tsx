import type { HardwareTone, PommelStyle } from '../../store/configStore';
import { useEffect, useLayoutEffect, useMemo } from 'react';
import { engraveUniforms, setFaceEngraving, surface } from './surface';
import { MEDALLION_RADIUS } from '../../presets/engravings';
import { POMMEL_FORM, POMMEL_HALF_HEIGHTS } from '../../presets/pommelProfiles';
import { pommelGeometry } from './pommelGeometry';

export { POMMEL_HALF_HEIGHTS };


type PommelProps = {
  tone: HardwareTone;
  engraved?: boolean;
  enamel?: 'azure' | 'gules';
  inlaid?: boolean;   // a Viking pommel's upper guard and cap are inlaid like the guard
  style: PommelStyle;
  scale?: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  roughness: number;
  position: [number, number, number];
};

export function Pommel({ tone, engraved, enamel, inlaid, style, scale = 1, color, emissive, emissiveIntensity, roughness, position }: PommelProps) {
  // Brass and bronze age to a brown-green patina, iron and steel to rust.
  const metal = tone === 'brass' || tone === 'bronze' ? 'copper' : 'iron';
  const form = POMMEL_FORM[style];
  const viking = form.axis === 'viking';
  // The face's own engraving uniforms (a medallion on a wheel, disc or ornate pommel): plain, engraved or enamelled, it
  // keeps the plain fitting's program.
  const eng = useMemo(() => engraveUniforms('face'), []);
  const radius = engraved ? MEDALLION_RADIUS[style as keyof typeof MEDALLION_RADIUS] ?? null : null;
  useLayoutEffect(() => setFaceEngraving(eng, radius, enamel, tone === 'darkIron'), [eng, radius, enamel, tone]);
  const body = viking && inlaid ? surface(metal, undefined, 'pommel') : surface(metal, eng);

  const geo = useMemo(() => pommelGeometry(style), [style]);
  useEffect(() => () => geo.dispose(), [geo]);

  const metalProps = { color, metalness: 1, emissive, emissiveIntensity };

  return (
    <group position={position} scale={scale}>
      <mesh geometry={geo}>
        <meshStandardMaterial key={body.key} {...body.props} {...metalProps} roughness={roughness} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
      </mesh>
    </group>
  );
}
