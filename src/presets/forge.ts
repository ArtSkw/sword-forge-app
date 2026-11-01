import type {
  ArchetypeKey, BladeLength, BladeWidth, FullerStyle, GripMaterial, GuardStyle,
  HardwareTone, PommelStyle, SteelFinish, SwordCondition,
} from '../store/configStore';
import type { Section } from './bladeSections';

// Content and choices for the forge UI ("Smith's Eye"). Kept free of three.js.

export type StationId = 'blade' | 'guard' | 'grip' | 'pommel' | 'finish';

// Edit mode steps up the sword, left to right: pommel → grip → guard → blade, then the whole sword's finish.
export const STATIONS: { id: StationId; name: string }[] = [
  { id: 'pommel', name: 'Pommel' },
  { id: 'grip', name: 'Grip' },
  { id: 'guard', name: 'Guard' },
  { id: 'blade', name: 'Blade' },
  { id: 'finish', name: 'Finish' },
];

// ── Blade profiles: a named historical blade (Geibig / Oakeshott) maps to the blade parameters ──
export type BladeShape = { bodyTaperEnd?: number; bodyTaperMidWidth?: number; tipShoulderRound?: number };
export type RicassoCover = 'bare' | 'leather';
export type BladeProfile = {
  id: string;
  name: string;
  era: string;
  length: BladeLength;
  width: BladeWidth;
  fuller: FullerStyle;
  shape?: BladeShape;
  section?: Section;            // omitted = the sword type's section
  swell?: number;               // single-edged blades: how much the edge widens toward the clip (× half-width)
  clip?: number;                // single-edged blades: where the back starts to drop to the point (0–1)
  fullerSpan?: [number, number];  // fuller start and end along the blade (0–1); omitted = the type's
  ricasso?: { cm: number; cover: RicassoCover; hooks: 'lugs' | 'crescent' };
  note: string;
  story: string;
};

// ── Blade sections and the blade options each type offers ────────────────────────
export const SECTIONS: { id: Section; name: string; note: string }[] = [
  { id: 'lenticular', name: 'Lens', note: 'A lens-shaped section: broad faces that flex a little in the cut.' },
  { id: 'diamond', name: 'Diamond', note: 'Four flat faces meet in a central ridge: stiff, with one line of light down the middle.' },
  { id: 'hexagonal', name: 'Hexagonal', note: 'A flat band runs between two shoulders: stiff, and broad across the faces.' },
  { id: 'hollow', name: 'Hollow-ground', note: 'Hollowed faces either side of a sharp ridge: light, stiff and bright along the ridge.' },
  { id: 'triangular', name: 'Triangular', note: 'Three hollowed faces and no real edge: a spike for the gaps in plate.' },
  { id: 'square', name: 'Square', note: 'Four hollowed faces and four arrises: the stiffest, narrowest point of all.' },
  { id: 'wedge', name: 'Single edge', note: 'A thick back thinning to one edge.' },
];
// Types whose sections changed with the period offer the choice (see research: longsword XV vs XVII,
// hollow-ground late XV, the estoc's three sections, the two-hander's diamond or hexagonal blade).
export const SECTION_CHOICES: Partial<Record<ArchetypeKey, Section[]>> = {
  longsword: ['diamond', 'hexagonal', 'hollow'],
  bastardSword: ['lenticular', 'diamond', 'hollow'],
  estoc: ['triangular', 'square', 'diamond'],
  greatsword: ['diamond', 'hexagonal'],
};
export const RICASSO_CHOICES: { id: 'none' | RicassoCover; name: string; note: string }[] = [
  { id: 'none', name: 'None', note: '' },
  { id: 'bare', name: 'Bare', note: 'An unsharpened stretch below the guard, for a second hand on the blade.' },
  { id: 'leather', name: 'Leather', note: 'The ricasso wrapped in tooled leather over wood: a second grip on the blade.' },
];
export const EDGE_CHOICES: { id: 'straight' | 'flame'; name: string; note: string }[] = [
  { id: 'straight', name: 'Straight', note: '' },
  { id: 'flame', name: 'Flame', note: 'A flamboyant edge that waves down the blade; the light snakes along it.' },
];

// ── Forms: named starting points per type, each anchored to a surviving object ──
export type Form = {
  id: string;
  name: string;
  era: string;                 // display, e.g. "c. 800–950"
  years: [number, number];     // for period-harmony checks
  anchor: string;              // "After Wallace Collection A456"
  anchorUrl?: string;
  note: string;                // one line (≤ ~100 chars): switcher list and inspector
  story: string;               // a short paragraph for the historical account
  blade: string;               // BladeProfile id of this type
  guard: GuardStyle;
  pommel: PommelStyle;
  grip: GripMaterial;
  gripColor?: string;          // hex; omitted = the type's natural colour
  steel: SteelFinish;
  fittings: HardwareTone;
};




