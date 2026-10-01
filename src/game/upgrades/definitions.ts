export type School = 'fire' | 'ice' | 'lightning';
export const SCHOOLS: readonly School[] = ['fire', 'ice', 'lightning'];
export const SCHOOL_INFO = {
  fire: {name:'火焰', spell:'火球', symbol:'✹', description:'定向火球，逐步叠加多重、穿透与爆炸。'},
  ice: {name:'冰霜', spell:'冰环', symbol:'❄', description:'近身冰环减速怪群，强化范围、寒意与回响。'},
  lightning: {name:'闪电', spell:'连锁闪电', symbol:'ϟ', description:'定向电击在怪群中跳跃，强化连锁、距离与传导。'},
} as const;
export const isSchool = (value:string): value is School => SCHOOLS.includes(value as School);
export type FireModule = 'damage' | 'multi' | 'pierce' | 'explosion';
export type IceModule = 'damage' | 'radius' | 'cold' | 'echo';
export type LightningModule = 'damage' | 'chain' | 'range' | 'conduction';
export type SpellModule = FireModule | IceModule | LightningModule;
export type Passive = 'speed' | 'health' | 'shield' | 'cooldown';
export type UpgradeEffect = { kind: 'fire'; module: FireModule } | { kind: 'ice'; module: IceModule } | { kind: 'lightning'; module: LightningModule } | { kind: 'passive'; stat: Passive };
export interface UpgradeDefinition { id: string; name: string; description: string; maxStacks: number; effect: UpgradeEffect }
export const UPGRADES: readonly UpgradeDefinition[] = [
  { id: 'fire.damage', name: '灼热增幅', description: '按基础伤害增加 30%，保留其他火球能力。', maxStacks: 2, effect: { kind: 'fire', module: 'damage' } },
  { id: 'fire.multi', name: '多重火球', description: '增加 2 枚扇形弹丸；每枚使用强化后伤害的 65%。', maxStacks: 2, effect: { kind: 'fire', module: 'multi' } },
  { id: 'fire.pierce', name: '穿透火球', description: '每枚火球可额外命中 1 个不同目标。', maxStacks: 2, effect: { kind: 'fire', module: 'pierce' } },
  { id: 'fire.explosion', name: '冲击爆炸', description: '每枚首次命中产生范围溅射，之后仍可继续穿透；同次施法每个目标最多受到一次溅射。', maxStacks: 1, effect: { kind: 'fire', module: 'explosion' } },
  { id: 'ice.damage', name: '凛冬冲击', description: '按基础值增加冰环伤害 30%，保留寒意与回响。', maxStacks: 2, effect: { kind: 'ice', module: 'damage' } },
  { id: 'ice.radius', name: '扩大冰环', description: '按基础值扩大冰环半径 25%，每次回响也生效。', maxStacks: 2, effect: { kind: 'ice', module: 'radius' } },
  { id: 'ice.cold', name: '深度寒霜', description: '减速增加 10 个百分点，持续时间增加 0.5 秒；重复命中刷新，不无限叠加。', maxStacks: 2, effect: { kind: 'ice', module: 'cold' } },
  { id: 'ice.echo', name: '寒潮回响', description: '施放后 180 ms 在原地再释放一次冰环，每次伤害为强化后伤害的 75%。', maxStacks: 1, effect: { kind: 'ice', module: 'echo' } },
  { id: 'lightning.damage', name: '电能增幅', description: '按基础值增加闪电伤害 30%，所有跳跃保留伤害增幅。', maxStacks: 2, effect: { kind: 'lightning', module: 'damage' } },
  { id: 'lightning.chain', name: '更多跳跃', description: '额外连锁 2 个不同目标，同次施法不重复命中。', maxStacks: 2, effect: { kind: 'lightning', module: 'chain' } },
  { id: 'lightning.range', name: '延伸电弧', description: '按基础值增加首击和连锁距离 25%。', maxStacks: 2, effect: { kind: 'lightning', module: 'range' } },
  { id: 'lightning.conduction', name: '稳定传导', description: '每跳保留的伤害由 80% 提高到 95%，兼容增伤、跳跃与距离强化。', maxStacks: 1, effect: { kind: 'lightning', module: 'conduction' } },
  { id: 'passive.speed', name: '轻盈步伐', description: '基础移动速度 +8%。', maxStacks: 3, effect: { kind: 'passive', stat: 'speed' } },
  { id: 'passive.health', name: '生命扩容', description: '最大生命 +20，同时恢复 20 点生命。', maxStacks: 3, effect: { kind: 'passive', stat: 'health' } },
  { id: 'passive.shield', name: '魔法护盾', description: '护盾容量 +20，10 秒未受伤后恢复；先吸收伤害。', maxStacks: 3, effect: { kind: 'passive', stat: 'shield' } },
  { id: 'passive.cooldown', name: '施法加速', description: '按基础值降低施法冷却 10%，保留当前冷却进度。', maxStacks: 3, effect: { kind: 'passive', stat: 'cooldown' } },
];
export const definition = (id: string): UpgradeDefinition | undefined => UPGRADES.find(item => item.id === id);
