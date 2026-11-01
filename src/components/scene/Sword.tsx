import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useConfigStore } from '../../store/configStore';
import { getSwordLayout } from './swordLayout';
import { getSwordMaterialRecipes } from '../../presets/materialRecipes';
import { Blade } from './Blade';
import { bladeSpec } from '../../lib/bladeSpec';
import { hiltSpec } from '../../lib/hilt';
import { DEFAULT_GRIP_SHAPE } from '../../presets/forge';
import { setBladeMarkings, setSurfaceAge } from './surface';
import { REGION_LEN, REGION_START, markingsTexture } from './markingsTexture';
import { INSCRIPTIONS } from '../../presets/inscriptions';
import { Crossguard } from './Crossguard';
import { Grip } from './Grip';
import { HiltDetails } from './HiltDetails';
import { Pommel } from './Pommel';
import { MesserHilt } from './MesserHilt';

export function Sword() {
  const config = useConfigStore((s) => s.config);
  const spec = bladeSpec(config);
  const hilt = hiltSpec(config);
  const messer = config.archetype === 'falchion' && config.grip.hilt === 'messer';
  // Every surface shader reads the sword's age from one shared uniform (set before the frame renders).
  useLayoutEffect(() => { setSurfaceAge(config.finish.age); }, [config.finish.age]);
  // The blade's inscription and smith's mark, baked to a mask whenever they or the blade's width change.
  const insc = INSCRIPTIONS.find((i) => i.id === config.blade.inscription);
  const mark = config.blade.mark;
  // Letters are drawn in Cinzel: bake again once the font has loaded.
  const [fontsReady, setFontsReady] = useState(0);
  useEffect(() => { document.fonts?.load('600 32px Cinzel').then(() => setFontsReady(1)).catch(() => {}); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const markings = useMemo(() => markingsTexture({ front: insc?.front, back: insc?.back, mark, halfWidth: spec.halfWidth, singleEdged: spec.singleEdged }), [insc, mark, spec.halfWidth, spec.singleEdged, fontsReady]);
  useEffect(() => () => markings?.dispose(), [markings]);
  useLayoutEffect(() => {
    // On a blade with a ricasso the markings start just above it.
    const start = spec.ricasso ? spec.ricasso.t * spec.length + 0.02 : REGION_START;
    setBladeMarkings(markings, -spec.length / 2 + start, REGION_LEN, spec.halfWidth, config.blade.inlay ?? insc?.inlay ?? 'latten');
  }, [markings, spec.length, spec.halfWidth, spec.ricasso, config.blade.inlay, insc]);

  const { gripLen, bladeY, guardY, gripY, pommelY } = getSwordLayout(config);
  const gripTopY = gripY + gripLen / 2;
  const gripBottomY = gripY - gripLen / 2;

  const { age, steelFinish } = config.finish;
  const fantasyOn = config.fantasy.enabled;
  const runes     = fantasyOn && config.fantasy.runes;
  const gemstone  = fantasyOn ? config.fantasy.gemstone : 'none' as const;
  const materials = getSwordMaterialRecipes(config.finish);
  const gripMetal = { color: materials.hardware.color, roughness: materials.hardware.roughness, tone: (config.finish.hardwareTone === 'brass' || config.finish.hardwareTone === 'bronze' ? 'copper' : 'iron') as 'iron' | 'copper' };

  return (
    <group>
      {/* A single-edged blade turns its edge to face the same way as the curved guards and the swell. */}
      <group position={[0, bladeY, 0]} rotation={[0, spec.singleEdged ? Math.PI : 0, 0]}>
        <Blade spec={spec} color={materials.blade.color} steelFinish={steelFinish} age={age} runes={runes} />
      </group>
      <Crossguard
        {...hilt}
        engraved={config.guard.engraved}
        tone={config.finish.hardwareTone}
        archetype={config.archetype}
        style={config.guard.style}
        color={materials.hardware.color}
        emissive={materials.hardware.emissive}
        emissiveIntensity={materials.hardware.emissiveIntensity}
        roughness={materials.hardware.roughness}
        position={[0, guardY, 0]}
      />
      <HiltDetails
        ferrules={!messer}
        tone={config.finish.hardwareTone}
        archetype={config.archetype}
        color={materials.hardware.color}
        emissive={materials.hardware.emissive}
        emissiveIntensity={materials.hardware.emissiveIntensity}
        roughness={materials.hardware.roughness}
        guardY={guardY}
        gripTopY={gripTopY}
        gripBottomY={gripBottomY}
      />
      {messer ? (
        <MesserHilt
          gripTopY={gripTopY}
          gripBottomY={gripBottomY}
          guardY={guardY}
          cap={config.grip.cap ?? 'beak'}
          material={materials.grip.material}
          color={materials.grip.color}
          roughness={materials.grip.roughness}
          metal={gripMetal}
        />
      ) : (
      <Grip
        archetype={config.archetype}
        length={config.grip.length}
        shape={config.grip.shape ?? DEFAULT_GRIP_SHAPE[config.archetype]}
        material={materials.grip.material}
        color={materials.grip.color}
        roughness={materials.grip.roughness}
        metal={gripMetal}
        position={[0, gripY, 0]}
      />
      )}
{!messer && (
      <Pommel
        engraved={config.pommel.engraved}
        tone={config.finish.hardwareTone}
        style={config.pommel.style}
        color={materials.hardware.color}
        emissive={materials.hardware.emissive}
        emissiveIntensity={materials.hardware.emissiveIntensity}
        roughness={materials.hardware.roughness}
        gemstone={gemstone}
        position={[0, pommelY, 0]}
      />
      )}
    </group>
  );
}
