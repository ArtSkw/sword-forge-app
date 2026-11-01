import { useRef, useState, useCallback, useEffect, type ComponentRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Sword } from './Sword';
import { getSwordLayout } from './swordLayout';
import { Lighting } from './Lighting';
import { useConfigStore } from '../../store/configStore';
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
const STUDIO_HDRI = `${import.meta.env.BASE_URL}hdri/studio_small_03_1k.hdr`;
const SWORD_ROTATION: [number, number, number] = [0.08, 0, -0.80];

// Edit mode: how close the camera comes to each hilt part (Blade and Finish are fitted, see below).
const FOCUS_DISTANCE: Record<'guard' | 'grip' | 'pommel', number> = { guard: 0.85, grip: 0.8, pommel: 0.6 };
// Finish frames the whole sword large; Blade frames the blade itself (the hilt may leave the shot).
const FIT_FILL_FINISH = 1.0, FIT_FILL_BLADE = 1.08;
const FINISH_DROP = 36;          // px: Finish sits this much below the free area's centre
const BLADE_NUDGE = { x: 44, y: 12 };   // px: Blade sits this much right of and above the centre
// Screen space taken by the edit panels: inspector on the right, variant row + nav at the bottom.
const PANEL_RIGHT = 320, PANEL_BOTTOM = 220, MARGIN_TOP = 56;
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
function fitDistance(axis: THREE.Vector3, viewDir: THREE.Vector3, w: number, h: number, fill: number) {
  const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const right = new THREE.Vector3().crossVectors(WORLD_UP, viewDir).normalize();
  const up = new THREE.Vector3().crossVectors(viewDir, right);
  const pad = 0.06;   // guard width and pommel
  const ex = Math.abs(axis.dot(right)) + pad, ey = Math.abs(axis.dot(up)) + pad;
  const freeH = Math.max(0.3, (h - PANEL_BOTTOM - MARGIN_TOP) / h), freeW = Math.max(0.3, (w - PANEL_RIGHT) / w);
  return Math.max(ey / (2 * tan * freeH * fill), ex / (2 * tan * (w / h) * freeW * fill));
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

  // Station framing depends on the screen size only while a station is open (overview keeps its zoom on resize).
  const frameKey = station ? `${size.width}x${size.height}` : '';
  const dir = useRef(new THREE.Vector3());
  const motionReduced = useRef(reducedMotion());
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)'), on = () => { motionReduced.current = mq.matches; };
    mq.addEventListener('change', on); return () => mq.removeEventListener('change', on);
  }, []);
  const autoRotateOn = useRef(false);
  useEffect(() => { autoRotateOn.current = autoRotate && station === null && !reading && !motionReduced.current; });
  const lastFramed = useRef<{ station: StationId | null; reading: boolean; reframe: number } | null>(null);
  // Edit mode can be turned by hand; a double-click glides back to the part's shot.
  const [reframe, setReframe] = useState(0);
  // Re-frame triggers in edit mode: double-click, or the Reset view button.
  const again = reframe + (station ? viewResetTick : 0);
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
  useEffect(() => {
    const controls = orbitRef.current, group = swordGroupRef.current;
    if (!controls || !group) return;
    group.updateWorldMatrix(true, false);
    const m = move.current;
    m.fromTarget.copy(controls.target);
    m.fromDist = camera.position.distanceTo(controls.target);
    m.fromShift = m.shift; m.fromShiftY = m.shiftY;
    // Turn to face the blade's flat by azimuth (shorter way round) and elevation, never through the pole.
    // Leaving edit mode keeps the current direction.
    m.turn = station !== null;
    m.fromSph.setFromVector3(dir.current.subVectors(camera.position, controls.target));
    const faceDir = new THREE.Vector3().copy(FLAT_NORMAL).transformDirection(group.matrixWorld);
    m.toSph.setFromVector3(faceDir);
    m.toSph.theta = m.fromSph.theta + Math.atan2(Math.sin(m.toSph.theta - m.fromSph.theta), Math.cos(m.toSph.theta - m.fromSph.theta));
    if (station) {
      const layout = getSwordLayout(config);
      m.toShift = (PANEL_RIGHT / 2) / size.width;
      if (station === 'blade' || station === 'finish') {
        const blade = station === 'blade', len = blade ? layout.bladeLen : layout.total;
        m.toTarget.set(0, blade ? layout.bladeY : 0, 0).applyMatrix4(group.matrixWorld);
        const axis = new THREE.Vector3(0, 1, 0).transformDirection(group.matrixWorld).multiplyScalar(len);
        m.toDist = fitDistance(axis, faceDir, size.width, size.height, blade ? FIT_FILL_BLADE : FIT_FILL_FINISH);
        // Centred in the free area; Finish sits a little lower than that.
        m.toShiftY = ((PANEL_BOTTOM - MARGIN_TOP) / 2 + (blade ? BLADE_NUDGE.y : -FINISH_DROP)) / size.height;
        if (blade) m.toShift -= BLADE_NUDGE.x / size.width;
      } else {
        m.toTarget.set(0, anchorY(station, layout), 0).applyMatrix4(group.matrixWorld);
        m.toDist = FOCUS_DISTANCE[station as keyof typeof FOCUS_DISTANCE];
        m.toShiftY = PART_SHIFT_Y;
      }
    } else {
      m.toTarget.set(0, 0, 0);
      m.toDist = OVERVIEW_DISTANCE;
      m.toShift = reading ? READING_SHIFT : 0; m.toShiftY = 0;
    }
    controls.minDistance = Math.min(1.5, m.toDist * 0.8);
    controls.maxDistance = Math.max(6, m.toDist * 1.1);
    // A resize inside the same station re-frames at once instead of restarting the glide.
    const last = lastFramed.current;
    const resizeOnly = last?.station === station && last?.reading === reading && last?.reframe === again;
    lastFramed.current = { station, reading, reframe: again };
    m.t0 = performance.now(); m.ms = motionReduced.current || resizeOnly ? 1 : station ? FOCUS_MS : OVERVIEW_MS; m.active = true;
    // The config is read when the station changes; geometry edits inside a station must not re-frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station, reading, camera, frameKey, again]);

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
        enableZoom={station === null}
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
      <ContactShadows position={[0, shadowY, 0]} blur={2} opacity={0.4} far={4} />
      {/* Presentation tilt: ~23° lean so blade reads as diagonal, not vertical */}
      <group ref={swordGroupRef} rotation={SWORD_ROTATION}>
        <Sword />
      </group>
    </>
  );
}

export function Scene() {
  return (
    <Canvas
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
      camera={{ position: CAMERA_POSITION, fov: FOV }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.03;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
      style={{ background: 'transparent' }}
    >
      <SceneContents />
    </Canvas>
  );
}
