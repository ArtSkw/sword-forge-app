import * as THREE from 'three';
import { useEffect, useLayoutEffect, useMemo } from 'react';
import type { SteelFinish } from '../../store/configStore';
import { sectionCreases, sectionPerimeter, takesFuller } from '../../presets/bladeSections';
import type { ProfilePoint } from '../../presets/bladeProfiles';
import { RICASSO, flameOffset, halfWidths, type BladeSpec } from '../../lib/bladeSpec';
import { surface } from './surface';
import { BLUNT, TIP_THICK_T, fullerBlend } from './bladeFace';
import { steelMaterial, updateSteel } from './steel';

// The blade is built ring by ring along its length from a cross-section perimeter (presets/bladeSections.ts)
// and the outline in lib/bladeSpec.ts. Ridges and edges keep hard normals, so each facet catches its own
// light; ricasso, parrying hooks and the leather wrap are added as separate meshes.


// Sections with a ridge down the middle, whose faces were each ground in their own pass.
const RIDGED = new Set(['diamond', 'hexagonal', 'hollow', 'square', 'triangular']);

const EDGE_NICK_POSITIONS = [0.23, 0.36, 0.51, 0.67, 0.82];
const SPINE_NICK_POSITIONS = [0.31, 0.58, 0.76];
// Nicks appear once the sword has been carried and deepen with age (share of the half-width, up to NICK_REACH: a nick is
// at most a couple of millimetres deep however broad the blade; as a share of a falchion's 8 cm belly they read as
// regular scallops along the edge).
const nickDepth = (age: number) => (age <= 1 / 3 ? 0 : age <= 2 / 3 ? (age - 1 / 3) * 3 * 0.026 : 0.026 + (age - 2 / 3) * 3 * 0.016);
const NICK_REACH = 0.03;

function edgeWear(t: number, side: 'edge' | 'spine', depth: number): number {
  if (depth <= 0 || t < 0.13 || t > 0.94) return 0;
  const positions = side === 'edge' ? EDGE_NICK_POSITIONS : SPINE_NICK_POSITIONS;
  const sideDepth = side === 'edge' ? depth : depth * 0.55;
  return positions.reduce((wear, center, index) => {
    const d = Math.abs(t - center) / (0.010 + index * 0.0015);
    return d >= 1 ? wear : wear + sideDepth * (0.5 + Math.cos(d * Math.PI) * 0.5);
  }, 0);
}


// The section tables have 28 points; curved faces would shade in bands. Each run between hard points is
// resampled with a Catmull-Rom curve that stops at the hard points, so faces round smoothly and ridges stay sharp.
const SUBDIV = 4;
function refine(per: ProfilePoint[], hard: Set<number>): { pts: ProfilePoint[]; crease: boolean[] } {
  const n = per.length, pts: ProfilePoint[] = [], crease: boolean[] = [];
  for (let j = 0; j < n; j++) {
    const p1 = per[j], p2 = per[(j + 1) % n];
    const p0 = hard.has(j) ? p1 : per[(j - 1 + n) % n], p3 = hard.has((j + 1) % n) ? p2 : per[(j + 2) % n];
    for (let k = 0; k < SUBDIV; k++) {
      const u = k / SUBDIV, u2 = u * u, u3 = u2 * u;
      const at = (i: 0 | 1) => 0.5 * (2 * p1[i] + (p2[i] - p0[i]) * u + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * u2 + (3 * p1[i] - p0[i] - 3 * p2[i] + p3[i]) * u3);
      pts.push([at(0), at(1)]);
      crease.push(k === 0 && hard.has(j));
    }
  }
  return { pts, crease };
}

