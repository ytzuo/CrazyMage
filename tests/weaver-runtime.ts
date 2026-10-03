import { UltimateSpell } from '../src/game/ultimates/UltimateSpell';
import { WEAVER, weaverDestination, weaverRay } from '../src/game/enemies/WeaverRules';
import type { BossCombat } from '../src/game/enemies/BossCombat';
import Phaser from 'phaser';
import { Player } from '../src/game/entities/Player';
import { EnemySystem, type Enemy } from '../src/game/enemies/EnemySystem';
import { bossKind, isBoss, enemySpec, type EnemyKind } from '../src/game/enemies/roster';
import { FireballSpell } from '../src/game/spells/FireballSpell';
import { applyUpgrade, compileBuild, initialBuild } from '../src/game/upgrades/build';
const result=document.querySelector<HTMLPreElement>('#result')!;
let game:Phaser.Game|undefined, previewBoss:Enemy|undefined, paused=false;
type Fixture={createEnemy(x:number,y:number,wave:number,spec:ReturnType<typeof enemySpec>,variant:'normal',warning:number):void};
function spawn(system:EnemySystem,kind:EnemyKind,x:number,y:number):Enemy {
  (system as unknown as Fixture).createEnemy(x,y,15,enemySpec(kind,15),'normal',0);
  if(system.enemies.length===1)system.waves.register(15,1);else system.waves.add(15,1);
  const enemy=system.enemies.at(-1)!;enemy.view.setAlpha(1);enemy.warning.setVisible(false);return enemy;
}
function launch(scene:Phaser.Scene):void {
  game?.destroy(true);game?.loop.wake();previewBoss=undefined;paused=false;
  document.querySelector<HTMLButtonElement>('#pause')!.textContent='暂停';
  game=new Phaser.Game({type:Phaser.AUTO,parent:'test-game',width:900,height:540,scene,backgroundColor:'#17251f',audio:{noAudio:true}});
}
function finish(scene:Phaser.Scene,data:unknown):void {
  result.textContent=JSON.stringify(data,null,2);scene.scene.pause();
  scene.game.events.once(Phaser.Core.Events.POST_RENDER,()=>{scene.game.pause();scene.game.loop.sleep();});
}
const stats=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);return {mean:values.reduce((a,b)=>a+b,0)/values.length,p95:sorted[Math.floor(sorted.length*.95)],over25:values.filter(x=>x>25).length};};
function benchmark(modelEnabled=true):void {
  class Sample extends Phaser.Scene {
    private player!:Player;private system!:EnemySystem;private spell!:FireballSpell;
    private trial=0;private frame=0;private started=0;private last=0;private cpu:number[]=[];private intervals:number[]=[];private rows:unknown[]=[];
    create():void {
      this.player=new Player(this);this.system=new EnemySystem(this,undefined,undefined,()=>.9);
      this.spell=new FireballSpell(this,compileBuild(initialBuild(1)).fireball);this.cameras.main.centerOn(1200,900);this.prepare();
      this.game.events.on(Phaser.Core.Events.POST_RENDER,this.record,this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.game.events.off(Phaser.Core.Events.POST_RENDER,this.record,this));
    }
    private prepare():void {
      this.system.reset();this.player.reset();this.spell.reset();this.system.waveClock.wave=15;this.system.waveClock.scheduleNext(1e9);
      const boss=spawn(this.system,'weaver',1400,900);
      boss.health.maximum=boss.health.current=1e6;
      const kinds:EnemyKind[]=['chaser','swift','ranged','brute','artillery'];
      for(let i=1;i<(this.trial%3===0?6:36);i++){const a=i*2.39996;const e=spawn(this.system,kinds[i%5],1200+Math.cos(a)*350,900+Math.sin(a)*230);e.health.maximum=e.health.current=1e6;}
      this.frame=0;this.last=0;this.cpu=[];this.intervals=[];
    }
    update(_time:number,delta:number):void {
      this.started=performance.now();const step=Math.min(delta,50);this.player.health.reset();const a=this.frame/80;
      this.player.update(this.trial%3===0?{x:0,y:0}:{x:Math.cos(a),y:Math.sin(a)},step);
      this.system.update(step,this.player);this.spell.update(step,this.system);
      if(this.trial%3===2)this.spell.cast(this.player.view.x,this.player.view.y,{x:Math.cos(a),y:Math.sin(a)});
    }
    private record():void {
      const now=performance.now();if(this.last)this.intervals.push(now-this.last);this.last=now;this.cpu.push(now-this.started);
      if(++this.frame<120)return;
      this.rows.push({trial:Math.floor(this.trial/3)+1,mode:['startup','movement','attack'][this.trial%3],cpu:stats(this.cpu),frame:stats(this.intervals)});
      result.textContent=JSON.stringify({running:true,rows:this.rows},null,2);
      if(++this.trial<9)this.prepare();else {this.game.events.off(Phaser.Core.Events.POST_RENDER,this.record,this);finish(this,{passed:true,modelEnabled,viewport:[900,540],dpr:devicePixelRatio,userAgent:navigator.userAgent,rows:this.rows,note:'120 rendered frames per trial. One boss plus 5/35 normal enemies, invulnerable fixture health. CPU: update through render submission, excludes GPU. Cached dev load, no arena/HUD; not cold startup or full fight.'});}
    }
  }
  launch(new Sample());
}

