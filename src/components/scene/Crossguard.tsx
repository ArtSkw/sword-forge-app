import type { ArchetypeKey, GuardMm, GuardStyle, GuardTerminal, HardwareTone } from '../../store/configStore';
import { engraveUniforms, setGuardEngraving, surface } from './surface';
import * as THREE from 'three';
import { useEffect, useLayoutEffect, useMemo } from 'react';
import { turnedGeometry } from './turned';
import { fitToBlade, guardDef, swellAt, GUARDS_BY_TYPE, type GuardDef } from '../../presets/guardShapes';
import { guardBlock, type GuardBlock } from '../../presets/archetypeDetails';
import { ENGRAVE_MIN_LINE, ENGRAVE_ROWS, GUARD_ENGRAVINGS, type EngraveCell } from '../../presets/engravings';
import { TERMINALS } from '../../presets/forge';
import type { BladeSpec } from '../../lib/bladeSpec';
import { bladeDepthAt, bladeFaceAt } from './bladeFace';

// Where the écusson's base sits above the cross's centre line: at most this high, and low enough to sink
// ECUSSON_SINK into the cross (or its block) where the plate meets it, so no gap shows under it on a round bar.
const ECUSSON_Y = 0.0054, ECUSSON_SINK = 0.0008;


// Cross-section: a rectangle with rounded corners (an arc of CORNER_STEPS per corner), so each long face
// stays flat and every arris catches a thin line of light. Listed CCW seen from +X, in [y, z]. Eight steps a
// corner: a round bar is then a 32-gon, whose outline stays smooth at the Guard station's close view.
const CORNER_FRACTION = 0.32;   // corner radius as a share of the smaller half-extent
const CORNER_STEPS = 8;
function section(sy: number, sz: number, round = CORNER_FRACTION): [number, number][] {
  const r = Math.min(sy, sz) * Math.min(0.999, round), pts: [number, number][] = [];
  const centres: [number, number, number][] = [[sy - r, -(sz - r), -Math.PI / 2], [sy - r, sz - r, 0], [-(sy - r), sz - r, Math.PI / 2], [-(sy - r), -(sz - r), Math.PI]];
  for (const [cy, cz, a0] of centres) {
    for (let k = 0; k <= CORNER_STEPS; k++) { const a = a0 + (k / CORNER_STEPS) * (Math.PI / 2); pts.push([cy + r * Math.cos(a), cz + r * Math.sin(a)]); }
  }
  return pts;
}
const N_CS = 4 * (CORNER_STEPS + 1);
// The arm ends are domed (except where an end piece takes them in: see `domed`): a few shrinking rings past
// each tip before the end cap.
const END_RINGS = [0.45, 0.75, 0.93];

// Turned (baluster) finial for an arm tip of 6 mm half-section, as [radius, along the arm]: a neck, a bead,
// a swelling bulb and a small button. Scaled to the arm's real tip and turned around the arm (axis X).
const FINIAL_PROFILE: [number, number][] = [
  [0, 0], [0.0058, 0], [0.0048, 0.002], [0.0072, 0.0042], [0.0072, 0.0056], [0.0046, 0.0074],
  [0.0068, 0.0108], [0.0092, 0.0148], [0.0086, 0.0186], [0.0052, 0.0216], [0.0036, 0.0232], [0.0042, 0.0246], [0, 0.0262],
];

const FLARE = 1.5, HOOK = 0.019;
const ease2 = (a: number, b: number, x: number) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k; };
// A ramp that leaves its start with no bend at all (k³(2 − k): no slope and no curvature at 0) and ends at the same
// slope as k²: a hook grown with it turns out of the arm's own curve without a knee.
const ease3 = (a: number, b: number, x: number) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * k * (2 - k); };
const smoothstep = (a: number, b: number, x: number) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
// Where an arm is at u (0 centre, 1 tip) on side ±1: its bend toward the blade and its front-back offset.
const bendAt = (d: GuardDef, u: number) => (d.linear ? d.tipY * u : d.tipY * u * u);
const recurveAt = (d: GuardDef, u: number, side: number) => side * (d.recurve ?? 0) * u * u;
// A turned finial or a quatrefoil plate takes the arm's end inside itself: those arms end flat, not domed.
const domed = (terminal: GuardTerminal) => terminal !== 'finial' && terminal !== 'quatrefoil';

