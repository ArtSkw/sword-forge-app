import { useEffect, useRef, useSyncExternalStore } from 'react';
import { HEARTH, plateToScreen, readFire } from '../../lib/forgeFire';
import { LOW_TIER } from '../../lib/tier';
import { noise } from '../../lib/noise';
import { useConfigStore } from '../../store/configStore';

// Sparks rising from the hearth in the background plate. They live on a small 2D canvas over the hearth only,
// above the vignette and under the 3D scene (so the sword always covers them), and are drawn soft, as out of
// focus as the plate. Emission follows the fire in the video (readFire), the same curve that drives the key
// light: when the fire flares, a few sparks jump as the steel brightens.
// Units: plate heights (H), so everything scales with object-fit: cover. Times in seconds.

const ASPECT = 16 / 9;                 // the plate (background.mp4)
const EMBERS = {
  maxLive: LOW_TIER ? 6 : 10,
  rate: LOW_TIER ? 0.6 : 0.8,          // sparks per second at the fire's mean level (× level)
  stepHz: LOW_TIER ? 30 : 0,           // 0: simulate every frame
  coalBedShare: 0.75,                  // the rest leave the foot of the flame
  rise: [0.05, 0.12] as const,         // initial upward speed, H/s
  side: 0.015,                         // initial sideways speed, ± H/s
  drag: 0.55,                          // per second
  buoyancy: 0.012,                     // H/s², for the first part of life
  buoyantPart: 0.4,
  turbulence: { amp: 0.012, period: [0.6, 1.4] as const },
  life: [1.6, 4.2] as const,
  radius: 15,                          // px: σ = 7.5, close to the plate's blur(10px), so a spark is as out of focus
  peak: [0.15, 0.25] as const,
  // Per view: the sprite's draw scale and an alpha factor. The overview draws smaller sparks (σ 5.25 px, still
  // soft against the blurred plate; σ 4 read sharp); edit mode keeps the approved look (σ 7.5 at the canvas's
  // 60 % opacity). Eased across the switch with the canvas's 0.8 s opacity transition.
  view: { overview: { scale: 0.7, alpha: 1.1 }, edit: { scale: 1, alpha: 1 } },
  viewEase: 4,                         // per second
  fadeIn: 0.08,                        // s
  fadeOut: 0.45,                       // last share of life
  flicker: { depth: 0.2, hz: [8, 14] as const },
  cool: 0.15,                          // share of life spent going pale → orange; then orange → red
  tints: ['#FFD9A0', '#FF9A3C', '#C2410C'],
  levelEase: 12,                       // as ForgeLighting eases the same reading
  burst: { rise: 1.3, count: [1, 2] as const, window: 0.12, refractory: 0.7, synthetic: [4, 9] as const },
  editOpacity: 0.6,
  maxBacking: 700,                     // px, longest side of the canvas's backing store
};

// Dev only: ?embers=debug draws the emitters and the canvas's edge and logs the tick time; ?embers=stats only logs.
const DEV_FLAG = import.meta.env.DEV ? new URLSearchParams(location.search).get('embers') : null;
const DEBUG = DEV_FLAG === 'debug' || DEV_FLAG === 'stats';
const DRAW_EMITTERS = DEV_FLAG === 'debug';

const rnd = (r: readonly [number, number]) => r[0] + Math.random() * (r[1] - r[0]);

/** A Gaussian disc of radius r (σ = r/2, drawn out to 1.5 r where it has faded to ~1 %), pre-tinted, drawn once. */
function sprite(r: number, tint: string) {
  const c = document.createElement('canvas'), reach = r * 1.5, s = Math.ceil(reach) * 2 + 2;
  c.width = c.height = s;
  const g = c.getContext('2d')!, grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, reach);
  const [R, G, B] = [1, 3, 5].map((i) => parseInt(tint.slice(i, i + 2), 16));
  for (let k = 0; k <= 10; k++) {
    const d = (k / 10) * reach / (r / 2);    // distance in σ
    grad.addColorStop(k / 10, `rgba(${R},${G},${B},${k === 10 ? 0 : Math.exp(-0.5 * d * d).toFixed(3)})`);
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  return c;
}

const reducedQuery = typeof window !== 'undefined' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
const subscribeReduced = (cb: () => void) => { reducedQuery?.addEventListener('change', cb); return () => reducedQuery?.removeEventListener('change', cb); };
const getReduced = () => !!reducedQuery?.matches;

