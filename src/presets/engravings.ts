import type { ArchetypeKey } from '../store/configStore';

// Guard engravings: one bold motif on each arm, chosen from the sword type's own period, cut by hand and filled (dark
// on bright metal, bright on dark iron), or chiselled in relief. The motifs are rows of one atlas (public/textures/engrave-guard.webp, Codex
// ImageGen), each 8 times as wide as it is tall; `aspect` is how much of its row a motif
// takes (its box, width over height), `line` its typical stroke as a share of the box's height (measured on the
// atlas). Plain data: no three.js here.

export const ENGRAVE_ROWS = 9;
const CELL = {
  knot: { row: 0, aspect: 3.91, line: 0.105 },
  cristvs: { row: 1, aspect: 6.11, line: 0.137 },
  vincit: { row: 2, aspect: 5.14, line: 0.129 },
  maria: { row: 3, aspect: 2.55, line: 0.113 },
  dragon: { row: 5, aspect: 3.29, line: 0.066 },
  writhen: { row: 6, aspect: 3.98, line: 0.082 },
  dragonHead: { row: 7, aspect: 2.82, line: 0.082 },
  monster: { row: 8, aspect: 3.51, line: 0.105 },
} as const;
export type EngraveCell = (typeof CELL)[keyof typeof CELL];

// left / right: the arm on the viewer's left and right (seen from either face). text: the motif is lettering, read
// left to right on both arms; otherwise the left arm shows the right arm's motif mirrored, facing out to its tip.
// relief: chiselled, the figure standing from a cut-away ground, instead of cut in and filled.
export type GuardEngraving = { left: EngraveCell; right: EngraveCell; text: boolean; relief?: boolean; note: string; anchor?: string; anchorUrl?: string };

export const GUARD_ENGRAVINGS: Record<ArchetypeKey, GuardEngraving> = {
  vikingSword: { left: CELL.knot, right: CELL.knot, text: false,
    note: 'An interlace knot on each arm, one ribbon woven over and under itself, in the Trewhiddle style of the late ninth century.',
    anchor: 'the Abingdon sword, Ashmolean AN1890.14', anchorUrl: 'https://britisharchaeology.ashmus.ox.ac.uk/highlights/abingdon-sword.html' },
  armingSword: { left: CELL.cristvs, right: CELL.vincit, text: true,
    note: '+CRISTVS VINCIT+ in Romanesque capitals across the arms: the opening of the laudes that the imperial sword carries on its cross.',
    anchor: 'Kunsthistorisches Museum WS XIII 17', anchorUrl: 'https://www.khm.at/en/objectdb/detail/100441' },
  longsword: { left: CELL.maria, right: CELL.maria, text: true,
    note: 'maria on each arm in black-letter: the invocation of the Virgin engraved on the hilt of a hand-and-a-half sword of the early fifteenth century.',
    anchor: 'the Met 2006.564', anchorUrl: 'https://www.metmuseum.org/art/collection/search/27966' },
  bastardSword: { left: CELL.writhen, right: CELL.writhen, text: false,
    note: 'A writhen band on each arm, spiral flutes between two collars: the spiral chiselling of German hand-and-a-half hilts of about 1510.',
    anchor: 'V&A M.602-1927', anchorUrl: 'https://collections.vam.ac.uk/item/O97449/' },
  falchion: { left: CELL.dragon, right: CELL.dragon, text: false,
    note: 'A winged dragon on each arm, its tail curling into a leafy scroll, after the dragons engraved on the bronze cross of the Conyers falchion.',
    anchor: 'the Conyers falchion, Durham Cathedral', anchorUrl: 'https://www.durhamcathedral.co.uk/explore/treasures-collections/our-most-famous-items/the-conyers-falchion' },
  estoc: { left: CELL.dragonHead, right: CELL.dragonHead, text: false,
    note: 'A dragon’s head on each arm, looking out to the tip: the dragon-headed quillons of a thrusting sword of about 1530.',
    anchor: 'Kunsthistorisches Museum C 162', anchorUrl: 'https://www.khm.at/en/artworks/panzerstecher-373695' },
  greatsword: { left: CELL.monster, right: CELL.monster, text: false, relief: true,
    note: 'A monster’s head on each arm in low relief, its neck curling into an acanthus scroll, after the quillons chiselled with monsters’ heads on German two-handers of about 1540.',
    anchor: 'Wallace Collection A468', anchorUrl: 'https://wallacelive.wallacecollection.org/eMP/eMuseumPlus?service=ExternalInterface&module=collection&viewType=detailView&objectId=60961' },
};

// The face of a wheel, disc or ornate pommel: a cross flory in a ring (public/textures/engrave-medallion.webp: R the
// cut, G the field that takes enamel), as large as the flat it sits on: inside the raised boss of a wheel and of an
// ornate pommel, across the flat face of a disc (radius in m).
export const MEDALLION_RADIUS = { wheel: 0.0100, ornate: 0.0090, disc: 0.0180 } as const;
export const ENGRAVED_FACE_NOTE = 'A cross flory in a ring, cut into the face and filled: black on bright metal, bright on dark iron.';

// The motif is cut with lines no finer than this (m): about two device pixels in the guard's own shot.
export const ENGRAVE_MIN_LINE = 0.0006;

if (import.meta.env.DEV) {
  for (const [type, e] of Object.entries(GUARD_ENGRAVINGS)) for (const c of [e.left, e.right]) {
    if (!(c.row >= 0 && c.row < ENGRAVE_ROWS && c.aspect > 1 && c.aspect <= 8)) console.error(`engravings: ${type} has a cell outside the atlas`, c);
  }
}
