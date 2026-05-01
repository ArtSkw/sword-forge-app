import type { ArchetypeKey, SwordConfig } from '../store/configStore';
import type { ProfileFamily } from './bladeProfiles';

export type SwordPreset = {
  key: ArchetypeKey;
  name: string;
  description: string;
  // Fraction of blade length where the terminal point-taper begins (0–1).
  // Higher = blade stays wide longer before converging to the tip.
  bodyTaperEnd: number;
  // Fraction of halfWidth remaining at bodyTaperEnd. Higher = blade stays
  // near-parallel (Viking); lower = blade narrows smoothly toward the tip
  // (estoc, arming). Applied to the body-taper segment only.
  bodyTaperMidWidth: number;
  // Smoothstep blend window (in t units) around bodyTaperEnd. 0 = sharp
  // shoulder corner; ~0.06 rounds the kink for a fingertip-rounded tip.
  tipShoulderRound: number;
  // Cross-section family — drives the fundamental blade geometry.
  crossSection: ProfileFamily;
  // Edge-side outward bow as a fraction of halfWidth (0 = straight edge).
  // Peaks mid-blade via sin(πt); combined with the default taper so the edge
  // remains tapered at the base and tip.
  edgeBow: number;
  // Fraction of blade length where the spine starts its angular clip-drop to
  // the tip. 1.0 = spine follows the default symmetric taper (no clip).
  spineClipT: number;
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
  condition: 'pristine',
  steelFinish: 'polished',
  hardwareTone: 'steel',
  gripColor,
  ...overrides,
});

export const SWORD_TYPES: Record<ArchetypeKey, SwordPreset> = {
  armingSword: {
    key: 'armingSword',
    name: 'Arming Sword',
    description: 'The quintessential knightly sword — balanced, versatile, deadly.',
    bodyTaperEnd: 0.80, // classic gradual double-taper
    bodyTaperMidWidth: 0.34,
    tipShoulderRound: 0,
    crossSection: 'lenticular',
    edgeBow: 0,
    spineClipT: 1,
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
    bodyTaperMidWidth: 0.38,
    tipShoulderRound: 0,
    crossSection: 'lenticular',
    edgeBow: 0,
    spineClipT: 1,
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
    bodyTaperMidWidth: 0.36,
    tipShoulderRound: 0,
    crossSection: 'lenticular',
    edgeBow: 0,
    spineClipT: 1,
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
    bodyTaperEnd: 0.92, // near-parallel edges, short stubby tip over last 8%
    bodyTaperMidWidth: 0.88, // Viking blades retain almost full width along the body
    tipShoulderRound: 0.07,  // round the shoulder for the soft, blunted Viking tip
    crossSection: 'lenticular',
    edgeBow: 0,
    spineClipT: 1,
    defaults: {
      blade: { length: 'short', width: 'wide', fuller: 'single' },
      guard: { style: 'straight' },
      grip: { length: 'short' },
      pommel: { style: 'brazilNut' },
      finish: finish('#5A351C', { condition: 'used', steelFinish: 'satin', hardwareTone: 'bronze' }), // dark wood/leather grip with a lightly used bright steel blade
      fantasy: DEFAULT_FANTASY,
    },
  },
  falchion: {
    key: 'falchion',
    name: 'Falchion',
    description: 'Single-edged and curved, delivering brutal chopping power.',
    bodyTaperEnd: 0.74, // broad blade, abrupt terminal taper
    bodyTaperMidWidth: 0.55,
    tipShoulderRound: 0,
    crossSection: 'lenticular',
    edgeBow: 0.70,     // cutting edge bows outward mid-blade; spine stays straight
    spineClipT: 0.85,  // spine drops diagonally over last 15% for the clip tip
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
    bodyTaperMidWidth: 0.55,
    tipShoulderRound: 0,
    crossSection: 'diamond',
    edgeBow: 0,
    spineClipT: 1,
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
    bodyTaperMidWidth: 0.40,
    tipShoulderRound: 0,
    crossSection: 'hexagonal',
    edgeBow: 0,
    spineClipT: 1,
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
