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
  fantasy:      0.026,
};

// Y coordinate of the bottom surface at center (r=0) for each pommel profile.
// Gems are set into the bottom end-cap (the visible end of the sword).
export const POMMEL_GEM_BOTTOM_Y: Record<PommelStyle, number> = {
  wheel:        -0.018,
  disc:         -0.012,
  scentStopper: -0.026,
  brazilNut:    -0.018,
  fishtail:     -0.022,
  ornate:       -0.020,
  fantasy:      -0.026,
};

export type ProfilePoint2 = readonly [number, number];

// How each profile becomes a solid. 'y': turned around the sword's axis (scent stopper, fishtail…);
// 'z': turned around the axis through the blade's flat, so a wheel or disc faces you as on the originals,
// and the profile's second value is depth, not height. `flatten` squeezes a 'y' solid front to back
// (a brazil nut and a fishtail are flat, not round).
export const POMMEL_FORM: Record<PommelStyle, { axis: 'y' | 'z' | 'solid' | 'plate'; flatten?: number }> = {
  wheel: { axis: 'z' },
  disc: { axis: 'z' },
  ornate: { axis: 'z' },
  scentStopper: { axis: 'y' },
  fantasy: { axis: 'y' },
  brazilNut: { axis: 'solid' },   // a shaped solid (BRAZIL_NUT), not a turned one
  fishtail: { axis: 'plate' },    // a flat, bevelled plate (FISHTAIL_OUTLINE)
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

export const POMMEL_PROFILES: Record<PommelStyle, ProfilePoint2[]> = {

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

  // Dramatic angular form: sharp bottom point, pronounced equatorial swell,
  // upper flare that tapers to a narrow neck and small top cap.
  fantasy: [
    v(0,     -0.026), // sharp bottom point
    v(0.007, -0.020),
    v(0.019, -0.012), // body widens
    v(0.022, -0.004), // body equator
    v(0.021,  0.003),
    v(0.016,  0.010), // waist
    v(0.021,  0.016), // upper flare (aggressive)
    v(0.022,  0.018),
    v(0.014,  0.022), // neck
    v(0.009,  0.026), // small top cap
    v(0,      0.025),
  ],

};