/** The arm's centre line and section at u (0 centre, 1 tip) on side ±1, as built (ends excluded). */
function armShape(d: GuardDef, terminal: GuardTerminal) {
  const { width, tipScale } = d;
  const flared = terminal === 'flared', hooked = terminal === 'hooked';
  // Spatulate ends broaden in the blade's direction and thin front to back; hooked ends turn toward the blade.
  const flareAt = (u: number) => (flared ? ease2(0.62, 1, u) : 0);
  const hookAt = (u: number) => (hooked ? HOOK * ease3(0.66, 1, u) : 0);
  // A quatrefoil's arm narrows front to back into a neck before it reaches the plate, so it runs into the
  // plate's edge well inside its faces (the plate, centred 1.7 tip radii past the end with lobes of 2.1, reaches
  // 0.4 tip radii back along the arm; the tip radius is the larger of the tip's half-height and half-depth).
  const neck = terminal === 'quatrefoil' ? 1 - (0.4 * Math.max(d.secY, d.secZ) * tipScale + 0.002) / (width / 2) : 1;
  const thinAt = (u: number) => (terminal === 'quatrefoil' ? 1 - 0.4 * smoothstep(neck - 0.01 / (width / 2), neck, u) : 1);
  // Hooked arms keep their thickness to the end (no thin, whippy tip) and finish in a small knob. A measured cross
  // thins front to back on its own scale (tipScaleZ: a bar that is flat at the ends but deep where it holds the blade),
  // and its hooks may taper to points (pointScale): the height eases down over the hook, with no knob.
  const point = hooked && d.pointScale !== undefined;
  const tipK = hooked ? Math.max(tipScale, 0.86) : tipScale, tipKZ = d.tipScaleZ ?? tipK, knob = hooked && !point ? 1.22 : 1;
  const pointAt = (u: number) => (point ? 1 - (1 - (d.pointScale ?? 0) / tipK) * ease3(0.66, 1, u) : 1);
  // The section (sy, sz) is the arm's own, square to its centre line; `lean` is how much taller an upright cut
  // through the arm is where it climbs (1 on a level arm).
  const yAt = (u: number) => bendAt(d, u) + hookAt(u);
  const lean = (u: number) => { const h = 1e-4, a = Math.max(0, u - h), b = Math.min(1, u + h); return Math.hypot(1, (yAt(b) - yAt(a)) / ((b - a) * (width / 2))); };
  const at = (u: number, side: number) => {
    const kn = 1 + (knob - 1) * ease2(0.9, 1, u), sc = (1.0 - u * (1.0 - tipK)) * kn, scZ = (1.0 - u * (1.0 - tipKZ)) * kn;
    const fl = flareAt(u), x = side * u * (width / 2);
    // The centre swells front to back where a thick blade enters it (fitToBlade).
    return { x, y: yAt(u), z: recurveAt(d, u, side), sy: d.secY * sc * pointAt(u) * (1 + FLARE * fl), sz: d.secZ * scZ * (1 - 0.3 * fl) * thinAt(u) + swellAt(d, x), lean: lean(u) };
  };
  // The domed end: the tip's section.
  const tip = { sy: d.secY * tipK * knob * pointAt(1) * (1 + FLARE * flareAt(1)), sz: d.secZ * tipKZ * knob * (1 - 0.3 * flareAt(1)) * thinAt(1) };
  return { at, tip };
}

/**
 * The plane each section of the arm is cut in, at u on side ±1: the centre line's point, its direction (toward +x on
 * both arms), the section's axes (y toward the blade's side, z front to back) and the stretch of its y. Sections are
 * cut square to the arm, so a bent or hooked arm keeps its own thickness all the way round the bend and its end
 * continues the curve. Only where the straight arms of a linear cross meet in a V at the centre does the cut ease
 * back to upright (over the first 12 % of each arm), stretched to the same thickness, so the two arms share one
 * section there instead of folding through each other.
 */
