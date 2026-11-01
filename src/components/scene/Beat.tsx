import { useEffect, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// When a part is swapped (its key changes) it glows for a moment and cools, like metal fresh from the
// fire: a warm emissive light that eases in quickly and fades out. Nothing moves, so nothing overlaps.
// Leather and cord do not glow; they take a soft lift of light instead. Off on the first mount, on a
// change of sword type (`scope`), and with reduced motion.

const MS = 760, RISE = 0.12;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const EMBER = new THREE.Color('#ff6a1f'), LIFT = new THREE.Color('#fff1dc');

type Saved = { mat: THREE.MeshStandardMaterial; color: THREE.Color; intensity: number };
// Materials are three.js objects owned by the scene, changed in place each frame (not React state).
function glowTo(list: Saved[], tint: THREE.Color, peak: number, glow: number) {
  for (const s of list) {
    s.mat.emissive.copy(s.color).lerp(tint, glow);
    s.mat.emissiveIntensity = s.intensity + (peak - s.intensity) * glow;
  }
}

export function Beat({ k, scope, soft = false, children }: { k: string; scope: string; soft?: boolean; children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const start = useRef<number | null>(null);
  const saved = useRef<Saved[]>([]);
  const lastScope = useRef(scope), lastKey = useRef(k);
  useEffect(() => {
    const sameScope = lastScope.current === scope, changed = lastKey.current !== k;
    lastScope.current = scope; lastKey.current = k;
    if (sameScope && changed && !reduceMotion()) { start.current = performance.now(); saved.current = []; }
  }, [k, scope]);
  useFrame(() => {
    const g = group.current;
    if (!g || start.current === null) return;
    // Capture each material's own emissive once (fittings of brass carry a faint warm emissive of their own).
    if (!saved.current.length) {
      g.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (m && 'emissive' in m && !saved.current.some((s) => s.mat === m)) saved.current.push({ mat: m, color: m.emissive.clone(), intensity: m.emissiveIntensity });
      });
    }
    const t = Math.min(1, (performance.now() - start.current) / MS);
    // Quick rise, long smooth cooling.
    const glow = t < RISE ? t / RISE : (1 - (t - RISE) / (1 - RISE)) ** 2.2;
    const tint = soft ? LIFT : EMBER, peak = soft ? 0.12 : 0.55;
    glowTo(saved.current, tint, peak, t >= 1 ? 0 : glow);
    if (t >= 1) { start.current = null; saved.current = []; }
  });
  return <group ref={group}>{children}</group>;
}
