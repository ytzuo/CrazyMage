import { prepareLightningTextures } from '../art/SpellTextures';
import Phaser from 'phaser';
import type { Direction } from '../config';
import type { EnemySystem } from '../enemies/EnemySystem';
import type { LightningSpec } from '../upgrades/build';
import { preserveCooldown } from '../combat/DamageResolver';
import { chainTargets } from './chain';
interface Arc {view:Phaser.GameObjects.Image; age:number}
/** Instant damage, distinct targets; only the short arc images survive a cast. */
export class LightningSpell {
  private cooldown=0;
  private arcs:Arc[]=[];
  casts=0;
  get projectileCount():number{return 0;}
  get impactCount():number{return this.arcs.length;}
  constructor(private scene:Phaser.Scene,private spec:LightningSpec) {
    prepareLightningTextures(scene);
  }
  configure(spec:LightningSpec):void{this.cooldown=preserveCooldown(this.cooldown,this.spec.cooldown,spec.cooldown);this.spec=spec;}
  update(delta:number,_enemies:EnemySystem):void {
    this.cooldown=Math.max(0,this.cooldown-delta);
    for(let i=this.arcs.length-1;i>=0;i--) {
      const arc=this.arcs[i];arc.age+=delta;
      if(arc.age>=180){arc.view.destroy();this.arcs.splice(i,1);}
      else arc.view.setAlpha((1-arc.age/180)*(0.75+0.25*Math.cos(arc.age*0.09)**2));
    }
  }
  cast(x:number,y:number,aim:Direction,enemies:EnemySystem):boolean {
    if(this.cooldown>0)return false;
    const targets=chainTargets(enemies.enemies.filter(e=>e.spawning===0&&!e.health.dead).map(e=>({id:e.id,x:e.view.x,y:e.view.y})),x,y,aim,this.spec);
    if(!targets.length)return false;
    this.casts++;this.cooldown=this.spec.cooldown;
    for(let hop=0;hop<targets.length;hop++) {
      const target=targets[hop],enemy=enemies.enemies.find(e=>e.id===target.id);
      const dx=target.x-x,dy=target.y-y,d=Math.hypot(dx,dy)||1;
      if(enemy && enemies.hit(enemy,this.spec.damage*this.spec.falloff**hop,{x:dx/d,y:dy/d})) enemies.effects.spellHit(target.x,target.y,'lightning',{x:dx/d,y:dy/d});
      if(this.arcs.length>=24)this.arcs.shift()!.view.destroy();
      const view=this.scene.add.image(x,y,`lightning-arc-detail-${(this.casts+hop)%3}`).setOrigin(0,0.5).setDisplaySize(d,36).setBlendMode(Phaser.BlendModes.ADD).setRotation(Math.atan2(dy,dx)).setDepth(12);
      this.arcs.push({view,age:0});x=target.x;y=target.y;
    }
    return true;
  }
  reset(_runId=0):void{for(const arc of this.arcs)arc.view.destroy();this.arcs.length=0;this.casts=this.cooldown=0;}
}
