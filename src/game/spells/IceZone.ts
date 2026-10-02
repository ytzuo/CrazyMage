import type Phaser from 'phaser';
import type { Direction } from '../config';
import type { EnemySystem } from '../enemies/EnemySystem';
import type { DamageSource } from '../ultimates/UltimateCharge';
interface ZoneSpec {
  readonly radius:number; readonly damage:number; readonly duration:number;
  readonly initialDamage?:number; readonly interval:number; readonly fan:boolean; readonly source:DamageSource;
  readonly frost:number; readonly freeze:number;
}
/** One bounded region. Damage and frost settle on a shared active-time tick. */
export class IceZone {
  private views:Phaser.GameObjects.Image[]=[];
  private elapsed=0;
  private wait=0;
  private firstTick=true;
  private cleared:number;
  constructor(scene:Phaser.Scene,private enemies:EnemySystem,private x:number,private y:number,private aim:Direction,private spec:ZoneSpec) {
    this.cleared=enemies.waves.cleared;
    this.views.push(scene.add.image(x,y,spec.fan?'ice-fan-ground':'ice-domain-detail').setDepth(5)
      .setDisplaySize(spec.radius*2,spec.radius*2).setRotation(spec.fan?Math.atan2(aim.y,aim.x):0));
    if(spec.fan)for(let row=0;row<3;row++)for(let column=0;column<5;column++) {
      const angle=Math.atan2(aim.y,aim.x)+(column-2)*Math.PI/9;
      const distance=spec.radius*(0.3+row*0.27);
      this.views.push(scene.add.image(x+Math.cos(angle)*distance,y+Math.sin(angle)*distance,'ice-ground-spike')
        .setOrigin(0.5,0.9).setDepth(7).setDisplaySize(28+row*8,52+row*18));
    }
  }
  /** False means expired or a wave ended; callers release their region reference. */
  update(delta:number,origin?:Direction):boolean {
    this.elapsed+=delta;
    if(this.elapsed>=this.spec.duration || this.enemies.waves.cleared!==this.cleared){this.reset();return false;}
    if(origin&&!this.spec.fan){this.x=origin.x;this.y=origin.y;this.views[0].setPosition(this.x,this.y);}
    const alpha=Math.min(1,this.elapsed/180, (this.spec.duration-this.elapsed)/300);
    for(let i=0;i<this.views.length;i++){
      const view=this.views[i];view.setAlpha(alpha*(this.spec.fan?0.9:0.75+0.12*Math.sin(this.elapsed/180)));
      if(this.spec.fan&&i>0){
        const row=Math.floor((i-1)/5),rise=Math.min(1,this.elapsed/220);
        view.setDisplaySize(28+row*8,(52+row*18)*(0.2+0.8*rise));
      }
    }
    this.wait-=delta;
    if(this.wait>0)return true;
    this.wait+=this.spec.interval;
    const damage=this.firstTick?(this.spec.initialDamage??this.spec.damage):this.spec.damage;
    this.firstTick=false;
    for(const enemy of [...this.enemies.enemies]) {
      if(enemy.spawning>0||enemy.health.dead)continue;
      const dx=enemy.view.x-this.x,dy=enemy.view.y-this.y,d=Math.hypot(dx,dy);
      if(d>this.spec.radius+enemy.spec.radius)continue;
      if(this.spec.fan&&dx*this.aim.x+dy*this.aim.y<d*Math.cos(Math.PI*5/18)-enemy.spec.radius)continue;
      if(this.spec.frost)this.enemies.accumulateFrost(enemy,this.spec.frost,this.spec.freeze);
      if(this.enemies.hit(enemy,damage,{x:0,y:0},this.spec.source,null,true))
        this.enemies.slow(enemy,0.65,this.spec.interval+200);
      if(this.enemies.waves.cleared!==this.cleared){this.reset();return false;}
    }
    return true;
  }
  reset():void{for(const view of this.views)view.destroy();this.views.length=0;}
}
