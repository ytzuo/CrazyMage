import Phaser from 'phaser';
import { ARENA, ENEMY, FIREBALL, type Direction } from '../config';
import { segmentCircleHit } from '../combat/collision';
import type { Enemy, EnemySystem } from '../enemies/EnemySystem';

interface Projectile {
  view: Phaser.GameObjects.Container;
  direction: Direction;
  age: number;
}

interface Impact {
  view: Phaser.GameObjects.Arc;
  age: number;
}

/** Directional fireballs, with a frame-driven cooldown and effects that freeze on pause. */
export class FireballSpell {
  private projectiles: Projectile[] = [];
  private impacts: Impact[] = [];
  private cooldown = 0;
  casts = 0;

  constructor(private scene: Phaser.Scene) {}

  get projectileCount(): number { return this.projectiles.length; }
  get impactCount(): number { return this.impacts.length; }

  update(delta: number, enemies: EnemySystem): void {
    this.cooldown = Math.max(0, this.cooldown - delta);
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      const previousX = projectile.view.x;
      const previousY = projectile.view.y;
      projectile.age += delta;
      projectile.view.x += projectile.direction.x * FIREBALL.speed * delta / 1000;
      projectile.view.y += projectile.direction.y * FIREBALL.speed * delta / 1000;
      const { x, y } = projectile.view;
      let target: Enemy | null = null;
      let firstHit = Infinity;
      for (const enemy of enemies.enemies) {
        if (enemy.spawning > 0 || enemy.health.dead) continue;
        const t = segmentCircleHit(previousX, previousY, x, y, enemy.view.x, enemy.view.y, ENEMY.radius + FIREBALL.radius);
        if (t !== null && t < firstHit) { firstHit = t; target = enemy; }
      }
      if (target) {
        projectile.view.setPosition(previousX + (x - previousX) * firstHit, previousY + (y - previousY) * firstHit);
        enemies.hit(target, FIREBALL.damage, projectile.direction);
      }
      const hitsBoundary = x <= ARENA.inset || x >= ARENA.width - ARENA.inset || y <= ARENA.inset || y >= ARENA.height - ARENA.inset;
      if (target || hitsBoundary || projectile.age >= FIREBALL.lifetime) {
        const impact = this.scene.add.circle(
          Phaser.Math.Clamp(projectile.view.x, ARENA.inset, ARENA.width - ARENA.inset),
          Phaser.Math.Clamp(projectile.view.y, ARENA.inset, ARENA.height - ARENA.inset),
          10, 0xffb258, 0.45,
        ).setStrokeStyle(2, 0xffdf8c, 0.8).setDepth(12);
        if (this.impacts.length >= 24) this.impacts.shift()!.view.destroy();
        this.impacts.push({ view: impact, age: 0 });
        projectile.view.destroy();
        this.projectiles.splice(i, 1);
      }
    }
    for (let i = this.impacts.length - 1; i >= 0; i--) {
      const impact = this.impacts[i];
      impact.age += delta;
      const progress = impact.age / 240;
      if (progress >= 1) {
        impact.view.destroy();
        this.impacts.splice(i, 1);
      } else {
        impact.view.setScale(1 + progress * 2).setAlpha(1 - progress);
      }
    }
  }

  cast(x: number, y: number, direction: Direction): boolean {
    if (this.cooldown > 0 || this.projectiles.length >= FIREBALL.maxProjectiles) return false;
    const view = this.scene.add.container(x + direction.x * 30, y - 12 + direction.y * 30).setDepth(12);
    const halo = this.scene.add.circle(0, 0, 21, 0xff8438, 0.12);
    const tail = this.scene.add.ellipse(-13, 0, 34, 12, 0xe66330, 0.6);
    const ember = this.scene.add.ellipse(-4, 0, 24, 14, 0xff9b48, 0.95);
    const core = this.scene.add.circle(2, 0, 6, 0xffebad);
    view.add([halo, tail, ember, core]).setRotation(Math.atan2(direction.y, direction.x));
    this.projectiles.push({ view, direction: { ...direction }, age: 0 });
    this.cooldown = FIREBALL.cooldown;
    this.casts++;
    return true;
  }

  reset(): void {
    for (const projectile of this.projectiles) projectile.view.destroy();
    for (const impact of this.impacts) impact.view.destroy();
    this.projectiles = [];
    this.impacts = [];
    this.cooldown = 0;
    this.casts = 0;
  }
}