type ArmFrame = { c: THREE.Vector3; t: THREE.Vector3; ny: THREE.Vector3; nz: THREE.Vector3; stretch: number };
function armFrames(d: GuardDef, terminal: GuardTerminal) {
  const { at } = armShape(d, terminal);
  const P = (u: number, side: number) => { const a = at(u, side); return new THREE.Vector3(a.x, a.y, a.z); };
  return (u: number, side: 1 | -1): ArmFrame => {
    const h = 1e-4, a = Math.max(0, u - h), b = Math.min(1, u + h);
    const t = P(b, side).sub(P(a, side)).multiplyScalar(side).normalize();
    const n = new THREE.Vector3(1, 0, 0).lerp(t, d.linear ? smoothstep(0, 0.12, u) : 1).normalize();
    const ny = new THREE.Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize(), nz = new THREE.Vector3().crossVectors(n, ny);
    return { c: P(u, side), t, ny, nz, stretch: 1 / Math.max(0.2, n.dot(t)) };
  };
}
/** A section's points laid in its frame. */
const placeSection = (f: ArmFrame, pts: [number, number][]) => pts.map(([y, z]) => f.c.clone().addScaledVector(f.ny, y * f.stretch).addScaledVector(f.nz, z));

// Where the rings go along an arm (u from 0 to 1): no further apart than RING_STEP along the centre line, than
// RING_TURN in its direction, or than RING_SIZE of change in the section, whichever is tightest. Straight runs get
// a ring every 1.5 mm; bends, hooks, flares and knobs get more, so no curve shows as a polygon.
const RING_STEP = 0.0015, RING_TURN = THREE.MathUtils.degToRad(2), RING_SIZE = 0.0003;
function armStations(d: GuardDef, terminal: GuardTerminal): number[] {
  const { at } = armShape(d, terminal), frame = armFrames(d, terminal), F = 1200, m = [0];
  let pf = frame(0, 1), pa = at(0, 1);
  for (let i = 1; i <= F; i++) {
    const f = frame(i / F, 1), a = at(i / F, 1);
    m.push(m[i - 1] + f.c.distanceTo(pf.c) / RING_STEP + f.t.angleTo(pf.t) / RING_TURN + (Math.abs(a.sy - pa.sy) + Math.abs(a.sz - pa.sz)) / RING_SIZE);
    pf = f; pa = a;
  }
  const n = Math.max(12, Math.ceil(m[F])), us = [0];
  for (let k = 1, i = 0; k < n; k++) {
    const target = (k / n) * m[F];
    while (m[i + 1] < target) i++;
    us.push((i + (target - m[i]) / Math.max(1e-12, m[i + 1] - m[i])) / F);
  }
  us.push(1);
  return us;
}

/** Where the arm ends and how thick it is there (for placing terminals). */
function armEnd(d: GuardDef, terminal: GuardTerminal) {
  const flare = terminal === 'flared' ? 1 + FLARE : 1;
  return { x: d.width / 2, y: bendAt(d, 1) + (terminal === 'hooked' ? HOOK : 0), z: d.recurve ?? 0, sy: d.secY * d.tipScale * flare, sz: d.secZ * (d.tipScaleZ ?? d.tipScale) * (terminal === 'flared' ? 0.7 : 1) };
}

/** The arm's end on side ±1: its centre and the turn that carries +x (×side) onto the arm's own direction there. */
function endFrame(d: GuardDef, terminal: GuardTerminal, side: 1 | -1) {
  const half = d.width / 2, end = armEnd(d, terminal);
  const dir = new THREE.Vector3(side, (d.linear ? d.tipY : 2 * d.tipY) / half, side * 2 * (d.recurve ?? 0) / half).normalize();
  const pos = new THREE.Vector3(side * end.x, end.y, side * end.z), quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(side, 0, 0), dir);
  return { pos, quat, position: pos.toArray(), quaternion: quat.toArray() as [number, number, number, number] };
}

