import { ARENA, PLAYER } from '../config.ts';
import { segmentCircleHit } from '../combat/collision.ts';

export type GuardianMove = 'sweep' | 'stomp' | 'charge' | 'rupture';
export const GUARDIAN = {
  initialRest: 1800, rest: 5000, exposure: 1800, enragedExposure: 2200, exposedDamage: 1.3,
  sweepWindup: 1100, sweepRadius: 180, sweepHalfAngle: Math.PI / 3, secondSweepWindup: 1100,
  stompWindup: 1300, stompRadius: 180, crackWindup: 1000, crackLength: 290, crackRadius: 25,
  chargeWindup: 1300, chargeDistance: 520, chargeDuration: 1100, chargeStompWindup: 1300,
  ruptureWindup: 1400, ruptureInterval: 450, ruptureRadius: 80,
  feedback: 300, maxZonesPerBoss: 4,
} as const;
export interface GuardianShape { shape:'circle'|'sector'|'lane'; x:number; y:number; radius:number; angle:number; length:number }
/** Telegraphs and damage share the same locked circle, sector or capsule geometry. */
export function guardianContains(zone:GuardianShape,x:number,y:number,padding=PLAYER.radius):boolean {
  if(zone.shape==='lane')return segmentCircleHit(zone.x,zone.y,zone.x+Math.cos(zone.angle)*zone.length,zone.y+Math.sin(zone.angle)*zone.length,x,y,zone.radius+padding)!==null;
  const dx=x-zone.x,dy=y-zone.y,distance=Math.hypot(dx,dy);
  if(distance>zone.radius+padding)return false;
  if(zone.shape==='circle'||distance<=padding)return true;
  const angle=Math.atan2(dy,dx)-zone.angle;
  return Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)))<=GUARDIAN.sweepHalfAngle+Math.asin(Math.min(1,padding/distance));
}
export function guardianMove(distance:number,last:GuardianMove|null):GuardianMove {
  return distance<=210?(last==='sweep'?'stomp':'sweep'):(last==='rupture'?'charge':'rupture');
}

/** Stop at the first wall along the locked ray, preserving its direction. */
export function guardianEndpoint(x:number,y:number,angle:number,length:number,margin:number) {
  const dx=Math.cos(angle),dy=Math.sin(angle);
  const wallX=Math.abs(dx)<1e-9?Infinity:(dx>0?ARENA.width-margin-x:margin-x)/dx;
  const wallY=Math.abs(dy)<1e-9?Infinity:(dy>0?ARENA.height-margin-y:margin-y)/dy;
  const reach=Math.max(0,Math.min(length,wallX,wallY));
  return {x:x+dx*reach,y:y+dy*reach,length:reach};
}
