import type { BuildSnapshot } from '../game/upgrades/BuildStore';
import { stacks, type EffectiveBuild } from '../game/upgrades/build';
import { SCHOOL_SKILLS } from '../game/spells/SchoolSkill';
import { UPGRADE_PRESENTATION, upgradeSummary } from './UpgradePresentation';
import { definition, SCHOOL_INFO, SPELL_MAX_LEVEL, UPGRADES, ULTIMATE_UPGRADES } from '../game/upgrades/definitions';
export const number = (value: number): string => Number(value.toFixed(2)).toString();
export function spellSummary(effective: EffectiveBuild): string {
  if(effective.school === 'ice') {
    const i=effective.ice;
    return `${i.pulses} 枚冰矛 · 每次 ${number(i.damage)} 伤害 · ${number(i.cooldown)} ms · 射程 ${number(i.reach??560)} · 贯穿 ${i.maxTargets??3} 个目标 · 减速 ${number(i.slow*100)}% / ${number(i.duration/1000)}s`;
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
  private latest?: BuildSnapshot;
  private inspecting = false;
  private ritualBatch = '';
  private revealedBatch = '';
  private abort = new AbortController();
  constructor(private host: HTMLElement, private choose: (batch: string, id: string) => void, private toggleDetails: () => void) {
    host.addEventListener('click', event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!button) return;
      if (button.dataset.upgrade && button.dataset.batch) this.choose(button.dataset.batch, button.dataset.upgrade);
      if (button.dataset.close !== undefined || button.dataset.inspect !== undefined) this.toggleDetails();
    }, { signal: this.abort.signal });
    host.addEventListener('animationend', event => {
      if (event.animationName !== 'wave-ritual' || event.target !== host.querySelector('.wave-ritual')) return;
      if (!this.latest?.choice || this.inspecting || this.host.hidden) return;
      const batch = `${this.latest.build.runId}/${this.latest.choice.id}`;
      if (batch !== this.ritualBatch) return;
      this.revealedBatch = batch;
      this.key = '';
      this.update(this.latest, false);
    }, { signal: this.abort.signal });
    document.addEventListener('visibilitychange', () => {
      host.classList.toggle('ritual-sleep', document.hidden);
    }, { signal: this.abort.signal });
    host.classList.toggle('ritual-sleep', document.hidden);
    host.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const buttons = [...host.querySelectorAll<HTMLElement>('button, summary')];
      if (!buttons.length) { event.preventDefault(); return; }
      const current = buttons.indexOf(document.activeElement as HTMLElement);
      const next = (current + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
      event.preventDefault(); buttons[next].focus();
    }, { signal: this.abort.signal });
  }
  update(snapshot: BuildSnapshot, inspecting: boolean): void {
    this.latest = snapshot;
    this.inspecting = inspecting;
    const batch = snapshot.choice ? `${snapshot.build.runId}/${snapshot.choice.id}` : '';
    // Inspecting a build during the ritual dismisses it, so returning does not replay it.
    if (inspecting && batch === this.ritualBatch) this.revealedBatch = batch;
    if (!snapshot.choice) this.ritualBatch = '';
    const visible = inspecting || !!snapshot.choice;
    this.host.hidden = !visible;
    const key = `${snapshot.build.runId}/${snapshot.build.revision}/${snapshot.choice?.id}/${inspecting}`;
    if (!visible || key === this.key) return;
    this.key = key;
    if (!inspecting && snapshot.choice && this.revealedBatch !== batch) {
      this.ritualBatch = batch;
      this.host.innerHTML = this.ritual(snapshot);
      this.host.querySelector<HTMLElement>('.wave-ritual')?.focus({preventScroll:true});
      return;
    }
    const details = inspecting;
    const ultimateReward = snapshot.choice?.kind === 'ultimate';
    this.host.innerHTML = `<section class="build-card"><header><div><small class="wave-clear-label">${details ? '本局构筑' : `${snapshot.choice?.kind === 'ultimate' ? '♛ BOSS 战利品' : '✦'} 第 ${snapshot.choice?.wave} 波完成`}</small><h2>${details ? '你的法术组合' : snapshot.choice?.kind === 'ultimate' ? `选择一项${snapshot.effective.ultimate.name}强化` : '选择一项强化'}</h2></div>${details ? `<button data-close aria-label="${snapshot.choice ? '返回升级' : '关闭构筑'}">${snapshot.choice ? '返回升级' : '关闭'} ×</button>` : '<button data-inspect aria-label="查看已获取升级">查看构筑</button>'}</header>${details ? this.details(snapshot) : `<div class="level-route"><span>${SCHOOL_INFO[snapshot.build.school].symbol} ${SCHOOL_INFO[snapshot.build.school].name}</span>${ultimateReward ? `<b>${snapshot.effective.ultimate.name} · Q</b>` : `<div aria-label="法术等级 ${snapshot.build.spellLevel} / ${snapshot.build.mode==='endless'?'∞':SPELL_MAX_LEVEL}">${Array.from({length:snapshot.build.mode==='endless'?0:SPELL_MAX_LEVEL},(_,i)=>i+1).map(level=>`<i class="${level<=snapshot.build.spellLevel?'filled':''}"></i>`).join('')}</div><b>Lv.${snapshot.build.spellLevel}${snapshot.build.mode==='endless'?' / ∞':''}</b>`}</div>${this.options(snapshot)}`}</section>`;
    (this.host.querySelector<HTMLButtonElement>('[data-upgrade]') ?? this.host.querySelector<HTMLButtonElement>('button'))?.focus({ preventScroll: true });
  }
  private ritual(snapshot: BuildSnapshot): string {
    const school = snapshot.build.school, info = SCHOOL_INFO[school];
    const title = snapshot.choice?.kind === 'ultimate' ? '魔核觉醒' : {fire:'余烬凝聚', ice:'寒霜凝结', lightning:'雷光汇聚'}[school];
    return `<section class="wave-ritual ritual-${school}" tabindex="-1" role="status" aria-label="第 ${snapshot.choice!.wave} 波完成，${title}"><div class="ritual-art" aria-hidden="true"><i class="ritual-ring ring-outer"></i><i class="ritual-ring ring-inner"></i><b class="ritual-core">${info.symbol}</b>${Array.from({length:8},(_,i)=>`<span class="ritual-orbit" style="--orbit:${i}"><i class="ritual-mote"></i></span>`).join('')}${school==='lightning'?'<svg class="ritual-bolts" viewBox="0 0 240 240"><path d="M120 8L98 67L133 55L116 108M232 142L174 121L185 155L133 130M54 211L84 158L56 166L111 125"/></svg>':''}</div><small>第 ${snapshot.choice!.wave} 波 · 清理完成</small><h2>${title}</h2><div class="ritual-progress" aria-hidden="true"><i></i></div></section>`;
  }

  private options(snapshot: BuildSnapshot): string {
    return `<div class="upgrade-options reward-options">${snapshot.choice!.options.map((id, index) => {
      const card = definition(id)!;
      const passive = card.effect.kind === 'passive';
      const symbol = UPGRADE_PRESENTATION[id]?.symbol ?? '✦';
      const summary = upgradeSummary(id, snapshot.build.mode);
      const ultimate = card.effect.kind === 'ultimate';
      const skill = card.effect.kind === 'skill';
      const level = passive || ultimate || skill ? stacks(snapshot.build, card) + 1 : snapshot.build.spellLevel + 1;
      const category = skill ? `${snapshot.effective.skill.name} · E` : ultimate ? `${snapshot.effective.ultimate.name} · Q` : passive ? '被动强化' : `${SCHOOL_INFO[snapshot.build.school].name}法术`;
      return `<button class="upgrade-option reward-card school-${snapshot.build.school}${passive ? ' reward-passive' : ultimate ? ' reward-ultimate' : ''}" style="--card-index:${index}" data-upgrade="${id}" data-batch="${snapshot.choice!.id}"><span class="reward-turner"><span class="reward-face reward-back" aria-hidden="true"><span class="reward-back-seal">✦</span></span><span class="reward-face reward-front"><span class="reward-category">${category}<small>Lv.${level}</small></span><span class="reward-emblem" aria-hidden="true">${symbol}</span><strong class="reward-title">${card.name}</strong><span class="reward-description">${summary}</span><span class="reward-pick">选择强化 <i aria-hidden="true">↗</i></span></span></span></button>`;
    }).join('')}</div>`;
  }

  private details(snapshot: BuildSnapshot): string {
    const school=SCHOOL_INFO[snapshot.build.school];
    const ultimate=snapshot.effective.ultimate;
    const collection = [...UPGRADES,...ULTIMATE_UPGRADES].filter(card=>stacks(snapshot.build,card)>0).map(card=>{
      const id=card.id, count=stacks(snapshot.build,card);
      const passive=card.effect.kind==='passive', art=UPGRADE_PRESENTATION[id];
      return `<article class="owned-card school-${snapshot.build.school}${passive?' owned-passive':card.effect.kind==='ultimate'?' owned-ultimate':''}"><span class="owned-kind">${card.effect.kind==='skill'?`${snapshot.effective.skill.name} · E`:card.effect.kind==='ultimate'?`${ultimate.name} · Q`:passive?'被动':'法术强化'}<b>×${count}</b></span><span class="owned-symbol" aria-hidden="true">${art?.symbol ?? '✦'}</span><h4>${card.name}</h4><p>${upgradeSummary(id, snapshot.build.mode)}</p></article>`;
    }).join('');
    return `<div class="build-details"><h3>${school.name} · ${school.spell}</h3><p>${school.description}</p><h3>${SCHOOL_SKILLS[snapshot.build.school].name} · E</h3><p>${SCHOOL_SKILLS[snapshot.build.school].description}</p><h3>${ultimate.name} · Q</h3><p>${ultimate.description}</p><p>普通击杀充能，击杀 Boss 立即充满；满能量后释放。</p><h3>获取的强化</h3><div class="owned-cards">${collection || '<p class="owned-empty">尚未获取强化</p>'}</div></div>`;
  }
  destroy(): void { this.abort.abort(); }
}
