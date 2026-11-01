import * as THREE from 'three';

// Surface detail for the sword's materials, from tileable height maps (Codex ImageGen), packed into one
// RGBA texture (public/textures/surface.webp): R scratches, G corrosion, B forged metal, A leather grain.
// The map is sampled from each part's own coordinates in metres, so nothing stretches and no UVs are needed
// (the guard and the blade have none). Height becomes relief through screen-space derivatives, as three's
// bump map does, and fades out where its detail would be finer than a pixel. The sword's condition decides
// how much wear and corrosion shows (its age, see AGE). Until the texture has loaded every layer stays off.

const BASE = import.meta.env.BASE_URL;
const LOW_TIER = typeof window !== 'undefined' && (matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 700);
const READY = { value: 0 };
const MAP = new THREE.TextureLoader().load(`${BASE}textures/surface${LOW_TIER ? '-512' : ''}.webp`, () => { READY.value = 1; }, undefined, () => { READY.value = 0; });
MAP.wrapS = MAP.wrapT = THREE.RepeatWrapping;
MAP.colorSpace = THREE.NoColorSpace;
MAP.premultiplyAlpha = false;
MAP.anisotropy = 16;
const TEX_SIZE = LOW_TIER ? 512 : 1024;
// Tarnish: soft mottled oxidation, smudges and water spots (white = clean). Age darkens steel through it.
const TARNISH = new THREE.TextureLoader().load(`${BASE}textures/tarnish${LOW_TIER ? '-512' : ''}.webp`);
TARNISH.wrapS = TARNISH.wrapT = THREE.RepeatWrapping;
TARNISH.colorSpace = THREE.NoColorSpace;
TARNISH.anisotropy = 16;
// Engravings (height maps: light grey = the metal's surface, dark = the cut). Loaded on first use.
type Engrave = { kind: 'guard' } | { kind: 'face'; radius: number };
const ENGRAVINGS: Partial<Record<'scroll' | 'medallion', { map: THREE.Texture; ready: { value: number } }>> = {};
function engraving(name: 'scroll' | 'medallion') {
  if (!ENGRAVINGS[name]) {
    const ready = { value: 0 };
    const map = new THREE.TextureLoader().load(`${BASE}textures/engrave-${name}${LOW_TIER ? '-512' : ''}.webp`, () => { ready.value = 1; });
    map.wrapS = name === 'scroll' ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    map.wrapT = THREE.ClampToEdgeWrapping;
    map.colorSpace = THREE.NoColorSpace;
    map.anisotropy = 16;
    ENGRAVINGS[name] = { map, ready };
  }
  return ENGRAVINGS[name]!;
}

// The sword's age (0 = from the forge, 1 = excavated), shared by every surface material and set by Sword
// before each render, so scrubbing the age never rebuilds a material. Each layer fades in over its own span of age.
const AGE = { value: 0 };
export const setSurfaceAge = (age: number) => { AGE.value = age; };

type Recipe = {
  mapping: 'blade' | 'triplanar';
  kind: 'blade' | 'iron' | 'copper' | 'leather';
  engrave?: Engrave;
};

const GLSL_VERTEX = /* glsl */ `varying vec3 vSurfPos;
varying vec3 vSurfNormal;
varying float vSurfEdge;     // blade only: 1 at the cutting edge's bevel, 0 on the flats
varying float vSurfRecess;   // blade only: depth into a fuller or groove (0–1)
attribute float surfEdge;
attribute float surfRecess;
attribute vec2 engraveUv;
varying vec2 vEngraveUv;`;
const GLSL_FRAGMENT = /* glsl */ `varying vec3 vSurfPos;
varying vec3 vSurfNormal;
varying float vSurfEdge;
varying float vSurfRecess;
uniform sampler2D uSurfMap;
uniform sampler2D uSurfTarnish;
uniform float uSurfReady;
uniform float uSurfAge;
varying vec2 vEngraveUv;
uniform sampler2D uEngrave;
uniform float uEngraveReady;
float surfTarnish(float tile) {
#ifdef SURF_BLADE
  return texture2D(uSurfTarnish, vSurfPos.yx / tile).r;
#else
  vec3 w = abs(vSurfNormal); w = w * w * w; w /= max(w.x + w.y + w.z, 1e-5);
  vec3 p = vSurfPos / tile;
  return texture2D(uSurfTarnish, p.yz).r * w.x + texture2D(uSurfTarnish, p.xz + 0.37).r * w.y + texture2D(uSurfTarnish, p.xy + 0.71).r * w.z;
#endif
}
vec4 surfSample(float tile) {
#ifdef SURF_BLADE
  return texture2D(uSurfMap, vSurfPos.yx / tile);
#else
  vec3 w = abs(vSurfNormal); w = w * w * w; w /= max(w.x + w.y + w.z, 1e-5);
  vec3 p = vSurfPos / tile;
  return texture2D(uSurfMap, p.yz) * w.x + texture2D(uSurfMap, p.xz + 0.37) * w.y + texture2D(uSurfMap, p.xy + 0.71) * w.z;
#endif
}
// 1 where a texel covers several pixels, 0 where it is finer than one: relief there would only shimmer.
float surfFade(float tile) { return 1.0 - smoothstep(0.6, 1.6, length(fwidth(vSurfPos / tile)) * SURF_TEX); }
float surfNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float n = dot(i, vec3(1.0, 57.0, 113.0));
  vec4 a = fract(sin(vec4(n, n + 1.0, n + 57.0, n + 58.0)) * 43758.5453);
  vec4 b = fract(sin(vec4(n + 113.0, n + 114.0, n + 170.0, n + 171.0)) * 43758.5453);
  vec4 m = mix(a, b, f.z);
  return mix(mix(m.x, m.y, f.x), mix(m.z, m.w, f.x), f.y);
}
vec3 surfBump(vec3 n, float h, float scale) {
  vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition);
  vec3 r1 = cross(sy, n), r2 = cross(n, sx);
  float det = dot(sx, r1);
  vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
  return normalize(abs(det) * n - grad * scale);
}`;

