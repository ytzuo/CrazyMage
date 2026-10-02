import { prepareFireTextures, prepareLightningTextures, prepareIceTextures } from '../art/SpellTextures';
import Phaser from 'phaser';
import type { EnemySystem } from '../enemies/EnemySystem';
import type { School } from '../upgrades/definitions';
import { UltimateCharge } from './UltimateCharge';
import { ultimateSpec, type UltimateSpec } from './definitions';
interface Sequence { spec:UltimateSpec; x:number; y:number; enemies:EnemySystem; elapsed:number; next:number; frozenIds:number[] }
interface Visual { view:Phaser.GameObjects.Image; age:number; life:number; size:number; ring:boolean }
/** One bounded sequence at a time; snapshots and timers advance only with active game time. */
export class UltimateSpell {
  readonly charge = new UltimateCharge();
  private visuals:Visual[]=[];
  private sequence:Sequence|null=null;
  spec:UltimateSpec=ultimateSpec('fire',1);
  casts=0;
  get effectCount():number{return this.visuals.length;}
  constructor(private scene:Phaser.Scene){
    prepareFireTextures(scene);prepareLightningTextures(scene);prepareIceTextures(scene);
    if(scene.textures.exists('ultimate-ring'))return;
    const g=scene.make.graphics({},false);
    g.fillStyle(0xffffff,0.035).fillCircle(128,128,122);
    g.lineStyle(4,0xffffff,0.9).strokeCircle(128,128,120);
    g.lineStyle(2,0xffffff,0.4).strokeCircle(128,128,108);
    for(let i=0;i<16;i++){
      const a=i*Math.PI/8,c=Math.cos(a),s=Math.sin(a);
      g.lineStyle(3,0xffffff,0.8).lineBetween(128+c*94,128+s*94,128+c*116,128+s*116);
    }
    g.generateTexture('ultimate-ring',256,256);g.destroy();
  }
  configure(school:School,level:number):void{this.spec=ultimateSpec(school,level);}
  private visual(x:number,y:number,size:number,ring:boolean,life=800,texture?:string):void {
    if(this.visuals.length>=40)this.visuals.shift()!.view.destroy();
    const view=this.scene.add.image(x,y,texture ?? (ring?(this.spec.school==='fire'?'fire-nova-detail':this.spec.school==='ice'?'ice-frost-detail':'ultimate-ring'):'lightning-bolt-detail')).setTint(ring && (!texture || texture==='ultimate-ring')?0xb8caff:0xffffff).setDepth(ring?8:14);
    if(ring)view.setDisplaySize(size,size);else view.setOrigin(0.5,1).setDisplaySize(64,size).setBlendMode(Phaser.BlendModes.ADD);
    this.visuals.push({view,age:0,life,size,ring});
  }
  private targets(seq:Sequence) {
    return seq.enemies.enemies.filter(e=>e.spawning===0&&!e.health.dead&&(e.view.x-seq.x)**2+(e.view.y-seq.y)**2<=(seq.spec.radius+e.spec.radius)**2)
      .sort((a,b)=>((a.view.x-seq.x)**2+(a.view.y-seq.y)**2)-((b.view.x-seq.x)**2+(b.view.y-seq.y)**2)||a.id-b.id).slice(0,seq.spec.targets);
  }
  cast(x:number,y:number,enemies:EnemySystem):boolean {
    if(!this.charge.ready || this.sequence)return false;
    const seq:Sequence={spec:this.spec,x,y,enemies,elapsed:0,next:1,frozenIds:[]};
    if(!this.targets(seq).length)return false;
    this.charge.consume();this.casts++;this.sequence=seq;
    this.pulse(seq,0);
    enemies.effects.empower(x,y,seq.spec.school);
    return true;
  }
  private pulse(seq:Sequence,index:number):void {
    const {x,y,spec,enemies}=seq;
    const targets=spec.school==='ice'&&index>0
      ? enemies.enemies.filter(e=>seq.frozenIds.includes(e.id)&&e.frozen>0&&!e.health.dead)
      : this.targets(seq);
    for(const enemy of [...targets]){
      const tx=enemy.view.x,ty=enemy.view.y,dx=tx-x,dy=ty-y,d=Math.hypot(dx,dy)||1;
      const settled=enemies.hit(enemy,spec.school==='ice'&&index>0?spec.secondaryDamage:spec.damage,{x:dx/d,y:dy/d},'ultimate');
      if(spec.school==='ice'&&index===0&&settled){enemies.freeze(enemy,spec.freeze);if(!enemy.health.dead)seq.frozenIds.push(enemy.id);}
      if(spec.school==='ice'&&index>0)this.visual(tx,ty,95,true,450,'ice-frost-detail');
      if(spec.school==='lightning'){
        this.visual(tx,ty,260,false,400);this.visual(tx,ty,70,true,400);
        enemies.effects.spellHit(tx,ty,'lightning',{x:dx/d,y:dy/d});
      }
    }
    if(spec.school==='fire'){
      this.visual(x,y,spec.radius*2,true,550,'fire-nova-detail');
      for(let i=0;i<6;i++){const a=i*Math.PI/3+index*.4;this.visual(x+Math.cos(a)*spec.radius*.65,y+Math.sin(a)*spec.radius*.65,140,true,450,'fire-impact-detail');}
    }else if(spec.school==='ice'&&index===0){
      this.visual(x,y,spec.radius*2,true,800,'ice-frost-detail');
      this.visual(x,y,spec.radius*1.3,true,650,'ice-frost-detail');
    }
    // Do not carry an old damage sequence into a newly spawned wave after clearing.
    if(!enemies.enemies.length)this.sequence=null;
  }
  update(delta:number):void {
    const seq=this.sequence;
    if(seq){
      seq.elapsed+=delta;
      while(this.sequence===seq&&seq.next<seq.spec.pulses&&seq.elapsed>=seq.next*seq.spec.interval){
        this.pulse(seq,seq.next++);
      }
      if(seq.next>=seq.spec.pulses || !seq.enemies.enemies.length)this.sequence=null;
    }
    for(let i=this.visuals.length-1;i>=0;i--){
      const v=this.visuals[i];v.age+=delta;
      if(v.age>=v.life){v.view.destroy();this.visuals.splice(i,1);continue;}
      const t=v.age/v.life;v.view.setAlpha((1-t)*(v.ring?1:0.75+0.25*Math.cos(v.age*0.07)**2));
      if(v.ring)v.view.setDisplaySize(v.size*(0.8+0.2*t),v.size*(0.8+0.2*t));
    }
  }
  reset(school:School='fire'):void{for(const v of this.visuals)v.view.destroy();this.visuals.length=0;this.sequence=null;this.charge.reset();this.casts=0;this.configure(school,1);}
}
