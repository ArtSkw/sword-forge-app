import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PRIMARY_BASE   = 4.0;
const SECONDARY_BASE = 1.5;

export function Lighting() {
  const primaryRef   = useRef<THREE.PointLight>(null);
  const secondaryRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Slow breathing + fast flutter + occasional random spike — forge fire character
    const breathe = Math.sin(t * 2.4)  * 0.14;
    const flutter = Math.sin(t * 47.0) * 0.04;
    const spike   = Math.random() < 0.018 ? Math.random() * 0.28 : 0;
    const factor  = 1 + breathe + flutter + spike;

    if (primaryRef.current)
      primaryRef.current.intensity = PRIMARY_BASE * factor;
    if (secondaryRef.current)
      secondaryRef.current.intensity = SECONDARY_BASE * (1 + breathe * 0.5);
  });

  return (
    <>
      {/* Primary forge glow — warm orange from below-front, like a hearth */}
      <pointLight ref={primaryRef} position={[0, -0.6, 1.2]} intensity={PRIMARY_BASE} color="#FF8C30" distance={6} decay={2} />
      {/* Secondary ember fill — low-level warm wash from below */}
      <pointLight ref={secondaryRef} position={[0, -1.2, 0.4]} intensity={SECONDARY_BASE} color="#C05A10" distance={5} decay={2} />
      {/* Key overhead — cool neutral to separate the blade edge from the warm background */}
      <directionalLight position={[2, 5, 2]} intensity={1.2} color="#D8E8FF" />
      {/* Rim — faint cool-blue from behind for edge definition */}
      <directionalLight position={[-3, 2, -4]} intensity={0.5} color="#A0C0FF" />
    </>
  );
}
