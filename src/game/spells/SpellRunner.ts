import type Phaser from 'phaser';
import type { Direction } from '../config';
import type { EnemySystem } from '../enemies/EnemySystem';
import type { EffectiveBuild } from '../upgrades/build';
import { FireballSpell } from './FireballSpell';
import { IceSpell } from './IceSpell';
import { LightningSpell } from './LightningSpell';
/** Exactly one active school per run; switching releases every old spell object. */
export class SpellRunner {
  private active:FireballSpell|IceSpell|LightningSpell;
  private school:EffectiveBuild['school'];
  constructor(private scene:Phaser.Scene,effective:EffectiveBuild){this.school=effective.school;this.active=this.create(effective);}
  private create(effective:EffectiveBuild){return effective.school==='ice'?new IceSpell(this.scene,effective.ice):effective.school==='lightning'?new LightningSpell(this.scene,effective.lightning):new FireballSpell(this.scene,effective.fireball);}
  get casts(){return this.active.casts;}
  get projectileCount(){return this.active.projectileCount;}
  get impactCount(){return this.active.impactCount;}
  configure(effective:EffectiveBuild):void {
    if(this.school!==effective.school){this.active.reset();this.school=effective.school;this.active=this.create(effective);}
    else if(this.active instanceof FireballSpell)this.active.configure(effective.fireball);
    else if(this.active instanceof IceSpell)this.active.configure(effective.ice);
    else this.active.configure(effective.lightning);
  }
  update(delta:number,enemies:EnemySystem,origin?:Direction){if(this.active instanceof FireballSpell||this.active instanceof IceSpell)this.active.update(delta,enemies,origin);else this.active.update(delta,enemies);}
  cast(x:number,y:number,aim:Direction,enemies:EnemySystem){
    const cast=this.active instanceof FireballSpell?this.active.cast(x,y,aim):this.active.cast(x,this.active instanceof IceSpell?y-12:y,aim,enemies);
    if(cast)enemies.effects.cast(x,y,this.school,aim);
    return cast;
  }
  reset(runId=0){this.active.reset(runId);}
}
