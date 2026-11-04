import { useLayoutEffect } from 'react';
import { useConfigStore } from '../../store/configStore';
import { getSwordLayout } from './swordLayout';
import { getSwordMaterialRecipes } from '../../presets/materialRecipes';
import { Blade } from './Blade';
import { bladeSpec } from '../../lib/bladeSpec';
import { hiltSpec } from '../../lib/hilt';
import { currentForm } from '../../lib/forms';
import { DEFAULT_GRIP_SHAPE } from '../../presets/forge';
import { POMMEL_SCALE } from '../../presets/pommelProfiles';
import { setSurfaceAge } from './surface';
import { Crossguard } from './Crossguard';
import { Grip } from './Grip';
import { HiltDetails } from './HiltDetails';
import { Pommel } from './Pommel';
import { MesserHilt } from './MesserHilt';
import { Beat } from './Beat';

// `only` (dev part studio): draw one part alone, for rendering the part cards.
export type SwordPart = 'blade' | 'guard' | 'grip' | 'pommel';
export function Sword({ only }: { only?: SwordPart } = {}) {
  const show = (p: SwordPart) => !only || only === p;
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
  // Wood keeps its grain colour, unless a Form names one (black horn).
  const form = currentForm(config);
  const materials = getSwordMaterialRecipes(config.finish, config.finish.gripMaterial === 'wood' && form?.grip === 'wood' && form.gripColor && config.finish.gripColor.toLowerCase() === form.gripColor.toLowerCase() ? form.gripColor : undefined);
  const gripMetal = { color: materials.hardware.color, roughness: materials.hardware.roughness, tone: (config.finish.hardwareTone === 'brass' || config.finish.hardwareTone === 'bronze' ? 'copper' : 'iron') as 'iron' | 'copper' };

  return (
    <group>
      {/* A single-edged blade turns its edge to face the same way as the curved guards and the swell. */}
      {show('blade') && <group position={[0, bladeY, 0]} rotation={[0, spec.singleEdged ? Math.PI : 0, 0]}>
        <Beat scope={config.archetype} k={`${config.blade.profile}|${spec.section}|${spec.ricasso?.cover ?? ''}|${spec.flame}`}>
          <Blade spec={spec} color={materials.blade.color} steelFinish={steelFinish} age={age} ecusson={hilt.ecusson} />
        </Beat>
      </group>}
      {show('guard') && <Beat scope={config.archetype} k={`${config.guard.style}|${hilt.terminal}|${hilt.rings}|${hilt.ecusson}`}>
      <Crossguard
        cm={config.guard.cm}
        wire={config.archetype === 'vikingSword' ? config.guard.wire : undefined}
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
      </Beat>}
      {!only && <HiltDetails
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
      />}
      {(!only || only === 'grip') && (messer ? (
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
      <Beat scope={config.archetype} k={`${config.finish.gripMaterial}|${config.grip.shape ?? ''}`} soft={config.finish.gripMaterial !== 'wire'}>
      <Grip
        archetype={config.archetype}
        length={gripLen}
        shape={config.grip.shape ?? DEFAULT_GRIP_SHAPE[config.archetype]}
        material={materials.grip.material}
        color={materials.grip.color}
        roughness={materials.grip.roughness}
        metal={gripMetal}
        position={[0, gripY, 0]}
      />
      </Beat>
      ))}
{!messer && show('pommel') && (
      <Beat scope={config.archetype} k={config.pommel.style}>
      <Pommel
        engraved={config.pommel.engraved}
        scale={POMMEL_SCALE[config.archetype] ?? 1}
        enamel={config.pommel.enamel}
        wire={config.archetype === 'vikingSword' ? config.guard.wire : undefined}
        tone={config.finish.hardwareTone}
        style={config.pommel.style}
        color={materials.hardware.color}
        emissive={materials.hardware.emissive}
        emissiveIntensity={materials.hardware.emissiveIntensity}
        roughness={materials.hardware.roughness}
        position={[0, pommelY, 0]}
      />
      </Beat>
      )}
    </group>
  );
}
