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

// Edit mode: how close the camera comes to each part.
const FOCUS_DISTANCE: Record<StationId, number> = { blade: 2.2, guard: 0.85, grip: 0.8, pommel: 0.6, finish: 3.1 };
// Edit mode: the part sits left of the inspector (right) and above the variant row (bottom).
const FOCUS_SHIFT = 0.13;
const FOCUS_SHIFT_Y = 0.07;
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
  const move = useRef({ t0: 0, ms: 0, fromTarget: new THREE.Vector3(), toTarget: new THREE.Vector3(), fromDist: OVERVIEW_DISTANCE, toDist: OVERVIEW_DISTANCE, fromShift: 0, toShift: 0, shift: 0, fromShiftY: 0, toShiftY: 0, shiftY: 0, active: false });

  // Reset orbit camera back to presentation angle
  useEffect(() => {
    if (!orbitRef.current) return;
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
    if (station) {
      const y = anchorY(station, getSwordLayout(config));
      m.toTarget.set(0, y, 0).applyMatrix4(group.matrixWorld);
      m.toDist = FOCUS_DISTANCE[station];
      m.toShift = FOCUS_SHIFT; m.toShiftY = FOCUS_SHIFT_Y;
    } else {
      m.toTarget.set(0, 0, 0);
      m.toDist = OVERVIEW_DISTANCE;
      m.toShift = reading ? READING_SHIFT : 0; m.toShiftY = 0;
    }
    controls.minDistance = Math.min(1.5, m.toDist * 0.8);
    m.t0 = performance.now(); m.ms = reducedMotion() ? 1 : station ? FOCUS_MS : OVERVIEW_MS; m.active = true;
    // The config is read when the station changes; geometry edits inside a station must not re-frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station, reading, camera]);

  const handleStart = useCallback(() => {
    interaction.dragging = true; interaction.touchUntil = 0;
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
  const dir = useRef(new THREE.Vector3());
  useFrame(() => {
    const m = move.current, controls = orbitRef.current, cam = camera as THREE.PerspectiveCamera;
    if (m.active && controls) {
      const k = easeInOut(Math.min(1, (performance.now() - m.t0) / m.ms));
      dir.current.subVectors(cam.position, controls.target).normalize();
      controls.target.lerpVectors(m.fromTarget, m.toTarget, k);
      cam.position.copy(controls.target).addScaledVector(dir.current, m.fromDist + (m.toDist - m.fromDist) * k);
      m.shift = m.fromShift + (m.toShift - m.fromShift) * k;
      m.shiftY = m.fromShiftY + (m.toShiftY - m.fromShiftY) * k;
      if (k >= 1) m.active = false;
    }
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

  const framing = station !== null || reading;
  return (
    <>
      <OrbitControls
        ref={orbitRef}
        enableDamping
        dampingFactor={0.12}
        enablePan={false}
        enableRotate={station === null}
        enableZoom={station === null}
        minPolarAngle={MIN_POLAR}
        maxPolarAngle={MAX_POLAR}
        minDistance={1.5}
        maxDistance={6}
        autoRotate={autoRotate && !framing && !reducedMotion()}
        autoRotateSpeed={1.5}
        onStart={handleStart}
        onEnd={handleEnd}
      />
      {/* Same CC0 Poly Haven HDRI drei's "studio" preset uses, served locally instead of from a third-party CDN */}
      <Environment files={STUDIO_HDRI} environmentIntensity={1.18} />
      <Lighting />
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
      camera={{ position: CAMERA_POSITION, fov: 35 }}
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
