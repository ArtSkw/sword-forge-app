import * as THREE from 'three';
import type { PommelStyle } from '../../store/configStore';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BRAZIL_NUT, FISHTAIL_OUTLINE, POMMEL_FORM, POMMEL_HALF_HEIGHTS, POMMEL_PROFILES, VIKING_POMMELS, WRITHEN } from '../../presets/pommelProfiles';
import { roundCorners } from './turned';
import { paramSolid, turnedGeometry } from './turned';

// One solid per pommel style, centred on the pommel's slot (grip side up, +Y), each made the way the
// originals were shaped: turned (scent stopper), a disc standing in the blade's plane (wheel, disc,
// ornate), a shaped nut (brazil nut) or a flat bevelled plate (fishtail).

const sgnPow = (x: number, p: number) => Math.sign(x) * Math.abs(x) ** p;

function brazilNut(): THREE.BufferGeometry {
  const { halfWidth, top, bottom, halfDepth, power } = BRAZIL_NUT;
  const shift = (bottom - top) / 2;   // centre the solid on its slot
  return paramSolid((d) => new THREE.Vector3(
    halfWidth * sgnPow(d.x, power),
    (d.y > 0 ? top : bottom) * sgnPow(d.y, power) + shift,
    halfDepth * sgnPow(d.z, power),
  ));
}

function fishtail(): THREE.BufferGeometry {
  const shape = new THREE.Shape(FISHTAIL_OUTLINE.map(([x, y]) => new THREE.Vector2(x, y)));
  const depth = 0.009, bevel = 0.0022;
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: 0.0016, bevelSegments: 5, curveSegments: 24 });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

// Viking hilt: the upper guard (a rounded bar, gently domed faces) and the crown riveted beneath it.
// The upper guard's superellipsoid powers per axis, and the pyramid cap's base half-width, half-depth and height.
const UPPER_POW = { x: 0.42, y: 0.62, z: 0.7 };
const PYRAMID = { a: 0.025, c: 0.0105, h: 0.031 };
const crownTop = (style: VikingStyle) => POMMEL_HALF_HEIGHTS[style] - 2 * VIKING_POMMELS[style].upper.halfHeight + 0.0012;   // tucked a little into the guard
type VikingStyle = 'pyramid' | 'lobed3' | 'lobed5';

/**
 * Where the wire inlay finds the parts of a Viking pommel (its own coordinates): the upper guard's size, centre and
 * powers (its underside, and so the seam with the cap, follows from them), and the cap's top, point and taper.
 */
export function vikingInlayFrame(style: VikingStyle) {
  const { halfWidth, halfHeight, halfDepth } = VIKING_POMMELS[style].upper, top = crownTop(style);
  return {
    upper: [halfWidth, halfHeight, halfDepth, POMMEL_HALF_HEIGHTS[style] - halfHeight] as const,
    // |x/w|^px + |z/d|^pz + |y/h|^py = 1 (from d.x² + d.y² + d.z² = 1), and 1/py to solve for y.
    pow: [2 / UPPER_POW.x, 2 / UPPER_POW.z, UPPER_POW.y / 2] as const,
    // The pyramid's flat faces run between its two rounded ends: their straight half-length shrinks to the point.
    crown: (style === 'pyramid' ? [top, top - PYRAMID.h, PYRAMID.a - PYRAMID.c, 0] : [top, top - 0.04, 0, 1]) as [number, number, number, number],
  };
}

