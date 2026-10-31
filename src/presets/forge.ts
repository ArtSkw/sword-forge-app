import type {
  ArchetypeKey, BladeLength, BladeWidth, FullerStyle, GripMaterial, GuardStyle,
  HardwareTone, PommelStyle, SteelFinish, SwordCondition,
} from '../store/configStore';

// Content and choices for the forge UI ("Smith's Eye"). Kept free of three.js.

export type StationId = 'blade' | 'guard' | 'grip' | 'pommel' | 'finish';

export const STATIONS: { id: StationId; name: string }[] = [
  { id: 'blade', name: 'Blade' },
  { id: 'guard', name: 'Guard' },
  { id: 'grip', name: 'Grip' },
  { id: 'pommel', name: 'Pommel' },
  { id: 'finish', name: 'Finish' },
];

// ── Blade patterns: a named historical form maps to the blade parameters ──────
export type BladeShape = { bodyTaperEnd?: number; bodyTaperMidWidth?: number; tipShoulderRound?: number };
export type BladePattern = {
  id: string;
  name: string;
  era: string;
  length: BladeLength;
  width: BladeWidth;
  fuller: FullerStyle;
  shape?: BladeShape;
  note: string;
  story: string;
};

const NBSP = ' ';

export const BLADE_PATTERNS: Record<ArchetypeKey, BladePattern[]> = {
  vikingSword: [
    { id: 'hedeby', name: 'Hedeby', era: `c.${NBSP}850`, length: 'short', width: 'wide', fuller: 'single',
      note: 'Broad and near-parallel, with a wide fuller and a rounded point. A raider’s sword, made for cutting.',
      story: 'Named after the trading town on the Schlei where blades like this changed hands. With edges running almost parallel down to a gently rounded point, it was a sword for cutting.' },
    { id: 'ulfberht', name: 'Ulfberht', era: `c.${NBSP}950`, length: 'medium', width: 'wide', fuller: 'single', shape: { bodyTaperMidWidth: 0.7, tipShoulderRound: 0.04 },
      note: 'The name +VLFBERH+T is inlaid down the fuller, and the blade narrows to a keener point.',
      story: 'Some of the finest blades of the age carry the inlaid name +VLFBERH+T. Many are of unusually clean steel. Lesser smiths copied them, sometimes misspelling the name.' },
    { id: 'late', name: 'Late Viking', era: `c.${NBSP}1050`, length: 'medium', width: 'standard', fuller: 'single', shape: { bodyTaperEnd: 0.86, bodyTaperMidWidth: 0.55, tipShoulderRound: 0 },
      note: 'Longer and more tapered, already close to the knightly swords that came after.',
      story: 'By the eleventh century blades were longer, with more taper and narrower fullers. From here it is a short step to the knightly sword.' },
  ],
  // Other archetypes get their own named patterns in the next content pass; until then the
  // archetype's classic form is the single pattern.
  armingSword: [], longsword: [], bastardSword: [], falchion: [], estoc: [], greatsword: [],
};

// ── Period-correct parts per archetype (approximate; later-age parts stay selectable) ──
export const PERIOD: Record<ArchetypeKey, { guards: GuardStyle[]; pommels: PommelStyle[]; grips: GripMaterial[] }> = {
  armingSword: { guards: ['straight', 'curved'], pommels: ['wheel', 'disc'], grips: ['leather', 'wood', 'cord'] },
  longsword: { guards: ['straight', 'curved'], pommels: ['wheel', 'scentStopper', 'fishtail'], grips: ['leather', 'cord', 'wire'] },
  bastardSword: { guards: ['straight', 'curved'], pommels: ['scentStopper', 'fishtail', 'wheel'], grips: ['leather', 'cord', 'wire'] },
  vikingSword: { guards: ['straight'], pommels: ['brazilNut', 'disc'], grips: ['wood', 'leather', 'cord'] },
  falchion: { guards: ['straight', 'curved'], pommels: ['disc', 'wheel'], grips: ['leather', 'wood', 'cord'] },
  estoc: { guards: ['straight', 'ornate'], pommels: ['wheel', 'scentStopper'], grips: ['leather', 'cord', 'wire'] },
  greatsword: { guards: ['curved', 'straight', 'ornate'], pommels: ['fishtail', 'scentStopper', 'wheel'], grips: ['leather', 'cord', 'wire'] },
};

