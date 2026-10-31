import { useEffect, useState, type ComponentType } from 'react';
import { AppShell } from './components/ui/AppShell';

// The 3D scene (three/R3F/drei) is the bulk of the bundle. Start fetching it at
// boot so the entry screen paints first; it is ready long before the user clicks in.
// No React.lazy/<Suspense> on purpose: drei's <Environment> suspends inside the
// Canvas, and an outer Suspense boundary makes R3F unmount its root and force a
// WebGL context loss under StrictMode.
const scenePromise = import('./components/scene/Scene');

export default function App() {
  const [Scene, setScene] = useState<ComponentType | null>(null);

  useEffect(() => {
    let active = true;
    scenePromise.then((m) => {
      if (active) setScene(() => m.Scene);
    });
    return () => {
      active = false;
    };
  }, []);

  return <AppShell>{Scene && <Scene />}</AppShell>;
}
