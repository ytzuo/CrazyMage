import { IceZone } from './IceZone';
import Phaser from 'phaser';
import { ARENA, type Direction } from '../config';
import type { School } from '../upgrades/definitions';
import type { EnemySystem } from '../enemies/EnemySystem';
import { segmentCircleHit } from '../combat/collision';
import { prepareFireTextures, prepareIceTextures, prepareLightningTextures } from '../art/SpellTextures';

import { skillSpec, type SkillSpec } from './skillDefinitions';
export { SCHOOL_SKILLS } from './skillDefinitions';
interface Visual {view:Phaser.GameObjects.Image; age:number; size:number; line:boolean; thickness:number; life:number}
interface Release {school:'fire'|'lightning'; x:number; y:number; tx:number; ty:number; aim:Direction; age:number; enemies:EnemySystem; view:Phaser.GameObjects.Image; spec:SkillSpec}
/** Clip the release along its aim vector at map edges. */
export function skillEndpoint(x:number,y:number,direction:Direction,reach:number):{x:number;y:number} {
  const availableX=direction.x>0?(ARENA.width-ARENA.inset-x)/direction.x:direction.x<0?(ARENA.inset-x)/direction.x:Infinity;
  const availableY=direction.y>0?(ARENA.height-ARENA.inset-y)/direction.y:direction.y<0?(ARENA.inset-y)/direction.y:Infinity;
  const distance=Math.max(0,Math.min(reach,availableX,availableY));
  return {x:x+direction.x*distance,y:y+direction.y*distance};
}
/** One time charge; bounded cosmetic images, all advanced by active game time. */
export class SchoolSkill {
  private spec:SkillSpec=skillSpec('fire');
  private get school():School{return this.spec.school;}
  private remaining=0;
  private visuals:Visual[]=[];
  private release:Release|null=null;
  private iceZone:IceZone|null=null;
  constructor(private scene:Phaser.Scene){prepareFireTextures(scene);prepareIceTextures(scene);prepareLightningTextures(scene);}
  get ready():boolean{return this.remaining===0;}
  get remainingMs():number{return this.remaining;}
  get energy():number{return Math.floor(100*(1-this.remaining/this.spec.cooldown));}
  private visual(x:number,y:number,texture:string,size:number,line=false,angle=0,thickness=36,life=400):Phaser.GameObjects.Image {
    if(this.visuals.length>=16)this.visuals.shift()!.view.destroy();
    const view=this.scene.add.image(x,y,texture).setDepth(12).setRotation(angle);
    if(line)view.setOrigin(0,0.5).setDisplaySize(size,thickness).setBlendMode(Phaser.BlendModes.ADD);
    else view.setDisplaySize(size,size);
    this.visuals.push({view,age:0,size,line,thickness,life});
    return view;
  }
  update(delta:number):void {
    this.remaining=Math.max(0,this.remaining-delta);
    if(this.iceZone&&!this.iceZone.update(delta))this.iceZone=null;
    const release=this.release;
    if(release){
      release.age+=delta;
      if(release.school==='lightning'){
        release.view.setAlpha(0.5+0.5*Math.min(1,release.age/80));
        if(release.age>=80){
          this.release=null;release.view.setVisible(false);
          const angle=Math.atan2(release.aim.y,release.aim.x), reach=Math.hypot(release.tx-release.x,release.ty-release.y);
          this.visual(release.x,release.y,'lightning-arc-detail-1',reach,true,angle,release.spec.width*0.875,280);
          this.visual(release.x,release.y,'lightning-arc-detail-2',reach,true,angle,12,180);
          this.damage(release.spec,release.x,release.y,release.tx,release.ty,release.aim,release.enemies);
        }
      }else{
        const previousX=release.view.x,previousY=release.view.y,t=Math.min(1,release.age/160);
        let nx=release.x+(release.tx-release.x)*t,ny=release.y+(release.ty-release.y)*t,first=1;
        let touched=false;
        for(const enemy of release.enemies.enemies){
          if(enemy.spawning>0||enemy.health.dead)continue;
          const hit=segmentCircleHit(previousX,previousY,nx,ny,enemy.view.x,enemy.view.y,enemy.spec.radius+12);
          if(hit!==null&&hit<=first){first=hit;touched=true;}
        }
        if(touched){nx=previousX+(nx-previousX)*first;ny=previousY+(ny-previousY)*first;}
        release.view.setPosition(nx,ny);
        if(touched||t===1){
          this.release=null;release.view.setVisible(false);
          this.visual(nx,ny,'fire-impact-detail',release.spec.radius*2);
          this.visual(nx,ny,'fire-nova-detail',release.spec.radius*1.36,false,0,36,280);
          this.damage(release.spec,release.x,release.y,nx,ny,release.aim,release.enemies);
        }
      }
    }
    for(let i=this.visuals.length-1;i>=0;i--){
      const v=this.visuals[i];v.age+=delta;
      if(v.age>=v.life){v.view.destroy();this.visuals.splice(i,1);continue;}
      const t=v.age/v.life;
      if(v.view!==this.release?.view)v.view.setAlpha(1-t);
      if(v.line)v.view.setDisplaySize(v.size,v.thickness*(1-0.4*t));
      if(!v.line && v.view!==this.release?.view)v.view.setDisplaySize(v.size*(0.85+0.15*t),v.size*(0.85+0.15*t));
    }
  }
  cast(x:number,y:number,aim:Direction,enemies:EnemySystem):boolean {
    if(!this.ready||this.release)return false;
    const school=this.school;
    this.remaining=this.spec.cooldown;
    const length=Math.hypot(aim.x,aim.y), direction=length?{x:aim.x/length,y:aim.y/length}:{x:1,y:0};
    const angle=Math.atan2(direction.y,direction.x);
    if(school==='ice'){
      this.iceZone?.reset();
      this.iceZone=new IceZone(this.scene,enemies,x,y,direction,{radius:this.spec.radius,damage:this.spec.damage,duration:this.spec.duration,interval:300,fan:true,source:'spell',frost:0,freeze:0});
    }else{
      const reach=this.spec.reach;
      // Clip along the aim vector, preserving the direction near arena walls.
      const endpoint=skillEndpoint(x,y,direction,reach), distance=Math.hypot(endpoint.x-x,endpoint.y-y);
      const view=school==='fire'?this.visual(x,y,'fireball-detail',78,false,angle,36,300):this.visual(x,y,'lightning-arc-detail-0',distance,true,angle,8,180);
      if(school==='fire')view.setOrigin(64/96,0.5).setDisplaySize(78,46);
      this.release={school:school,x,y,tx:endpoint.x,ty:endpoint.y,aim:direction,age:0,enemies,view,spec:this.spec};
    }
    enemies.effects.cast(x,y,school,direction);
    return true;
  }
  private damage(spec:SkillSpec,x:number,y:number,tx:number,ty:number,direction:Direction,enemies:EnemySystem):void {
    const school=spec.school;
    for(const enemy of [...enemies.enemies]){
      if(enemy.spawning>0||enemy.health.dead)continue;
      const ex=enemy.view.x,ey=enemy.view.y;
      const hit=school==='fire'?Math.hypot(ex-tx,ey-ty)<=spec.radius+enemy.spec.radius
        :school==='ice'?Math.hypot(ex-x,ey-y)<=spec.radius+enemy.spec.radius
        :segmentCircleHit(x,y,tx,ty,ex,ey,enemy.spec.radius+spec.width/2)!==null;
      if(!hit)continue;
      const dx=ex-(school==='fire'?tx:x),dy=ey-(school==='fire'?ty:y),d=Math.hypot(dx,dy)||1;
      if(enemies.hit(enemy,spec.damage,school==='lightning'?direction:{x:dx/d,y:dy/d})){
        if(school==='ice')enemies.slow(enemy,spec.slow,spec.duration);
        enemies.effects.spellHit(ex,ey,school,direction);
      }
    }
  }
  configure(spec:SkillSpec):void {
    this.remaining=this.remaining/this.spec.cooldown*spec.cooldown;
    this.spec=spec;
  }
  reset(school:School='fire'):void {
    for(const visual of this.visuals)visual.view.destroy();this.visuals.length=0;
    this.release=null;this.iceZone?.reset();this.iceZone=null;
    this.spec=skillSpec(school);this.remaining=0;
  }
}