const combatOf=(system:EnemySystem)=>(system as unknown as {bosses:BossCombat}).bosses;
function preview():void {
  class Preview extends Phaser.Scene {
    private player!:Player;private system!:EnemySystem;
    create():void {
      this.player=new Player(this);this.system=new EnemySystem(this,undefined,undefined,()=>.9);
      this.system.waveClock.wave=15;this.system.waveClock.scheduleNext(1e9);
      previewBoss=spawn(this.system,'weaver',1450,900);this.cameras.main.centerOn(1250,900);
      this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(p.isDown)this.player.view.setPosition(p.worldX,p.worldY);});
      result.textContent='拖动玩家观察：换位 → 双裂隙切线 → 三枚往返魔核。每套攻击后休息五秒。';
    }
    update(_time:number,delta:number):void {
      this.player.health.reset();this.system.update(Math.min(delta,50),this.player);
      if(previewBoss)result.dataset.fight=JSON.stringify(combatOf(this.system).weavers.inspect(previewBoss.id));
    }
  }launch(new Preview());
}
document.querySelector<HTMLButtonElement>('#preview')!.onclick=preview;
document.querySelector<HTMLButtonElement>('#benchmark')!.onclick=()=>benchmark();
document.querySelector<HTMLButtonElement>('#enrage')!.onclick=()=>{if(previewBoss)previewBoss.health.current=previewBoss.health.current<previewBoss.health.maximum/2?previewBoss.health.maximum:previewBoss.health.maximum*.4;};
document.querySelector<HTMLButtonElement>('#pause')!.onclick=()=>{if(!game)return;paused=!paused;if(paused){game.pause();game.loop.sleep();}else{game.resume();game.loop.wake();}document.querySelector<HTMLButtonElement>('#pause')!.textContent=paused?'继续':'暂停';result.dataset.loopRunning=String(game.loop.running);};
preview();

