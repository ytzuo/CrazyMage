import type { BuildSnapshot } from '../game/upgrades/BuildStore';
import { stacks, type EffectiveBuild } from '../game/upgrades/build';
import { definition, SCHOOL_INFO } from '../game/upgrades/definitions';
export const number = (value: number): string => Number(value.toFixed(2)).toString();
export function spellSummary(effective: EffectiveBuild): string {
  if(effective.school === 'ice') {
    const i=effective.ice;
    return `${i.pulses} 次冰环 · 每次 ${number(i.damage)} 伤害 · ${number(i.cooldown)} ms · 半径 ${number(i.radius)} · 减速 ${number(i.slow*100)}% / ${number(i.duration/1000)}s`;
  }
  if(effective.school === 'lightning') {
    const l=effective.lightning;
    return `首击 ${number(l.damage)} 伤害 · ${number(l.cooldown)} ms · ${l.maxTargets} 个目标 · 首击 ${number(l.range)} / 跳跃 ${number(l.jumpRange)} · 每跳保留 ${number(l.falloff*100)}%`;
  }
  const f = effective.fireball;
  return `${f.count} 枚 · 单枚 ${number(f.damage)} 伤害 · ${number(f.cooldown)} ms · 每枚 ${f.maxTargets} 个目标${f.explosion ? ` · 爆炸半径 ${f.explosion.radius}` : ''}`;
}
/** UI displays the same compiled values used by spell runtime, without computing combat rules. */
export class BuildPanel {
  private key = '';
  private abort = new AbortController();
  constructor(private host: HTMLElement, private preview: (id: string) => EffectiveBuild, private choose: (batch: string, id: string) => void, private toggleDetails: () => void) {
    host.addEventListener('click', event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!button) return;
      if (button.dataset.upgrade && button.dataset.batch) this.choose(button.dataset.batch, button.dataset.upgrade);
      if (button.dataset.close !== undefined || button.dataset.inspect !== undefined) this.toggleDetails();
    }, { signal: this.abort.signal });
    host.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const buttons = [...host.querySelectorAll<HTMLButtonElement>('button')];
      if (!buttons.length) return;
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = (current + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
      event.preventDefault(); buttons[next].focus();
    }, { signal: this.abort.signal });
  }
  update(snapshot: BuildSnapshot, inspecting: boolean): void {
    const visible = inspecting || !!snapshot.choice;
    this.host.hidden = !visible;
    const key = `${snapshot.build.runId}/${snapshot.build.revision}/${snapshot.choice?.id}/${inspecting}`;
    if (!visible || key === this.key) return;
    this.key = key;
    const details = inspecting;
    this.host.innerHTML = `<section class="build-card"><header><div><small class="wave-clear-label">${details ? '本局构筑' : `✦ 第 ${snapshot.choice?.wave} 波完成`}</small><h2>${details ? '你的法术组合' : '选择一项强化'}</h2></div>${details ? `<button data-close aria-label="${snapshot.choice ? '返回升级' : '关闭构筑'}">${snapshot.choice ? '返回升级' : '关闭'} ×</button>` : '<button data-inspect aria-label="查看已获取升级">查看构筑</button>'}</header>${details ? this.details(snapshot) : `<div class="level-route"><span>${SCHOOL_INFO[snapshot.build.school].symbol} ${SCHOOL_INFO[snapshot.build.school].name}</span><div aria-label="法术等级 ${snapshot.build.spellLevel} / 4">${[1,2,3,4].map(level=>`<i class="${level<=snapshot.build.spellLevel?'filled':''}"></i>`).join('')}</div><b>Lv.${snapshot.build.spellLevel}</b></div>${this.options(snapshot)}`}</section>`;
    this.host.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  }
  private options(snapshot: BuildSnapshot): string {
    return `<div class="upgrade-options">${snapshot.choice!.options.map(id => {
      const card = definition(id)!;
      const after = this.preview(id);
      const p = after.player, before = snapshot.effective.player;
      const change = card.effect.kind !== 'passive' || card.id === 'passive.cooldown'
        ? `${spellSummary(snapshot.effective)} → ${spellSummary(after)}`
        : `移速 ${number(before.speed)} → ${number(p.speed)} · 生命 ${before.maximum} → ${p.maximum} · 护盾 ${before.shield} → ${p.shield}`;
      return `<button class="upgrade-option school-${snapshot.build.school}" style="--card-index:${snapshot.choice!.options.indexOf(id)}" data-upgrade="${id}" data-batch="${snapshot.choice!.id}"><b class="upgrade-symbol" aria-hidden="true">${card.effect.kind==='passive'?'◇':SCHOOL_INFO[snapshot.build.school].symbol}</b><small>${card.effect.kind !== 'passive' ? `${SCHOOL_INFO[snapshot.build.school].spell} Lv.${snapshot.build.spellLevel} → Lv.${snapshot.build.spellLevel + 1}` : `被动 Lv.${stacks(snapshot.build, card)} → Lv.${stacks(snapshot.build, card) + 1}`}</small><h3>${card.name}</h3><p>${card.description}</p><p class="upgrade-change">${change}</p><span>选择 →</span></button>`;
    }).join('')}</div>`;
  }
  private details(snapshot: BuildSnapshot): string {
    const p = snapshot.effective.player;
    const history = snapshot.history.map(entry => `<li><time>${Math.floor(entry.elapsed / 60000)}:${String(Math.floor(entry.elapsed / 1000) % 60).padStart(2, '0')}</time> · 第 ${entry.wave} 波 · ${definition(entry.id)!.name} · Lv.${entry.level}</li>`).join('');
    return `<div class="build-details"><h3>${SCHOOL_INFO[snapshot.build.school].name} · ${SCHOOL_INFO[snapshot.build.school].spell} Lv.${snapshot.build.spellLevel} / 4</h3><p>${spellSummary(snapshot.effective)}</p><p class="combination">${snapshot.build.school === 'fire' && snapshot.effective.fireball.maxTargets > 1 ? "每枚火球独立保留穿透。" : ""}${snapshot.build.school === 'fire' && snapshot.effective.fireball.explosion ? "首次命中爆炸，同次施法溅射不重复。" : ""}${snapshot.build.school === 'ice' ? "冰环与回响保留减速，重复命中刷新寒意。" : snapshot.build.school === 'lightning' ? "首击沿瞄准方向选敌，每次连锁不重复访问目标。" : ""}</p><h3>被动 ${Object.keys(snapshot.build.passives).length} / 3</h3><p>移速 ${number(p.speed)} · 生命上限 ${p.maximum} · 护盾容量 ${p.shield}</p><ul>${snapshot.effective.breakdown.map(text => `<li>${text}</li>`).join('') || '<li>尚未选择强化</li>'}</ul><h3>获取记录</h3><ol><li>开局 · ${SCHOOL_INFO[snapshot.build.school].spell} Lv.1（初始能力）</li>${history}</ol></div>`;
  }
  destroy(): void { this.abort.abort(); }
}
