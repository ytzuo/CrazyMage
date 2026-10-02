import { prepareLightningTextures } from '../art/SpellTextures';
import Phaser from 'phaser';
import type { Direction } from '../config';
import type { Enemy, EnemySystem } from '../enemies/EnemySystem';
import type { LightningSpec } from '../upgrades/build';
import { preserveCooldown } from '../combat/DamageResolver';
import { chainTargets } from './chain';
import type { DamageSource } from '../ultimates/UltimateCharge';
interface Arc {view:Phaser.GameObjects.Image;age:number;duration:number;diameter?:number}
interface Charge {view:Phaser.GameObjects.Image;stacks:number;remaining:number}
/** Main chain, non-recursive forks and three-hit discharge share compiled parameters. */
export class LightningSpell {
  private cooldown=0;
  private arcs:Arc[]=[];
  private charges=new Map<number,Charge>();
  private cleared=0;
  casts=0;
  get projectileCount():number{return 0;}
  get impactCount():number{return this.arcs.length+this.charges.size;}
  constructor(private scene:Phaser.Scene,private spec:LightningSpec) {prepareLightningTextures(scene);}
  configure(spec:LightningSpec):void{this.cooldown=preserveCooldown(this.cooldown,this.spec.cooldown,spec.cooldown);this.spec=spec;}
  private syncWave(enemies:EnemySystem):void {
    if(this.cleared===enemies.waves.cleared)return;
    this.clearObjects();this.cleared=enemies.waves.cleared;
  }
  update(delta:number,enemies:EnemySystem):void {
    this.cooldown=Math.max(0,this.cooldown-delta);this.syncWave(enemies);
    for(let i=this.arcs.length-1;i>=0;i--) {
      const arc=this.arcs[i];arc.age+=delta;
      if(arc.age>=arc.duration){arc.view.destroy();this.arcs.splice(i,1);}
      else {
        const t=arc.age/arc.duration;
        arc.view.setAlpha((1-t)*(0.75+0.25*Math.cos(arc.age*0.09)**2));
        if(arc.diameter)arc.view.setDisplaySize(arc.diameter*(0.65+0.35*t),arc.diameter*(0.65+0.35*t));
      }
    }
    if(!this.charges.size)return;
    const alive=new Map(enemies.enemies.map(enemy=>[enemy.id,enemy]));
    for(const [id,charge] of this.charges){
      charge.remaining-=delta;
      const enemy=alive.get(id);
      if(!enemy||enemy.health.dead||charge.remaining<=0){charge.view.destroy();this.charges.delete(id);continue;}
      const size=22+charge.stacks*7;
      charge.view.setPosition(enemy.view.x,enemy.view.y-enemy.spec.radius-20)
        .setDisplaySize(size,size).setAlpha(Math.min(1,charge.remaining/250)*(0.8+0.2*Math.cos(charge.remaining/100)**2));
    }
  }
  private remember(view:Phaser.GameObjects.Image,duration=180,diameter?:number):void {
    if(this.arcs.length>=40)this.arcs.shift()!.view.destroy();
    this.arcs.push({view,age:0,duration,diameter});
  }
  private arc(x:number,y:number,tx:number,ty:number,thin=false):void {
    const dx=tx-x,dy=ty-y,d=Math.hypot(dx,dy)||1;
    const view=this.scene.add.image(x,y,`lightning-arc-detail-${this.casts%3}`).setOrigin(0,0.5)
      .setDisplaySize(d,thin?22:36).setBlendMode(Phaser.BlendModes.ADD).setRotation(Math.atan2(dy,dx)).setDepth(12);
    if(thin)view.setTint(0xc8aaff);
    this.remember(view);
  }
  private removeCharge(id:number):void {
    const charge=this.charges.get(id);if(charge)charge.view.destroy();this.charges.delete(id);
  }
  accumulateCharge(enemy:Enemy,enemies:EnemySystem,burstHits:Set<number>,source:DamageSource):void {
    this.syncWave(enemies);
    this.charge(enemy,enemies,burstHits,source);
    this.syncWave(enemies);
  }
  private charge(enemy:Enemy,enemies:EnemySystem,burstHits:Set<number>,source:DamageSource='spell'):void {
    const spec=this.spec.charge;
    if(!spec||enemy.health.dead||enemy.spawning>0||!enemies.enemies.includes(enemy))return;
    let charge=this.charges.get(enemy.id);
    if(!charge){
      if(this.charges.size>=72)return;
      const view=this.scene.add.image(enemy.view.x,enemy.view.y-enemy.spec.radius-20,'lightning-charge-mark')
        .setDisplaySize(29,29).setDepth(17).setBlendMode(Phaser.BlendModes.ADD);
      charge={view,stacks:0,remaining:spec.duration};this.charges.set(enemy.id,charge);
    }
    charge.stacks++;charge.remaining=spec.duration;
    if(charge.stacks<spec.threshold)return;
    this.removeCharge(enemy.id);
    const x=enemy.view.x,y=enemy.view.y;
    const targets=[enemy,...enemies.enemies.filter(other=>other.id!==enemy.id&&!other.health.dead&&other.spawning===0&&!burstHits.has(other.id)&&
      (other.view.x-x)**2+(other.view.y-y)**2<=spec.radius**2)
      .sort((a,b)=>(a.view.x-x)**2+(a.view.y-y)**2-((b.view.x-x)**2+(b.view.y-y)**2)||a.id-b.id)
      .slice(0,spec.targets-1)];
    const pulse=this.scene.add.image(x,y,'lightning-discharge-detail').setDepth(13).setDisplaySize(spec.radius*1.3,spec.radius*1.3)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.remember(pulse,260,spec.radius*2);
    for(const target of targets){
      if(target.health.dead||burstHits.has(target.id))continue;
      burstHits.add(target.id);
      const tx=target.view.x,ty=target.view.y,dx=tx-x,dy=ty-y,d=Math.hypot(dx,dy)||1;
      // Periodic entry avoids extra knockback; no lightning callbacks are installed on hit().
      if(enemies.hit(target,spec.damage,{x:dx/d,y:dy/d},source,null,true)){
        enemies.effects.spellHit(tx,ty,'lightning',{x:dx/d,y:dy/d});
        if(target.id!==enemy.id)this.arc(x,y,tx,ty,true);
      }
      if(enemies.waves.cleared!==this.cleared)return;
    }
  }
  cast(x:number,y:number,aim:Direction,enemies:EnemySystem):boolean {
    this.syncWave(enemies);
    if(this.cooldown>0)return false;
    const targets=chainTargets(enemies.enemies.filter(e=>e.spawning===0&&!e.health.dead).map(e=>({id:e.id,x:e.view.x,y:e.view.y})),x,y,aim,this.spec);
    if(!targets.length)return false;
    this.casts++;this.cooldown=this.spec.cooldown;
    const visited=new Set(targets.map(target=>target.id)),burstHits=new Set<number>();
    let branches=0;
    for(let hop=0;hop<targets.length;hop++) {
      const target=targets[hop],enemy=enemies.enemies.find(e=>e.id===target.id);
      if(!enemy||enemy.health.dead)continue;
      const dx=target.x-x,dy=target.y-y,d=Math.hypot(dx,dy)||1,damage=this.spec.damage*this.spec.falloff**hop;
      const before=enemy.health.current+enemy.health.shield;
      if(enemies.hit(enemy,damage,{x:dx/d,y:dy/d})){
        enemies.effects.spellHit(target.x,target.y,'lightning',{x:dx/d,y:dy/d});
        this.arc(x,y,target.x,target.y);
        if(enemies.waves.cleared!==this.cleared){this.syncWave(enemies);return true;}
        if(enemy.health.current+enemy.health.shield<before)this.charge(enemy,enemies,burstHits);
        if(enemies.waves.cleared!==this.cleared){this.syncWave(enemies);return true;}
        const fork=this.spec.fork;
        if(fork&&branches<fork.budget){
          const extras=enemies.enemies.filter(other=>other.spawning===0&&!other.health.dead&&!visited.has(other.id)&&
            (other.view.x-target.x)**2+(other.view.y-target.y)**2<=fork.range**2)
            .sort((a,b)=>(a.view.x-target.x)**2+(a.view.y-target.y)**2-((b.view.x-target.x)**2+(b.view.y-target.y)**2)||a.id-b.id)
            .slice(0,Math.min(fork.perHop,fork.budget-branches));
          for(const extra of extras){
            visited.add(extra.id);branches++;
            const tx=extra.view.x,ty=extra.view.y,fx=tx-target.x,fy=ty-target.y,length=Math.hypot(fx,fy)||1;
            if(enemies.hit(extra,damage*fork.multiplier,{x:fx/length,y:fy/length})){
              enemies.effects.spellHit(tx,ty,'lightning',{x:fx/length,y:fy/length});this.arc(target.x,target.y,tx,ty,true);
            }
            if(enemies.waves.cleared!==this.cleared){this.syncWave(enemies);return true;}
          }
        }
      }
      x=target.x;y=target.y;
    }
    // Remove marks for enemies killed during the synchronous chain/discharge.
    const liveIds=new Set(enemies.enemies.map(enemy=>enemy.id));
    for(const id of this.charges.keys())if(!liveIds.has(id))this.removeCharge(id);
    return true;
  }
  private clearObjects():void {
    for(const arc of this.arcs)arc.view.destroy();this.arcs.length=0;
    for(const charge of this.charges.values())charge.view.destroy();this.charges.clear();
  }
  reset(_runId=0):void{this.clearObjects();this.casts=this.cooldown=this.cleared=0;}
}
