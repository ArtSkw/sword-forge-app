// Viking wire inlay (Petersen types H and V): close-set furrows cut across the iron of the guards and the cap, each
// filled with a wire hammered flush, so the face becomes one skin of metal. A pattern is made at wire resolution:
// every column below is one wire, every row one length of it, and the metal changes along the wire from row to row.
// So patterns are pixel patterns of wires (stripes, stepped diamonds), never drawn shapes, and there are no
// lines between cells. Plain data (no three.js): the shader samples it as a small repeating texture.

export type InlayId = 'stripes' | 'lozenge';

// S silver, C copper.
export const INLAY_METALS = { S: 0, C: 1 } as const;

export type InlayPattern = {
  rows: readonly string[];   // one tile: columns = wires, rows = lengths along the wire (the tile repeats both ways)
  pitch: number;             // wire spacing (m)
  rowsAcross: number;        // rows across the guard's side wall (whole rows fit its height)
  texelsPerRow: number;      // texture rows per pattern row, so a texel is about a wire square
  jitter: number;            // how often a block's edge in a row sits a wire early or late (0–1): no ruled cell edges
  calm: number;              // 1 = silver and copper close in value (a quiet tonal pattern), 0 = their full contrast
};

export const INLAY_PATTERNS: Record<InlayId, InlayPattern> = {
  // One silver wire to two copper, full height, 24 to the centimetre: below a pixel it is one rose-silver sheen.
  stripes: { rows: ['SCC'], pitch: 0.00042, rowsAcross: 1, texelsPerRow: 1, jitter: 0, calm: 0 },
  // Small stepped copper rings round a silver heart, about 3.6 mm across (a little over half copper), the ringed
  // cells of the silver and copper reconstructions, at the lozenge lattice and 28 wires to the centimetre of
  // Petersen's type V (FHA KM 15175:1).
  lozenge: {
    rows: [
      'SCCCSSSSCCCS',
      'CCSSCCCCSSCC',
      'SSCCCSSCCCSS',
      'SSCCCSSCCCSS',
      'CCSSCCCCSSCC',
      'SCCCSSSSCCCS',
    ],
    pitch: 0.00036, rowsAcross: 24, texelsPerRow: 2, jitter: 0.2, calm: 1,
  },
};


// The side wall of a Viking guard is about this tall (m) where the inlay lies: the cap's rows take the same height.
export const INLAY_WALL = 0.0147;

export type InlayLevel = { data: Uint8Array; width: number; height: number };

/**
 * The pattern as RGBA texels (R silver, G copper share; B and A unused) with its full mip chain. Each level is
 * the exact area average of the one above, wrapped like the tile, so far away the wires blend to their true mean
 * colour instead of shimmering.
 */
export function inlayLevels(id: InlayId): InlayLevel[] {
  const p = INLAY_PATTERNS[id], w = p.rows[0].length, h = p.rows.length * p.texelsPerRow;
  let cur = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    const row = p.rows[Math.floor(y / p.texelsPerRow)];
    for (let x = 0; x < w; x++) cur[(y * w + x) * 3 + INLAY_METALS[row[x] as keyof typeof INLAY_METALS]] = 1;
  }
  const levels: InlayLevel[] = [];
  let cw = w, ch = h;
  const pack = (v: Float32Array, lw: number, lh: number) => {
    const data = new Uint8Array(lw * lh * 4);
    for (let i = 0; i < lw * lh; i++) {
      for (let k = 0; k < 3; k++) data[i * 4 + k] = Math.round(v[i * 3 + k] * 255);
      data[i * 4 + 3] = 255;
    }
    return { data, width: lw, height: lh };
  };
  levels.push(pack(cur, cw, ch));
  while (cw > 1 || ch > 1) {
    const nw = Math.max(1, Math.floor(cw / 2)), nh = Math.max(1, Math.floor(ch / 2)), next = new Float32Array(nw * nh * 3);
    // Separable box resampling with fractional coverage (exact for any size).
    const fx = cw / nw, fy = ch / nh;
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
      for (let sy = Math.floor(y * fy); sy < Math.ceil((y + 1) * fy); sy++) {
        const wy = Math.min(sy + 1, (y + 1) * fy) - Math.max(sy, y * fy);
        for (let sx = Math.floor(x * fx); sx < Math.ceil((x + 1) * fx); sx++) {
          const wx = Math.min(sx + 1, (x + 1) * fx) - Math.max(sx, x * fx), k = (wx * wy) / (fx * fy);
          for (let c = 0; c < 3; c++) next[(y * nw + x) * 3 + c] += cur[((sy % ch) * cw + (sx % cw)) * 3 + c] * k;
        }
      }
    }
    cur = next; cw = nw; ch = nh;
    levels.push(pack(cur, cw, ch));
  }
  return levels;
}

/** Self-check: every row of a tile has the same length, only known metals, and the tile repeats without a seam. */
export function checkInlayPatterns(): string[] {
  const errors: string[] = [];
  for (const [id, p] of Object.entries(INLAY_PATTERNS) as [InlayId, InlayPattern][]) {
    const w = p.rows[0]?.length ?? 0;
    if (!w) errors.push(`${id}: empty tile`);
    p.rows.forEach((r, i) => {
      if (r.length !== w) errors.push(`${id}: row ${i} has ${r.length} wires, not ${w}`);
      if (!/^[SC]+$/.test(r)) errors.push(`${id}: row ${i} has an unknown metal ("${r}")`);
    });
    // Seamless in u: where the tile repeats, no block of one metal grows wider across the tile's edge than any block
    // of that metal inside the tile (a block may straddle the edge, as the lozenges' rings do).
    const runs = (s: string, cyclic: boolean) => {
      const out: { m: string; n: number }[] = [];
      for (let i = 0; i < s.length; i++) {
        if (cyclic && s[i] === s[(i + s.length - 1) % s.length] && s.split('').some((c) => c !== s[i])) continue;
        let n = 1;
        while (n < s.length && (cyclic || i + n < s.length) && s[(i + n) % s.length] === s[i]) n++;
        out.push({ m: s[i], n });
      }
      return out;
    };
    for (const m of 'SC') {
      const inside = Math.max(0, ...p.rows.flatMap((r) => runs(r, false)).filter((x) => x.m === m).map((x) => x.n));
      p.rows.forEach((r, i) => {
        if (runs(r, true).some((x) => x.m === m && x.n > inside)) errors.push(`${id}: row ${i} widens a ${m} block across the tile's edge`);
      });
    }
    // The rows across the wall are whole tiles (the guard's top and bottom edges read alike).
    if (p.rowsAcross % p.rows.length !== 0 && p.rows.length > 1) errors.push(`${id}: ${p.rowsAcross} rows across the wall are not whole tiles of ${p.rows.length}`);
    // The mip chain ends in one texel holding the tile's mean share of each metal.
    const levels = inlayLevels(id), last = levels[levels.length - 1], mean = [0, 0, 0];
    for (const r of p.rows) for (const m of r) mean[INLAY_METALS[m as keyof typeof INLAY_METALS]] += 1 / (w * p.rows.length);
    if (last.width !== 1 || last.height !== 1 || mean.some((v, k) => Math.abs(last.data[k] / 255 - v) > 0.02)) errors.push(`${id}: mip chain does not end in the tile's mean`);
  }
  return errors;
}

if (import.meta.env?.DEV) for (const e of checkInlayPatterns()) console.error(`inlayPatterns: ${e}`);
