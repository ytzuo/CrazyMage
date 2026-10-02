import { FireFields } from './FireFields';
import { prepareFireTextures } from '../art/SpellTextures';
import Phaser from 'phaser';
import { ARENA, FIREBALL, type Direction } from '../config';
import { segmentCircleHit } from '../combat/collision';
import { preserveCooldown, resolveProjectileHit, type ProjectileContext } from '../combat/DamageResolver';
import type { Enemy, EnemySystem } from '../enemies/EnemySystem';
import type { FireballSpec } from '../upgrades/build';
interface Projectile { view: Phaser.GameObjects.Image; direction: Direction; age: number; context: ProjectileContext }
interface Impact { view: Phaser.GameObjects.Image; age: number; radius: number }
/** Runtime consumes compiled specs. Flying projectiles retain their immutable launch snapshot. */
export class FireballSpell {
  private projectiles: Projectile[] = [];
  private impacts: Impact[] = [];
  private hits: { enemy: Enemy; t: number; x: number; y: number }[] = [];
  private fields: FireFields;
  private cooldown = 0;
  private nextProjectile = 0;
  private runId = 0;
  private spec: FireballSpec;
  casts = 0;
  constructor(private scene: Phaser.Scene, spec: FireballSpec) {
    this.spec = spec;
    prepareFireTextures(scene);
    this.fields=new FireFields(scene);
  }
  get projectileCount(): number { return this.projectiles.length; }
  get impactCount(): number { return this.impacts.length+this.fields.count; }
  configure(spec: FireballSpec): void {
    this.cooldown = preserveCooldown(this.cooldown, this.spec.cooldown, spec.cooldown);
    this.spec = spec;
  }
  private impact(x: number, y: number, radius = 10): void {
    if (this.impacts.length >= 24) this.impacts.shift()!.view.destroy();
    const size = radius > 10 ? radius * 2 : 32;
    const view = this.scene.add.image(x, y, 'fire-impact-detail').setDisplaySize(size, size).setDepth(12);
    this.impacts.push({ view, radius, age: 0 });
  }
  update(delta: number, enemies: EnemySystem): void {
    this.cooldown = Math.max(0, this.cooldown - delta);
    if(this.fields.update(delta,enemies))return;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i], spec = projectile.context.spec;
      const previousX = projectile.view.x, previousY = projectile.view.y;
      const remaining = Math.min(delta, spec.lifetime - projectile.age);
      projectile.age += delta;
      const dx = projectile.direction.x * spec.speed * remaining / 1000;
      const dy = projectile.direction.y * spec.speed * remaining / 1000;
      // Clip the collision segment at the arena boundary rather than hitting targets beyond it.
      let fraction = 1;
      if (dx > 0) fraction = Math.min(fraction, (ARENA.width - ARENA.inset - previousX) / dx);
      if (dx < 0) fraction = Math.min(fraction, (ARENA.inset - previousX) / dx);
      if (dy > 0) fraction = Math.min(fraction, (ARENA.height - ARENA.inset - previousY) / dy);
      if (dy < 0) fraction = Math.min(fraction, (ARENA.inset - previousY) / dy);
      fraction = Math.max(0, fraction);
      const x = previousX + dx * fraction, y = previousY + dy * fraction;
      this.hits.length = 0;
      for (const enemy of enemies.enemies) {
        if (enemy.spawning > 0 || enemy.health.dead || projectile.context.directTargets.has(enemy.id)) continue;
        const t = segmentCircleHit(previousX, previousY, x, y, enemy.view.x, enemy.view.y, enemy.spec.radius + FIREBALL.radius);
        if (t !== null) this.hits.push({ enemy, t, x: enemy.view.x, y: enemy.view.y });
      }
      this.hits.sort((a, b) => a.t - b.t);
      projectile.view.setPosition(x, y).setScale(0.75, 0.75 * (1 + Math.sin(projectile.age * 0.035 + projectile.context.id) * 0.1));
      for (const hit of this.hits) {
        if (hit.enemy.health.dead) continue;
        const impactX = previousX + (x - previousX) * hit.t, impactY = previousY + (y - previousY) * hit.t;
        const nearby = spec.explosion && projectile.context.directTargets.size === 0 ? enemies.enemies.filter(enemy => enemy.spawning === 0 && !enemy.health.dead).map(enemy => ({ id: enemy.id, x: enemy.view.x, y: enemy.view.y })) : [];
        const firstHit=projectile.context.directTargets.size===0;
        const exploded = resolveProjectileHit(projectile.context, { id: hit.enemy.id, x: impactX, y: impactY }, nearby, event => {
          const target = enemies.enemies.find(enemy => enemy.id === event.targetId);
          if (!target) return false;
          const tx = target.view.x, ty = target.view.y;
          const settled = enemies.hit(target, event.damage, projectile.direction, 'spell', event.source==='direct'?spec.burn:null);
          if (settled && event.source === 'direct') enemies.effects.spellHit(tx, ty, 'fire', projectile.direction);
          return settled;
        });
        if(firstHit && projectile.context.directTargets.size>0 && spec.field) this.fields.add(impactX,impactY,spec.field);
        if (exploded) this.impact(impactX, impactY, spec.explosion!.radius);
        if (projectile.context.directTargets.size >= spec.maxTargets) { projectile.view.setPosition(impactX, impactY); break; }
      }
      this.hits.length = 0;
      if (projectile.context.directTargets.size >= spec.maxTargets || fraction < 1 || projectile.age >= spec.lifetime) {
        this.impact(projectile.view.x, projectile.view.y);
        projectile.view.destroy(); this.projectiles.splice(i, 1);
      }
    }
    for (let i = this.impacts.length - 1; i >= 0; i--) {
      const impact = this.impacts[i]; impact.age += delta;
      const progress = impact.age / 240;
      if (progress >= 1) { impact.view.destroy(); this.impacts.splice(i, 1); }
      else impact.view.setDisplaySize((impact.radius > 10 ? impact.radius * 2 : 32) * (0.6 + progress * 0.45), (impact.radius > 10 ? impact.radius * 2 : 32) * (0.6 + progress * 0.45)).setAlpha((1 - progress) ** 1.4);
    }
  }
  cast(x: number, y: number, direction: Direction): boolean {
    if (this.cooldown > 0 || this.projectiles.length + this.spec.count > FIREBALL.maxProjectiles) return false;
    const cast = { runId: this.runId, castId: ++this.casts, splashTargets: new Set<number>() };
    const angle = Math.atan2(direction.y, direction.x);
    for (let i = 0; i < this.spec.count; i++) {
      const offset = (i - (this.spec.count - 1) / 2) * 0.16;
      const aim = { x: Math.cos(angle + offset), y: Math.sin(angle + offset) };
      const view = this.scene.add.image(Phaser.Math.Clamp(x + aim.x * 30, ARENA.inset, ARENA.width - ARENA.inset), Phaser.Math.Clamp(y - 12 + aim.y * 30, ARENA.inset, ARENA.height - ARENA.inset), 'fireball-detail').setOrigin(64 / 96, 0.5).setScale(0.75).setDepth(12).setRotation(angle + offset);
      this.projectiles.push({ view, direction: aim, age: 0, context: { id: ++this.nextProjectile, cast, spec: this.spec, directTargets: new Set<number>() } });
    }
    this.cooldown = this.spec.cooldown; return true;
  }
  reset(runId = 0): void {
    for (const projectile of this.projectiles) projectile.view.destroy();
    for (const impact of this.impacts) impact.view.destroy();
    this.fields.reset();
    this.projectiles.length = this.impacts.length = this.hits.length = 0;
    this.cooldown = this.casts = this.nextProjectile = 0; this.runId = runId;
  }
}
