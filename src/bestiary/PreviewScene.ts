import Phaser from 'phaser';
import { Player } from '../game/entities/Player';
import { EnemySystem, type Enemy } from '../game/enemies/EnemySystem';
import { enemySpec, isBoss } from '../game/enemies/roster';
import type { EnemySpec } from '../game/enemies/roster';
import type { EnemyVariant } from '../game/enemies/variants';
import { enemyTexture } from '../game/art/CharacterTextures';
import type { BossCombat } from '../game/enemies/BossCombat';
import type { GuardianMove } from '../game/enemies/GuardianRules';
import type { WeaverMove } from '../game/enemies/WeaverRules';
import type { GameMode } from '../game/modes';
import { CATALOG, type Entry, type Form, type DemoMode } from './catalog';
export interface PreviewSelection {entry:Entry;form:Form;demo:DemoMode;move:string;wave:number;growth:GameMode}
interface PreviewAccess {
  createEnemy(x:number,y:number,wave:number,spec:EnemySpec,variant:EnemyVariant,warning:number):void;
  bosses:BossCombat;
}
/** One scene and one real combat system for the entire book, at most four actors.
 * Replays reuse cached textures and clear every attack, rig and fragment first.
 */
export class PreviewScene extends Phaser.Scene {
  selection!:PreviewSelection;
  speed=1;manualPause=false;validating=false;
  private player!:Player;private system!:EnemySystem;private primary:Enemy|null=null;
  private allies:Enemy[]=[];private elapsed=0;private publishWait=0;private actionStep=0;private roll=0;
  private dragging=false;private target={x:1350,y:930};private message='';private messageUntil=0;
  private ready=false;private pauseReasons=new Set<string>();
  private bossStarted=false;
  private resized?:ResizeObserver;private lastWidth=0;private lastHeight=0;
  constructor(private host:HTMLElement,private onReady:(portraits:Map<string,string>)=>void,private onPhase:(phase:string)=>void) {super('bestiary');}
  get booted():boolean {return this.ready;}
  get hasActor():boolean {return !!this.primary&&!this.primary.health.dead;}
  private get access():PreviewAccess {return this.system as unknown as PreviewAccess;}
  create():void {
    const grid=this.textures.createCanvas('bestiary-floor',64,64)!;
    const c=grid.context;c.fillStyle='#172321';c.fillRect(0,0,64,64);c.strokeStyle='#263631';c.lineWidth=1;
    c.strokeRect(.5,.5,63,63);c.fillStyle='#35433a';c.fillRect(31,31,2,2);grid.refresh();
    this.add.tileSprite(1200,900,2400,1800,'bestiary-floor').setDepth(0);
    const g=this.add.graphics().setDepth(1);g.lineStyle(1,0xb5a272,.13).strokeCircle(1200,930,260).strokeCircle(1200,930,270);
    this.player=new Player(this);this.player.health.maximum=1e8;this.player.health.current=1e8;
    this.system=new EnemySystem(this,undefined,undefined,()=>this.roll++%2===0?.1:.9);
    const portraits=new Map<string,string>();
    for(const entry of CATALOG)for(const form of entry.forms) {
      const key=form.half?(entry.kind==='boss'?'enemy-boss-enraged-detail':'enemy-weaver-enraged-detail'):enemyTexture(entry.kind,form.variant);
      portraits.set(entry.kind+':'+form.name,(this.textures.get(key).getSourceImage() as HTMLCanvasElement).toDataURL());
    }
    this.ready=true;this.resetEncounter();this.onReady(portraits);
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(this.selection.demo==='movement')return;this.dragging=true;this.moveTarget(p);});
    this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(this.dragging&&p.isDown)this.moveTarget(p);});
    this.input.on('pointerup',()=>this.dragging=false);this.input.on('gameout',()=>this.dragging=false);
    this.resized=new ResizeObserver(()=>this.resize());this.resized.observe(this.host);this.resize();
    window.addEventListener('blur',this.onBlur);document.addEventListener('visibilitychange',this.onVisibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      this.resized?.disconnect();window.removeEventListener('blur',this.onBlur);document.removeEventListener('visibilitychange',this.onVisibility);this.system.reset();
    });
    if(this.pauseReasons.size)this.game.events.once(Phaser.Core.Events.POST_RENDER,()=>this.sleep());
  }
  private onBlur=()=>this.pause('失焦');
  private onVisibility=()=>{if(document.hidden)this.pause('后台');};
  private moveTarget(p:Phaser.Input.Pointer):void {
    this.target.x=Phaser.Math.Clamp(p.worldX,500,1900);this.target.y=Phaser.Math.Clamp(p.worldY,400,1400);
    this.player.view.setPosition(this.target.x,this.target.y);
  }
  configure(selection:PreviewSelection):void {this.selection=selection;if(this.ready){this.resetEncounter();this.redraw();}}
  private spawn(x:number,y:number,spec:EnemySpec,variant:EnemyVariant):Enemy {
    this.access.createEnemy(x,y,this.selection.wave,spec,variant,0);
    if(this.system.enemies.length===1)this.system.waves.register(this.selection.wave,1);else this.system.waves.add(this.selection.wave,1);
    const e=this.system.enemies.at(-1)!;e.view.setAlpha(1);e.warning.setVisible(false);return e;
  }
  resetEncounter():void {
    if(!this.ready)return;
    this.system.reset();this.player.reset();this.elapsed=this.publishWait=this.actionStep=this.roll=0;this.message='';this.bossStarted=false;
    this.system.mode=this.selection.growth;this.system.waveClock.wave=this.selection.wave;this.system.waveClock.scheduleNext(1e9);this.allies=[];
    const {entry,form,demo,move}=this.selection,spec=enemySpec(entry.kind,this.selection.wave,this.selection.growth);
    this.primary=this.spawn(1100,930,spec,form.variant);
    if(form.half){this.primary.health.current=this.primary.health.maximum*.4;this.primary.bar.scaleX=.4;}
    const near=entry.kind==='boss'&&(move==='sweep'||move==='stomp');
    const gap=entry.kind==='boss'?(near?190:410):entry.kind==='weaver'?300:entry.kind==='bomber'?100:
      entry.kind==='priest'?300:entry.kind==='ranged'?250:entry.kind==='artillery'?340:form.variant==='dasher'?210:spec.range*.95;
    this.target={x:1100+gap,y:930};this.player.view.setPosition(this.target.x,this.target.y).setVisible(demo!=='movement');
    this.primary.cooldown=demo==='movement'||isBoss(entry.kind)?1e9:entry.kind==='bomber'?0:600;
    if(entry.kind==='boss') {
      const fight=(this.access.bosses as unknown as {fights:Map<number,{last:GuardianMove|null}>}).fights.get(this.primary.id)!;
      fight.last=move==='sweep'?'stomp':move==='stomp'?'sweep':move==='charge'?'rupture':'charge';
    }
    if(entry.kind==='weaver') {
      const fight=(this.access.bosses.weavers as unknown as {fights:Map<number,{last:WeaverMove|null}>}).fights.get(this.primary.id)!;
      fight.last=move==='teleport'?'orbs':move==='lines'?'teleport':'lines';
    }
    if(demo!=='movement'&&(entry.kind==='priest'||entry.kind==='bomber')) {
      const count=entry.kind==='priest'||demo==='mechanic'?3:1;
      for(let i=0;i<count;i++) {
        const far=entry.kind==='bomber'&&i===0;
        const ally=this.spawn(1100-(far?250:65),930+(i-1)*55,{...enemySpec('chaser',this.selection.wave,this.selection.growth),speed:0},'normal');
        ally.cooldown=1e9;this.allies.push(ally);
      }
    }
    this.access.bosses.pose(this.primary);this.cameraPose();this.report();
  }
  private resize():void {
    const width=Math.max(1,Math.round(this.host.clientWidth)),height=Math.max(1,Math.round(this.host.clientHeight));
    if(width===this.lastWidth&&height===this.lastHeight)return;
    this.lastWidth=width;this.lastHeight=height;this.scale.resize(width,height);this.cameraPose();this.redraw();
  }
  private cameraPose():void {
    const boss=isBoss(this.selection.entry.kind),moving=this.selection.demo==='movement';
    const width=this.scale.width,height=this.scale.height;
    this.cameras.main.setZoom(Math.min(width/(moving?460:boss?1100:680),height/(moving?300:boss?670:310)));
    if(moving&&this.primary)this.cameras.main.centerOn(this.primary.view.x,this.primary.view.y-10);
    else this.cameras.main.centerOn(boss?1270:(1100+this.target.x)/2,910);
  }
  update(_time:number,delta:number):void {this.advance(Math.min(delta,50)*this.speed);}
  /** Shared by normal playback and development verification; always uses active time. */
  advance(delta:number):void {
    if(!this.ready||delta<=0)return;
    this.elapsed+=delta;this.publishWait+=delta;
    const e=this.primary,{demo,entry,form}=this.selection;
    if(e&&isBoss(entry.kind)&&demo!=='movement'&&this.bossStarted&&!e.frozen) {
      const phase=e.spec.kind==='weaver'?this.access.bosses.weavers.inspect(e.id)?.phase:this.access.bosses.inspect(e.id)?.phase;
      // Finish the actual five-second rest, then replay the selected move before another can start.
      if(phase==='idle'&&e.cooldown<=delta){this.resetEncounter();return;}
    }
    this.player.health.heal(1e6);
    if(demo==='movement'&&e&&!e.health.dead) {
      for(const actor of this.system.enemies)actor.cooldown=1e9;
      const a=this.elapsed/1800;
      this.player.view.setPosition(e.view.x+Math.cos(a)*800,e.view.y+Math.sin(a)*450);
    } else if(!this.dragging) {
      // Triple sigils demonstrate their independent locks using a gently moving target.
      const walking=form.variant==='triple';
      this.player.view.setPosition(this.target.x,this.target.y+(walking?Math.sin(this.elapsed/1100)*100:0));
    }
    this.player.update({x:0,y:0},delta);
    this.system.update(delta,this.player);
    if(e&&isBoss(entry.kind)&&demo!=='movement'&&!this.bossStarted&&!e.frozen&&!e.health.dead&&this.elapsed>=600) {
      // Place the cast explicitly for the guide, preserving its actual warnings, geometry and damage.
      e.cooldown=0;this.bossStarted=true;
      if(e.spec.kind==='boss') {
        const boss=this.access.bosses as unknown as {fights:Map<number,unknown>;begin(f:unknown,move:GuardianMove,p:Player):void};
        boss.begin(boss.fights.get(e.id),this.selection.move as GuardianMove,this.player);
      } else {
        const boss=this.access.bosses.weavers as unknown as {fights:Map<number,unknown>;begin(f:unknown,p:Player):void};
        boss.begin(boss.fights.get(e.id),this.player);
      }
      this.access.bosses.pose(e);
    }
    if(!this.system.enemies.length)this.system.waveClock.scheduleNext(1e9);
    if(demo==='mechanic') {
      if(form.variant==='splitter'&&this.actionStep===0&&this.elapsed>=1200){this.actionStep++;this.mechanicAction();}
      else if(entry.kind==='bomber'&&this.actionStep===0&&e&&e.windup>0&&this.elapsed>=650){this.actionStep++;this.mechanicAction();}
      else if(form.variant==='guardian'&&this.elapsed>=1200+this.actionStep*600&&this.actionStep<2){this.actionStep++;this.hit();}
      else if(entry.kind==='priest'&&this.actionStep===0&&this.system.special.counts.shields>0){this.actionStep++;this.mechanicAction();}
      else if(form.variant==='ward'&&this.actionStep===0&&this.system.special.counts.wards>0&&this.elapsed>=2600){this.actionStep++;this.mechanicAction();}
    }
    if(demo==='movement')this.cameraPose();
    // One bounded encounter at a time, including five-second boss rest and all return projectiles.
    if(this.elapsed>(isBoss(entry.kind)?18000:demo==='mechanic'?6500:entry.kind==='bomber'?7000:10000))this.resetEncounter();
    if(this.publishWait>=200){this.publishWait=0;this.report();}
  }
  hit():void {
    const e=this.primary;if(!e||e.health.dead)return;
    const before=e.health.current;
    this.system.hit(e,Math.max(1,e.health.maximum*.08),{x:0,y:0});
    this.say(e.health.current===before?'格挡成功 · 本次生命未下降':'命中 · 观察闪白、蓄力和生命条');this.redraw();
  }
  freeze():void {
    if(!this.primary||this.primary.health.dead)return;
    this.system.freeze(this.primary,2000,false);this.say('冻结 2 秒 · 观察动作与待发攻击');this.redraw();
  }
  mechanicAction():void {
    const e=this.primary;if(!e||e.health.dead)return;
    const {entry,form}=this.selection;
    if(form.variant==='splitter') {
      this.system.hit(e,e.health.maximum*10,{x:0,y:0});this.say('母体死亡 · 两只碎片继续追击');
    } else if(entry.kind==='bomber') {
      if(e.windup<=0){this.player.view.setPosition(e.view.x+95,e.view.y);this.system.update(1,this.player);}
      this.system.hit(e,e.health.maximum*10,{x:0,y:0});this.say('蓄力击杀 · 爆炸只伤害附近敌人');
    } else if(form.variant==='guardian')this.hit();
    else if(entry.kind==='priest') {
      const ally=this.allies.find(a=>!a.health.dead);if(!ally)return;
      if(form.variant==='ward'){ally.view.setPosition(e.view.x+230,e.view.y);this.say('同伴移出结界 · 减伤立即失效');}
      else {this.system.hit(ally,ally.health.maximum*.3,{x:0,y:0});this.say('同伴护盾破碎 · 超出部分扣除生命');}
    }
    this.redraw();
  }
  private say(message:string):void {this.message=message;this.messageUntil=this.elapsed+1500;this.report();}
  private report():void {
    if(this.validating)return;
    let label='追击 / 调整距离';const e=this.primary;
    if(this.message&&this.elapsed<this.messageUntil)label=this.message;
    else if(e?.health.dead)label=this.selection.form.variant==='splitter'?'碎片追击':'爆炸反馈';
    else if(e?.frozen)label='冻结中';
    else if(this.selection.demo==='movement')label='移动中 · 观察步态';
    else if(e&&isBoss(e.spec.kind)) {
      if(e.spec.kind==='weaver') {
        const s=this.access.bosses.weavers.inspect(e.id);
        label=s?.phase==='teleport'?'落点预警':s?.phase==='landing'?(s.ghost?'残影切线 / 落地停顿':'落地停顿'):s?.phase==='lines'?
          (s.lines.some(l=>l.active)?'切线生效':'切线预警'):s?.phase==='orb-warning'?'魔核路径预警':s?.phase==='orbs'?
          (s.orbs[0]?.stage==='pause'?'魔核停顿':s.orbs[0]?.stage==='return'?'魔核返程':'魔核飞出'):e.cooldown>0?'休息 / 调整距离':'准备施法';
      } else {
        const s=this.access.bosses.inspect(e.id);
        label=s?.exposure?'露核 · 所受伤害 ×1.3':s?.phase==='dash'?'锁向冲撞':s?.phase==='attack'?'预警 / 连续招式':e.cooldown>0?'休息 / 接近目标':'准备攻击';
      }
    } else if(e?.windup)label=this.selection.entry.kind==='bomber'?'自爆倒数':'蓄力预警';
    else if(e?.dashTime)label='锁向突刺';
    else if(e?.burstRemaining)label='三连发';
    else if(this.system.special.counts.wards)label='固定结界 · 同伴减伤';
    else if(this.system.special.counts.shields)label='护盾生效';
    else if(e?.attackTime||this.system.shots.count)label='攻击 / 弹丸飞行';
    else if(e?.cooldown)label='冷却 / 调整距离';
    this.onPhase(this.manualPause?'已暂停':label);
  }
  private sleep():void {this.game.pause();this.game.loop.sleep();}
  pause(reason='手动'):void {
    this.pauseReasons.add(reason);this.manualPause=true;this.dragging=false;
    if(this.ready)this.sleep();this.onPhase('已暂停');
  }
  resume():void {
    if(document.hidden)return;this.pauseReasons.clear();this.manualPause=false;
    if(this.ready){this.game.resume();this.game.loop.wake();this.report();}
  }
  /** Refresh a paused encounter once without restarting its simulation clock. */
  redraw():void {
    if(!this.ready||!this.pauseReasons.size||this.validating)return;
    this.game.resume();this.game.loop.wake();this.scene.pause();
    this.game.events.once(Phaser.Core.Events.POST_RENDER,()=>{this.sleep();this.scene.resume();});
  }
  diagnostics() {
    const b=this.access.bosses;
    const boss=this.primary?.spec.kind==='boss'?b.inspect(this.primary.id):null;
    const weaver=this.primary?.spec.kind==='weaver'?b.weavers.inspect(this.primary.id):null;
    return {actors:this.system.enemies.length,roots:this.children.list.length,textures:this.textures.getTextureKeys().length,
      shots:this.system.shots.count,guardianZones:b.zoneCount,lines:b.weavers.lineCount,orbs:b.weavers.orbCount,
      ghosts:b.weavers.ghostCount,rigs:b.rigCount,bossStarted:this.bossStarted,bossMove:boss?.last??weaver?.last??null,
      protection:this.system.special.counts,allies:this.allies.filter(a=>!a.health.dead).map(a=>({x:a.view.x,y:a.view.y,health:a.health.current,maximum:a.health.maximum})),
      bossPhase:boss?.phase??weaver?.phase??null,phase:this.primary?{x:this.primary.view.x,y:this.primary.view.y,windup:this.primary.windup,
        frozen:this.primary.frozen,health:this.primary.health.current,legs:this.primary.motion.legs.length}:null,elapsed:this.elapsed,loop:this.game.loop.running};
  }
  clearForCheck():void {this.system.reset();this.primary=null;this.allies=[];}
}
