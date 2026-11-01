import type { ArchetypeKey, GuardStyle, GuardTerminal } from '../store/configStore';

// The guards (crosses) a sword can carry, each after the research's museum objects, as plain numbers so the
// UI can draw silhouettes without the 3D bundle. Lengths in metres; the section is the bar's half-height
// (along the blade) and half-depth (front to back) at the centre; `round` rounds its corners (1 = round bar).

export type GuardDef = {
  width: number;          // tip to tip
  tipScale: number;       // section at the tips relative to the centre
  tipY: number;           // how far the tips bend toward the blade
  linear?: boolean;       // bend in a straight line (forward slope) instead of a curve
  recurve?: number;       // arms bend in opposite directions seen from above (front-back, at the tips)
  secY: number; secZ: number; round: number;
  terminal: GuardTerminal;
  scales?: boolean;       // grows with the sword (false for guards whose length is already a two-hander's)
};

export const GUARD_DEFS: Record<GuardStyle, GuardDef> = {
  // Petersen H/X: short, heavy, elliptical in section with gently domed faces (8–12 cm).
  vikingBar: { width: 0.105, tipScale: 0.86, tipY: 0, secY: 0.0092, secZ: 0.0128, round: 0.95, terminal: 'plain' },
  // Petersen L/Y: the lower guard curved toward the blade.
  vikingCurved: { width: 0.112, tipScale: 0.74, tipY: 0.012, secY: 0.0085, secZ: 0.0112, round: 0.9, terminal: 'plain' },
  // The knightly cross, 17–20 cm, a slim chamfered bar.
  longBar: { width: 0.19, tipScale: 0.76, tipY: 0, secY: 0.0074, secZ: 0.0074, round: 0.34, terminal: 'plain' },
  // Flat, flaring to the ends: the bow-tie cross.
  bowtie: { width: 0.18, tipScale: 0.8, tipY: 0, secY: 0.0082, secZ: 0.0046, round: 0.4, terminal: 'flared' },
  // Slender quillons curving toward the blade (late 13th–14th c.).
  curvedDown: { width: 0.2, tipScale: 0.56, tipY: 0.022, secY: 0.0066, secZ: 0.0066, round: 0.6, terminal: 'plain' },
  // A round bar, straight, often ending in knobs (15th-c. English and Castillon crosses).
  roundCross: { width: 0.23, tipScale: 0.8, tipY: 0, secY: 0.0064, secZ: 0.0064, round: 1, terminal: 'knob' },
  // Horizontally S-recurved: the arms bend opposite ways seen from above (c. 1400–30).
  recurved: { width: 0.22, tipScale: 0.66, tipY: 0.004, recurve: 0.022, secY: 0.0068, secZ: 0.0068, round: 0.7, terminal: 'plain' },
  // Broad and flat, widening toward the ends.
  flatBroad: { width: 0.22, tipScale: 1.6, tipY: 0, secY: 0.0095, secZ: 0.0042, round: 0.36, terminal: 'plain' },
  // Short, strongly arched toward the blade (13th-c. falchions, Hungarian estocs).
  arched: { width: 0.155, tipScale: 0.7, tipY: 0.03, secY: 0.0076, secZ: 0.0072, round: 0.6, terminal: 'plain' },
  // The great two-hander's long quillons (Cleveland 1919.70: 53.7 cm).
  longQuillons: { width: 0.44, tipScale: 0.62, tipY: 0.012, secY: 0.0098, secZ: 0.0098, round: 0.5, terminal: 'knob', scales: false },
  // Scottish: quillons sloping forward toward the point, ending in quatrefoils.
  scottish: { width: 0.36, tipScale: 0.7, tipY: 0.05, linear: true, secY: 0.0088, secZ: 0.0088, round: 0.6, terminal: 'quatrefoil', scales: false },
};

// Guards grow with the sword (a two-hander's round cross is longer than a longsword's).
const SIZE: Record<ArchetypeKey, { width: number; section: number }> = {
  vikingSword: { width: 1, section: 1 }, armingSword: { width: 1, section: 1 }, longsword: { width: 1.05, section: 1 },
  bastardSword: { width: 1.08, section: 1 }, falchion: { width: 1, section: 1 }, estoc: { width: 1.2, section: 0.9 },
  greatsword: { width: 1.35, section: 1.2 },
};

/** The guard's numbers on this sword type. */
export function guardDef(style: GuardStyle, archetype: ArchetypeKey, cm?: number): GuardDef {
  // A measured cross (cm, tip to tip) sets the length; the bend grows with it.
  const d = GUARD_DEFS[style], s = SIZE[archetype], w = cm ? cm / 100 / d.width : d.scales === false ? 1 : s.width;
  return { ...d, width: d.width * w, tipY: d.tipY * w, recurve: (d.recurve ?? 0) * w, secY: d.secY * s.section, secZ: d.secZ * s.section };
}

/** The guards each type offers; the first is its default. */
export const GUARDS_BY_TYPE: Record<ArchetypeKey, GuardStyle[]> = {
  vikingSword: ['vikingBar', 'vikingCurved', 'longBar'],
  armingSword: ['longBar', 'bowtie', 'curvedDown', 'vikingBar'],
  longsword: ['roundCross', 'longBar', 'curvedDown', 'recurved', 'flatBroad'],
  bastardSword: ['roundCross', 'longBar', 'flatBroad', 'curvedDown', 'recurved'],
  falchion: ['arched', 'longBar', 'curvedDown', 'roundCross'],
  estoc: ['longBar', 'arched', 'roundCross', 'flatBroad', 'curvedDown'],
  greatsword: ['longQuillons', 'roundCross', 'flatBroad', 'scottish'],
};
