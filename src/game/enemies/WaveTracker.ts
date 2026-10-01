/** Tracks only waves with actual spawns; completed waves are removed, so duplicate deaths cannot reward again. */
export class WaveTracker {
  private active = new Map<number, number>();
  private lastWave = 0;
  cleared = 0;
  register(wave: number, spawned: number): void {
    if (wave <= this.lastWave) return;
    this.lastWave = wave;
    if (spawned > 0) this.active.set(wave, spawned);
  }
  remaining(wave: number): number { return this.active.get(wave) ?? 0; }
  /** Offspring extend an active wave before the parent's death is settled. */
  add(wave: number, spawned: number): void {
    const remaining = this.active.get(wave);
    if (remaining !== undefined && spawned > 0) this.active.set(wave, remaining + spawned);
  }
  defeat(wave: number): boolean {
    const remaining = this.active.get(wave);
    if (remaining === undefined) return false;
    if (remaining > 1) { this.active.set(wave, remaining - 1); return false; }
    this.active.delete(wave); this.cleared++; return true;
  }
  reset(): void { this.active.clear(); this.lastWave = this.cleared = 0; }
}
