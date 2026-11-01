import type { PommelStyle } from '../store/configStore';

// Each profile is a list of [radius, y] points swept around the Y axis by LatheGeometry.
// Plain tuples (no three.js) so the UI can draw pommel silhouettes from the same data.
// X = radius (≥ 0), Y = height.  All profiles are centered at Y = 0 (the mesh
// origin) and extend from −halfHeight to +halfHeight.
// X = 0 at both ends closes the top and bottom cleanly.

export const POMMEL_HALF_HEIGHTS: Record<PommelStyle, number> = {
  wheel:        0.027,   // wheel and disc stand in the blade's plane: their half-height is the radius
  disc:         0.027,
  scentStopper: 0.026,
  brazilNut:    0.0135,  // flat against the grip, domed outward (see BRAZIL_NUT)
  fishtail:     0.022,
  ornate:       0.027,
  pyramid:      0.0245,  // upper guard + crown (see VIKING_POMMELS)
  lobed3:       0.0275,
  lobed5:       0.0205,
  writhen:      0.026,
};


export type ProfilePoint2 = readonly [number, number];

// How each profile becomes a solid. 'y': turned around the sword's axis (scent stopper, fishtail…);
// 'z': turned around the axis through the blade's flat, so a wheel or disc faces you as on the originals,
// and the profile's second value is depth, not height. `flatten` squeezes a 'y' solid front to back
// (a brazil nut and a fishtail are flat, not round).
export const POMMEL_FORM: Record<PommelStyle, { axis: 'y' | 'z' | 'solid' | 'plate' | 'viking' | 'writhen'; flatten?: number }> = {
  wheel: { axis: 'z' },
  disc: { axis: 'z' },
  ornate: { axis: 'z' },
  scentStopper: { axis: 'y' },
  brazilNut: { axis: 'solid' },   // a shaped solid (BRAZIL_NUT), not a turned one
  fishtail: { axis: 'plate' },    // a flat, bevelled plate (FISHTAIL_OUTLINE)
  pyramid: { axis: 'viking' },     // upper guard + crown (VIKING_POMMELS)
  lobed3: { axis: 'viking' },
  lobed5: { axis: 'viking' },
  writhen: { axis: 'writhen' },   // turned profile (POMMEL_PROFILES.writhen) cut with spiral flutes
};

// Writhen: how many flutes, how far they twist over the pommel's height (turns), how deep they cut.
export const WRITHEN = { flutes: 10, turns: 0.42, depth: 0.16 };