function checks():void {
  class Checks extends Phaser.Scene {
    create():void {
      const reports:string[]=[],check=(ok:boolean,label:string)=>{if(!ok)throw Error(label);};
      const player=new Player(this),kills:boolean[]=[],clears:{wave:number;boss:boolean}[]=[];
      const system=new EnemySystem(this,(wave,boss)=>clears.push({wave,boss}),(_source,boss)=>kills.push(boss),()=>.9);
      const combat=combatOf(system),weaver=combat.weavers;
      const fresh=(half=false)=>{system.reset();player.reset();system.waveClock.wave=15;system.waveClock.scheduleNext(1e9);kills.length=clears.length=0;
        const e=spawn(system,'weaver',1000,900);player.view.setPosition(1300,900);if(half)e.health.current=e.health.maximum*.4;return e;};
      const state=(e:Enemy)=>weaver.inspect(e.id)!;
      const tick=(ms:number)=>system.update(ms,player);
      const begin=(half=false)=>{const e=fresh(half);e.cooldown=0;tick(1);return e;};
      const startLines=()=>{const e=begin();tick(800);tick(800);tick(5000);return e;};
      const startOrbs=()=>{const e=startLines();tick(1000);tick(1400);tick(5000);return e;};
      try {
        check([5,10,15,20,25,30].map(bossKind).join(',')==='boss,weaver,boss,weaver,boss,weaver'&&bossKind(11)===null,'boss schedule');
        check(isBoss('weaver')&&isBoss('boss')&&!isBoss('priest'),'shared boss identity');
        check(enemySpec('weaver',10).health/ enemySpec('boss',10).health>.749&&enemySpec('weaver',10).health/ enemySpec('boss',10).health<.751,'75% guardian health');
        let e=fresh();tick(1799);check(state(e).phase==='idle','initial rest shortened');e.cooldown=0;tick(1);
        const dest=state(e).destination,hp=player.health.current,pos=[e.view.x,e.view.y];
        tick(799);check(e.view.x===pos[0]&&e.view.y===pos[1]&&state(e).marker,'teleport before 800ms');
        player.view.setPosition(1800,500);tick(1);check(e.view.x===dest.x&&e.view.y===dest.y&&!state(e).marker&&state(e).phase==='landing','teleport tracked player / lost destination');
        check(player.health.current===hp&&state(e).lines.length===0,'normal teleport caused damage or ghost');
        const before=e.health.current;system.hit(e,10,{x:0,y:0});check(e.health.current===before-10&&state(e).phase==='landing','teleport immunity or ordinary-hit interruption');
        const landed=[e.view.x,e.view.y];tick(799);check(e.view.x===landed[0]&&e.cooldown===0,'landing pause shortened');tick(1);
        check(e.cooldown===5000&&weaver.activeCount===0,'teleport recovery missing');player.view.setPosition(e.view.x+300,e.view.y);
        tick(4999);check(state(e).last==='teleport','teleport rest below five seconds');tick(1);check(state(e).last==='lines','moves failed to rotate');
        reports.push('alternating wave schedule, shared boss identity, 75% health; locked 800ms teleport, always damageable, landing pause and full five-second rest');

        e=startLines();check(state(e).lines.length===2&&state(e).phase==='lines','two lines missing');
        const castingHP=e.health.current;system.hit(e,10,{x:0,y:0});
        check(e.health.current===castingHP-10&&state(e).phase==='lines'&&state(e).lines.length===2,'ordinary hit cancelled lines');
        const l=state(e).lines[0],locked=JSON.stringify(state(e).lines.map(l=>[l.x,l.y,l.endX,l.endY]));
        player.view.setPosition((l.x+l.endX)/2,(l.y+l.endY)/2);const warnHP=player.health.current;
        tick(999);check(player.health.current===warnHP&&state(e).lines.every(l=>!l.active),'line hurt during warning');
        check(JSON.stringify(state(e).lines.map(l=>[l.x,l.y,l.endX,l.endY]))===locked,'line followed player');
        tick(1);check(player.health.current<warnHP&&state(e).lines.every(l=>l.active&&l.life===1400),'active line geometry / lifetime failed');
        tick(1399);check(state(e).phase==='lines','line lifetime too short');tick(1);
        check(weaver.lineCount===0&&e.cooldown===5000,'lines leaked or rest started early');
        reports.push('two fixed parallel lines, endpoint sigils; warning safe for 1000ms, active strip for 1400ms, then full rest');

        e=startOrbs();check(state(e).phase==='orb-warning'&&state(e).orbs.length===3,'three orbs missing');
        const origin=state(e).orbs[1],orbHP=player.health.current;
        player.view.setPosition(origin.endX,origin.endY);tick(999);check(state(e).orbs.every(o=>o.viewX===o.x)&&player.health.current===orbHP,'orb warning not safe');
        tick(1);check(state(e).phase==='orbs'&&state(e).orbs.every(o=>o.time===0),'orb consumed warning overflow');
        tick(2000);check(state(e).orbs.every(o=>o.stage==='pause'&&Math.abs(o.viewX-o.endX)<.001),'outbound orb trajectory failed');
        check(player.health.current<orbHP,'outbound swept collision missed');
        const atEnd=state(e).orbs.map(o=>[o.viewX,o.viewY]);tick(549);check(JSON.stringify(state(e).orbs.map(o=>[o.viewX,o.viewY]))===JSON.stringify(atEnd),'endpoint pause missing');
        tick(1);check(state(e).orbs.every(o=>o.stage==='return'&&o.time===0),'return began incorrectly');
        player.reset();player.view.setPosition(origin.x,origin.y);const returnHP=player.health.current;
        tick(1999);check(state(e).phase==='orbs'&&player.health.current<returnHP,'return leg missed swept collision');
        tick(1);check(weaver.orbCount===0&&e.cooldown===5000,'return cleanup / rest failed');
        e=startOrbs();tick(1000);tick(900);system.freeze(e,1000,false);
        check(weaver.orbCount===0&&weaver.activeCount===0,'freeze leaked travelling orbs / paths');
        reports.push('three locked slow rays: 1000ms warning, 2000ms out, 550ms pause, 2000ms back; swept collision on both legs and cleanup');

        e=begin(true);check(state(e).visibleArms===6,'half health did not reveal six arms');tick(800);
        check(state(e).ghost&&state(e).lines.length===1&&state(e).lines[0].wait===1000&&state(e).timer===1200,'ghost supplemental line lost full warning');
        const supplemental=JSON.stringify(state(e).lines[0]);tick(999);check(state(e).ghost&&!state(e).lines[0].active,'ghost damaged early');tick(1);tick(1400);
        check(!state(e).ghost&&weaver.lineCount===0&&e.cooldown===5000,'ghost duplicated / did not expire');
        check(!!supplemental,'ghost line snapshot');
        e=begin(true);tick(800);system.freeze(e,1000,false);
        check(weaver.lineCount===0&&weaver.ghostCount===0&&weaver.markerCount===0&&weaver.activeCount===0,'freeze failed to cancel full cast');
        const frozenPose=JSON.stringify(e.view.list.map(v=>[(v as Phaser.GameObjects.Image).x,(v as Phaser.GameObjects.Image).y])),cooldown=e.cooldown;
        tick(999);check(e.cooldown===cooldown&&JSON.stringify(e.view.list.map(v=>[(v as Phaser.GameObjects.Image).x,(v as Phaser.GameObjects.Image).y]))===frozenPose,'frozen timers or rig advanced');
        tick(1);system.hit(e,1e9,{x:0,y:0});
        check(weaver.rigCount===0&&combat.rigCount===0&&kills.filter(Boolean).length===1&&clears.length===1,'boss kill ledger / cleanup');
        check(!system.hit(e,1e9,{x:0,y:0})&&kills.length===1,'duplicate boss reward');
        reports.push('half-health six-arm rig and one ghost cut, full new warning; freeze clears owned objects and freezes pose/rest; death rewarded once');

        for(const wave of [5,10,15,20]) {
          system.reset();player.reset();system.waveClock.wave=wave;system.waveClock.scheduleNext(1e9);clears.length=kills.length=0;
          (system as unknown as {spawnWave(p:Player,wave:number):void}).spawnWave(player,wave);
          const bosses=system.enemies.filter(e=>isBoss(e.spec.kind));check(bosses.length===1&&bosses[0].spec.kind===bossKind(wave),'actual spawn wave differs');
          // Kill the registered wave, including deferred normal batches.
          for(let batch=0;batch<20&&clears.length===0;batch++){for(const enemy of [...system.enemies]){enemy.spawning=0;system.hit(enemy,1e9,{x:0,y:0});}tick(1);}
          check(clears.length===1&&clears[0].wave===wave&&clears[0].boss&&kills.filter(Boolean).length===1,'actual boss wave reward');
        }
        reports.push('real wave 5/10/15/20 spawn and deferred wave clear produce one boss kill and boss upgrade flag');
        system.reset();player.reset();const baseline=this.children.list.length,textureCount=Object.keys(this.textures.list).length;
        for(let pass=0;pass<10;pass++) {
          system.waveClock.wave=15;system.waveClock.scheduleNext(1e9);
          for(let i=0;i<8;i++){e=spawn(system,'weaver',800+i*40,900);e.health.current=e.health.maximum*.4;e.cooldown=0;}
          player.view.setPosition(1200,900);tick(1);check(weaver.activeCount===6&&weaver.markerCount===6,'cast reservation cap failed');
          tick(800);check(weaver.lineCount<=12&&weaver.ghostCount<=6,'ghost / line global budget');
          system.reset();check(this.children.list.length===baseline&&weaver.activeCount===0&&combat.rigCount===0,'reset leaks objects');
          check(Object.keys(this.textures.list).length===textureCount,'reset recreated textures');
        }
        for(const last of ['teleport','lines'] as const) {
          system.waveClock.wave=15;system.waveClock.scheduleNext(1e9);
          for(let i=0;i<8;i++) {
            e=spawn(system,'weaver',900+i*20,900);e.cooldown=0;
            (weaver as unknown as {fights:Map<number,{last:string}>}).fights.get(e.id)!.last=last;
          }
          player.view.setPosition(1200,900);tick(1);
          check(weaver.activeCount===6&&(last==='teleport'?weaver.lineCount===12:weaver.orbCount===18),'full line / orb global cap');
          system.reset();check(this.children.list.length===baseline&&weaver.activeCount===0,'capped attacks leaked after reset');
        }
        for(let i=0;i<180;i++){
          const x=138+i%10*215,y=138+Math.floor(i/10)*80,d=weaverDestination(x,y,138,138,42);
          check(d.x>=138&&d.x<=2262&&d.y>=138&&d.y<=1662&&Math.hypot(d.x-138,d.y-138)>=280,'teleport edge fallback');
          const r=weaverRay(x,y,i*.23,420,138);check(r.x>=137.999&&r.x<=2262.001&&r.y>=137.999&&r.y<=1662.001,'orb escaped arena');
        }
        reports.push('six reserved casts globally, two lines / three orbs per boss, ten resets restore object baseline; bounded wall destinations and straight rays');
        finish(this,{passed:true,reports});
      }catch(error){finish(this,{passed:false,reports,error:String(error)});}
    }
  }launch(new Checks());
}
document.querySelector<HTMLButtonElement>('#check')!.onclick=checks;

