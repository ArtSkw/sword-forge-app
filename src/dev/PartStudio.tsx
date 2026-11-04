import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Sword, type SwordPart } from '../components/scene/Sword';
import { Lighting } from '../components/scene/Lighting';
import { useConfigStore } from '../store/configStore';
import { GUARDS_BY_TYPE } from '../presets/guardShapes';
import { GRIPS, MESSER_CAPS, POMMELS, STEELS } from '../presets/forge';
import { profileBlade, profilesOf } from '../lib/forms';
import { bladeSpec } from '../lib/bladeSpec';

// Dev only (?studio): one part of the sword alone on a transparent background, framed to fill the view,
// for rendering the part-option cards. Driven from the console / CDP through window.__studio.
// The guard tilts about its own bar first (Euler ZYX), so its curve in plan reads; long parts run on the
// diagonal of the type cards, the hilt end to the upper right.
const VIEW: Record<SwordPart, [number, number, number]> = {
  guard: [0.95, 0, 0.62], pommel: [0.22, -0.55, -0.18], grip: [0.15, -0.35, 3 * Math.PI / 4], blade: [0.45, 0, 3 * Math.PI / 4],
};
// A blade is up to ~30× longer than wide; on a square card its outline is widened so the profile reads,
// narrow blades more than broad ones (shown width/length ≈ 0.38·r^0.4), so the order of widths is kept.
function bladeStretch(width: number, length: number): [number, number, number] {
  const r = width / length, s = Math.min(3, Math.max(1, 0.38 * r ** 0.4 / r));
  return [s, 1, 1 + (s - 1) * 0.15];
}

function Framed({ part, tick }: { part: SwordPart; tick: number }) {
  const spec = bladeSpec(useConfigStore((s) => s.config));
  const holder = useRef<THREE.Group>(null), inner = useRef<THREE.Group>(null);
  const { camera, invalidate } = useThree();
  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => {
      const h = holder.current, g = inner.current; if (!h || !g) return;
      g.position.set(0, 0, 0); h.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
      g.position.sub(c.clone().applyMatrix4(h.matrixWorld.clone().invert()));
      const r = Math.max(size.x, size.y) / 2 * 1.08, fov = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov / 2);
      camera.position.set(0, 0, r / Math.tan(fov) + size.z); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
      invalidate();
    });
    return () => cancelAnimationFrame(id);
  });
  return (
    <group ref={holder} rotation={new THREE.Euler(...((window as unknown as { __view?: Record<string, [number, number, number]> }).__view?.[part] ?? VIEW[part]), part === 'guard' ? 'ZYX' : 'XYZ')}>
      <group ref={inner} key={tick}><group scale={part === 'blade' ? bladeStretch(spec.halfWidth * 2, spec.length) : [1, 1, 1]}><Sword only={part} /></group></group>
    </group>
  );
}

export default function PartStudio() {
  const [part, setPart] = useState<SwordPart>('guard');
  const [tick, setTick] = useState(0);
  useEffect(() => { Object.assign(window, { __studio: { setPart, store: useConfigStore, refit: () => setTick((t) => t + 1), lib: { GUARDS_BY_TYPE, POMMELS, STEELS, GRIPS, MESSER_CAPS, profilesOf, profileBlade } } }); }, []);
  return (
    <Canvas gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }} dpr={2} camera={{ fov: 22, position: [0, 0, 1] }}
      style={{ position: 'fixed', inset: 0, background: 'transparent' }}>
      <Environment files={`${import.meta.env.BASE_URL}hdri/studio_small_03_2k.hdr`} environmentIntensity={1.18} />
      <Lighting inspect />
      <Framed part={part} tick={tick} />
    </Canvas>
  );
}
