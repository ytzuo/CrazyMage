/** Active game time and next-wave scheduling are independent: rescheduling never changes run duration. */
export class WaveClock {
  wave = 1;
  private countdown: number;
  private total = 0;
  readonly interval: number;

  constructor(interval: number, private durationForWave: (wave: number) => number = () => interval) {
    this.interval = interval; this.countdown = durationForWave(this.wave);
  }

  get remaining(): number { return this.countdown; }
  get elapsedTime(): number { return this.total; }

  scheduleNext(delay: number): void { this.countdown = Math.max(0, delay); }

  update(delta: number, allowAdvance = true): number {
    const step = Math.max(0, delta);
    this.total += step;
    this.countdown -= step;
    if (this.countdown > 0) return 0;
    if (!allowAdvance) { this.countdown = 0; return 0; }
    this.wave++;
    this.countdown = this.durationForWave(this.wave);
    return 1;
  }

  reset(): void { this.wave = 1; this.total = 0; this.countdown = this.durationForWave(this.wave); }
}
