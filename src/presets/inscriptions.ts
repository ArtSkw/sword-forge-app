import type { ArchetypeKey } from '../store/configStore';

// Blade inscriptions and smith's marks (research: viking-arming §A2.1, §B2.2; long-bastard-great;
// falchion-estoc). The convention: a name or invocation on one face, a lattice or a second line on the
// other, welded into the fuller near the hilt. Viking letters are twisted pattern-welded rods (they read as
// a different steel, not a colour); knightly letters of the 13th c. are latten (brass), later silver.

export type Inlay = 'iron' | 'latten' | 'silver';
export type Inscription = {
  id: string; name: string; front: string; back: string | 'lattice'; inlay: Inlay;
  era: string; years: [number, number]; note: string;
};
export type SmithMark = { id: string; name: string; era: string; years: [number, number]; note: string };

export const INSCRIPTIONS: Inscription[] = [
  { id: 'ulfberht', name: '+VLFBERH+T', front: '+VLFBERH+T', back: 'lattice', inlay: 'iron', era: '9th–11th c.', years: [800, 1100],
    note: 'The most famous Frankish smith’s name, about 170 known, welded in twisted-steel letters; a woven lattice on the reverse.' },
  { id: 'ingelrii', name: '+INGELRII', front: '+INGELRII', back: 'lattice', inlay: 'iron', era: '10th–12th c.', years: [950, 1150],
    note: 'Another smith’s name, about twenty known, with a lattice in twisted damascus rods on the reverse.' },
  { id: 'beno', name: 'BENO ME FECIT', front: '+BENO ME FECIT', back: '+IN NOMINE DOMINI', inlay: 'iron', era: 'late 10th–11th c.', years: [970, 1100],
    note: '“Beno made me” on one face, “In the name of the Lord” on the other: maker and invocation, one per face.' },
  { id: 'gicelin', name: 'GICELIN ME FECIT', front: '+INNOMINEDOMINI+', back: '+GICELINMEFECIT+', inlay: 'iron', era: '11th–13th c.', years: [1050, 1250],
    note: '“In the name of the Lord” and “Gicelin made me”, run together without spaces as on the original.' },
  { id: 'nomineLatten', name: 'IN NOMINE DOMINI', front: '+IN NOMINE DOMINI+', back: '+IN NOMINE DOMINI+', inlay: 'latten', era: '12th–14th c.', years: [1150, 1350],
    note: 'A prayer in gold-coloured latten letters on a bright blade, the knightly fashion of the thirteenth century.' },
];

export const SMITH_MARKS: SmithMark[] = [
  { id: 'wolf', name: 'Running wolf', era: '14th–16th c.', years: [1350, 1600], note: 'The Passau wolf, inlaid in latten or copper: the best-known blade mark of the late Middle Ages.' },
  { id: 'orb', name: 'Orb and cross', era: '16th c.', years: [1500, 1600], note: 'A half-orb and cross, struck beside a wolf on the great two-handers of Munich and Passau.' },
  { id: 'crescents', name: 'Crescents', era: '15th–16th c.', years: [1400, 1600], note: 'A row of small crescents, a German smith’s mark.' },
  { id: 'cross', name: 'Cross in a circle', era: '11th–14th c.', years: [1050, 1350], note: 'A small inlaid cross within a circle, one of the commonest early symbols.' },
];

/** What each type offers in its Blade station (by period and by what the research found on its blades). */
export const BLADE_MARKINGS: Record<ArchetypeKey, { inscriptions: string[]; marks: string[] }> = {
  vikingSword: { inscriptions: ['ulfberht', 'ingelrii', 'beno', 'gicelin'], marks: ['cross'] },
  armingSword: { inscriptions: ['gicelin', 'nomineLatten'], marks: ['cross', 'wolf'] },
  longsword: { inscriptions: ['nomineLatten'], marks: ['wolf', 'crescents', 'cross'] },
  bastardSword: { inscriptions: [], marks: ['wolf', 'crescents', 'orb'] },
  falchion: { inscriptions: ['nomineLatten'], marks: ['crescents', 'wolf'] },
  estoc: { inscriptions: [], marks: ['wolf', 'crescents'] },
  greatsword: { inscriptions: [], marks: ['wolf', 'orb', 'crescents'] },
};

export const INLAYS: { id: Inlay; name: string; note: string }[] = [
  { id: 'iron', name: 'Twisted iron', note: 'Letters forged from twisted pattern-welded rods: they show as a different steel.' },
  { id: 'latten', name: 'Latten', note: 'Gold-coloured latten (brass) letters.' },
  { id: 'silver', name: 'Silver', note: 'Bright silver letters.' },
];
