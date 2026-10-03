import { GUARDIAN, guardianContains, guardianEndpoint } from '../src/game/enemies/GuardianRules';
import { UltimateSpell } from '../src/game/ultimates/UltimateSpell';
import Phaser from 'phaser';
import { Player } from '../src/game/entities/Player';
import { EnemySystem, type Enemy } from '../src/game/enemies/EnemySystem';
import { enemySpec, type EnemyKind } from '../src/game/enemies/roster';
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
      const boss=spawn(this.system,'boss',1400,900);
      if(!modelEnabled){const combat=(this.system as unknown as {bosses:import('../src/game/enemies/BossCombat').BossCombat}).bosses;
        const rig=(combat as unknown as {fights:Map<number,{rig:{parts:Phaser.GameObjects.Image[]}}>}).fights.get(boss.id)!.rig;
        rig.parts.forEach(part=>part.setVisible(false));combat.pose=enemy=>{enemy.body.setTexture('enemy-boss-detail').setPosition(0,-3).setScale(enemy.spec.radius/40);};}
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
function preview():void {
  class Preview extends Phaser.Scene {
    private player!:Player;private system!:EnemySystem;
    create():void {
      this.player=new Player(this);this.system=new EnemySystem(this,undefined,undefined,()=>.9);this.system.waveClock.wave=15;this.system.waveClock.scheduleNext(1e9);
      previewBoss=spawn(this.system,'boss',1400,900);this.cameras.main.centerOn(1250,900);
      this.input.on('pointermove',(pointer:Phaser.Input.Pointer)=>{if(pointer.isDown)this.player.view.setPosition(pointer.worldX,pointer.worldY);});
      result.textContent='拖动玩家调整距离，观察不同招式；半血按钮切换暴走形态。';
    }
    update(_time:number,delta:number):void {this.player.health.reset();this.system.update(Math.min(delta,50),this.player);}
  }
  launch(new Preview());
}
document.querySelector<HTMLButtonElement>('#preview')!.onclick=preview;
document.querySelector<HTMLButtonElement>('#benchmark')!.onclick=()=>benchmark();
document.querySelector<HTMLButtonElement>('#isolate')!.onclick=()=>benchmark(false);
document.querySelector<HTMLButtonElement>('#enrage')!.onclick=()=>{if(previewBoss)previewBoss.health.current=previewBoss.health.current<previewBoss.health.maximum/2?previewBoss.health.maximum:previewBoss.health.maximum*.4;};
document.querySelector<HTMLButtonElement>('#pause')!.onclick=()=>{if(!game)return;paused=!paused;if(paused){game.pause();game.loop.sleep();}else{game.resume();game.loop.wake();}document.querySelector<HTMLButtonElement>('#pause')!.textContent=paused?'继续':'暂停';result.dataset.loopRunning=String(game.loop.running);};
preview();

