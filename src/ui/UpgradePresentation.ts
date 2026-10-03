import type { GameMode } from '../game/modes';

/** Short selection copy; combat parameters remain in the shared build compiler. */
export const UPGRADE_PRESENTATION: Record<string, { symbol: string; summary: string }> = {
  'skill.fire.power': {symbol:'✹', summary:'焰爆打击更强。'},
  'skill.fire.reach': {symbol:'✹', summary:'焰爆覆盖更广。'},
  'skill.fire.tempo': {symbol:'✹', summary:'焰爆更快充能。'},
  'skill.ice.power': {symbol:'❄', summary:'冰棘扇阵打击更强。'},
  'skill.ice.reach': {symbol:'❄', summary:'冰棘扇阵覆盖更广。'},
  'skill.ice.tempo': {symbol:'❄', summary:'冰棘扇阵更快充能。'},
  'skill.lightning.power': {symbol:'ϟ', summary:'贯雷打击更强。'},
  'skill.lightning.reach': {symbol:'ϟ', summary:'贯雷覆盖更广。'},
  'skill.lightning.tempo': {symbol:'ϟ', summary:'贯雷更快充能。'},
  'ultimate.fire.power': {symbol:'✹', summary:'火墙的冲击更强。'},
  'ultimate.fire.reach': {symbol:'➶', summary:'火墙向更远处推进。'},
  'ultimate.fire.mastery': {symbol:'✺', summary:'追加一轮向前推进的火墙。'},
  'ultimate.ice.power': {symbol:'❄', summary:'永冬寒域的持续伤害更强。'},
  'ultimate.ice.reach': {symbol:'◎', summary:'永冬寒域覆盖更广的敌群。'},
  'ultimate.ice.mastery': {symbol:'❅', summary:'永冬寒域维持更久，更快积累冻结。'},
  'ultimate.lightning.power': {symbol:'ϟ', summary:'每次落雷的威力更强。'},
  'ultimate.lightning.reach': {symbol:'↗', summary:'雷暴锁定更远处的敌人。'},
  'ultimate.lightning.mastery': {symbol:'⌁', summary:'追加一轮追猎落雷。'},
  'fire.rebound': {symbol:'↶',summary:'火球折返追随角色，回程继承去程贯穿能力，只造成直接伤害，不触发附加效果；强化回程威力。'},
  'fire.burn': {symbol:'♨',summary:'火球点燃敌人，死亡传播火种并留下火区；强化燃烧与火区威力。'},
  'fire.damage': { symbol:'✹', summary:'让每一枚火球更有威力。' },
  'fire.multi': { symbol:'⋔', summary:'同时射出更多火球，单枚威力降低。' },
  'fire.pierce': { symbol:'➶', summary:'火球贯穿敌人，继续击中后方目标。' },
  'fire.explosion': { symbol:'✺', summary:'首次命中引发爆炸，波及周围敌人。' },
  'ice.ground': {symbol:'♜',summary:'冰矛在射程末端落地驻留，持续伤害并减速；强化驻留威力、范围与时间。'},
  'ice.shards': {symbol:'❈',summary:'寒霜中的敌人死亡时迸出冰片，打击并减速附近敌人；强化冰片数量与威力。'},
  'ice.damage': { symbol:'❄', summary:'提高冰矛伤害，同时增强已获得的落地冰棘和碎冰伤害。' },
  'ice.radius': { symbol:'◎', summary:'命中迸出冰片，落地冰棘半径扩大一半；继续强化冰片。' },
  'ice.cold': { symbol:'❅', summary:'敌人减速更明显，寒意持续更久。' },
  'ice.echo': { symbol:'◉', summary:'从角色当前位置追加较短射程冰矛，一次最多四根，移动可铺开落点。' },
  'lightning.fork': {symbol:'⋔',summary:'连锁分出较弱电弧，打击主链外的敌人；强化分叉覆盖与威力。'},
  'lightning.charge': {symbol:'✺',summary:'普攻、贯雷和雷暴追猎共用雷印，蓄满放电；死亡也放电，剩余电荷越多，威力与范围越大。'},
  'lightning.damage': { symbol:'ϟ', summary:'增强电击威力，让每次跳跃更致命。' },
  'lightning.chain': { symbol:'⌁', summary:'闪电继续跳跃，连接更多敌人。' },
  'lightning.range': { symbol:'↗', summary:'电弧延伸更远，更容易连接怪群。' },
  'lightning.conduction': { symbol:'✧', summary:'减少连锁中的威力损失。' },
  'passive.speed': { symbol:'➳', summary:'移动更快，轻松拉开距离。' },
  'passive.health': { symbol:'♥', summary:'提高生命上限，并恢复生命。' },
  'passive.shield': { symbol:'◇', summary:'护盾吸收伤害，脱战后自动恢复。' },
  'passive.cooldown': { symbol:'◷', summary:'缩短施法间隔，更频繁地释放法术。' },
};

const ENDLESS_SUMMARIES: Readonly<Record<string, string>> = {
  'lightning.chain': '主链连接更多敌人，最多 18 个；数量封顶后继续增伤。',
  'fire.multi': '增加扇形火球，最多 9 枚；数量封顶后继续增伤。单枚威力只降低一次。',
  'fire.pierce': '每枚火球贯穿更多敌人，最多 36 个；数量封顶后继续增伤，不增加飞行距离。',
  'fire.explosion': '首次命中爆炸，后续穿透不再引爆。范围与威力持续强化，范围封顶后仍增伤；同次施法对每个敌人只溅射一次。',
};

/** Choice cards and owned cards share the same mode-specific explanation. */
export function upgradeSummary(id: string, mode: GameMode): string {
  return (mode === 'endless' ? ENDLESS_SUMMARIES[id] : undefined)
    ?? UPGRADE_PRESENTATION[id]?.summary ?? '增强战斗能力。';
}
