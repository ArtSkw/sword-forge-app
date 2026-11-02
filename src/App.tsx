import { useEffect, useState, type ComponentType } from 'react';
import { AppShell } from './components/ui/AppShell';
import { SceneBoundary } from './components/ui/SceneBoundary';

// The 3D scene (three/R3F/drei) is the bulk of the bundle. Start fetching it at
// boot so the entry screen paints first; it is ready long before the user clicks in.
// No React.lazy/<Suspense> on purpose: drei's <Environment> suspends inside the
// Canvas, and an outer Suspense boundary makes R3F unmount its root and force a
// WebGL context loss under StrictMode.
// After a new deploy, a page loaded from the cache may ask for a scene chunk that no longer exists: reload
// once to fetch the new build (a flag stops a reload loop).
const scenePromise = import('./components/scene/Scene').catch((err) => {
  let reloaded = false;
  try { reloaded = sessionStorage.getItem('scene-reload') === '1'; sessionStorage.setItem('scene-reload', '1'); } catch { /* storage blocked */ }
  if (!reloaded) location.reload();
  throw err;
});

export default function App() {
  const [Scene, setScene] = useState<ComponentType | null>(null);

  useEffect(() => {
    let active = true;
    scenePromise.then((m) => {
      try { sessionStorage.removeItem('scene-reload'); } catch { /* storage blocked */ }
      if (active) setScene(() => m.Scene);
    }).catch(() => { /* reloading, or the boundary below shows nothing to draw */ });
    return () => {
      active = false;
    };
  }, []);

  return <AppShell>{Scene && <SceneBoundary><Scene /></SceneBoundary>}</AppShell>;
}
