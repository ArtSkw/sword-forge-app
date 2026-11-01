import { useLayoutEffect } from 'react';
import { useConfigStore } from '../../store/configStore';
import { getSwordLayout } from './swordLayout';
import { getSwordMaterialRecipes } from '../../presets/materialRecipes';
import { Blade } from './Blade';
import { bladeSpec } from '../../lib/bladeSpec';
import { hiltSpec } from '../../lib/hilt';
import { DEFAULT_GRIP_SHAPE } from '../../presets/forge';
import { setSurfaceAge } from './surface';
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
