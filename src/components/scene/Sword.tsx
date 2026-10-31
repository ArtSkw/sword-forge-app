import { useConfigStore } from '../../store/configStore';
import { getSwordLayout } from './swordLayout';
import { SWORD_TYPES } from '../../presets/swordTypes';
import { getSwordMaterialRecipes } from '../../presets/materialRecipes';
import { Blade } from './Blade';
import { Crossguard } from './Crossguard';
import { Grip } from './Grip';
import { HiltDetails } from './HiltDetails';
import { Pommel } from './Pommel';

export function Sword() {
  const config = useConfigStore((s) => s.config);
  const preset = SWORD_TYPES[config.archetype];
  const { crossSection, edgeBow, spineClipT, fullerStart, fullerEnd } = preset;
  // A blade pattern may override the archetype's taper (see presets/forge.ts).
  const bodyTaperEnd = config.blade.shape?.bodyTaperEnd ?? preset.bodyTaperEnd;
  const bodyTaperMidWidth = config.blade.shape?.bodyTaperMidWidth ?? preset.bodyTaperMidWidth;
  const tipShoulderRound = config.blade.shape?.tipShoulderRound ?? preset.tipShoulderRound;

  const { gripLen, bladeY, guardY, gripY, pommelY } = getSwordLayout(config);
  const gripTopY = gripY + gripLen / 2;
  const gripBottomY = gripY - gripLen / 2;

  const { condition, steelFinish } = config.finish;
  const fantasyOn = config.fantasy.enabled;
  const runes     = fantasyOn && config.fantasy.runes;
  const gemstone  = fantasyOn ? config.fantasy.gemstone : 'none' as const;
  const materials = getSwordMaterialRecipes(config.finish);

  return (
    <group>
      <group position={[0, bladeY, 0]} rotation={[0, edgeBow > 0 ? Math.PI : 0, 0]}>
        <Blade
          archetype={config.archetype}
          length={config.blade.length}
          width={config.blade.width}
          fuller={config.blade.fuller}
          bodyTaperEnd={bodyTaperEnd}
          bodyTaperMidWidth={bodyTaperMidWidth}
          tipShoulderRound={tipShoulderRound}
          crossSection={crossSection}
          edgeBow={edgeBow}
          spineClipT={spineClipT}
          fullerStart={fullerStart}
          fullerEnd={fullerEnd}
          color={materials.blade.color}
          steelFinish={steelFinish}
          condition={condition}
          runes={runes}
          position={[0, 0, 0]}
        />
      </group>
      <Crossguard
        archetype={config.archetype}
        style={config.guard.style}
        color={materials.hardware.color}
        emissive={materials.hardware.emissive}
        emissiveIntensity={materials.hardware.emissiveIntensity}
        roughness={materials.hardware.roughness}
        position={[0, guardY, 0]}
      />
      <HiltDetails
        archetype={config.archetype}
        color={materials.hardware.color}
        emissive={materials.hardware.emissive}
        emissiveIntensity={materials.hardware.emissiveIntensity}
        roughness={materials.hardware.roughness}
        guardY={guardY}
        gripTopY={gripTopY}
        gripBottomY={gripBottomY}
      />
      <Grip
        archetype={config.archetype}
        length={config.grip.length}
        material={materials.grip.material}
        color={materials.grip.color}
        metalness={materials.grip.metalness}
        normalScale={materials.grip.normalScale}
        roughness={materials.grip.roughness}
        position={[0, gripY, 0]}
      />
      <Pommel
        archetype={config.archetype}
        style={config.pommel.style}
        color={materials.hardware.color}
        emissive={materials.hardware.emissive}
        emissiveIntensity={materials.hardware.emissiveIntensity}
        roughness={materials.hardware.roughness}
        gemstone={gemstone}
        position={[0, pommelY, 0]}
      />
    </group>
  );
}
