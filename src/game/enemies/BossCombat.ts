import Phaser from 'phaser';
import { prepareEnemyAttackTextures } from '../art/EnemyAttackTextures';
import { ARENA, PLAYER } from '../config';
import type { Player } from '../entities/Player';
import type { Enemy } from './EnemySystem';

interface Zone { view: Phaser.GameObjects.Image; x: number; y: number; radius: number; wait: number; resolved: boolean }
/** One attack per living boss, at most three fixed ground warnings per attack. */
export class BossCombat {
  private attacks = new Map<number, Zone[]>();
  constructor(private scene: Phaser.Scene) { prepareEnemyAttackTextures(scene); }

  update(enemy: Enemy, delta: number, player: Player): void {
    enemy.windup = Math.max(0, enemy.windup - delta);
    const zones = this.attacks.get(enemy.id);
    if (zones) {
      for (let i = zones.length - 1; i >= 0; i--) {
        const zone = zones[i]; zone.wait -= delta;
        if (zone.resolved) {
          zone.view.setAlpha(Math.max(0, 1 + zone.wait / 240));
          if (zone.wait <= -240) { zone.view.destroy(); zones.splice(i, 1); }
          continue;
        }
        zone.view.setAlpha(0.5 + 0.35 * Math.sin(zone.wait * 0.018) ** 2);
        if (zone.wait > 0) continue;
        if (Math.hypot(player.view.x - zone.x, player.view.y - zone.y) <= zone.radius + PLAYER.radius)
          player.hurt(enemy.spec.damage, zone.x, zone.y);
        // Ground rupture remains owned by this attack, then is recycled.
        zone.view.setTexture('enemy-impact-detail').setAlpha(1).setDisplaySize(zone.radius * 2, zone.radius * 2);
        zone.wait = 0; zone.resolved = true;
        enemy.attackTime = 230;
      }
      if (!zones.length) { this.attacks.delete(enemy.id); enemy.windup = 0; }
      return;
    }
    const dx = player.view.x - enemy.view.x, dy = player.view.y - enemy.view.y;
    const distance = Math.hypot(dx, dy);
    enemy.aim = { x: dx / (distance || 1), y: dy / (distance || 1) };
    if (enemy.cooldown === 0 && distance < 760) {
      const melee = distance <= enemy.spec.range;
      const enraged = enemy.health.current < enemy.health.maximum / 2;
      const delay = (melee ? 900 : 1100) * (enraged ? 0.75 : 1);
      const points = melee ? [{ x: enemy.view.x, y: enemy.view.y }] : [-1, 0, 1].map(offset => ({
        x: Phaser.Math.Clamp(player.view.x - enemy.aim.y * offset * 140, ARENA.inset + 80, ARENA.width - ARENA.inset - 80),
        y: Phaser.Math.Clamp(player.view.y + enemy.aim.x * offset * 140, ARENA.inset + 80, ARENA.height - ARENA.inset - 80),
      }));
      this.attacks.set(enemy.id, points.map((point, index) => {
        const radius = melee ? 180 : 80;
        const view = this.scene.add.image(point.x, point.y, melee ? 'enemy-range-melee' : 'enemy-range-boss')
          .setDisplaySize(radius * 2, radius * 2).setDepth(7);
        return { ...point, radius, view, wait: delay + (melee ? 0 : index * 220), resolved: false };
      }));
      enemy.windup = delay;
      enemy.cooldown = (melee ? 2300 : 3200) * (enraged ? 0.75 : 1);
    } else if (distance > 130) {
      const step = enemy.spec.speed * (1 - enemy.slow.strength) * delta / 1000;
      enemy.view.x += enemy.aim.x * step; enemy.view.y += enemy.aim.y * step;
    }
  }
  cancel(id: number): void {
    for (const zone of this.attacks.get(id) ?? []) zone.view.destroy();
    this.attacks.delete(id);
  }
  reset(): void { for (const id of this.attacks.keys()) this.cancel(id); }
}