function checks():void {
  class Checks extends Phaser.Scene {
    create():void {
      const reports:string[]=[];const check=(ok:boolean,label:string)=>{if(!ok)throw Error(label);};
      const player=new Player(this),kills:boolean[]=[],clears:number[]=[];
      const system=new EnemySystem(this,wave=>clears.push(wave),(_source,boss)=>kills.push(boss),()=>.9);
      const combat=(system as unknown as {bosses:import('../src/game/enemies/BossCombat').BossCombat}).bosses;
      const fresh=(distance=200,enraged=false)=>{system.reset();player.reset();system.waveClock.wave=15;system.waveClock.scheduleNext(1e9);kills.length=clears.length=0;
        const e=spawn(system,'boss',1000,900);player.view.setPosition(1000+distance,900);if(enraged)e.health.current=e.health.maximum*.4;return e;};
      const state=(e:Enemy)=>combat.inspect(e.id)!;
      const tick=(ms:number)=>system.update(ms,player);
      try {
        let e=fresh();tick(1799);check(state(e).move===null,'initial breathing room missing');tick(1);check(state(e).move==='sweep','near opening failed');
        const zone=JSON.stringify(state(e).zones),hp=player.health.current;
        player.view.setPosition(950,900);tick(1099);check(player.health.current===hp,'sweep hurt during warning');
        check(JSON.stringify(state(e).zones.map(z=>[z.x,z.y,z.angle]))===JSON.stringify(JSON.parse(zone).map((z:{x:number;y:number;angle:number})=>[z.x,z.y,z.angle])),'sweep tracked player');
        tick(1);check(player.health.current===hp&&state(e).exposure===1800,'rear escape or exposure failed');
        const before=e.health.current;system.hit(e,10,{x:0,y:0});check(Math.abs(e.health.current-before+13)<1e-6,'exposure did not amplify damage');
        player.view.setPosition(e.view.x+190,e.view.y);tick(1800);check(state(e).exposure===0&&e.cooldown===3200&&combat.zoneCount===0,'exposure / impact did not expire');
        const normal=e.health.current;system.hit(e,10,{x:0,y:0},'spell',null,true);check(e.health.current===normal-10,'armour added unintended immunity or damage');
        tick(3199);check(state(e).move===null,'next attack began before five seconds');tick(1);check(state(e).move==='stomp','near attacks did not alternate');
        player.view.setPosition(600,600);tick(1300);check(state(e).zones.filter(z=>!z.resolved).length===3&&state(e).zones.every(z=>z.resolved||z.wait===1000),'stomp omitted crack warnings');
        tick(999);check(state(e).phase==='attack','cracks resolved early');tick(1);check(state(e).phase==='recover','cracks did not finish');
        reports.push('locked sweep / rear escape; near attacks alternate; stomp has three fully warned cracks; 1.3x exposure then normal damage; full five-second rest');

        e=fresh(460);e.cooldown=0;tick(1);check(state(e).move==='rupture'&&state(e).zones.length===3,'normal rupture lost zones');
        check(state(e).zones[0].x<state(e).zones[1].x&&state(e).zones[1].x<state(e).zones[2].x,'rupture is not near-to-far');
        const locked=state(e).zones.map(z=>[z.x,z.y]);player.view.setPosition(1600,600);tick(1400);
        check(JSON.stringify(state(e).zones.map(z=>[z.x,z.y]))===JSON.stringify(locked),'rupture followed player');
        tick(450);check(state(e).phase==='attack','rest began before last blast');tick(450);check(state(e).phase==='recover'&&e.cooldown===5000,'last blast did not start full rest');
        tick(5000);tick(1);check(state(e).move==='charge','far pattern did not alternate to charge');
        const warning=state(e).zones[0];player.view.setPosition(e.view.x-200,e.view.y-180);tick(1300);check(state(e).phase==='dash','charge started before / after warning');
        const chargeHp=player.health.current;tick(1100);check(player.health.current===chargeHp&&state(e).phase==='recover','lateral charge escape failed');
        check(e.view.x>=150&&e.view.x<=2250&&e.view.y>=150&&e.view.y<=1650,'charge escaped arena');
        check(warning.shape==='lane'&&e.cooldown===5000,'charge missing lane or recovery');
        reports.push('three locked near-to-far blasts; rest after final blast; locked charge can be dodged sideways and respects walls');
        e=fresh(500);e.cooldown=0;tick(1);player.view.setPosition(700,500);tick(2300);player.view.setPosition(1500,900);tick(5000);tick(1);tick(1300);
        const impactHp=player.health.current;tick(1100);check(player.health.current===impactHp-e.spec.damage,'charge tunneled through player');
        tick(100);check(player.health.current===impactHp-e.spec.damage,'charge hit more than once');
        const sector={shape:'sector' as const,x:0,y:0,radius:180,angle:Math.PI*2-.1,length:0};
        check(guardianContains(sector,150,0)&&!guardianContains(sector,-150,0),'sector angle wrapping / rear safe zone failed');
        const lane={shape:'lane' as const,x:0,y:0,radius:25,angle:0,length:290};
        check(guardianContains(lane,150,42)&&!guardianContains(lane,150,44)&&guardianContains(lane,315,0),'lane width / endcap collision mismatch');
        const wall=guardianEndpoint(200,200,-Math.PI/4,520,150);
        check(Math.abs(wall.x-250)<1e-6&&Math.abs(wall.y-150)<1e-6,'wall truncation changed locked direction');
        reports.push('charge uses swept collision and damages once; sector angles wrap correctly and capsule edges include player radius');


        e=fresh(500,true);e.cooldown=0;tick(1);check(state(e).zones.length===4,'enraged rupture requires four zones');
        player.view.setPosition(700,500);tick(2750);check(state(e).phase==='recover'&&state(e).exposure===2200&&e.cooldown===5000,'enraged rest / exposure was shortened');
        e=fresh(190,true);e.cooldown=0;tick(1);player.view.setPosition(700,500);tick(5000);
        check(state(e).phase==='attack'&&state(e).stage===1&&state(e).zones.some(z=>!z.resolved&&z.wait===1100),'long delta consumed second sweep telegraph');
        tick(1100);check(state(e).phase==='recover','double sweep never finished');
        e=fresh(500,true);e.cooldown=0;tick(1);player.view.setPosition(700,500);tick(2750);player.view.setPosition(1650,900);tick(5000);tick(1);tick(1300);tick(1100);
        check(state(e).phase==='attack'&&state(e).stage===1&&state(e).zones.some(z=>z.wait===1300),'enraged charge stomp has no complete warning');
        player.view.setPosition(700,500);tick(1300);check(state(e).phase==='recover','charge stomp never recovered');
        reports.push('half-health four blasts, double sweep and charge stomp; follow-ups keep full warnings after long frames; 2.2s exposure and 5s rest');

        e=fresh(500);e.cooldown=0;tick(1);system.hit(e,1,{x:0,y:0});check(combat.zoneCount===3,'normal hit interrupted guardian attack');
        system.freeze(e,1000,false);check(combat.zoneCount===0&&combat.reservedCount===0,'freeze retained warnings / reservations');
        const pose=JSON.stringify(e.view.list.map(v=>[v.type,(v as Phaser.GameObjects.Image).x,(v as Phaser.GameObjects.Image).y]));const cooldown=e.cooldown;
        tick(999);check(e.cooldown===cooldown&&JSON.stringify(e.view.list.map(v=>[v.type,(v as Phaser.GameObjects.Image).x,(v as Phaser.GameObjects.Image).y]))===pose,'frozen boss advanced pose or cooldown');
        tick(1);check(e.cooldown===cooldown,'thaw consumed frozen time');
        system.hit(e,1e6,{x:0,y:0});check(combat.rigCount===0&&combat.zoneCount===0&&kills.filter(Boolean).length===1&&clears.length===1,'boss death / wave / charge settlement failed');
        check(!system.hit(e,1e6,{x:0,y:0})&&kills.length===1,'boss death rewarded twice');
        reports.push('ordinary hits preserve attacks; freeze clears attack and freezes rest / rig; death cleans up and settles boss kill and wave once');

        system.reset();const baseline=this.children.list.length,keys=this.textures.getTextureKeys().length;
        for(let round=0;round<10;round++) {
          system.waveClock.wave=15;system.waveClock.scheduleNext(1e9);player.view.setPosition(1200,900);
          for(let i=0;i<8;i++){const boss=spawn(system,'boss',800+i*45,900);boss.cooldown=0;boss.health.current=boss.health.maximum*.4;}
          tick(1);check(combat.zoneCount<=24&&combat.reservedCount<=24,'global zone cap exceeded');
          check(system.enemies.every(b=>state(b).rigImages===7),'guardian rig exceeded seven images');
          system.reset();check(this.children.list.length===baseline&&combat.zoneCount===0&&combat.rigCount===0&&combat.reservedCount===0,'reset leaked rig or zones');
          check(this.textures.getTextureKeys().length===keys,'reset rebuilt textures');
        }
        reports.push('eight overlapping bosses respect 24 global zone reservations; seven rig images each; ten resets return objects to baseline and reuse textures');
        finish(this,{passed:true,reports,baseline,cachedKeys:keys});
      }catch(error){finish(this,{passed:false,error:String(error),reports});}
    }
  }
  launch(new Checks());
}
document.querySelector<HTMLButtonElement>('#check')!.onclick=checks;

