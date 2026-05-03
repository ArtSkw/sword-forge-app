import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PRIMARY_BASE = 3.85;
const SECONDARY_BASE = 1.45;
const KEY_BASE = 1.42;
const RIM_BASE = 0.58;

export function Lighting() {
  const primaryRef   = useRef<THREE.PointLight>(null);
  const secondaryRef = useRef<THREE.PointLight>(null);
  const keyRef       = useRef<THREE.DirectionalLight>(null);
  const rimRef       = useRef<THREE.DirectionalLight>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Slow, deterministic forge pulse. Random spikes looked lively, but they
    // made reflective steel feel like it was blinking.
    const breathe = Math.sin(t * 1.6) * 0.08;
    const ember = Math.sin(t * 5.2 + 1.4) * 0.025;
    const factor = 1 + breathe + ember;

    if (primaryRef.current)
      primaryRef.current.intensity = PRIMARY_BASE * factor;
    if (primaryRef.current) {
      primaryRef.current.position.x = 0.08 + Math.sin(t * 0.42) * 0.08;
      primaryRef.current.position.z = 1.24 + Math.cos(t * 0.38) * 0.05;
    }
    if (secondaryRef.current) {
      secondaryRef.current.intensity = SECONDARY_BASE * (1 + breathe * 0.35);
      secondaryRef.current.position.x = -0.18 + Math.sin(t * 0.32 + 2.0) * 0.07;
    }
    if (keyRef.current) {
      keyRef.current.intensity = KEY_BASE * (1 - breathe * 0.18);
      keyRef.current.position.x = 2.2 + Math.sin(t * 0.18) * 0.16;
    }
    if (rimRef.current) {
      rimRef.current.intensity = RIM_BASE * (1 + ember * 0.45);
      rimRef.current.position.z = -3.8 + Math.sin(t * 0.24 + 1.2) * 0.12;
    }
  });

  return (
    <>
      {/* Primary forge glow — warm orange from below-front, like a hearth */}
      <pointLight ref={primaryRef} position={[0.08, -0.65, 1.24]} intensity={PRIMARY_BASE} color="#FF8C30" distance={6} decay={2} />
      {/* Secondary ember fill — low-level warm wash from below */}
      <pointLight ref={secondaryRef} position={[-0.18, -1.08, 0.46]} intensity={SECONDARY_BASE} color="#C05A10" distance={5} decay={2} />
      {/* Key overhead — cool neutral to separate polished steel from the warm background */}
      <directionalLight ref={keyRef} position={[2.2, 5.1, 2.15]} intensity={KEY_BASE} color="#E3EEFF" />
      {/* Rim — controlled blue edge definition, stronger than fill but not bloom-like */}
      <directionalLight ref={rimRef} position={[-3.2, 1.6, -3.8]} intensity={RIM_BASE} color="#9EBEFF" />
    </>
  );
}