// The finial's radius at a distance a along it (profile units, before scaling).
function finialRadius(a: number): number {
  const p = FINIAL_PROFILE;
  for (let i = 2; i < p.length; i++) if (a <= p[i][1]) { const [r0, y0] = p[i - 1], [r1, y1] = p[i]; return r0 + (r1 - r0) * ((a - y0) / Math.max(1e-9, y1 - y0)); }
  return 0;
}

// End pieces close over the arm's last section with this much to spare (less would lie nearly flush with it).
const END_CLEAR = 0.0004;

/** The arm's last section (side +1; the other is its mirror) in the end frame: x along the arm, y–z across it. */
function endSection(d: GuardDef, terminal: GuardTerminal) {
  const a = armShape(d, terminal).at(1, 1), { pos, quat } = endFrame(d, terminal, 1), inv = quat.clone().invert();
  return placeSection(armFrames(d, terminal)(1, 1), section(a.sy, a.sz, d.round)).map((p) => p.sub(pos).applyQuaternion(inv));
}

/**
 * Fits the turned finial over the arm's end: how far back along the arm it starts (so the whole flat end lies
 * inside it) and its scale (so its neck clears the
 * corners of a square or flat bar, not only a round one; twice the clearance, as the finial's turned profile is
 * rounded at its base).
 */
function fitFinial(d: GuardDef, terminal: GuardTerminal, tipR: number) {
  const pts = endSection(d, terminal), back = Math.max(0, ...pts.map((p) => -p.x)) + 0.0008;   // past the rounding of its base
  let scale = tipR / 0.006;
  for (let k = 0; k < 6; k++) scale = Math.max(tipR / 0.006, ...pts.map((p) => (Math.hypot(p.y, p.z) + 2 * END_CLEAR) / Math.max(1e-4, finialRadius((p.x + back) / scale))));
  return { back, scale };
}

/**
 * Fits the knob (radius r, depth squeezed by zs) over the arm's end: its centre sits 0.75 r past the end, or
 * nearer where the bar's corners would otherwise show at its neck; a knob too small for the corners grows.
 */
function fitKnob(d: GuardDef, terminal: GuardTerminal, r0: number, zs: number) {
  const pts = endSection(d, terminal), reach = Math.max(...pts.map((p) => Math.hypot(p.y, p.z / zs)));
  const r = Math.max(r0, reach + END_CLEAR + 0.001);
  const centre = Math.min(0.75 * r, ...pts.map((p) => p.x + Math.sqrt(Math.max(0, (r - END_CLEAR) ** 2 - p.y ** 2 - (p.z / zs) ** 2))));
  return { r, centre };
}

/**
 * Along the arm's centre line: its length from the centre to u (m) and the face's half-height measured square to the
 * arm (the section's own), at u (0 centre, 1 tip).
 */
function armLine(d: GuardDef, terminal: GuardTerminal) {
  const { at } = armShape(d, terminal), N = 240, half = d.width / 2, arc = [0];
  const p = (u: number) => at(u, 1);
  for (let i = 1; i <= N; i++) { const a = p((i - 1) / N), b = p(i / N); arc.push(arc[i - 1] + Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)); }
  const arcAt = (u: number) => { const k = Math.max(0, Math.min(1, u)) * N, i = Math.min(N - 1, Math.floor(k)); return arc[i] + (arc[i + 1] - arc[i]) * (k - i); };
  return { arcAt, halfAt: (u: number) => p(u).sy, half };
}

