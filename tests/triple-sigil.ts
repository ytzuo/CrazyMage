import Phaser from 'phaser';
import { Player } from '../src/game/entities/Player';
import { EnemySystem, type Enemy } from '../src/game/enemies/EnemySystem';
import { AreaAttacks } from '../src/game/enemies/AreaAttacks';
import { enemySpec, type EnemyKind } from '../src/game/enemies/roster';
import { rollVariant, type EnemyVariant } from '../src/game/enemies/variants';
import { prepareEnemyTextures } from '../src/game/art/CharacterTextures';
import { SpellRunner } from '../src/game/spells/SpellRunner';
import { UltimateSpell } from '../src/game/ultimates/UltimateSpell';
import { applyUpgrade, compileBuild, initialBuild } from '../src/game/upgrades/build';
const result=document.querySelector<HTMLPreElement>('#result')!;
const pause=document.querySelector<HTMLButtonElement>('#pause')!;
let game:Phaser.Game|undefined,paused=false;
type Fixture={areaAttacks:AreaAttacks;createEnemy(x:number,y:number,wave:number,spec:ReturnType<typeof enemySpec>,variant:EnemyVariant,warning:number):void};
function spawn(system:EnemySystem,kind:EnemyKind,x:number,y:number,variant:EnemyVariant='normal'):Enemy {
  (system as unknown as Fixture).createEnemy(x,y,13,enemySpec(kind,13),variant,0);
  if(system.enemies.length===1)system.waves.register(13,1);else system.waves.add(13,1);
  const e=system.enemies.at(-1)!;e.view.setAlpha(1);e.warning.setVisible(false);return e;
}
function launch(scene:Phaser.Scene):void {
  game?.destroy(true);game?.loop.wake();paused=false;pause.textContent='暂停';result.textContent='运行中';
  game=new Phaser.Game({type:Phaser.AUTO,parent:'test-game',width:900,height:540,scene,backgroundColor:'#17251f',audio:{noAudio:true}});
}
function finish(scene:Phaser.Scene,data:unknown):void {
  result.textContent=JSON.stringify(data,null,2);scene.scene.pause();
  scene.game.events.once(Phaser.Core.Events.POST_RENDER,()=>{scene.game.pause();scene.game.loop.sleep();});
}
function checks():void {
  class Checks extends Phaser.Scene {
    create():void {
      const player=new Player(this),areas=new AreaAttacks(this),system=new EnemySystem(this,undefined,undefined,()=>0.9),reports:string[]=[];
      const check=(ok:boolean,label:string)=>{if(!ok)throw Error(label);};
      const zones=()=>this.children.list.filter(o=>o instanceof Phaser.GameObjects.Image&&o.texture.key==='enemy-range-ranged') as Phaser.GameObjects.Image[];
      const impacts=()=>this.children.list.filter(o=>o instanceof Phaser.GameObjects.Image&&o.texture.key==='enemy-impact-detail') as Phaser.GameObjects.Image[];
      const fresh=()=>{areas.reset();system.reset();player.reset();system.waveClock.wave=13;system.waveClock.scheduleNext(1e9);};
      const advance=(ms:number)=>{for(let elapsed=0;elapsed<ms;){const step=Math.min(50,ms-elapsed);areas.update(step,player);elapsed+=step;}};
      try {
        check(rollVariant('artillery',()=>0,4)==='triple'&&rollVariant('artillery',()=>1,4)==='normal','artillery variant roll');
        fresh();check(areas.begin(1,1200,900,14,1100,true),'triple failed to start');
        check(areas.count===3&&zones().filter(z=>z.visible).length===1,'triple did not reserve three / expose first');
        player.view.setPosition(1340,900);advance(450);const second=zones().find(z=>z.visible&&z.x===1340)!;check(!!second,'second lock not at current player');
        player.view.setPosition(1480,900);advance(450);const third=zones().find(z=>z.visible&&z.x===1480)!;check(!!third&&zones().filter(z=>z.visible).length===3,'third lock missing');
        player.view.setPosition(1200,900);advance(199);check(player.health.current===120&&impacts().length===0,'early damage');advance(1);check(player.health.current===106,'first damage timing');
        player.health.reset();player.view.setPosition(1340,900);advance(449);check(player.health.current===120,'second exploded early');advance(1);check(player.health.current===106&&second.texture.key==='enemy-impact-detail','second timing/locked position');
        player.health.reset();player.view.setPosition(1480,900);advance(450);check(player.health.current===106&&third.texture.key==='enemy-impact-detail','third timing');
        advance(300);check(areas.count===0&&impacts().length===0,'feedback did not recycle');reports.push('three separate locks; damage at 1100/1550/2000 ms; cleanup after 2300 ms');
        fresh();areas.begin(1,1200,900,14,1100,true);const initial=zones()[0].alpha;areas.update(0,player);check(areas.count===3&&zones()[0].alpha===initial,'zero delta advanced zones');
        player.view.setPosition(1800,1200);areas.update(5000,player);check(player.health.current===120&&zones().filter(z=>z.visible).length===1,'long frame produced unannounced follow-up damage');
        reports.push('zero time stable; long frames retain full warning and never catch up both follow-ups');
        fresh();for(let id=0;id<4;id++)check(areas.begin(id,1200,900,1,1100,true),'could not reserve four triples');
        const objects=this.children.list.length;check(areas.count===12&&!areas.begin(99,1200,900,1,1100,true)&&this.children.list.length===objects,'cap or rejected cast leaked');
        areas.cancel(0);check(areas.count===9&&areas.begin(99,1200,900,1,1100,true),'cancel did not release reservation');areas.reset();
        for(let id=0;id<10;id++)areas.begin(id,1200,900,1,1100);
        check(!areas.begin(90,1200,900,1,1100,true)&&areas.count===10,'partial triple reservation');reports.push('12 shared slots, atomic triples, normal/triple mixing and cancellation');
        for(const reason of ['hit','freeze','death','reset'] as const) {
          fresh();const e=spawn(system,'artillery',1000,900,'triple');spawn(system,'brute',2100,1500).spawning=100000;
          system.update(1,player);const attacks=(system as unknown as Fixture).areaAttacks;
          check(attacks.count===3&&e.windup===2000&&e.view.x===1000,'integration did not start stationary triple');
          if(reason==='hit')system.hit(e,1,{x:1,y:0});
          else if(reason==='freeze')system.freeze(e,500,false);
          else if(reason==='death')system.hit(e,99999,{x:0,y:0});else system.reset();
          check(attacks.count===0,'integration cancellation failed: '+reason);
        }
        reports.push('EnemySystem starts triple windup; hit, freeze, death and reset cancel future zones');
        fresh();const baseline=this.children.list.length,keys=this.textures.getTextureKeys().length;
        for(let i=0;i<10;i++) {areas.begin(i,1200,900,1,1100,true);advance(450);areas.reset();system.reset();prepareEnemyTextures(this);check(this.children.list.length===baseline&&this.textures.getTextureKeys().length===keys,'restart leak');}
        reports.push('ten restarts return to baseline and reuse cached artwork');finish(this,{passed:true,reports});
      }catch(error){finish(this,{passed:false,error:String(error),reports});}
    }
  }
  launch(new Checks());
}
function preview(stress=false):void {
  class Preview extends Phaser.Scene {
    private player!:Player;private system!:EnemySystem;private elapsed=0;private cycle=-1;
    private frames=0;private intervals:number[]=[];private maximum=0;private peaks=0;
    private spell:SpellRunner|null=null;private ultimate:UltimateSpell|null=null;private projectiles=0;private visuals=0;
    create():void {
      this.player=new Player(this);this.system=new EnemySystem(this,undefined,undefined,()=>0.9);
      this.system.waveClock.wave=13;this.system.waveClock.scheduleNext(1e9);
      if(stress) {
        const build=['fire.multi','fire.multi','fire.pierce','fire.explosion'].reduce((b,id)=>applyUpgrade(b,id),initialBuild(1,'fire','endless'));
        const effective=compileBuild(build);this.spell=new SpellRunner(this,effective);this.ultimate=new UltimateSpell(this);this.ultimate.configure(effective.ultimate);
      }
      for(let i=0;i<(stress?72:1);i++) {
        const kind:EnemyKind=i<4?'artillery':'chaser';
        const e=spawn(this.system,kind,stress?1000+(i%8)*65:940,stress?700+Math.floor(i/8)*40:850,kind==='artillery'?'triple':i%3===0?'splitter':'normal');
        if(kind==='chaser')e.cooldown=100000;
        if(stress){e.health.maximum=1e6;e.health.reset();}
      }
      this.cameras.main.setZoom(stress?1:1.35).centerOn(1220,860);
    }
    update(_time:number,delta:number):void {
      const step=Math.min(delta,50);this.elapsed+=step;this.frames++;this.intervals.push(delta);
      this.player.health.reset();this.player.update(stress?{x:0.15,y:0}:{x:0,y:0},step);
      const cycle=Math.floor(this.elapsed/6500),t=this.elapsed%6500;
      this.player.view.setPosition(t<600?1130:t<1050?1290:1450,880);
      if(stress)for(const e of this.system.enemies)e.health.current=1e6;
      this.system.update(step,this.player);
      if(this.spell&&this.ultimate) {
        this.spell.update(step,this.system,{x:this.player.view.x,y:this.player.view.y});this.ultimate.update(step);
        if(this.spell.cast(this.player.view.x,this.player.view.y,{x:1,y:0},this.system))this.player.cast({x:1,y:0},'fire');
        if(Math.floor(this.elapsed/4000)!==Math.floor((this.elapsed-step)/4000)){this.ultimate.charge.fill();this.ultimate.cast(this.player.view.x,this.player.view.y,this.system,{x:1,y:0});}
        this.projectiles=Math.max(this.projectiles,this.spell.projectileCount);this.visuals=Math.max(this.visuals,this.ultimate.effectCount);
      }
      const count=(this.system as unknown as Fixture).areaAttacks.count;this.maximum=Math.max(this.maximum,count);this.peaks=Math.max(this.peaks,this.children.list.length);
      if(count>12||this.projectiles>64||this.visuals>40){finish(this,{passed:false,error:'resource cap',count,projectiles:this.projectiles,visuals:this.visuals});return;}
      if(cycle!==this.cycle) {this.cycle=cycle;result.textContent=stress?`持续运行 ${Math.floor(this.elapsed/1000)} 秒；72 只怪物，咒印峰值 ${this.maximum}/12`:'三个落点依次锁定，预警完成后顺序爆发。';}
      if(stress&&this.elapsed>=180000) {
        this.spell?.reset();this.ultimate?.reset();this.system.reset();const sorted=[...this.intervals].sort((a,b)=>a-b);
        finish(this,{passed:true,seconds:180,frames:this.frames,maxZones:this.maximum,maxProjectiles:this.projectiles,maxUltimateVisuals:this.visuals,maxObjects:this.peaks,objectsAfterReset:this.children.list.length,
          meanFrame:this.intervals.reduce((a,b)=>a+b,0)/this.intervals.length,p95Frame:sorted[Math.floor(sorted.length*0.95)],over25:this.intervals.filter(x=>x>25).length,
          viewport:[900,540],dpr:devicePixelRatio,note:'72 actors: four triple artillery plus 68 normal/splitter chasers; restored enemy HP, healed moving/casting player, five fireballs with pierce/explosion and repeated fire ultimate; test scene without map/HUD, no mobile/GPU certification.'});
      }
    }
  }
  launch(new Preview());
}
document.querySelector<HTMLButtonElement>('#check')!.onclick=checks;
document.querySelector<HTMLButtonElement>('#preview')!.onclick=()=>preview();
document.querySelector<HTMLButtonElement>('#stress')!.onclick=()=>preview(true);
pause.onclick=()=>{if(!game)return;paused=!paused;if(paused){game.pause();game.loop.sleep();}else{game.resume();game.loop.wake();}pause.textContent=paused?'继续':'暂停';pause.dataset.loopRunning=String(game.loop.running);};
