// Render resolution that follows the frame rate. A step down when frames keep missing a 60 fps screen's deadline,
// a step back up only after a long run of clean frames, and a level that failed after a step up is tried again
// later and later, then not at all: every change resizes the canvas, which is itself a hitch, so it must not flap.
// Pure logic (no React, no three.js); the scene feeds it frame intervals (see AdaptiveResolution in Scene.tsx).

export const SLOW_MS = 25;            // a frame this long missed at least one refresh at 60 Hz (or ran under 40 fps)
const SPIKE_MS = 120;                 // a stall (a part rebuilt, a texture uploaded): resolution would not help…
const SPIKES_IGNORED = 2;             // …so up to this many in a window are left out; more mean a slow device
const WINDOW_MS = 1000;
const BAD_SHARE = 0.15;               // slow frames in a window that make it bad (about 52 fps on a 60 Hz screen)
const GOOD_SHARE = 0.02;
const BAD_TO_DROP = 2;                // bad windows in a row before a step down
const GOOD_TO_RISE = 8;               // good windows in a row before a step up (× 3 for each failed try of that level)
const MAX_TRIES = 3;                  // a level that fails this many times after a step up is not tried again
const FAIL_WITHIN_MS = 12000;         // a step down this soon after a step up counts as that level failing

/** A ladder of render resolutions, best first. `frame` takes each frame's interval and returns the new level's
 *  index when it changes. The first `ignoreMs` after the first frame (loading, the sword's fade-in) are ignored. */
export function createGovernor(levels: number, ignoreMs = 0) {
  let level = 0, startAt = -1, windowStart = -1, frames = 0, slow = 0, spikes = 0, bad = 0, good = 0, cooling = false;
  let lastRise = -Infinity, risenTo = -1;
  const fails = new Array<number>(levels).fill(0);
  return {
    get level() { return level; },
    frame(dt: number, now: number): number | null {
      if (startAt < 0) startAt = now + ignoreMs;
      if (now < startAt) return null;
      if (windowStart < 0) windowStart = now;
      frames++;
      if (dt > SLOW_MS) slow++;
      if (dt > SPIKE_MS) spikes++;
      if (now - windowStart < WINDOW_MS) return null;
      const skip = spikes <= SPIKES_IGNORED ? spikes : 0, counted = frames - skip;
      const share = counted >= 4 ? (slow - skip) / counted : -1;
      windowStart = now; frames = 0; slow = 0; spikes = 0;
      // The window after a change holds the resize itself: it does not count.
      if (cooling || share < 0) { cooling = false; return null; }
      if (share >= BAD_SHARE) { bad++; good = 0; } else if (share <= GOOD_SHARE) { good++; bad = 0; } else { bad = 0; good = 0; }
      if (bad >= BAD_TO_DROP && level < levels - 1) {
        if (level === risenTo && now - lastRise < FAIL_WITHIN_MS) fails[level]++;
        level++; bad = 0; good = 0; cooling = true; risenTo = -1;
        return level;
      }
      if (level > 0 && fails[level - 1] < MAX_TRIES && good >= GOOD_TO_RISE * 3 ** fails[level - 1]) {
        level--; good = 0; bad = 0; cooling = true; lastRise = now; risenTo = level;
        return level;
      }
      return null;
    },
  };
}

/** The resolutions to step through on a screen of this pixel ratio: never above 2× (a phone's 3× costs more than it
 *  shows), down to 1.25× on high-density screens and 0.85× on ordinary ones. */
export function resolutionLadder(devicePixelRatio: number): number[] {
  const top = Math.min(Math.max(devicePixelRatio, 1), 2);
  if (top < 1.5) return top > 1 ? [top, 1, 0.85] : [1, 0.85];
  const ladder: number[] = [];
  for (let d = top; d > 1.25 - 1e-6; d -= 0.25) ladder.push(+d.toFixed(2));
  return ladder;
}

// Self-check (dev): a steady 60 fps never steps; one-off stalls never step; 8 fps reaches the floor; ~45 fps steps
// down within 3 s and settles; a failed step up is retried later and later, then never.
if (import.meta.env.DEV) {
  const run = (g: ReturnType<typeof createGovernor>, seconds: number, dts: number[], t0: number) => {
    let t = t0, i = 0;
    const changes: [number, number][] = [];
    while (t < t0 + seconds * 1000) { const dt = dts[i++ % dts.length]; t += dt; const c = g.frame(dt, t); if (c !== null) changes.push([Math.round(t), c]); }
    return { t, changes };
  };
  const errors: string[] = [];
  const smooth = createGovernor(4);
  if (run(smooth, 60, [16.7], 0).changes.length) errors.push('steady 60 fps stepped');
  const stalls = createGovernor(4);
  if (run(stalls, 30, [...new Array(58).fill(16.7), 400], 0).changes.length) errors.push('one-off stalls stepped');
  const crawl = createGovernor(4);
  if (run(crawl, 12, [125], 0).changes.length < 3) errors.push('8 fps did not step down to the floor');
  const slow = createGovernor(4);
  const r1 = run(slow, 5, [16.7, 33.3, 16.7], 0);   // ~45 fps
  if (!r1.changes.length || r1.changes[0][0] > 3200) errors.push('45 fps did not step down within 3 s');
  // From here the device holds 60 fps at level 1 but fails at level 0: each retry must wait longer, then stop.
  let t = r1.t, rises = 0;
  for (let k = 0; k < 40; k++) {
    const at0 = slow.level === 0;
    const r = run(slow, 4, at0 ? [16.7, 33.3, 16.7] : [16.7], t);
    t = r.t; rises += r.changes.filter(([, c]) => c === 0).length;
  }
  if (rises !== MAX_TRIES) errors.push(`failed level retried ${rises} times, expected ${MAX_TRIES}`);
  const ladder = resolutionLadder(2).join(), one = resolutionLadder(1).join();
  if (ladder !== '2,1.75,1.5,1.25' || one !== '1,0.85' || resolutionLadder(3).join() !== ladder) errors.push(`ladders ${ladder} / ${one}`);
  if (errors.length) console.error('quality governor self-check:', errors);
}
