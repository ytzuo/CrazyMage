export type School = 'fire' | 'ice' | 'lightning';
export const SCHOOLS: readonly School[] = ['fire', 'ice', 'lightning'];
export const SCHOOL_INFO = {
  fire: {name:'火焰', spell:'火球', symbol:'✹', description:'定向火球，逐步叠加多重、穿透与爆炸。'},
  ice: {name:'冰霜', spell:'冰环', symbol:'❄', description:'近身冰环减速怪群，强化范围、寒意与回响。'},
  lightning: {name:'闪电', spell:'连锁闪电', symbol:'ϟ', description:'定向电击在怪群中跳跃，强化连锁、距离与传导。'},
} as const;
export const isSchool = (value:string): value is School => SCHOOLS.includes(value as School);
export type FireModule = 'damage' | 'multi' | 'pierce' | 'explosion' | 'burn';
export type IceModule = 'damage' | 'radius' | 'cold' | 'echo';
export type LightningModule = 'damage' | 'chain' | 'range' | 'conduction';
export type SpellModule = FireModule | IceModule | LightningModule;
export type Passive = 'speed' | 'health' | 'shield' | 'cooldown';
export type SkillModule = 'power' | 'reach' | 'tempo';
export type UltimateModule = 'power' | 'reach' | 'mastery';
export type UpgradeEffect = { kind:'skill'; school:School; module:SkillModule } | { kind: 'ultimate'; school: School; module: UltimateModule } | { kind: 'fire'; module: FireModule } | { kind: 'ice'; module: IceModule } | { kind: 'lightning'; module: LightningModule } | { kind: 'passive'; stat: Passive };
export const SPELL_MAX_LEVEL = 8;
export interface UpgradeDefinition { id: string; name: string; description: string; maxStacks: number; effect: UpgradeEffect }
export const UPGRADES: readonly UpgradeDefinition[] = [
  {id:'skill.fire.power',name:'烈焰凝聚',description:'提升焰爆的威力。',maxStacks:3,effect:{kind:'skill',school:'fire',module:'power'}},
  {id:'skill.fire.reach',name:'焰浪扩张',description:'扩大焰爆的覆盖范围。',maxStacks:3,effect:{kind:'skill',school:'fire',module:'reach'}},
  {id:'skill.fire.tempo',name:'余火复燃',description:'让焰爆更快充能。',maxStacks:3,effect:{kind:'skill',school:'fire',module:'tempo'}},
  {id:'skill.ice.power',name:'寒霜重压',description:'提升寒霜脉冲的威力。',maxStacks:3,effect:{kind:'skill',school:'ice',module:'power'}},
  {id:'skill.ice.reach',name:'寒潮扩散',description:'扩大寒霜脉冲的覆盖范围。',maxStacks:3,effect:{kind:'skill',school:'ice',module:'reach'}},
  {id:'skill.ice.tempo',name:'冰息循环',description:'让寒霜脉冲更快充能。',maxStacks:3,effect:{kind:'skill',school:'ice',module:'tempo'}},
  {id:'skill.lightning.power',name:'雷光增幅',description:'提升贯雷的威力。',maxStacks:3,effect:{kind:'skill',school:'lightning',module:'power'}},
  {id:'skill.lightning.reach',name:'贯雷延伸',description:'扩大贯雷的覆盖范围。',maxStacks:3,effect:{kind:'skill',school:'lightning',module:'reach'}},
  {id:'skill.lightning.tempo',name:'电能循环',description:'让贯雷更快充能。',maxStacks:3,effect:{kind:'skill',school:'lightning',module:'tempo'}},
  { id: 'fire.damage', name: '灼热增幅', description: '按基础伤害增加 30%，保留其他火球能力。', maxStacks: 2, effect: { kind: 'fire', module: 'damage' } },
  { id: 'fire.multi', name: '多重火球', description: '增加 2 枚扇形弹丸；每枚使用强化后伤害的 65%。', maxStacks: 2, effect: { kind: 'fire', module: 'multi' } },
  { id: 'fire.pierce', name: '穿透火球', description: '每枚火球可额外命中 1 个不同目标。', maxStacks: 2, effect: { kind: 'fire', module: 'pierce' } },
  {id:'fire.burn',name:'灼烧蔓延',description:'火球命中点燃敌人，死亡向附近传播一代火种。',maxStacks:2,effect:{kind:'fire',module:'burn'}},
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
/** Boss rewards have their own pool and never consume a normal spell level or passive slot. */
export const ULTIMATE_UPGRADES: readonly UpgradeDefinition[] = [
  { id:'ultimate.fire.power', name:'烈焰洪流', description:'火墙的冲击更强。', maxStacks:3, effect:{kind:'ultimate',school:'fire',module:'power'} },
  { id:'ultimate.fire.reach', name:'燎原之势', description:'火墙向更远处推进。', maxStacks:3, effect:{kind:'ultimate',school:'fire',module:'reach'} },
  { id:'ultimate.fire.mastery', name:'余烬续燃', description:'追加一轮向前推进的火墙。', maxStacks:3, effect:{kind:'ultimate',school:'fire',module:'mastery'} },
  { id:'ultimate.ice.power', name:'极寒冲击', description:'冰封瞬间的寒潮冲击更强。', maxStacks:3, effect:{kind:'ultimate',school:'ice',module:'power'} },
  { id:'ultimate.ice.reach', name:'凛冬疆域', description:'冰封覆盖更广的敌群。', maxStacks:3, effect:{kind:'ultimate',school:'ice',module:'reach'} },
  { id:'ultimate.ice.mastery', name:'永冻冰棺', description:'冰块维持更久，留下更从容的处决机会。', maxStacks:3, effect:{kind:'ultimate',school:'ice',module:'mastery'} },
  { id:'ultimate.lightning.power', name:'天罚重击', description:'每次落雷的威力更强。', maxStacks:3, effect:{kind:'ultimate',school:'lightning',module:'power'} },
  { id:'ultimate.lightning.reach', name:'雷云扩张', description:'雷暴锁定更远处的敌人。', maxStacks:3, effect:{kind:'ultimate',school:'lightning',module:'reach'} },
  { id:'ultimate.lightning.mastery', name:'雷鸣不息', description:'追加一轮追猎落雷。', maxStacks:3, effect:{kind:'ultimate',school:'lightning',module:'mastery'} },
];
export const definition = (id: string): UpgradeDefinition | undefined => [...UPGRADES, ...ULTIMATE_UPGRADES].find(item => item.id === id);
