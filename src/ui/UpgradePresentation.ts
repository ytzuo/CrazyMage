/** Short selection copy; combat parameters remain in the shared build compiler. */
export const UPGRADE_PRESENTATION: Record<string, { symbol: string; summary: string }> = {
  'fire.damage': { symbol:'✹', summary:'让每一枚火球更有威力。' },
  'fire.multi': { symbol:'⋔', summary:'同时射出更多火球，单枚威力降低。' },
  'fire.pierce': { symbol:'➶', summary:'火球贯穿敌人，继续击中后方目标。' },
  'fire.explosion': { symbol:'✺', summary:'首次命中引发爆炸，波及周围敌人。' },
  'ice.damage': { symbol:'❄', summary:'寒潮冲击更强，保留已有控场效果。' },
  'ice.radius': { symbol:'◎', summary:'冰环覆盖更广，回响也随之扩大。' },
  'ice.cold': { symbol:'❅', summary:'敌人减速更明显，寒意持续更久。' },
  'ice.echo': { symbol:'◉', summary:'冰环在原地再次释放，每次威力降低。' },
  'lightning.damage': { symbol:'ϟ', summary:'增强电击威力，让每次跳跃更致命。' },
  'lightning.chain': { symbol:'⌁', summary:'闪电继续跳跃，连接更多敌人。' },
  'lightning.range': { symbol:'↗', summary:'电弧延伸更远，更容易连接怪群。' },
  'lightning.conduction': { symbol:'✧', summary:'减少连锁中的威力损失。' },
  'passive.speed': { symbol:'➳', summary:'移动更快，轻松拉开距离。' },
  'passive.health': { symbol:'♥', summary:'提高生命上限，并恢复生命。' },
  'passive.shield': { symbol:'◇', summary:'护盾吸收伤害，脱战后自动恢复。' },
  'passive.cooldown': { symbol:'◷', summary:'缩短施法间隔，更频繁地释放法术。' },
};
