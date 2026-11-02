import { useRef, useState, useCallback, useEffect, type ComponentRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, ContactShadows, OrbitControls, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { Sword } from './Sword';
import { getSwordLayout } from './swordLayout';
import { Lighting } from './Lighting';
import { useConfigStore } from '../../store/configStore';
import { useViewportSize } from '../../hooks/useViewportSize';
import { anchors, interaction, publishAnchors } from '../../lib/anchors';
import { STATIONS, type StationId } from '../../presets/forge';

// Camera sits at ~65° polar (above + side) for a presentation-angle view.
const CAMERA_POSITION: [number, number, number] = [1.32, 1.1, 2.2];
const OVERVIEW_DISTANCE = Math.hypot(...CAMERA_POSITION);

const MIN_POLAR = Math.PI * 0.10;
const MAX_POLAR = Math.PI * 0.85;
const AUTO_ROTATE_RESUME_MS = 10000;
const SWORD_INTRO_DELAY = 2.6;
const SWORD_INTRO_DURATION = 1.2;
// Reflections: the 2k studio map on desktops, the 1k one on touch devices and small screens (quality tiers
// grow from here; see the performance step in the plan).
const LOW_TIER = typeof window !== 'undefined' && (matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 700);
const STUDIO_HDRI = `${import.meta.env.BASE_URL}hdri/studio_small_03_${LOW_TIER ? '1k' : '2k'}.hdr`;
// Frames the contact shadow keeps drawing after a re-render (~2 s at 60 fps: covers the intro and a part's swap).
const SHADOW_FRAMES = 120;
// Render resolution: at most 2× (a phone's 3× costs more than it shows), stepping down to 1.25× (1× on
// ordinary screens) when the frame rate cannot hold, and back up when it can.
const MAX_DPR = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
const MIN_DPR = Math.min(MAX_DPR, 1.25);
const SWORD_ROTATION: [number, number, number] = [0.08, 0, -0.80];

// Edit mode: how close the camera comes to each hilt part (Blade and Finish are fitted, see below),
// and the radius each close-up must keep in view, so narrow screens back off instead of cropping.
const FOCUS_DISTANCE: Record<'guard' | 'grip' | 'pommel', number> = { guard: 0.85, grip: 0.8, pommel: 0.6 };
const FOCUS_RADIUS: Record<'guard' | 'grip' | 'pommel', number> = { guard: 0.15, grip: 0.12, pommel: 0.09 };
// Finish frames the whole sword; Blade frames the blade. Both fit the free area, never past its edges.
const FIT_FILL_FINISH = 1.0, FIT_FILL_BLADE = 1.0;
// Overview: the whole sword must fit at any turn of the orbit, between the title and the sword types.
const OVERVIEW_FILL = 0.92;
const REFIT_MS = 450;
const FINISH_DROP = 36;          // px: Finish sits this much below the free area's centre
const BLADE_NUDGE = { x: 44, y: 12 };   // px: Blade sits this much right of and above the centre
// Screen space taken by the edit panels: inspector on the right, variant row + nav at the bottom.
const PANEL_RIGHT = 320, PANEL_BOTTOM = 220, MARGIN_TOP = 56;
type Panels = { top: number; bottom: number; right: number };
// Must match forge.css: on phones (≤ 700 px) the type row is smaller, and in edit mode a sheet at the bottom
// holds the choices (see PhoneSheet); formerly the inspector spanned the top of the screen (at most 42% of it) instead of the right side.
const PHONE = 700;
const overviewPanels = (w: number): Panels => ({ top: 110, bottom: w <= PHONE ? 120 : 140, right: 0 });
// The phone sheet's height (set from the store before each framing; the bar with Done sits below it).
let phoneSheetPx = 200;
const editPanels = (w: number, h: number): Panels => (w <= PHONE ? { top: Math.round(h * 0.03), bottom: phoneSheetPx + 80, right: 0 } : { top: MARGIN_TOP, bottom: PANEL_BOTTOM, right: PANEL_RIGHT });
const PART_SHIFT_Y = 0.07;       // hilt parts: a little above centre (they're small; centred in the free space looked low)
const FOV = 35;
const READING_SHIFT = -0.17;   // sword moves right while the historical account is open
const FOCUS_MS = 650;
const OVERVIEW_MS = 650;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

function useShadowY() {
  const config = useConfigStore((s) => s.config);
  return -(getSwordLayout(config).total / 2) - 0.05;
}

// Local Y of each station's anchor on the sword (sword space, before the presentation tilt).
function anchorY(id: StationId, layout: ReturnType<typeof getSwordLayout>) {
  switch (id) {
    case 'blade': return layout.tipY - layout.bladeLen * 0.42;
    case 'guard': return layout.guardY;
    case 'grip': return layout.gripY;
    case 'pommel': return layout.pommelY;
    case 'finish': return layout.tipY - layout.bladeLen * 0.16;
  }
}

// Edit mode looks straight at the blade's flat (its local +Z), so the sword lies flat in the screen
// at its usual diagonal, with no twist.
const FLAT_NORMAL = new THREE.Vector3(0, 0, 1);
const WORLD_UP = new THREE.Vector3(0, 1, 0);

// Distance at which the whole sword fits the free area of the screen, seen from `viewDir`
// (unit vector from the target to the camera): the sword's axis is projected onto the screen axes.
function fitDistance(axis: THREE.Vector3, viewDir: THREE.Vector3, w: number, h: number, fill: number, panels: Panels = editPanels(w, h)) {
  const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const right = new THREE.Vector3().crossVectors(WORLD_UP, viewDir).normalize();
  const up = new THREE.Vector3().crossVectors(viewDir, right);
  const pad = 0.06;   // guard width and pommel
  const ex = Math.abs(axis.dot(right)) + pad, ey = Math.abs(axis.dot(up)) + pad;
  const freeH = Math.max(0.3, (h - panels.bottom - panels.top) / h), freeW = Math.max(0.3, (w - panels.right) / w);
  return Math.max(ey / (2 * tan * freeH * fill), ex / (2 * tan * (w / h) * freeW * fill));
}

// Overview: the largest fit over a full turn of the orbit at the camera's current elevation.
function overviewFit(axis: THREE.Vector3, phi: number, w: number, h: number) {
  const sph = new THREE.Spherical(1, phi, 0), v = new THREE.Vector3();
  let d = 0;
  for (let k = 0; k < 16; k++) { sph.theta = (k / 16) * Math.PI * 2; d = Math.max(d, fitDistance(axis, v.setFromSpherical(sph), w, h, OVERVIEW_FILL, overviewPanels(w))); }
  return d;
}

// Hilt close-ups: no closer than keeps the part's radius inside the free area.
function partFit(radius: number, w: number, h: number) {
  const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const p = editPanels(w, h), freeH = Math.max(0.3, (h - p.bottom - p.top) / h), freeW = Math.max(0.3, (w - p.right) / w);
  return radius / (tan * Math.min(freeH, freeW * (w / h)));
}

function SceneContents() {
  const [autoRotate, setAutoRotate] = useState(true);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orbitRef  = useRef<ComponentRef<typeof OrbitControls>>(null);
  const shadowY   = useShadowY();
  const config = useConfigStore((s) => s.config);
  const viewResetTick = useConfigStore((s) => s.viewResetTick);
  const station = useConfigStore((s) => s.station);
  const reading = useConfigStore((s) => s.reading);
  const { camera, size } = useThree();
  const swordGroupRef = useRef<THREE.Group>(null);
  const introRef = useRef({ done: false });

  // Camera move state: from/to target, distance and view shift, interpolated in useFrame.
  const move = useRef({ t0: 0, ms: 0, fromTarget: new THREE.Vector3(), toTarget: new THREE.Vector3(), fromDist: OVERVIEW_DISTANCE, toDist: OVERVIEW_DISTANCE, fromShift: 0, toShift: 0, shift: 0, fromShiftY: 0, toShiftY: 0, shiftY: 0, fromSph: new THREE.Spherical(), toSph: new THREE.Spherical(), turn: false, active: false });

  // Framing follows the screen size and the sword's length: a longer blade or a smaller screen re-fits.
  const sheetPx = useConfigStore((s) => s.sheetPx);
  const sizeKey = `${size.width}x${size.height}x${size.width <= PHONE ? sheetPx : 0}`;
  const fitLayout = getSwordLayout(config);
  const geoKey = `${fitLayout.total.toFixed(3)}|${fitLayout.bladeLen.toFixed(3)}`;
  const dir = useRef(new THREE.Vector3());
  const motionReduced = useRef(reducedMotion());
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)'), on = () => { motionReduced.current = mq.matches; };
    mq.addEventListener('change', on); return () => mq.removeEventListener('change', on);
  }, []);
  const autoRotateOn = useRef(false);
  useEffect(() => { autoRotateOn.current = autoRotate && station === null && !reading && !motionReduced.current; });
  const lastFramed = useRef<{ station: StationId | null; reading: boolean; reframe: number; geo: string } | null>(null);
  // Edit mode can be turned by hand; a double-click glides back to the part's shot.
  const [reframe, setReframe] = useState(0);
  // Re-frame triggers: double-click (edit mode) or Reset view. In the overview the reset effect below runs
  // first (it is declared first), then the framing effect makes sure the reset view still fits.
  const again = reframe + viewResetTick;
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const el = gl.domElement, onDouble = () => { if (useConfigStore.getState().station) setReframe((n) => n + 1); };
    el.addEventListener('dblclick', onDouble);
    return () => el.removeEventListener('dblclick', onDouble);
  }, [gl]);

  // Reset view: in edit mode, back to the part's shot; otherwise the orbit camera returns to the presentation angle.
  useEffect(() => {
    if (!orbitRef.current) return;
    if (useConfigStore.getState().station) return;   // edit mode: the framing effect below re-frames
    orbitRef.current.reset();
    move.current.active = false; move.current.shift = 0; move.current.shiftY = 0;
    if (timerRef.current) clearTimeout(timerRef.current);
    const frame = requestAnimationFrame(() => setAutoRotate(true));
    return () => cancelAnimationFrame(frame);
  }, [viewResetTick]);

  // Restart auto-rotate when archetype changes
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const frame = requestAnimationFrame(() => setAutoRotate(true));
    return () => cancelAnimationFrame(frame);
  }, [config.archetype]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Glide to the chosen part (or back to the whole sword) whenever the station or reading changes.
  // Inside the same view, a change of size or of the sword's length re-fits it: target and distance
  // settle, the direction the user is looking from is kept. The overview only ever backs off to fit.
  useEffect(() => {
    const controls = orbitRef.current, group = swordGroupRef.current;
    if (!controls || !group) return;
    group.updateWorldMatrix(true, false);
    phoneSheetPx = sheetPx;
    const m = move.current, w = size.width, h = size.height;
    const last = lastFramed.current;
    const refit = last?.station === station && last?.reading === reading && last?.reframe === again;
    const resizeOnly = refit && last?.geo === geoKey;
    lastFramed.current = { station, reading, reframe: again, geo: geoKey };
    m.fromTarget.copy(controls.target);
    m.fromDist = camera.position.distanceTo(controls.target);
    m.fromShift = m.shift; m.fromShiftY = m.shiftY;
    // Turn to face the blade's flat by azimuth (shorter way round) and elevation, never through the pole.
    // Leaving edit mode, or re-fitting, keeps the current direction.
    m.turn = station !== null && !refit;
    m.fromSph.setFromVector3(dir.current.subVectors(camera.position, controls.target));
    const faceDir = new THREE.Vector3().copy(FLAT_NORMAL).transformDirection(group.matrixWorld);
    m.toSph.setFromVector3(faceDir);
    m.toSph.theta = m.fromSph.theta + Math.atan2(Math.sin(m.toSph.theta - m.fromSph.theta), Math.cos(m.toSph.theta - m.fromSph.theta));
    const layout = getSwordLayout(config);
    const axisOf = (len: number) => new THREE.Vector3(0, 1, 0).transformDirection(group.matrixWorld).multiplyScalar(len);
    if (station) {
      const panels = editPanels(w, h);
      m.toShift = (panels.right / 2) / w;
      if (station === 'blade' || station === 'finish') {
        const blade = station === 'blade', len = blade ? layout.bladeLen : layout.total;
        m.toTarget.set(0, blade ? layout.bladeY : 0, 0).applyMatrix4(group.matrixWorld);
        // Always fitted as seen in the part's own shot (the blade's flat), even when the user has turned the
        // sword: fitting the turned view would zoom right in whenever the blade points at the camera.
        m.toDist = fitDistance(axisOf(len), faceDir, w, h, blade ? FIT_FILL_BLADE : FIT_FILL_FINISH);
        // Centred in the free area; Finish sits a little lower than that.
        m.toShiftY = ((panels.bottom - panels.top) / 2 + (blade ? BLADE_NUDGE.y : -FINISH_DROP)) / h;
        if (blade && panels.right) m.toShift -= BLADE_NUDGE.x / w;
      } else {
        const part = station as keyof typeof FOCUS_DISTANCE;
        m.toTarget.set(0, anchorY(station, layout), 0).applyMatrix4(group.matrixWorld);
        m.toDist = Math.max(FOCUS_DISTANCE[part], partFit(FOCUS_RADIUS[part], w, h));
        m.toShiftY = w <= PHONE ? (panels.bottom - panels.top) / 2 / h : PART_SHIFT_Y;
      }
    } else {
      m.toTarget.set(0, 0, 0);
      const fit = overviewFit(axisOf(layout.total), m.fromSph.phi, w, h);
      m.toDist = refit ? Math.max(m.fromDist, fit) : Math.max(OVERVIEW_DISTANCE, fit);
      m.toShift = reading ? READING_SHIFT : 0; m.toShiftY = 0;
    }
    // Zoom is free in every view, within a sensible range around the shot (close enough to inspect, far
    // enough to see the whole sword). A refit keeps a user's zoom only when the length did not change.
    controls.minDistance = station ? Math.max(0.18, m.toDist * 0.35) : Math.min(1.5, m.toDist * 0.8);
    controls.maxDistance = station ? Math.max(m.toDist * 2.2, 1.6) : Math.max(6, m.toDist * 1.1);
    m.t0 = performance.now(); m.ms = motionReduced.current || resizeOnly ? 1 : refit ? REFIT_MS : station ? FOCUS_MS : OVERVIEW_MS; m.active = true;
    // The config is read through geoKey: only a change of the sword's length re-fits, not every part swap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station, reading, camera, sizeKey, again, geoKey, sheetPx]);

  const handleStart = useCallback(() => {
    interaction.dragging = true; interaction.touchUntil = 0;
    // A drag during a glide keeps the user's direction (target and distance still settle).
    move.current.turn = false;
    setAutoRotate(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleEnd = useCallback(() => {
    interaction.dragging = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAutoRotate(true), AUTO_ROTATE_RESUME_MS);
  }, []);

  useFrame(({ clock, scene }) => {
    // Slowly rotate the HDR environment so reflections drift across the blade
    if (scene.environmentRotation) scene.environmentRotation.y = clock.elapsedTime * 0.04;
  });

  // Camera glide + view offset
  const sph = useRef(new THREE.Spherical());
  useFrame(() => {
    const m = move.current, controls = orbitRef.current, cam = camera as THREE.PerspectiveCamera;
    if (m.active && controls) {
      const k = easeInOut(Math.min(1, (performance.now() - m.t0) / m.ms));
      if (m.turn) {
        sph.current.set(1, m.fromSph.phi + (m.toSph.phi - m.fromSph.phi) * k, m.fromSph.theta + (m.toSph.theta - m.fromSph.theta) * k);
        dir.current.setFromSpherical(sph.current);
      } else dir.current.subVectors(cam.position, controls.target).normalize();
      controls.target.lerpVectors(m.fromTarget, m.toTarget, k);
      cam.position.copy(controls.target).addScaledVector(dir.current, m.fromDist + (m.toDist - m.fromDist) * k);
      m.shift = m.fromShift + (m.toShift - m.fromShift) * k;
      m.shiftY = m.fromShiftY + (m.toShiftY - m.fromShiftY) * k;
      if (k >= 1) m.active = false;
    }
    // Auto-rotation pauses while the rings are shown, so the part under the pointer stays put.
    if (controls) controls.autoRotate = autoRotateOn.current && !interaction.rings;
    if (Math.abs(m.shift) > 1e-4 || Math.abs(m.shiftY) > 1e-4) cam.setViewOffset(size.width, size.height, m.shift * size.width, m.shiftY * size.height, size.width, size.height);
    else if (cam.view?.enabled) cam.clearViewOffset();
  });

  // Project each part to screen for the DOM overlay
  const v = useRef(new THREE.Vector3());
  useFrame(() => {
    const group = swordGroupRef.current;
    if (!group) return;
    const layout = getSwordLayout(config);
    for (const { id } of STATIONS) {
      v.current.set(0, anchorY(id, layout), 0).applyMatrix4(group.matrixWorld).project(camera);
      const a = anchors[id];
      a.x = (v.current.x + 1) / 2 * size.width;
      a.y = (1 - v.current.y) / 2 * size.height;
      a.visible = v.current.z < 1 && introRef.current.done;
    }
    publishAnchors();
  });

  useFrame(({ clock }) => {
    if (introRef.current.done || !swordGroupRef.current) return;
    const elapsed = clock.elapsedTime;
    const progress = Math.min(1, Math.max(0, (elapsed - SWORD_INTRO_DELAY) / SWORD_INTRO_DURATION));
    swordGroupRef.current.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        mat.transparent = progress < 1;
        mat.opacity = progress;
      }
    });
    if (progress >= 1) introRef.current.done = true;
  });

  return (
    <>
      <OrbitControls
        ref={orbitRef}
        enableDamping
        dampingFactor={0.12}
        enablePan={false}
        enableZoom
        rotateSpeed={station ? 0.7 : 1}
        minPolarAngle={MIN_POLAR}
        maxPolarAngle={MAX_POLAR}
        minDistance={1.5}
        maxDistance={6}
        autoRotateSpeed={1.5}
        onStart={handleStart}
        onEnd={handleEnd}
      />
      {/* Same CC0 Poly Haven HDRI drei's "studio" preset uses, served locally instead of from a third-party CDN */}
      <Environment files={STUDIO_HDRI} environmentIntensity={1.18} />
      <Lighting inspect={station !== null} />
      {/* The sword never moves under its shadow (only the camera does), so the shadow is drawn for a moment
          after each change, when this component re-renders, not in every frame. */}
      <ContactShadows position={[0, shadowY, 0]} blur={2} opacity={0.4} far={4} frames={SHADOW_FRAMES} />
      {/* Presentation tilt: ~23° lean so blade reads as diagonal, not vertical */}
      <group ref={swordGroupRef} rotation={SWORD_ROTATION}>
        <Sword />
      </group>
    </>
  );
}

export function Scene() {
  const [dpr, setDpr] = useState(MAX_DPR);
  // Tablets and phones: History & use takes the whole stage, so the sword fades out behind it.
  const reading = useConfigStore((s) => s.reading);
  const { width } = useViewportSize();
  const hidden = reading && width < 1180;
  return (
    <Canvas
      dpr={dpr}
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
      camera={{ position: CAMERA_POSITION, fov: FOV }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.03;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
      style={{ background: 'transparent', opacity: hidden ? 0 : 1, transition: `opacity ${hidden ? 260 : 420}ms cubic-bezier(.2, 0, 0, 1)` }}
    >
      <PerformanceMonitor flipflops={4} onFallback={() => setDpr(MIN_DPR)}
        onDecline={() => setDpr((d) => Math.max(MIN_DPR, +(d - 0.25).toFixed(2)))}
        onIncline={() => setDpr((d) => Math.min(MAX_DPR, +(d + 0.25).toFixed(2)))} />
      <SceneContents />
    </Canvas>
  );
}
