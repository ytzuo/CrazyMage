import type { GameMode } from '../modes';
/** Wave growth is bounded independently of the global live-enemy budget. */
export const WAVE_LIMITS = { initialCount: 6, countStep: 2, maximumCount: 24, healthStep: 0.08, maximumHealth: 2.5, damageStep: 0.06, maximumDamage: 2, speedStep: 0.02, maximumSpeed: 1.2 } as const;
export function waveDifficulty(wave: number, mode: GameMode = 'race') {
  const progress = Math.max(0, Math.floor(wave) - 1);
  if(mode === 'endless') return {count:6+progress*2,health:1+progress*0.12+progress*progress*0.002,damage:1+progress*0.08,speed:1+0.6*progress/(progress+25)};
  return {
    count: Math.min(WAVE_LIMITS.maximumCount, WAVE_LIMITS.initialCount + progress * WAVE_LIMITS.countStep),
    health: Math.min(WAVE_LIMITS.maximumHealth, 1 + progress * WAVE_LIMITS.healthStep),
    damage: Math.min(WAVE_LIMITS.maximumDamage, 1 + progress * WAVE_LIMITS.damageStep),
    speed: Math.min(WAVE_LIMITS.maximumSpeed, 1 + progress * WAVE_LIMITS.speedStep),
  };
}
