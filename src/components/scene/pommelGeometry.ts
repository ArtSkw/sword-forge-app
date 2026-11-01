import * as THREE from 'three';
import type { PommelStyle } from '../../store/configStore';
import { BRAZIL_NUT, FISHTAIL_OUTLINE, POMMEL_FORM, POMMEL_HALF_HEIGHTS, POMMEL_PROFILES } from '../../presets/pommelProfiles';
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

export function pommelGeometry(style: PommelStyle): THREE.BufferGeometry {
  const form = POMMEL_FORM[style];
  if (form.axis === 'solid') return brazilNut();
  if (form.axis === 'plate') return fishtail();
  return turnedGeometry(POMMEL_PROFILES[style], { axis: form.axis, flatten: form.flatten });
}

// The tang's end, peened over at the pommel's far end: a small domed button (turned pommels end in
// their own cap and do not need one).
export const hasPeen = (style: PommelStyle) => POMMEL_FORM[style].axis !== 'y';
export const peenGeometry = () => turnedGeometry([[0, 0], [0.0036, 0], [0.0042, -0.0012], [0.0034, -0.0027], [0, -0.0034]], { segments: 48, bevel: 0.0004 });
// The fishtail's tang ends in the hollow between its lobes.
export const peenY = (style: PommelStyle) => (style === 'fishtail' ? -0.0135 : -POMMEL_HALF_HEIGHTS[style] + 0.0006);