// ── Variants with their notes ──────────────────────────────────────────────────
// years: when the part was in use, for period-harmony notes (none = no historical model).
type Variant<T extends string> = { id: T; name: string; era?: string; years?: [number, number]; note: string };

export const GUARDS: Variant<GuardStyle>[] = [
  { id: 'straight', name: 'Straight', era: '9th–16th c.', years: [800, 1600], note: 'A plain straight cross. Strong, and quick to recover.' },
  { id: 'curved', name: 'Curved', era: '13th–16th c.', years: [1250, 1600], note: 'Arms bent toward the blade to catch a sliding edge.' },
  { id: 'ornate', name: 'Ornate', era: '15th–16th c.', years: [1450, 1600], note: 'Slender arms ending in turned finials.' },
  { id: 'fantasy', name: 'Fantastic', era: 'Fantasy', note: 'Wide arms that flare at the tips and sweep up toward the blade.' },
];
export const POMMELS: Variant<PommelStyle>[] = [
  { id: 'brazilNut', name: 'Brazil nut', era: '10th–13th c.', years: [950, 1250], note: 'The common Viking counterweight, peened over the end of the tang.' },
  { id: 'disc', name: 'Disc', era: '10th–16th c.', years: [950, 1550], note: 'A flat disc. It weighs less, so the balance drifts toward the point.' },
  { id: 'wheel', name: 'Wheel', era: '12th–15th c.', years: [1100, 1500], note: 'A disc with raised rims, the knightly pommel of the high Middle Ages.' },
  { id: 'scentStopper', name: 'Scent stopper', era: '14th–16th c.', years: [1350, 1600], note: 'Shaped like the stopper of a perfume bottle; popular in the late Middle Ages.' },
  { id: 'fishtail', name: 'Fishtail', era: '15th c.', years: [1400, 1500], note: 'A flared, faceted pommel of the late fifteenth century.' },
  { id: 'ornate', name: 'Ornate', era: '15th–16th c.', years: [1400, 1550], note: 'A grooved wheel with a decorative band.' },
  { id: 'fantasy', name: 'Fantastic', era: 'Fantasy', note: 'An angular pommel with a sharp point and a flared crown.' },
  { id: 'pyramid', name: 'Pyramid cap', era: 'c. 775–950', years: [775, 950], note: 'A small three-sided cap riveted to a wide, domed upper guard: the commonest Norwegian hilt.' },
  { id: 'lobed5', name: 'Five-lobe', era: '9th–10th c.', years: [800, 1000], note: 'Five even lobes in a row over a short, square-ish upper guard: the Frankish hilt.' },
  { id: 'lobed3', name: 'Three-lobe', era: 'late 9th–10th c.', years: [870, 1000], note: 'A great rounded central lobe between two smaller ones, over its own upper guard.' },
];
export const GRIPS: Variant<GripMaterial>[] = [
  { id: 'wood', name: 'Wood', years: [700, 1600], note: 'Two halves of wood around the tang, bound tight.' },
  { id: 'leather', name: 'Leather', years: [700, 1600], note: 'Leather over a wooden core. It darkens with handling.' },
  { id: 'cord', name: 'Cord', years: [1100, 1600], note: 'Cord under the leather gives a ridged, sure grip.' },
  { id: 'wire', name: 'Wire', era: '12th–16th c.', years: [1150, 1600], note: 'Twisted wire, hard-wearing and bright.' },
];
export const STEELS: Variant<SteelFinish>[] = [
  { id: 'satin', name: 'Satin', years: [700, 1600], note: 'A plain hand polish, the everyday finish.' },
  { id: 'polished', name: 'Polished', years: [700, 1600], note: 'Mirror-bright: a lord’s sword.' },
  { id: 'patternWelded', name: 'Pattern-welded', years: [500, 1100], note: 'Twisted rods forge-welded into a serpent-skin pattern.' },
];
export const FITTINGS: { id: HardwareTone; name: string; swatch: string }[] = [
  { id: 'darkIron', name: 'Dark iron', swatch: 'radial-gradient(circle at 35% 30%, #8a857e, #3c3b38 60%, #1d1c1a)' },
  { id: 'steel', name: 'Steel', swatch: 'radial-gradient(circle at 35% 30%, #f2f4f6, #aeb2b1 55%, #5f6262)' },
  { id: 'bronze', name: 'Bronze', swatch: 'radial-gradient(circle at 35% 30%, #e7b47a, #9b6a35 55%, #4a2f16)' },
  { id: 'brass', name: 'Brass', swatch: 'radial-gradient(circle at 35% 30%, #f6dfa4, #b8925a 55%, #5e4524)' },
];
// The sword's age is continuous; these are the named stops on the way (a slider in the Finish station).
export const AGE_STOPS: { id: SwordCondition; name: string; at: number; note: string }[] = [
  { id: 'pristine', name: 'From the forge', at: 0, note: 'Fresh from the grinder: crisp grind lines and a bright edge bevel.' },
  { id: 'used', name: 'Carried', at: 1 / 3, note: 'Carried and cared for: a freshly honed edge, fine scratches, leather darkened by the hand.' },
  { id: 'battleWorn', name: 'Heirloom', at: 2 / 3, note: 'Polished by generations: softened edges, small nicks, dark patina in the fuller.' },
  { id: 'ancient', name: 'Excavated', at: 1, note: 'Dug from the ground: pitted, rusted in patches, the grip rotted to its core.' },
];
/** The named stop nearest to an age, or the two it lies between. */
export function ageLabel(raw: number): { stop: (typeof AGE_STOPS)[number]; between?: [string, string] } {
  const age = Math.max(0, Math.min(1, raw));
  const stop = AGE_STOPS.reduce((a, b) => (Math.abs(b.at - age) < Math.abs(a.at - age) ? b : a));
  if (Math.abs(stop.at - age) < 0.04) return { stop };
  const i = AGE_STOPS.findIndex((s) => s.at > age);
  return { stop, between: [AGE_STOPS[i - 1].name, AGE_STOPS[i].name] };
}
// Historical dyes for leather and cord; "natural" keeps the archetype's own colour.
export const DYES: { id: string; name: string; color: string | null }[] = [
  { id: 'natural', name: 'Natural', color: null },
  { id: 'oxblood', name: 'Oxblood', color: '#5a221c' },
  { id: 'black', name: 'Black', color: '#1f1b18' },
  { id: 'oak', name: 'Oak gall', color: '#4a3a28' },
  { id: 'umber', name: 'Umber', color: '#3d2a1d' },
  { id: 'bottle', name: 'Bottle green', color: '#26301f' },
];

