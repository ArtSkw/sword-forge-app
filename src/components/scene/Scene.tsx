import { useRef, useState, useCallback, useEffect, useMemo, type ComponentRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Sword } from './Sword';
import { warmPrograms } from './warmPrograms';
import { setScreenshotSource } from '../../lib/screenshot';
import { createGovernor, resolutionLadder } from '../../lib/quality';
import { getSwordLayout } from './swordLayout';
import { ForgeLighting } from './ForgeLighting';
import { useConfigStore } from '../../store/configStore';
import { useViewportSize } from '../../hooks/useViewportSize';
import { anchors, interaction, publishAnchors } from '../../lib/anchors';
import { STATIONS, type StationId } from '../../presets/forge';
import { HILT_OPTIONS } from '../../lib/hilt';
import type { ArchetypeKey } from '../../store/configStore';

// R3F (9.8 included) still makes a THREE.Clock for every <Canvas>, which three r183+ reports as deprecated on each
// load. That one notice is not ours to fix; every other three.js message still reaches the console.
THREE.setConsoleFunction((type: 'log' | 'warn' | 'error', message: string, ...params: unknown[]) => {
  if (type === 'warn' && message.startsWith('THREE.Clock:')) return;
  console[type](message, ...params);
});

// Camera sits at ~65° polar (above + side) for a presentation-angle view.
const CAMERA_POSITION: [number, number, number] = [1.32, 1.1, 2.2];
const OVERVIEW_DISTANCE = Math.hypot(...CAMERA_POSITION);

