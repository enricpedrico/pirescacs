import type { Preferences, SoundSet } from './preferences';
import { readPosition } from './position.js';
export type SoundEvent = 'move' | 'capture' | 'swap' | 'return' | 'check' | 'start' | 'end' | 'navigate';
export type AudioStatus = 'locked' | 'ready' | 'unavailable';
export const SOUND_RATE = 24000;
export const SOUND_EVENTS: SoundEvent[] = ['move', 'capture', 'swap', 'return', 'check', 'start', 'end', 'navigate'];
// This describes an already legal move; it does not decide legality.
export function moveSound(fen: string, move: string): SoundEvent {
  if (move.endsWith('!')) return 'return';
  if (move.includes('@')) return 'return';
  const pieces = readPosition(fen).pieces, from = pieces[move.slice(0, 2)], to = pieces[move.slice(2, 4)];
  if (from?.toLowerCase() === 'r' && to) return 'swap';
  return to || (from?.toLowerCase() === 'p' && move[0] !== move[2]) ? 'capture' : 'move';
}

// Original, deterministic modal synthesis: a low wooden body, a short impact,
// and a little damped glass. No downloaded recordings or third-party sound assets.
export function synthesizeSound(set: SoundSet, event: SoundEvent, rate = SOUND_RATE): Float32Array {
  const duration = event === 'end' ? .52 : event === 'start' ? .28 : event === 'return' ? .25 : .16;
  const pcm = new Float32Array(Math.ceil(duration * rate));
  let seed = 74291, low = 0;
  const tap = (time: number, weight: number, pitch = 1) => {
    const start = Math.round(time * rate), glass = set === 'glass', wood = set === 'wood';
    for (let i = start; i < pcm.length; i++) {
      const t = (i - start) / rate;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 2147483648 - 1;
      low += .18 * (noise - low);
      const attack = Math.min(1, t / .0018);
      const body = Math.sin(2 * Math.PI * (wood ? 245 : 310) * pitch * t) * Math.exp(-t / .019) * .42;
      const contact = low * Math.exp(-t / .009) * (wood ? .65 : .43);
      const ring = glass ? (Math.sin(2 * Math.PI * 1180 * pitch * t) * Math.exp(-t / .026) * .12 + Math.sin(2 * Math.PI * 1930 * pitch * t) * Math.exp(-t / .013) * .025) : wood ? Math.sin(2 * Math.PI * 710 * pitch * t) * Math.exp(-t / .012) * .05 : Math.sin(2 * Math.PI * 660 * pitch * t) * Math.exp(-t / .018) * .05;
      pcm[i] += (body + contact + ring) * attack * weight * (set === 'quiet' ? .6 : 1);
    }
  };
  if (event === 'swap') { tap(0, .68, .93); tap(.045, .6, 1.08); }
  else if (event === 'return') { tap(0, .7, .94); tap(.10, .5, 1.15); }
  else if (event === 'start') { tap(0, .6, .9); tap(.085, .5, 1.12); }
  else if (event === 'end') { tap(0, .55, 1.12); tap(.12, .52, 1); tap(.24, .45, .85); }
  else tap(0, event === 'capture' ? 1 : event === 'navigate' ? .34 : .8, event === 'capture' ? .83 : event === 'check' ? 1.17 : 1);
  // Fade both edges and bound the peak even if overlapping taps coincide.
  let previous = 0, filtered = 0;
  const dcBlock = Math.exp(-2 * Math.PI * 25 / rate);
  for (let i = 0; i < pcm.length; i++) {
    const sample = pcm[i];
    filtered = sample - previous + dcBlock * filtered;
    previous = sample;
    pcm[i] = Math.max(-.85, Math.min(.85, filtered * Math.min(1, i / 32, (pcm.length - 1 - i) / 96)));
  }
  pcm[0] = pcm[pcm.length - 1] = 0;
  return pcm;
}

export class Sounds {
  private context?: AudioContext;
  private gain?: GainNode;
  private buffers = new Map<string, AudioBuffer>();
  private sources = new Set<AudioBufferSourceNode>();
  private preferences?: Preferences;
  status: AudioStatus = 'locked';
  constructor(private onStatus: (status: AudioStatus) => void, private onPlay?: (event: SoundEvent) => void) {}
  configure(preferences: Preferences) {
    this.preferences = preferences;
    if (this.gain && this.context) this.gain.gain.setValueAtTime(preferences.sound ? (preferences.volume / 100) ** 1.6 : 0, this.context.currentTime);
    if (!preferences.sound || !preferences.volume) this.silence();
  }
  private report(status: AudioStatus) { this.status = status; this.onStatus(status); }
  async unlock() {
    if (!this.preferences?.sound || !this.preferences.volume || this.status === 'unavailable') return;
    try {
      if (!this.context) {
        const Constructor = globalThis.AudioContext || (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Constructor) { this.report('unavailable'); return; }
        this.context = new Constructor({ latencyHint: 'interactive' });
        this.gain = this.context.createGain();
        this.gain.connect(this.context.destination);
        this.configure(this.preferences);
        this.context.onstatechange = () => this.report(this.context?.state === 'running' ? 'ready' : 'locked');
      }
      if (this.context.state !== 'running') await this.context.resume();
      this.report(this.context.state === 'running' ? 'ready' : 'locked');
    } catch { this.report(this.context ? 'locked' : 'unavailable'); }
  }
  play(event: SoundEvent) {
    const p = this.preferences, context = this.context;
    if (!p?.sound || !p.volume || !context || context.state !== 'running' || !this.gain) return;
    if (!p.alerts && ['start', 'end', 'check'].includes(event)) return;
    if (event === 'navigate' && !p.historySound) return;
    if (this.sources.size >= 8) this.silence();
    const key = p.soundSet + '/' + event;
    let buffer = this.buffers.get(key);
    if (!buffer) {
      const pcm = synthesizeSound(p.soundSet, event);
      buffer = context.createBuffer(1, pcm.length, SOUND_RATE);
      buffer.getChannelData(0).set(pcm);
      this.buffers.set(key, buffer);
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gain);
    this.sources.add(source);
    source.onended = () => { this.sources.delete(source); source.disconnect(); };
    source.start();
    this.onPlay?.(event);
  }
  silence() { for (const source of this.sources) { try { source.stop(); } catch {} } this.sources.clear(); }
  close() { this.silence(); if (this.context) { this.context.onstatechange = null; void this.context.close().catch(() => {}); } this.context = undefined; this.gain = undefined; this.buffers.clear(); }
}
