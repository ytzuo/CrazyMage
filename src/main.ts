import Phaser from 'phaser';
import './style.css';
import { ARENA, PLAYER, type MovementState } from './game/config';
import { MovementInput } from './game/input/MovementInput';
import { ArenaScene } from './game/scenes/ArenaScene';
import { observePerformance } from './game/diagnostics/performance';
import { BuildPanel, spellSummary } from './ui/BuildPanel';
import { SchoolPicker } from './ui/SchoolPicker';
import { SCHOOL_SKILLS } from './game/spells/SchoolSkill';
import { ultimateSummary } from './game/ultimates/definitions';
import { BattleNotice } from './ui/BattleNotice';
import { SCHOOL_INFO, definition } from './game/upgrades/definitions';
import type { BuildSnapshot } from './game/upgrades/BuildStore';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="arena" aria-label="魔法试验场操控原型">
    <div id="game" role="application" tabindex="0" aria-label="WASD 移动，方向键施法，Q 释放大招；左下角摇杆可移动"></div>
    <nav class="arena-tools" aria-label="试验场控制">
      <button id="build" class="icon-button" title="查看构筑 (U)" aria-label="查看构筑">✦</button>
      <button id="reset" class="icon-button" title="重新开始" aria-label="重新开始">↺</button>
      <button id="pause" class="pause-button">Ⅱ <span>暂停</span></button>
    </nav>
    <aside class="health-hud" aria-label="角色生命值">
      <div class="health-heading"><span>生命</span><span id="health-value">${PLAYER.health} / ${PLAYER.health}</span></div>
      <div id="health-bar" class="health-track" role="progressbar" aria-label="生命值" aria-valuemin="0" aria-valuemax="${PLAYER.health}" aria-valuenow="${PLAYER.health}"><div id="health-fill"></div></div>
      <div id="shield-value" class="shield-value" hidden></div>
      <div class="upgrade-heading"><span id="spell-level">火球 Lv.1</span><span id="wave-remaining">本波剩余 6</span></div>
    </aside>
    <aside class="wave-status" aria-label="波次与本局时长"><span id="wave-number">第 1 波</span><div class="wave-timer">下一波 <b id="wave-countdown">30s</b></div><div class="run-timer">本局时长 <time id="run-time">00:00</time></div></aside>
    <div class="joystick-wrap"><div id="joystick" aria-label="虚拟摇杆：按住并拖动以移动角色"><span class="joystick-cross"></span><div id="joystick-knob"></div></div></div>
    <aside class="minimap" aria-label="竞技场小地图">
      <svg viewBox="0 0 ${ARENA.width} ${ARENA.height}" role="img" aria-label="亮点表示角色位置，红点表示怪物位置">
        <rect class="minimap-boundary" x="${ARENA.inset}" y="${ARENA.inset}" width="${ARENA.width - ARENA.inset * 2}" height="${ARENA.height - ARENA.inset * 2}" rx="36" />
        <circle class="minimap-center" cx="${ARENA.width / 2}" cy="${ARENA.height / 2}" r="180" />
        <g id="minimap-enemies" aria-hidden="true"></g>
        <g id="minimap-player" transform="translate(${ARENA.width / 2} ${ARENA.height / 2})">
          <circle class="minimap-player-halo" r="105" />
          <circle class="minimap-player-dot" r="48" />
        </g>
      </svg>
    </aside>
    <button id="skill" class="ultimate-button skill-button" type="button" disabled hidden>
      <span class="ultimate-key" aria-hidden="true">E</span><span class="ultimate-content"><strong id="skill-name"></strong><small id="skill-charge"></small><span class="ultimate-track" aria-hidden="true"><span id="skill-fill"></span></span></span>
    </button>
    <button id="ultimate" class="ultimate-button" type="button" disabled hidden>
      <span class="ultimate-key" aria-hidden="true">Q</span><span class="ultimate-content"><strong id="ultimate-name"></strong><small id="ultimate-charge">0 / 100</small><span class="ultimate-track" aria-hidden="true"><span id="ultimate-fill"></span></span></span>
    </button>
    <div id="battle-notice" class="battle-notice" role="status" aria-live="polite" hidden></div>
    <div id="school-overlay" class="build-overlay" role="dialog" aria-modal="true" aria-label="选择开局流派" hidden></div>
    <div id="build-overlay" class="build-overlay" role="dialog" aria-modal="true" aria-label="法术构筑与升级" hidden></div>
    <div id="pause-overlay" class="pause-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title" hidden>
      <div class="pause-card"><h2 id="pause-title">已暂停</h2><p id="death-duration" hidden></p><button id="resume">继续 <span>→</span></button></div>
    </div>
  </main>