const MIN_POLAR = Math.PI * 0.10;
const MAX_POLAR = Math.PI * 0.85;
const AUTO_ROTATE_RESUME_MS = 10000;
const SWORD_INTRO_DELAY = 2.6;
const SWORD_INTRO_DURATION = 1.2;
const WARM_DELAY_MS = 600;
// Frames the contact shadow keeps drawing after a re-render (~2 s at 60 fps: covers the intro and a part's swap).
const SHADOW_FRAMES = 120;
// Render resolution: at most 2× (a phone's 3× costs more than it shows), stepping down when the frame rate cannot
// hold 60 fps and back up when it can (lib/quality.ts). The first seconds (loading, the sword's fade-in) do not count.
const LADDER = resolutionLadder(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
const GOVERN_AFTER_MS = 5000;
const SWORD_ROTATION: [number, number, number] = [0.08, 0, -0.80];

// Edit mode: how close the camera comes to each hilt part (Blade and Finish are fitted, see below),
// and the radius each close-up must keep in view, so narrow screens back off instead of cropping.
const FOCUS_DISTANCE: Record<'guard' | 'grip' | 'pommel', number> = { guard: 0.85, grip: 0.8, pommel: 0.6 };
const FOCUS_RADIUS: Record<'guard' | 'grip' | 'pommel', number> = { guard: 0.15, grip: 0.12, pommel: 0.09 };
// Finish frames the whole sword; Blade frames the blade with the guard. Both fit the free area, never past its edges.
// A portrait phone's free area is about square, so with the sword on its diagonal the blade can only be shown ~1.2×
// larger than the whole sword: there Blade frames the blade alone, and Finish keeps some air, so the step between
// them reads as a close-up.
const FIT_FILL_FINISH = 1.0, FIT_FILL_FINISH_PHONE = 0.88, FIT_FILL_BLADE = 0.94, FIT_FILL_BLADE_PHONE = 0.96;
// Blade's shot reaches this far below the guard's centre, as a share of the way to the grip's centre (0–1): on wide
// screens the top of the grip. On phones, parts centred above this point join the blade's box: the guard, not the grip.
const BLADE_HILT = 0.7, BLADE_HILT_PHONE = 0.5;
// Overview: the whole sword must fit at any turn of the orbit, between the title and the sword types.
const OVERVIEW_FILL = 0.92;
const REFIT_MS = 450;
const FINISH_DROP = 36;          // px: Finish sits this much below the free area's centre
const BLADE_NUDGE = { x: 96, y: 12 };   // px: Blade sits this much right of and above the centre (beside the inspector)
// Screen space taken by the edit panels: inspector on the right, variant row + nav at the bottom.
const PANEL_RIGHT = 320, PANEL_BOTTOM = 220, MARGIN_TOP = 56;
type Panels = { top: number; bottom: number; right: number };
// Must match forge.css: on phones (≤ 700 px) the type row is smaller, and in edit mode a sheet at the bottom
// holds the choices (see PhoneSheet). A phone on its side (≤ 500 px tall, landscape) also edits in the sheet, docked
// to the right (as wide as SIDE_SHEET), with the sword framed on the left.
const PHONE = 700;
const sideSheet = (w: number, h: number) => h <= 500 && w > h;
const SIDE_SHEET = (w: number) => Math.min(w * 0.46, 380) + 16;   // forge.css: min(46vw, 380px) + its 8 px margins
// The bottom inset clears the row of type cards (100 px tall; 0.9× on phones).
const overviewPanels = (w: number): Panels => ({ top: 110, bottom: w <= PHONE ? 136 : 148, right: 0 });
// The phone sheet's height (set from the store before each framing; the bar with Done sits below it).
let phoneSheetPx = 200;
const editPanels = (w: number, h: number): Panels => (sideSheet(w, h) ? { top: 12, bottom: 12, right: SIDE_SHEET(w) }
  : w <= PHONE ? { top: Math.round(h * 0.03), bottom: phoneSheetPx + 80, right: 0 } : { top: MARGIN_TOP, bottom: PANEL_BOTTOM, right: PANEL_RIGHT });
const PART_SHIFT_Y = 0.07;       // hilt parts: a little above centre (they're small; centred in the free space looked low)
const FOV = 35;
const READING_SHIFT = -0.17;   // sword moves right while the historical account is open
const FOCUS_MS = 650;
const OVERVIEW_MS = 650;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
// The current frame's time: the same for every callback in a frame and paced by the display (the document timeline
// advances once per frame). performance.now() read inside a callback drifts by however long the work before it took.
const frameTime = () => { const t = document.timeline?.currentTime; return typeof t === 'number' ? t : performance.now(); };

function useShadowY() {
  const config = useConfigStore((s) => s.config);
  return -(getSwordLayout(config).total / 2) - 0.05;
}

// Local Y of each station's anchor on the sword (sword space, before the presentation tilt).
function anchorY(id: StationId, layout: ReturnType<typeof getSwordLayout>) {
  switch (id) {
    case 'blade': return layout.tipY - layout.bladeLen * 0.42;
    case 'guard': return layout.guardY;
    case 'grip': return layout.gripY;
    case 'pommel': return layout.pommelY;
    case 'finish': return layout.tipY - layout.bladeLen * 0.16;
  }
}

// Edit mode looks straight at the blade's flat (its local +Z), so the sword lies flat in the screen
// at its usual diagonal, with no twist.
const FLAT_NORMAL = new THREE.Vector3(0, 0, 1), SWORD_AXIS = new THREE.Vector3(0, 1, 0);
// Where a station's choices differ only in depth (a second side ring right behind the first, the estoc's three- or
// four-sided blade), that station's shot on the types that offer them turns about the sword's own axis by this
// much, so the far side shows. Set per station and type, so picking an option never moves the camera.
const DEPTH_TURN = THREE.MathUtils.degToRad(40);
const stationTurn = (station: StationId | null, archetype: ArchetypeKey) =>
  (station === 'guard' && HILT_OPTIONS[archetype].rings) || (station === 'blade' && archetype === 'estoc') ? DEPTH_TURN : 0;
const WORLD_UP = new THREE.Vector3(0, 1, 0);

// Distance at which the whole sword fits the free area of the screen, seen from `viewDir`
// (unit vector from the target to the camera): the sword's axis is projected onto the screen axes.
function fitDistance(axis: THREE.Vector3, viewDir: THREE.Vector3, w: number, h: number, fill: number, panels: Panels = editPanels(w, h)) {
  const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const right = new THREE.Vector3().crossVectors(WORLD_UP, viewDir).normalize();
  const up = new THREE.Vector3().crossVectors(viewDir, right);
  const pad = 0.06;   // guard width and pommel
  const ex = Math.abs(axis.dot(right)) + pad, ey = Math.abs(axis.dot(up)) + pad;
  const freeH = Math.max(0.3, (h - panels.bottom - panels.top) / h), freeW = Math.max(0.3, (w - panels.right) / w);
  return Math.max(ey / (2 * tan * freeH * fill), ex / (2 * tan * (w / h) * freeW * fill));
}

// The phone's Blade shot: the blade and its guard as drawn (every mesh centred above `fromY`), boxed in the
// sword's own space. Its centre is the shot's target; the distance fits its corners as seen from `viewDir`. Measured
// rather than taken from the layout, so a long, curved or ringed guard stays inside the frame on every type.
const _box = new THREE.Box3(), _all = new THREE.Box3(), _toLocal = new THREE.Matrix4(), _m = new THREE.Matrix4(), _p = new THREE.Vector3();
function bladeShot(group: THREE.Object3D, fromY: number, viewDir: THREE.Vector3, w: number, h: number, fill: number) {
  _toLocal.copy(group.matrixWorld).invert(); _all.makeEmpty();
  group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    _box.copy(mesh.geometry.boundingBox!).applyMatrix4(_m.multiplyMatrices(_toLocal, mesh.matrixWorld));
    if ((_box.min.y + _box.max.y) / 2 > fromY) _all.union(_box);
  });
  const target = _all.getCenter(new THREE.Vector3()).applyMatrix4(group.matrixWorld);
  const right = new THREE.Vector3().crossVectors(WORLD_UP, viewDir).normalize(), up = new THREE.Vector3().crossVectors(viewDir, right);
  let hx = 0, hy = 0;
  for (let i = 0; i < 8; i++) {
    _p.set(i & 1 ? _all.max.x : _all.min.x, i & 2 ? _all.max.y : _all.min.y, i & 4 ? _all.max.z : _all.min.z).applyMatrix4(group.matrixWorld).sub(target);
    hx = Math.max(hx, Math.abs(_p.dot(right))); hy = Math.max(hy, Math.abs(_p.dot(up)));
  }
  const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2)), p = editPanels(w, h);
  const freeH = Math.max(0.3, (h - p.bottom - p.top) / h), freeW = Math.max(0.3, (w - p.right) / w);
  return { target, dist: Math.max(hy / (tan * freeH * fill), hx / (tan * (w / h) * freeW * fill)) };
}

