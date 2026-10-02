import type { FireballSpec } from '../upgrades/build.ts';
export interface DamageTarget { id: number; x: number; y: number }
export interface CastContext { readonly runId: number; readonly castId: number; readonly splashTargets: Set<number> }
export interface ProjectileContext { explosionTriggered?: boolean; readonly id: number; readonly cast: CastContext; readonly spec: FireballSpec; readonly directTargets: Set<number> }
export interface DamageEvent { readonly runId: number; readonly castId: number; readonly effectId: number; readonly targetId: number; readonly source: 'direct' | 'splash'; readonly damage: number }
/** Bounded synchronous settlement. Only direct hits can derive splash; splash cannot recurse. */
export function resolveProjectileHit(projectile: ProjectileContext, target: DamageTarget, nearby: readonly DamageTarget[], apply: (event: DamageEvent) => boolean): boolean {
  if (projectile.directTargets.has(target.id) || projectile.directTargets.size >= projectile.spec.maxTargets) return false;
  const event = (targetId: number, source: DamageEvent['source'], damage: number): DamageEvent => ({ runId: projectile.cast.runId, castId: projectile.cast.castId, effectId: projectile.id, targetId, source, damage });
  if (!apply(event(target.id, 'direct', projectile.spec.damage))) return false;
  projectile.directTargets.add(target.id);
  const explosion = projectile.spec.explosion;
  if (!explosion || projectile.directTargets.size !== 1 || projectile.explosionTriggered) return false;
  projectile.explosionTriggered=true;
  for (const other of nearby) {
    if (other.id === target.id || projectile.cast.splashTargets.has(other.id)) continue;
    if ((other.x - target.x) ** 2 + (other.y - target.y) ** 2 > explosion.radius ** 2) continue;
    if (apply(event(other.id, 'splash', projectile.spec.damage * explosion.multiplier))) projectile.cast.splashTargets.add(other.id);
  }
  return true;
}
export function preserveCooldown(remaining: number, previous: number, next: number): number {
  return Math.max(0, Math.min(1, remaining / previous)) * next;
}
