export interface FireFieldSpec {readonly damage:number;readonly radius:number;readonly duration:number}
/** Immutable ignition snapshot; only direct ignitions may spread on death. */
export interface BurnSpec {
  readonly field?: FireFieldSpec | null;
  readonly damage: number;
  readonly duration: number;
  readonly radius: number;
  readonly targets: number;
}