// Viking hilts (Petersen): an upper guard (a rounded bar, grip side) with the pommel's crown riveted
// beneath it. Measures from the research: type H upper guard 8.5 cm, guard + cap 4.9 cm tall (FHA KM
// 18402:1); type S pommel 78.8 × 39.9 × 36.5 mm (PAS KENT-328AD5); type K a short square-ish bar under
// five even lobes (Wallace A456). The crown is a front outline, top edge at y = 0, extruded with a bevel.
type Lobe = { x: number; y: number; r: number };
const lobedOutline = (halfWidth: number, lobes: Lobe[]): ProfilePoint2[] => {
  const pts: ProfilePoint2[] = [[-halfWidth, 0], [halfWidth, 0]];
  for (let i = 0; i <= 120; i++) {
    const x = halfWidth - (i / 120) * 2 * halfWidth;
    const y = Math.min(0, ...lobes.filter((l) => Math.abs(x - l.x) < l.r).map((l) => l.y - Math.sqrt(l.r * l.r - (x - l.x) ** 2)));
    pts.push([x, y]);
  }
  return pts;
};
export type VikingPommel = { upper: { halfWidth: number; halfHeight: number; halfDepth: number }; crown: ProfilePoint2[]; depth: number; bevel: number; bevelSize: number };
export const VIKING_POMMELS: Record<'pyramid' | 'lobed3' | 'lobed5', VikingPommel> = {
  // Type H/I: a small three-sided cap on a wide, domed upper guard.
  pyramid: {
    upper: { halfWidth: 0.0425, halfHeight: 0.0078, halfDepth: 0.0135 },
    crown: (() => { const pts: ProfilePoint2[] = [[-0.026, 0], [0.026, 0]]; for (let i = 0; i <= 16; i++) { const t = i / 16, u = 1 - t; pts.push([u * u * 0.026 + t * t * -0.026, u * u * -0.001 + 2 * u * t * -0.06 + t * t * -0.001]); } return pts.slice(0, -1); })(),
    depth: 0.004, bevel: 0.0068, bevelSize: 0.0042,
  },
  // Type S: a great sub-spherical central lobe between two smaller ones.
  lobed3: {
    upper: { halfWidth: 0.04, halfHeight: 0.0072, halfDepth: 0.0165 },
    crown: lobedOutline(0.035, [{ x: 0, y: -0.019, r: 0.0195 }, { x: -0.025, y: -0.007, r: 0.0105 }, { x: 0.025, y: -0.007, r: 0.0105 }]),
    depth: 0.014, bevel: 0.0085, bevelSize: 0.0035,
  },
  // Type K: five even lobes in a row over a short, square-ish bar.
  lobed5: {
    upper: { halfWidth: 0.0315, halfHeight: 0.0072, halfDepth: 0.0105 },
    crown: lobedOutline(0.03, [-0.024, -0.012, 0, 0.012, 0.024].map((x, i) => ({ x, y: -0.0082 - (i === 2 ? 0.003 : i === 1 || i === 3 ? 0.0015 : 0), r: i === 2 ? 0.0074 : 0.0066 }))),
    depth: 0.008, bevel: 0.003, bevelSize: 0.0024,
  },
};

// Brazil nut (Petersen's type X): wider than tall, flat where it meets the grip, domed toward the end.
export const BRAZIL_NUT = { halfWidth: 0.032, top: 0.009, bottom: 0.018, halfDepth: 0.0125, power: 0.85 };

// Fishtail (Oakeshott T): front outline, grip side up: a narrow neck flaring to two lobes with a
// hollowed end between them. Plain [x, y] points, so the card silhouette uses the same shape.
export const FISHTAIL_OUTLINE: ProfilePoint2[] = (() => {
  const h = 0.02, pts: ProfilePoint2[] = [];
  const q = (a: ProfilePoint2, c: ProfilePoint2, b: ProfilePoint2, n: number) => {
    for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; pts.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); }
  };
  pts.push([-0.012, h], [0.012, h]);
  q([0.012, h], [0.015, -0.004], [0.031, -h + 0.001], 12);   // right flank flares
  q([0.031, -h + 0.001], [0.033, -h - 0.002], [0.027, -h], 3);   // right lobe tip
  q([0.027, -h], [0, -h + 0.013], [-0.027, -h], 14);          // hollowed end
  q([-0.027, -h], [-0.033, -h - 0.002], [-0.031, -h + 0.001], 3);
  q([-0.031, -h + 0.001], [-0.015, -0.004], [-0.012, h], 12);
  pts.pop();
  return pts;
})();

function v(r: number, y: number): ProfilePoint2 {
  return [r, y];
}

