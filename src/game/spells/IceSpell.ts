import { prepareIceTextures } from '../art/SpellTextures';
import type Phaser from 'phaser';
import { ARENA, type Direction } from '../config';
import type { EnemySystem } from '../enemies/EnemySystem';
import type { IceSpec } from '../upgrades/build';
import { preserveCooldown } from '../combat/DamageResolver';
import { segmentCircleHit } from '../combat/collision';
import { skillEndpoint } from './SchoolSkill';
import { IceLanceFields } from './IceLanceFields';
interface Lance {view:Phaser.GameObjects.Image;aim:Direction;spec:IceSpec;distance:number;reach:number;range:number;delay:number;hits:Set<number>}
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
    const count=Math.min(4,this.spec.pulses);
    if(this.cooldown>0||this.lances.length+count>48)return false;
    const length=Math.hypot(direction.x,direction.y)||1,aim={x:direction.x/length,y:direction.y/length};
    if(!aim.x&&!aim.y)aim.x=1;
    x=Math.max(ARENA.inset,Math.min(ARENA.width-ARENA.inset,x));
    y=Math.max(ARENA.inset,Math.min(ARENA.height-ARENA.inset,y));
    for(let i=0;i<count;i++){
      const range=(this.spec.reach??560)*(1-0.25*i);
      const end=skillEndpoint(x,y,aim,range),reach=Math.hypot(end.x-x,end.y-y);
      const view=this.scene.add.image(x,y,'ice-lance-detail').setDepth(12).setRotation(Math.atan2(aim.y,aim.x)).setDisplaySize(88,28).setVisible(i===0);
      this.lances.push({view,aim,spec:this.spec,distance:0,reach,range,delay:i*this.spec.echoDelay,hits:new Set<number>()});
    }
    this.cleared=enemies.waves.cleared;this.casts++;this.cooldown=this.spec.cooldown;return true;
  }
  update(delta:number,enemies:EnemySystem,origin?:Direction):void {
    this.cooldown=Math.max(0,this.cooldown-delta);
    if(enemies.waves.cleared!==this.cleared){this.clearObjects();this.cleared=enemies.waves.cleared;return;}
    if(this.fields.update(delta,enemies)){this.clearObjects();this.cleared=enemies.waves.cleared;return;}
    if(!this.lances.length)return;
    const liveIds=new Set(enemies.enemies.map(enemy=>enemy.id));
    for(let i=this.lances.length-1;i>=0;i--){
      const lance=this.lances[i];let step=delta;
      for(const id of lance.hits)if(!liveIds.has(id))lance.hits.delete(id);
      if(lance.delay>0){
        lance.delay-=delta;if(lance.delay>0)continue;
        step=-lance.delay;lance.delay=0;
        // Sample the caster only at release; airborne lances keep their own trajectory.
        const ox=Math.max(ARENA.inset,Math.min(ARENA.width-ARENA.inset,origin?.x??lance.view.x));
        const oy=Math.max(ARENA.inset,Math.min(ARENA.height-ARENA.inset,origin?.y??lance.view.y));
        const end=skillEndpoint(ox,oy,lance.aim,lance.range);
        lance.reach=Math.hypot(end.x-ox,end.y-oy);
        lance.view.setPosition(ox,oy).setVisible(true);
      }
      const px=lance.view.x,py=lance.view.y,travel=Math.min(lance.reach-lance.distance,(lance.spec.speed??620)*step/1000);
      const x=px+lance.aim.x*travel,y=py+lance.aim.y*travel;
      const hits=enemies.enemies.filter(e=>e.spawning===0&&!e.health.dead&&!lance.hits.has(e.id))
        .map(enemy=>({enemy,t:segmentCircleHit(px,py,x,y,enemy.view.x,enemy.view.y,enemy.spec.radius+(lance.spec.hitRadius??16))}))
        .filter((hit):hit is {enemy:typeof hit.enemy;t:number}=>hit.t!==null).sort((a,b)=>a.t-b.t);
      for(const {enemy} of hits){
        if(enemy.health.dead)continue;
        const ex=enemy.view.x,ey=enemy.view.y;
        if(enemies.hit(enemy,lance.spec.damage,lance.aim,'spell',null,false,lance.spec.effects)){
          lance.hits.add(enemy.id);enemies.slow(enemy,lance.spec.slow,lance.spec.duration);
          enemies.effects.spellHit(ex,ey,'ice',lance.aim);
          if(lance.spec.effects?.hitShards&&enemies.waves.cleared===this.cleared)
            enemies.burstIceOnHit(ex,ey,lance.spec.effects.hitShards,enemy.id);
        }
        if(enemies.waves.cleared!==this.cleared){this.clearObjects();this.cleared=enemies.waves.cleared;return;}
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
