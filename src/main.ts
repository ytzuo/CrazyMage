import Phaser from 'phaser';
import './style.css';
import { ARENA, PLAYER, type MovementState } from './game/config';
import { MovementInput } from './game/input/MovementInput';
import { ArenaScene } from './game/scenes/ArenaScene';
import { observePerformance } from './game/diagnostics/performance';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="arena" aria-label="魔法试验场操控原型">
    <div id="game" role="application" tabindex="0" aria-label="WASD 移动，方向键发射火球；左下角摇杆可移动"></div>
    <nav class="arena-tools" aria-label="试验场控制">
      <button id="reset" class="icon-button" title="重新开始" aria-label="重新开始">↺</button>
      <button id="pause" class="pause-button">Ⅱ <span>暂停</span></button>
    </nav>
    <aside class="health-hud" aria-label="角色生命值">
      <div class="health-heading"><span>生命</span><span id="health-value">${PLAYER.health} / ${PLAYER.health}</span></div>
      <div id="health-bar" class="health-track" role="progressbar" aria-label="生命值" aria-valuemin="0" aria-valuemax="${PLAYER.health}" aria-valuenow="${PLAYER.health}"><div id="health-fill"></div></div>
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
let lastHealth = -1;
let lastCombat = '';
let lastWave = 0;
let lastWaveSeconds = -1;
let lastRunSeconds = -1;
const minimapPlayer = document.querySelector<SVGGElement>('#minimap-player')!;
const minimapEnemies = document.querySelector<SVGGElement>('#minimap-enemies')!;
const enemyMarkers = new Map<number, SVGCircleElement>();
let minimapPosition = minimapPlayer.getAttribute('transform');
const scene = new ArenaScene(movement, (state: MovementState) => {
  const runSeconds = Math.floor(state.elapsedTime / 1000);
  const duration = `${String(Math.floor(runSeconds / 60)).padStart(2, '0')}:${String(runSeconds % 60).padStart(2, '0')}`;
  if (runSeconds !== lastRunSeconds) { element('run-time').textContent = duration; lastRunSeconds = runSeconds; }
  const seconds = Math.ceil(state.nextWaveIn / 1000);
  if (state.wave !== lastWave) { element('wave-number').textContent = `第 ${state.wave} 波`; lastWave = state.wave; }
  if (seconds !== lastWaveSeconds) {
    element('wave-countdown').textContent = `${seconds}s`;
    element('wave-countdown').classList.toggle('soon', seconds <= 5);
    lastWaveSeconds = seconds;
  }
  if (state.health !== lastHealth) {
    element('health-value').textContent = `${state.health} / ${state.maxHealth}`;
    element('health-fill').style.transform = `scaleX(${state.health / state.maxHealth})`;
    element('health-bar').setAttribute('aria-valuenow', String(state.health));
    element('health-bar').setAttribute('aria-valuemax', String(state.maxHealth));
    element('health-bar').classList.toggle('low', state.health <= state.maxHealth * 0.3);
    lastHealth = state.health;
  }
  if (import.meta.env.DEV) {
    const summary = JSON.stringify({ health: state.health, enemies: state.enemies, kills: state.kills, casts: state.casts, dead: state.dead, objects: state.objects, projectiles: state.projectiles, impacts: state.impacts });
    if (summary !== lastCombat) { element('game').dataset.combat = summary; lastCombat = summary; }
  }
  if (dead !== state.dead) {
    dead = state.dead;
    element('pause').toggleAttribute('disabled', dead);
    element('pause-title').textContent = dead ? '你倒下了' : '已暂停';
    element('death-duration').hidden = !dead;
    if (dead) element('death-duration').textContent = `本局时长 ${duration}`;
    element('resume').innerHTML = dead ? '重新开始 <span>↺</span>' : '继续 <span>→</span>';
    element('pause-overlay').hidden = !dead && !paused;
    if (dead) queueMicrotask(() => {
      if (!dead) return;
      game.pause();
      game.loop.sleep();
      if (import.meta.env.DEV) game.canvas.dataset.loopRunning = 'false';
      element('resume').focus({ preventScroll: true });
    });
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

const game = new Phaser.Game({
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
        if (paused) {
          instance.pause();
          instance.loop.sleep();
        }
        if (import.meta.env.DEV) instance.canvas.dataset.loopRunning = String(instance.loop.running);
      });
    },
  },
});
if (import.meta.env.DEV) observePerformance(game, 'cached-textures');

function setPaused(next: boolean): void {
  if (dead) return;
  paused = next;
  scene.setPaused(next);
  if (next) {
    game.pause();
    game.loop.sleep();
  } else {
    game.resume();
    game.loop.wake();
  }
  if (import.meta.env.DEV && game.canvas) game.canvas.dataset.loopRunning = String(game.loop.running);
  element('pause-overlay').hidden = !next;
  element('pause').innerHTML = next ? '▶ <span>继续</span>' : 'Ⅱ <span>暂停</span>';
  element('pause').setAttribute('aria-pressed', String(next));
  if (next) element('resume').focus({ preventScroll: true });
  else element('game').focus({ preventScroll: true });
}

element('pause').addEventListener('click', () => setPaused(!paused), listenerOptions);
function restart(): void {
  scene.resetPosition();
  setPaused(false);
}
element('resume').addEventListener('click', () => dead ? restart() : setPaused(false), listenerOptions);
element('reset').addEventListener('click', restart, listenerOptions);
window.addEventListener('keydown', (event) => {
  if (!['Escape', 'Space'].includes(event.code) || event.repeat) return;
  if (event.target instanceof HTMLElement) {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || event.target.isContentEditable) return;
    if (event.code === 'Space' && ['BUTTON', 'A'].includes(event.target.tagName)) return;
  }
  event.preventDefault();
  setPaused(!paused);
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
    game.destroy(true);
  });
}

// Arena dimensions are deliberately larger than the viewport.
element('game').dataset.worldSize = `${ARENA.width}x${ARENA.height}`;
