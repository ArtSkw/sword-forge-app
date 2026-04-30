import { useConfigStore } from '../../store/configStore';
import type { BladeFinish, MetalTone } from '../../store/configStore';
import { SWORD_TYPES } from '../../presets/swordTypes';
import { Blade, BLADE_LENGTHS } from './Blade';
import { Crossguard, GUARD_HEIGHT } from './Crossguard';
import { Grip, GRIP_LENGTHS } from './Grip';
import { Pommel, POMMEL_HALF_HEIGHTS } from './Pommel';

const BLADE_COLORS: Record<MetalTone, Record<BladeFinish, string>> = {
  steel: {
    pristine:   '#C8CCD0',
    used:       '#AEB5B7',
    battleWorn: '#8A908C',
    ancient:    '#7C756B',
  },
  darkened: {
    pristine:   '#6A6660',
    used:       '#5C5A56',
    battleWorn: '#4A4A46',
    ancient:    '#403B35',
  },
  goldenAccents: {
    pristine:   '#C8CCD0',
    used:       '#AEB5B7',
    battleWorn: '#8A908C',
    ancient:    '#7C756B',
  },
};

const HARDWARE_COLORS: Record<MetalTone, Record<BladeFinish, string>> = {
  steel: {
    pristine:   '#C8CCD0',
    used:       '#AEB2B1',
    battleWorn: '#868B86',
    ancient:    '#756E64',
  },
  darkened: {
    pristine:   '#585450',
    used:       '#4C4A46',
    battleWorn: '#3C3B38',
    ancient:    '#322E29',
  },
  goldenAccents: {
    pristine:   '#B8925A',
    used:       '#A27D4D',
    battleWorn: '#80633E',
    ancient:    '#695136',
  },
};

const HARDWARE_ROUGHNESS: Record<BladeFinish, number> = {
  pristine:   0.36,
  used:       0.45,
  battleWorn: 0.56,
  ancient:    0.68,
};

const GRIP_ROUGHNESS: Record<BladeFinish, number> = {
  pristine:   0.84,
  used:       0.88,
  battleWorn: 0.92,
  ancient:    0.96,
};

const HARDWARE_EMISSIVE: Record<MetalTone, string> = {
  steel:         '#000000',
  darkened:      '#000000',
  goldenAccents: '#B8925A',
};

const HARDWARE_EMISSIVE_INTENSITY: Record<MetalTone, number> = {
  steel:         0,
  darkened:      0,
  goldenAccents: 0.05,
};

function shadeHex(hex: string, factor: number): string {
  const raw = hex.replace('#', '');
  const n = parseInt(raw, 16);
  const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * factor)));
  const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * factor)));
  const b = Math.max(0, Math.min(255, Math.round((n & 255) * factor)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

const GRIP_FINISH_SHADE: Record<BladeFinish, number> = {
  pristine:   1.00,
  used:       0.88,
  battleWorn: 0.72,
  ancient:    0.58,
};

export function Sword() {
  const { config } = useConfigStore();
  const { bodyTaperEnd, bodyTaperMidWidth, tipShoulderRound, crossSection, edgeBow, spineClipT } = SWORD_TYPES[config.archetype];

  const bladeLen    = BLADE_LENGTHS[config.blade.length];
  const gripLen     = GRIP_LENGTHS[config.grip.length];
  const pommelHalfH = POMMEL_HALF_HEIGHTS[config.pommel.style];
  const total       = bladeLen + GUARD_HEIGHT + gripLen + pommelHalfH * 2;

  const tipY    = total / 2;
  const bladeY  = tipY - bladeLen / 2;
  const guardY  = tipY - bladeLen - GUARD_HEIGHT / 2;
  const gripY   = tipY - bladeLen - GUARD_HEIGHT - gripLen / 2;
  const pommelY = -total / 2 + pommelHalfH;

  const { blade: bladeFinish, metalTone } = config.finish;
  const fantasyOn = config.fantasy.enabled;
  const runes     = fantasyOn && config.fantasy.runes;
  const gemstone  = fantasyOn ? config.fantasy.gemstone : 'none' as const;

  const bladeColor    = BLADE_COLORS[metalTone][bladeFinish];
  const hwColor       = HARDWARE_COLORS[metalTone][bladeFinish];
  const hwEmissive    = HARDWARE_EMISSIVE[metalTone];
  const hwEmissiveInt = HARDWARE_EMISSIVE_INTENSITY[metalTone];
  const hwRoughness   = HARDWARE_ROUGHNESS[bladeFinish];
  const gripColor     = shadeHex(config.finish.gripColor, GRIP_FINISH_SHADE[bladeFinish]);
  const gripRoughness = GRIP_ROUGHNESS[bladeFinish];

  return (
    <group>
      <group position={[0, bladeY, 0]} rotation={[0, edgeBow > 0 ? Math.PI : 0, 0]}>
        <Blade
          length={config.blade.length}
          width={config.blade.width}
          fuller={config.blade.fuller}
          bodyTaperEnd={bodyTaperEnd}
          bodyTaperMidWidth={bodyTaperMidWidth}
          tipShoulderRound={tipShoulderRound}
          crossSection={crossSection}
          edgeBow={edgeBow}
          spineClipT={spineClipT}
          color={bladeColor}
          finish={bladeFinish}
          runes={runes}
          position={[0, 0, 0]}
        />
      </group>
      <Crossguard
        style={config.guard.style}
        color={hwColor}
        emissive={hwEmissive}
        emissiveIntensity={hwEmissiveInt}
        roughness={hwRoughness}
        position={[0, guardY, 0]}
      />
      <Grip
        length={config.grip.length}
        color={gripColor}
        roughness={gripRoughness}
        position={[0, gripY, 0]}
      />
      <Pommel
        style={config.pommel.style}
        color={hwColor}
        emissive={hwEmissive}
        emissiveIntensity={hwEmissiveInt}
        roughness={hwRoughness}
        gemstone={gemstone}
        position={[0, pommelY, 0]}
      />
    </group>
  );
}
