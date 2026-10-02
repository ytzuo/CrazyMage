/** Active-time limits shared by combat, spawning and artwork. */
export const SPECIAL_ENEMIES = {
  bomber: { maximum: 3, firstWave: 6, trigger: 150, radius: 110, ringInner: 80, ringOuter: 180, ringDelay: 1050, feedback: 300, friendlyMultiplier: 3 },
  priest: { maximum: 2, firstWave: 8, targets: 3, shieldDuration: 4000, shieldFraction: 0.25, wardDuration: 4000, wardRadius: 140, reduction: 0.3 },
  variantChance: 0.18,
  maximumBlasts: 6,
} as const;