export function Embers() {
  const reduced = useSyncExternalStore(subscribeReduced, getReduced, () => true);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true })!;
    const E = EMBERS, N = E.maxLive;
    const sprites = E.tints.map((t) => sprite(E.radius, t)), full = sprites[0].width;

    // The pool: fixed typed arrays, live particles packed at the front (swap-remove).
    const px = new Float32Array(N), py = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N);
    const age = new Float32Array(N), life = new Float32Array(N), peak = new Float32Array(N);
    const seed = new Float32Array(N), period = new Float32Array(N), hz = new Float32Array(N);
    let live = 0;

    // Layout (on resize): the plate's origin and height, and the canvas = hearth region ∩ viewport.
    const L = { ox: 0, oy: 0, H: 1, x: 0, y: 0, w: 0, h: 0, scale: 1, onScreen: false };
    const layout = () => {
      const vw = window.innerWidth, vh = window.innerHeight;
      const o = plateToScreen(0, 0, vw, vh, ASPECT);
      L.ox = o.x; L.oy = o.y; L.H = o.H;
      const r = HEARTH.region, W = o.H * ASPECT;
      const x0 = Math.max(0, o.x + r.u0 * W), x1 = Math.min(vw, o.x + r.u1 * W);
      const y0 = Math.max(0, o.y + r.v0 * o.H), y1 = Math.min(vh, o.y + r.v1 * o.H);
      // Idle when no emitter is on screen (narrow screens push the hearth past the left edge).
      const xs = [HEARTH.coalBed.u0, HEARTH.coalBed.u1, HEARTH.flameFoot.u].map((u) => o.x + u * W);
      L.onScreen = x1 > x0 && y1 > y0 && Math.max(...xs) > 0 && Math.min(...xs) < vw;
      L.x = x0; L.y = y0; L.w = Math.max(0, x1 - x0); L.h = Math.max(0, y1 - y0);
      L.scale = Math.min(1, E.maxBacking / Math.max(1, L.w, L.h));
      canvas.width = Math.max(1, Math.round(L.w * L.scale));
      canvas.height = Math.max(1, Math.round(L.h * L.scale));
      Object.assign(canvas.style, { left: `${x0}px`, top: `${y0}px`, width: `${L.w}px`, height: `${L.h}px` });
    };

    const spawn = () => {
      if (live >= N) return;
      const i = live++;
      let u: number, v: number;
      if (Math.random() < E.coalBedShare) {
        const t = Math.random(), c = HEARTH.coalBed;
        u = c.u0 + (c.u1 - c.u0) * t; v = c.v0 + (c.v1 - c.v0) * t;
      } else {
        const f = HEARTH.flameFoot;
        u = f.u + (Math.random() * 2 - 1) * f.spread; v = f.v + (Math.random() * 2 - 1) * f.spread;
      }
      px[i] = u * ASPECT; py[i] = v;
      vy[i] = rnd(E.rise);
      vx[i] = (Math.random() * 2 - 1) * E.side;
      age[i] = 0;
      life[i] = rnd(E.life);
      peak[i] = rnd(E.peak);
      seed[i] = Math.floor(Math.random() * 100000);
      period[i] = rnd(E.turbulence.period);
      hz[i] = rnd(E.flicker.hz);
    };
    const kill = (i: number) => {
      const j = --live;
      px[i] = px[j]; py[i] = py[j]; vx[i] = vx[j]; vy[i] = vy[j]; age[i] = age[j]; life[i] = life[j];
      peak[i] = peak[j]; seed[i] = seed[j]; period[i] = period[j]; hz[i] = hz[j];
    };

    // Emission state.
    const S = { acc: 0, level: 1, burstLeft: 0, burstGap: 0, burstClock: 0, sinceBurst: 9, nextSynthetic: rnd(E.burst.synthetic), scale: 1, alpha: 1 };
    const burst = () => {
      S.burstLeft = Math.round(rnd([E.burst.count[0], E.burst.count[1] + 0.49]));
      S.burstGap = E.burst.window / S.burstLeft; S.burstClock = S.burstGap; S.sinceBurst = 0;
    };

    const step = (dt: number) => {
      // The fire now, eased as the light eases it; a sharp rise is a flare.
      const target = LOW_TIER ? 1 : readFire().level, prev = S.level;
      S.level += (target - S.level) * Math.min(1, dt * E.levelEase);
      S.sinceBurst += dt;
      const view = editing ? E.view.edit : E.view.overview, k = Math.min(1, dt * E.viewEase);
      S.scale += (view.scale - S.scale) * k; S.alpha += (view.alpha - S.alpha) * k;
      if (LOW_TIER) {
        if ((S.nextSynthetic -= dt) <= 0) { burst(); S.nextSynthetic = rnd(E.burst.synthetic); }
      } else if (dt > 0 && (S.level - prev) / dt > E.burst.rise && S.sinceBurst > E.burst.refractory) burst();
      S.acc += E.rate * S.level * dt;
      while (S.acc >= 1) { S.acc -= 1; spawn(); }
      if (S.burstLeft > 0 && (S.burstClock += dt) >= S.burstGap) { S.burstClock = 0; S.burstLeft--; spawn(); }

      const dragK = Math.exp(-E.drag * dt), amp = E.turbulence.amp;
      for (let i = live - 1; i >= 0; i--) {
        const a = (age[i] += dt);
        if (a >= life[i]) { kill(i); continue; }
        const n = a / period[i] + seed[i];
        vx[i] *= dragK;
        vy[i] = vy[i] * dragK + (a < life[i] * E.buoyantPart ? E.buoyancy * dt : 0);
        px[i] += (vx[i] + amp * (noise(n) * 2 - 1)) * dt;
        py[i] -= (vy[i] + amp * 0.6 * (noise(n + 517) * 2 - 1)) * dt;
      }
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const k = L.scale, size = full * S.scale, half = size / 2;
      ctx.setTransform(k, 0, 0, k, -L.x * k, -L.y * k);     // draw in viewport CSS px
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < live; i++) {
        const a = age[i], f = a / life[i];
        let alpha = Math.min(1, a / E.fadeIn);
        if (f > 1 - E.fadeOut) alpha *= ((1 - f) / E.fadeOut) ** 2;
        alpha *= peak[i] * S.alpha * (1 + E.flicker.depth * (noise(a * hz[i] + seed[i] + 1031) * 2 - 1));
        const sx = L.ox + px[i] * L.H - half, sy = L.oy + py[i] * L.H - half;
        if (sx < L.x - 2 * half || sx > L.x + L.w || sy < L.y - 2 * half || sy > L.y + L.h) continue;
        // Cooling: pale → orange over the first part of life, then orange → dull red.
        const hot = f < E.cool, t = hot ? f / E.cool : (f - E.cool) / (1 - E.cool);
        const A = hot ? sprites[0] : sprites[1], B = hot ? sprites[1] : sprites[2];
        ctx.globalAlpha = alpha * (1 - t); ctx.drawImage(A, sx, sy, size, size);
        ctx.globalAlpha = alpha * t; ctx.drawImage(B, sx, sy, size, size);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      if (DRAW_EMITTERS) drawDebug();
    };

    const drawDebug = () => {
      const W = L.H * ASPECT, at = (u: number, v: number) => [L.ox + u * W, L.oy + v * L.H] as const;
      ctx.lineWidth = 2; ctx.strokeStyle = '#00e5ff';
      const c = HEARTH.coalBed, a = at(c.u0, c.v0), b = at(c.u1, c.v1);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      const p = HEARTH.flameFoot, [x, y] = at(p.u, p.v);
      ctx.strokeStyle = '#7CFF4F';
      ctx.strokeRect(x - p.spread * W, y - p.spread * L.H, p.spread * W * 2, p.spread * L.H * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.strokeRect(L.x + 1, L.y + 1, L.w - 2, L.h - 2);
    };

    // Dev stats (?embers=debug): mean and max tick time, most particles alive at once.
    const stats = { frames: 0, total: 0, max: 0, maxLive: 0, windowStart: performance.now() };
    if (DEBUG) (window as unknown as { __embers: typeof stats }).__embers = stats;

    // The loop: runs only while the tab is visible, the hearth is on screen and History & use is closed.
    let raf = 0, last = 0, stepAcc = 0, reading = false, editing: boolean | null = null;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const t0 = DEBUG ? performance.now() : 0;
      const dt = Math.min(0.1, (now - (last || now)) / 1000);
      last = now;
      if (E.stepHz) {
        stepAcc += dt;
        if (stepAcc < 1 / E.stepHz - 0.002) return;   // tolerance: two 60 Hz frames make one 30 Hz step
        step(Math.min(0.1, stepAcc)); stepAcc = 0;
      } else step(dt);
      draw();
      if (DEBUG) {
        const ms = performance.now() - t0;
        stats.frames++; stats.total += ms; stats.max = Math.max(stats.max, ms); stats.maxLive = Math.max(stats.maxLive, live);
        if (now - stats.windowStart > 5000) {
          console.info(`[embers] mean tick ${(stats.total / stats.frames).toFixed(3)} ms, max ${stats.max.toFixed(3)} ms, ${stats.frames} frames, most alive ${stats.maxLive}/${N}`);
          stats.windowStart = now;
        }
      }
    };
    const update = () => {
      const run = !document.hidden && !reading && L.onScreen;
      if (run && !raf) { last = 0; raf = requestAnimationFrame(frame); }
      if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
      if (!L.onScreen) { live = 0; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); }
    };
    // Store changes (Age drags included) touch the canvas only when reading or edit mode actually flips.
    const applyMode = (s: { station: unknown; reading: boolean }) => {
      const edit = s.station !== null;
      if (s.reading === reading && edit === editing) return;
      if (editing === null) { const v = edit ? E.view.edit : E.view.overview; S.scale = v.scale; S.alpha = v.alpha; }   // no ease at mount
      reading = s.reading; editing = edit;
      canvas.style.opacity = String(reading ? 0 : edit ? E.editOpacity : 1);
      update();
    };
    const onResize = () => { layout(); update(); if (!raf) draw(); };

    layout();
    applyMode(useConfigStore.getState());
    const unsub = useConfigStore.subscribe(applyMode);
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', update);
    return () => {
      unsub();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', update);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  if (reduced) return null;
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      // No z-index: painted above the vignette (body::after, z −1) and under the 3D scene, which follows it.
      style={{ position: 'fixed', left: 0, top: 0, width: 0, height: 0, pointerEvents: 'none', transition: 'opacity 0.8s ease' }}
    />
  );
}
