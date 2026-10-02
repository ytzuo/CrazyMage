/** Immutable ice-ring snapshot; secondary shards never inherit these effects. */
export interface IceShardSpec {
  readonly damage: number;
  readonly targets: number;
  readonly radius: number;
  readonly slow: number;
  readonly duration: number;
}
export interface IceEffectsSpec {
  readonly shards: IceShardSpec | null;
  readonly frost: Readonly<{ gain: number; threshold: number; duration: number }> | null;
}
