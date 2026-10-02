import { prepareIceTextures } from '../art/SpellTextures';
import Phaser from 'phaser';
import type { Direction } from '../config';
import type { EnemySystem } from '../enemies/EnemySystem';
import type { IceSpec } from '../upgrades/build';
import { preserveCooldown } from '../combat/DamageResolver';
interface Pulse { x:number; y:number; delay:number; spec:IceSpec }
interface Ring { view:Phaser.GameObjects.Image; age:number; radius:number }
/** Each cast and echo retain a frozen spec; slows live on enemies, not spell timers. */
export class IceSpell {
  private cooldown=0;
  private echoes:Pulse[]=[];
  private rings:Ring[]=[];
  casts=0;
  get projectileCount():number{return 0;}
  get impactCount():number{return this.rings.length;}
  constructor(private scene:Phaser.Scene,private spec:IceSpec) {
    prepareIceTextures(scene);
  }
  configure(spec:IceSpec):void{this.cooldown=preserveCooldown(this.cooldown,this.spec.cooldown,spec.cooldown);this.spec=spec;}
  private pulse(x:number,y:number,spec:IceSpec,enemies:EnemySystem):void {
    if(this.rings.length>=8)this.rings.shift()!.view.destroy();
    const view=this.scene.add.image(x,y,'ice-frost-detail').setDepth(8).setDisplaySize(spec.radius*2,spec.radius*2);
    this.rings.push({view,age:0,radius:spec.radius});
    for(const enemy of [...enemies.enemies]) {
      if((enemy.view.x-x)**2+(enemy.view.y-y)**2>(spec.radius+enemy.spec.radius)**2)continue;
      const dx=enemy.view.x-x,dy=enemy.view.y-y,d=Math.hypot(dx,dy)||1;
      if(enemies.hit(enemy,spec.damage,{x:dx/d,y:dy/d},'spell',null,false,spec.effects))enemies.slow(enemy,spec.slow,spec.duration);
    }
  }
  cast(x:number,y:number,_direction:Direction,enemies:EnemySystem):boolean {
    if(this.cooldown>0)return false;
    this.casts++;this.cooldown=this.spec.cooldown;
    this.pulse(x,y,this.spec,enemies);
    if(this.spec.pulses>1)this.echoes.push({x,y,delay:this.spec.echoDelay,spec:this.spec});
    return true;
  }
  update(delta:number,enemies:EnemySystem):void {
    this.cooldown=Math.max(0,this.cooldown-delta);
    for(let i=this.echoes.length-1;i>=0;i--) {
      const echo=this.echoes[i];echo.delay-=delta;
      if(echo.delay<=0){this.echoes.splice(i,1);this.pulse(echo.x,echo.y,echo.spec,enemies);}
    }
    for(let i=this.rings.length-1;i>=0;i--) {
      const ring=this.rings[i];ring.age+=delta;
      if(ring.age>=300){ring.view.destroy();this.rings.splice(i,1);}
      else ring.view.setDisplaySize(ring.radius*2*(0.85+0.15*ring.age/300),ring.radius*2*(0.85+0.15*ring.age/300)).setAlpha((1-ring.age/300)**0.8);
    }
  }
  reset(_runId=0):void{for(const ring of this.rings)ring.view.destroy();this.rings.length=0;this.echoes.length=0;this.casts=this.cooldown=0;}
}