// Per kind: [scratch tile, detail channel or none, detail tile, detail bump, detail roughness].
const DETAIL: Record<Recipe['kind'], { ch?: 'b' | 'a'; tile: number; bump: number; rough: number; wearTile: number; rustTile: number }> = {
  blade: { tile: 0, bump: 0, rough: 0, wearTile: 0.14, rustTile: 0.14 },
  iron: { ch: 'b', tile: 0.07, bump: 0.0005, rough: 0.07, wearTile: 0.07, rustTile: 0.08 },
  copper: { ch: 'b', tile: 0.07, bump: 0.0005, rough: 0.07, wearTile: 0.07, rustTile: 0.08 },
  leather: { ch: 'a', tile: 0.035, bump: 0.0014, rough: 0.2, wearTile: 0.05, rustTile: 0.06 },
};
const f = (x: number) => x.toFixed(5);

function compile(recipe: Recipe) {
  const k = recipe.kind, d = DETAIL[k];
  const defines: Record<string, string> = { SURF_TEX: TEX_SIZE.toFixed(1) };
  if (recipe.mapping === 'blade') defines.SURF_BLADE = '';
  const metalPart = k !== 'leather';
  const eg = recipe.engrave;
  if (eg) defines[eg.kind === 'face' ? 'SURF_ENGRAVE_FACE' : 'SURF_ENGRAVE_GUARD'] = '';
  if (eg?.kind === 'face') defines.SURF_ENGRAVE_R = eg.radius.toFixed(5);
  // Engraving: cuts on the faces that look at you; old dirt and patina gather in them with age.
  const engraveColor = eg ? `
    float eMask = smoothstep(0.55, 0.85, abs(normalize(vSurfNormal).z));
    #ifdef SURF_ENGRAVE_FACE
      vec2 euv = vSurfPos.xy / (2.0 * SURF_ENGRAVE_R) + 0.5;
      eMask *= 1.0 - step(SURF_ENGRAVE_R, length(vSurfPos.xy));
    #else
      vec2 euv = vEngraveUv;
    #endif
    float eFade = 1.0 - smoothstep(0.6, 1.6, length(fwidth(euv)) * SURF_TEX);
    float sCut = clamp((0.78 - texture2D(uEngrave, euv).r) / 0.55, 0.0, 1.0) * eMask * uEngraveReady;
    // Cuts read dark: they are shadowed and catch less reflection (never rougher, which would turn them milky).
    diffuseColor.rgb *= 1.0 - sCut * (0.62 + 0.3 * aPatina);` : '';
  // Stages of age, each easing in over its own span: scratches (Carried), a honed edge (Carried–Heirloom),
  // patina in recesses and softened polish (Heirloom), pits, rust and rot (Excavated).
  const color = `
    float aWear = smoothstep(0.08, 0.45, uSurfAge) * uSurfReady;
    float aHoned = smoothstep(0.15, 0.4, uSurfAge) * (1.0 - smoothstep(0.9, 1.0, uSurfAge));
    // Tarnish: a light bloom from Carried, a clear grey-brown mottling by Heirloom.
    float aTarnish = smoothstep(0.12, 0.72, uSurfAge) * uSurfReady;
    float aPatina = smoothstep(0.45, 0.85, uSurfAge) * uSurfReady;
    float aRust = smoothstep(0.78, 1.0, uSurfAge) * uSurfReady;
    float sDetail = ${d.ch ? `mix(0.5, surfSample(${f(d.tile)}).${d.ch}, uSurfReady)` : '0.5'};
    float sWear = clamp((max(surfSample(${f(d.wearTile)}).r, surfSample(${f(d.wearTile * 0.73)}).r * 0.85) - 0.52) * 3.0, 0.0, 1.0) * aWear;
    float sPit = (1.0 - surfSample(${f(d.rustTile)}).g) * uSurfReady;
    float patches = smoothstep(0.32, 0.72, surfNoise(vSurfPos * 9.0) * 0.7 + surfNoise(vSurfPos * 23.0) * 0.3);
    float sRust = smoothstep(1.0 - 0.5 * aRust, 1.22 - 0.5 * aRust, sPit) * patches * aRust;
    // Darkening where the tarnish map is dark; edges and high points stay bright (they are wiped and honed).
    float sTarnish = smoothstep(0.22, 0.82, 1.0 - surfTarnish(${f(d.rustTile * 1.6)})) * aTarnish${k === 'blade' ? ' * (1.0 - 0.85 * vSurfEdge)' : ''};
    ${k === 'blade' ? `
    // A freshly honed edge reads brighter than the flats; patina gathers in the fuller.
    diffuseColor.rgb *= 1.0 + 0.3 * aHoned * vSurfEdge;
    diffuseColor.rgb *= 1.0 - 0.6 * aPatina * vSurfRecess;` : ''}
    ${k === 'copper' ? `
    // Brass and bronze darken to brown and take a green-grey patina in patches.
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.62, 0.58, 0.5), aPatina);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.22, 0.27, 0.2), patches * aPatina * 0.55 + sRust * 0.6);` : ''}
    ${k === 'blade' || k === 'iron' ? `
    // Old steel darkens through grey-brown tarnish in patches (never a uniform pale dulling).
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.36, 0.32, 0.27), clamp(sTarnish * 1.2, 0.0, 0.9));
    diffuseColor.rgb *= mix(1.0, 0.86, aPatina) * mix(1.0, 0.6, aRust);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.085, 0.045), sRust * 0.85);` : ''}
    ${k === 'leather' ? `
    // Leather darkens with handling, then rots to a dull, cracked black-brown.
    diffuseColor.rgb *= mix(1.0, 0.78, aPatina) * mix(1.0, 0.45, aRust);` : ''}
    diffuseColor.rgb *= 1.0 - sWear * 0.08;
    ${engraveColor}`;
  const rough = `
    roughnessFactor = clamp(roughnessFactor + (sDetail - 0.5) * ${f(d.rough)} + sWear * 0.05 + ${k === 'leather' ? '0.0' : '0.1'} * sTarnish, 0.04, 1.0);
    ${k === 'blade' ? 'roughnessFactor = clamp(roughnessFactor - 0.14 * aHoned * vSurfEdge + 0.22 * aPatina * vSurfRecess, 0.04, 1.0);' : ''}
    ${k === 'leather' ? 'roughnessFactor = mix(roughnessFactor - 0.25 * aWear * (1.0 - aRust), 0.97, aRust);' : 'roughnessFactor = mix(roughnessFactor, 0.9, sRust);'}
`;
  const metal = metalPart ? 'metalnessFactor = mix(metalnessFactor, 0.05, sRust);' : '';
  const relief = `
    ${d.ch ? `normal = surfBump(normal, sDetail, ${f(d.bump)} * ${k === 'leather' ? '(1.0 + 1.5 * aPatina + 1.5 * aRust)' : '1.0'} * surfFade(${f(d.tile)}));` : ''}
    normal = surfBump(normal, sWear, 0.0009 * surfFade(${f(d.wearTile)}));
    ${metalPart ? `normal = surfBump(normal, sPit * aRust, 0.0025 * (0.35 + sRust) * surfFade(${f(d.rustTile)}));` : ''}
    ${eg ? 'normal = surfBump(normal, 1.0 - sCut, 0.0007 * eFade);' : ''}`;
  return (shader: THREE.WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uSurfMap = { value: MAP };
    shader.uniforms.uSurfTarnish = { value: TARNISH };
    shader.uniforms.uSurfReady = READY;
    shader.uniforms.uSurfAge = AGE;
    if (eg) { const e = engraving(eg.kind === 'face' ? 'medallion' : 'scroll'); shader.uniforms.uEngrave = { value: e.map }; shader.uniforms.uEngraveReady = e.ready; }
    shader.defines = { ...shader.defines, ...defines };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${GLSL_VERTEX}`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSurfPos = position;\nvSurfNormal = normal;\nvSurfEdge = surfEdge;\nvSurfRecess = surfRecess;\nvEngraveUv = engraveUv;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${GLSL_FRAGMENT}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${color}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${rough}`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n${metal}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${relief}`);
  };
}

const cache = new Map<string, ReturnType<typeof compile>>();
const shaderFor = (key: string, recipe: Recipe) => {
  if (!cache.has(key)) cache.set(key, compile(recipe));
  return cache.get(key)!;
};

/** Props for a material that should carry surface detail (the age comes from the shared AGE uniform). */
export function surface(kind: Recipe['kind'], engrave?: Engrave) {
  const key = `surf-${kind}${engrave ? `-eng-${engrave.kind}${engrave.kind === 'face' ? engrave.radius : ''}` : ''}`;
  const onBeforeCompile = shaderFor(key, { mapping: kind === 'blade' ? 'blade' : 'triplanar', kind, engrave });
  return { key, props: { onBeforeCompile, customProgramCacheKey: () => key } };
}

/** Chains two onBeforeCompile hooks (the blade's grind and its surface). */
export const chain = (...hooks: ((s: THREE.WebGLProgramParametersWithUniforms, r: THREE.WebGLRenderer) => void)[]) =>
  (s: THREE.WebGLProgramParametersWithUniforms, r: THREE.WebGLRenderer) => hooks.forEach((h) => h(s, r));
