/** Immutable ignition snapshot; only direct ignitions may spread on death. */
export interface BurnSpec {
  readonly damage: number;
  readonly duration: number;
  readonly radius: number;
  readonly targets: number;
}
