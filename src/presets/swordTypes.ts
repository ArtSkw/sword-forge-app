import type { ArchetypeKey, SwordConfig } from '../store/configStore';

export type SwordPreset = {
  key: ArchetypeKey;
  name: string;
  description: string;
  // Fraction of blade length where the terminal point-taper begins (0–1).
  // Higher = blade stays wide longer before converging to the tip.
  bodyTaperEnd: number;
  defaults: Omit<SwordConfig, 'archetype'>;
};

const DEFAULT_FANTASY: SwordConfig['fantasy'] = {
  enabled: false,
  runes: false,
  gemstone: 'none',
};

const finish = (
  gripColor: string,
  overrides: Partial<Omit<SwordConfig['finish'], 'gripColor'>> = {},
): SwordConfig['finish'] => ({
  blade: 'pristine',
  metalTone: 'steel',
  gripColor,
  ...overrides,
});

export const SWORD_TYPES: Record<ArchetypeKey, SwordPreset> = {
  armingSword: {
    key: 'armingSword',
    name: 'Arming Sword',
    description: 'The quintessential knightly sword — balanced, versatile, deadly.',
    bodyTaperEnd: 0.80, // classic gradual double-taper
    defaults: {
      blade: { length: 'medium', width: 'standard', fuller: 'single' },
      guard: { style: 'straight' },
      grip: { length: 'short' },
      pommel: { style: 'wheel' },
      finish: finish('#1C1008'), // near-black worn leather — most documented for knightly use
      fantasy: DEFAULT_FANTASY,
    },
  },
  longsword: {
    key: 'longsword',
    name: 'Longsword',
    description: 'A two-handed weapon favored by knights and men-at-arms.',
    bodyTaperEnd: 0.84, // parallel section slightly longer than arming sword
    defaults: {
      blade: { length: 'long', width: 'standard', fuller: 'single' },
      guard: { style: 'straight' },
      grip: { length: 'long' },
      pommel: { style: 'wheel' },
      finish: finish('#6B1E1E'), // oxblood red leather — documented on high-status examples
      fantasy: DEFAULT_FANTASY,
    },
  },
  bastardSword: {
    key: 'bastardSword',
    name: 'Bastard Sword',
    description: 'The hand-and-a-half sword — adaptable, powerful, elegant.',
    bodyTaperEnd: 0.82,
    defaults: {
      blade: { length: 'long', width: 'standard', fuller: 'single' },
      guard: { style: 'curved' },
      grip: { length: 'long' },
      pommel: { style: 'scentStopper' },
      finish: finish('#1A2B3C'), // midnight blue leather — specifically documented 13th-c. examples
      fantasy: DEFAULT_FANTASY,
    },
  },
  vikingSword: {
    key: 'vikingSword',
    name: 'Viking Sword',
    description: 'Broad, fearless, and beautiful — forged for the northern warrior.',
    bodyTaperEnd: 0.72, // wide blade tapers noticeably earlier
    defaults: {
      blade: { length: 'short', width: 'wide', fuller: 'single' },
      guard: { style: 'straight' },
      grip: { length: 'short' },
      pommel: { style: 'brazilNut' },
      finish: finish('#7A5230', { blade: 'ancient', metalTone: 'darkened' }), // natural wood grip; ancient + darkened for aged Viking patina
      fantasy: DEFAULT_FANTASY,
    },
  },
  falchion: {
    key: 'falchion',
    name: 'Falchion',
    description: 'Single-edged and curved, delivering brutal chopping power.',
    bodyTaperEnd: 0.74, // broad blade, abrupt terminal taper
    defaults: {
      blade: { length: 'medium', width: 'wide', fuller: 'none' },
      guard: { style: 'curved' },
      grip: { length: 'short' },
      pommel: { style: 'disc' },
      finish: finish('#3D1F0E'), // dark oily brown leather — soldier's practical weapon
      fantasy: DEFAULT_FANTASY,
    },
  },
  estoc: {
    key: 'estoc',
    name: 'Estoc',
    description: 'A rigid thrusting sword built to pierce plate armor.',
    bodyTaperEnd: 0.91, // nearly parallel its entire length, very late sharp point
    defaults: {
      blade: { length: 'extraLong', width: 'narrow', fuller: 'none' },
      guard: { style: 'straight' },
      grip: { length: 'long' },
      pommel: { style: 'wheel' },
      finish: finish('#2C2018'), // dark espresso leather — late medieval professional/court use
      fantasy: DEFAULT_FANTASY,
    },
  },
  greatsword: {
    key: 'greatsword',
    name: 'Greatsword',
    description: 'A monument in steel — the weapon of champions and legends.',
    bodyTaperEnd: 0.78, // broad and long, taper starts moderately early
    defaults: {
      blade: { length: 'extraLong', width: 'wide', fuller: 'double' },
      guard: { style: 'curved' },
      grip: { length: 'long' },
      pommel: { style: 'fishtail' },
      finish: finish('#5C1818'), // deep burgundy leather — ceremonial high-status, long wrapping surface
      fantasy: DEFAULT_FANTASY,
    },
  },
};

export const SWORD_TYPE_ORDER: ArchetypeKey[] = [
  'armingSword',
  'longsword',
  'bastardSword',
  'vikingSword',
  'falchion',
  'estoc',
  'greatsword',
];