// Overview: the largest fit over a full turn of the orbit at the camera's current elevation.
function overviewFit(axis: THREE.Vector3, phi: number, w: number, h: number) {
  const sph = new THREE.Spherical(1, phi, 0), v = new THREE.Vector3();
  let d = 0;
  for (let k = 0; k < 16; k++) { sph.theta = (k / 16) * Math.PI * 2; d = Math.max(d, fitDistance(axis, v.setFromSpherical(sph), w, h, OVERVIEW_FILL, overviewPanels(w))); }
  return d;
}

// Hilt close-ups: no closer than keeps the part's radius inside the free area.
function partFit(radius: number, w: number, h: number) {
  const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const p = editPanels(w, h), freeH = Math.max(0.3, (h - p.bottom - p.top) / h), freeW = Math.max(0.3, (w - p.right) / w);
  return radius / (tan * Math.min(freeH, freeW * (w / h)));
}

function SceneContents() {
  const [autoRotate, setAutoRotate] = useState(true);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orbitRef  = useRef<ComponentRef<typeof OrbitControls>>(null);
  const shadowY   = useShadowY();
  const config = useConfigStore((s) => s.config);
  const viewResetTick = useConfigStore((s) => s.viewResetTick);
  const station = useConfigStore((s) => s.station);
  const reading = useConfigStore((s) => s.reading);
  const { camera, size } = useThree();
  const swordGroupRef = useRef<THREE.Group>(null);
  const introRef = useRef({ done: false });

  // Camera move state: from/to target, distance and view shift, interpolated in useFrame.
  const move = useRef({ t0: 0, ms: 0, fromTarget: new THREE.Vector3(), toTarget: new THREE.Vector3(), fromDist: OVERVIEW_DISTANCE, toDist: OVERVIEW_DISTANCE, fromShift: 0, toShift: 0, shift: 0, fromShiftY: 0, toShiftY: 0, shiftY: 0, fromSph: new THREE.Spherical(), toSph: new THREE.Spherical(), turn: false, active: false });

  // Framing follows the screen size and the sword's length: a longer blade or a smaller screen re-fits.
  const sheetPx = useConfigStore((s) => s.sheetPx);
  const sizeKey = `${size.width}x${size.height}x${size.width <= PHONE && !sideSheet(size.width, size.height) ? sheetPx : 0}`;
  const fitLayout = getSwordLayout(config);
  const geoKey = `${fitLayout.total.toFixed(3)}|${fitLayout.bladeLen.toFixed(3)}`;
  const dir = useRef(new THREE.Vector3());
  const motionReduced = useRef(reducedMotion());
  const turn = stationTurn(station, config.archetype);
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)'), on = () => { motionReduced.current = mq.matches; };
    mq.addEventListener('change', on); return () => mq.removeEventListener('change', on);
  }, []);
  const autoRotateOn = useRef(false);
  useEffect(() => { autoRotateOn.current = autoRotate && station === null && !reading && !motionReduced.current; });
  const lastFramed = useRef<{ station: StationId | null; reading: boolean; reframe: number; geo: string; sheet: number } | null>(null);
  // Edit mode can be turned by hand; a double-click glides back to the part's shot.
  const [reframe, setReframe] = useState(0);
  // Re-frame triggers: double-click (edit mode) or Reset view. In the overview the reset effect below runs
  // first (it is declared first), then the framing effect makes sure the reset view still fits.
  const again = reframe + viewResetTick;
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const el = gl.domElement, onDouble = () => { if (useConfigStore.getState().station) setReframe((n) => n + 1); };
    el.addEventListener('dblclick', onDouble);
    return () => el.removeEventListener('dblclick', onDouble);
  }, [gl]);

  // Reset view: in edit mode, back to the part's shot; otherwise the orbit camera returns to the presentation angle.
  useEffect(() => {
    if (!orbitRef.current) return;
    if (useConfigStore.getState().station) return;   // edit mode: the framing effect below re-frames
    orbitRef.current.reset();
    move.current.active = false; move.current.shift = 0; move.current.shiftY = 0;
    if (timerRef.current) clearTimeout(timerRef.current);
    const frame = requestAnimationFrame(() => setAutoRotate(true));
    return () => cancelAnimationFrame(frame);
  }, [viewResetTick]);

  // Restart auto-rotate when archetype changes
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const frame = requestAnimationFrame(() => setAutoRotate(true));
    return () => cancelAnimationFrame(frame);
  }, [config.archetype]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Glide to the chosen part (or back to the whole sword) whenever the station or reading changes.
  // Inside the same view, a change of size or of the sword's length re-fits it: target and distance
  // settle, the direction the user is looking from is kept. The overview only ever backs off to fit.
  useEffect(() => {
    const controls = orbitRef.current, group = swordGroupRef.current;
    if (!controls || !group) return;
    group.updateWorldMatrix(true, false);
    phoneSheetPx = sheetPx;
    const m = move.current, w = size.width, h = size.height;
    // Below 1180 px History & use covers the screen and the sword fades out behind it, so opening or closing
    // it does not move the camera: the sword fades back exactly where it was.
    const readingView = reading && w >= 1180;
    const last = lastFramed.current;
    const refit = last?.station === station && last?.reading === readingView && last?.reframe === again;
    // A change of the phone sheet's height glides like a refit; only a resize of the screen snaps.
    const resizeOnly = refit && last?.geo === geoKey && last?.sheet === sheetPx;
    lastFramed.current = { station, reading: readingView, reframe: again, geo: geoKey, sheet: sheetPx };
    m.fromTarget.copy(controls.target);
    m.fromDist = camera.position.distanceTo(controls.target);
    m.fromShift = m.shift; m.fromShiftY = m.shiftY;
    // Turn to face the blade's flat by azimuth (shorter way round) and elevation, never through the pole.
    // Leaving edit mode, or re-fitting, keeps the current direction.
    m.turn = station !== null && !refit;
    m.fromSph.setFromVector3(dir.current.subVectors(camera.position, controls.target));
    const faceDir = new THREE.Vector3().copy(FLAT_NORMAL).applyAxisAngle(SWORD_AXIS, turn).transformDirection(group.matrixWorld);
    m.toSph.setFromVector3(faceDir);
    m.toSph.theta = m.fromSph.theta + Math.atan2(Math.sin(m.toSph.theta - m.fromSph.theta), Math.cos(m.toSph.theta - m.fromSph.theta));
    const layout = getSwordLayout(config);
    const axisOf = (len: number) => new THREE.Vector3(0, 1, 0).transformDirection(group.matrixWorld).multiplyScalar(len);
    if (station) {
      const panels = editPanels(w, h);
      m.toShift = (panels.right / 2) / w;
      if (station === 'blade' || station === 'finish') {
        // Blade frames the blade with the guard (and on wide screens the top of the grip), so the shot shows where the
        // blade springs from and the guard never sits on the screen's edge.
        // Phones, upright or on their side, have little room: their own fills, and no drop or nudge on the side sheet.
        const side = sideSheet(w, h), phone = w <= PHONE || side;
        const blade = station === 'blade', bladeLo = layout.guardY - (layout.guardY - layout.gripY) * BLADE_HILT;
        const len = blade ? layout.tipY - bladeLo : layout.total;
        m.toTarget.set(0, blade ? (layout.tipY + bladeLo) / 2 : 0, 0).applyMatrix4(group.matrixWorld);
        // Always fitted as seen in the part's own shot (the blade's flat), even when the user has turned the
        // sword: fitting the turned view would zoom right in whenever the blade points at the camera.
        m.toDist = fitDistance(axisOf(len), faceDir, w, h, blade ? FIT_FILL_BLADE : phone ? FIT_FILL_FINISH_PHONE : FIT_FILL_FINISH);
        if (blade && phone) {
          const shot = bladeShot(group, layout.guardY - (layout.guardY - layout.gripY) * BLADE_HILT_PHONE, faceDir, w, h, FIT_FILL_BLADE_PHONE);
          m.toTarget.copy(shot.target); m.toDist = shot.dist;
        }
        // Centred in the free area; Finish sits a little lower than that.
        m.toShiftY = ((panels.bottom - panels.top) / 2 + (side ? 0 : blade ? BLADE_NUDGE.y : -FINISH_DROP)) / h;
        if (blade && panels.right && !side) m.toShift -= BLADE_NUDGE.x / w;
      } else {
        const part = station as keyof typeof FOCUS_DISTANCE;
        m.toTarget.set(0, anchorY(station, layout), 0).applyMatrix4(group.matrixWorld);
        m.toDist = Math.max(FOCUS_DISTANCE[part], partFit(FOCUS_RADIUS[part], w, h));
        m.toShiftY = w <= PHONE || sideSheet(w, h) ? (panels.bottom - panels.top) / 2 / h : PART_SHIFT_Y;
      }
    } else {
      m.toTarget.set(0, 0, 0);
      const fit = overviewFit(axisOf(layout.total), m.fromSph.phi, w, h);
      m.toDist = refit ? Math.max(m.fromDist, fit) : Math.max(OVERVIEW_DISTANCE, fit);
      m.toShift = readingView ? READING_SHIFT : 0; m.toShiftY = 0;
    }
    // Zoom is free in every view, within a sensible range around the shot (close enough to inspect, far
    // enough to see the whole sword). A refit keeps a user's zoom only when the length did not change.
    controls.minDistance = station ? Math.max(0.18, m.toDist * 0.35) : Math.min(1.5, m.toDist * 0.8);
    controls.maxDistance = station ? Math.max(m.toDist * 2.2, 1.6) : Math.max(6, m.toDist * 1.1);
    // The glide's clock starts on its first frame (t0 < 0): the frame that carries the click's own work (the panels
    // mounting) can come late, and must not make the camera jump ahead.
    m.t0 = -1; m.ms = motionReduced.current || resizeOnly ? 1 : refit ? REFIT_MS : station ? FOCUS_MS : OVERVIEW_MS; m.active = true;
    // The config is read through geoKey: only a change of the sword's length re-fits, not every part swap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station, reading, camera, sizeKey, again, geoKey, sheetPx, turn]);

  const handleStart = useCallback(() => {
    interaction.dragging = true; interaction.touchUntil = 0;
    // A drag during a glide keeps the user's direction (target and distance still settle).
    move.current.turn = false;
    setAutoRotate(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleEnd = useCallback(() => {
    interaction.dragging = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAutoRotate(true), AUTO_ROTATE_RESUME_MS);
  }, []);

  // Camera glide + view offset
  const sph = useRef(new THREE.Spherical());
  useFrame(() => {
    const m = move.current, controls = orbitRef.current, cam = camera as THREE.PerspectiveCamera;
    interaction.gliding = m.active;
    if (m.active && controls) {
      const now = frameTime();
      if (m.t0 < 0) m.t0 = now;
      const k = m.ms <= 1 ? 1 : easeInOut(Math.min(1, (now - m.t0) / m.ms));
      if (m.turn) {
        sph.current.set(1, m.fromSph.phi + (m.toSph.phi - m.fromSph.phi) * k, m.fromSph.theta + (m.toSph.theta - m.fromSph.theta) * k);
        dir.current.setFromSpherical(sph.current);
      } else dir.current.subVectors(cam.position, controls.target).normalize();
      controls.target.lerpVectors(m.fromTarget, m.toTarget, k);
      cam.position.copy(controls.target).addScaledVector(dir.current, m.fromDist + (m.toDist - m.fromDist) * k);
      // Aim from where the camera is now. The orbit controls aim it at the start of each frame, from the last frame's
      // place: left to them, the view trails the glide by a frame, which shows as a wobble while it turns.
      cam.lookAt(controls.target);
      m.shift = m.fromShift + (m.toShift - m.fromShift) * k;
      m.shiftY = m.fromShiftY + (m.toShiftY - m.fromShiftY) * k;
      if (k >= 1) m.active = false;
    }
    // Auto-rotation pauses while the rings are shown, so the part under the pointer stays put.
    if (controls) controls.autoRotate = autoRotateOn.current && !interaction.rings;
    if (Math.abs(m.shift) > 1e-4 || Math.abs(m.shiftY) > 1e-4) cam.setViewOffset(size.width, size.height, m.shift * size.width, m.shiftY * size.height, size.width, size.height);
    else if (cam.view?.enabled) cam.clearViewOffset();
  });

  // Project each part to screen for the DOM overlay
  const v = useRef(new THREE.Vector3());
  const layout = useMemo(() => getSwordLayout(config), [config]);
  useFrame(() => {
    const group = swordGroupRef.current;
    if (!group) return;
    for (const { id } of STATIONS) {
      v.current.set(0, anchorY(id, layout), 0).applyMatrix4(group.matrixWorld).project(camera);
      const a = anchors[id];
      a.x = (v.current.x + 1) / 2 * size.width;
      a.y = (1 - v.current.y) / 2 * size.height;
      a.visible = v.current.z < 1 && introRef.current.done;
    }
    publishAnchors();
  });

  useFrame(({ clock, gl, scene, camera }) => {
    if (introRef.current.done || !swordGroupRef.current) return;
    const elapsed = clock.elapsedTime;
    const progress = Math.min(1, Math.max(0, (elapsed - SWORD_INTRO_DELAY) / SWORD_INTRO_DURATION));
    swordGroupRef.current.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        mat.transparent = progress < 1;
        mat.opacity = progress;
      }
    });
    if (progress >= 1) {
      introRef.current.done = true;
      // The sword is in: build the programs of every other choice in the background (see warmPrograms).
      setTimeout(() => warmPrograms(gl, scene, camera), WARM_DELAY_MS);
    }
  });

  // The sword reads the store itself: a station change, a drag or a glide re-renders this component, never the sword.
  const sword = useMemo(() => <Sword />, []);
  // The sword never moves under its shadow (only the camera does), so the shadow is drawn for a moment after the
  // sword changes (drei's ContactShadows counts its frames from its last render), not in every frame of a glide.
  const shadow = useMemo(() => <ContactShadows position={[0, shadowY, 0]} blur={2} opacity={0.4} far={4} frames={SHADOW_FRAMES} />,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shadowY, config]);
  return (
    <>
      <OrbitControls
        ref={orbitRef}
        enableDamping
        dampingFactor={0.12}
        enablePan={false}
        enableZoom
        rotateSpeed={station ? 0.7 : 1}
        minPolarAngle={MIN_POLAR}
        maxPolarAngle={MAX_POLAR}
        minDistance={1.5}
        maxDistance={6}
        autoRotateSpeed={1.5}
        onStart={handleStart}
        onEnd={handleEnd}
      />
      {/* The forge in the background plate lights the sword (see ForgeLighting) */}
      <ForgeLighting inspect={station !== null} />
      {shadow}
      {/* Presentation tilt: ~23° lean so blade reads as diagonal, not vertical */}
      <group ref={swordGroupRef} rotation={SWORD_ROTATION}>
        {sword}
      </group>
    </>
  );
}

