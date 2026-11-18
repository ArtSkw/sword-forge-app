import * as THREE from 'three';
import { surface } from './surface';
import { unmadeSteels } from './steel';

// Every shader program the sword can ask for, built ahead of use. A part's material is made when the part first
// shows (a knob, a wire grip, pattern-welded steel) and disposed when the part is swapped out, its program with it;
// each time, the program was compiled on the main thread as it appeared (up to 230 ms on a fast laptop, 680 ms
// with a cold shader cache): a visible hitch on the click. Once the sword has faded in, these stand-in materials
// compile every program in the background (KHR_parallel_shader_compile), one at a time while the browser is idle,
// and stay alive for the session, so no program is ever dropped and no choice compiles again.
// The sword's own first materials compiled during its fade-in, while they were transparent: the programs here are
// the opaque ones that every later material asks for.

const GEO = new THREE.BufferGeometry();
GEO.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.001, 0, 0, 0, 0.001, 0], 3));
GEO.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
GEO.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2));
// The wood grip's program only needs to know it has a map; the grain itself loads when wood is chosen.
const MAP_STAND_IN = new THREE.Texture();

function standard(s: ReturnType<typeof surface> | null, params: THREE.MeshStandardMaterialParameters = {}) {
  const m = new THREE.MeshStandardMaterial(params);
  if (s) { m.onBeforeCompile = s.props.onBeforeCompile; m.customProgramCacheKey = s.props.customProgramCacheKey; }
  return m;
}

// Kept for the session: their programs stay referenced, so swapping parts never drops one.
const KEEP: THREE.Material[] = [];

function materials(): THREE.Material[] {
  // Roughly in the order people reach them: tones and finishes first, then grips, then the rarer parts.
  return [
    standard(surface('iron')), standard(surface('copper')),
    standard(surface('iron', undefined, undefined, { quiet: true })), standard(surface('copper', undefined, undefined, { quiet: true })),
    ...unmadeSteels(),
    standard(surface('leather', undefined, undefined, { wrap: 'strip' })), standard(surface('leather', undefined, undefined, { wrap: 'cord' })),
    standard(surface('wood'), { map: MAP_STAND_IN }),
    standard(surface('iron', undefined, undefined, { wrap: 'wire' })), standard(surface('copper', undefined, undefined, { wrap: 'wire' })),
    standard(surface('leather')), standard(null),
    standard(surface('iron', undefined, 'guard')), standard(surface('iron', undefined, 'pommel')),
  ];
}

const idle = () => new Promise<void>((resolve) => {
  if ('requestIdleCallback' in window) requestIdleCallback(() => resolve(), { timeout: 400 });
  else setTimeout(resolve, 60);
});

const warmed = new WeakSet<THREE.WebGLRenderer>();

/** Compiles every program in the background, once per renderer. `scene` lends its lights and environment. */
export async function warmPrograms(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
  if (warmed.has(gl)) return;
  warmed.add(gl);
  const mesh = new THREE.Mesh(GEO);
  for (const m of materials()) {
    await idle();
    if (gl.getContext().isContextLost()) return;
    KEEP.push(m);
    mesh.material = m;
    await gl.compileAsync(mesh, camera, scene);
  }
}
