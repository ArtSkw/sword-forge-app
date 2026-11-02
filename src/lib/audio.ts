// Shared mute state — single source of truth for all sounds in the app
type Listener = (muted: boolean) => void;
let _muted = false;
const _listeners = new Set<Listener>();

export const audioState = {
  get muted() { return _muted; },
  toggle() {
    _muted = !_muted;
    _listeners.forEach((fn) => fn(_muted));
  },
  subscribe(fn: Listener) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },
};

export function playOneShot(src: string, volume = 0.4) {
  if (_muted) return;
  const audio = new Audio(src);
  audio.volume = volume;
  audio.play().catch(() => {});
}

// --- Web Audio API one-shot with pitch + filter shaping ---

export type ClingParams = {
  playbackRate: number;
  filterType: BiquadFilterType;
  filterFreq: number;
  volume: number;
};

let _audioCtx: AudioContext | null = null;
const _bufferCache = new Map<string, AudioBuffer>();
const _bufferPending = new Map<string, Promise<AudioBuffer>>();

async function getCtx(): Promise<AudioContext> {
  if (!_audioCtx) _audioCtx = new AudioContext();
  if (_audioCtx.state === 'suspended') await _audioCtx.resume();
  return _audioCtx;
}

async function getBuffer(src: string): Promise<AudioBuffer> {
  if (_bufferCache.has(src)) return _bufferCache.get(src)!;
  if (_bufferPending.has(src)) return _bufferPending.get(src)!;
  const promise = (async () => {
    const res = await fetch(src);
    const arr = await res.arrayBuffer();
    const ctx = await getCtx();
    const buf = await ctx.decodeAudioData(arr);
    _bufferCache.set(src, buf);
    _bufferPending.delete(src);
    return buf;
  })();
  _bufferPending.set(src, promise);
  return promise;
}

export async function playCling(src: string, params: ClingParams) {
  if (_muted) return;
  try {
    const ctx = await getCtx();
    const buffer = await getBuffer(src);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = params.playbackRate;

    const filter = ctx.createBiquadFilter();
    filter.type = params.filterType;
    filter.frequency.value = params.filterFreq;

    const gain = ctx.createGain();
    gain.gain.value = params.volume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch {
    playOneShot(src, params.volume);
  }
}

// Returns a cleanup function for use as a useEffect return value.
export function makeAudioLayer(src: string, target: number, delayMs: number): () => void {
  const audio = new Audio(src);
  audio.loop = true;
  audio.volume = 0;

  const steps = 40;
  const intervalMs = 2000 / steps;
  let retryRamp: ReturnType<typeof setInterval> | null = null;
  let resumeListener: (() => void) | null = null;

  const startDelay = setTimeout(() => {
    if (_muted) return;

    let step = 0;
    const ramp = setInterval(() => {
      step++;
      audio.volume = Math.min(target, (step / steps) * target);
      if (step >= steps) clearInterval(ramp);
    }, intervalMs);

    audio.play().catch(() => {
      clearInterval(ramp);
      audio.volume = 0;

      resumeListener = () => {
        if (_muted) return;
        audio.play().catch(() => {});
        let retryStep = 0;
        retryRamp = setInterval(() => {
          retryStep++;
          audio.volume = Math.min(target, (retryStep / steps) * target);
          if (retryStep >= steps) { clearInterval(retryRamp!); retryRamp = null; }
        }, intervalMs);
        window.removeEventListener('pointerdown', resumeListener!);
        resumeListener = null;
      };
      window.addEventListener('pointerdown', resumeListener);
    });
  }, delayMs);

  const unsub = audioState.subscribe((m) => {
    if (m) audio.pause();
    else if (!document.hidden) audio.play().catch(() => {});
  });
  // Quiet while the tab is hidden (another tab, a minimised window); back when it is shown again.
  const onVisibility = () => {
    if (document.hidden) audio.pause();
    else if (!_muted && audio.volume > 0) audio.play().catch(() => {});
  };
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    clearTimeout(startDelay);
    if (retryRamp !== null) clearInterval(retryRamp);
    if (resumeListener !== null) window.removeEventListener('pointerdown', resumeListener);
    unsub();
    document.removeEventListener('visibilitychange', onVisibility);
    audio.pause();
  };
}