function stress():void {
  class Stress extends Phaser.Scene {
    private system!:EnemySystem;private player!:Player;private spell!:FireballSpell;private ultimate!:UltimateSpell;
    private elapsed=0;private last=0;private intervals:number[]=[];private maxZones=0;private maxObjects=0;private maxShots=0;private maxUltimates=0;private frames=0;
    private attacks=new Set<string>();
    create():void {
      this.player=new Player(this);this.system=new EnemySystem(this,undefined,undefined,()=>.9);this.system.waveClock.wave=15;this.system.waveClock.scheduleNext(1e9);
      let build=initialBuild(1,'fire','endless');for(const id of ['fire.multi','fire.multi','fire.multi','fire.multi','fire.pierce','fire.pierce','fire.explosion','fire.burn'])build=applyUpgrade(build,id);
      const params=compileBuild(build);this.spell=new FireballSpell(this,params.fireball);this.ultimate=new UltimateSpell(this);this.ultimate.configure(params.ultimate);
      for(let i=0;i<72;i++){const a=i*2.39996;const e=spawn(this.system,i<4?'boss':(['chaser','swift','brute','ranged','artillery'] as const)[i%5],1200+Math.cos(a)*330,900+Math.sin(a)*240);
        e.health.maximum=1e6;e.health.current=i<2?4e5:1e6;}
      this.cameras.main.centerOn(1200,900);
    }
    update(_time:number,delta:number):void {
      const step=Math.min(delta,50);this.elapsed+=step;this.frames++;this.player.health.reset();
      const a=this.elapsed/1700;this.player.view.setPosition(1200+Math.cos(a)*300,900+Math.sin(a)*220);
      const aim={x:-Math.cos(a),y:-Math.sin(a)};
      this.system.update(step,this.player);this.spell.update(step,this.system);this.spell.cast(this.player.view.x,this.player.view.y,aim);
      this.ultimate.update(step);this.ultimate.charge.fill();this.ultimate.cast(this.player.view.x,this.player.view.y,this.system,aim);
      const combat=(this.system as unknown as {bosses:import('../src/game/enemies/BossCombat').BossCombat}).bosses;
      for(const e of this.system.enemies)if(e.spec.kind==='boss'){const move=combat.inspect(e.id)?.move;if(move)this.attacks.add(move);}
      this.maxZones=Math.max(this.maxZones,combat.zoneCount);this.maxObjects=Math.max(this.maxObjects,this.children.list.length);
      this.maxShots=Math.max(this.maxShots,this.spell.projectileCount);this.maxUltimates=Math.max(this.maxUltimates,this.ultimate.effectCount);
      const now=performance.now();if(this.last)this.intervals.push(now-this.last);this.last=now;
      if(this.frames%120===0)result.textContent=JSON.stringify({running:true,seconds:Math.floor(this.elapsed/1000),maxZones:this.maxZones,maxObjects:this.maxObjects,attacks:[...this.attacks]});
      if(this.elapsed<180000)return;
      this.system.reset();this.spell.reset();this.ultimate.reset();
      finish(this,{passed:this.children.list.length===1&&combat.zoneCount===0&&combat.rigCount===0&&this.maxZones<=24&&this.maxShots<=64&&this.maxUltimates<=40&&this.attacks.size===4,
        seconds:this.elapsed/1000,frames:this.frames,maxZones:this.maxZones,maxObjects:this.maxObjects,maxShots:this.maxShots,maxUltimates:this.maxUltimates,
        attacks:[...this.attacks],objectsAfterReset:this.children.list.length,frame:stats(this.intervals),viewport:[900,540],dpr:devicePixelRatio,
        scope:'Four bosses (two half health) + 68 normal enemies, 9 piercing/burning/exploding fireballs and repeated fire Q. Fixture health prevents deaths; active time 180s. No arena/HUD, GPU or mobile measurement.'});
    }
  }
  launch(new Stress());
}
document.querySelector<HTMLButtonElement>('#stress')!.onclick=stress;