// The falchion's broad wedge faces are flat planes: each mirrors one patch of the room evenly, so the face read as
// flat paint and its finish marks as blotches on it. They are shaded as a convex grind instead: across the face
// (from the edge bevel's line to the back's shoulder) the normals lean out toward the edge and toward the back, up to
// CROWN at either side, so the face catches a smooth highlight gradient. Shading only: the outline, the thickness and
// everything fitted to the blade (the cross, the écusson) stay as they are.
// The Conyers blade (a groove placed by measure) follows its description instead: "a slight hollow on both sides" between
// the groove and the edge (Hodges 1892), so there the lean is reversed (a shallow concave face) and the band from the
// groove to the back stays flat.
const CROWN = Math.tan(THREE.MathUtils.degToRad(8)), FACE_FROM = -0.88, FACE_TO = 0.975;
const crownLean = (x: number, hollowTo?: number) => {
  if (hollowTo !== undefined) return x > FACE_FROM && x < hollowTo ? -CROWN * (2 * (x - FACE_FROM) / (hollowTo - FACE_FROM) - 1) : 0;
  return x > FACE_FROM && x < FACE_TO ? CROWN * (2 * (x - FACE_FROM) / (FACE_TO - FACE_FROM) - 1) : 0;
};

// Rings at t: evenly spaced along the outline rather than along the blade, so where the edge sweeps fast
// (the point, the clip) there are more of them and the curve stays smooth. Along the straight body the
// spacing is the base one (length / base).
function ringStations(s: BladeSpec, base: number): number[] {
  const F = 4000, arc = [0];
  let prev = halfWidths(s, 0);
  for (let k = 1; k <= F; k++) {
    const w = halfWidths(s, k / F);
    // The back and the edge as drawn (a back-pointed blade moves its section across: shift).
    arc.push(arc[k - 1] + Math.hypot(s.length / F, w.shift + w.spine - prev.shift - prev.spine, w.shift - w.edge - prev.shift + prev.edge));
    prev = w;
  }
  const n = Math.ceil(base * arc[F] / s.length), ts: number[] = [];
  for (let i = 0, k = 0; i <= n; i++) {
    const target = (i / n) * arc[F];
    while (k < F - 1 && arc[k + 1] < target) k++;
    ts.push(i === n ? 1 : (k + (target - arc[k]) / Math.max(1e-12, arc[k + 1] - arc[k])) / F);
  }
  return ts;
}

