import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal, useFrame, useThree } from '@react-three/fiber';
import { Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { LOW_TIER } from '../../lib/tier';
import { fireOnScreen, readFire } from '../../lib/forgeFire';
import { snoise } from '../../lib/noise';

// The light of the room in the background plate: the hearth low on the left, cool lancet windows high up,
// a dark wet floor, the right side without a source. Polished steel is mostly a mirror of its surroundings,
// so the room itself is the main light: a soft environment built from a gradient and a few bright cards,
// with direct lights for the fire's warmth and the windows' chill.
//
// The plate is fixed to the screen, so the whole rig is too: it is built in view space (x right, y up,
// −z into the room) and turned with the camera every frame. However the sword is orbited, the fire stays
// where it is on screen, and the highlights travel over the steel as if it were turned before the hearth.

const ENV_INTENSITY = 1.15;  // steady: the windows and the daylight do not flicker with the fire
const KEY = 2.6;          // the hearth
const BOUNCE = 0.8;       // fire-lit wall and floor, from low on the left: the broad warmth the hilt takes
const WINDOW = 1.1;       // window light off the right-hand walls: neutral, so that side reads without a source
// Edit mode: the forge gives way to a neutral workshop light (see Workshop), with a light from the camera,
// so every part reads as what it is; a trace of the fire stays. The drama returns when the editor closes.
// Eased over ~0.8 s.
const INSPECT = 2.6, INSPECT_ENV = 0.3, INSPECT_WARM_CUT = 0.92;
const WORKSHOP_COVER = 0.92;   // how much of the forge the workshop hides at full edit mode

const FIRE = { base: new THREE.Color('#ffa257'), deep: new THREE.Color('#ff8040'), pale: new THREE.Color('#ffc27a') };
// The fire living on the steel. The measured curve swings the hearth only ~±7 % (σ 0.073), and the steel shows the
// fire mostly as reflections of the room it lights, captured once: so the light read static. Now the fire-lit part
// of the room (SplitEnvironment) follows the fire with a gain on the video's swing and the flame's own quick flutter
// on top. Its reflections lie on the side of the sword nearer the fire (the left in the overview), so that side
// takes most of the life, as under a real hearth. The key follows too, more calmly, and turns a little with the
// flame's sway, so its glints slide over the steel; the bounce off the floor (which lights the far side most)
// keeps its old, gentle swing. Windows and daylight stay steady; edit mode cuts the fire to a trace with the rest
// of the warmth; reduced motion holds it still. Swings pass through a soft limit (tanh), so no flare clips.
const LIVE = {
  room: 6,                   // gain on the swing: the fire-lit part of the room
  tint: 0.2,                 // its blue (and half its green) shift with the fire's warmth (−1…1)
  key: 3,                    // the key (and KEY_FLUTTER of the flutter)
  bounce: 0.4,               // the floor bounce, as before
  flutter: 0.06,             // the flame's quick flicker over the 24 fps curve: value noise, two octaves
  flutterHz: [5.3, 8.9],
  limit: 0.7,                // soft limit: the multiplier stays within 1 ± this
  sway: [0.07, 0.05],        // m, view x and y, at SWAY_AT: the flame leans and lifts (~2.5° from the sword)
  swayHz: 0.7,
  rise: 0.3,                 // m per unit of swing: a flare stands taller
  breath: [0.1, 0.04],       // low tier (no video): a synthetic swing, slow and quick octaves
  edit: 0.06,                // edit mode: the whole room's light breathes this much with the fire's swing, so it never stills
};
const KEY_FLUTTER = 0.5;
const SWAY_AT = 1.6;         // m: the key's direction is taken toward a flame this far away, so the sway turns it
const reducedMotion = typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** View-space direction from the sword toward the hearth, for a fire at `ndc` on screen. */
function hearthDirection(ndc: { x: number; y: number }, aspect: number, fov: number) {
  const tan = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  // The fire stands deep in the room behind the sword; the light is pulled round toward the side so it
  // rakes across the left of the blade instead of only rimming it.
  return new THREE.Vector3(ndc.x * tan * aspect - 0.9, ndc.y * tan + 0.12, -0.6).normalize();
}

// The room as a gradient on a sphere around the sword (view space): fire-lit to the left, cool from above,
// a dim warm hall behind the viewer, dark floor. Never black, so no face of the blade mirrors a void.
// In two parts (see SplitEnvironment): what the fire lights, and the rest.
function Room({ hearth, part }: { hearth: THREE.Vector3; part: 'fire' | 'steady' }) {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(20, 48, 24), pos = g.getAttribute('position'), col: number[] = [];
    const d = new THREE.Vector3(), c = new THREE.Color();
    const warm = new THREE.Color('#d8946a'), cool = new THREE.Color('#9fb4d0'), hall = new THREE.Color('#7d746a'), floor = new THREE.Color('#3a2414'), side = new THREE.Color('#8a8e94');
    for (let i = 0; i < pos.count; i++) {
      d.fromBufferAttribute(pos, i).normalize();
      const fire = Math.max(0, d.dot(hearth)), up = Math.max(0, d.y), back = Math.max(0, d.z);
      // Where the fire-lit wall meets the dark floor: a fairly crisp line, so a flat of the blade that mirrors
      // it shades from light to dark along its length instead of reading as one flat tone.
      const wall = THREE.MathUtils.smoothstep(d.y, -0.62, -0.4);
      const lit = warm.clone().multiplyScalar(1.25 * fire ** 1.4 * (1 - up * 0.6) * wall);
      if (part === 'fire') { col.push(lit.r, lit.g, lit.b); continue; }
      c.setRGB(0.03, 0.025, 0.021)
        // The right-hand walls, lit only by the windows: a neutral grey, so that side of the sword is in shade, not lost
        .add(side.clone().multiplyScalar(0.75 * Math.max(0, d.x) ** 1.3 * wall))
        .add(cool.clone().multiplyScalar(1.0 * up ** 2 * (0.6 + 0.4 * Math.max(0, d.x))))
        .add(hall.clone().multiplyScalar(0.4 * back ** 1.4 * (0.6 + 0.4 * Math.max(0, d.y + 0.3))))
        .add(floor.clone().multiplyScalar(0.35 * Math.max(0, -d.y) * (1 + 1.5 * back)));
      col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  }, [hearth, part]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo}><meshBasicMaterial vertexColors side={THREE.BackSide} toneMapped={false} /></mesh>;
}

