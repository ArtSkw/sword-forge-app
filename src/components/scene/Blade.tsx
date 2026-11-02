import * as THREE from 'three';
import { useEffect, useMemo } from 'react';
import type { SteelFinish } from '../../store/configStore';
import { getBladePhysicalRecipe } from '../../presets/materialRecipes';
import { sectionCreases, sectionPerimeter, takesFuller } from '../../presets/bladeSections';
import type { ProfilePoint } from '../../presets/bladeProfiles';
import { RICASSO, flameOffset, halfWidths, type BladeSpec } from '../../lib/bladeSpec';
import { GRIP_NORMAL_MAPS } from './gripTextures';
import { chain, surface } from './surface';

// The blade is built ring by ring along its length from a cross-section perimeter (presets/bladeSections.ts)
// and the outline in lib/bladeSpec.ts. Ridges and edges keep hard normals, so each facet catches its own
// light; ricasso, parrying hooks and the leather wrap are added as separate meshes.

const TIP_THICK_T = 0.02;
const FULLER_BLEND = 0.05;
const BLUNT = 0.6;           // ricasso: the edges are flattened to this share of the thickness

const EDGE_NICK_POSITIONS = [0.23, 0.36, 0.51, 0.67, 0.82];
const SPINE_NICK_POSITIONS = [0.31, 0.58, 0.76];
// Nicks appear once the sword has been carried and deepen with age (share of the half-width).
const nickDepth = (age: number) => (age <= 1 / 3 ? 0 : age <= 2 / 3 ? (age - 1 / 3) * 3 * 0.026 : 0.026 + (age - 2 / 3) * 3 * 0.016);

function edgeWear(t: number, side: 'edge' | 'spine', depth: number): number {
  if (depth <= 0 || t < 0.13 || t > 0.94) return 0;
  const positions = side === 'edge' ? EDGE_NICK_POSITIONS : SPINE_NICK_POSITIONS;
  const sideDepth = side === 'edge' ? depth : depth * 0.55;
  return positions.reduce((wear, center, index) => {
    const d = Math.abs(t - center) / (0.010 + index * 0.0015);
    return d >= 1 ? wear : wear + sideDepth * (0.5 + Math.cos(d * Math.PI) * 0.5);
  }, 0);
}

function fullerBlend(t: number, s: BladeSpec): number {
  if (s.fuller === 'none' || !takesFuller(s.section)) return 0;
  return Math.max(0, Math.min(1, (t - s.fullerStart) / FULLER_BLEND, (s.fullerEnd - t) / FULLER_BLEND));
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

function buildBladeGeometry(s: BladeSpec, nicks: number): THREE.BufferGeometry {
  const segments = s.flame ? 360 : 240;
  const hard = sectionCreases(s.section, takesFuller(s.section) ? s.fuller : 'none');
  const plainR = refine(sectionPerimeter(s.section, 'none', s.archetype), hard), fullerR = refine(sectionPerimeter(s.section, s.fuller, s.archetype), hard);
  const plain = plainR.pts, fullered = fullerR.pts, crease = plainR.crease;
  const N = plain.length;

  const rings: THREE.Vector3[][] = [];
  // For the age shader: how near each point is to a cutting edge, and how deep it sits in a fuller.
  const edgeness = plain.map(([px]) => (s.singleEdged && px > 0 ? 0 : Math.min(1, Math.max(0, (Math.abs(px) - 0.8) / 0.17))));
  const recesses: number[][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, y = (t - 0.5) * s.length;
    const { spine, edge, ricasso } = halfWidths(s, t);
    // No nicks on the ricasso: it is unsharpened, and it is where the second hand goes.
    const unworn = 1 - ricasso;
    const spineW = spine * (1 - edgeWear(t, 'spine', nicks) * unworn), edgeW = edge * (1 - edgeWear(t, 'edge', nicks) * unworn);
    const thick = s.halfThick * (1 - t * (1 - TIP_THICK_T)), off = flameOffset(s, t);
    const ft = fullerBlend(t, s);
    const recess: number[] = [];
    recesses.push(recess);
    rings.push(plain.map(([px, pz], j) => {
      const nx = ft > 0 ? px + (fullered[j][0] - px) * ft : px;
      let nz = ft > 0 ? pz + (fullered[j][1] - pz) * ft : pz;
      recess.push(Math.min(1, Math.max(0, ((Math.abs(pz) - Math.abs(nz)) / Math.max(Math.abs(pz), 0.05)) * 1.5)));
      if (ricasso > 0 && nz !== 0) nz += ricasso * Math.sign(nz) * Math.max(0, BLUNT - Math.abs(nz));
      return new THREE.Vector3(nx * (nx >= 0 ? spineW : edgeW) + off * nx * nx * nx * nx, y, nz * thick);
    }));
  }

  // Each crease point gets two vertices: one for the face before it, one for the face after it.
  const slotA: number[] = [], slotB: number[] = [];
  let M = 0;
  for (let j = 0; j < N; j++) { slotA[j] = M; slotB[j] = crease[j] ? M + 1 : M; M += crease[j] ? 2 : 1; }

  const positions: number[] = [], normals: number[] = [], uvs: number[] = [], index: number[] = [], edgeAttr: number[] = [], recessAttr: number[] = [];
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
      const push = (nrm: THREE.Vector3) => { positions.push(v.x, v.y, v.z); normals.push(nrm.x, nrm.y, nrm.z); uvs.push(j / N, i / segments); edgeAttr.push(edgeness[j]); recessAttr.push(recesses[i][j]); };
      if (crease[j]) {
        push(facing(around.subVectors(v, prev), v, cx, cz));
        push(facing(around.subVectors(next, v), v, cx, cz));
      } else push(facing(around.subVectors(next, prev), v, cx, cz));
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
  positions.push(0, -s.length / 2, 0); normals.push(0, -1, 0); uvs.push(0.5, 0); edgeAttr.push(0); recessAttr.push(0);
  const tip = base + 1;
  positions.push(0, s.length / 2, 0); normals.push(0, 1, 0); uvs.push(0.5, 1); edgeAttr.push(1); recessAttr.push(0);
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
  geo.setIndex(index);
  geo.computeBoundingSphere();
  return geo;
}

// Parrying hooks at the end of the ricasso: small lugs (montante) or crescents curving toward the hilt
// (Landsknecht). Drawn outward from the blade's right side; the left one is the same, turned round.
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
  const bevel = Math.min(0.0016, depth * 0.3);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: depth - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 2, curveSegments: 18 });
  geo.translate(0, 0, -(depth - bevel * 2) / 2);
  // The blade's age shader reads these; hooks are neither an edge nor a fuller.
  const n = geo.getAttribute('position').count;
  geo.setAttribute('surfEdge', new THREE.Float32BufferAttribute(new Float32Array(n), 1));
  geo.setAttribute('surfRecess', new THREE.Float32BufferAttribute(new Float32Array(n), 1));
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

