import * as THREE from 'three';
import type { PommelStyle } from '../store/configStore';

// Each profile is a Vector2[] array swept around the Y axis by LatheGeometry.
// X = radius (≥ 0), Y = height.  All profiles are centered at Y = 0 (the mesh
// origin) and extend from −halfHeight to +halfHeight.
// X = 0 at both ends closes the top and bottom cleanly.

export const POMMEL_HALF_HEIGHTS: Record<PommelStyle, number> = {
  wheel:        0.018,
  disc:         0.012,
  scentStopper: 0.026,
  brazilNut:    0.018,
  fishtail:     0.022,
  ornate:       0.020,
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

function v(r: number, y: number) {
  return new THREE.Vector2(r, y);
}

export const POMMEL_PROFILES: Record<PommelStyle, THREE.Vector2[]> = {

  // Classic disc with chamfered rim and a slightly recessed rivet centre on top.
  wheel: [
    v(0,     -0.018),
    v(0.010, -0.018), // flat bottom face
    v(0.024, -0.013), // lower chamfer
    v(0.026, -0.006), // equator zone
    v(0.026,  0.006),
    v(0.024,  0.013), // upper chamfer
    v(0.010,  0.018), // flat top outer
    v(0.005,  0.016), // recessed centre (rivet area sits slightly lower)
    v(0,      0.016),
  ],

  // Flatter than wheel, more prominent wide face, no recess.
  disc: [
    v(0,     -0.012),
    v(0.010, -0.012),
    v(0.025, -0.007),
    v(0.027,  0),
    v(0.025,  0.007),
    v(0.010,  0.012),
    v(0,      0.012),
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

  // Smooth oblate oval — common on Viking and early medieval swords.
  brazilNut: [
    v(0,     -0.018),
    v(0.010, -0.017),
    v(0.020, -0.012),
    v(0.025, -0.004),
    v(0.026,  0.002),
    v(0.024,  0.009),
    v(0.018,  0.015),
    v(0.008,  0.018),
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

  // Wheel form with a horizontal decorative groove dividing the upper third.
  ornate: [
    v(0,     -0.020),
    v(0.010, -0.020),
    v(0.024, -0.015),
    v(0.026, -0.006), // lower disc equator
    v(0.026,  0.002),
    v(0.022,  0.007), // groove outer wall
    v(0.017,  0.009), // groove valley
    v(0.022,  0.011), // groove inner wall
    v(0.025,  0.014), // upper disc
    v(0.020,  0.018),
    v(0.008,  0.020),
    v(0,      0.020),
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