// The engraving's box on each arm: the motif keeps its proportions, as tall as ENGRAVE_FILL of the face where the box
// is narrowest, and starts where the arm comes clear of the centre (past the block, the écusson and the side rings),
// where the arm is broadest; on a short arm it shrinks to fit before the end piece.
const ENGRAVE_FILL = 0.88;
function engraveBox(d: GuardDef, terminal: GuardTerminal, cell: EngraveCell, clearCentre: number) {
  const line = armLine(d, terminal), uEnd = { plain: 0.95, knob: 0.88, finial: 0.86, flared: 0.7, hooked: 0.9, quatrefoil: 0.8 }[terminal];
  const sIn = line.arcAt(clearCentre / line.half) + 0.002, sOut = line.arcAt(uEnd) - 0.002;
  const uAt = (s: number) => { let lo = 0, hi = 1; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (line.arcAt(m) < s) lo = m; else hi = m; } return lo; };
  const minHalf = (a: number, b: number) => { let m = Infinity; for (let k = 0; k <= 16; k++) m = Math.min(m, line.halfAt(uAt(a + (b - a) * (k / 16)))); return m; };
  // Start as tall as the face at the start allows, then settle: the box's own narrowest point, and the room there is.
  let height = 2 * ENGRAVE_FILL * line.halfAt(uAt(sIn)), length = cell.aspect * height;
  for (let k = 0; k < 6; k++) {
    length = Math.min(cell.aspect * height, Math.max(0.001, sOut - sIn));
    height = Math.min(length / cell.aspect, 2 * ENGRAVE_FILL * minHalf(sIn, sIn + length));
  }
  length = cell.aspect * height;
  return { row: cell.row, centre: sIn + length / 2, length, height, line: cell.line * height };
}
/** What the cross carries at its centre, where no motif goes (m from the centre along the arm). */
const clearCentre = (block: GuardBlock, ecusson: boolean, rings: number) => Math.max(block.shown ? block.radius : 0, ecusson ? 0.012 : 0, rings ? 0.024 : 0, 0.004);

function buildGuardGeometry(d: GuardDef, terminal: GuardTerminal): THREE.BufferGeometry {
  const { at, tip: tipSec } = armShape(d, terminal), frame = armFrames(d, terminal), stations = armStations(d, terminal);
  const line = armLine(d, terminal);
  // Engraving coordinates: along the arm's centre line from the cross's centre (m, signed by side), and across it
  // (the section's own y: the sections are cut square to the arm).
  const engraveUv: number[] = [];
  const ringAt = (f: ArmFrame, s: number, sy: number, sz: number) => {
    const pts = section(sy, sz, d.round);
    pts.forEach(([y]) => engraveUv.push(s, y));
    return placeSection(f, pts);
  };

  const rings: THREE.Vector3[][] = [];
  const dome = domed(terminal);
  // The domed end goes on along the arm's own direction at its end (on a hooked arm, toward the blade).
  const tip = (side: -1 | 1) => {
    if (!dome) return [];
    const { sy, sz } = tipSec, len = Math.min(sy, sz) * 0.9, f = frame(1, side), out = f.t.clone().multiplyScalar(side), s1 = line.arcAt(1);
    // Built in the order the rings are laid (left end: outermost first), so the engraving coordinates line up.
    return (side < 0 ? [...END_RINGS].reverse() : END_RINGS).map((k) => {
      const q = Math.sqrt(1 - k * k);
      return ringAt({ ...f, c: f.c.clone().addScaledVector(out, k * len) }, side * (s1 + k * len), sy * q, sz * q);
    });
  };
  rings.push(...tip(-1));
  // Left tip to the centre, then the centre to the right tip.
  for (const [u, side] of [...stations.slice(1).reverse().map((u) => [u, -1] as const), ...stations.map((u) => [u, 1] as const)]) {
    const a = at(u, side);
    rings.push(ringAt(frame(u, side), side * line.arcAt(u), a.sy, a.sz));
  }
  rings.push(...tip(1));
  const positions: number[] = [], normals: number[] = [], index: number[] = [];
  const around = new THREE.Vector3(), along = new THREE.Vector3(), n = new THREE.Vector3(), c = new THREE.Vector3(), r = new THREE.Vector3();
  rings.forEach((ring, i) => {
    c.set(0, 0, 0); ring.forEach((v) => c.add(v)); c.divideScalar(N_CS);
    ring.forEach((v, j) => {
      around.subVectors(ring[(j + 1) % N_CS], ring[(j - 1 + N_CS) % N_CS]);
      along.subVectors(rings[Math.min(rings.length - 1, i + 1)][j], rings[Math.max(0, i - 1)][j]);
      n.crossVectors(around, along).normalize();
      // The section is convex: point the normal away from the ring's centre.
      if (n.dot(r.subVectors(v, c)) < 0) n.negate();
      positions.push(v.x, v.y, v.z); normals.push(n.x, n.y, n.z);
    });
  });
  const last = rings.length - 1;
  for (let i = 0; i < last; i++) {
    for (let j = 0; j < N_CS; j++) {
      const j1 = (j + 1) % N_CS, a = i * N_CS + j, b = i * N_CS + j1, cc = (i + 1) * N_CS + j, d = (i + 1) * N_CS + j1;
      index.push(a, b, cc, b, d, cc);
    }
  }
  // End caps close the domes (a point just past the last ring, along the arm's end) or the flat ends.
  const capL = positions.length / 3, capR = capL + 1;
  for (const [ring, side] of [[rings[0], -1], [rings[last], 1]] as const) {
    const out = frame(1, side).t.multiplyScalar(side), p = ring.reduce((a, v) => a.add(v), new THREE.Vector3()).divideScalar(N_CS).addScaledVector(out, dome ? 0.0004 : 0);
    positions.push(p.x, p.y, p.z); normals.push(out.x, out.y, out.z);
  }
  engraveUv.push(-1, 0, 1, 0);   // the end caps: off every box
  for (let j = 0; j < N_CS; j++) {
    index.push(capL, (j + 1) % N_CS, j);
    index.push(capR, last * N_CS + j, last * N_CS + (j + 1) % N_CS);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('engraveUv', new THREE.Float32BufferAttribute(engraveUv, 2));
  geo.setIndex(index);
  geo.computeBoundingSphere();
  return geo;
}

type CrossguardProps = {
  tone: HardwareTone;
  engraved?: boolean;   // the type's motif on each arm (presets/engravings.ts)
  terminal: GuardTerminal;
  ecusson: boolean;
  rings: 0 | 1 | 2;
  inlaid?: boolean;   // Viking wire inlay on the side wall (the pattern is a shared uniform, see surface.ts)
  cm?: number;
  mm?: GuardMm;
  gripEnd?: { x: number; z: number };   // a grip running straight into the cross (no collar): its end, which the centre covers
  archetype: ArchetypeKey;
  style: GuardStyle;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  roughness: number;
  position: [number, number, number];
  blade: BladeSpec;   // the écusson lies on the blade's face
};

// A quatrefoil plate: four overlapping lobes, extruded with a bevel (the plane of the blade's flat).
function quatrefoil(r: number, depth: number): THREE.BufferGeometry {
  const shape = new THREE.Shape(), steps = 96;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2, rr = r * (0.72 + 0.28 * Math.abs(Math.cos(2 * a)) ** 0.6);
    const p = [Math.cos(a) * rr, Math.sin(a) * rr] as const;
    if (i === 0) shape.moveTo(p[0], p[1]); else shape.lineTo(p[0], p[1]);
  }
  const bevel = Math.min(0.0012, depth * 0.3);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: depth - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 3 });
  geo.translate(0, 0, -(depth - 2 * bevel) / 2);
  geo.computeVertexNormals();
  return geo;
}

