import * as THREE from 'three';
import { LOW_TIER } from '../../lib/tier';
import type { SwordConfig } from '../../store/configStore';
import { bladeFinish, gripFinish, hiltFinish } from '../../presets/finishCharacter';
import { INLAY_PATTERNS, INLAY_WALL, inlayLevels, type InlayId } from '../../presets/inlayPatterns';
import { guardDef } from '../../presets/guardShapes';
import { POMMEL_FORM } from '../../presets/pommelProfiles';
import { vikingInlayFrame } from './pommelGeometry';

// Surface detail for the sword's materials, from tileable height maps (Codex ImageGen), packed into one
// RGBA texture (public/textures/surface.webp): R scratches, G corrosion, B forged metal, A leather grain.
// The map is sampled from each part's own coordinates in metres, so nothing stretches and no UVs are needed
// (the guard and the blade have none). Height becomes relief through screen-space derivatives, as three's
// bump map does, and fades out where its detail would be finer than a pixel. The sword's condition decides
// how much wear and corrosion shows (its age, see AGE). Until the texture has loaded every layer stays off.

const BASE = import.meta.env.BASE_URL;
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
// The blade's finish (the maker's marks, under the age layers): R lengthwise
// grind, G transverse stone and wheel marks, B polish cloud, A forge skin (stored as 64 + A·191/255 so the
// browser never premultiplies RGB away; read back as (a − 0.251) / 0.749). Tileable, horizontal = along the
// blade. Fades in over 0.4 s once loaded, so the finish never pops.
const FIN_READY = { value: 0 };
const FIN_MAP = new THREE.TextureLoader().load(`${BASE}textures/finish-blade${LOW_TIER ? '-512' : ''}.webp`, () => {
  const t0 = performance.now();
  const step = (now: number) => { FIN_READY.value = Math.min(1, Math.max(0, (now - t0) / 400)); if (FIN_READY.value < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
});
FIN_MAP.wrapS = FIN_MAP.wrapT = THREE.RepeatWrapping;
FIN_MAP.colorSpace = THREE.NoColorSpace;
FIN_MAP.premultiplyAlpha = false;
FIN_MAP.anisotropy = 16;
// The fittings' and grips' finish (§3): R filed steel, G forge-black iron (light = rubbed high spots, dark = scale),
// B cast copper alloy (dark pinholes), A organic mottle (leather dye, cord), alpha stored as the blade map's.
const HILT_READY = { value: 0 };
const HILT_MAP = new THREE.TextureLoader().load(`${BASE}textures/finish-hilt${LOW_TIER ? '-512' : ''}.webp`, () => {
  const t0 = performance.now();
  const step = (now: number) => { HILT_READY.value = Math.min(1, Math.max(0, (now - t0) / 400)); if (HILT_READY.value < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
});
HILT_MAP.wrapS = HILT_MAP.wrapT = THREE.RepeatWrapping;
HILT_MAP.colorSpace = THREE.NoColorSpace;
HILT_MAP.premultiplyAlpha = false;
HILT_MAP.anisotropy = 16;
// Pattern-welded core (baked offline): grey, light = iron, dark = steel; along the blade, tileable
// left-right over 9 cm, the core's width top to bottom. Loaded on first use, eased in like the finish.
const PATTERN = { map: null as THREE.Texture | null, ready: { value: 0 } };
function patternMap() {
  if (!PATTERN.map) {
    PATTERN.map = new THREE.TextureLoader().load(`${BASE}textures/pattern-weld${LOW_TIER ? '-512' : ''}.webp`, () => {
      const t0 = performance.now();
      const step = (now: number) => { PATTERN.ready.value = Math.min(1, (now - t0) / 400); if (PATTERN.ready.value < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
    PATTERN.map.wrapS = THREE.RepeatWrapping;
    PATTERN.map.wrapT = THREE.ClampToEdgeWrapping;
    PATTERN.map.colorSpace = THREE.NoColorSpace;
    PATTERN.map.anisotropy = 16;
  }
  return PATTERN.map;
}
export type Wrap = 'strip' | 'cord' | 'wire';
// The helix pitch of each wrap (m per turn), as built in Grip.tsx.
const WRAP: Record<Wrap, { index: number; pitch: number }> = { strip: { index: 1, pitch: 0.017 }, cord: { index: 2, pitch: 0.0021 }, wire: { index: 3, pitch: 0.0013 } };
// Engravings: the guard's motifs (one atlas, presets/engravings.ts; light = the metal, dark = the cut) and the pommel
// face's medallion (R the cut, G the field that takes enamel). Each loads on first use. Whether a part is engraved,
// with what and where are uniforms of its own material (engraveUniforms), so no choice in the Engraving or Face rows
// ever builds a program: every fitting's program carries the code, behind a uniform branch.
// Enamel as glass over a dark metal cell: deep and saturated (linear).
const ENAMEL_RGB = { azure: [0.0008, 0.005, 0.075], gules: [0.17, 0.004, 0.003] } as const;
type EngraveMap = 'guard' | 'medallion';
const ENGRAVE_MAPS: Record<EngraveMap, { map: THREE.Texture | null; ready: { value: number } }> = { guard: { map: null, ready: { value: 0 } }, medallion: { map: null, ready: { value: 0 } } };
function engraveMap(name: EngraveMap) {
  const e = ENGRAVE_MAPS[name];
  if (!e.map) {
    e.map = new THREE.TextureLoader().load(`${BASE}textures/engrave-${name}${LOW_TIER ? '-512' : ''}.webp`, () => { e.ready.value = 1; });
    e.map.wrapS = e.map.wrapT = THREE.ClampToEdgeWrapping;
    e.map.colorSpace = THREE.NoColorSpace;
    e.map.anisotropy = 16;
  }
  return e.map;
}
/** A fitting's own engraving uniforms (one set per material; set them with setGuardEngraving / setFaceEngraving). */
export function engraveUniforms(part: 'guard' | 'face') {
  return {
    uEngOn: { value: new THREE.Vector4() },      // kind (0 none, 1 guard motif, 2 face medallion), bright cuts (dark iron), style (+1 lettering, +2 relief), atlas rows
    uEngA: { value: new THREE.Vector4() },       // guard: the viewer's left arm: atlas row, box centre and length along the arm, box height (m). Face: radius (m), enamel on
    uEngB: { value: new THREE.Vector4() },       // guard: the viewer's right arm, the same. Face: the enamel's colour (linear)
    uEngMap: { value: null as THREE.Texture | null },
    uEngReady: ENGRAVE_MAPS[part === 'guard' ? 'guard' : 'medallion'].ready,
  };
}
export type EngraveUniforms = ReturnType<typeof engraveUniforms>;
// Every other fitting: no engraving (its program has the uniforms all the same).
const ENGRAVE_OFF: EngraveUniforms = engraveUniforms('guard');
ENGRAVE_OFF.uEngReady = { value: 0 };
type ArmBox = { row: number; centre: number; length: number; height: number };
/**
 * The guard's motif on each arm (null = plain). `bright`: cut bright into dark iron instead of filled dark. `relief`:
 * the motif is chiselled and stands proud (its ground cut away and dark), instead of cut in and filled.
 */
export function setGuardEngraving(u: EngraveUniforms, motif: { left: ArmBox; right: ArmBox; text: boolean; relief: boolean; rows: number } | null, bright: boolean) {
  if (!motif) { u.uEngOn.value.setX(0); return; }
  u.uEngMap.value = engraveMap('guard');
  u.uEngOn.value.set(1, +bright, +motif.text + 2 * +motif.relief, motif.rows);
  u.uEngA.value.set(motif.left.row, motif.left.centre, motif.left.length, motif.left.height);
  u.uEngB.value.set(motif.right.row, motif.right.centre, motif.right.length, motif.right.height);
}
/** The pommel face's medallion (radius m; null = plain), its field enamelled or not. */
export function setFaceEngraving(u: EngraveUniforms, radius: number | null, enamel: 'azure' | 'gules' | undefined, bright: boolean) {
  if (radius === null) { u.uEngOn.value.setX(0); return; }
  u.uEngMap.value = engraveMap('medallion');
  u.uEngOn.value.set(2, +bright, 0, 1);
  u.uEngA.value.set(radius, enamel ? 1 : 0, 0, 0);
  const c = enamel ? ENAMEL_RGB[enamel] : [0, 0, 0];
  u.uEngB.value.set(c[0], c[1], c[2], 0);
}

// The sword's age (0 = from the forge, 1 = excavated), shared by every surface material and set by Sword
// before each render, so scrubbing the age never rebuilds a material. Each layer fades in over its own span of age.
const AGE = { value: 0 };
export const setSurfaceAge = (age: number) => { AGE.value = age; };

// The blade finish of the sword on screen, as uniforms (set per sword, never compiled in, so switching the
// type or the finish never builds a new program). Rows in presets/finishCharacter.ts.
const FIN_BLADE = {
  uFinA: { value: new THREE.Vector4() },   // tileA, tileB, roughAmp, pattern (pattern-welded core strength, 0 = none)
  uFinB: { value: new THREE.Vector4() },   // grind, cross, cloud, skin
  uFinC: { value: new THREE.Vector4() },   // fuller, bevel, facet, calm (1 = no mid-scale cloud in the age layers: tarnish drawn out along the blade, haze even)
  uFinD: { value: new THREE.Vector4() },   // skin zone weights (fuller, back, forte), finish kind (0 satin, 1 polished, 0.5 pattern-welded)
  uFinE: { value: new THREE.Vector4() },   // zone tone (the skin zone left duller from the coarse stone), honing (0 = no edge to hone), core half-width (share of the blade's), forte end
  uFinLen: { value: 1 },                   // blade length (m): "under the guard" is measured from its base
};
// The fittings' and grip's finish of the sword on screen (rows in finishCharacter: tone × type, material × type).
const FIN_HILT = {
  uHiltA: { value: new THREE.Vector4() },     // tile (m), amp, roughAmp, gilt
  uHiltMix: { value: new THREE.Vector4() },   // filed, forge-black, cast weights; fire-scale coverage
  uGripA: { value: new THREE.Vector4() },     // tile (m), mottle, turn-to-turn variation, overlap darkening
  uHiltB: { value: new THREE.Vector4() },     // hammer-facet depth (0 filed … 1 hammered), edge rub, 0, 0
};
// Viking wire inlay: the pattern as a small repeating texture (R silver, G copper share per wire and row, with
// exactly averaged mips), chosen by uniform with its grid, so switching the pattern never builds a new program.
const INLAY_TEX: Partial<Record<InlayId, THREE.DataTexture>> = {};
function inlayTexture(id: InlayId) {
  if (!INLAY_TEX[id]) {
    const levels = inlayLevels(id), t = new THREE.DataTexture(levels[0].data, levels[0].width, levels[0].height, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.mipmaps = levels;
    t.generateMipmaps = false;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    // Linear up close (the shader keeps the cells crisp); far away the mips blend the wires to their mean colour.
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = 8;
    t.needsUpdate = true;
    INLAY_TEX[id] = t;
  }
  return INLAY_TEX[id]!;
}
const INLAY = {
  uInlayMap: { value: null as THREE.Texture | null },
  uInlayGrid: { value: new THREE.Vector4() },    // wire pitch (m), texture width (wires) and height (texels), rows across the side wall
  uInlayGeo: { value: new THREE.Vector4() },     // the guard's straight half-length (m), row height on a pommel's cap (m), texels per row, edge jitter
  uInlayLook: { value: 0 },                      // 1 = the metals close in value (block patterns), 0 = full contrast (stripes)
  uInlayUpper: { value: new THREE.Vector4() },   // pommel: the upper guard's half width, half height, half depth, centre y
  uInlayPow: { value: new THREE.Vector4() },     // its powers across x and z, and the inverse power in y
  uInlayCrown: { value: new THREE.Vector4() },   // the cap's top, its point, the taper of its straight run, kind (0 pyramid, 1 lobed)
};
function setInlay(config: SwordConfig) {
  if (config.archetype !== 'vikingSword') return;
  const id = config.guard.wire ?? 'stripes', p = INLAY_PATTERNS[id];
  INLAY.uInlayMap.value = inlayTexture(id);
  INLAY.uInlayGrid.value.set(p.pitch, p.rows[0].length, p.rows.length * p.texelsPerRow, p.rowsAcross);
  INLAY.uInlayGeo.value.set(guardDef(config.guard.style, config.archetype, config.guard.cm).width / 2, INLAY_WALL / p.rowsAcross, p.texelsPerRow, p.jitter);
  INLAY.uInlayLook.value = p.calm;
  const style = config.pommel.style;
  if (POMMEL_FORM[style].axis === 'viking') {
    const fr = vikingInlayFrame(style as 'pyramid' | 'lobed3' | 'lobed5');
    INLAY.uInlayUpper.value.set(...fr.upper);
    INLAY.uInlayPow.value.set(...fr.pow, 0);
    INLAY.uInlayCrown.value.set(...fr.crown);
  }
}

export function setSurfaceFinish(config: SwordConfig, bladeLength: number) {
  setInlay(config);
  const h = hiltFinish(config.archetype, config.finish.hardwareTone), g = gripFinish(config.archetype, config.finish.gripMaterial);
  FIN_HILT.uHiltA.value.set(h.tile, h.amp, h.roughAmp, h.gilt);
  FIN_HILT.uHiltMix.value.set(h.filed, h.forgeBlack, h.cast, h.scale);
  FIN_HILT.uGripA.value.set(g.tile, g.mottle, g.turnVar, g.overlap);
  FIN_HILT.uHiltB.value.set(h.hammer, h.edge, 0, 0);
  const steel = config.finish.steelFinish, f = bladeFinish(config.archetype, steel);
  FIN_BLADE.uFinA.value.set(f.tileA, f.tileB, f.roughAmp, f.pattern);
  FIN_BLADE.uFinB.value.set(f.grind, f.cross, f.cloud, f.skin);
  FIN_BLADE.uFinC.value.set(f.fuller, f.bevel, f.facet, f.calm);
  FIN_BLADE.uFinD.value.set(+(f.skinZone === 'fuller'), +(f.skinZone === 'back'), +(f.skinZone === 'forte'), steel === 'polished' ? 1 : steel === 'patternWelded' ? 0.5 : 0);
  FIN_BLADE.uFinE.value.set(f.zoneTone, f.honed, Math.max(0.05, f.core), f.forteEnd);
  FIN_BLADE.uFinLen.value = bladeLength;
}

type Recipe = {
  mapping: 'blade' | 'triplanar';
  pattern?: boolean;   // blade only: the pattern-welded core (one extra fetch, its own program)
  quiet?: boolean;     // fittings: turned parts (ferrules, guard block) take the tone's marks at × 0.9
  wrap?: Wrap;         // grips: the helix of a wound strip, cord or wire (from the grip's own uv)
  kind: 'blade' | 'iron' | 'copper' | 'leather' | 'wood';
  inlay?: 'guard' | 'pommel';   // Viking wire inlay on the guard, or on the pommel's upper guard and cap
};

const GLSL_VERTEX = /* glsl */ `varying vec3 vSurfPos;
varying vec3 vSurfNormal;
varying float vSurfEdge;     // blade only: 1 at the cutting edge's bevel, 0 on the flats
varying float vSurfRecess;   // blade only: depth into a fuller or groove (0–1)
varying vec3 vSurfZone;      // blade only: x across the section (−1…1, +1 = the back of a single edge), y along (0 base … 1 point), z facet side
attribute float surfEdge;
attribute float surfRecess;
attribute vec3 surfZone;
attribute vec2 engraveUv;
varying vec2 vEngraveUv;
varying vec2 vSurfUv;        // grips: u around (0–1), v along (m)`;
// surfTarnish on the blade: on Satin the tarnish follows the grind, its blotches drawn out twice as long along the
// blade. A calm finish (the falchion's broad flat) takes it as the surviving original's patina instead: a fine, faint
// mottle (the map at 4× its scale, not drawn out), never a mid-scale blotch.
const GLSL_FRAGMENT = /* glsl */ `varying vec3 vSurfPos;
varying vec3 vSurfNormal;
varying float vSurfEdge;
varying float vSurfRecess;
varying vec3 vSurfZone;
uniform sampler2D uSurfMap;
uniform sampler2D uSurfTarnish;
uniform float uSurfReady;
uniform float uSurfAge;

varying vec2 vEngraveUv;
varying vec2 vSurfUv;
#ifdef SURF_ENGRAVE
uniform sampler2D uEngMap;
uniform float uEngReady;
uniform vec4 uEngOn, uEngA, uEngB;
#endif
#ifdef SURF_BLADE
uniform sampler2D uFinMap;
uniform float uFinReady;
uniform vec4 uFinA, uFinB, uFinC, uFinD, uFinE;
uniform float uFinLen;
#endif
#ifdef SURF_HILT
uniform sampler2D uHiltMap;
uniform float uHiltReady;
uniform vec4 uHiltA, uHiltMix, uGripA, uHiltB;
// The fittings' finish map, triplanar like the wear map (low tier: the dominant face only, one fetch).
vec4 hiltSample(float tile) {
  vec3 w = abs(vSurfNormal); vec3 p = vSurfPos / tile;
  #ifdef SURF_LOW
    return w.x > max(w.y, w.z) ? texture2D(uHiltMap, p.yz) : w.y > w.z ? texture2D(uHiltMap, p.xz + 0.37) : texture2D(uHiltMap, p.xy + 0.71);
  #else
    w = w * w * w; w /= max(w.x + w.y + w.z, 1e-5);
    return texture2D(uHiltMap, p.yz) * w.x + texture2D(uHiltMap, p.xz + 0.37) * w.y + texture2D(uHiltMap, p.xy + 0.71) * w.z;
  #endif
}
#endif
#ifdef SURF_PATTERN
uniform sampler2D uPattern;
uniform float uPatReady;
#endif
#ifdef SURF_INLAY
uniform sampler2D uInlayMap;
uniform vec4 uInlayGrid, uInlayGeo, uInlayUpper, uInlayPow, uInlayCrown;
uniform float uInlayLook;
#endif
float surfTarnish(float tile) {
#ifdef SURF_BLADE
  return texture2D(uSurfTarnish, vSurfPos.yx * mix(vec2(uFinD.w > 0.25 ? 1.0 : 0.5, 1.0), vec2(4.0), uFinC.w) / tile).r;
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
  wood: { tile: 0, bump: 0, rough: 0, wearTile: 0.05, rustTile: 0.05 },
};
const f = (x: number) => x.toFixed(5);

// The blade's finish layer, composed before the age layers run. Tone: the grind, stone
// and cloud marks around 1, then the zones (a darker fuller, a brighter edge bevel, facets each in their
// own tone), then forge skin left in its zone. Age rubs the maker's finish off the flats (finKeep) but
// it survives in the fuller and the first centimetres under the guard.
// Polished with use (fHaze): a haze, rougher where the polish cloud is dull, so the mirror goes soft in patches. Only
// in the cloud's dull patches: an even haze widened the softbox's highlight into a clipped band; the milky look comes
// from the cloud's albedo growing with use.
const FINISH_BLADE = /* glsl */ `
    vec2 fp = vSurfPos.yx;
    #ifdef SURF_LOW
      vec4 fT = texture2D(uFinMap, fp / (uFinA.y * 0.7)), fT2 = fT;
    #else
      vec4 fT = texture2D(uFinMap, fp / uFinA.x);                          // R grind, G stone and wheel
      vec4 fT2 = texture2D(uFinMap, fp / uFinA.y + vec2(0.37, 0.61));     // B cloud, A forge skin
    #endif
    // ±1 at the maps' 2nd and 98th percentiles (they span 0.17–0.83), so a row's amplitude is its peak share.
    // The grind is steepened past that, so its strokes end in harder edges and read as lines, not haze.
    float fGrind = clamp((fT.r - 0.5) * 4.5, -1.0, 1.0), fCross = (fT.g - 0.5) * 3.0, fCloud = (fT2.b - 0.5) * 3.0;
    float fScale = 1.0 - clamp((fT2.a - 0.251) / 0.749, 0.0, 1.0);        // 1 where fire scale was left
    float fShelter = max(vSurfRecess, 1.0 - smoothstep(0.04, 0.07, vSurfPos.y + 0.5 * uFinLen));
    float finKeep = mix(1.0 - 0.4 * aPatina - 0.45 * aRust, 1.0 - 0.45 * aRust, fShelter) * uFinReady;
    float fCloudAmp = uFinB.z * (1.0 + uFinD.w * 1.2 * aWear);           // Polished: the haze spreads with use
    float fMarks = uFinB.x * fGrind + uFinB.y * fCross + fCloudAmp * fCloud;
    // Bright steel sits on the shoulder of the tone curve, where a lift barely shows and a dip reads: the
    // marks lean dark (−1.6×) and lift only a little (+0.6×).
    float fTex = fMarks < 0.0 ? 1.6 * fMarks : 0.6 * fMarks;
    // Facets: the faces already in shade in the default view are ground a step darker, so the ridge reads
    // harder (a lift on the lit faces would only clip). 0 on sections without a ridge and over a fuller.
    float fFacet = clamp(vSurfZone.z, 0.0, 1.0);
    // The skin's zone (falchion back, greatsword and estoc forte) is also left a step duller and darker from the
    // coarse stone, so the zone reads as tone even where the skin map has no island.
    float fZone = max(uFinD.y * smoothstep(-0.25, -0.12, vSurfZone.x), uFinD.z * (1.0 - smoothstep(uFinE.w - 0.18, uFinE.w, vSurfZone.y)));
    // Skin thins out over the zone, not as fast as the zone's tone: islands reach well down the forte.
    float fCov = uFinB.w * max(uFinD.x * vSurfRecess, sqrt(fZone));
    float fSkinRaw = smoothstep(1.0 - fCov, 1.15 - fCov, fScale) * uFinReady;
    float fSkin = fSkinRaw * max(finKeep, 0.5 * uFinReady);
    float fTone = (1.0 + fTex) * (1.0 - uFinC.x * vSurfRecess) * (1.0 + uFinC.y * vSurfEdge) * (1.0 - uFinC.z * fFacet) * (1.0 - uFinE.x * fZone);
    diffuseColor.rgb *= mix(1.0, fTone, finKeep);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.045, 0.047, 0.055), fSkin);
    float fRough = (-uFinA.z * clamp(fMarks / max(uFinB.x + uFinB.y + fCloudAmp, 1e-3), -1.0, 1.0) + 0.3 * uFinC.x * vSurfRecess + 0.6 * uFinE.x * fZone) * finKeep;
    // Tarnish settles first where the finish is dull: in the darker grind lines and the cloud's dull patches.
    // Where the wheel left transverse bands (bastard sword, greatsword), tarnish catches in them too: faintly barred.
    float fTarnishBias = (0.25 * (0.5 - fT.r) + 0.2 * (0.5 - fT2.b) * (1.0 - uFinC.w) + 0.25 * (0.5 - fT.g) * min(1.0, uFinB.y * 8.0)) * uFinReady;
    // Pattern-welded: the twisted core shows grey on grey (lightly etched), iron bright and smooth, steel dark;
    // it is the steel itself, so cleaning never takes it off, and tarnish takes the steel layers first, so the
    // pattern deepens with age (±14 % → ±22 % by Heirloom). Plain edge steel either side; it stops before the point.
    float fPat = 0.0;
    #ifdef SURF_PATTERN
    {
      float pMask = (1.0 - smoothstep(uFinE.z - 0.05, uFinE.z, abs(vSurfZone.x))) * (1.0 - smoothstep(0.86, 0.93, vSurfZone.y)) * uPatReady;
      float pv = texture2D(uPattern, vec2(vSurfPos.y / 0.09, 0.5 + vSurfZone.x / (2.0 * uFinE.z))).r;
      fPat = clamp((pv - 0.5) * 2.8, -1.0, 1.0) * pMask;
      // Leaning dark, as the other marks do: a lift barely shows on bright steel near the tone curve's shoulder.
      // The welded core sits a step darker than the plain edge steel either side (grey on grey, never a near-white
      // braid under the bright edit-mode dome), and its iron lifts only a little.
      diffuseColor.rgb *= (1.0 - 0.25 * pMask) * (1.0 + uFinA.w * (fPat < 0.0 ? 1.2 : 0.2) * fPat * (1.0 + 0.15 * aTarnish));
      fRough -= 0.12 * fPat;
      fTarnishBias -= 0.06 * fPat;
    }
    #endif
    float fHaze = uFinD.w * aWear * 0.06 * mix(smoothstep(0.1, 0.9, 0.5 - 0.5 * fCloud), 0.5, uFinC.w);`;

// The fittings' finish (fittings may carry sparse mm-scale detail
// driven by the part's shape), under the age layers: file strokes, forge-black scale over hammer facets, or a cast
// skin with pinholes, by tone; the edges and rims rubbed brighter; gilt burnished and frosted, thinning on the high
// points and wearing through on the edges and bosses with age.
const FINISH_HILT = /* glsl */ `
    vec4 hT = hiltSample(uHiltA.x);
    // The part's edges, rims, bosses and corners: where the normal lies between two of the part's own axes (the
    // fittings are built axis-aligned). Broad, stable in orbit (no screen derivatives) and the same on both tiers.
    vec3 hAn = abs(normalize(vSurfNormal));
    float hEdge = smoothstep(0.05, 0.26, 1.0 - max(hAn.x, max(hAn.y, hAn.z)));
    // ±1 at the maps' 2nd and 98th percentiles; the file passes a little steeper, so their bundles read on bright steel.
    float hFiled = clamp((hT.r - 0.5) * 4.0, -1.0, 1.0), hBlack = clamp((hT.g - 0.5) * 3.0, -1.0, 1.0), hCast = clamp((hT.b - 0.5) * 3.0, -1.0, 1.0);
    // Handling softens the maker's marks on the high points; rust takes them.
    float hKeep = (1.0 - 0.3 * aPatina - 0.5 * aRust) * uHiltReady;
    float hMarks = (uHiltMix.x * hFiled + uHiltMix.y * hBlack + uHiltMix.z * hCast) / max(uHiltMix.x + uHiltMix.y + uHiltMix.z, 1e-3);
    // Bright metal sits on the tone curve's shoulder: the marks lean a little dark.
    float hTex = (hMarks < 0.0 ? 1.2 : 0.9) * hMarks * uHiltA.y * SURF_HILT_K;
    diffuseColor.rgb *= 1.0 + hTex * hKeep;
    // Edges and rims rubbed bright by the file, the cloth and the hand (more with use).
    // How much of a forge-black tone this is (dark iron 1, filed tones 0): its age path is its own (below).
    float hBlackK = clamp((uHiltMix.y - 0.3) / 0.7, 0.0, 1.0);
    diffuseColor.rgb *= 1.0 + uHiltB.y * hEdge * (1.0 + 0.8 * aWear + 0.6 * aPatina * hBlackK) * uHiltReady;
    // Fire scale: a darker, bluer skin of the same iron over the facets (blue-black ↔ graphite, about the ±28 % of
    // §1.2), still a metal, dull; the brush took it off the edges and the facets' highest spots only.
    // With use the scale wears through to grey iron where the hand and the cloth reach (the forge-black tones most).
    float hScale = smoothstep(0.92 - uHiltMix.w, 1.2 - uHiltMix.w, 1.0 - hT.g + 0.25 * uHiltMix.y) * (1.0 - 0.85 * hEdge) * uHiltReady * (1.0 - 0.3 * aWear - 0.25 * aPatina * hBlackK);
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.5, 0.53, 0.64), hScale);
    // Casting porosity: small pinholes in brass and bronze, a shade darker than the metal (near-black read as dirt).
    float hPin = smoothstep(0.15, 0.07, hT.b) * min(1.0, uHiltMix.z * 1.4) * (1.0 - uHiltA.w) * uHiltReady;
    diffuseColor.rgb *= 1.0 - 0.35 * hPin;
    float hWorn = 0.0, hFrost = 0.0;
    if (uHiltA.w > 0.5) {
      // Fire-gilt: burnished rich gold on the faces, paler matte "frosted" gold where the burnisher did not reach
      // (the cast map's cloud). Frosted gold is lifted and paler, so its rougher reflection of the dark room does not
      // read as a dark smudge.
      hFrost = smoothstep(-0.1, 0.7, hCast) * (1.0 - hEdge) * uHiltReady;
      float gLum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
      diffuseColor.rgb = mix(diffuseColor.rgb * vec3(1.0, 0.9, 0.7), mix(diffuseColor.rgb, vec3(gLum), 0.18) * 0.98, 0.6 * hFrost);
      // Carried: the gold thins on the high points (edges, bosses), the reddish base showing through faintly.
      diffuseColor.rgb *= mix(vec3(1.0), vec3(0.93, 0.8, 0.66), aWear * hEdge * (0.6 + 0.4 * hT.g));
      // Heirloom → Excavated: worn through to the dark base metal in broad patches on the edges and bosses, broken up
      // by the map; the gold stays in the recesses and on the flats.
      float wa = 0.9 * aPatina + 0.6 * aRust;
      hWorn = smoothstep(1.1 - 0.6 * wa, 1.35 - 0.6 * wa, 0.75 * hEdge + 0.5 * hT.g) * step(0.01, wa) * uHiltReady;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.2, 0.13, 0.075), 0.85 * hWorn);
    }
    float hRough = (-uHiltA.z * hMarks) * hKeep + 0.15 * hScale + 0.2 * hPin + 0.3 * hWorn + 0.14 * hFrost - 0.05 * hEdge;
    // Gold barely tarnishes and never rusts: only where it has worn through does the base metal age.
    float hAgeK = 1.0 - 0.7 * uHiltA.w * (1.0 - hWorn);
    // Forge-black iron is already dark: the steel's age darkening would take it to a flat black against the dark room
    // and hide its shape. It goes brown-black in patches instead, keeping its rubbed spots and edges (the share follows
    // the tone's forge-black weight).
    float hAgeDark = 1.0 - 0.9 * hBlackK;`;

// The grip's wrap, from its own uv: the phase along the helix gives each turn of a leather strip its darker
// overlapping edge, cord its twisted strands and flecks, and twisted wire its bright crowns and dark valleys. The
// per-turn detail fades out where a turn is under a pixel (overview), so the ribbing never shimmers into moiré.
const FINISH_GRIP = /* glsl */ `
    #ifdef SURF_WRAP
      float gTurn = vSurfUv.y / SURF_WRAP_PITCH + vSurfUv.x, gF = fract(gTurn);
      float gFine = 1.0 - smoothstep(0.25, 0.6, fwidth(gTurn));
      float gHash = fract(sin(floor(gTurn) * 12.9898 + 4.1) * 43758.5453) - 0.5;
      #if SURF_WRAP == 1
        diffuseColor.rgb *= 1.0 - uGripA.w * smoothstep(0.7, 0.9, gF) * (1.0 - smoothstep(0.93, 1.0, gF)) * uHiltReady;
      #elif SURF_WRAP == 2
        // Each few turns pulled a little tighter or looser (groups of three, about 6 mm, read in every view)...
        float gGroup = fract(sin(floor(gTurn / 3.0) * 78.233 + 1.7) * 43758.5453) - 0.5;
        // ...and inside a turn the twisted strands: two dark grooves per turn running across it, plus pale fibre flecks.
        float gStrand = 0.5 + 0.5 * cos(6.2832 * (2.0 * gF + 9.0 * vSurfUv.x));
        float gFleck = step(0.9, fract(sin(dot(floor(vec2(vSurfUv.x * 90.0, gTurn * 3.0)), vec2(12.9898, 78.233))) * 43758.5453));
        diffuseColor.rgb *= (1.0 + 2.0 * uGripA.z * (0.65 * gGroup + 0.35 * gHash * gFine)) * (1.0 - 0.35 * gStrand * gFine) * (1.0 + 0.9 * gFleck * gFine);
      #else
        // Twisted wire: bright crowns, dark valleys between turns, and the twist's diagonal ridges on each turn.
        float gValley = 1.0 - sqrt(max(0.0, 1.0 - (2.0 * gF - 1.0) * (2.0 * gF - 1.0)));
        float gTwist = smoothstep(0.55, 1.0, 0.5 + 0.5 * cos(6.2832 * (gF + 14.0 * vSurfUv.x)));
        diffuseColor.rgb *= (1.0 + 2.0 * uGripA.z * gHash) * (1.0 - 0.5 * gValley * gFine - 0.18 * gTwist * gFine);
      #endif
    #endif`;

// Cord is fibrous: loose fibres catch the light at grazing angles (a soft rim) where leather or rubber would not.
const CORD_RIM = `
    reflectedLight.indirectDiffuse *= 1.0 + 0.9 * pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.0);`;

function compile(recipe: Recipe) {
  const k = recipe.kind, d = DETAIL[k];
  const defines: Record<string, string> = { SURF_TEX: TEX_SIZE.toFixed(1) };
  if (recipe.mapping === 'blade') defines.SURF_BLADE = '';
  if (recipe.pattern) defines.SURF_PATTERN = '';
  const hiltMetal = k === 'iron' || k === 'copper';
  if (hiltMetal || k === 'leather') defines.SURF_HILT = '';
  // Turned parts (ferrules, block) are a little cleaner (× 0.9; × 0.7 read as plain); wound wire × 0.4 (its turns vary).
  if (hiltMetal) defines.SURF_HILT_K = recipe.quiet ? '0.9' : recipe.wrap ? '0.4' : '1.0';
  if (recipe.wrap) { defines.SURF_WRAP = String(WRAP[recipe.wrap].index); defines.SURF_WRAP_PITCH = WRAP[recipe.wrap].pitch.toFixed(5); }
  if (LOW_TIER) defines.SURF_LOW = '';
  const organic = k === 'leather' || k === 'wood', metalPart = !organic;
  // Small parts (fittings, grips) take their patches and tarnish at a finer scale than the blade, or a whole
  // pommel could fall inside one clean patch and never age.
  const pf = k === 'blade' ? [9, 23] : [30, 74], tt = k === 'blade' ? d.rustTile * 1.6 : 0.045;
  // Forged and cast fittings (not the turned ferrules, not wound wire) can carry an engraving; an inlaid part is
  // decorated by its inlay instead (Sword never engraves it), so its program leaves the engraving out.
  const eg = hiltMetal && !recipe.quiet && !recipe.wrap && !recipe.inlay;
  if (eg) defines.SURF_ENGRAVE = '';
  const inlay = hiltMetal ? recipe.inlay : undefined;
  // The side wall ends at this latitude (rad); the pommel's seam wire is this wide (m).
  if (inlay) Object.assign(defines, { SURF_INLAY: inlay === 'guard' ? '1' : '2', INLAY_LAT: '0.88', INLAY_SEAM: '0.0011' });
  // Viking wire inlay: close-set furrows across the side wall of the guards and the cap, each filled with a wire
  // hammered flush, so the wall is one skin of silver and copper, its pattern changing from wire to wire.
  // Wires run parallel to the blade (u round the wall, one wire per pitch); rows run along the guard. No lines are
  // drawn: a cell is a run of wires of one metal, and the iron shows only where the skin thins or is lost with age.
  const inlayColor = inlay ? `
    // Where: the side wall only, by latitude, so the faces toward the blade and the grip stay plain iron.
    vec3 iN = normalize(vSurfNormal);
    float iLat = atan(iN.y, length(iN.xz));
    float iSpine = uInlayGeo.x, iCap = 0.0, iDrop = 0.0;
    #if SURF_INLAY == 2
      // The pommel: the upper guard's underside above this point (the superellipsoid it is built as). The cap is what
      // lies below it, and the seam between them is exact all round. (No pow of 0: fast GPU maths may return NaN.)
      float iIn = 1.0 - pow(max(abs(vSurfPos.x) / uInlayUpper.x, 1e-5), uInlayPow.x) - pow(max(abs(vSurfPos.z) / uInlayUpper.z, 1e-5), uInlayPow.y);
      iDrop = uInlayUpper.w - uInlayUpper.y * pow(max(iIn, 1e-6), uInlayPow.z) - vSurfPos.y;
      // (Only under the guard's lower half: near its equator the power series is too steep to trust at float precision.)
      iCap = step(0.0001, iDrop) * step(vSurfPos.y, uInlayUpper.w - 0.5 * uInlayUpper.y);
      // A pyramid's flat faces shorten toward its point; a lobed cap's faces are flat and read straight across.
      float iShare = clamp((vSurfPos.y - uInlayCrown.y) / (uInlayCrown.x - uInlayCrown.y), 0.0, 1.0);
      iSpine = mix(uInlayUpper.x - uInlayUpper.z, uInlayCrown.w > 0.5 ? uInlayUpper.x : uInlayCrown.z * iShare, iCap);
    #endif
    // u round the wall: along the straight run, then unrolled round each end (mirrored on the end's centre line), so
    // the wires stay one pitch apart and run on round the ends without a seam.
    float iDx = max(abs(vSurfPos.x) - iSpine, 0.0);
    float iU = sign(vSurfPos.x) * (min(abs(vSurfPos.x), iSpine) + length(vec2(iDx, vSurfPos.z)) * atan(iDx, abs(vSurfPos.z) + 1e-6));
    // Rows: whole rows across the wall, by latitude so they keep their height round its curve; the wires end a
    // little before the wall rolls over (a rim of bare iron, the first place wear shows).
    float iAw = fwidth(iLat) + 0.002;
    float iWall = 1.0 - smoothstep(INLAY_LAT - iAw, INLAY_LAT + iAw, abs(iLat));
    float iRows = (iLat / INLAY_LAT * 0.5 + 0.5) * uInlayGrid.w;
    float iRim = 1.0 - smoothstep(0.0, 0.2, INLAY_LAT - abs(iLat));
    #if SURF_INLAY == 2
      // On the cap: every sloping face (a lobed cap: its two broad faces), rows counted down from the seam wire at
      // the guard's row height; its ridges wear first.
      float iCapWall = uInlayCrown.w > 0.5 ? smoothstep(0.35, 0.55, abs(iN.z)) : 1.0 - smoothstep(0.85, 0.95, -iN.y);
      iCapWall *= smoothstep(INLAY_SEAM, INLAY_SEAM + fwidth(iDrop) + 0.00003, iDrop);
      iWall = mix(iWall, iCapWall, iCap);
      iRows = mix(iRows, (iDrop - INLAY_SEAM) / uInlayGeo.y, iCap);
      iRim = mix(iRim, hEdge, iCap);
    #endif
    // The pattern, in texels: one per wire across, a few per row along. Each wire's cuts sit a little high or low, so
    // block edges are ragged by a fraction of a wire.
    float iQ = iU / uInlayGrid.x, iFw = fwidth(iQ);
    float iHash = fract(sin(floor(iQ) * 12.9898 + 4.1) * 43758.5453);
    vec2 iT = vec2(iQ, iRows * uInlayGeo.z), iFt = max(abs(dFdx(iT)) + abs(dFdy(iT)), vec2(1e-4));
    // Each wire's cut sits up to ±0.15 mm high or low; and in some rows a block's edge comes a wire early or late, so
    // cells never read as filled, ruled boxes.
    float iRowI = floor(iT.y / uInlayGeo.z), iEdgeH = fract(sin(iRowI * 47.13 + floor(iQ / 6.0) * 9.71) * 31758.5453);
    vec2 iTs = iT + vec2(iEdgeH < 0.5 * uInlayGeo.w ? -1.0 : iEdgeH > 1.0 - 0.5 * uInlayGeo.w ? 1.0 : 0.0,
                         (iHash - 0.5) * 2.0 * min(0.15, 0.00015 / uInlayGeo.y) * uInlayGeo.z);
    // Up close crisp cells with a one-pixel blend at their edges (a nearest filter would crawl); once a cell is under a
    // pixel the plain coordinate and the mips, picked a level early (smooth gradients ×2) so the wires fade to their
    // mean before they could alias. The gradients are the smooth ones, so the mips never jump at a wire's edge.
    vec2 iSharp = floor(iTs) + 0.5 + clamp((fract(iTs) - 0.5) / iFt, -0.5, 0.5);
    iTs = mix(iSharp, iTs, smoothstep(0.6, 1.0, iFt));
    vec3 iMix = textureGrad(uInlayMap, iTs / uInlayGrid.yz, dFdx(iT) * 2.0 / uInlayGrid.yz, dFdy(iT) * 2.0 / uInlayGrid.yz).rgb;
    // The age of the skin. Forge: flush and whole. Carried: worn through first on the outermost wires at the wall's
    // edges (and the cap's ridges), the seams between wires opening. Heirloom: the metal tarnished and thinned to
    // stripes, patches worn through. Excavated: much of it flaked off, the rest stained by the iron's corrosion.
    float iOld = smoothstep(0.4, 0.95, aTarnish);   // 0 when carried, 1 by Heirloom
    #if SURF_INLAY == 2
      float iEdgeK = mix(1.0 - smoothstep(0.0, 0.42, INLAY_LAT - abs(iLat)), smoothstep(0.4, 0.85, hEdge), iCap);
    #else
      float iEdgeK = 1.0 - smoothstep(0.0, 0.42, INLAY_LAT - abs(iLat));
    #endif
    float iEdgeWear = aWear * smoothstep(0.45, 0.75, iEdgeK + 0.5 * (patches - 0.5) + 0.3 * (sPit - 0.5));
    // Where the hand and the scabbard's mouth rub, the seams open first: darker, duller zones on the face.
    float iHandle = aWear * smoothstep(0.4, 0.7, patches + 0.3 * (hT.g - 0.5));
    // How much of each pitch the metal still covers, and the seam between wires: hammered flush and burnished, most
    // seams closed with smeared metal at Forge and only some left as a dark line (never one even line per wire);
    // with age the seams open and darken, striped by Heirloom. Under a pixel the wires blend to their mean.
    float iHash2 = fract(sin(floor(iQ) * 78.233 + 1.3) * 24634.6345);
    float iC = 0.93 - 0.24 * aWear - 0.4 * iHandle - 0.14 * iOld - 0.20 * aRust - 0.3 * aWear * iRim;
    float iE = 0.06 + iFw, iCoarse = smoothstep(0.25, 0.6, iFw);
    float iCw = iC + (iHash2 - 0.5) * (0.05 + 0.12 * aWear);
    float iCov = mix(1.0 - smoothstep(iCw - iE, iCw + iE, abs(fract(iQ) - 0.5) * 2.0), iC, iCoarse);
    float iSmear = mix(step(0.4, iHash2), 0.6, iCoarse) * (1.0 - aWear);
    // Tarnish on the metal, mottled at two scales (the tarnish map and the corrosion map), so old silver is never a
    // cleaner surface than the iron beside it.
    float iTarn = smoothstep(0.3, 0.62, 0.5 * (1.0 - sTarnMap) + 0.5 * (1.0 - sDP.g) + 0.15 * (patches - 0.5));
    // Loss: from Heirloom patches worn through, edges first; buried, much of the skin has flaked off with crisp,
    // broken edges, copper sooner than silver (from the corrosion and tarnish maps and the age patches, as on the
    // iron beside it).
    float iLoss = 0.3 * sPit + 0.3 * (1.0 - sTarnMap) + 0.3 * patches + 0.4 * iRim;
    float iLs = 1.5 - 0.9 * smoothstep(0.6, 0.97, aTarnish) - 0.1 * aRust, iLc = iLs - 0.06 * aRust, iLw = mix(0.12, 0.03, aRust);
    float iKeepS = (1.0 - smoothstep(iLs, iLs + iLw, iLoss)) * (1.0 - iEdgeWear);
    float iKeepC = (1.0 - smoothstep(iLc, iLc + iLw, iLoss)) * (1.0 - iEdgeWear);
    // The metals (linear albedo, glossy), close in value so a step away they blend into one rose-silver sheen and up
    // close the pattern is a quiet shift across one skin (R1's range). Silver: warm white; carried, a handling film
    // leaves it warmer and a step duller all over; by Heirloom grey-violet tarnish, darker in patches, lighter only
    // where rubbed; dull grey buried. Copper: rose, a step below silver; browner when carried, chocolate, then
    // brown-black with green-grey.
    // (Block patterns take the two metals close in value; the fine stripes keep their full contrast, which a step
    // away already blends into the sheen.)
    vec3 iSil = mix(mix(vec3(0.80, 0.78, 0.73), vec3(0.72, 0.69, 0.63), uInlayLook), mix(vec3(0.56, 0.50, 0.39), vec3(0.52, 0.46, 0.37), uInlayLook), aWear * (1.0 - iOld) * (0.8 + 0.2 * iTarn));
    iSil = mix(iSil, vec3(0.30, 0.27, 0.30), iOld);
    iSil = mix(iSil, vec3(0.11, 0.09, 0.11), 0.9 * iOld * iTarn);
    iSil = mix(iSil, vec3(0.52, 0.50, 0.47), 0.45 * iOld * iRim * (1.0 - iTarn) * (1.0 - aRust));
    iSil = mix(iSil, vec3(0.30, 0.29, 0.28), aRust);
    float iCuAge = min(1.0, aWear * (1.0 + 0.5 * iTarn)), iCuOld = clamp(iOld * (0.75 + 0.5 * iTarn), 0.0, 1.0);
    vec3 iCu = mix(mix(mix(vec3(0.40, 0.20, 0.15), vec3(0.56, 0.32, 0.28), uInlayLook), mix(vec3(0.25, 0.12, 0.08), vec3(0.36, 0.19, 0.15), uInlayLook), iCuAge), vec3(0.15, 0.075, 0.05), iCuOld);
    iCu = mix(iCu, mix(vec3(0.12, 0.085, 0.065), vec3(0.22, 0.27, 0.20), patches), aRust);
    // Buried, the iron's corrosion creeps over what is left of the skin and stains it.
    vec3 iStain = vec3(0.10, 0.06, 0.035);
    float iStainK = aRust * clamp(0.35 + 0.4 * patches + 0.6 * sRust, 0.0, 0.85);
    iSil = mix(iSil, iStain, iStainK); iCu = mix(iCu, iStain, iStainK);
    vec2 iW2 = iMix.rg * vec2(iKeepS, iKeepC);
    float iKeep = iW2.x + iW2.y;
    vec3 iCol = (iW2.x * iSil + iW2.y * iCu) / max(iKeep, 1e-4);
    // Gloss: one burnished surface. Silver and copper take nearly the same gloss, so a highlight runs on across both
    // metals and their contrast reads as two metals in one skin, not two inks. Handling, tarnish and burial dull it.
    // Where the wires are under a pixel their rounded crowns spread the reflection across the wires: the matching
    // normal variance as a little roughness, so the band gathers the firelight instead of mirroring the dark room.
    float iAgeR = 0.16 * aWear + iOld * (0.06 + 0.25 * iTarn) + 0.35 * aRust + 0.07 * smoothstep(0.3, 0.8, iFw);
    float iSilR = 0.17 + iAgeR;
    float iRough = (iW2.x * 0.17 + iW2.y * 0.20) / max(iKeep, 1e-4) + iAgeR;
    // Hammered flush and filed, across both metals alike: a low unevenness of 1–10 mm from the hammering (the
    // fittings' hammer-facet map) and the final stoning along the guard, across the wires (their filed strokes).
    float iFlush = clamp((hT.g - 0.5) * 3.0, -1.0, 1.0), iStone = clamp((hT.r - 0.5) * 3.0, -1.0, 1.0);
    iCol *= (1.0 + 0.1 * iFlush) * (1.0 + 0.12 * iStone);
    iRough += 0.05 * iFlush - 0.07 * iStone;
    // The grain of the wire: each length cut from its own piece of stock, so bundles of wires differ a shade; it
    // shows as faint streaks along the wires until the bundles are under a pixel, and single wires up close.
    // (Lengths of 3.1 mm, not the pattern's rows, so the grain runs on across the block borders.)
    float iPiece = fract(sin(dot(floor(vec2(iQ / 4.0, iRows * uInlayGeo.y / 0.0031 + 0.37)), vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    iCol *= 1.0 + 0.1 * iPiece * (1.0 - smoothstep(1.2, 3.0, iFw));
    #ifndef SURF_LOW
      iCol *= 1.0 + 0.12 * (iHash - 0.5) * (1.0 - smoothstep(0.3, 0.7, iFw));
    #endif
    // Between the wires the iron lies in its furrow, shadowed and dirty, unless the seam was burnished shut with
    // smeared metal; where the skin is lost, the open iron with all its age, the same as beside the inlay.
    float iSkin = iWall * iKeep;
    vec3 iGroove = mix(diffuseColor.rgb * 0.3, iCol * 0.8, iSmear);
    diffuseColor.rgb = mix(diffuseColor.rgb, mix(iGroove, iCol, iCov), iSkin);
    float iMetal = iSkin * mix(iCov, 1.0, iSmear), iRope = 0.0, iStrand = 0.5, iRopeM = 0.0, iRopeFade = 0.0;
    #if SURF_INLAY == 2
    {
      // The seam under the upper guard: a twisted silver wire about a millimetre thick in a dark groove, its two
      // strands crossing at 1.2 mm (blended to their mean below a pixel).
      float sb = clamp(iDrop / INLAY_SEAM, 0.0, 2.0), band = iCap * (1.0 - smoothstep(0.96, 1.0, sb));
      iRope = sqrt(max(0.0, 1.0 - (2.0 * sb - 1.0) * (2.0 * sb - 1.0))) * band;
      float tw = iU / 0.0012 + 0.9 * sb;
      iStrand = clamp(mix(0.5 + 0.5 * cos(6.2832 * tw), 0.5, smoothstep(0.25, 0.6, fwidth(tw))), 0.0, 1.0);
      iRopeFade = 1.0 - smoothstep(0.3, 0.9, fwidth(sb));
      iRopeM = smoothstep(0.15, 0.5, iRope) * iKeepS;
      diffuseColor.rgb = mix(diffuseColor.rgb, mix(diffuseColor.rgb * 0.25, iSil * (0.62 + 0.38 * iStrand), iRopeM), band);
    }
    #endif` : '';
  // Engraving, cut by hand into the faces that look at you, before any age: tarnish, patina, rust and pits take the
  // cuts with the metal round them. A cut is a groove: its wall catches the light on one side and shades the other,
  // the graver throws up a thin burnished burr beside it, and the hand wanders a little (line weight and depth vary
  // along a stroke, edges are never ruler-straight). On bright metal the groove holds niello, not quite black and
  // patchy, lost in places with use; on dark iron the cut goes through the black to grey steel, which dulls and fills
  // with grime. A relief motif is the reverse: the figure stands, its ground cut away and dark. A face medallion's
  // field may hold enamel (champlevé: glass sunk in its metal cell, the device left as metal).
  const engraveCut = eg ? `
    float sCut = 0.0, sField = 0.0, eH = 0.0, eKeep = 1.0, eHalo = 0.0, eRel = 0.0, eWall = 0.0, eGloss = 0.45;
    if (uEngOn.x > 0.5) {
      vec3 eN = normalize(vSurfNormal);
      float eFace = smoothstep(0.18, 0.4, abs(eN.z)) * uEngReady;
      // The hand: ±0.08 mm of wander, strokes a shade wider or narrower over a few millimetres, edges ragged at the
      // scale of the graver's bite (0.3–0.5 mm).
      float eN1 = surfNoise(vSurfPos * 520.0), eN2 = surfNoise(vSurfPos * 520.0 + 17.3), eN3 = surfNoise(vSurfPos * 240.0 + 5.1);
      float eN4 = surfNoise(vSurfPos * 2600.0 + 9.2);
      // (On a small motif the same wander would eat the drawing: it scales with the motif, full from 10 mm tall.)
      float eSmall = uEngOn.x < 1.5 ? clamp(min(uEngA.w, uEngB.w) / 0.010, 0.4, 1.0) : 1.0;
      vec2 eWob = (vec2(eN1, eN2) - 0.5) * 0.00016 * eSmall;
      vec2 eUv; float eIn;
      if (uEngOn.x < 1.5) {
        // The guard: x along the arm from the centre (m, signed), y across it from its centre line (m). The arm on the
        // viewer's left takes box A; lettering reads left to right on both arms, a figure faces out to its tip.
        float eSide = sign(vEngraveUv.x) * (eN.z < 0.0 ? -1.0 : 1.0);
        vec4 eBox = eSide < 0.0 ? uEngA : uEngB;
        float eOut = (abs(vEngraveUv.x) + eWob.x - eBox.y) / eBox.z + 0.5;
        float eS = eSide < 0.0 && mod(uEngOn.z, 2.0) > 0.5 ? 1.0 - eOut : eOut, eT = 0.5 + (vEngraveUv.y + eWob.y) / eBox.w;
        eIn = step(0.0, eS) * step(eS, 1.0) * step(0.0, eT) * step(eT, 1.0);
        // Rows are 8 times as wide as they are tall, counted from the atlas's top.
        eUv = vec2(eS * eBox.z / eBox.w / 8.0, (uEngOn.w - eBox.x - 1.0 + clamp(eT, 0.0, 1.0)) / uEngOn.w);
      } else {
        eUv = (vSurfPos.xy + eWob) / (2.0 * uEngA.x) + 0.5;
        eIn = 1.0 - step(uEngA.x, length(vSurfPos.xy));
      }
      eIn *= eFace;
      eRel = step(1.5, uEngOn.z);
      // Sharp, and blurred over a few texels: the burr beside a cut, or the narrow ground sunk round a relief.
      vec4 eTex = texture2D(uEngMap, eUv), eBlur = texture2D(uEngMap, eUv, 2.5);
      // The line's weight wanders ±0.2 along a stroke (the graver pressed harder or lighter), its edges ragged.
      float eInk = 1.0 - eTex.r, eTh = 0.5 + 0.4 * (eN3 - 0.5) + 0.16 * (eN4 - 0.5) * eSmall, eW = max(fwidth(eInk), 0.04);
      sCut = smoothstep(eTh - eW, eTh + eW, eInk) * eIn;
      // Just outside the cut (the blurred ink reaches past the sharp): the burr, or a relief's cut-away ground.
      eHalo = clamp(min(1.0, (1.0 - eBlur.r) * 1.8) - eInk, 0.0, 1.0) * eIn;
      float eDepth = 0.7 + 0.3 * eN1;
      if (uEngOn.x > 1.5) {
        sField = uEngA.y * clamp((eTex.g - 0.25) * 2.0, 0.0, 1.0) * eIn;
        eWall = clamp(eTex.g - eBlur.g, 0.0, 1.0) * uEngA.y * eIn;   // the enamel's edge against its cell wall
        if (uEngA.y > 0.5) sCut = 0.0;   // enamelled: the device stays metal
      }
      if (eRel > 0.5) {
        // Chiselled relief: the figure stands bright, its top burnished (on dark iron rubbed through to steel), its
        // ground and its inner lines cut away, matt and dark.
        // (Rubbed bright from Carried on, and dulled again under corrosion.)
        vec3 eTop = mix(diffuseColor.rgb * 1.18, vec3(0.2, 0.2, 0.205) * (0.8 + 0.4 * eN2) * mix(1.0, 0.75, aTarnish), 0.6 * uEngOn.y);
        diffuseColor.rgb = mix(diffuseColor.rgb, mix(eTop, diffuseColor.rgb, aRust), sCut);
        diffuseColor.rgb *= 1.0 - mix(0.7, 0.5, uEngOn.y) * eHalo * (1.0 - 0.6 * aRust);
        eH = (0.9 * sCut - 0.35 * eHalo) * (1.0 - 0.6 * aRust);
      } else {
        // Niello, kept in the groove at the Forge but for a few slips, lost in places with use; where it is lost, the
        // bare groove, shadowed. On dark iron, the cut through the black: grey steel that dulls and gathers grime.
        // The graver's strokes show in the groove's floor as fine striations (the fittings' file map, already read).
        float eStri = 1.0 + 0.6 * clamp((hT.r - 0.5) * 3.0, -1.0, 1.0);
        float eLoss = surfNoise(vSurfPos * 380.0 + 3.7) * 0.75 + 0.25 * eN4;
        // (None lost on a new sword: fresh work; losses open with use.)
        eKeep = (1.0 - smoothstep(1.15 - 0.6 * aWear - 0.25 * aPatina, 1.25 - 0.6 * aWear - 0.25 * aPatina, eLoss)) * (1.0 - uEngOn.y);
        vec3 eNiello = vec3(0.04, 0.036, 0.032) * (0.4 + 1.4 * eN2) * (0.7 + 0.6 * eN4) * eStri;
        eGloss = 0.3 + 0.3 * eN3;   // the niello's gloss varies with how it was polished down
        vec3 eBare = diffuseColor.rgb * 0.42 * (1.15 - 0.3 * eDepth) * eStri;
        // The cut through the black: a matt, stippled steel floor (the graver's bite at 0.4 mm), its tone varying with
        // the stroke, dulled by Carried and grimed in patches by Heirloom.
        vec3 eSteel = vec3(0.11, 0.11, 0.115) * (0.7 + 0.6 * eN2) * (0.65 + 0.7 * eN4) * eStri * mix(1.0, 0.8, aWear) * mix(1.0, 0.85, aTarnish);
        eSteel = mix(eSteel, diffuseColor.rgb * 0.8, 0.85 * aPatina * smoothstep(0.3, 0.65, eN3));
        vec3 eCol = mix(mix(eBare, eNiello, eKeep), eSteel, uEngOn.y);
        // Buried, the groove fills with the corrosion round it: only its walls are left to read.
        eCol = mix(eCol, diffuseColor.rgb * 0.75, aRust);
        diffuseColor.rgb = mix(diffuseColor.rgb, eCol, sCut);
        // The burr beside the cut, burnished by the cloth: a bright lip on bright metal, dull on dark iron.
        diffuseColor.rgb *= 1.0 + mix(0.45, 0.15, uEngOn.y) * eHalo * (1.0 - sCut);
        eH = -eDepth * sCut + 0.3 * eHalo;
      }
      eH -= 0.5 * sField;
    }` : '';
  const engraveEnamel = eg ? `
    if (uEngOn.x > 1.5 && uEngA.y > 0.5) {
      // Enamel: glass in a cell cut below the metal; darker where it meets the cell's walls, crazed and dirty with
      // age, flaking out of its cell when buried.
      float eLoss = smoothstep(0.2, 0.45, 0.75 * patches + 0.25 * sPit) * aRust;
      sField *= 1.0 - eLoss;
      // Seen through the glass, the metal floor lifts the middle of each cell a little; the walls shade its edges.
      float eDeep = clamp(1.0 - 2.5 * eWall, 0.0, 1.0);
      vec3 eGlass = uEngB.rgb * mix(0.25, 1.15, eDeep) * (1.0 - 0.35 * aPatina);
      eGlass = mix(eGlass, vec3(0.03, 0.021, 0.015), 0.85 * aRust);   // buried: crazed and dirtied over
      diffuseColor.rgb = mix(diffuseColor.rgb, eGlass, sField);
    }` : '';
  // Fittings read their corrosion pits from the detail sample (sDP), one triplanar sample less than a sample of its own.
  // Stages of age, each easing in over its own span: scratches (Carried), a honed edge (Carried–Heirloom),
  // patina in recesses and softened polish (Heirloom), pits, rust and rot (Excavated).
  const color = `
    float aWear = smoothstep(0.08, 0.45, uSurfAge) * uSurfReady;
    float aHoned = smoothstep(0.15, 0.4, uSurfAge) * (1.0 - smoothstep(0.9, 1.0, uSurfAge));
    // Tarnish: a light bloom from Carried, a clear grey-brown mottling by Heirloom.
    float aTarnish = smoothstep(0.12, 0.72, uSurfAge) * uSurfReady;
    float aPatina = smoothstep(0.45, 0.85, uSurfAge) * uSurfReady;
    float aRust = smoothstep(0.78, 1.0, uSurfAge) * uSurfReady;
    ${k === 'blade' ? FINISH_BLADE : ''}
    ${hiltMetal ? FINISH_HILT : ''}
    ${engraveCut}
    ${k === 'leather' ? `
    // Leather and cord: the dye takes unevenly (cloudy 1–3 cm); handling grimes it over (mottle fades with age).
    diffuseColor.rgb *= 1.0 + uGripA.y * clamp(((hiltSample(uGripA.x).a - 0.251) / 0.749 - 0.5) * 3.0, -1.0, 1.0) * (1.0 - 0.5 * aPatina) * uHiltReady;` : ''}
    ${recipe.wrap ? FINISH_GRIP : ''}
    ${hiltMetal ? `vec4 sDP = surfSample(${f(d.tile)});` : ''}
    float sDetail = ${d.ch ? `mix(0.5, ${hiltMetal ? 'sDP' : `surfSample(${f(d.tile)})`}.${d.ch}, uSurfReady)` : '0.5'};
    ${k === 'blade' ? `
    // The second set of scratches is turned 14°, so scabbard scratches cross the grind at a slight angle.
    float sWear = clamp((max(surfSample(${f(d.wearTile)}).r, texture2D(uSurfMap, mat2(0.9703, 0.2419, -0.2419, 0.9703) * vSurfPos.yx / ${f(d.wearTile * 0.73)}).r * 0.85) - 0.52) * 3.0, 0.0, 1.0) * aWear;` : `
    float sWear = clamp((max(surfSample(${f(d.wearTile)}).r, surfSample(${f(d.wearTile * 0.73)}).r * 0.85) - 0.52) * 3.0, 0.0, 1.0) * aWear;`}
    float sPit = (1.0 - ${hiltMetal ? 'sDP' : `surfSample(${f(d.rustTile)})`}.g) * uSurfReady;
    float patches = smoothstep(0.32, 0.72, surfNoise(vSurfPos * ${f(pf[0])}) * 0.7 + surfNoise(vSurfPos * ${f(pf[1])}) * 0.3${k === 'blade' ? ' + 0.3 * fSkinRaw + 0.3 * fZone' : hiltMetal ? ' + 0.3 * hScale' : ''});
    float sRust = smoothstep(1.0 - 0.5 * aRust, 1.22 - 0.5 * aRust, sPit) * patches * aRust${hiltMetal ? ' * mix(1.0, hWorn, uHiltA.w)' : ''};
    // Darkening where the tarnish map is dark; edges and high points stay bright (they are wiped and honed).
    ${inlay ? `float sTarnMap = surfTarnish(${f(tt)});` : ''}
    float sTarnish = smoothstep(0.22, 0.82, 1.0 - ${inlay ? 'sTarnMap' : `surfTarnish(${f(tt)})`}${k === 'blade' ? ' + fTarnishBias' : ''}) * aTarnish${k === 'blade' ? ' * (1.0 - 0.85 * vSurfEdge) * (1.0 - 0.75 * uFinC.w)' : hiltMetal ? ' * hAgeK' : ''};
    ${k === 'blade' ? `
    // A freshly honed edge reads brighter than the flats; patina gathers in the fuller.
    // (On a mirror the fresh bevel is already as bright as it gets: lifting it more only clipped a wide band.)
    diffuseColor.rgb *= 1.0 + 0.3 * aHoned * uFinE.y * vSurfEdge * (1.0 - 0.8 * step(0.75, uFinD.w));
    diffuseColor.rgb *= 1.0 - 0.6 * aPatina * vSurfRecess;
    // A calm blade (the falchion) ages the way the Conyers original looks: an even, duller grey (its tarnish mostly
    // even, only faintly mottled, above) and a scatter of small dark pits, about a millimetre, from Heirloom (the
    // corrosion map's deepest 3 %), before any rust.
    float sPitC = smoothstep(0.78, 0.84, sPit) * aPatina * uFinC.w;
    diffuseColor.rgb *= (1.0 - 0.22 * aTarnish * uFinC.w) * (1.0 - 0.6 * sPitC);` : ''}
    ${k === 'copper' ? `
    // Brass and bronze darken to brown and take a green-grey patina in patches.
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.62, 0.58, 0.5), aPatina);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.22, 0.27, 0.2), patches * aPatina * 0.55 + sRust * 0.6);
    // Handled brass loses its shine first: a brown film from Carried, darker in the tarnish.
    diffuseColor.rgb *= mix(1.0, 0.72, aTarnish) * (1.0 - 0.35 * sTarnish);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.13, 0.17, 0.12), aRust * (0.35 + 0.4 * patches));` : ''}
    ${k === 'blade' || k === 'iron' ? `
    // Old steel darkens through grey-brown tarnish in patches (never a uniform pale dulling).
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.36, 0.32, 0.27), clamp(sTarnish * 1.2, 0.0, 0.9)${k === 'iron' ? ' * hAgeDark' : ''});
    diffuseColor.rgb *= mix(1.0, 0.86, aPatina) * mix(1.0, 0.6, aRust);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.085, 0.045), sRust * 0.85);` : ''}
    ${k === 'iron' ? `
    // Iron fittings go grey-brown from Carried, then brown-black, and rust over by Excavated (a hilt is
    // handled less than a blade is cleaned, so it darkens sooner and more evenly).
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.42, 0.38, 0.33), min(1.0, aTarnish * 0.6 + aPatina * 0.4) * hAgeK * hAgeDark);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.075, 0.036, 0.018), aRust * (0.5 + 0.45 * patches) * mix(1.0, hWorn, uHiltA.w));` : ''}
    ${k === 'leather' ? `
    // Leather darkens with handling and grime (its dye fading a little toward brown), then rots to a dull,
    // cracked black-brown. An heirloom grip keeps most of its dye, so each dye still reads as its own colour.
    float lLum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
    diffuseColor.rgb *= mix(1.0, 0.88, aWear);
    diffuseColor.rgb = mix(diffuseColor.rgb, lLum * vec3(0.92, 0.74, 0.55), aTarnish * 0.28);
    diffuseColor.rgb *= mix(1.0, 0.8, aPatina) * (1.0 - 0.25 * sTarnish);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.011, 0.008, 0.006), aRust * (0.65 + 0.3 * patches));` : ''}
    ${k === 'wood' ? `
    // (Colours here are linear: 0.01 is near black.)
    // Wood darkens with oil and hands, then dries grey and splits; buried, it rots dark.
    float wLum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
    // Oiled wood is a quieter brown than the grain map's orange: a third of its saturation off.
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(wLum), 0.33);
    diffuseColor.rgb *= mix(1.0, 0.8, aWear) * mix(1.0, 0.75, aPatina);
    diffuseColor.rgb = mix(diffuseColor.rgb, wLum * vec3(0.82, 0.78, 0.72), aPatina * 0.45);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.018, 0.013, 0.009), aRust * (0.55 + 0.35 * patches) + sPit * aRust * 0.3);` : ''}
    ${inlayColor}
    // Scratches through satin are burnished brighter than it; through a mirror they read darker and duller.
    diffuseColor.rgb *= ${k === 'blade' ? '1.0 + sWear * (uFinD.w > 0.25 ? -0.08 : 0.05)' : '1.0 - sWear * 0.08'};
    ${engraveEnamel}`;
  const rough = `
    roughnessFactor = clamp(roughnessFactor + (sDetail - 0.5) * ${f(d.rough)} + sWear * ${k === 'blade' ? '(uFinD.w > 0.25 ? 0.03 : -0.06)' : '0.05'} + ${organic ? '0.0' : '0.1'} * sTarnish, 0.04, 1.0);
    ${hiltMetal ? 'roughnessFactor = clamp(roughnessFactor + hRough, 0.04, 1.0);' : ''}
    ${k === 'blade' ? `
    // The finish's gloss follows its tone (bright strokes are the smoother ones); forge skin is dull scale.
    // Polished loses its mirror with use and hazes toward satin.
    roughnessFactor = clamp(roughnessFactor + fRough + fHaze + uFinD.w * 0.05 * aPatina, 0.04, 1.0);
    roughnessFactor = mix(roughnessFactor, 0.75, fSkin);` : ''}
    ${k === 'blade' ? 'roughnessFactor = clamp(roughnessFactor - 0.14 * aHoned * uFinE.y * vSurfEdge + 0.22 * aPatina * vSurfRecess + 0.3 * sPitC, 0.04, 1.0);' : ''}
    ${k === 'wood' ? '// Oiled wood: glossier where the grain is pale, drier in the dark late wood.\n    roughnessFactor = 0.44 + 0.17 * (1.0 - clamp(wLum * 3.0, 0.0, 1.0));' : ''}
    // The groove: niello satin, the bare floor and the cut steel rougher; a relief's ground matte. Enamel is glass.
    ${eg ? 'roughnessFactor = mix(mix(roughnessFactor, mix(mix(0.6, eGloss, eKeep), 0.6, uEngOn.y), sCut * (1.0 - eRel)) + 0.3 * eHalo * eRel - 0.08 * sCut * eRel, 0.05 + 0.3 * aPatina + 0.5 * aRust, sField);' : ''}
    ${organic ? 'roughnessFactor = mix(roughnessFactor - 0.06 * aWear * (1.0 - aPatina), 0.72, aRust);' : 'roughnessFactor = mix(roughnessFactor + 0.18 * aPatina, 0.9, max(sRust, 0.5 * aRust));'}
    // An old grip is burnished by the hand on its crowns (the swell, the rims, the moulding: surfEdge from Grip).
    ${k === 'leather' ? 'roughnessFactor = clamp(roughnessFactor - 0.1 * aPatina * (1.0 - aRust) * vSurfEdge, 0.04, 1.0);' : ''}
    ${inlay ? 'roughnessFactor = mix(mix(roughnessFactor, clamp(iRough, 0.04, 1.0), iMetal), iSilR, iRopeM);' : ''}
`;
  // Enamel is glass: not a metal, and glossy.
  const metal = (k === 'blade' ? 'metalnessFactor = mix(metalnessFactor, 0.35, fSkin);' : '') + (hiltMetal ? 'metalnessFactor = mix(metalnessFactor, 0.85, hScale);' : '') + (eg ? 'metalnessFactor = mix(mix(metalnessFactor, mix(mix(0.3, 1.0, 1.0 - eKeep), 0.5, uEngOn.y), sCut * (1.0 - eRel)), 0.0, sField);' : '') + (metalPart ? 'metalnessFactor = mix(metalnessFactor, 0.05, sRust);' : '') + (inlay ? 'metalnessFactor = mix(metalnessFactor, 1.0, max(iMetal, iRopeM));' : '');
  const relief = `
    ${d.ch ? `normal = surfBump(normal, sDetail, ${f(d.bump)} * ${k === 'leather' ? '(1.0 + 1.5 * aPatina - 0.8 * aRust)' : '1.0'} * surfFade(${f(d.tile)})${inlay ? ' * (1.0 - iSkin)' : ''});` : ''}
    normal = surfBump(normal, sWear, 0.0009 * surfFade(${f(d.wearTile)}));
    ${k === 'blade' ? 'normal = surfBump(normal, fSkin, 0.0004 * surfFade(uFinA.y));' : ''}
    ${metalPart ? `normal = surfBump(normal, sPit * aRust, 0.0025 * (0.35 + sRust) * surfFade(${f(d.rustTile)})${inlay ? ' * (1.0 - iMetal)' : ''});` : ''}
    ${hiltMetal ? `// Hammer facets (8–15 mm, so they read as shading where albedo alone read as cloud): the forge-black map as a
    // shallow, even height on hammered hilts (Viking, greatsword: every iron tone; dark iron lightly everywhere).
    // The map is mip-filtered, so the fade only guards against facets smaller than a few pixels.
    normal = surfBump(normal, hT.g, 0.00035 * uHiltB.x * uHiltReady * surfFade(uHiltA.x * 25.0)${inlay ? ' * (1.0 - iSkin)' : ''});` : ''}
    ${inlay ? `// The inlay is one surface over both metals, whatever the fittings' tone: hammered flush (a shallow waver from the
    // facet map) and stoned along the guard, so the reflection wavers and streaks across silver and copper alike.
    normal = surfBump(normal, hT.g, 0.00022 * iSkin * uHiltReady * surfFade(uHiltA.x * 25.0));
    normal = surfBump(normal, hT.r, 0.00003 * iSkin * uHiltReady * surfFade(uHiltA.x * 25.0));
    #ifndef SURF_LOW
    // The inlay was filed flush, but each wire keeps a rounded crown, so up close the highlight breaks into short
    // glints across the wires (the knurled look of a new inlaid hilt); from Heirloom the wires stand a little proud
    // of the worn iron between them. Both fade where a wire is under a pixel. The seam's twisted wire is round, its
    // strands ridged.
    float iFine = 1.0 - smoothstep(0.25, 0.55, iFw), iX = 2.0 * fract(iQ) - 1.0;
    normal = surfBump(normal, 1.0 - iX * iX, 0.00003 * iSkin * iFine);
    normal = surfBump(normal, iCov * iSkin, 0.00003 * iOld * iFine);
    normal = surfBump(normal, iRope * (0.85 + 0.15 * iStrand), 0.0005 * iRopeFade);
    #endif` : ''}
    // The groove's walls and burr, or the relief's: from the mip-filtered cut, so they hold at every distance.
    ${eg ? 'if (uEngOn.x > 0.5) normal = surfBump(normal, eH, 0.00022);' : ''}`;
  return (shader: THREE.WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uSurfMap = { value: MAP };
    shader.uniforms.uSurfTarnish = { value: TARNISH };
    shader.uniforms.uSurfReady = READY;
    shader.uniforms.uSurfAge = AGE;
    if (hiltMetal || k === 'leather') Object.assign(shader.uniforms, FIN_HILT, { uHiltMap: { value: HILT_MAP }, uHiltReady: HILT_READY });
    if (k === 'blade') Object.assign(shader.uniforms, FIN_BLADE, { uFinMap: { value: FIN_MAP }, uFinReady: FIN_READY });
    if (recipe.pattern) Object.assign(shader.uniforms, { uPattern: { value: patternMap() }, uPatReady: PATTERN.ready });
    if (inlay) { INLAY.uInlayMap.value ??= inlayTexture('stripes'); Object.assign(shader.uniforms, INLAY); }
    if (eg) Object.assign(shader.uniforms, ENGRAVE_OFF);
    shader.defines = { ...shader.defines, ...defines };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${GLSL_VERTEX}`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSurfPos = position;\nvSurfNormal = normal;\nvSurfEdge = surfEdge;\nvSurfRecess = surfRecess;\nvSurfZone = surfZone;\nvEngraveUv = engraveUv;\nvSurfUv = uv;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${GLSL_FRAGMENT}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${color}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${rough}`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n${metal}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${relief}`)
      // Dried, grimed leather, cord and wood lose their sheen: the room's cool reflection on them fades with age,
      // so an old grip goes black-brown rather than blue-grey.
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>\n${organic ? 'reflectedLight.indirectSpecular *= mix(1.0, 0.3, max(aPatina, aRust) * (1.0 - 0.6 * vSurfEdge * (1.0 - aRust)));' : ''}${recipe.wrap === 'cord' ? CORD_RIM : ''}`);
  };
}

const cache = new Map<string, ReturnType<typeof compile>>();
const shaderFor = (key: string, recipe: Recipe) => {
  if (!cache.has(key)) cache.set(key, compile(recipe));
  return cache.get(key)!;
};

/** Props for a material that should carry surface detail (the age comes from the shared AGE uniform). */
// `engrave`: this material's own engraving uniforms (engraveUniforms), for the guard's bar or a pommel's face; they
// share the plain fitting's program. `inlay`: Viking wire inlay on this part; the pattern itself is a uniform
// (setSurfaceFinish), never part of the program.
export function surface(kind: Recipe['kind'], engrave?: EngraveUniforms, inlay?: Recipe['inlay'], opts: { pattern?: boolean; quiet?: boolean; wrap?: Wrap } = {}) {
  const key = `surf-${kind}${inlay ? `-inlay-${inlay}` : ''}${opts.pattern ? '-pattern' : ''}${opts.quiet ? '-quiet' : ''}${opts.wrap ? `-wrap-${opts.wrap}` : ''}`;
  const base = shaderFor(key, { mapping: kind === 'blade' ? 'blade' : 'triplanar', kind, inlay, ...opts });
  const onBeforeCompile = engrave ? (shader: THREE.WebGLProgramParametersWithUniforms) => { base(shader); Object.assign(shader.uniforms, engrave); } : base;
  return { key, props: { onBeforeCompile, customProgramCacheKey: () => key } };
}
