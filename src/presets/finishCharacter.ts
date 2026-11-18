import type { ArchetypeKey, GripMaterial, HardwareTone, SteelFinish } from '../store/configStore';

// Each sword type's finish character as numbers. One set of texture maps
// (public/textures/finish-blade.webp) serves every sword; a row here says how strongly each channel shows,
// in which zones, and with which tint, roughness and anisotropy. The order between types is the design:
// Viking cloudiest, longsword most even and brightest, falchion coarsest, estoc coldest.
// Plain data: no three.js here, so the table can be checked and read on its own.

export type BladeFinish = {
  tint: [number, number, number];   // multiplies the finish's base colour
  tileA: number; tileB: number;     // texture tiles in metres: A grind and stone (R, G), B cloud and skin (B, A)
  grind: number; cross: number; cloud: number;   // peak share of albedo for R, G and B
  skin: number; skinZone: 'fuller' | 'back' | 'forte' | null;   // forge-skin coverage and where it is left
  fuller: number; bevel: number; facet: number;  // zone steps: darker fuller, brighter edge bevel, the faces in shade a step darker (total step)
  rough: number; roughAmp: number; aniso: number;
  zoneTone: number;                 // the skin zone (back, forte) left a step darker and duller from the coarse stone
  honed: number;                    // 1 = the edge is re-honed bright with use; 0 = no edge to hone (estoc)
  pattern: number; core: number;    // pattern-welded only: the core's strength (peak share of albedo) and half-width (share of the blade's)
  forteEnd: number;                 // where the forte zone has faded out (share of the blade from its base)
  calm: number;                     // 1 = no mid-scale cloud in the age layers either (tarnish drawn out along the blade, an even haze)
};

type Row = Omit<BladeFinish, 'tint' | 'tileA' | 'tileB' | 'zoneTone' | 'honed' | 'pattern' | 'core' | 'forteEnd' | 'calm'> & { zoneTone?: number };
type TypeRows = { honed?: number; forteEnd?: number; calm?: number; pattern?: { pattern: number; core: number }; tint: Partial<Record<SteelFinish, BladeFinish['tint']>>; tileA: number; tileB: number; rows: Partial<Record<SteelFinish, Row>> };

const r = (grind: number, cross: number, cloud: number, skin: number, skinZone: BladeFinish['skinZone'], fuller: number, bevel: number, facet: number, rough: number, roughAmp: number, aniso: number, zoneTone = 0): Row =>
  ({ grind, cross, cloud, skin, skinZone, fuller, bevel, facet, rough, roughAmp, aniso, zoneTone });

