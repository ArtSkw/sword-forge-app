import { useConfigStore } from '../../store/configStore';
import type { HardwareTone, SteelFinish, SwordCondition } from '../../store/configStore';
import { SWORD_TYPES } from '../../presets/swordTypes';
import { Blade, BLADE_LENGTHS } from './Blade';
import { Crossguard, GUARD_HEIGHT } from './Crossguard';
import { Grip, GRIP_LENGTHS } from './Grip';
import { Pommel, POMMEL_HALF_HEIGHTS } from './Pommel';

const BLADE_COLORS: Record<SteelFinish, Record<SwordCondition, string>> = {
  polished: {
    pristine:   '#C8CCD0',
    used:       '#AEB5B7',
    battleWorn: '#8A908C',
    ancient:    '#7C756B',
  },
  satin: {
    pristine:   '#B8C0C2',
    used:       '#A4ABAC',
    battleWorn: '#858B87',
    ancient:    '#777064',
  },
  darkened: {
    pristine:   '#6A6660',
    used:       '#5C5A56',
    battleWorn: '#4A4A46',
    ancient:    '#403B35',
  },
  patternWelded: {
    pristine:   '#BFC7C8',
    used:       '#AAB2B2',
    battleWorn: '#8B918D',
    ancient:    '#7B7469',
  },
};

const HARDWARE_COLORS: Record<HardwareTone, Record<SwordCondition, string>> = {
  steel: {
    pristine:   '#C8CCD0',
    used:       '#AEB2B1',
    battleWorn: '#868B86',
    ancient:    '#756E64',
  },
  brass: {
    pristine:   '#B8925A',
    used:       '#A27D4D',
    battleWorn: '#80633E',
    ancient:    '#695136',
  },
  bronze: {
    pristine:   '#9B6A35',
    used:       '#865B30',
    battleWorn: '#6F4A2B',
    ancient:    '#5A3D27',
  },
  darkIron: {
    pristine:   '#585450',
    used:       '#4C4A46',
    battleWorn: '#3C3B38',
    ancient:    '#322E29',
  },
};

const HARDWARE_ROUGHNESS: Record<SwordCondition, number> = {
  pristine:   0.36,
  used:       0.45,
  battleWorn: 0.56,
  ancient:    0.68,
};

const GRIP_ROUGHNESS: Record<SwordCondition, number> = {
  pristine:   0.84,
  used:       0.88,
  battleWorn: 0.92,
  ancient:    0.96,
};

const HARDWARE_EMISSIVE: Record<HardwareTone, string> = {
  steel:    '#000000',
  brass:    '#B8925A',
  bronze:   '#9B6A35',
  darkIron: '#000000',
};

const HARDWARE_EMISSIVE_INTENSITY: Record<HardwareTone, number> = {
  steel:    0,
  brass:    0.05,
  bronze:   0.035,
  darkIron: 0,
};

function shadeHex(hex: string, factor: number): string {
  const raw = hex.replace('#', '');
  const n = parseInt(raw, 16);
  const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * factor)));
  const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * factor)));
  const b = Math.max(0, Math.min(255, Math.round((n & 255) * factor)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

const GRIP_FINISH_SHADE: Record<SwordCondition, number> = {
  pristine:   1.00,
  used:       0.88,
  battleWorn: 0.72,
  ancient:    0.58,
};

type VikingHiltDetailsProps = {
  color: string;
  emissive: string;
  emissiveIntensity: number;
  roughness: number;
  guardY: number;
  gripTopY: number;
  gripBottomY: number;
};

function VikingHiltDetails({ color, emissive, emissiveIntensity, roughness, guardY, gripTopY, gripBottomY }: VikingHiltDetailsProps) {
  const metal = (
    <meshStandardMaterial
      color={color}
      metalness={1}
      roughness={Math.max(0.32, roughness - 0.06)}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
    />
  );

  return (
    <>
      <mesh position={[0, guardY, 0]} scale={[1, 0.72, 0.62]}>
        <cylinderGeometry args={[0.022, 0.024, 0.014, 32]} />
        {metal}
      </mesh>
      <mesh position={[0, gripTopY - 0.004, 0]}>
        <cylinderGeometry args={[0.0185, 0.017, 0.008, 32]} />
        {metal}
      </mesh>
      <mesh position={[0, gripBottomY + 0.004, 0]}>
        <cylinderGeometry args={[0.0165, 0.0185, 0.008, 32]} />
        {metal}
      </mesh>
    </>
  );
}

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
  const gripTopY = gripY + gripLen / 2;
  const gripBottomY = gripY - gripLen / 2;

  const { condition, hardwareTone, steelFinish } = config.finish;
  const fantasyOn = config.fantasy.enabled;
  const runes     = fantasyOn && config.fantasy.runes;
  const gemstone  = fantasyOn ? config.fantasy.gemstone : 'none' as const;

  const bladeColor    = BLADE_COLORS[steelFinish][condition];
  const hwColor       = HARDWARE_COLORS[hardwareTone][condition];
  const hwEmissive    = HARDWARE_EMISSIVE[hardwareTone];
  const hwEmissiveInt = HARDWARE_EMISSIVE_INTENSITY[hardwareTone];
  const hwRoughness   = HARDWARE_ROUGHNESS[condition];
  const gripColor     = shadeHex(config.finish.gripColor, GRIP_FINISH_SHADE[condition]);
  const gripRoughness = GRIP_ROUGHNESS[condition];

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
          color={bladeColor}
          steelFinish={steelFinish}
          condition={condition}
          runes={runes}
          position={[0, 0, 0]}
        />
      </group>
      <Crossguard
        archetype={config.archetype}
        style={config.guard.style}
        color={hwColor}
        emissive={hwEmissive}
        emissiveIntensity={hwEmissiveInt}
        roughness={hwRoughness}
        position={[0, guardY, 0]}
      />
      {config.archetype === 'vikingSword' && (
        <VikingHiltDetails
          color={hwColor}
          emissive={hwEmissive}
          emissiveIntensity={hwEmissiveInt}
          roughness={hwRoughness}
          guardY={guardY}
          gripTopY={gripTopY}
          gripBottomY={gripBottomY}
        />
      )}
      <Grip
        archetype={config.archetype}
        length={config.grip.length}
        color={gripColor}
        roughness={gripRoughness}
        position={[0, gripY, 0]}
      />
      <Pommel
        archetype={config.archetype}
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
