export type DamageSource = 'spell' | 'ultimate' | 'ultimate-explosion';
/** Count whole kills; percentage is derived only for the visual progress bar. */
export class UltimateCharge {
  static readonly maximum = 100;
  private value = 0;
  private killsRequired = 10;
  configure(killsRequired: number): void {
    const next=Math.max(1,Math.floor(killsRequired));
    if(next===this.killsRequired)return;
    this.value=Math.min(next,Math.floor(this.value/this.killsRequired*next));
    this.killsRequired=next;
  }
  get kills():number{return this.value;}
  get requiredKills():number{return this.killsRequired;}
  get energy(): number { return this.value/this.killsRequired*UltimateCharge.maximum; }
  get ready(): boolean { return this.value === this.killsRequired; }
  onKill(source: DamageSource = 'spell'): void {
    if (source === 'spell' || source === 'ultimate-explosion') this.value = Math.min(this.killsRequired, this.value + 1);
  }
  fill(): void { this.value = this.killsRequired; }
  consume(): boolean {
    if (!this.ready) return false;
    this.value = 0; return true;
  }
  reset(): void { this.value = 0; }
}