function makePatternWeldedMap(): THREE.CanvasTexture {
  const W = 1024, H = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);

  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const waveA = Math.sin((u * 5.0 + Math.sin(v * Math.PI * 9) * 0.3) * Math.PI * 2);
      const waveB = Math.sin((u * 17.0 - Math.cos(v * Math.PI * 7) * 0.13) * Math.PI * 2);
      const lengthBreakup = Math.sin(v * Math.PI * 31 + waveA * 0.8) * 0.18;
      // Etched contrast: the twisted layers read as dark and bright bands, as on the excavated originals.
      const value = 158 + Math.round((waveA * 0.55 + waveB * 0.22 + lengthBreakup) * 46);
      const i = (y * W + x) * 4;
      img.data[i] = value;
      img.data[i + 1] = value + 2;
      img.data[i + 2] = value + 5;
      img.data[i + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  tex.anisotropy = 16;
  return tex;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Roughness map: a broad, smooth maintenance gradient. The base and very tip
// read a touch duller, while the mid-blade stays cleaner and sharper.
function makeBladeRoughnessMap(): THREE.CanvasTexture {
  const W = 96, H = 768;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);

  for (let y = 0; y < H; y++) {
    const v = y / (H - 1);
    const baseDullness = 0.18 * (1 - smoothstep(0.04, 0.24, v));
    const tipDullness = 0.10 * smoothstep(0.72, 1.0, v);
    const midPolish = 0.12 * smoothstep(0.14, 0.42, v) * (1 - smoothstep(0.62, 0.92, v));

    for (let x = 0; x < W; x++) {
      const u = x / (W - 1);
      const edgeDullness = 0.05 * Math.pow(Math.abs(u - 0.5) * 2, 1.6);
      const value = Math.round(255 * Math.max(0.68, Math.min(1, 0.91 + baseDullness + tipDullness + edgeDullness - midPolish)));
      const i = (y * W + x) * 4;
      img.data[i] = value;
      img.data[i + 1] = value;
      img.data[i + 2] = value;
      img.data[i + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 16;
  return tex;
}

// Shared — generated once for the app lifetime
const PATTERN_WELDED_MAP = makePatternWeldedMap();
const BLADE_ROUGHNESS_MAP = makeBladeRoughnessMap();

type BladeProps = { spec: BladeSpec; color: string; steelFinish: SteelFinish; age: number; ecusson?: boolean };

// Grind lines worked out in the shader from the blade's own coordinates (metres), not from a texture, so
// they stay crisp at any zoom. Lines run along the blade; where they would be finer than a pixel they fade,
// so the steel never shimmers. A slow variation in roughness breaks up the polish like hand finishing.
const GRIND: Record<SteelFinish, number> = { polished: 0.015, satin: 0.32, patternWelded: 0.06 };
const GRIND_VERTEX = /* glsl */ `varying vec3 vGrindPos;
varying vec3 vGrindAcross;`;
const GRIND_FRAGMENT = /* glsl */ `varying vec3 vGrindPos;
varying vec3 vGrindAcross;
uniform float uGrind;
float grindHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float grindNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(grindHash(i), grindHash(i + vec2(1.0, 0.0)), f.x), mix(grindHash(i + vec2(0.0, 1.0)), grindHash(i + vec2(1.0, 1.0)), f.x), f.y);
}`;

function grindShader(strength: { value: number }) {
  return (shader: THREE.WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uGrind = strength;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${GRIND_VERTEX}`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGrindPos = position;\nvGrindAcross = normalize(normalMatrix * vec3(1.0, 0.0, 0.0));');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${GRIND_FRAGMENT}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor *= 0.92 + 0.16 * grindNoise(vec2(vGrindPos.x * 110.0, vGrindPos.y * 2.0));`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          float a = vGrindPos.x * 3200.0, l = vGrindPos.y * 4.0;
          float fade = 1.0 - smoothstep(0.35, 1.2, fwidth(a));
          float g = (grindNoise(vec2(a, l)) - 0.5) + 0.6 * (grindNoise(vec2(a * 2.7, l * 1.9 + 7.0)) - 0.5);
          normal = normalize(normal + vGrindAcross * g * uGrind * fade);
        }`);
  };
}

// One compiled variant per finish (the material remounts when the finish changes).
const GRIND_SHADERS = Object.fromEntries((Object.keys(GRIND) as SteelFinish[]).map((f) => [f, grindShader({ value: GRIND[f] })])) as Record<SteelFinish, ReturnType<typeof grindShader>>;

function Steel({ color, steelFinish, age }: Omit<BladeProps, 'spec'>) {
  const phys = getBladePhysicalRecipe(age, steelFinish);
  const wear = surface('blade');

  return (
    <meshPhysicalMaterial
      key={`${steelFinish}-${wear.key}`}
      onBeforeCompile={chain(GRIND_SHADERS[steelFinish], wear.props.onBeforeCompile)}
      customProgramCacheKey={() => `blade-grind-${steelFinish}-${wear.key}`}
      color={color}
      map={steelFinish === 'patternWelded' ? PATTERN_WELDED_MAP : null}
      metalness={1.0}
      roughness={steelFinish === 'patternWelded' ? Math.min(0.9, phys.roughness + 0.32) : phys.roughness}
      // Etched pattern welding: the layers differ in gloss as much as in tone, so the pattern drives roughness too.
      roughnessMap={steelFinish === 'patternWelded' ? PATTERN_WELDED_MAP : BLADE_ROUGHNESS_MAP}
      clearcoat={phys.clearcoat}
      clearcoatRoughness={phys.clearcoatRoughness}
      anisotropy={phys.anisotropy}
      anisotropyRotation={Math.PI / 2}
    />
  );
}

const LEATHER = { color: '#3a2416', band: '#24160d', pad: 0.0024, normal: new THREE.Vector2(0.6, 0.6) };

// An écusson covers the top of the ricasso, so a leather wrap starts below it (it measures 30 mm).
const ECUSSON_CLEAR = 0.03;

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
    const start = ecusson ? ECUSSON_CLEAR : 0;
    const len = ricassoLen - 0.012 - start, hw = rHalfW + LEATHER.pad, ht = spec.halfThick + LEATHER.pad;
    return { body: roundedBox(hw, ht, len), band: roundedBox(hw + 0.0012, ht + 0.0012, 0.006), len, start };
  }, [cover, ricassoLen, rHalfW, spec.halfThick, ecusson]);
  useEffect(() => () => { wrap?.body.dispose(); wrap?.band.dispose(); }, [wrap]);

  const steel = <Steel color={color} steelFinish={steelFinish} age={age} />;
  const grain = surface('leather');
  const baseY = -spec.length / 2, hookY = baseY + ricassoLen;
  return (
    <group>
      <mesh geometry={geo}>{steel}</mesh>
      {hookGeo && (
        <>
          <mesh geometry={hookGeo} position={[rHalfW, hookY, 0]}>{steel}</mesh>
          <mesh geometry={hookGeo} position={[-rHalfW, hookY, 0]} rotation={[0, Math.PI, 0]}>{steel}</mesh>
        </>
      )}
      {wrap && (
        <>
          <mesh geometry={wrap.body} position={[0, baseY + 0.003 + wrap.start, 0]}><meshStandardMaterial key={grain.key} {...grain.props} color={LEATHER.color} roughness={0.7} metalness={0} normalMap={GRIP_NORMAL_MAPS.leather} normalScale={LEATHER.normal} /></mesh>
          <mesh geometry={wrap.band} position={[0, baseY + 0.002 + wrap.start, 0]}><meshStandardMaterial color={LEATHER.band} roughness={0.6} metalness={0} /></mesh>
          <mesh geometry={wrap.band} position={[0, baseY + 0.003 + wrap.start + wrap.len - 0.006, 0]}><meshStandardMaterial color={LEATHER.band} roughness={0.6} metalness={0} /></mesh>
        </>
      )}
    </group>
  );
}