`;

const element = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const movement = new MovementInput(element('joystick'), element('joystick-knob'));
const listeners = new AbortController();
const listenerOptions = { signal: listeners.signal };
let paused = false;
let dead = false;
let lastHealth = '';
let inspecting = false;
let latestBuild: BuildSnapshot | null = null;
let lastProgression = '';
let appliedPause = false;
let game: Phaser.Game;
let panel: BuildPanel;
let picker: SchoolPicker;
let selectingSchool = true;
let lastCombat = '';
let lastUltimate = '';
let lastSkill = '';
let ultimateEnergy = 0;
let ultimateCasts = 0;
let ultimateRun = -1;
let lastWave = 0;
let lastWaveSeconds = -1;
let lastRunSeconds = -1;
const minimapPlayer = document.querySelector<SVGGElement>('#minimap-player')!;
const minimapEnemies = document.querySelector<SVGGElement>('#minimap-enemies')!;
const enemyMarkers = new Map<number, SVGCircleElement>();
const notice = new BattleNotice(element('battle-notice'));
let lastEnemyCount = 0;
let minimapPosition = minimapPlayer.getAttribute('transform');
const scene = new ArenaScene(movement, (state: MovementState) => {
  const wasSelecting = selectingSchool;
  selectingSchool = state.selectingSchool;
  picker?.update(selectingSchool);
  const school = state.progression.build.school;
  const skillKey = `${school}/${state.skillEnergy}/${Math.ceil(state.skillRemaining/1000)}/${state.paused}/${selectingSchool}/${state.dead}/${state.progression.choice?.id}`;
  if (skillKey !== lastSkill) {
    const spec = SCHOOL_SKILLS[school], ready = state.skillRemaining === 0;
    const button = element<HTMLButtonElement>('skill');
    button.hidden = selectingSchool;
    button.disabled = !ready || state.paused || selectingSchool || state.dead || !!state.progression.choice;
    button.dataset.schoolTone = school;
    button.classList.toggle('ready', ready);
    button.title = spec.description;
    button.setAttribute('aria-label', `${spec.name}，${ready ? '已就绪，按 E 或点击释放' : `充能 ${state.skillEnergy}%`}`);
    element('skill-name').textContent = spec.name;
    element('skill-charge').textContent = ready ? '已就绪 · 100%' : `${state.skillEnergy}% · ${Math.ceil(state.skillRemaining/1000)}s`;
    element('skill-fill').style.transform = `scaleX(${state.skillEnergy/100})`;
    lastSkill = skillKey;
  }
  const ultimateKey = `${school}/${state.progression.build.revision}/${state.ultimateEnergy}/${state.paused}/${selectingSchool}/${state.dead}/${state.progression.choice?.id}`;
  if (ultimateKey !== lastUltimate) {
    const spec = state.progression.effective.ultimate;
    const ready = state.ultimateEnergy === 100;
    const button = element<HTMLButtonElement>('ultimate');
    button.hidden = selectingSchool;
    button.disabled = !ready || state.paused || selectingSchool || state.dead || !!state.progression.choice;
    button.dataset.schoolTone = school;
    button.classList.toggle('ready', ready);
    button.title = `${ultimateSummary(school, state.progression.build.spellLevel, state.progression.build.ultimateModules)}。普通击杀 +10 能量，大招击杀不回充；击杀 Boss 立即充满。范围内无目标时不消耗。`;
    button.setAttribute('aria-label', `${spec.name}，${ready ? '已就绪，按 Q 或点击释放' : `充能 ${state.ultimateEnergy}%`}`);
    element('ultimate-name').textContent = spec.name;
    element('ultimate-charge').textContent = ready ? '已就绪' : `${state.ultimateEnergy} / 100`;
    element('ultimate-fill').style.transform = `scaleX(${state.ultimateEnergy / 100})`;
    lastUltimate = ultimateKey;
  }
  if (ultimateRun === state.progression.build.runId && !selectingSchool) {
    if (state.ultimateCasts > ultimateCasts) notice.show(state.progression.effective.ultimate.name, '释放大招', school);
    else if (state.ultimateEnergy === 100 && ultimateEnergy < 100) notice.show('大招已就绪', state.progression.effective.ultimate.name, school);
  }
  ultimateRun = state.progression.build.runId;
  ultimateEnergy = state.ultimateEnergy; ultimateCasts = state.ultimateCasts;
  if(selectingSchool) notice.clear();
  if(!selectingSchool && lastEnemyCount > 0 && state.enemies === 0 && !state.dead && !state.progression.choice) notice.show('场上已清空', '下一波即将到来');
  lastEnemyCount = state.enemies;
  document.querySelector('.wave-status')!.classList.toggle('cleared', !selectingSchool && state.enemies === 0);
  element('build').toggleAttribute('disabled', selectingSchool || state.dead);
  element('pause').toggleAttribute('disabled', selectingSchool || state.dead);
  if(wasSelecting !== selectingSchool) queueMicrotask(syncPause);
  const runSeconds = Math.floor(state.elapsedTime / 1000);
  const duration = `${String(Math.floor(runSeconds / 60)).padStart(2, '0')}:${String(runSeconds % 60).padStart(2, '0')}`;
  if (runSeconds !== lastRunSeconds) { element('run-time').textContent = duration; lastRunSeconds = runSeconds; }
  const seconds = Math.ceil(state.nextWaveIn / 1000);
  if (state.wave !== lastWave) { element('wave-number').textContent = `第 ${state.wave} 波`; lastWave = state.wave; }
  if (seconds !== lastWaveSeconds) {
    element('wave-countdown').textContent = `${seconds}s`;
    element('wave-countdown').classList.toggle('soon', seconds <= 5);
    element('wave-countdown').classList.toggle('countdown-a', seconds <= 3 && seconds % 2 === 0);
    element('wave-countdown').classList.toggle('countdown-b', seconds <= 3 && seconds % 2 !== 0);
    lastWaveSeconds = seconds;
  }
  const healthKey = `${state.health}/${state.maxHealth}/${state.shield}`;
  if (healthKey !== lastHealth) {
    element('health-value').textContent = `${Number(state.health.toFixed(1))} / ${state.maxHealth}`;
    element('health-fill').style.transform = `scaleX(${state.health / state.maxHealth})`;
    element('health-bar').setAttribute('aria-valuenow', String(state.health));
    element('health-bar').setAttribute('aria-valuemax', String(state.maxHealth));
    element('health-bar').classList.toggle('low', state.health <= state.maxHealth * 0.3);
    element('shield-value').hidden = state.progression.effective.player.shield === 0;
    element('shield-value').textContent = `护盾 ${state.shield} / ${state.progression.effective.player.shield}`;
    lastHealth = healthKey;
  }
  const previousChoice = latestBuild?.choice?.id;
  latestBuild = state.progression;
  const progressKey = `${state.progression.build.runId}/${state.progression.build.revision}/${state.waveRemaining}`;
  if (progressKey !== lastProgression) {
    const { build } = state.progression;
    element('spell-level').textContent = selectingSchool ? '选择流派' : `${SCHOOL_INFO[build.school].spell} Lv.${build.spellLevel}`;
    element('wave-remaining').textContent = state.enemies === 0 && !selectingSchool ? '场上已清空' : `本波剩余 ${state.waveRemaining}`;
    element('spell-level').title = spellSummary(state.progression.effective);
    lastProgression = progressKey;
  }
  panel?.update(state.progression, inspecting);
  if (previousChoice !== state.progression.choice?.id) queueMicrotask(syncPause);
  if (import.meta.env.DEV) {
    const summary = JSON.stringify({ ultimateEnergy: state.ultimateEnergy, ultimateCasts: state.ultimateCasts, ultimateEffects: state.ultimateEffects, school: state.progression.build.school, selectingSchool, health: state.health, enemies: state.enemies, kills: state.kills, casts: state.casts, dead: state.dead, objects: state.objects, projectiles: state.projectiles, impacts: state.impacts, waveRemaining: state.waveRemaining, wave: state.wave, nextWaveIn: state.nextWaveIn, elapsedTime: state.elapsedTime, runId: state.progression.build.runId, revision: state.progression.build.revision, completedWaves: state.progression.completedWaves, choice: state.progression.choice?.id ?? null });
    if (summary !== lastCombat) { element('game').dataset.combat = summary; lastCombat = summary; }
  }
  if (dead !== state.dead) {
    dead = state.dead;
    element('pause').toggleAttribute('disabled', dead || selectingSchool);
    element('pause-title').textContent = dead ? '你倒下了' : '已暂停';
    element('death-duration').hidden = !dead;
    if (dead) element('death-duration').textContent = `本局时长 ${duration}`;
    element('resume').innerHTML = dead ? '重新开始 <span>↺</span>' : '继续 <span>→</span>';
    if (dead) { inspecting = false; panel?.update(state.progression, false); }
    element('pause-overlay').hidden = !dead && !paused;
    queueMicrotask(() => { syncPause(); if (dead) element('resume').focus({ preventScroll: true }); });
  }
  // Reuse the scene's throttled HUD updates; only move the marker when needed.
  const x = Math.round(Math.max(0, Math.min(ARENA.width, state.x)) / 10) * 10;
  const y = Math.round(Math.max(0, Math.min(ARENA.height, state.y)) / 10) * 10;
  const position = `translate(${x} ${y})`;
  if (position !== minimapPosition) {
    minimapPlayer.setAttribute('transform', position);
    minimapPosition = position;
  }
  // Reuse markers by enemy ID; no separate loop or per-frame map rebuilding.
  const activeIds = new Set<number>();
  for (const enemy of state.enemyPositions) {
    activeIds.add(enemy.id);
    let marker = enemyMarkers.get(enemy.id);
    if (!marker) {
      marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      marker.setAttribute('class', 'minimap-enemy-dot');
      marker.setAttribute('r', '30');
      enemyMarkers.set(enemy.id, marker);
      minimapEnemies.append(marker);
    }
    const enemyPosition = `translate(${Math.round(enemy.x / 10) * 10} ${Math.round(enemy.y / 10) * 10})`;
    if (marker.getAttribute('transform') !== enemyPosition) marker.setAttribute('transform', enemyPosition);
  }
  for (const [id, marker] of enemyMarkers) {
    if (!activeIds.has(id)) { marker.remove(); enemyMarkers.delete(id); }
  }
});

panel = new BuildPanel(element('build-overlay'), (batch, id) => {
  if (scene.chooseUpgrade(batch, id)) {
    notice.show('强化完成', definition(id)!.name, latestBuild!.build.school);
    syncPause();
  }
}, inspectBuild);

picker = new SchoolPicker(element('school-overlay'), school => { if(scene.chooseSchool(school)) { notice.show(`${SCHOOL_INFO[school].name}流派`, `${SCHOOL_INFO[school].spell}已就绪`, school); syncPause(); } }, () => scene.schoolArtwork());

game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#17251f',
  antialias: true,
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  scene: [scene],
  render: { roundPixels: true },
  callbacks: {
    postBoot: (instance) => {
      instance.canvas.setAttribute('aria-label', '魔法试验场');
      queueMicrotask(() => {
        syncPause();
        if (import.meta.env.DEV) instance.canvas.dataset.loopRunning = String(instance.loop.running);
      });
    },
  },
});
if (import.meta.env.DEV) observePerformance(game, 'cached-textures');

function syncPause(): void {
  if (!game) return;
  const choosing = !!latestBuild?.choice;
  const next = dead || selectingSchool || paused || inspecting || choosing;
  document.querySelector('.arena')!.classList.toggle('combat-paused', next);
  if (next !== appliedPause) {
    appliedPause = next;
    scene.setPaused(next);
    if (next) { game.pause(); game.loop.sleep(); }
    else { game.resume(); game.loop.wake(); }
  }
  if (import.meta.env.DEV && game.canvas) game.canvas.dataset.loopRunning = String(game.loop.running);
  element('pause-overlay').hidden = !dead && (!paused || selectingSchool || inspecting || choosing);
  element('pause').innerHTML = paused ? '▶ <span>继续</span>' : 'Ⅱ <span>暂停</span>';
  element('pause').setAttribute('aria-pressed', String(paused));
  if (dead) element('build-overlay').hidden = true;
  if (!next) element('game').focus({ preventScroll: true });
}
function setPaused(next: boolean): void {
  if (dead) return;
  paused = next;
  syncPause();
  if (next && !inspecting && !latestBuild?.choice) element('resume').focus({ preventScroll: true });
}
function inspectBuild(): void {
  if (dead || selectingSchool || !latestBuild) return;
  inspecting = !inspecting;
  syncPause();
  panel.update(latestBuild, inspecting);
  if (!inspecting && paused && !latestBuild.choice) element('resume').focus({ preventScroll: true });
}
element('skill').addEventListener('click', () => { if(scene.castSkill()) syncPause(); }, listenerOptions);
element('ultimate').addEventListener('click', () => { if(scene.castUltimate()) syncPause(); }, listenerOptions);
element('build').addEventListener('click', inspectBuild, listenerOptions);
element('pause').addEventListener('click', () => setPaused(!paused), listenerOptions);
function restart(): void {
  inspecting = paused = false;
  scene.resetPosition();
  syncPause();
}
element('resume').addEventListener('click', () => dead ? restart() : setPaused(false), listenerOptions);
element('reset').addEventListener('click', restart, listenerOptions);
window.addEventListener('keydown', (event) => {
  if (selectingSchool) return;
  if (!['Escape', 'Space', 'KeyU'].includes(event.code) || event.repeat) return;
  if (event.target instanceof HTMLElement) {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || event.target.isContentEditable) return;
    if (event.code === 'Space' && ['BUTTON', 'A'].includes(event.target.tagName)) return;
  }
  event.preventDefault();
  if (event.code === 'KeyU' || (event.code === 'Escape' && inspecting)) inspectBuild();
  else if (!latestBuild?.choice) setPaused(!paused);
}, listenerOptions);
window.addEventListener('blur', () => setPaused(true), listenerOptions);
document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); }, listenerOptions);
const resizeObserver = new ResizeObserver(() => {
  const width = element('game').clientWidth;
  const height = element('game').clientHeight;
  if (width !== game.scale.width || height !== game.scale.height) game.scale.resize(width, height);
});
resizeObserver.observe(element('game'));

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    listeners.abort();
    resizeObserver.disconnect();
    movement.destroy();
    panel.destroy();
    picker.destroy();
    notice.destroy();
    game.destroy(true);
  });
}

// Arena dimensions are deliberately larger than the viewport.
element('game').dataset.worldSize = `${ARENA.width}x${ARENA.height}`;