// ── Archetype eras (shown in the type tooltips) ──────────────────────────────
export const ARCHETYPE_ERA: Record<ArchetypeKey, string> = {
  armingSword: '12th–14th centuries', longsword: '14th–16th centuries', bastardSword: '14th–16th centuries',
  vikingSword: '8th–11th centuries', falchion: '13th–16th centuries', estoc: '14th–16th centuries', greatsword: '15th–16th centuries',
};

// ── Historical account: opening paragraph and how each type was fought ───────
export const ACCOUNT: Record<ArchetypeKey, { title: string; lead: string; fighting: string }> = {
  vikingSword: {
    title: 'The Viking sword',
    lead: 'Between the eighth and eleventh centuries a sword was the most valuable weapon a Norse warrior could own. It was often an heirloom, and sometimes it had a name of its own. Many blades were forged in the Frankish Rhineland and traded north, where the hilts were fitted, so a Frankish blade might wear a Scandinavian pommel.',
    fighting: 'Used in one hand, with a round wooden shield in the other. Fighters favoured strong cuts. The short guard only kept the hand from sliding onto the edge; the shield did the defending.',
  },
  armingSword: {
    title: 'The arming sword',
    lead: 'The knightly sword of the high Middle Ages: a straight, double-edged blade with a cruciform hilt. Men-at-arms wore it at the hip from the twelfth to the fourteenth century.',
    fighting: 'Used in one hand, usually with a shield or buckler. It is balanced to cut and to thrust.',
  },
  longsword: {
    title: 'The longsword',
    lead: 'A sword with a grip long enough for two hands. It served on late medieval battlefields and fills the fencing books of the German and Italian masters.',
    fighting: 'Held in both hands. The masters taught its cuts, thrusts and binds as one system, built on a set of guards.',
  },
  bastardSword: {
    title: 'The bastard sword',
    lead: 'Also called the hand-and-a-half sword. The grip leaves room for a second hand, so it works with one hand on horseback or with two on foot.',
    fighting: 'One hand in the saddle; both hands once the rider was down and fighting on foot.',
  },
  falchion: {
    title: 'The falchion',
    lead: 'A single-edged, broad-bladed sword of the thirteenth to sixteenth centuries, related to the cleaver as much as to the knightly sword. Its back runs nearly straight; the edge swells toward a clipped point.',
    fighting: 'A chopping weapon. The weight sits toward the point, and the cuts land heavy.',
  },
  estoc: {
    title: 'The estoc',
    lead: 'A long, rigid blade with a stiff, narrow point, made to find the gaps in plate armour.',
    fighting: 'A thrusting weapon. Fighters often kept one hand on the grip and the other on the blade to drive the point hard and true.',
  },
  greatsword: {
    title: 'The greatsword',
    lead: 'The largest swords of the late Middle Ages and the Renaissance, carried by specialist soldiers in front of the pike block.',
    fighting: 'Swung in wide, two-handed blows. The parrying lugs above the guard let the wielder shorten his hold by taking the blade itself.',
  },
};
