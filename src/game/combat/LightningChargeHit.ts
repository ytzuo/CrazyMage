import type { Enemy, EnemySystem } from '../enemies/EnemySystem';
import type { DamageSource } from '../ultimates/UltimateCharge';
/** Receives an effective lightning hit; one burst-hit set is shared by a release/pulse. */
export type LightningChargeHit = (enemy:Enemy,enemies:EnemySystem,burstHits:Set<number>,source:DamageSource)=>void;
