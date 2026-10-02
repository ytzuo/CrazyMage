import Phaser from 'phaser';
import { ARENA, type Direction } from '../config';
import type { School } from '../upgrades/definitions';
import type { EnemySystem } from '../enemies/EnemySystem';
import { segmentCircleHit } from '../combat/collision';
import { prepareFireTextures, prepareIceTextures, prepareLightningTextures } from '../art/SpellTextures';

export const SCHOOL_SKILLS = {
  fire: {name:'焰爆', cooldown:12000, description:'在前方引爆一团火焰，击退周围敌人。'},
  ice: {name:'寒霜脉冲', cooldown:10000, description:'释放近身寒潮，让周围敌人陷入强烈减速。'},
  lightning: {name:'贯雷', cooldown:9000, description:'向前射出一道贯穿敌人的雷光。'},
} as const;
interface Visual {view:Phaser.GameObjects.Image; age:number; size:number; line:boolean}
/** One time charge; bounded cosmetic images, all advanced by active game time. */
export class SchoolSkill {
  private school:School='fire';
  private remaining:number=SCHOOL_SKILLS.fire.cooldown;
  private visuals:Visual[]=[];
  constructor(private scene:Phaser.Scene){prepareFireTextures(scene);prepareIceTextures(scene);prepareLightningTextures(scene);}
  get ready():boolean{return this.remaining===0;}
  get remainingMs():number{return this.remaining;}
  get energy():number{return Math.floor(100*(1-this.remaining/SCHOOL_SKILLS[this.school].cooldown));}
  private visual(x:number,y:number,texture:string,size:number,line=false,angle=0):void {
    if(this.visuals.length>=16)this.visuals.shift()!.view.destroy();
    const view=this.scene.add.image(x,y,texture).setDepth(12).setRotation(angle);
    if(line)view.setOrigin(0,0.5).setDisplaySize(size,36).setBlendMode(Phaser.BlendModes.ADD);
    else view.setDisplaySize(size,size);
    this.visuals.push({view,age:0,size,line});
  }
  update(delta:number):void {
    this.remaining=Math.max(0,this.remaining-delta);
    for(let i=this.visuals.length-1;i>=0;i--){
      const v=this.visuals[i];v.age+=delta;
      if(v.age>=400){v.view.destroy();this.visuals.splice(i,1);continue;}
      const t=v.age/400;v.view.setAlpha(1-t);
      if(!v.line)v.view.setDisplaySize(v.size*(0.85+0.15*t),v.size*(0.85+0.15*t));
    }
  }
  cast(x:number,y:number,aim:Direction,enemies:EnemySystem):boolean {
    if(!this.ready)return false;
    this.remaining=SCHOOL_SKILLS[this.school].cooldown;
    const length=Math.hypot(aim.x,aim.y)||1, direction={x:aim.x/length,y:aim.y/length};
    const tx=Phaser.Math.Clamp(x+direction.x*190,ARENA.inset,ARENA.width-ARENA.inset);
    const ty=Phaser.Math.Clamp(y+direction.y*190,ARENA.inset,ARENA.height-ARENA.inset);
    if(this.school==='fire')this.visual(tx,ty,'fire-impact-detail',220);
    else if(this.school==='ice')this.visual(x,y,'ice-frost-detail',480);
    else this.visual(x,y,'lightning-arc-detail-0',560,true,Math.atan2(direction.y,direction.x));
    for(const enemy of [...enemies.enemies]){
      if(enemy.spawning>0||enemy.health.dead)continue;
      const ex=enemy.view.x,ey=enemy.view.y;
      const hit=this.school==='fire'?Math.hypot(ex-tx,ey-ty)<=110+enemy.spec.radius
        :this.school==='ice'?Math.hypot(ex-x,ey-y)<=240+enemy.spec.radius
        :segmentCircleHit(x,y,x+direction.x*560,y+direction.y*560,ex,ey,enemy.spec.radius+18)!==null;
      if(!hit)continue;
      const dx=ex-(this.school==='fire'?tx:x),dy=ey-(this.school==='fire'?ty:y),d=Math.hypot(dx,dy)||1;
      if(enemies.hit(enemy,this.school==='fire'?50:this.school==='ice'?18:55,{x:dx/d,y:dy/d})){
        if(this.school==='ice')enemies.slow(enemy,0.65,2500);
        enemies.effects.spellHit(ex,ey,this.school,direction);
      }
    }
    enemies.effects.cast(x,y,this.school,direction);
    return true;
  }
  reset(school:School='fire'):void {
    for(const visual of this.visuals)visual.view.destroy();this.visuals.length=0;
    this.school=school;this.remaining=SCHOOL_SKILLS[school].cooldown;
  }
}