function buildBladeGeometry(s: BladeSpec, nicks: number): THREE.BufferGeometry {
  const stations = ringStations(s, s.flame ? 360 : 240), segments = stations.length - 1;
  const hard = sectionCreases(s.section, takesFuller(s.section) ? s.fuller : 'none', s.grooveAt);
  const plainR = refine(sectionPerimeter(s.section, 'none', s.archetype, s.grooveAt), hard), fullerR = refine(sectionPerimeter(s.section, s.fuller, s.archetype, s.grooveAt), hard);
  const plain = plainR.pts, fullered = fullerR.pts, crease = plainR.crease;
  const N = plain.length;

  const rings: THREE.Vector3[][] = [];
  // Facets ground in their own pass: only sections with a ridge, and not where a fuller replaces the ridge.
  const ridged = RIDGED.has(s.section), fullerAt: number[] = [];
  const convex = s.archetype === 'falchion' && s.section === 'wedge', hollowTo = s.grooveAt === undefined ? undefined : s.grooveAt - 0.065;
  // For the age shader: how near each point is to a cutting edge, and how deep it sits in a fuller.
  const edgeness = plain.map(([px]) => (s.singleEdged && px > 0 ? 0 : Math.min(1, Math.max(0, (Math.abs(px) - 0.8) / 0.17))));
  const recesses: number[][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = stations[i], y = (t - 0.5) * s.length;
    const { spine, edge, ricasso, shift } = halfWidths(s, t);
    // No nicks on the ricasso: it is unsharpened, and it is where the second hand goes.
    const unworn = 1 - ricasso;
    const spineW = spine - edgeWear(t, 'spine', nicks) * unworn * Math.min(spine, NICK_REACH), edgeW = edge - edgeWear(t, 'edge', nicks) * unworn * Math.min(edge, NICK_REACH);
    const thick = s.halfThick * (1 - t * (1 - TIP_THICK_T)), off = flameOffset(s, t);
    const ft = fullerBlend(t, s);
    fullerAt.push(ft);
    const recess: number[] = [];
    recesses.push(recess);
    rings.push(plain.map(([px, pz], j) => {
      const nx = ft > 0 ? px + (fullered[j][0] - px) * ft : px;
      let nz = ft > 0 ? pz + (fullered[j][1] - pz) * ft : pz;
      recess.push(Math.min(1, Math.max(0, ((Math.abs(pz) - Math.abs(nz)) / Math.max(Math.abs(pz), 0.05)) * 1.5)));
      if (ricasso > 0 && nz !== 0) nz += ricasso * Math.sign(nz) * Math.max(0, BLUNT - Math.abs(nz));
      return new THREE.Vector3(shift + nx * (nx >= 0 ? spineW : edgeW) + off * nx * nx * nx * nx, y, nz * thick);
    }));
  }

  // Each crease point gets two vertices: one for the face before it, one for the face after it.
  const slotA: number[] = [], slotB: number[] = [];
  let M = 0;
  for (let j = 0; j < N; j++) { slotA[j] = M; slotB[j] = crease[j] ? M + 1 : M; M += crease[j] ? 2 : 1; }

  const positions: number[] = [], normals: number[] = [], uvs: number[] = [], index: number[] = [], edgeAttr: number[] = [], recessAttr: number[] = [], zoneAttr: number[] = [];
  const around = new THREE.Vector3(), along = new THREE.Vector3(), n = new THREE.Vector3(), out = new THREE.Vector3();
  // The perimeter winds consistently, so the cross product already points outward; only a degenerate
  // case (the collapsed point ring) falls back to the direction from the ring's centre.
  const facing = (a: THREE.Vector3, v: THREE.Vector3, cx: number, cz: number) => {
    n.crossVectors(a, along);
    if (n.lengthSq() > 1e-14) return n.normalize();
    out.set(v.x - cx, 0, v.z - cz);
    return out.lengthSq() > 1e-14 ? n.copy(out).normalize() : n.set(0, 1, 0);
  };
  for (let i = 0; i <= segments; i++) {
    const ring = rings[i];
    let cx = 0, cz = 0;
    for (const v of ring) { cx += v.x; cz += v.z; }
    cx /= N; cz /= N;
    for (let j = 0; j < N; j++) {
      const v = ring[j], prev = ring[(j - 1 + N) % N], next = ring[(j + 1) % N];
      along.subVectors(rings[Math.min(segments, i + 1)][j], rings[Math.max(0, i - 1)][j]);
      // The finish's zones: across the section (the back of a single edge at +1), along the blade, and which
      // side of the ridge a face lies on (+1 = the faces that sit in shade in the default view, 0 = no ridge).
      // `x`: where across the section the face this normal belongs to lies (a crease's two faces lie either side of it).
      const push = (nrm: THREE.Vector3, x: number) => {
        if (convex) nrm.setX(nrm.x + crownLean(x, hollowTo)).normalize();
        const side = ridged && Math.abs(nrm.x) > 0.02 ? Math.sign(nrm.x) * Math.sign(nrm.z) * (1 - fullerAt[i]) : 0;
        positions.push(v.x, v.y, v.z); normals.push(nrm.x, nrm.y, nrm.z); uvs.push(j / N, stations[i]); edgeAttr.push(edgeness[j]); recessAttr.push(recesses[i][j]); zoneAttr.push(plain[j][0], stations[i], side);
      };
      if (crease[j]) {
        push(facing(around.subVectors(v, prev), v, cx, cz), (plain[(j - 1 + N) % N][0] + plain[j][0]) / 2);
        push(facing(around.subVectors(next, v), v, cx, cz), (plain[j][0] + plain[(j + 1) % N][0]) / 2);
      } else push(facing(around.subVectors(next, prev), v, cx, cz), plain[j][0]);
    }
  }
  for (let i = 0; i < segments; i++) {
    const r0 = i * M, r1 = (i + 1) * M;
    for (let j = 0; j < N; j++) {
      const j1 = (j + 1) % N;
      const a = r0 + slotB[j], b = r0 + slotA[j1], c = r1 + slotB[j], d = r1 + slotA[j1];
      index.push(a, b, c, b, d, c);
    }
  }
  // Caps at the base (inside the guard) and the point.
  const base = positions.length / 3;
  positions.push(0, -s.length / 2, 0); normals.push(0, -1, 0); uvs.push(0.5, 0); edgeAttr.push(0); recessAttr.push(0); zoneAttr.push(0, 0, 0);
  const tip = base + 1;
  positions.push(0, s.length / 2, 0); normals.push(0, 1, 0); uvs.push(0.5, 1); edgeAttr.push(1); recessAttr.push(0); zoneAttr.push(0, 1, 0);
  for (let j = 0; j < N; j++) {
    index.push(base, slotA[(j + 1) % N], slotA[j]);
    index.push(tip, segments * M + slotA[j], segments * M + slotA[(j + 1) % N]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('surfEdge', new THREE.Float32BufferAttribute(edgeAttr, 1));
  geo.setAttribute('surfRecess', new THREE.Float32BufferAttribute(recessAttr, 1));
  geo.setAttribute('surfZone', new THREE.Float32BufferAttribute(zoneAttr, 3));
  geo.setIndex(index);
  geo.computeBoundingSphere();
  return geo;
}

// Parrying hooks at the end of the ricasso: small lugs (montante) or crescents curving toward the hilt
// (Landsknecht). Drawn outward from the blade's right side; the left one is the same, turned round.
// How far each hook's root reaches below the ricasso's end (its outline's lowest point at the blade, before the
// bevel grows it): a leather wrap must stop short of it.
const HOOK_ROOT = { crescent: 0.009, lugs: 0.007 };
const hookBevel = (depth: number) => Math.min(0.0016, depth * 0.3);
function buildHookGeometry(kind: 'lugs' | 'crescent', depth: number): THREE.BufferGeometry {
  const sh = new THREE.Shape();
  if (kind === 'crescent') {
    sh.moveTo(-0.002, 0.011);
    sh.bezierCurveTo(0.03, 0.013, 0.05, 0.002, 0.057, -0.026);
    sh.quadraticCurveTo(0.03, -0.006, -0.002, -0.009);
  } else {
    sh.moveTo(-0.002, 0.007);
    sh.quadraticCurveTo(0.018, 0.006, 0.027, -0.007);
    sh.quadraticCurveTo(0.012, -0.004, -0.002, -0.007);
  }
  sh.closePath();
  const bevel = hookBevel(depth);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: depth - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 2, curveSegments: 18 });
  geo.translate(0, 0, -(depth - bevel * 2) / 2);
  // The blade's surface shader reads these; hooks are neither an edge nor a fuller, and sit at the forte.
  const n = geo.getAttribute('position').count;
  geo.setAttribute('surfEdge', new THREE.Float32BufferAttribute(new Float32Array(n), 1));
  geo.setAttribute('surfRecess', new THREE.Float32BufferAttribute(new Float32Array(n), 1));
  geo.setAttribute('surfZone', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  return geo;
}

// Leather over the ricasso: a rounded box around the blade's narrow forte, with a binding at each end.
function roundedBox(halfW: number, halfT: number, len: number): THREE.BufferGeometry {
  const r = halfT * 0.92, sh = new THREE.Shape();
  sh.moveTo(-halfW + r, -halfT);
  sh.lineTo(halfW - r, -halfT); sh.quadraticCurveTo(halfW, -halfT, halfW, -halfT + r);
  sh.lineTo(halfW, halfT - r); sh.quadraticCurveTo(halfW, halfT, halfW - r, halfT);
  sh.lineTo(-halfW + r, halfT); sh.quadraticCurveTo(-halfW, halfT, -halfW, halfT - r);
  sh.lineTo(-halfW, -halfT + r); sh.quadraticCurveTo(-halfW, -halfT, -halfW + r, -halfT);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false, curveSegments: 6 });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

