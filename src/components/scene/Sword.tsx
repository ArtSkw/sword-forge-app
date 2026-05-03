import { useConfigStore } from '../../store/configStore';
import { SWORD_TYPES } from '../../presets/swordTypes';
import { getSwordMaterialRecipes } from '../../presets/materialRecipes';
import { Blade, BLADE_LENGTHS } from './Blade';
import { Crossguard, GUARD_HEIGHT } from './Crossguard';
import { Grip, GRIP_LENGTHS } from './Grip';
import { HiltDetails } from './HiltDetails';
import { Pommel, POMMEL_HALF_HEIGHTS } from './Pommel';

export function Sword() {
  const { config } = useConfigStore();
  const { bodyTaperEnd, bodyTaperMidWidth, tipShoulderRound, crossSection, edgeBow, spineClipT, fullerStart, fullerEnd } = SWORD_TYPES[config.archetype];

  const bladeLen    = BLADE_LENGTHS[config.blade.length];
  const gripLen     = GRIP_LENGTHS[config.grip.length];
  const pommelHalfH = POMMEL_HALF_HEIGHTS[config.pommel.style];
  const total       = bladeLen + GUARD_HEIGHT + gripLen + pommelHalfH * 2;

  const tipY    = total / 2;
  const bladeY  = tipY - bladeLen / 2;
  const guardY  = tipY - bladeLen - GUARD_HEIGHT / 2;
  const gripY   = tipY - bladeLen - GUARD_HEIGHT - gripLen / 2;
  const pommelY = -total / 2 + pommelHalfH;
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