// A card facing the sword from view-space direction `dir` at distance `at`.
function card(dir: THREE.Vector3, at = 6) {
  const position = dir.clone().normalize().multiplyScalar(at), o = new THREE.Object3D();
  o.position.copy(position); o.lookAt(0, 0, 0);
  return { position, rotation: o.rotation.clone() };
}
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).normalize();
const BOUNCE_DIR = v(-0.8, -0.45, 0.4);
const WINDOW_DIR = v(0.8, 0.75, -0.25);

// Edit mode's light: a neutral workshop inside the forge room — a soft grey dome, bright overhead, and broad
// softboxes on both sides and behind the viewer (which the flats mirror when the editor faces them). It is a
// shell nearer the sword than the forge cards, faded in over the forge: polished steel is a mirror and
// ignores lamps, so only a neutral room around it makes it read neutral.
const WORKSHOP_BOXES: { dir: THREE.Vector3; scale: [number, number, number]; color: string; intensity: number }[] = [
  { dir: v(0, 1, 0.35), scale: [3.6, 2, 1], color: '#eef0f2', intensity: 2.6 },        // overhead
  { dir: v(1, 0.25, 0.25), scale: [0.9, 3.4, 1], color: '#e8ecf0', intensity: 2.4 },   // right strip
  { dir: v(-1, 0.25, 0.25), scale: [0.9, 3.4, 1], color: '#f2e8de', intensity: 1.9 },  // left strip, a trace of the fire
  { dir: v(0.15, 0.2, 1), scale: [2.6, 3.2, 1], color: '#eceef0', intensity: 1.6 },    // behind the viewer
  { dir: v(0, -0.6, 0.8), scale: [3, 1.4, 1], color: '#e4e4e4', intensity: 1.0 },      // the floor before the viewer
];
// One workshop for the app's lifetime (there is one scene); its opacities are driven every frame.
let workshopShared: ReturnType<typeof makeWorkshop> | null = null;
const getWorkshop = () => (workshopShared ??= makeWorkshop());
function makeWorkshop() {
  const g = new THREE.SphereGeometry(5.5, 32, 16), pos = g.getAttribute('position'), col: number[] = [], d = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    d.fromBufferAttribute(pos, i).normalize();
    const k = 0.14 + 0.36 * Math.max(0, d.y) ** 1.2 + 0.12 * Math.max(0, d.z) - 0.06 * Math.max(0, -d.y);
    col.push(k, k * 1.005, k * 1.015);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const fade = { transparent: true, opacity: 0, depthWrite: false, toneMapped: false };
  const dome = new THREE.MeshBasicMaterial({ ...fade, vertexColors: true, side: THREE.BackSide });
  const boxes = WORKSHOP_BOXES.map((b) => new THREE.MeshBasicMaterial({ ...fade, side: THREE.DoubleSide, color: new THREE.Color(b.color).multiplyScalar(b.intensity) }));
  return { geo: g, dome, boxes };
}
function Workshop({ w }: { w: ReturnType<typeof makeWorkshop> }) {
  // Drawn after the forge (renderOrder): the dome first, the softboxes inside it on top.
  return (
    <>
      <mesh geometry={w.geo} material={w.dome} renderOrder={1} />
      {WORKSHOP_BOXES.map((b, i) => (
        <mesh key={i} material={w.boxes[i]} scale={b.scale} renderOrder={2} {...card(b.dir, 4.5)}><planeGeometry /></mesh>
      ))}
    </>
  );
}

