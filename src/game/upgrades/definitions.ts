export type FireModule = 'damage' | 'multi' | 'pierce' | 'explosion';
export type Passive = 'speed' | 'health' | 'shield' | 'cooldown';
export type UpgradeEffect = { kind: 'fire'; module: FireModule } | { kind: 'passive'; stat: Passive };
export interface UpgradeDefinition { id: string; name: string; description: string; maxStacks: number; effect: UpgradeEffect }
export const UPGRADES: readonly UpgradeDefinition[] = [
  { id: 'fire.damage', name: '灼热增幅', description: '按基础伤害增加 30%，保留其他火球能力。', maxStacks: 2, effect: { kind: 'fire', module: 'damage' } },
  { id: 'fire.multi', name: '多重火球', description: '增加 2 枚扇形弹丸；每枚使用强化后伤害的 65%。', maxStacks: 2, effect: { kind: 'fire', module: 'multi' } },
  { id: 'fire.pierce', name: '穿透火球', description: '每枚火球可额外命中 1 个不同目标。', maxStacks: 2, effect: { kind: 'fire', module: 'pierce' } },
  { id: 'fire.explosion', name: '冲击爆炸', description: '每枚首次命中产生范围溅射，之后仍可继续穿透；同次施法每个目标最多受到一次溅射。', maxStacks: 1, effect: { kind: 'fire', module: 'explosion' } },
  { id: 'passive.speed', name: '轻盈步伐', description: '基础移动速度 +8%。', maxStacks: 3, effect: { kind: 'passive', stat: 'speed' } },
  { id: 'passive.health', name: '生命扩容', description: '最大生命 +20，同时恢复 20 点生命。', maxStacks: 3, effect: { kind: 'passive', stat: 'health' } },
  { id: 'passive.shield', name: '魔法护盾', description: '护盾容量 +20，10 秒未受伤后恢复；先吸收伤害。', maxStacks: 3, effect: { kind: 'passive', stat: 'shield' } },
  { id: 'passive.cooldown', name: '施法加速', description: '按基础值降低施法冷却 10%，保留当前冷却进度。', maxStacks: 3, effect: { kind: 'passive', stat: 'cooldown' } },
];
export const definition = (id: string): UpgradeDefinition | undefined => UPGRADES.find(item => item.id === id);
