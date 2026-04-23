import { useRef, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Sword } from './Sword';
import { Lighting } from './Lighting';
import { useConfigStore } from '../../store/configStore';
import { BLADE_LENGTHS } from './Blade';
import { GUARD_HEIGHT } from './Crossguard';
import { GRIP_LENGTHS } from './Grip';
import { POMMEL_HALF_HEIGHTS } from './Pommel';

// Camera sits at ~65° polar (above + side) for a presentation-angle view.
// OrbitControls reset() will snap back here.
const CAMERA_POSITION: [number, number, number] = [1.8, 1.5, 3.0];

const MIN_POLAR = Math.PI * 0.10;
const MAX_POLAR = Math.PI * 0.85;
const AUTO_ROTATE_RESUME_MS = 10000;

function useShadowY() {
  const { config } = useConfigStore();
  const bladeLen    = BLADE_LENGTHS[config.blade.length];
  const gripLen     = GRIP_LENGTHS[config.grip.length];
  const pommelHalfH = POMMEL_HALF_HEIGHTS[config.pommel.style];
  const total       = bladeLen + GUARD_HEIGHT + gripLen + pommelHalfH * 2;
  return -(total / 2) - 0.05;
}

function SceneContents() {
  const [autoRotate, setAutoRotate] = useState(true);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orbitRef  = useRef<any>(null);
  const shadowY   = useShadowY();
  const { config, viewResetTick } = useConfigStore();

  // Reset orbit camera back to presentation angle
  useEffect(() => {
    if (!orbitRef.current) return;
    orbitRef.current.reset();
    if (timerRef.current) clearTimeout(timerRef.current);
    setAutoRotate(true);
  }, [viewResetTick]);

  // Restart auto-rotate when archetype changes
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setAutoRotate(true);
  }, [config.archetype]);

  const handleStart = useCallback(() => {
    setAutoRotate(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleEnd = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAutoRotate(true), AUTO_ROTATE_RESUME_MS);
  }, []);

  const swordGroupRef = useRef<THREE.Group>(null);
  const introRef = useRef({ done: false });

  useFrame(({ clock, scene }) => {
    // Slowly rotate the HDR environment so reflections drift across the blade
    if (scene.environmentRotation) scene.environmentRotation.y = clock.elapsedTime * 0.04;
  });

  useFrame(({ clock }) => {
    if (introRef.current.done || !swordGroupRef.current) return;
    const elapsed = clock.elapsedTime;
    const progress = Math.min(1, Math.max(0, (elapsed - 2.5) / 1.5));
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
        minPolarAngle={MIN_POLAR}
        maxPolarAngle={MAX_POLAR}
        minDistance={1.5}
        maxDistance={6}
        autoRotate={autoRotate}
        autoRotateSpeed={1.5}
        onStart={handleStart}
        onEnd={handleEnd}
      />
      <Environment preset="studio" />
      <Lighting />
      <ContactShadows position={[0, shadowY, 0]} blur={2} opacity={0.4} far={4} />
      {/* Presentation tilt: ~23° lean so blade reads as diagonal, not vertical */}
      <group ref={swordGroupRef} rotation={[0.08, 0, -0.80]}>
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
      style={{ background: 'transparent' }}
    >
      <SceneContents />
    </Canvas>
  );
}