// Music: the tracks play one after another and the list loops, so a long visit hears several pieces instead
// of one on repeat. Every track file carries its own soft fades (8 s in, 7 s out, all at one loudness), so the
// next track simply starts as the last one begins to fade: the two fades overlap into a seamless crossfade.
// Quiet when muted or when the tab is hidden; a browser that blocks autoplay starts it on the first tap.
// Returns a cleanup function.
const OVERLAP_S = 7;
export function makePlaylist(srcs: string[], target: number, delayMs: number): () => void {
  const players = [new Audio(), new Audio()];
  players.forEach((p) => { p.preload = 'auto'; p.volume = 0; });
  let track = 0, active = 0, fadeFrom = -1, fadeT0 = 0, started = false, startT0 = 0;
  const load = (p: HTMLAudioElement, i: number) => { p.src = srcs[i % srcs.length]; p.currentTime = 0; };
  load(players[0], 0);
  const play = (p: HTMLAudioElement) => { if (!_muted && !document.hidden) p.play().catch(() => {}); };
  const tick = setInterval(() => {
    if (!started || _muted || document.hidden) return;
    const now = performance.now(), cur = players[active];
    // The first track fades in over 2 s.
    const intro = Math.min(1, (now - startT0) / 2000);
    // Start the next track as this one begins its fade-out; the outgoing one plays on to its end.
    if (fadeFrom < 0 && cur.duration && cur.currentTime >= cur.duration - OVERLAP_S) {
      fadeFrom = active; active = 1 - active; track++; fadeT0 = now;
      load(players[active], track); play(players[active]);
    }
    players[active].volume = target * intro;
    if (fadeFrom >= 0) {
      const out = players[fadeFrom];
      out.volume = target;
      if (out.ended || now - fadeT0 > (OVERLAP_S + 2) * 1000) { out.pause(); fadeFrom = -1; }
    }
  }, 100);
  const begin = () => { if (_muted) return; started = true; startT0 = performance.now(); play(players[active]); };
  let resume: (() => void) | null = null;
  let due = false;   // the start delay has passed (a mute before it only postpones the start)
  const startDelay = setTimeout(() => {
    due = true;
    if (_muted) return;
    players[active].play().then(() => { started = true; startT0 = performance.now(); }).catch(() => {
      resume = () => { begin(); if (resume) window.removeEventListener('pointerdown', resume); resume = null; };
      window.addEventListener('pointerdown', resume);
    });
  }, delayMs);
  const both = (fn: (p: HTMLAudioElement) => void) => { fn(players[active]); if (fadeFrom >= 0) fn(players[fadeFrom]); };
  const unsub = audioState.subscribe((m) => {
    if (m) both((p) => p.pause());
    else if (!document.hidden) { if (started) both(play); else if (due) begin(); }
  });
  const onVisibility = () => { if (document.hidden) both((p) => p.pause()); else if (started && !_muted) both(play); };
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    clearTimeout(startDelay); clearInterval(tick);
    if (resume) window.removeEventListener('pointerdown', resume);
    unsub(); document.removeEventListener('visibilitychange', onVisibility);
    players.forEach((p) => p.pause());
  };
}

// --- History & use: the vellum rustles as it unrolls and as it rolls up ---
export const playScroll = (opening: boolean) =>
  playCling(`${import.meta.env.BASE_URL}sounds/scroll-${opening ? 'open' : 'close'}.mp3`, { playbackRate: 0.97 + Math.random() * 0.06, filterType: 'allpass', filterFreq: 1000, volume: opening ? 0.42 : 0.34 });

// --- The forge strike: one sound for every change to the sword ---
// Each kind of change has its own recorded strike (ElevenLabs sound effects, chosen by the author): steel
// rings, iron fittings clink lower, a wooden grip knocks, a leather or cord grip creaks under the hand, a finish is a whetstone
// stroke. Whole-sword changes (a new Form, Back to default) ring a crisp, juicy anvil ping: the sword reforged. A small random variation keeps repeated changes alive.
const SND = `${import.meta.env.BASE_URL}sounds/`;
export type StrikeVoice = 'reforge' | 'steel' | 'fitting' | 'wood' | 'leather' | 'soft';
const STRIKES: Record<StrikeVoice, { src: string } & ClingParams> = {
  reforge: { src: `${SND}reforge.mp3`, playbackRate: 1, filterType: 'allpass', filterFreq: 1000, volume: 0.34 },
  steel: { src: `${SND}strike-steel.mp3`, playbackRate: 1, filterType: 'allpass', filterFreq: 1000, volume: 0.3 },
  fitting: { src: `${SND}strike-fitting.mp3`, playbackRate: 1, filterType: 'allpass', filterFreq: 1000, volume: 0.28 },
  wood: { src: `${SND}strike-wood.mp3`, playbackRate: 1, filterType: 'allpass', filterFreq: 1000, volume: 0.34 },
  leather: { src: `${SND}strike-leather.mp3`, playbackRate: 1, filterType: 'allpass', filterFreq: 1000, volume: 0.3 },
  soft: { src: `${SND}strike-finish.mp3`, playbackRate: 1, filterType: 'allpass', filterFreq: 1000, volume: 0.18 },
};
let lastStrike = 0;
export function playStrike(voice: StrikeVoice = 'reforge') {
  // Never two strikes on top of each other (a burst of key presses rings once).
  const now = performance.now();
  if (now - lastStrike < 70) return;
  lastStrike = now;
  const { src, ...v } = STRIKES[voice];
  playCling(src, { ...v, playbackRate: v.playbackRate * (0.97 + Math.random() * 0.06) });
}