// Tuned on full-view captures: Viking Satin, Longsword Satin and Polished first; then the falchion back,
// greatsword forte, longsword brighter, Polished on Viking/arming/bastard/greatsword smoother (clipped in bands). The other rows are
// starting values, not yet tuned. The shader steepens the maps (grind ×4.5, others ×3 around
// mid-grey) and leans the marks dark, so these numbers read stronger than they would in a plain mix.
const BLADE: Record<ArchetypeKey, TypeRows> = {
  vikingSword: {
    // Three rods fill the broad fuller (§1.4); the arming sword's core is narrower and quieter: an old blade in a newer hilt.
    pattern: { pattern: 0.20, core: 0.46 },
    tint: { satin: [0.95, 0.94, 0.92], polished: [0.97, 0.96, 0.95], patternWelded: [0.96, 0.96, 0.95] }, tileA: 0.26, tileB: 0.52,
    rows: {
      satin: r(0.24, 0.08, 0.07, 0.12, 'fuller', 0.34, 0.18, 0, 0.30, 0.18, 0.65),
      polished: r(0.08, 0.06, 0.18, 0.12, 'fuller', 0.28, 0.10, 0, 0.06, 0.10, 0.20),
      patternWelded: r(0.07, 0.05, 0.10, 0.10, 'fuller', 0.10, 0.10, 0, 0.22, 0.10, 0.25),
    },
  },
  armingSword: {
    pattern: { pattern: 0.16, core: 0.38 },
    tint: { satin: [1, 1, 1], polished: [1, 1, 1], patternWelded: [0.98, 0.98, 0.98] }, tileA: 0.22, tileB: 0.46,
    rows: {
      satin: r(0.25, 0.06, 0.08, 0.08, 'fuller', 0.20, 0.20, 0, 0.30, 0.14, 0.60),
      polished: r(0.06, 0, 0.13, 0, null, 0.14, 0.13, 0, 0.05, 0.07, 0.25),
      patternWelded: r(0.06, 0.02, 0.07, 0, null, 0.08, 0.12, 0, 0.20, 0.08, 0.25),
    },
  },
  longsword: {
    tint: { satin: [1.10, 1.11, 1.13], polished: [1.06, 1.07, 1.09] }, tileA: 0.18, tileB: 0.40,
    rows: {
      satin: r(0.14, 0, 0.04, 0, null, 0.10, 0.24, 0.10, 0.26, 0.12, 0.75),
      polished: r(0.06, 0, 0.12, 0, null, 0.08, 0.14, 0.12, 0.06, 0.06, 0.25),
    },
  },
  bastardSword: {
    tint: { satin: [1.00, 1.01, 1.02], polished: [1.00, 1.01, 1.02] }, tileA: 0.20, tileB: 0.44,
    rows: {
      satin: r(0.23, 0.12, 0.07, 0.05, 'fuller', 0.17, 0.21, 0.14, 0.29, 0.13, 0.65),
      polished: r(0.06, 0.07, 0.13, 0, null, 0.12, 0.13, 0.10, 0.05, 0.06, 0.25),
    },
  },
  greatsword: {
    forteEnd: 0.45,   // the forte reads above the leather-wrapped ricasso and the parrying hooks
    tint: { satin: [0.92, 0.93, 0.94], polished: [0.95, 0.96, 0.97] }, tileA: 0.30, tileB: 0.60,
    rows: {
      // A dark, rough forte fading within the first ~20 %, no forge-skin islands (they read as a black
      // splotch at the ricasso) and no wheel barring along the whole blade.
      satin: r(0.20, 0.05, 0.04, 0, 'forte', 0.22, 0.16, 0.16, 0.36, 0.17, 0.55, 0.42),
      polished: r(0.07, 0.04, 0.16, 0, 'forte', 0.14, 0.12, 0.10, 0.07, 0.09, 0.20, 0.18),
    },
  },
  falchion: {
    calm: 1,
    // Built from the Conyers original and a replica (no blade look without a cited
    // reference). Even grey steel with no zones (features 10–11): no darker back, only a thin lighter
    // honed edge and the one groove near the back (geometry; darker as a recess, feature 7). On the broad flat no mark
    // moves the gloss and none is mid-scale (2026-11-17, "low-res camouflage"): the grind is a fine, faint line only
    // (tile 14 cm), no polish cloud on Polished. Age (surface.ts, `calm`): a fine, soft patina mottle and, from Heirloom,
    // a scatter of small pits, as on the original (feature 10). The convex grind (Blade.tsx) shades the flat.
    tint: { satin: [0.84, 0.84, 0.83], polished: [0.94, 0.94, 0.93] }, tileA: 0.14, tileB: 0.50,
    rows: {
      satin: r(0.04, 0, 0, 0, null, 0.24, 0.10, 0, 0.40, 0, 0.50),
      polished: r(0.03, 0, 0, 0, null, 0.14, 0.08, 0, 0.11, 0, 0.20),
    },
  },
  estoc: {
    honed: 0,   // no edge to hone: a thrusting spike
    tint: { satin: [0.93, 0.96, 1.00], polished: [0.96, 0.98, 1.00] }, tileA: 0.16, tileB: 0.36,
    rows: {
      // No forge-skin islands at the forte (author, 2026-11-18): on a new blade they read as soot, as on the greatsword.
      satin: r(0.18, 0, 0.03, 0, 'forte', 0, 0, 0.20, 0.31, 0.10, 0.80, 0.12),
      polished: r(0.05, 0, 0.05, 0, 'forte', 0, 0, 0.14, 0.07, 0.04, 0.25, 0.05),
    },
  },
};

/** The blade finish for a sword type and steel. Pattern-welded is offered on the Viking and arming swords only
 *  (decision 2026-11-10, `offersPatternWelded`); on any other type it falls back to that type's Satin row. */
export function bladeFinish(archetype: ArchetypeKey, steel: SteelFinish): BladeFinish {
  const t = BLADE[archetype];
  const key: SteelFinish = t.rows[steel] ? steel : 'satin';
  const row = t.rows[key]!;
  const pw = key === 'patternWelded' && t.pattern ? t.pattern : { pattern: 0, core: 0 };
  return { tint: t.tint[key] ?? [1, 1, 1], tileA: t.tileA, tileB: t.tileB, ...row, zoneTone: row.zoneTone ?? 0, honed: t.honed ?? 1, forteEnd: t.forteEnd ?? 0.28, calm: t.calm ?? 0, ...pw };
}

/** Pattern-welding ran c. 3rd–10th c.: offered on the Viking sword, and on the arming sword with an "earlier" badge. */
export const offersPatternWelded = (archetype: ArchetypeKey) => !!BLADE[archetype].pattern;