// The environment in two parts, captured apart and summed every frame: the room as the fire lights it (the hearth,
// its glow on the wall, the warm pool on the floor, the fire-lit side of the room) and the rest (windows, daylight,
// the hall, the workshop). Polished steel is mostly a mirror of the room, so the fire lives on it through these
// reflections, not through lamps: the fire part is scaled by the fire's level before the sum, so the fire-lit
// reflections breathe with the video while the windows hold steady. Each part is captured once (the steady part
// every frame while the workshop fades); the sum is one full-screen pass over the PMREM atlas, nothing is read back.

// One PMREM generator per renderer, kept for its lifetime (a recreated canvas gets its own, never a dead context's).
const pmremByRenderer = new WeakMap<THREE.WebGLRenderer, THREE.PMREMGenerator>();
const getPmrem = (gl: THREE.WebGLRenderer) => {
  let p = pmremByRenderer.get(gl);
  if (!p) { p = new THREE.PMREMGenerator(gl); pmremByRenderer.set(gl, p); }
  return p;
};
const SUM = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: { steady: { value: null }, fire: { value: null }, gain: { value: new THREE.Color(1, 1, 1) } },
  vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `uniform sampler2D steady, fire; uniform vec3 gain;
    void main() { ivec2 p = ivec2(gl_FragCoord.xy); gl_FragColor = texelFetch(steady, p, 0) + vec4(gain, 1.0) * texelFetch(fire, p, 0); }`,
  depthTest: false, depthWrite: false,
}));
SUM.frustumCulled = false;
const SUM_CAMERA = new THREE.Camera();

