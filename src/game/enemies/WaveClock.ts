/** Active game time only: pausing means the caller stops advancing this clock. */
export class WaveClock {
  wave = 1;
  private elapsed = 0;

  readonly interval: number;

  constructor(interval: number) { this.interval = interval; }

  get remaining(): number { return this.interval - this.elapsed; }
  get elapsedTime(): number { return (this.wave - 1) * this.interval + this.elapsed; }

  update(delta: number): number {
    this.elapsed += Math.max(0, delta);
    const waves = Math.floor(this.elapsed / this.interval);
    this.elapsed %= this.interval;
    this.wave += waves;
    return waves;
  }

  reset(): void { this.wave = 1; this.elapsed = 0; }
}
