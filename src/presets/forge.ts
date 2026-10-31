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
      note: 'Broad and near-parallel, with a wide fuller and a rounded point — a cutting sword for a raider.',
      story: 'Named after the great trading town on the Schlei, where such blades changed hands. Broad, near-parallel edges and a gently rounded point made it a sword for cutting, not thrusting.' },
    { id: 'ulfberht', name: 'Ulfberht', era: `c.${NBSP}950`, length: 'medium', width: 'wide', fuller: 'single', shape: { bodyTaperMidWidth: 0.7, tipShoulderRound: 0.04 },
      note: 'The famous inlaid name runs down the fuller; the blade narrows toward a keener point.',
      story: 'Some of the finest blades of the age carry the inlaid name +VLFBERH+T. Many were made of unusually clean steel, and the type was copied — sometimes with misspelled names — by lesser smiths.' },
    { id: 'late', name: 'Late Viking', era: `c.${NBSP}1050`, length: 'medium', width: 'standard', fuller: 'single', shape: { bodyTaperEnd: 0.86, bodyTaperMidWidth: 0.55, tipShoulderRound: 0 },
      note: 'Longer and more tapered — already leaning toward the knightly swords that follow.',
      story: 'By the eleventh century blades grew longer and tapered more, with narrower fullers: the first steps toward the knightly swords of the following centuries.' },
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
  { id: 'straight', name: 'Straight', era: '9th–16th c.', note: 'A straight cross: simple, strong and quick to recover.' },
  { id: 'curved', name: 'Curved', era: '13th c.', note: 'Arms bent toward the blade to catch a sliding edge.' },
  { id: 'ornate', name: 'Ornate', era: '15th c.', note: 'Slender arms ending in turned finials — a later fashion.' },
  { id: 'fantasy', name: 'Fantastic', era: 'Fantasy', note: 'No smith of history forged this one.' },
];
export const POMMELS: Variant<PommelStyle>[] = [
  { id: 'brazilNut', name: 'Brazil nut', era: '9th–11th c.', note: 'The classic Viking counterweight, peened over the end of the tang.' },
  { id: 'disc', name: 'Disc', era: '10th–14th c.', note: 'A flat disc; lighter, it lets the balance drift toward the point.' },
  { id: 'wheel', name: 'Wheel', era: '12th c.', note: 'A disc with raised rims — the knightly pommel of the high Middle Ages.' },
  { id: 'scentStopper', name: 'Scent stopper', era: '14th c.', note: 'Shaped like the stopper of a perfume bottle — a late medieval fashion.' },
  { id: 'fishtail', name: 'Fishtail', era: '15th c.', note: 'A flared, faceted pommel of the late fifteenth century.' },
  { id: 'ornate', name: 'Ornate', era: '15th c.', note: 'A grooved wheel with a decorative band.' },
  { id: 'fantasy', name: 'Fantastic', era: 'Fantasy', note: 'An invention of legend, not of the forge.' },
];
export const GRIPS: Variant<GripMaterial>[] = [
  { id: 'wood', name: 'Wood', note: 'Two halves of wood around the tang, bound tight.' },
  { id: 'leather', name: 'Leather', note: 'Leather over wood; it darkens with every hand that holds it.' },
  { id: 'cord', name: 'Cord', note: 'Cord under the leather gives a ridged, sure grip.' },
  { id: 'wire', name: 'Wire', era: '14th c.', note: 'Twisted wire — a later luxury, hard-wearing and bright.' },
];
export const STEELS: Variant<SteelFinish>[] = [
  { id: 'satin', name: 'Satin', note: 'Hand-polished — the everyday finish.' },
  { id: 'polished', name: 'Polished', note: 'Mirror-bright: a lord’s sword.' },
  { id: 'patternWelded', name: 'Pattern-welded', note: 'Twisted rods forge-welded into a serpent-skin pattern.' },
  { id: 'darkened', name: 'Darkened', note: 'Heat-darkened to keep rust at bay.' },
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
  { id: 'ancient', name: 'Ancient', note: 'Dark with age — a sword from a barrow.' },
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
    title: 'The Viking Sword',
    lead: 'Between the eighth and eleventh centuries a sword was the most precious weapon a Norse warrior could own — often an heirloom, sometimes given a name of its own. Many blades were forged in the Frankish Rhineland and carried north by trade; their hilts were fitted at home, so a Frankish blade might wear a Scandinavian pommel.',
    fighting: 'Wielded in one hand, together with a round wooden shield. Fighters favoured strong cuts; the short guard stopped the hand from sliding onto the edge rather than parrying blows — the shield did the defending.',
  },
  armingSword: {
    title: 'The Arming Sword',
    lead: 'The knightly sword of the high Middle Ages: a straight, double-edged blade with a cruciform hilt, worn at the hip of every man-at-arms from the twelfth to the fourteenth century.',
    fighting: 'Used in one hand, usually with a shield or buckler; balanced for cutting and thrusting alike.',
  },
  longsword: {
    title: 'The Longsword',
    lead: 'A sword with a grip long enough for two hands, at home on the late medieval battlefield and in the fencing books of the German and Italian masters.',
    fighting: 'Wielded with both hands, with cuts, thrusts and binds taught in a full system of guards and techniques.',
  },
  bastardSword: {
    title: 'The Bastard Sword',
    lead: 'The hand-and-a-half sword: its grip leaves room for a second hand, so it can be used mounted with one hand or on foot with two.',
    fighting: 'Flexible by design — one hand in the saddle, both hands when the fight turned to foot.',
  },
  falchion: {
    title: 'The Falchion',
    lead: 'A single-edged, broad-bladed sword of the thirteenth to fifteenth centuries, related to the cleaver as much as to the knightly sword.',
    fighting: 'A chopping weapon, delivering heavy cuts with the weight carried toward the point.',
  },
  estoc: {
    title: 'The Estoc',
    lead: 'A long, rigid blade with a stiff, narrow point, built for one purpose: to find the gaps in plate armour.',
    fighting: 'Thrust, not cut — often with one hand on the grip and the other on the blade for precise, forceful points.',
  },
  greatsword: {
    title: 'The Greatsword',
    lead: 'The largest swords of the late Middle Ages and the Renaissance, carried by specialist soldiers in front of the pike block.',
    fighting: 'Two-handed sweeping blows; the parrying lugs above the guard let the wielder shorten the grip on the blade.',
  },
};
