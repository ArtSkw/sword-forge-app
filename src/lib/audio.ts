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
  playbackRate: number;       // 1.0 = original pitch; <1 lower, >1 higher
  filterType: BiquadFilterType;
  filterFreq: number;         // Hz cutoff
  volume: number;
};

let _audioCtx: AudioContext | null = null;
const _bufferCache = new Map<string, AudioBuffer>();

function getCtx(): AudioContext {
  if (!_audioCtx) _audioCtx = new AudioContext();
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

async function getBuffer(src: string): Promise<AudioBuffer> {
  if (_bufferCache.has(src)) return _bufferCache.get(src)!;
  const res = await fetch(src);
  const arr = await res.arrayBuffer();
  const buf = await getCtx().decodeAudioData(arr);
  _bufferCache.set(src, buf);
  return buf;
}

export async function playCling(src: string, params: ClingParams) {
  if (_muted) return;
  try {
    const ctx = getCtx();
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
    // fallback to simple Audio if Web Audio API fails
    playOneShot(src, params.volume);
  }
}
