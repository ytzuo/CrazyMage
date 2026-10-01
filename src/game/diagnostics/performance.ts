import Phaser from 'phaser';

/** Development-only timing, published as a canvas attribute without adding game UI. */
export function observePerformance(game: Phaser.Game, background: string): void {
  const renderTimes: number[] = [];
  const frameIntervals: number[] = [];
  let renderStart = 0;
  let previousFrame = 0;
  let started = 0;
  const onPause = (): void => { previousFrame = 0; };
  const beforeRender = (): void => {
    renderStart = performance.now();
    if (!started) started = renderStart;
    if (previousFrame) frameIntervals.push(renderStart - previousFrame);
    previousFrame = renderStart;
  };
  const afterRender = (): void => {
    renderTimes.push(performance.now() - renderStart);
    if (renderTimes.length < 120 && performance.now() - started < 4000) return;
    const mean = (values: number[]): number => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
    const sorted = [...frameIntervals].sort((a, b) => a - b);
    const summary = {
      background,
      viewport: [game.scale.width, game.scale.height],
      frames: renderTimes.length,
      meanRenderMs: Number(mean(renderTimes).toFixed(2)),
      meanFrameMs: Number(mean(frameIntervals).toFixed(2)),
      p95FrameMs: Number((sorted[Math.floor(sorted.length * 0.95)] ?? 0).toFixed(2)),
      first20RenderMs: Number(mean(renderTimes.slice(0, 20)).toFixed(2)),
    };
    game.canvas.dataset.performance = JSON.stringify(summary);
    game.events.off(Phaser.Core.Events.PRE_RENDER, beforeRender);
    game.events.off(Phaser.Core.Events.POST_RENDER, afterRender);
    game.events.off(Phaser.Core.Events.PAUSE, onPause);
  };
  game.events.on(Phaser.Core.Events.PRE_RENDER, beforeRender);
  game.events.on(Phaser.Core.Events.POST_RENDER, afterRender);
  game.events.on(Phaser.Core.Events.PAUSE, onPause);
}
