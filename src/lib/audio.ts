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

// --- Procedural UI sound (no extra asset): the paper rustle of the historical account ---

async function noiseBurst(dur: number, type: BiquadFilterType, f0: number, f1: number, gain: number, wobbleHz = 0) {
  if (_muted) return;
  try {
    const ctx = await getCtx();
    const t = ctx.currentTime;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (wobbleHz ? 0.6 + 0.4 * Math.sin((i / ctx.sampleRate) * wobbleHz * Math.PI * 2) : 1);
    const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf; filter.type = type;
    filter.frequency.setValueAtTime(f0, t); filter.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(ctx.destination); src.start(t);
  } catch { /* audio unavailable: stay silent */ }
}

export const playPaper = () => noiseBurst(0.65, 'bandpass', 2600, 1200, 0.06, 18);

// --- The forge strike: one sound for every change to the sword ---
// Each kind of change has its own recorded strike (ElevenLabs sound effects, chosen by the author): steel
// rings, iron fittings clink lower, a wooden grip knocks, a leather or cord grip creaks under the hand, a finish is a whetstone
// stroke. Whole-sword changes (a new Form, Back to default) keep the anvil. A small random variation keeps repeated changes alive.
const SND = `${import.meta.env.BASE_URL}sounds/`;
export type StrikeVoice = 'anvil' | 'steel' | 'fitting' | 'wood' | 'leather' | 'soft';
const STRIKES: Record<StrikeVoice, { src: string } & ClingParams> = {
  anvil: { src: `${SND}anvil.wav`, playbackRate: 1, filterType: 'allpass', filterFreq: 1000, volume: 0.34 },
  steel: { src: `${SND}strike-steel.mp3`, playbackRate: 1, filterType: 'allpass', filterFreq: 1000, volume: 0.3 },
  fitting: { src: `${SND}strike-fitting.mp3`, playbackRate: 1, filterType: 'allpass', filterFreq: 1000, volume: 0.28 },
  wood: { src: `${SND}strike-wood.mp3`, playbackRate: 1, filterType: 'allpass', filterFreq: 1000, volume: 0.34 },
  leather: { src: `${SND}strike-leather.mp3`, playbackRate: 1, filterType: 'allpass', filterFreq: 1000, volume: 0.3 },
  soft: { src: `${SND}strike-finish.mp3`, playbackRate: 1, filterType: 'allpass', filterFreq: 1000, volume: 0.18 },
};
let lastStrike = 0;
export function playStrike(voice: StrikeVoice = 'anvil') {
  // Never two strikes on top of each other (a burst of key presses rings once).
  const now = performance.now();
  if (now - lastStrike < 70) return;
  lastStrike = now;
  const { src, ...v } = STRIKES[voice];
  playCling(src, { ...v, playbackRate: v.playbackRate * (0.97 + Math.random() * 0.06) });
}
