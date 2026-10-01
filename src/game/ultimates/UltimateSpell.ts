import Phaser from 'phaser';
import type { EnemySystem } from '../enemies/EnemySystem';
import type { School } from '../upgrades/definitions';
import { SCHOOL_COLOR } from '../effects/CombatEffects';
import { UltimateCharge } from './UltimateCharge';
import { ultimateSpec, type UltimateSpec } from './definitions';
interface Visual { view:Phaser.GameObjects.Image; age:number; life:number; size:number; ring:boolean }
/** Instant, bounded damage settlement; only cached cosmetic images survive release. */
export class UltimateSpell {
  readonly charge = new UltimateCharge();
  private visuals:Visual[]=[];
  spec:UltimateSpec=ultimateSpec('fire',1);
  casts=0;
  get effectCount():number{return this.visuals.length;}
  constructor(private scene:Phaser.Scene){
    if(scene.textures.exists('ultimate-ring'))return;
    const g=scene.make.graphics({},false);
    g.fillStyle(0xffffff,0.035).fillCircle(128,128,122);
    g.lineStyle(4,0xffffff,0.9).strokeCircle(128,128,120);
    g.lineStyle(2,0xffffff,0.4).strokeCircle(128,128,108);
    for(let i=0;i<16;i++){
      const a=i*Math.PI/8,c=Math.cos(a),s=Math.sin(a);
      g.lineStyle(3,0xffffff,0.8).lineBetween(128+c*94,128+s*94,128+c*116,128+s*116);
    }
    g.generateTexture('ultimate-ring',256,256);g.clear();
    g.lineStyle(10,0xffffff,0.2).beginPath().moveTo(29,0).lineTo(14,54).lineTo(36,49).lineTo(17,110).lineTo(31,100).lineTo(22,160).strokePath();
    g.lineStyle(3,0xffffff,1).beginPath().moveTo(29,0).lineTo(14,54).lineTo(36,49).lineTo(17,110).lineTo(31,100).lineTo(22,160).strokePath();
    g.generateTexture('ultimate-bolt',48,160);g.destroy();
  }
  configure(school:School,level:number):void{this.spec=ultimateSpec(school,level);}
  private visual(x:number,y:number,size:number,ring:boolean,life=800):void {
    if(this.visuals.length>=40)this.visuals.shift()!.view.destroy();
    const view=this.scene.add.image(x,y,ring?'ultimate-ring':'ultimate-bolt').setTint(SCHOOL_COLOR[this.spec.school]).setDepth(ring?8:14);
    if(ring)view.setDisplaySize(size,size);else view.setOrigin(0.5,1).setDisplaySize(48,size);
    this.visuals.push({view,age:0,life,size,ring});
  }
  cast(x:number,y:number,enemies:EnemySystem):boolean {
    if(!this.charge.ready)return false;
    const spec=this.spec;
    const targets=enemies.enemies.filter(e=>e.spawning===0&&!e.health.dead&&(e.view.x-x)**2+(e.view.y-y)**2<=(spec.radius+e.spec.radius)**2)
      .sort((a,b)=>((a.view.x-x)**2+(a.view.y-y)**2)-((b.view.x-x)**2+(b.view.y-y)**2)||a.id-b.id).slice(0,spec.targets);
    if(!targets.length)return false; // Do not waste a full charge on an empty arena.
    this.charge.consume();this.casts++;
    for(const enemy of targets){
      const dx=enemy.view.x-x,dy=enemy.view.y-y,d=Math.hypot(dx,dy)||1;
      const tx=enemy.view.x,ty=enemy.view.y;
      if(enemies.hit(enemy,spec.damage,{x:dx/d,y:dy/d},'ultimate')&&spec.freeze)enemies.freeze(enemy,spec.freeze);
      if(spec.school==='lightning'){this.visual(tx,ty,180,false,450);this.visual(tx,ty,70,true,450);}
    }
    if(spec.school!=='lightning'){
      this.visual(x,y,spec.radius*2,true);
      this.visual(x,y,spec.radius*1.3,true,650);
      if(spec.school==='fire')for(let i=0;i<8;i++){const a=i*Math.PI/4;this.visual(x+Math.cos(a)*spec.radius*0.6,y+Math.sin(a)*spec.radius*0.6,120,true,550);}
    }
    enemies.effects.empower(x,y,spec.school);
    return true;
  }
  update(delta:number):void {
    for(let i=this.visuals.length-1;i>=0;i--){
      const v=this.visuals[i];v.age+=delta;
      if(v.age>=v.life){v.view.destroy();this.visuals.splice(i,1);continue;}
      const t=v.age/v.life;v.view.setAlpha(1-t);
      if(v.ring)v.view.setDisplaySize(v.size*(0.8+0.2*t),v.size*(0.8+0.2*t));
    }
  }
  reset(school:School='fire'):void{for(const v of this.visuals)v.view.destroy();this.visuals.length=0;this.charge.reset();this.casts=0;this.configure(school,1);}
}