// Feeds each frame's interval to the governor and applies its resolution.
// A change waits while the camera glides: resizing the canvas mid-move would show as a hitch in it.
function AdaptiveResolution({ onChange }: { onChange: (dpr: number) => void }) {
  const governor = useMemo(() => createGovernor(LADDER.length, GOVERN_AFTER_MS), []);
  const last = useRef(0), pending = useRef<number | null>(null);
  useFrame(() => {
    const now = performance.now(), dt = last.current ? now - last.current : 0;
    last.current = now;
    const level = dt ? governor.frame(dt, now) : null;
    if (level !== null) pending.current = level;
    if (pending.current !== null && !interaction.gliding) { onChange(LADDER[pending.current]); pending.current = null; }
  });
  return null;
}

export function Scene() {
  const [dpr, setDpr] = useState(LADDER[0]);
  // Tablets and phones: History & use takes the whole stage, so the sword fades out behind it.
  const reading = useConfigStore((s) => s.reading);
  const { width } = useViewportSize();
  const hidden = reading && width < 1180;
  // Hidden behind the scroll, the scene stops rendering once its fade-out ends, and resumes as soon as it
  // is shown again (before the fade-in).
  const [faded, setFaded] = useState(false);
  return (
    <Canvas
      dpr={dpr}
      frameloop={hidden && faded ? 'never' : 'always'}
      onTransitionEnd={(e) => { if (e.propertyName === 'opacity' && e.target === e.currentTarget) setFaded(hidden); }}
      // The drawing buffer is not preserved (that costs a full-screen copy every frame): a screenshot renders the
      // frame again right before it reads the canvas (lib/screenshot.ts).
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: false }}
      camera={{ position: CAMERA_POSITION, fov: FOV }}
      onCreated={({ gl, scene, camera }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.03;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        setScreenshotSource(() => gl.render(scene, camera));
      }}
      style={{ background: 'transparent', opacity: hidden ? 0 : 1, transition: `opacity ${hidden ? 260 : 420}ms cubic-bezier(.2, 0, 0, 1)` }}
    >
      <AdaptiveResolution onChange={setDpr} />
      <SceneContents />
    </Canvas>
  );
}
