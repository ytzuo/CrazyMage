/** Game-time health and hit protection; callers stop ticking while paused. */
export class Health {
  readonly maximum: number;
  current: number;
  private protection = 0;

  constructor(maximum: number) {
    this.maximum = maximum;
    this.current = maximum;
  }

  get dead(): boolean { return this.current <= 0; }
  get protected(): boolean { return this.protection > 0; }

  update(delta: number): void { this.protection = Math.max(0, this.protection - delta); }

  hurt(damage: number, protection = 0): boolean {
    if (this.dead || this.protected || damage <= 0) return false;
    this.current = Math.max(0, this.current - damage);
    this.protection = protection;
    return true;
  }

  reset(): void { this.current = this.maximum; this.protection = 0; }
}
