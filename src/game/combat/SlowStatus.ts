/** One bounded slow per enemy; repeat hits refresh rather than accumulate strength. */
export class SlowStatus {
  strength=0;
  remaining=0;
  apply(strength:number,duration:number): void {
    this.strength=Math.max(this.strength,Math.min(0.75,Math.max(0,strength)));
    this.remaining=Math.max(this.remaining,Math.max(0,duration));
  }
  update(delta:number): void {
    this.remaining=Math.max(0,this.remaining-delta);
    if(!this.remaining)this.strength=0;
  }
}