function SplitEnvironment({ fire, steady, resolution, live, gain, captureKey }: {
  fire: ReactNode; steady: ReactNode; resolution: number;
  live: boolean;                      // capture the steady part every frame (the workshop is fading)
  gain: RefObject<THREE.Color>;       // the fire part's scale per channel, set every frame by ForgeLighting
  captureKey: string;                 // a change recaptures both parts
}) {
  const get = useThree((s) => s.get);
  // Per part (fire, steady): a virtual scene, a cube camera, and the PMREM atlas made from its capture.
  const parts = useMemo(() => [0, 1].map(() => {
    const cube = new THREE.WebGLCubeRenderTarget(resolution, { type: THREE.HalfFloatType });
    return { scene: new THREE.Scene(), cube, camera: new THREE.CubeCamera(0.1, 1000, cube) };
  }), [resolution]);
  const atlas = useRef<(THREE.WebGLRenderTarget | null)[]>([null, null]);
  const sum = useRef<THREE.WebGLRenderTarget | null>(null);
  const dirty = useRef({ fire: true, steady: true, gain: new THREE.Color(-1, -1, -1) });
  useLayoutEffect(() => { dirty.current.fire = dirty.current.steady = true; }, [captureKey, parts]);
  useEffect(() => () => {
    parts.forEach((p) => p.cube.dispose());
    atlas.current.forEach((a) => a?.dispose()); atlas.current = [null, null];
    const sc = get().scene;
    if (sc.environment === sum.current?.texture) sc.environment = null;
    sum.current?.dispose(); sum.current = null;
  }, [parts, get]);

  useFrame(({ gl, scene }) => {
    const d = dirty.current, k = gain.current;
    const capture = (i: number) => {
      const p = parts[i], autoClear = gl.autoClear;
      gl.autoClear = true;
      p.camera.update(gl, p.scene);
      gl.autoClear = autoClear;
      atlas.current[i] = getPmrem(gl).fromCubemap(p.cube.texture, atlas.current[i]);
    };
    const captured = d.fire || d.steady || live;
    if (d.fire) { capture(0); d.fire = false; }
    if (d.steady || live) { capture(1); d.steady = false; }
    const [fireAtlas, steadyAtlas] = atlas.current;
    if (!fireAtlas || !steadyAtlas) return;
    if (!sum.current || sum.current.width !== steadyAtlas.width || sum.current.height !== steadyAtlas.height) {
      sum.current?.dispose();
      sum.current = new THREE.WebGLRenderTarget(steadyAtlas.width, steadyAtlas.height, { depthBuffer: false, generateMipmaps: false, type: THREE.HalfFloatType, format: THREE.RGBAFormat, colorSpace: THREE.LinearSRGBColorSpace, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter });
      sum.current.texture.mapping = THREE.CubeUVReflectionMapping;
      sum.current.texture.name = 'forge.sum';
      d.gain.setRGB(-1, -1, -1);
    }
    if (!captured && d.gain.equals(k)) return;
    d.gain.copy(k);
    const m = SUM.material as THREE.ShaderMaterial;
    m.uniforms.steady.value = steadyAtlas.texture; m.uniforms.fire.value = fireAtlas.texture; m.uniforms.gain.value.copy(k);
    const target = gl.getRenderTarget();
    gl.setRenderTarget(sum.current);
    gl.render(SUM, SUM_CAMERA);
    gl.setRenderTarget(target);
    scene.environment = sum.current.texture;
  });

  return <>{createPortal(fire, parts[0].scene)}{createPortal(steady, parts[1].scene)}</>;
}

