import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { LOW_TIER } from '../../lib/tier';
import { fireOnScreen, readFire } from '../../lib/forgeFire';

// The light of the room in the background plate: the hearth low on the left, cool lancet windows high up,
// a dark wet floor, the right side without a source. Polished steel is mostly a mirror of its surroundings,
// so the room itself is the main light: a soft environment built from a gradient and a few bright cards,
// with direct lights for the fire's warmth and the windows' chill.
//
// The plate is fixed to the screen, so the whole rig is too: it is built in view space (x right, y up,
// −z into the room) and turned with the camera every frame. However the sword is orbited, the fire stays
// where it is on screen, and the highlights travel over the steel as if it were turned before the hearth.

const ENV_INTENSITY = 1.15;
const KEY = 2.6;          // the hearth
const BOUNCE = 0.8;       // fire-lit wall and floor, from low on the left: the broad warmth the hilt takes
const WINDOW = 1.1;       // window light off the right-hand walls: neutral, so that side reads without a source
// Edit mode: the forge gives way to a neutral workshop light (see Workshop), with a light from the camera,
// so every part reads as what it is; a trace of the fire stays. The drama returns when the editor closes.
// Eased over ~0.8 s.
const INSPECT = 2.6, INSPECT_ENV = 0.3, INSPECT_WARM_CUT = 0.92;
const WORKSHOP_COVER = 0.92;   // how much of the forge the workshop hides at full edit mode

const FIRE = { base: new THREE.Color('#ffa257'), deep: new THREE.Color('#ff8040'), pale: new THREE.Color('#ffc27a') };
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
function Room({ hearth }: { hearth: THREE.Vector3 }) {
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
      c.setRGB(0.03, 0.025, 0.021)
        .add(warm.clone().multiplyScalar(1.25 * fire ** 1.4 * (1 - up * 0.6) * wall))
        // The right-hand walls, lit only by the windows: a neutral grey, so that side of the sword is in shade, not lost
        .add(side.clone().multiplyScalar(0.75 * Math.max(0, d.x) ** 1.3 * wall))
        .add(cool.clone().multiplyScalar(1.0 * up ** 2 * (0.6 + 0.4 * Math.max(0, d.x))))
        .add(hall.clone().multiplyScalar(0.4 * back ** 1.4 * (0.6 + 0.4 * Math.max(0, d.y + 0.3))))
        .add(floor.clone().multiplyScalar(0.35 * Math.max(0, -d.y) * (1 + 1.5 * back)));
      col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  }, [hearth]);
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
  const tmp = useMemo(() => ({ dir: new THREE.Vector3(), color: new THREE.Color(), lift: new THREE.Vector3() }), []);
  const workshop = getWorkshop();
  // While the workshop fades in or out (the mode has not settled yet), the environment is captured every frame;
  // otherwise once.
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
    // The fire: read from the video, eased so its 15 Hz samples flow; a slow breath where there is no video,
    // steady when motion is reduced.
    let level = 1, warmth = 0;
    if (!reducedMotion) {
      if (LOW_TIER) level = 1 + Math.sin(t * 1.35) * 0.05 + Math.sin(t * 4.9 + 1.4) * 0.02;
      else ({ level, warmth } = readFire());
    }
    const ease = Math.min(1, delta * 12);
    s.level += (level - s.level) * ease; s.warmth += (warmth - s.warmth) * ease;

    // Pin the room to the view.
    scene.environmentRotation.setFromQuaternion(camera.quaternion);
    scene.environmentIntensity = (ENV_INTENSITY + INSPECT_ENV * s.mix) * (1 + (s.level - 1) * 0.3);
    const place = (light: THREE.DirectionalLight | null, dir: THREE.Vector3) => {
      if (light) light.position.copy(tmp.dir.copy(dir).applyQuaternion(camera.quaternion).multiplyScalar(5));
    };
    const warm = 1 - INSPECT_WARM_CUT * s.mix;
    if (keyRef.current) {
      place(keyRef.current, hearth);
      keyRef.current.intensity = KEY * s.level * warm;
      keyRef.current.color.copy(FIRE.base).lerp(s.warmth > 0 ? FIRE.deep : FIRE.pale, Math.abs(s.warmth) * 0.6);
    }
    if (bounceRef.current) {
      place(bounceRef.current, BOUNCE_DIR);
      bounceRef.current.intensity = BOUNCE * (0.6 + 0.4 * s.level) * warm;
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
      {/* Captured once (again after a resize moves the fire, and every frame while the workshop fades); turned
          with the view above. */}
      <Environment key={`${fx}|${fy}`} frames={fading ? Infinity : 1} resolution={LOW_TIER ? 128 : 256}>
        <Room hearth={hearth} />
        <Workshop w={workshop} />
        {/* The hearth itself, deep in the room where it shows on screen */}
        <Lightformer form="rect" color="#ffb27a" intensity={5} scale={[2.2, 1.4, 1]} {...card(fireRay)} />
        {/* Its glow on the wall and the hood above */}
        <Lightformer form="rect" color="#9a6a4c" intensity={1.7} scale={[7, 5, 1]} {...card(v(-1, 0.25, -0.2))} />
        {/* The wet floor between the viewer and the sword, which the flats mirror in the usual view (the camera
            looks down on the sword): firelight pooled on the left, daylight from the door on the right, so the
            steel shades from warm to cool along its length */}
        <Lightformer form="rect" color="#d39a6c" intensity={2.4} scale={[2.6, 1.8, 1]} {...card(v(-0.35, -0.7, 0.62))} />
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
      </Environment>
      <directionalLight ref={keyRef} intensity={KEY} color={FIRE.base} />
      <directionalLight ref={bounceRef} intensity={BOUNCE} color="#c0602a" />
      <directionalLight ref={windowRef} intensity={WINDOW} color="#cdd5de" />
      {/* Always present (intensity 0 when idle): a change in the light count would recompile every shader */}
      <directionalLight ref={inspectRef} intensity={0} color="#f4f1ec" />
    </>
  );
}