// ── Variants with their notes ──────────────────────────────────────────────────
type Variant<T extends string> = { id: T; name: string; era?: string; note: string };

export const GUARDS: Variant<GuardStyle>[] = [
  { id: 'straight', name: 'Straight', era: '9th–16th c.', note: 'A plain straight cross. Strong, and quick to recover.' },
  { id: 'curved', name: 'Curved', era: '13th c.', note: 'Arms bent toward the blade to catch a sliding edge.' },
  { id: 'ornate', name: 'Ornate', era: '15th c.', note: 'Slender arms ending in turned finials, a later fashion.' },
  { id: 'fantasy', name: 'Fantastic', era: 'Fantasy', note: 'No smith of history forged this one.' },
];
export const POMMELS: Variant<PommelStyle>[] = [
  { id: 'brazilNut', name: 'Brazil nut', era: '9th–11th c.', note: 'The common Viking counterweight, peened over the end of the tang.' },
  { id: 'disc', name: 'Disc', era: '10th–14th c.', note: 'A flat disc. It weighs less, so the balance drifts toward the point.' },
  { id: 'wheel', name: 'Wheel', era: '12th c.', note: 'A disc with raised rims, the knightly pommel of the high Middle Ages.' },
  { id: 'scentStopper', name: 'Scent stopper', era: '14th c.', note: 'Shaped like the stopper of a perfume bottle; popular in the late Middle Ages.' },
  { id: 'fishtail', name: 'Fishtail', era: '15th c.', note: 'A flared, faceted pommel of the late fifteenth century.' },
  { id: 'ornate', name: 'Ornate', era: '15th c.', note: 'A grooved wheel with a decorative band.' },
  { id: 'fantasy', name: 'Fantastic', era: 'Fantasy', note: 'Out of legend, with no historical model.' },
];
export const GRIPS: Variant<GripMaterial>[] = [
  { id: 'wood', name: 'Wood', note: 'Two halves of wood around the tang, bound tight.' },
  { id: 'leather', name: 'Leather', note: 'Leather over a wooden core. It darkens with handling.' },
  { id: 'cord', name: 'Cord', note: 'Cord under the leather gives a ridged, sure grip.' },
  { id: 'wire', name: 'Wire', era: '14th c.', note: 'Twisted wire, hard-wearing and bright. A later luxury.' },
];
export const STEELS: Variant<SteelFinish>[] = [
  { id: 'satin', name: 'Satin', note: 'A plain hand polish, the everyday finish.' },
  { id: 'polished', name: 'Polished', note: 'Mirror-bright: a lord’s sword.' },
  { id: 'patternWelded', name: 'Pattern-welded', note: 'Twisted rods forge-welded into a serpent-skin pattern.' },
  { id: 'darkened', name: 'Darkened', note: 'Darkened by heat, which slows rust.' },
];
export const FITTINGS: { id: HardwareTone; name: string; swatch: string }[] = [
  { id: 'darkIron', name: 'Dark iron', swatch: 'radial-gradient(circle at 35% 30%, #8a857e, #3c3b38 60%, #1d1c1a)' },
  { id: 'steel', name: 'Steel', swatch: 'radial-gradient(circle at 35% 30%, #f2f4f6, #aeb2b1 55%, #5f6262)' },
  { id: 'bronze', name: 'Bronze', swatch: 'radial-gradient(circle at 35% 30%, #e7b47a, #9b6a35 55%, #4a2f16)' },
  { id: 'brass', name: 'Brass', swatch: 'radial-gradient(circle at 35% 30%, #f6dfa4, #b8925a 55%, #5e4524)' },
];
export const CONDITIONS: Variant<SwordCondition>[] = [
  { id: 'pristine', name: 'Pristine', note: 'Fresh from the grinder.' },
  { id: 'used', name: 'Used', note: 'Carried and cared for.' },
  { id: 'battleWorn', name: 'Worn', note: 'Nicks and scratches from hard use.' },
  { id: 'ancient', name: 'Ancient', note: 'Dark with age, as if dug from a barrow.' },
];
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
  vikingSword: '8th–11th centuries', falchion: '13th–15th centuries', estoc: '14th–16th centuries', greatsword: '15th–16th centuries',
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
    lead: 'A single-edged, broad-bladed sword of the thirteenth to fifteenth centuries, related to the cleaver as much as to the knightly sword.',
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
