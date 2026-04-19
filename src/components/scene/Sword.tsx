import { useConfigStore } from '../../store/configStore';
import type { BladeFinish, MetalTone } from '../../store/configStore';
import { SWORD_TYPES } from '../../presets/swordTypes';
import { Blade, BLADE_LENGTHS } from './Blade';
import { Crossguard, GUARD_HEIGHT } from './Crossguard';
import { Grip, GRIP_LENGTHS } from './Grip';
import { Pommel, POMMEL_HALF_HEIGHTS } from './Pommel';

const BLADE_ROUGHNESS: Record<BladeFinish, number> = {
  pristine:    0.15,
  used:        0.30,
  battleWorn:  0.50,
  ancient:     0.65,
};

const BLADE_COLORS: Record<MetalTone, Record<BladeFinish, string>> = {
  steel: {
    pristine:   '#C8CCD0',
    used:       '#B8BCC0',
    battleWorn: '#A8ACAF',
    ancient:    '#9C9890',
  },
  darkened: {
    pristine:   '#6A6660',
    used:       '#605C58',
    battleWorn: '#545250',
    ancient:    '#4A4644',
  },
  goldenAccents: {
    pristine:   '#C8CCD0',
    used:       '#B8BCC0',
    battleWorn: '#A8ACAF',
    ancient:    '#9C9890',
  },
};

const HARDWARE_COLORS: Record<MetalTone, string> = {
  steel:         '#C8CCD0',
  darkened:      '#585450',
  goldenAccents: '#B8925A',
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

export function Sword() {
  const { config } = useConfigStore();
  const { bodyTaperEnd } = SWORD_TYPES[config.archetype];

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
  const bladeRoughness = BLADE_ROUGHNESS[bladeFinish];
  const hwColor       = HARDWARE_COLORS[metalTone];
  const hwEmissive    = HARDWARE_EMISSIVE[metalTone];
  const hwEmissiveInt = HARDWARE_EMISSIVE_INTENSITY[metalTone];

  return (
    <group>
      <Blade
        length={config.blade.length}
        width={config.blade.width}
        fuller={config.blade.fuller}
        bodyTaperEnd={bodyTaperEnd}
        color={bladeColor}
        roughness={bladeRoughness}
        runes={runes}
        position={[0, bladeY, 0]}
      />
      <Crossguard
        style={config.guard.style}
        color={hwColor}
        emissive={hwEmissive}
        emissiveIntensity={hwEmissiveInt}
        position={[0, guardY, 0]}
      />
      <Grip length={config.grip.length} color={config.finish.gripColor} position={[0, gripY, 0]} />
      <Pommel
        style={config.pommel.style}
        color={hwColor}
        emissive={hwEmissive}
        emissiveIntensity={hwEmissiveInt}
        gemstone={gemstone}
        position={[0, pommelY, 0]}
      />
    </group>
  );
}
