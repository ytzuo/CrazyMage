/** Active-game-time health, hit protection and shield recovery. */
export class Health {
  maximum: number;
  current: number;
  shield = 0;
  shieldMaximum = 0;
  private protection = 0;
  private sinceHit = 0;
  constructor(maximum: number) { this.maximum = maximum; this.current = maximum; }
  get dead(): boolean { return this.current <= 0; }
  get protected(): boolean { return this.protection > 0; }
  /** Healing does not revive, grant protection or reset shield recovery. */
  heal(amount: number): number {
    if (this.dead || !Number.isFinite(amount) || amount <= 0) return 0;
    const previous = this.current;
    this.current = Math.min(this.maximum, this.current + amount);
    return this.current - previous;
  }
  update(delta: number): void {
    this.protection = Math.max(0, this.protection - delta);
    this.sinceHit = Math.min(10000, this.sinceHit + delta);
    if (!this.dead && this.sinceHit >= 10000) this.shield = this.shieldMaximum;
  }
  configure(maximum: number, shieldMaximum: number): void {
    const addedHealth = Math.max(0, maximum - this.maximum);
    const addedShield = Math.max(0, shieldMaximum - this.shieldMaximum);
    this.maximum = maximum; this.shieldMaximum = shieldMaximum;
    if (!this.dead) this.current = Math.min(maximum, this.current + addedHealth);
    this.shield = Math.min(shieldMaximum, this.shield + addedShield);
  }
  hurt(damage: number, protection = 0): boolean {
    if (this.dead || this.protected || damage <= 0) return false;
    const absorbed = Math.min(this.shield, damage);
    this.shield -= absorbed; this.current = Math.max(0, this.current - (damage - absorbed));
    this.protection = protection; this.sinceHit = 0;
    return true;
  }
  reset(): void { this.current = this.maximum; this.shield = this.shieldMaximum; this.protection = this.sinceHit = 0; }
}