// Turned and face-on pommels only (the shaped, plate and Viking ones are defined above).
export const POMMEL_PROFILES: Partial<Record<PommelStyle, ProfilePoint2[]>> = {

  // Writhen fig / pear (Cleveland 1921.1253, Wallace A479): a short neck under the grip, a pear body
  // swelling toward the end, and a small button. The spiral flutes are cut into this profile.
  writhen: [
    v(0,      0.026),
    v(0.0105, 0.026),
    v(0.0098, 0.021),  // neck
    v(0.0118, 0.016),
    v(0.0165, 0.008),
    v(0.0198, -0.002), // widest
    v(0.0192, -0.011),
    v(0.0158, -0.018),
    v(0.0092, -0.0225),
    v(0.0052, -0.0232), // button
    v(0.0056, -0.0252),
    v(0,      -0.026),
  ],

  // Wheel (Oakeshott H–K), in [radius, depth]: a raised central boss, a sunken ring around it and
  // chamfered rims, the same on both faces.
  wheel: [
    v(0,      -0.0135),
    v(0.0105, -0.0135), // boss face
    v(0.012,  -0.0118), // boss edge
    v(0.0135, -0.0098), // sunken ring
    v(0.0205, -0.0098),
    v(0.0255, -0.0062), // outer chamfer
    v(0.027,  -0.0032),
    v(0.027,   0.0032), // rim
    v(0.0255,  0.0062),
    v(0.0205,  0.0098),
    v(0.0135,  0.0098),
    v(0.012,   0.0118),
    v(0.0105,  0.0135),
    v(0,       0.0135),
  ],

  // Disc, in [radius, depth]: flat faces with a broad bevel to a narrow rim.
  disc: [
    v(0,      -0.0085),
    v(0.0185, -0.0085),
    v(0.0255, -0.0045),
    v(0.027,  -0.0015),
    v(0.027,   0.0015),
    v(0.0255,  0.0045),
    v(0.0185,  0.0085),
    v(0,       0.0085),
  ],

  // Wide base, narrow neck, wider domed cap — "mushroom" silhouette.
  scentStopper: [
    v(0,     -0.026),
    v(0.014, -0.024), // base spreads
    v(0.021, -0.018),
    v(0.022, -0.012), // shoulder
    v(0.022, -0.008),
    v(0.013, -0.001), // neck narrows
    v(0.011,  0.003), // waist
    v(0.016,  0.011), // cap opens
    v(0.021,  0.017), // cap equator
    v(0.019,  0.022), // cap narrows toward dome
    v(0.007,  0.026),
    v(0,      0.025),
  ],

  // Flattened oblate oval — common on Viking and early medieval swords. The
  // broad equator and compressed height make it read less like a generic bead
  // and closer to a brazil-nut counterweight.
  brazilNut: [
    v(0,     -0.018),
    v(0.011, -0.017),
    v(0.023, -0.013),
    v(0.032, -0.006),
    v(0.035,  0),
    v(0.032,  0.006),
    v(0.023,  0.013),
    v(0.011,  0.017),
    v(0,      0.018),
  ],

  // Pronounced lower flare with a slightly stepped waist and narrower upper disc.
  // The wider bottom half gives the characteristic "tailed" silhouette.
  fishtail: [
    v(0,     -0.022),
    v(0.010, -0.022), // flat bottom
    v(0.028, -0.016), // aggressive lower flare
    v(0.029, -0.008), // max radius at bottom zone
    v(0.022, -0.002), // waist step
    v(0.019,  0.002),
    v(0.023,  0.010), // upper disc
    v(0.024,  0.014),
    v(0.017,  0.020),
    v(0.007,  0.022),
    v(0,      0.022),
  ],

  // Ornate wheel, in [radius, depth]: a domed boss inside a raised moulded ring, then a broad bevel.
  ornate: [
    v(0,      -0.0125),
    v(0.006,  -0.0122), // domed boss
    v(0.0095, -0.0108),
    v(0.011,  -0.0092),
    v(0.0135, -0.0108), // raised moulded ring
    v(0.0155, -0.0118),
    v(0.0175, -0.0105),
    v(0.0195, -0.0088),
    v(0.0258, -0.0052), // bevel to the rim
    v(0.027,  -0.0026),
    v(0.027,   0.0026),
    v(0.0258,  0.0052),
    v(0.0195,  0.0088),
    v(0.0175,  0.0105),
    v(0.0155,  0.0118),
    v(0.0135,  0.0108),
    v(0.011,   0.0092),
    v(0.0095,  0.0108),
    v(0.006,   0.0122),
    v(0,       0.0125),
  ],


};