function viking(style: VikingStyle): THREE.BufferGeometry {
  const v = VIKING_POMMELS[style], half = POMMEL_HALF_HEIGHTS[style], { halfWidth, halfHeight, halfDepth } = v.upper;
  const upper = paramSolid((d) => new THREE.Vector3(halfWidth * sgnPow(d.x, UPPER_POW.x), halfHeight * sgnPow(d.y, UPPER_POW.y), halfDepth * sgnPow(d.z, UPPER_POW.z)), 96, 48);
  upper.translate(0, half - halfHeight, 0);
  const top = crownTop(style);
  let crown: THREE.BufferGeometry;
  if (style === 'pyramid') {
    // An inverted pyramid with softened edges: a rounded-square base under the guard tapering to a point.
    const { a, c, h } = PYRAMID;
    crown = paramSolid((d) => {
      const th = Math.atan2(d.z, d.x), t = d.y < 0 ? -d.y : 0, s = 1 - t;
      return new THREE.Vector3(a * s * sgnPow(Math.cos(th), 0.5), d.y < 0 ? -t * h : d.y * 0.002, c * s * sgnPow(Math.sin(th), 0.5));
    }, 96, 48).toNonIndexed();
  } else if (style === 'lobed3') {
    // Type S: a near-spherical central lobe (PAS KENT-328AD5: "sub-spherical") between two smaller ones.
    const lobe = (cx: number, cy: number, r: number, depth: number) => {
      const g = paramSolid((d) => new THREE.Vector3(cx + r * d.x, cy + r * d.y, depth * d.z), 64, 40);
      return g.toNonIndexed();
    };
    // One mass: a broad base under the guard that the lobes grow out of, the side lobes melting into the centre.
    const base = paramSolid((d) => new THREE.Vector3(0.0335 * sgnPow(d.x, 0.7), d.y > 0 ? d.y * 0.002 : 0.0125 * d.y, 0.0158 * sgnPow(d.z, 0.8)), 64, 40).toNonIndexed();
    const parts = [base, lobe(0, -0.0172, 0.0182, 0.0168), lobe(-0.0212, -0.0098, 0.0112, 0.0138), lobe(0.0212, -0.0098, 0.0112, 0.0138)];
    crown = mergeGeometries(parts, false)!;
    parts.forEach((g) => g.dispose());
  } else {
    const shape = new THREE.Shape(v.crown.map(([x, y]) => new THREE.Vector2(x, y)));
    crown = new THREE.ExtrudeGeometry(shape, { depth: v.depth, bevelEnabled: true, bevelThickness: v.bevel, bevelSize: v.bevelSize, bevelSegments: 6, curveSegments: 24 });
    crown.translate(0, 0, -v.depth / 2);
    crown.computeVertexNormals();
  }
  crown.translate(0, top, 0);
  // ExtrudeGeometry is non-indexed; the merge needs both alike.
  const merged = mergeGeometries([upper.toNonIndexed(), crown], false);
  upper.dispose(); crown.dispose();
  if (!merged) throw new Error(`pommel ${style}: parts did not merge`);
  return merged;
}

// Writhen: the turned profile cut with spiral flutes. Each ring is built around the axis; the flutes
// (a smooth cosine groove) twist with height and fade out at the neck and the button.
function writhen(): THREE.BufferGeometry {
  const prof = roundCorners(POMMEL_PROFILES.writhen!, 0.0006), segs = 160, rows = prof.length;
  const top = prof[0][1], bottom = prof[rows - 1][1];
  const fine: [number, number][] = [];
  for (let i = 0; i < rows - 1; i++) for (let k = 0; k < 6; k++) { const t = k / 6; fine.push([prof[i][0] + (prof[i + 1][0] - prof[i][0]) * t, prof[i][1] + (prof[i + 1][1] - prof[i][1]) * t]); }
  fine.push([prof[rows - 1][0], prof[rows - 1][1]]);
  const positions: number[] = [], index: number[] = [];
  fine.forEach(([r, y]) => {
    const h = (top - y) / (top - bottom), fade = Math.sin(Math.PI * Math.min(1, Math.max(0, (h - 0.12) / 0.78)));
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      const groove = 0.5 - 0.5 * Math.cos(WRITHEN.flutes * (a + h * WRITHEN.turns * Math.PI * 2));
      const rr = r * (1 - WRITHEN.depth * fade * groove ** 1.6);
      positions.push(Math.cos(a) * rr, y, Math.sin(a) * rr);
    }
  });
  for (let i = 0; i < fine.length - 1; i++) for (let j = 0; j < segs; j++) {
    const a = i * (segs + 1) + j, b = a + 1, c = a + segs + 1, d = c + 1;
    index.push(a, b, c, b, d, c);   // the profile runs top to bottom: this winding faces outward
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

export function pommelGeometry(style: PommelStyle): THREE.BufferGeometry {
  const form = POMMEL_FORM[style];
  if (form.axis === 'solid') return brazilNut();
  if (form.axis === 'plate') return fishtail();
  if (form.axis === 'viking') return viking(style as 'pyramid' | 'lobed3' | 'lobed5');
  if (form.axis === 'writhen') return writhen();
  return turnedGeometry(POMMEL_PROFILES[style] ?? [], { axis: form.axis as 'y' | 'z', flatten: form.flatten });
}
