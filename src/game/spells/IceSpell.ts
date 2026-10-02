import { prepareIceTextures } from '../art/SpellTextures';
import type Phaser from 'phaser';
import { ARENA, type Direction } from '../config';
import type { EnemySystem } from '../enemies/EnemySystem';
import type { IceSpec } from '../upgrades/build';
import { preserveCooldown } from '../combat/DamageResolver';
import { segmentCircleHit } from '../combat/collision';
import { skillEndpoint } from './SchoolSkill';
import { IceLanceFields } from './IceLanceFields';
interface Lance {view:Phaser.GameObjects.Image;aim:Direction;spec:IceSpec;distance:number;reach:number;delay:number;hits:Set<number>}
/** Directional piercing lances retain launch snapshots, including delayed follow-up shots. */
export class IceSpell {
  private cooldown=0;
  private lances:Lance[]=[];
  private fields:IceLanceFields;
  private cleared=0;
  casts=0;
  get projectileCount():number{return this.lances.length;}
  get impactCount():number{return this.fields.count*2;}
  constructor(private scene:Phaser.Scene,private spec:IceSpec){prepareIceTextures(scene);this.fields=new IceLanceFields(scene);}
  configure(spec:IceSpec):void{this.cooldown=preserveCooldown(this.cooldown,this.spec.cooldown,spec.cooldown);this.spec=spec;}
  cast(x:number,y:number,direction:Direction,enemies:EnemySystem):boolean {
    const count=Math.min(2,this.spec.pulses);
    if(this.cooldown>0||this.lances.length+count>48)return false;
    const length=Math.hypot(direction.x,direction.y)||1,aim={x:direction.x/length,y:direction.y/length};
    if(!aim.x&&!aim.y)aim.x=1;
    x=Math.max(ARENA.inset,Math.min(ARENA.width-ARENA.inset,x));
    y=Math.max(ARENA.inset,Math.min(ARENA.height-ARENA.inset,y));
    const end=skillEndpoint(x,y,aim,this.spec.reach??700),reach=Math.hypot(end.x-x,end.y-y);
    for(let i=0;i<count;i++){
      const view=this.scene.add.image(x,y,'ice-lance-detail').setDepth(12).setRotation(Math.atan2(aim.y,aim.x)).setDisplaySize(82,22).setVisible(i===0);
      this.lances.push({view,aim,spec:this.spec,distance:0,reach,delay:i*this.spec.echoDelay,hits:new Set<number>()});
    }
    this.cleared=enemies.waves.cleared;this.casts++;this.cooldown=this.spec.cooldown;return true;
  }
  update(delta:number,enemies:EnemySystem):void {
    this.cooldown=Math.max(0,this.cooldown-delta);
    if(enemies.waves.cleared!==this.cleared){this.clearObjects();this.cleared=enemies.waves.cleared;return;}
    if(this.fields.update(delta,enemies)){this.clearObjects();this.cleared=enemies.waves.cleared;return;}
    for(let i=this.lances.length-1;i>=0;i--){
      const lance=this.lances[i];let step=delta;
      if(lance.delay>0){lance.delay-=delta;if(lance.delay>0)continue;step=-lance.delay;lance.delay=0;lance.view.setVisible(true);}
      const px=lance.view.x,py=lance.view.y,travel=Math.min(lance.reach-lance.distance,(lance.spec.speed??620)*step/1000);
      const x=px+lance.aim.x*travel,y=py+lance.aim.y*travel;
      const limit=lance.spec.maxTargets??3;
      if(lance.hits.size<limit){
        const hits=enemies.enemies.filter(e=>e.spawning===0&&!e.health.dead&&!lance.hits.has(e.id))
          .map(enemy=>({enemy,t:segmentCircleHit(px,py,x,y,enemy.view.x,enemy.view.y,enemy.spec.radius+8)}))
          .filter((hit):hit is {enemy:typeof hit.enemy;t:number}=>hit.t!==null).sort((a,b)=>a.t-b.t);
        for(const {enemy} of hits){
          if(lance.hits.size>=limit)break;
          if(enemy.health.dead)continue;
          const ex=enemy.view.x,ey=enemy.view.y;
          if(enemies.hit(enemy,lance.spec.damage,lance.aim,'spell',null,false,lance.spec.effects)){
            lance.hits.add(enemy.id);enemies.slow(enemy,lance.spec.slow,lance.spec.duration);
            enemies.effects.spellHit(ex,ey,'ice',lance.aim);
          }
          if(enemies.waves.cleared!==this.cleared){this.clearObjects();this.cleared=enemies.waves.cleared;return;}
        }
      }
      lance.distance+=travel;lance.view.setPosition(x,y);
      if(lance.distance>=lance.reach){
        this.fields.add(x,y,lance.spec);lance.view.destroy();this.lances.splice(i,1);
      }
    }
  }
  private clearObjects():void{for(const lance of this.lances)lance.view.destroy();this.lances.length=0;this.fields.reset();}
  reset(_runId=0):void{this.clearObjects();this.casts=this.cooldown=this.cleared=0;}
}
