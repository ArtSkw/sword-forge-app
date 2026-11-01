import { useEffect, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';

// Assembly beat: when a part is swapped (its key changes), it slides onto the sword from `from`
// (and may turn by `spin`, like a pommel screwed onto the tang), settling with a small overshoot in time
// with the forge strike. Silent on first mount and with reduced motion.

const MS = 420;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// Ease out with a slight overshoot, as a part seats home.
const easeOutBack = (x: number) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };

// `scope` (the sword type): a new type arrives whole, so a change of scope never plays a beat.
export function Beat({ k, scope, from, spin = 0, children }: { k: string; scope: string; from: [number, number, number]; spin?: number; children: ReactNode }) {
  const group = useRef<Group>(null);
  const start = useRef<number | null>(null);
  const lastScope = useRef(scope), lastKey = useRef(k);
  useEffect(() => {
    const sameScope = lastScope.current === scope, changed = lastKey.current !== k;
    lastScope.current = scope; lastKey.current = k;
    if (sameScope && changed && !reduceMotion()) start.current = performance.now();
  }, [k, scope]);
  useFrame(() => {
    const g = group.current;
    if (!g || start.current === null) return;
    const t = Math.min(1, (performance.now() - start.current) / MS), left = 1 - easeOutBack(t);
    g.position.set(from[0] * left, from[1] * left, from[2] * left);
    g.rotation.y = spin * left;
    if (t >= 1) { start.current = null; g.position.set(0, 0, 0); g.rotation.y = 0; }
  });
  return <group ref={group}>{children}</group>;
}
