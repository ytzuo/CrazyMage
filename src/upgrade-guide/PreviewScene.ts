import Phaser from 'phaser';
import { Player } from '../game/entities/Player';
import { EnemySystem } from '../game/enemies/EnemySystem';
import { enemySpec, type EnemySpec } from '../game/enemies/roster';
import { SpellRunner } from '../game/spells/SpellRunner';
import { SchoolSkill } from '../game/spells/SchoolSkill';
import { UltimateSpell } from '../game/ultimates/UltimateSpell';
import type { EnemyVariant } from '../game/enemies/variants';
import type { UpgradeDefinition } from '../game/upgrades/definitions';
import { category, previewBuild, schoolOf } from './catalog';
export interface Selection {card:UpgradeDefinition;layers:number;upgraded:boolean}
interface PreviewAccess {createEnemy(x:number,y:number,wave:number,spec:EnemySpec,variant:EnemyVariant,warning:number):void}
/** One real combat scene, eight targets, cached floor and artwork. All encounter objects
 * expire via existing combat budgets or clear on replay, selection, shutdown and unload. */
export class PreviewScene extends Phaser.Scene {
  selection!:Selection;
  speed=1;paused=false;validating=false;booted=false;
  private player!:Player;private enemies!:EnemySystem;private spells!:SpellRunner;
  private skill!:SchoolSkill;private ultimate!:UltimateSpell;
  private elapsed=0;private nextCast=650;private publishWait=0;private casts=0;private struck=false;
  private resized?:ResizeObserver;private width=0;private height=0;
  private worldWidth=900;private centerX=1050;
  private bar!:Phaser.GameObjects.Rectangle;private shield!:Phaser.GameObjects.Rectangle;
  private readonly aim={x:1,y:0};private readonly idle={x:0,y:0};private readonly origin={x:700,y:900};
  constructor(private host:HTMLElement,private publish:(status:string)=>void,private ready:()=>void){super('upgrade-guide');}
  create():void {
    if(!this.textures.exists('upgrade-floor')) {
      const tile=this.textures.createCanvas('upgrade-floor',64,64)!;const c=tile.context;
      c.fillStyle='#15221e';c.fillRect(0,0,64,64);c.strokeStyle='#24352b';c.strokeRect(.5,.5,63,63);c.fillStyle='#3b4935';c.fillRect(31,31,2,2);tile.refresh();
    }
    this.add.tileSprite(1200,900,2400,1800,'upgrade-floor');
    const seal=this.add.graphics();seal.lineStyle(1,0xb6a36a,.18).strokeCircle(1100,910,255).strokeCircle(1100,910,265);
    seal.lineStyle(1,0xb6a36a,.1).lineBetween(660,910,1570,910).lineBetween(1100,590,1100,1230);
    this.player=new Player(this);
    this.enemies=new EnemySystem(this,undefined,undefined,()=>.5,(id,x,y,source)=>this.spells.enemyDefeated(id,x,y,this.enemies,source));
    this.spells=new SpellRunner(this,previewBuild(this.selection.card,0));
    this.skill=new SchoolSkill(this,this.spells.accumulateLightning);this.ultimate=new UltimateSpell(this,this.spells.accumulateLightning);
    this.add.rectangle(0,0,80,6,0x18211c).setDepth(20).setName('health-background');
    this.bar=this.add.rectangle(0,0,80,5,0x91b374).setOrigin(0,.5).setDepth(21);
    this.shield=this.add.rectangle(0,0,80,3,0x86c5dd).setOrigin(0,.5).setDepth(22);
    this.booted=true;this.resetEncounter();this.ready();
    this.resized=new ResizeObserver(()=>this.resize());this.resized.observe(this.host);this.resize();
    window.addEventListener('blur',this.onBlur);document.addEventListener('visibilitychange',this.onVisibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      this.resized?.disconnect();window.removeEventListener('blur',this.onBlur);document.removeEventListener('visibilitychange',this.onVisibility);this.clearForCheck();
    });
    if(this.paused)this.game.events.once(Phaser.Core.Events.POST_RENDER,()=>this.sleep());
  }
  private onBlur=()=>this.pause();
  private onVisibility=()=>{if(document.hidden)this.pause();};
  configure(selection:Selection):void {this.selection=selection;if(this.booted){this.resetEncounter();this.redraw();}}
  clearForCheck():void {
    if(!this.booted)return;
    this.spells.reset();this.skill.reset();this.ultimate.reset();this.enemies.reset();
  }
  resetEncounter():void {
    if(!this.booted)return;
    this.clearForCheck();this.player.reset();
    this.elapsed=this.publishWait=this.casts=0;this.nextCast=650;this.struck=false;
    const build=previewBuild(this.selection.card,this.selection.upgraded?this.selection.layers:0),kind=category(this.selection.card);
    this.spells.configure(build);this.skill.configure(build.skill);this.ultimate.configure(build.ultimate);this.ultimate.charge.fill();
    this.player.setSchool(build.school);this.player.speed=build.player.speed;
    this.player.health.configure(build.player.maximum,build.player.shield);this.player.health.reset();
    this.player.view.setPosition(this.origin.x,this.origin.y);
    this.enemies.waveClock.scheduleNext(1e9);
    const id=this.selection.card.id;
    let points:number[][]=[[170,0],[270,0],[380,0],[480,0],[280,-85],[280,85],[420,-95],[420,95]];
    if(id==='fire.explosion')points=[[170,0],[225,-30],[225,30],[380,0],[480,0],[280,-85],[280,85],[420,95]];
    if(build.school==='lightning')points=[[190,0],[285,-45],[380,0],[475,45],[570,0],[320,80],[420,-100],[665,-50]];
    if(id==='lightning.range')points=[[190,0],[430,0],[670,0],[430,100],[670,100],[190,100],[550,-100],[310,-100]];
    if(build.school==='ice')points=[[175,0],[265,0],[380,0],[495,0],[570,0],[570,70],[260,80],[270,-80]];
    if(kind==='skill')points=build.school==='lightning'?[[190,0],[330,0],[490,0],[620,0],[760,0],[890,0],[490,70],[620,-70]]:[[175,0],[235,-75],[235,75],[305,0],[380,-100],[380,100],[440,0],[520,0]];
    if(kind==='ultimate')points=[[170,0],[260,-85],[260,85],[390,0],[480,-130],[480,130],[610,0],[790,0]];
    if(id==='ultimate.lightning.reach')points=[[170,0],[260,-85],[715,0],[780,85],[825,-100],[880,130],[920,0],[960,-90]];
    if(kind==='passive')points=[];
    for(const [i,[x,y]] of points.entries()) {
      const weak=(id==='fire.burn'||id==='ice.shards')&&i===0;
      const spec={...enemySpec('chaser',1),speed:id==='ice.cold'?30:0,damage:0,knockback:0,health:weak?(id==='fire.burn'?26:24):600};
      (this.enemies as unknown as PreviewAccess).createEnemy(this.origin.x+x,this.origin.y+y,1,spec,'normal',0);
      const enemy=this.enemies.enemies.at(-1)!;enemy.cooldown=1e9;enemy.view.setAlpha(1);enemy.warning.setVisible(false);
    }
    // Fireballs need a target-free lane to show real cadence on the common cooldown card.
    if(id==='passive.cooldown') {
      const spec={...enemySpec('chaser',1),speed:0,damage:0,knockback:0,health:600};
      (this.enemies as unknown as PreviewAccess).createEnemy(1300,900,1,spec,'normal',0);
      this.enemies.enemies[0].cooldown=1e9;
    }
    const far=id==='passive.cooldown'?600:Math.max(0,...points.map(([x])=>x));
    this.worldWidth=id==='passive.speed'?900:far?Math.max(760,far+200):480;
    this.centerX=id==='passive.speed'?1000:this.origin.x+far/2;
    this.enemies.waves.register(1,this.enemies.enemies.length);
    this.fitCamera();this.updateBars();this.report();
  }
  update(_time:number,delta:number):void {this.advance(Math.min(delta,50)*this.speed);}
  advance(delta:number):void {
    if(!this.booted||delta<=0)return;
    this.elapsed+=delta;this.publishWait+=delta;
    const card=this.selection.card,kind=category(card);
    if(card.id==='passive.speed') {
      // Equal active time and fixed endpoints make the real speed change observable.
      const direction={x:Math.floor(this.elapsed/1600)%2===0?1:-1,y:0};this.player.update(direction,delta,this.aim);
    } else this.player.update(this.idle,delta,this.aim);
    this.enemies.update(delta,this.player);
    this.spells.update(delta,this.enemies,this.player.view);this.skill.update(delta);this.ultimate.update(delta,this.player.view);
    if((card.id==='passive.health'||card.id==='passive.shield')&&!this.struck&&this.elapsed>=1100){
      this.struck=true;this.player.hurt(30,this.player.view.x+80,this.player.view.y);this.enemies.effects.hit(this.player.view.x,this.player.view.y,{x:-1,y:0});
    }
    if(kind!=='passive'||card.id==='passive.cooldown')if(this.elapsed>=this.nextCast) {
      let cast=false;
      if(kind==='skill') {cast=this.skill.cast(this.player.view.x,this.player.view.y,this.aim,this.enemies);this.nextCast=this.elapsed+100;}
      else if(kind==='ultimate'){if(this.casts===0)cast=this.ultimate.cast(this.player.view.x,this.player.view.y,this.enemies,this.aim);this.nextCast=this.elapsed+100;}
      else {cast=this.spells.cast(this.player.view.x,this.player.view.y,this.aim,this.enemies);this.nextCast=this.elapsed+50;}
      if(cast){this.casts++;this.player.cast(this.aim,schoolOf(card));}
    }
    this.updateBars();
    const cycle=kind==='skill'?16500:card.id==='passive.shield'?12500:kind==='ultimate'?9500:8500;
    if(this.elapsed>=cycle){this.resetEncounter();return;}
    if(this.publishWait>=200){this.publishWait=0;this.report();}
  }
  private updateBars():void {
    const {x,y}=this.player.view,h=this.player.health;
    (this.children.getByName('health-background') as Phaser.GameObjects.Rectangle).setPosition(x,y-94);
    this.bar.setPosition(x-40,y-94).setScale(h.current/h.maximum,1);
    this.shield.setPosition(x-40,y-101).setScale(h.shieldMaximum?h.shield/h.shieldMaximum:0,1);
  }
  private report():void {
    if(this.validating)return;
    const id=this.selection.card.id,kind=category(this.selection.card),h=this.player.health;
    const status=this.paused?'已暂停':id==='passive.health'?`生命 ${Math.ceil(h.current)} / ${h.maximum}`:id==='passive.shield'?`护盾 ${Math.ceil(h.shield)} / ${h.shieldMaximum}`:id==='passive.speed'?'移动演示':kind==='skill'?`充能 ${Math.ceil(this.skill.remainingMs/1000)} 秒`:`施法 ${this.casts} 次`;
    this.publish(status);
  }
  private resize():void {
    const w=Math.max(1,Math.round(this.host.clientWidth)),h=Math.max(1,Math.round(this.host.clientHeight));
    if(w===this.width&&h===this.height)return;
    this.width=w;this.height=h;this.scale.resize(w,h);
    this.fitCamera();this.redraw();
  }
  private fitCamera():void {this.cameras.main.setZoom(Math.min(this.scale.width/this.worldWidth,this.scale.height/400)).centerOn(this.centerX,860);}
  private sleep():void {this.game.pause();this.game.loop.sleep();}
  pause():void {this.paused=true;if(this.booted)this.sleep();this.publish('已暂停');}
  resume():void {if(document.hidden)return;this.paused=false;if(this.booted){this.game.resume();this.game.loop.wake();this.report();}}
  redraw():void {
    if(!this.booted||!this.paused||this.validating)return;
    this.game.resume();this.game.loop.wake();this.scene.pause();
    this.game.events.once(Phaser.Core.Events.POST_RENDER,()=>{this.sleep();this.scene.resume();});
  }
  diagnostics() {
    return {actors:this.enemies.enemies.length,roots:this.children.list.length,textures:this.textures.getTextureKeys().length,
      projectiles:this.spells.projectileCount,impacts:this.spells.impactCount,ultimate:this.ultimate.effectCount,fields:this.enemies.fireFieldCount,
      elapsed:this.elapsed,casts:this.casts,loop:this.game.loop.running,paused:this.paused,
      health:this.player.health.current,shield:this.player.health.shield,damage:this.enemies.enemies.reduce((n,e)=>n+e.health.maximum-e.health.current,0)};
  }
}