function stress():void {
  class Stress extends Phaser.Scene {
    private system!:EnemySystem;private player!:Player;private spell!:FireballSpell;private ultimate!:UltimateSpell;
    private elapsed=0;private last=0;private intervals:number[]=[];private maxZones=0;private maxLines=0;private maxOrbs=0;private maxGhosts=0;
    private maxObjects=0;private maxShots=0;private maxUltimates=0;private frames=0;private moves=new Set<string>();
    create():void {
      this.player=new Player(this);this.system=new EnemySystem(this,undefined,undefined,()=>.9);this.system.waveClock.wave=15;this.system.waveClock.scheduleNext(1e9);
      let build=initialBuild(1,'fire','endless');for(const id of ['fire.multi','fire.multi','fire.multi','fire.multi','fire.pierce','fire.pierce','fire.explosion','fire.burn'])build=applyUpgrade(build,id);
      const params=compileBuild(build);this.spell=new FireballSpell(this,params.fireball);this.ultimate=new UltimateSpell(this);this.ultimate.configure(params.ultimate);
      for(let i=0;i<72;i++){const a=i*2.39996,e=spawn(this.system,i<2?'boss':i<6?'weaver':(['chaser','swift','brute','ranged','artillery'] as const)[i%5],1200+Math.cos(a)*330,900+Math.sin(a)*240);
        e.health.maximum=1e7;e.health.current=i%2===0?4e6:1e7;}
      this.cameras.main.centerOn(1200,900);
    }
    update(_time:number,delta:number):void {
      const step=Math.min(delta,50);this.elapsed+=step;this.frames++;this.player.health.reset();
      const a=this.elapsed/1700;this.player.view.setPosition(1200+Math.cos(a)*300,900+Math.sin(a)*220);const aim={x:-Math.cos(a),y:-Math.sin(a)};
      this.system.update(step,this.player);this.spell.update(step,this.system);this.spell.cast(this.player.view.x,this.player.view.y,aim);
      this.ultimate.update(step);this.ultimate.charge.fill();this.ultimate.cast(this.player.view.x,this.player.view.y,this.system,aim);
      const combat=combatOf(this.system),w=combat.weavers;
      for(const e of this.system.enemies)if(e.spec.kind==='weaver'){const move=w.inspect(e.id)?.last;if(move)this.moves.add(move);}
      this.maxZones=Math.max(this.maxZones,combat.zoneCount);this.maxLines=Math.max(this.maxLines,w.lineCount);this.maxOrbs=Math.max(this.maxOrbs,w.orbCount);this.maxGhosts=Math.max(this.maxGhosts,w.ghostCount);
      this.maxObjects=Math.max(this.maxObjects,this.children.list.length);this.maxShots=Math.max(this.maxShots,this.spell.projectileCount);this.maxUltimates=Math.max(this.maxUltimates,this.ultimate.effectCount);
      const now=performance.now();if(this.last)this.intervals.push(now-this.last);this.last=now;
      if(this.frames%120===0)result.textContent=JSON.stringify({running:true,seconds:Math.floor(this.elapsed/1000),maxLines:this.maxLines,maxOrbs:this.maxOrbs,moves:[...this.moves]});
      if(this.elapsed<180000)return;this.system.reset();this.spell.reset();this.ultimate.reset();
      finish(this,{passed:this.children.list.length===1&&combat.rigCount===0&&w.activeCount===0&&w.lineCount===0&&w.orbCount===0&&this.maxZones<=24&&this.maxLines<=12&&this.maxOrbs<=18&&this.maxGhosts<=6&&this.maxShots<=64&&this.maxUltimates<=40&&this.moves.size===3,
        seconds:this.elapsed/1000,frames:this.frames,maxZones:this.maxZones,maxLines:this.maxLines,maxOrbs:this.maxOrbs,maxGhosts:this.maxGhosts,maxObjects:this.maxObjects,maxShots:this.maxShots,maxUltimates:this.maxUltimates,
        moves:[...this.moves],objectsAfterReset:this.children.list.length,frame:stats(this.intervals),viewport:[900,540],dpr:devicePixelRatio,
        scope:'Two guardians + four weavers (half of each enraged) + 66 normal enemies; nine piercing/burning/exploding fireballs and repeated fire Q; fixture health prevents death. 180s active time; no arena/HUD, GPU or mobile measurement.'});
    }
  }launch(new Stress());
}
document.querySelector<HTMLButtonElement>('#stress')!.onclick=stress;

function artwork():void {
  class Artwork extends Phaser.Scene {
    create():void {
      const player=new Player(this);player.view.setPosition(1200,1090);const system=new EnemySystem(this,undefined,undefined,()=>.9);
      for(const [i,label] of ['魔核守卫','裂隙织主 · 四臂','断界形态 · 六臂'].entries()) {
        const e=spawn(system,i===0?'boss':'weaver',880+i*320,900);if(i===2)e.health.current=e.health.maximum*.4;
        e.bar.scaleX=e.health.current/e.health.maximum;combatOf(system).pose(e);
        this.add.text(e.view.x,1030,label,{fontSize:'18px',color:'#e6e8dd'}).setOrigin(.5);
      }
      this.add.text(1200,1140,'玩家实际比例',{fontSize:'13px',color:'#bebcac'}).setOrigin(.5);this.cameras.main.centerOn(1200,900);
      finish(this,{art:true,note:'缓存模型实际比例：薄面具、空心魔核、四/六只细臂、三枚悬浮碎片。'});
    }
  }launch(new Artwork());
}
document.querySelector<HTMLButtonElement>('#art')!.onclick=artwork;
