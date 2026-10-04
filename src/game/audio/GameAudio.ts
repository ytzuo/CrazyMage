import type { School } from '../upgrades/definitions';

type Voice = { source: AudioBufferSourceNode; gain: GainNode; priority: number; combat: boolean };
export interface CueOptions { volume?: number; priority?: number; combat?: boolean; gap?: number; duration?: number; group?: string }
/** One scene owns one mixer. No deferred cues: unavailable/paused sounds are discarded. */
export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private voices = new Set<Voice>();
  private last = new Map<string, number>();
  private variants = new Map<string, number>();
  private listeners = new AbortController();
  private disposed = false;
  private paused = true;
  private muted = false;
  readonly ready: Promise<void>;
  constructor(urls: Record<string, string>) {
    try {
      this.muted = localStorage.getItem('mage-sfx-muted') === 'true';
    } catch { /* Private browsing may disallow storage. */ }
    try {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.65;
      this.master.connect(this.context.destination);
    } catch { /* Audio is optional on unsupported devices. */ }
    const signal = this.listeners.signal;
    const unlock = () => { if (this.context?.state === 'suspended') void this.context.resume().catch(() => {}); };
    window.addEventListener('pointerdown', unlock, { signal, capture: true });
    window.addEventListener('keydown', unlock, { signal, capture: true });
    window.addEventListener('blur', () => this.stop(), { signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.stop(); }, { signal });
    this.ready = this.load(urls);
  }
  private async load(urls: Record<string, string>): Promise<void> {
    const context = this.context;
    if (!context) return;
    await Promise.all(Object.entries(urls).map(async ([id, url]) => {
      try {
        const response = await fetch(url, { signal: this.listeners.signal });
        if (!response.ok) return;
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        if (!this.disposed) this.buffers.set(id, buffer);
      } catch { /* Missing audio must never prevent starting a run. */ }
    }));
  }
  get isMuted(): boolean { return this.muted; }
  get status() { return { loaded: this.buffers.size, active: this.voices.size, state: this.context?.state ?? 'unavailable', muted: this.muted, paused: this.paused }; }
  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.65;
    if (this.muted) this.stop();
    try { localStorage.setItem('mage-sfx-muted', String(this.muted)); } catch { /* Optional persistence. */ }
    return this.muted;
  }
  setPaused(paused: boolean): void { this.paused = paused; if (paused) this.stop(true); }
  play(id: string, options: CueOptions = {}): boolean {
    const context = this.context, buffer = this.buffers.get(id), combat = options.combat ?? true;
    if (!context || !this.master || !buffer || this.disposed || this.muted || document.hidden || context.state !== 'running' || (combat && this.paused)) return false;
    const now = context.currentTime, group = options.group ?? id;
    if (now - (this.last.get(group) ?? -Infinity) < (options.gap ?? 0.08)) return false;
    const priority = options.priority ?? 1;
    // Reserve four of twelve voices for skills, damage warnings and UI cues.
    if (this.voices.size >= (priority < 2 ? 8 : 12)) {
      const victim = [...this.voices].find(voice => voice.priority < priority);
      if (!victim) return false;
      this.release(victim);
    }
    const source = context.createBufferSource(), gain = context.createGain();
    const duration = Math.min(buffer.duration, options.duration ?? buffer.duration);
    source.buffer = buffer;
    const volume = options.volume ?? 0.65;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.004);
    gain.gain.setValueAtTime(volume, now + Math.max(0.004, duration - 0.06));
    gain.gain.linearRampToValueAtTime(0, now + duration);
    source.connect(gain); gain.connect(this.master);
    const voice = { source, gain, priority, combat };
    source.onended = () => this.release(voice);
    this.voices.add(voice); this.last.set(group, now);
    source.start(now, 0, duration);
    return true;
  }
  variant(group: string, ids: readonly string[], options: CueOptions = {}): void {
    const previous = this.variants.get(group) ?? -1;
    let index = Math.floor(Math.random() * ids.length);
    if (index === previous && ids.length > 1) index = (index + 1) % ids.length;
    if (this.play(ids[index], { ...options, group })) this.variants.set(group, index);
  }
  cast(school: School): void { this.variant(`${school}-cast`, [1,2,3].map(n => `${school}_cast_0${n}`), { volume: 0.48, gap: 0.07 }); }
  impact(school: School): void { this.variant('impact', [1,2].map(n => `${school}_impact_0${n}`), { volume: 0.32, gap: 0.085, priority: 0 }); }
  private release(voice: Voice): void {
    if (!this.voices.delete(voice)) return;
    voice.source.onended = null; voice.source.stop(); voice.source.disconnect(); voice.gain.disconnect();
  }
  stop(combatOnly = false): void { for (const voice of this.voices) if (!combatOnly || voice.combat) this.release(voice); }
  reset(): void { this.stop(); this.last.clear(); this.variants.clear(); }
  destroy(): void {
    if (this.disposed) return;
    this.disposed = true; this.listeners.abort(); this.reset(); this.buffers.clear();
    this.master?.disconnect(); if (this.context) void this.context.close().catch(() => {});
  }
}
// Preview scenes deliberately have no mixer; shared combat code remains silent there.
const mixers = new WeakMap<object, GameAudio>();
export const audioFor = (scene: object): GameAudio | undefined => mixers.get(scene);
export function attachAudio(scene: object, audio: GameAudio): void { mixers.set(scene, audio); }
export function detachAudio(scene: object): void { mixers.get(scene)?.destroy(); mixers.delete(scene); }