export function ForgeLighting({ inspect = false }: { inspect?: boolean }) {
  const { size, camera } = useThree();
  const fov = (camera as THREE.PerspectiveCamera).fov;
  // The fire's place on screen, in steps (a resize re-renders the environment only when it moves visibly).
  const ndc = fireOnScreen(size.width, size.height);
  const fx = Math.round(ndc.x * 20) / 20, fy = Math.round(ndc.y * 20) / 20;
  const hearth = useMemo(() => hearthDirection({ x: fx, y: fy }, size.width / size.height, fov), [fx, fy, size.width, size.height, fov]);
  const fireRay = useMemo(() => v(fx * Math.tan(THREE.MathUtils.degToRad(fov / 2)) * (size.width / size.height), fy * 0.3 - 0.1, -1), [fx, fy, fov, size.width, size.height]);

  const keyRef = useRef<THREE.DirectionalLight>(null), bounceRef = useRef<THREE.DirectionalLight>(null);
  const windowRef = useRef<THREE.DirectionalLight>(null), inspectRef = useRef<THREE.DirectionalLight>(null);
  const state = useRef({ mix: 0, level: 1, warmth: 0 });
  const fireGain = useRef(new THREE.Color(1, 1, 1));
  const tmp = useMemo(() => ({ dir: new THREE.Vector3(), lift: new THREE.Vector3(), sway: new THREE.Vector3(), at: new THREE.Vector3() }), []);
  const workshop = getWorkshop();
  // While the workshop fades in or out (the mode has not settled yet), the steady part of the environment is
  // captured every frame; otherwise once.
  const [settled, setSettled] = useState(inspect);
  const fading = settled !== inspect;

  useFrame(({ clock, scene, camera }, delta) => {
    const s = state.current, t = clock.elapsedTime;
    const target = inspect ? 1 : 0;
    s.mix += (target - s.mix) * Math.min(1, delta * 4);
    if (Math.abs(target - s.mix) < 0.004) { s.mix = target; if (fading) setSettled(inspect); }
    const w = getWorkshop();
    w.dome.opacity = s.mix * WORKSHOP_COVER;
    w.boxes.forEach((m) => { m.opacity = s.mix; });
    // The fire: read from the video, eased so its 24 fps samples flow; a synthetic breath where there is no
    // video (paler as it swells), steady when motion is reduced.
    let level = 1, warmth = 0;
    if (!reducedMotion) {
      if (LOW_TIER) {
        level = 1 + LIVE.breath[0] * snoise(t * 0.9) + LIVE.breath[1] * snoise(t * 3.1 + 40);
        warmth = THREE.MathUtils.clamp((1 - level) * 4, -1, 1);
      } else ({ level, warmth } = readFire());
    }
    const ease = Math.min(1, delta * 12);
    s.level += (level - s.level) * ease; s.warmth += (warmth - s.warmth) * ease;
    // Its life: the swing about the mean with a gain per light, the flutter on top, and the flame's sway.
    const swing = s.level - 1, live = reducedMotion ? 0 : 1;
    const flutter = live * LIVE.flutter * (0.65 * snoise(t * LIVE.flutterHz[0]) + 0.35 * snoise(t * LIVE.flutterHz[1] + 17));
    const gained = (gain: number, f = 1) => 1 + LIVE.limit * Math.tanh((gain * swing + f * flutter) / LIVE.limit);
    tmp.sway.set(live * LIVE.sway[0] * snoise(t * LIVE.swayHz + 5), live * LIVE.sway[1] * snoise(t * LIVE.swayHz * 1.3 + 91) + LIVE.rise * swing, 0);
    // The fire-lit room's part of the environment; the workshop's dome covers it in edit mode.
    // Its colour follows the fire's: paler and yellower as it flares, deeper and redder as it sinks.
    const lit = gained(LIVE.room);
    const room = lit * (1 - WORKSHOP_COVER * s.mix), tint = s.warmth * LIVE.tint;
    fireGain.current.setRGB(room, room * (1 - tint * 0.5), room * (1 - tint));

    // Pin the room to the view.
    scene.environmentRotation.setFromQuaternion(camera.quaternion);
    // In edit mode the workshop hides the fire-lit room, so the room as a whole keeps a little of the fire's life.
    scene.environmentIntensity = (ENV_INTENSITY + INSPECT_ENV * s.mix) * (1 + LIVE.edit * s.mix * (lit - 1));
    const place = (light: THREE.DirectionalLight | null, dir: THREE.Vector3) => {
      if (light) light.position.copy(tmp.dir.copy(dir).normalize().applyQuaternion(camera.quaternion).multiplyScalar(5));
    };
    const warm = 1 - INSPECT_WARM_CUT * s.mix;
    if (keyRef.current) {
      place(keyRef.current, tmp.at.copy(hearth).multiplyScalar(SWAY_AT).add(tmp.sway));   // turns with the flame
      keyRef.current.intensity = KEY * gained(LIVE.key, KEY_FLUTTER) * warm;
      keyRef.current.color.copy(FIRE.base).lerp(s.warmth > 0 ? FIRE.deep : FIRE.pale, Math.abs(s.warmth) * 0.6);
    }
    if (bounceRef.current) {
      place(bounceRef.current, BOUNCE_DIR);
      bounceRef.current.intensity = BOUNCE * gained(LIVE.bounce, 0) * warm;
    }
    place(windowRef.current, WINDOW_DIR);
    const light = inspectRef.current;
    if (light) {
      light.intensity = INSPECT * s.mix;
      light.position.copy(camera.position).add(tmp.lift.copy(camera.up).multiplyScalar(0.6));
    }
  });

  return (
    <>
      {/* Captured once (again after a resize moves the fire, the steady part every frame while the workshop
          fades); summed every frame with the fire's level; turned with the view above. */}
      <SplitEnvironment
        resolution={LOW_TIER ? 128 : 256} live={fading} gain={fireGain} captureKey={`${fx}|${fy}`}
        fire={<>
          <Room hearth={hearth} part="fire" />
          {/* The hearth itself, deep in the room where it shows on screen */}
          <Lightformer form="rect" color="#ffb27a" intensity={5} scale={[2.2, 1.4, 1]} {...card(fireRay)} />
          {/* Its glow on the wall and the hood above */}
          <Lightformer form="rect" color="#9a6a4c" intensity={1.7} scale={[7, 5, 1]} {...card(v(-1, 0.25, -0.2))} />
          {/* The wet floor between the viewer and the sword, which the flats mirror in the usual view (the camera
              looks down on the sword): firelight pooled on the left (and daylight on the right, in the steady part),
              so the steel shades from warm to cool along its length */}
          <Lightformer form="rect" color="#d39a6c" intensity={2.4} scale={[2.6, 1.8, 1]} {...card(v(-0.35, -0.7, 0.62))} />
        </>}
        steady={<>
          <Room hearth={hearth} part="steady" />
          <Workshop w={workshop} />
          <Lightformer form="rect" color="#a9b6c6" intensity={1.8} scale={[2.2, 1.6, 1]} {...card(v(0.4, -0.68, 0.62))} />
          {/* The window-lit wall on the right: a broad, soft, neutral fill */}
          <Lightformer form="rect" color="#c8ccd2" intensity={2} scale={[4, 5, 1]} {...card(v(1, 0.15, -0.1))} />
          {/* Lancet windows high in the walls: thin cool slivers, the crispest highlights on the steel */}
          <Lightformer form="rect" color="#c4d2e6" intensity={12} scale={[0.3, 1.8, 1]} {...card(v(-0.35, 1.1, -0.8))} />
          <Lightformer form="rect" color="#b8c8e0" intensity={8} scale={[0.26, 1.4, 1]} {...card(v(0.6, 0.9, -0.9))} />
          {/* A high window behind the viewer, up to the right: the neutral counterpart of the warm floor pool, so a
              satin blade, whose reflection is drawn out along its length, takes in both and reads as steel */}
          <Lightformer form="rect" color="#d4dae2" intensity={3.2} scale={[1.8, 2.8, 1]} {...card(v(0.4, 0.6, 0.7))} />
          {/* Daylight from a doorway behind the viewer, to the right: a blade turned to the camera mirrors this
              band, and as the sword turns it travels along the steel */}
          <Lightformer form="rect" color="#d6dce4" intensity={3} scale={[1.6, 4, 1]} {...card(v(0.55, -0.1, 0.8))} />
        </>}
      />
      <directionalLight ref={keyRef} intensity={KEY} color={FIRE.base} />
      <directionalLight ref={bounceRef} intensity={BOUNCE} color="#c0602a" />
      <directionalLight ref={windowRef} intensity={WINDOW} color="#cdd5de" />
      {/* Always present (intensity 0 when idle): a change in the light count would recompile every shader */}
      <directionalLight ref={inspectRef} intensity={0} color="#f4f1ec" />
    </>
  );
}
