import { prepareFireTextures, prepareLightningTextures, prepareIceTextures } from '../art/SpellTextures';
import Phaser from 'phaser';
import type { EnemySystem } from '../enemies/EnemySystem';
import type { Direction } from '../config';
import type { School } from '../upgrades/definitions';
import { UltimateCharge } from './UltimateCharge';
import { ultimateSpec, type UltimateSpec } from './definitions';
interface Sequence { spec:UltimateSpec; x:number; y:number; enemies:EnemySystem; elapsed:number; next:number; aim:Direction; fireHits:number[][] }
interface Motion { x:number; y:number; dx:number; dy:number; reach:number }
interface Visual { motion?:Motion; view:Phaser.GameObjects.Image; age:number; life:number; size:number; ring:boolean }
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
  configure(school:School | UltimateSpec,level=1):void{this.spec=typeof school==='string'?ultimateSpec(school,level):school;}
  private visual(x:number,y:number,size:number,ring:boolean,life=800,texture?:string,motion?:Motion):void {
    if(this.visuals.length>=40)this.visuals.shift()!.view.destroy();
    const view=this.scene.add.image(x,y,texture ?? (ring?(this.spec.school==='fire'?'fire-nova-detail':this.spec.school==='ice'?'ice-frost-detail':'ultimate-ring'):'lightning-bolt-detail')).setTint(ring && (!texture || texture==='ultimate-ring')?0xb8caff:0xffffff).setDepth(ring?8:14);
    if(ring)view.setDisplaySize(size,size);else view.setOrigin(0.5,1).setDisplaySize(64,size).setBlendMode(Phaser.BlendModes.ADD);
    this.visuals.push({view,age:0,life,size,ring,motion});
  }
  private targets(seq:Sequence) {
    return seq.enemies.enemies.filter(e=>e.spawning===0&&!e.health.dead&&(e.view.x-seq.x)**2+(e.view.y-seq.y)**2<=(seq.spec.radius+e.spec.radius)**2)
      .filter(e=>seq.spec.school!=='fire'||this.inFan(seq,e.view.x,e.view.y,e.spec.radius))
      .sort((a,b)=>((a.view.x-seq.x)**2+(a.view.y-seq.y)**2)-((b.view.x-seq.x)**2+(b.view.y-seq.y)**2)||a.id-b.id).slice(0,seq.spec.targets);
  }
  cast(x:number,y:number,enemies:EnemySystem,aim:Direction={x:1,y:0}):boolean {
    if(!this.charge.ready || this.sequence)return false;
    const length=Math.hypot(aim.x,aim.y);
    const seq:Sequence={spec:this.spec,x,y,enemies,elapsed:0,next:1,aim:length>0?{x:aim.x/length,y:aim.y/length}:{x:1,y:0},fireHits:Array.from({length:this.spec.pulses},()=>[])};
    if(!this.targets(seq).length)return false;
    this.charge.consume();this.casts++;this.sequence=seq;
    this.pulse(seq,0);
    if(seq.spec.school==='fire')this.fireDamage(seq);
    enemies.effects.empower(x,y,seq.spec.school);
    return true;
  }
  private pulse(seq:Sequence,index:number):void {
    const {x,y,spec,enemies}=seq;
    const targets=spec.school==='fire'?[]:this.targets(seq);
    for(const enemy of [...targets]){
      const tx=enemy.view.x,ty=enemy.view.y,dx=tx-x,dy=ty-y,d=Math.hypot(dx,dy)||1;
      const settled=enemies.hit(enemy,spec.damage,{x:dx/d,y:dy/d},'ultimate');
      if(spec.school==='ice'&&settled)enemies.freeze(enemy,spec.freeze);
      if(spec.school==='lightning'){
        this.visual(tx,ty,260,false,400);this.visual(tx,ty,70,true,400);
        enemies.effects.spellHit(tx,ty,'lightning',{x:dx/d,y:dy/d});
      }
    }
    if(spec.school==='fire'){
      const heading=Math.atan2(seq.aim.y,seq.aim.x);
      for(let i=0;i<11;i++){
        const angle=heading+(i-5)*Math.PI/18,dx=Math.cos(angle),dy=Math.sin(angle);
        this.visual(x+dx*60,y+dy*60,110,true,spec.interval,'fire-impact-detail',{x,y,dx,dy,reach:spec.radius});
      }
    }else if(spec.school==='ice'&&index===0){
      this.visual(x,y,spec.radius*2,true,800,'ice-frost-detail');
      this.visual(x,y,spec.radius*1.3,true,650,'ice-frost-detail');
    }
    // Do not carry an old damage sequence into a newly spawned wave after clearing.
    if(!enemies.enemies.length)this.sequence=null;
  }
  private inFan(seq:Sequence,x:number,y:number,radius:number):boolean {
    const dx=x-seq.x,dy=y-seq.y,d=Math.hypot(dx,dy);
    return dx*seq.aim.x+dy*seq.aim.y>=d*Math.cos(Math.PI*5/18)-radius;
  }
  private fireDamage(seq:Sequence):void {
    for(let wave=0;wave<seq.spec.pulses;wave++){
      const age=seq.elapsed-wave*seq.spec.interval;
      if(age<0||age>seq.spec.interval)continue;
      const front=60+(seq.spec.radius-60)*age/seq.spec.interval;
      for(const enemy of [...seq.enemies.enemies]){
        if(seq.fireHits[wave].length>=seq.spec.targets)break;
        if(this.sequence!==seq)return;
        const dx=enemy.view.x-seq.x,dy=enemy.view.y-seq.y,d=Math.hypot(dx,dy);
        if(enemy.spawning>0||enemy.health.dead||d>seq.spec.radius+enemy.spec.radius||seq.fireHits[wave].includes(enemy.id)||Math.abs(d-front)>55+enemy.spec.radius||!this.inFan(seq,enemy.view.x,enemy.view.y,enemy.spec.radius))continue;
        seq.fireHits[wave].push(enemy.id);
        const tx=enemy.view.x,ty=enemy.view.y;
        if(seq.enemies.hit(enemy,seq.spec.damage,{x:dx/(d||1),y:dy/(d||1)},'ultimate'))seq.enemies.effects.spellHit(tx,ty,'fire',seq.aim);
      }
      if(!seq.enemies.enemies.length){this.sequence=null;return;}
    }
  }
  update(delta:number):void {
    const seq=this.sequence;
    if(seq){
      seq.elapsed+=delta;
      while(this.sequence===seq&&seq.next<seq.spec.pulses&&seq.elapsed>=seq.next*seq.spec.interval){
        this.pulse(seq,seq.next++);
      }
      if(seq.spec.school==='fire')this.fireDamage(seq);
      if((seq.spec.school==='fire'?seq.elapsed>=seq.spec.pulses*seq.spec.interval:seq.next>=seq.spec.pulses) || !seq.enemies.enemies.length)this.sequence=null;
    }
    for(let i=this.visuals.length-1;i>=0;i--){
      const v=this.visuals[i];v.age+=delta;
      if(v.age>=v.life){v.view.destroy();this.visuals.splice(i,1);continue;}
      const t=v.age/v.life;v.view.setAlpha((1-t)*(v.ring?1:0.75+0.25*Math.cos(v.age*0.07)**2));
      if(v.motion){
        const m=v.motion,r=60+(m.reach-60)*t;
        v.view.setPosition(m.x+m.dx*r,m.y+m.dy*r).setAlpha(Math.min(1,t*8)*(1-t**4)).setDisplaySize(v.size*(0.6+t*0.7),v.size*(0.6+t*0.7));
      }else if(v.ring)v.view.setDisplaySize(v.size*(0.8+0.2*t),v.size*(0.8+0.2*t));
    }
  }
  reset(school:School='fire'):void{for(const v of this.visuals)v.view.destroy();this.visuals.length=0;this.sequence=null;this.charge.reset();this.casts=0;this.configure(school,1);}
}