type BladeProps = { spec: BladeSpec; color: string; steelFinish: SteelFinish; age: number; ecusson?: boolean };

function useSteel(color: string, steelFinish: SteelFinish, age: number, archetype: BladeSpec['archetype']) {
  useLayoutEffect(() => updateSteel(steelFinish, color, age, archetype), [color, steelFinish, age, archetype]);
  return steelMaterial(steelFinish);
}

const LEATHER = { color: '#3a2416', band: '#24160d', pad: 0.0024 };

// An écusson covers the top of the ricasso, so a leather wrap starts below it (it measures 30 mm).
const ECUSSON_CLEAR = 0.03;
// The wrap ends this far below the ricasso's end, or below the hooks' roots with 0.5 mm to spare; the binding
// at each end stands 0.5 mm past the wrap, so no two faces lie flush.
const WRAP_END = 0.009, BAND = 0.006, BAND_PAST = 0.0005;

export function Blade({ spec, color, steelFinish, age, ecusson = false }: BladeProps) {
  // The spec is rebuilt on every config change; rebuild the geometry only when it really differs.
  const key = JSON.stringify(spec);
  // Nicks are geometry: rebuilt only when their depth changes by a step, so scrubbing the age stays smooth
  // (and a sword younger than Carried never rebuilds at all).
  const nicks = Math.round(nickDepth(age) * 500) / 500;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geo = useMemo(() => buildBladeGeometry(spec, nicks), [key, nicks]);
  useEffect(() => () => geo.dispose(), [geo]);

  const ric = spec.ricasso, hooks = ric?.hooks, cover = ric?.cover;
  const hookGeo = useMemo(() => (hooks ? buildHookGeometry(hooks, spec.halfThick * 1.7) : null), [hooks, spec.halfThick]);
  useEffect(() => () => hookGeo?.dispose(), [hookGeo]);
  const rHalfW = spec.halfWidth * RICASSO.width, ricassoLen = ric ? ric.t * spec.length : 0;
  const wrap = useMemo(() => {
    if (cover !== 'leather') return null;
    const start = 0.003 + (ecusson ? ECUSSON_CLEAR : 0);
    const end = ricassoLen - (hooks ? Math.max(WRAP_END, HOOK_ROOT[hooks] + hookBevel(spec.halfThick * 1.7) * 0.8 + 0.0005 + BAND_PAST) : WRAP_END);
    const len = end - start, hw = rHalfW + LEATHER.pad, ht = spec.halfThick + LEATHER.pad;
    return { body: roundedBox(hw, ht, len), band: roundedBox(hw + 0.0012, ht + 0.0012, BAND), len, start };
  }, [cover, hooks, ricassoLen, rHalfW, spec.halfThick, ecusson]);
  useEffect(() => () => { wrap?.body.dispose(); wrap?.band.dispose(); }, [wrap]);

  const steel = useSteel(color, steelFinish, age, spec.archetype);
  const grain = surface('leather');
  const baseY = -spec.length / 2, hookY = baseY + ricassoLen;
  return (
    <group>
      <mesh geometry={geo} material={steel} dispose={null} />
      {hookGeo && (
        <>
          <mesh geometry={hookGeo} material={steel} dispose={null} position={[rHalfW, hookY, 0]} />
          <mesh geometry={hookGeo} material={steel} dispose={null} position={[-rHalfW, hookY, 0]} rotation={[0, Math.PI, 0]} />
        </>
      )}
      {wrap && (
        <>
          <mesh geometry={wrap.body} position={[0, baseY + wrap.start, 0]}><meshStandardMaterial key={grain.key} {...grain.props} color={LEATHER.color} roughness={0.7} metalness={0} /></mesh>
          <mesh geometry={wrap.band} position={[0, baseY + wrap.start - 0.001, 0]}><meshStandardMaterial color={LEATHER.band} roughness={0.6} metalness={0} /></mesh>
          <mesh geometry={wrap.band} position={[0, baseY + wrap.start + wrap.len + BAND_PAST - BAND, 0]}><meshStandardMaterial color={LEATHER.band} roughness={0.6} metalness={0} /></mesh>
        </>
      )}
    </group>
  );
}
