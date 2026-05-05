import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PRIMARY_BASE = 3.85;
const SECONDARY_BASE = 1.45;
const KEY_BASE = 1.42;
const RIM_BASE = 0.58;
const PRIMARY_EMBER = new THREE.Color('#FF8C30');
const PRIMARY_GOLD = new THREE.Color('#FFB04F');
const SECONDARY_EMBER = new THREE.Color('#C05A10');
const SECONDARY_COAL = new THREE.Color('#8F3A0A');

export function Lighting() {
  const primaryRef   = useRef<THREE.PointLight>(null);
  const secondaryRef = useRef<THREE.PointLight>(null);
  const keyRef       = useRef<THREE.DirectionalLight>(null);
  const rimRef       = useRef<THREE.DirectionalLight>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Slow, deterministic forge pulse. Random spikes looked lively, but they
    // made reflective steel feel like it was blinking.
    const breathe = Math.sin(t * 1.35) * 0.065;
    const ember = Math.sin(t * 4.9 + 1.4) * 0.024;
    const emberDetail = Math.sin(t * 7.7 + Math.sin(t * 0.8) * 0.7) * 0.012;
    const factor = 1 + breathe + ember + emberDetail;
    const colorMix = 0.5 + Math.sin(t * 1.05 + 0.6) * 0.22 + Math.sin(t * 2.4) * 0.06;

    if (primaryRef.current) {
      primaryRef.current.intensity = PRIMARY_BASE * factor;
      primaryRef.current.color.copy(PRIMARY_EMBER).lerp(PRIMARY_GOLD, colorMix);
      primaryRef.current.position.x = 0.08 + Math.sin(t * 0.42) * 0.10 + Math.sin(t * 1.1) * 0.018;
      primaryRef.current.position.z = 1.24 + Math.cos(t * 0.38) * 0.065;
    }
    if (secondaryRef.current) {
      secondaryRef.current.intensity = SECONDARY_BASE * (1 + breathe * 0.45 + ember * 0.28);
      secondaryRef.current.color.copy(SECONDARY_COAL).lerp(SECONDARY_EMBER, 0.64 + colorMix * 0.18);
      secondaryRef.current.position.x = -0.18 + Math.sin(t * 0.32 + 2.0) * 0.085;
      secondaryRef.current.position.z = 0.46 + Math.cos(t * 0.29 + 0.8) * 0.04;
    }
    if (keyRef.current) {
      keyRef.current.intensity = KEY_BASE * (1 - breathe * 0.10);
      keyRef.current.position.x = 2.2 + Math.sin(t * 0.18) * 0.16;
    }
    if (rimRef.current) {
      rimRef.current.intensity = RIM_BASE * (1 + ember * 0.24);
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