// Ranges every value must stay inside (a typo here would make a blade white, black or mirror-flat). Tile A stays near
// the first draft's 16–30 cm: a coarser grind tile magnifies its texels when a broad blade is zoomed and reads low-res.
const RANGE: Record<keyof Omit<BladeFinish, 'tint' | 'skinZone'>, [number, number]> = {
  tileA: [0.14, 0.3], tileB: [0.25, 0.8], grind: [0, 0.25], cross: [0, 0.2], cloud: [0, 0.25], skin: [0, 0.7],
  fuller: [0, 0.4], bevel: [0, 0.4], facet: [0, 0.2], zoneTone: [0, 0.5], honed: [0, 1], forteEnd: [0.15, 0.6], pattern: [0, 0.2], core: [0, 0.6], calm: [0, 1], rough: [0.04, 0.5], roughAmp: [0, 0.25], aniso: [0.05, 0.9],
};
if (import.meta.env.DEV) {
  for (const [type, t] of Object.entries(BLADE)) {
    for (const steel of ['satin', 'polished'] as SteelFinish[]) {
      if (!t.rows[steel]) console.error(`finishCharacter: ${type} has no ${steel} row`);
    }
    for (const steel of Object.keys(t.rows) as SteelFinish[]) {
      const f = bladeFinish(type as ArchetypeKey, steel);
      for (const [k, [lo, hi]] of Object.entries(RANGE)) {
        const v = f[k as keyof typeof RANGE];
        if (!(v >= lo && v <= hi)) console.error(`finishCharacter: ${type} ${steel} ${k} = ${v} outside ${lo}–${hi}`);
      }
      if (f.tint.some((c) => c < 0.75 || c > 1.15)) console.error(`finishCharacter: ${type} ${steel} tint out of range`);
    }
  }
}

// ── Fittings and grips ─────────────────────────────────────────────────────
// One map (public/textures/finish-hilt.webp: R filed steel, G forge-black iron, B cast copper alloy, A organic
// mottle) serves every fitting and grip; a tone row says which channels show and how strongly, and each sword
// type twists it (Viking and greatsword hammered and coarse, longsword finely filed).

export type HiltFinish = {
  tile: number;                     // m: one tile of the map on the part
  amp: number;                      // peak share of albedo for the marks
  roughAmp: number;                 // the marks' gloss swing (bright = smoother)
  filed: number; forgeBlack: number; cast: number;   // channel weights
  scale: number;                    // share of the surface left in black fire scale (iron tones)
  rough: number;                    // base roughness at Forge
  gilt: number;                     // 1 = fire-gilt: burnished and frosted, wears through to the base metal, barely tarnishes
  hammer: number;                   // hammer-facet relief: 1 on hammered hilts (Viking, greatsword), 0 filed
  edge: number;                     // edges, rims and bosses rubbed brighter (share of albedo)
};
export type GripFinish = { tile: number; mottle: number; turnVar: number; overlap: number; rough: number };

type ToneRow = Omit<HiltFinish, 'tile' | 'hammer'> & { iron: boolean };
// Tuned on full captures: steel is filed strokes (±14 %) and bright edges, no mottle
// and no dark pits (they read as dirt); dark iron a blue-black scale over most of the part,
// graphite only on rubbed edges and high spots; brass and bronze show their cast skin and file-cleaned patches; gilt is
// led by its burnished/frosted cloud.
const TONES: Record<HardwareTone, ToneRow> = {
  steel: { amp: 0.26, roughAmp: 0.04, filed: 1.00, forgeBlack: 0, cast: 0, scale: 0, rough: 0.34, gilt: 0, edge: 0.10, iron: true },
  darkIron: { amp: 0.14, roughAmp: 0.08, filed: 0.15, forgeBlack: 1.00, cast: 0, scale: 0.90, rough: 0.52, gilt: 0, edge: 0.35, iron: true },
  brass: { amp: 0.24, roughAmp: 0.06, filed: 0.30, forgeBlack: 0, cast: 0.70, scale: 0, rough: 0.30, gilt: 0, edge: 0.08, iron: false },
  bronze: { amp: 0.34, roughAmp: 0.06, filed: 0.15, forgeBlack: 0, cast: 1.00, scale: 0, rough: 0.38, gilt: 0, edge: 0.08, iron: false },
  gilt: { amp: 0.05, roughAmp: 0, filed: 0.10, forgeBlack: 0, cast: 0.55, scale: 0, rough: 0.20, gilt: 1, edge: 0, iron: false },
};
// Type twist: tile (cm), amplitude ×, forge-black share + and hammer facets (hammered hilts only), roughness +; grips:
// leather roughness, mottle ×, cord turn variation ×. Viking and greatsword hilts are hammered in every iron tone
// (author, 2026-11-16); the others are filed and smoother.
type TypeTwist = { tile: number; amp: number; black: number; hammer: number; rough: number; leather: number; mottle: number; turnVar: number };
const TWIST: Record<ArchetypeKey, TypeTwist> = {
  vikingSword: { tile: 9, amp: 1.30, black: 0.25, hammer: 1, rough: 0.03, leather: 0.56, mottle: 1.3, turnVar: 1.2 },
  armingSword: { tile: 7, amp: 1.00, black: 0, hammer: 0, rough: 0, leather: 0.48, mottle: 1.0, turnVar: 1.0 },
  longsword: { tile: 5, amp: 0.70, black: 0, hammer: 0, rough: -0.04, leather: 0.42, mottle: 0.7, turnVar: 0.8 },
  bastardSword: { tile: 6, amp: 0.85, black: 0, hammer: 0, rough: -0.02, leather: 0.46, mottle: 0.9, turnVar: 1.0 },
  greatsword: { tile: 11, amp: 1.25, black: 0, hammer: 0.6, rough: 0.03, leather: 0.52, mottle: 1.2, turnVar: 1.4 },
  falchion: { tile: 8, amp: 1.20, black: 0, hammer: 0, rough: 0.04, leather: 0.54, mottle: 1.2, turnVar: 1.4 },
  estoc: { tile: 6, amp: 0.90, black: 0, hammer: 0, rough: -0.02, leather: 0.42, mottle: 0.7, turnVar: 0.8 },
};