// Écusson: a leaf-shaped plate rising from the cross over the blade, one on each face. Built as a grid so
// it can be bent to lie on the blade's face (`face`: the face's height at x) — on a ridged blade a flat
// plate would let the ridge through its middle. The plate is 1.1 mm thick with a rounded rim that runs down
// into the blade all round (sunk 0.2 mm, so no daylight shows under it); its base lies inside the cross.
const ECUSSON = { thick: 0.0011, rim: 0.0016, rows: 48, cols: 24 };
function ecusson(face: (x: number) => number): THREE.BufferGeometry {
  // The outline's right half: a cubic from the base corner (12 mm out) to the tip, 30 mm up.
  const outline = (t: number) => { const u = 1 - t; return [0.012 * (u * u * u + 3 * u * u * t) + 0.018 * u * t * t, 0.036 * u * u * t + 0.066 * u * t * t + 0.03 * t * t * t]; };
  const { thick, rim, rows, cols } = ECUSSON, positions: number[] = [], index: number[] = [];
  for (let i = 0; i <= rows; i++) {
    const [w, y] = outline(i / rows);
    for (let j = 0; j <= cols; j++) {
      const s = (j / cols) * 2 - 1, x = s * w, k = Math.min(1, Math.min((1 - Math.abs(s)) * w, y) / rim);
      positions.push(x, y, face(Math.abs(x)) - 0.0002 + thick * Math.sqrt(k * (2 - k)));
    }
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const a = i * (cols + 1) + j, b = a + 1, c = a + cols + 1, d = c + 1;
    index.push(a, b, c, b, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/** The écusson's base height: the lowest top of the cross (or block) under the plate's face, less the sink. */
function ecussonY(d: GuardDef, terminal: GuardTerminal, face: (x: number) => number, block: GuardBlock): number {
  const { at } = armShape(d, terminal);
  let base = ECUSSON_Y;
  for (let x = -0.012; x <= 0.0120001; x += 0.001) {
    const z = face(Math.abs(x)) + ECUSSON.thick, a = at(Math.abs(x) / (d.width / 2), x < 0 ? -1 : 1);
    const r = Math.min(a.sy, a.sz) * Math.min(0.999, d.round), dz = Math.abs(z - a.z) - (a.sz - r);
    // An upright line through a climbing arm crosses its section on a slant: its top stands `lean` times higher.
    let top = a.y + a.lean * (dz <= 0 ? a.sy : dz < r ? a.sy - r + Math.sqrt(r * r - dz * dz) : -Infinity);
    if (block.shown && (x / (0.88 * block.radius)) ** 2 + (z / (0.88 * block.radius * block.flatten)) ** 2 <= 1) top = Math.max(top, block.halfHeight);
    base = Math.min(base, top - ECUSSON_SINK);
  }
  return base;
}

export function Crossguard({ tone, engraved, inlaid, cm, mm, gripEnd, archetype, style, terminal, ecusson: withEcusson, rings, color, emissive, emissiveIntensity, roughness, position, blade }: CrossguardProps) {
  // Brass and bronze age to a brown-green patina, iron and steel to rust.
  const metal = tone === 'brass' || tone === 'bronze' ? 'copper' : 'iron';
  const fit = surface(metal);
  // The bar's own engraving uniforms: engraved or plain, it keeps the plain fitting's program.
  const eng = useMemo(() => engraveUniforms('guard'), []);
  const bar = surface(metal, eng, inlaid ? 'guard' : undefined);
  // The écusson rises from the cross over the blade; a thick blade swells the cross's centre (fitToBlade).
  const bladeKey = JSON.stringify(blade);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const face = useMemo(() => bladeFaceAt(blade, 0.02), [bladeKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const def = useMemo(() => fitToBlade(guardDef(style, archetype, cm, mm), bladeDepthAt(blade, 0), gripEnd), [style, archetype, cm, mm, bladeKey, gripEnd?.x, gripEnd?.z]);
  const geo = useMemo(() => buildGuardGeometry(def, terminal), [def, terminal]);
  const end = armEnd(def, terminal);
  const tipR = Math.max(end.sy, end.sz);
  // End pieces follow the arm's own direction at its end (bent, sloping and recurved arms alike).
  const frames = useMemo(() => ([-1, 1] as const).map((side) => endFrame(def, terminal, side)), [def, terminal]);
  const finial = useMemo(() => (terminal === 'finial' ? fitFinial(def, terminal, tipR) : null), [def, terminal, tipR]);
  const knobZ = end.sz / end.sy > 0.9 ? 1 : 0.85;
  const knob = useMemo(() => (terminal === 'knob' ? fitKnob(def, terminal, Math.max(0.0068, tipR * 1.45), knobZ) : null), [def, terminal, tipR, knobZ]);
  const block = useMemo(() => guardBlock(archetype, def), [archetype, def]);
  const ecY = useMemo(() => (withEcusson ? ecussonY(def, terminal, face, block) : ECUSSON_Y), [withEcusson, def, terminal, face, block]);
  const motif = GUARD_ENGRAVINGS[archetype], clear = clearCentre(block, withEcusson, rings);
  const boxes = useMemo(() => (engraved ? { left: engraveBox(def, terminal, motif.left, clear), right: engraveBox(def, terminal, motif.right, clear), text: motif.text, relief: !!motif.relief, rows: ENGRAVE_ROWS } : null), [engraved, def, terminal, motif, clear]);
  useLayoutEffect(() => setGuardEngraving(eng, boxes, tone === 'darkIron'), [eng, boxes, tone]);
  const parts = useMemo(() => ({
    knob: knob ? new THREE.SphereGeometry(knob.r, 64, 40) : null,
    finial: finial ? turnedGeometry(FINIAL_PROFILE.map(([r, y]) => [r * finial.scale, y * finial.scale] as [number, number]), { axis: 'x', segments: 64 }) : null,
    foil: terminal === 'quatrefoil' ? quatrefoil(tipR * 2.1, end.sz * 1.6) : null,
    ecusson: withEcusson ? ecusson(face) : null,
    ring: rings ? new THREE.TorusGeometry(0.022, 0.0023, 20, 96) : null,
  }), [terminal, tipR, knob, finial, end.sz, withEcusson, rings, face]);
  useEffect(() => () => geo.dispose(), [geo]);
  useEffect(() => () => Object.values(parts).forEach((g) => g?.dispose()), [parts]);

  const mat = <meshStandardMaterial key={fit.key} {...fit.props} color={color} metalness={1.0} roughness={roughness} emissive={emissive} emissiveIntensity={emissiveIntensity} />;
  const ends = [-1, 1] as const;
  // Side rings lean out in front of the cross toward the blade, their lower edge on the guard block's face
  // (just touching it: further in, the ring would run through the block).
  const tilt = 0.7, faceZ = block.faceZ;
  const ringC = (side: 1 | -1) => [0, 0.022 * Math.cos(tilt), side * (faceZ - 0.0007 + 0.022 * Math.sin(tilt))] as [number, number, number];
  return (
    <group position={position}>
      <mesh geometry={geo}>
        <meshStandardMaterial key={bar.key} {...bar.props} color={color} metalness={1.0} roughness={roughness} emissive={emissive} emissiveIntensity={emissiveIntensity} />
      </mesh>
      {ends.map((side, i) => (
        <group key={side} position={frames[i].position} quaternion={frames[i].quaternion}>
          {parts.knob && <mesh geometry={parts.knob} position={[side * knob!.centre, 0, 0]} scale={[1, 1, knobZ]}>{mat}</mesh>}
          {parts.finial && <mesh geometry={parts.finial} position={[-side * finial!.back, 0, 0]} rotation={[0, side < 0 ? Math.PI : 0, 0]}>{mat}</mesh>}
          {parts.foil && <mesh geometry={parts.foil} position={[side * tipR * 1.7, 0, 0]}>{mat}</mesh>}
        </group>
      ))}
      {parts.ecusson && [1, -1].map((side) => (
        <mesh key={side} geometry={parts.ecusson!} position={[0, ecY, 0]} rotation={[0, side < 0 ? Math.PI : 0, 0]}>{mat}</mesh>
      ))}
      {parts.ring && ([1, -1] as const).slice(0, rings).map((side) => (
        <mesh key={side} geometry={parts.ring!} position={ringC(side)} rotation={[side * tilt, 0, 0]}>{mat}</mesh>
      ))}
    </group>
  );
}

// Every type's motif on every guard and end it offers keeps its lines at least ENGRAVE_MIN_LINE (± 15 %) wide.
if (import.meta.env.DEV) {
  const thin: string[] = [];
  for (const [type, guards] of Object.entries(GUARDS_BY_TYPE) as [ArchetypeKey, GuardStyle[]][]) for (const style of guards) for (const t of TERMINALS) {
    const d = guardDef(style, type), m = GUARD_ENGRAVINGS[type], clear = clearCentre(guardBlock(type, d), false, 0);
    for (const cell of [m.left, m.right]) { const b = engraveBox(d, t.id, cell, clear); if (b.line < ENGRAVE_MIN_LINE * 0.85) thin.push(`${type} ${style} ${t.id}: ${(b.line * 1000).toFixed(2)} mm`); }
  }
  if (thin.length) console.error(`Crossguard: engraving lines under ${ENGRAVE_MIN_LINE * 1000} mm`, thin);
}
