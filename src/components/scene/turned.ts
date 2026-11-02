import * as THREE from 'three';

// Turned (lathe) solids for pommels and finials, built to read as machined metal up close: dense
// rotation, and every sharp corner of the profile rounded by a small arc, so edges catch a thin line of
// light instead of shading as a hard crease or a blurred bevel.

type P2 = readonly [number, number];

const CORNER = 0.6;   // rad: corners sharper than this get a rounding arc

/** Rounds the profile's sharp corners with arcs of about `radius` (never more than a third of a side). */
export function roundCorners(profile: readonly P2[], radius: number, steps = 4): P2[] {
  const out: P2[] = [profile[0]];
  for (let i = 1; i < profile.length - 1; i++) {
    const [px, py] = profile[i - 1], [x, y] = profile[i], [nx, ny] = profile[i + 1];
    const ax = x - px, ay = y - py, bx = nx - x, by = ny - y;
    const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
    const turn = la && lb ? Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)))) : 0;
    if (turn < CORNER) { out.push(profile[i]); continue; }
    const r = Math.min(radius, la / 3, lb / 3);
    const s: P2 = [x - (ax / la) * r, y - (ay / la) * r], e: P2 = [x + (bx / lb) * r, y + (by / lb) * r];
    // Quadratic arc from s to e with the corner as control point.
    for (let k = 0; k <= steps; k++) {
      const t = k / steps, u = 1 - t;
      out.push([u * u * s[0] + 2 * u * t * x + t * t * e[0], u * u * s[1] + 2 * u * t * y + t * t * e[1]]);
    }
  }
  out.push(profile[profile.length - 1]);
  return out;
}

export type TurnOptions = { axis?: 'x' | 'y' | 'z'; flatten?: number; segments?: number; bevel?: number };

/**
 * A lathe solid from [radius, height] points. axis 'y' turns around the sword's axis; 'z' turns around
 * the axis through the blade's flat (the profile's second value is then depth). `flatten` scales depth.
 */
export function turnedGeometry(profile: readonly P2[], { axis = 'y', flatten = 1, segments = 96, bevel = 0.0007 }: TurnOptions = {}): THREE.BufferGeometry {
  const pts = roundCorners(profile, bevel).map(([r, y]) => new THREE.Vector2(Math.max(0, r), y));
  const geo = new THREE.LatheGeometry(pts, segments);
  if (axis === 'z') geo.rotateX(Math.PI / 2);
  if (axis === 'x') geo.rotateZ(-Math.PI / 2);
  // LatheGeometry's own normals are smooth across its seam; rotate and scale carry them along correctly.
  if (flatten !== 1) geo.scale(1, 1, flatten);
  return geo;
}

/**
 * A closed solid from a function of the unit sphere's direction (u around Y in 0..1, v from the top pole
 * 0 to the bottom pole 1). Normals come from the surface's own derivatives, so there is no seam.
 */
export function paramSolid(shape: (d: THREE.Vector3) => THREE.Vector3, nu = 96, nv = 64): THREE.BufferGeometry {
  const dir = (u: number, v: number) => {
    const th = u * Math.PI * 2, ph = Math.min(Math.PI - 1e-4, Math.max(1e-4, v * Math.PI));
    return new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
  };
  const positions: number[] = [], normals: number[] = [], uvs: number[] = [], index: number[] = [];
  const e = 1e-3, du = new THREE.Vector3(), dv = new THREE.Vector3(), n = new THREE.Vector3();
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i <= nu; i++) {
      const u = i / nu, v = j / nv, p = shape(dir(u, v));
      du.subVectors(shape(dir(u + e, v)), shape(dir(u - e, v)));
      // At the poles the v-derivative alone is unreliable: step inside the surface instead.
      const vv = Math.min(1 - 2 * e, Math.max(2 * e, v));
      dv.subVectors(shape(dir(u, vv + e)), shape(dir(u, vv - e)));
      n.crossVectors(du, dv).normalize();   // u runs east, v runs south: this points outward
      if (j === 0) n.set(0, 1, 0);
      if (j === nv) n.set(0, -1, 0);
      positions.push(p.x, p.y, p.z); normals.push(n.x, n.y, n.z); uvs.push(u, v);
    }
  }
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
      index.push(a, b, c, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(index);
  geo.computeBoundingSphere();
  return geo;
}
