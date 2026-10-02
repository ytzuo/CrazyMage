export type DamageSource = 'spell' | 'ultimate';
/** Energy is awarded once by the enemy death path, never by hit or wave events. */
export class UltimateCharge {
  static readonly maximum = 100;
  private value = 0;
  private killsRequired = 10;
  configure(killsRequired: number): void { this.killsRequired = Math.max(1, killsRequired); }
  get energy(): number { return this.value; }
  get ready(): boolean { return this.value === UltimateCharge.maximum; }
  onKill(source: DamageSource = 'spell'): void {
    if (source === 'spell') this.value = Math.min(UltimateCharge.maximum, this.value + UltimateCharge.maximum / this.killsRequired);
  }
  fill(): void { this.value = UltimateCharge.maximum; }
  consume(): boolean {
    if (!this.ready) return false;
    this.value = 0; return true;
  }
  reset(): void { this.value = 0; }
}