/** The fittings' finish for a sword type and fitting tone. */
export function hiltFinish(archetype: ArchetypeKey, tone: HardwareTone): HiltFinish {
  const t = TONES[tone], w = TWIST[archetype];
  // Hammered types leave more of the forge on their iron: more black weight, more fire scale, and the facets.
  // Bright steel is filed clean on every type: no forge-black marks or fire scale left on it (they read as dirt).
  const black = t.iron && tone !== 'steel' ? t.forgeBlack + w.black : 0;
  return {
    tile: w.tile / 100, amp: t.amp * w.amp, roughAmp: t.roughAmp, filed: t.filed, forgeBlack: black, cast: t.cast,
    scale: t.iron && tone !== 'steel' ? Math.min(0.92, t.scale + 0.8 * w.black) : 0, rough: t.rough + w.rough, gilt: t.gilt,
    // Bright steel on a Viking hilt was filed and polished over its hammering: the facets stay as a soft swell, not the
    // full relief of black iron (which read as crumpled foil up close).
    hammer: t.iron ? (tone === 'steel' && archetype === 'vikingSword' ? 0.3 : Math.max(w.hammer, tone === 'darkIron' ? 0.35 : 0)) : 0, edge: t.edge,
  };
}

// Grip base (§4.4): leather mottle 0.15 with a darker overlapping edge, tile 5 cm; cord turn-to-turn ±12 %,
// matte; wire turn-to-turn ±6 % (its valleys come from the helix phase); wood keeps its grain map.
const GRIPS: Record<GripMaterial, GripFinish> = {
  leather: { tile: 0.035, mottle: 0.45, turnVar: 0, overlap: 0.30, rough: 0.48 },
  cord: { tile: 0.05, mottle: 0.03, turnVar: 0.22, overlap: 0, rough: 0.85 },
  wire: { tile: 0.05, mottle: 0, turnVar: 0.06, overlap: 0, rough: 0.30 },
  wood: { tile: 0.05, mottle: 0, turnVar: 0, overlap: 0, rough: 0.46 },
};

/** The grip's finish for a sword type and grip material. */
export function gripFinish(archetype: ArchetypeKey, material: GripMaterial): GripFinish {
  const g = GRIPS[material], w = TWIST[archetype];
  return { ...g, mottle: g.mottle * w.mottle, turnVar: g.turnVar * (material === 'cord' ? w.turnVar : 1), rough: material === 'leather' ? w.leather : g.rough };
}

if (import.meta.env.DEV) {
  for (const type of Object.keys(TWIST) as ArchetypeKey[]) {
    for (const tone of Object.keys(TONES) as HardwareTone[]) {
      const h = hiltFinish(type, tone);
      if (!(h.amp > 0 && h.amp <= 0.5 && h.rough >= 0.15 && h.rough <= 0.7 && h.scale <= 0.95 && h.hammer <= 1 && h.edge <= 0.4 && h.tile >= 0.04 && h.tile <= 0.12)) console.error(`finishCharacter: hilt ${type} ${tone} out of range`, h);
    }
  }
}