function artwork():void {
  class Artwork extends Phaser.Scene {
    create():void {
      const player=new Player(this);player.view.setPosition(1200,1110);
      const system=new EnemySystem(this,undefined,undefined,()=>.9);
      const combat=(system as unknown as {bosses:import('../src/game/enemies/BossCombat').BossCombat}).bosses;
      const fights=(combat as unknown as {fights:Map<number,{exposure:number;phase:string}>}).fights;
      for(const [i,label] of ['护核姿态','半血破甲','露核反击窗口'].entries()) {
        const boss=spawn(system,'boss',880+i*320,900);
        if(i===1)boss.health.current=boss.health.maximum*.4;
        if(i===2){const fight=fights.get(boss.id)!;fight.exposure=GUARDIAN.exposure;fight.phase='recover';}
        boss.bar.scaleX=boss.health.current/boss.health.maximum;combat.pose(boss);
        this.add.text(boss.view.x,1035,label,{fontSize:'19px',color:'#e6e8dd'}).setOrigin(.5);
      }
      this.add.text(1200,1145,'玩家实际比例',{fontSize:'13px',color:'#bebcac'}).setOrigin(.5);
      this.cameras.main.centerOn(1200,900);result.textContent='实际游戏比例：独立双臂、双腿与胸甲；半血肩甲破碎，露核时胸甲向两侧展开。';
      this.scene.pause();this.game.events.once(Phaser.Core.Events.POST_RENDER,()=>{this.game.pause();this.game.loop.sleep();});
    }
  }
  launch(new Artwork());
}
document.querySelector<HTMLButtonElement>('#art')!.onclick=artwork;
