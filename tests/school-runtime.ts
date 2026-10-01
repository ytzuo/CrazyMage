import Phaser from 'phaser';
import { Player } from '../src/game/entities/Player';
import { EnemySystem } from '../src/game/enemies/EnemySystem';
import { SpellRunner } from '../src/game/spells/SpellRunner';
import { applyUpgrade, compileBuild, initialBuild } from '../src/game/upgrades/build';
import { SCHOOLS } from '../src/game/upgrades/definitions';
const result=document.querySelector<HTMLPreElement>('#result')!;
let game:Phaser.Game|undefined;
document.querySelector<HTMLButtonElement>('#check')!.onclick=()=>{
  game?.destroy(true);
  class Checks extends Phaser.Scene {
    create(){
      const check=(ok:boolean,message:string)=>{if(!ok)throw Error(message);};
      const reports:unknown[]=[];
      try {
        const player=new Player(this),enemies=new EnemySystem(this),iceBuild=initialBuild(1,'ice');
        const runner=new SpellRunner(this,compileBuild(iceBuild));
        enemies.reset(player);
        enemies.enemies.forEach((e,i)=>{e.spawning=0;e.view.setPosition(i<3?1300+i*10:2100,i<3?900:1500);});
        const target=enemies.enemies[0];
        check(runner.cast(1200,900,{x:1,y:0},enemies),'ice did not cast');
        check(target.health.current===16&&target.slow.strength===0.3,'ice damage or slow did not apply');
        const x=target.view.x;target.knockback.x=0;enemies.update(100,player);
        check(Math.abs(x-target.view.x-88*0.7*0.1)<0.01,'slow did not reduce movement');
        runner.reset();enemies.reset(player);
        enemies.enemies.forEach((e,i)=>{e.spawning=0;e.view.setPosition(i===0?1300:2100,i===0?900:1500);});
        const echoed=enemies.enemies[0],echo=applyUpgrade(iceBuild,'ice.echo');
        runner.configure(compileBuild(echo));runner.cast(1200,900,{x:1,y:0},enemies);
        check(echoed.health.current===22,'echo initial damage wrong');
        runner.configure(compileBuild(applyUpgrade(echo,'ice.damage')));
        runner.update(179,enemies);check(echoed.health.current===22,'echo fired early');
        runner.update(1,enemies);check(echoed.health.current===4,'pending echo changed its launch snapshot');
        reports.push({check:'ice ring damage, actual slowed movement, timed echo and immutable snapshot'});
        runner.reset();enemies.reset(player);runner.configure(compileBuild(initialBuild(2,'lightning')));
        enemies.enemies.forEach((e,i)=>{e.spawning=0;e.view.setPosition(i<3?1300+i*80:2100,i<3?900:1500);});
        const targets=enemies.enemies.slice(0,3);
        check(runner.cast(1200,900,{x:1,y:0},enemies),'lightning did not cast');
        check(Math.abs(targets[0].health.current-20)<0.001&&Math.abs(targets[1].health.current-24)<0.001&&Math.abs(targets[2].health.current-27.2)<0.001,'chain damage or target deduplication wrong');
        runner.update(650,enemies);
        for(const e of enemies.enemies)e.view.setPosition(2100,1500);
        const casts=runner.casts;check(!runner.cast(1200,900,{x:1,y:0},enemies)&&runner.casts===casts,'no-target lightning consumed cast');
        reports.push({check:'directional chain, distinct targets, falloff and no-target casts'});
        runner.reset();enemies.reset(player);const baseline=this.children.list.length;
        for(let round=0;round<10;round++)for(const school of SCHOOLS){
          runner.configure(compileBuild(initialBuild(round+3,school)));enemies.reset(player);
          enemies.enemies.forEach(e=>{e.spawning=0;e.view.setPosition(1300,900);});
          runner.cast(1200,900,{x:1,y:0},enemies);runner.reset();enemies.reset(player);
          check(this.children.list.length===baseline,'school switch or reset leaked objects');
        }
        reports.push({check:'ten cycles through all schools release spells, echoes and enemies',objects:baseline});
        result.textContent=JSON.stringify({passed:true,reports},null,2);
      }catch(error){result.textContent=JSON.stringify({passed:false,error:String(error),reports},null,2);}
      this.scene.pause();queueMicrotask(()=>{this.game.pause();this.game.loop.sleep();});
    }
  }
  game=new Phaser.Game({type:Phaser.AUTO,parent:'test-game',width:640,height:360,scene:Checks,backgroundColor:'#17251f',audio:{noAudio:true}});
};

document.querySelector<HTMLButtonElement>('#stress')!.onclick=()=>{
  game?.destroy(true);
  const buttons=[...document.querySelectorAll<HTMLButtonElement>('button')];buttons.forEach(b=>b.disabled=true);
  class Stress extends Phaser.Scene {
    private player!:Player;
    private enemies!:EnemySystem;
    private runner!:SpellRunner;
    private elapsed=0;
    private phase=-1;
    private frames=0;
    private reportTime=0;
    private baseline=0;
    private reports:{school:string;frames:number;maxEnemies:number;maxShots:number;maxProjectiles:number;maxEffects:number;maxObjects:number;intervals:number[]}[]=[];
    create(){this.player=new Player(this);this.enemies=new EnemySystem(this);this.runner=new SpellRunner(this,compileBuild(initialBuild(1)));this.prepare(0);this.cameras.main.centerOn(1200,900);}
    private prepare(phase:number){
      this.runner.reset();this.enemies.reset(this.player);this.player.reset();
      if(!this.baseline)this.baseline=this.children.list.length;
      if(this.children.list.length!==this.baseline)throw Error('school phase cleanup leaked');
      const school=SCHOOLS[phase];
      const ids=school==='fire'?['fire.multi','fire.multi','fire.pierce']:school==='ice'?['ice.echo','ice.radius','ice.cold']:['lightning.chain','lightning.chain','lightning.conduction'];
      const build=[...ids,'passive.cooldown','passive.cooldown','passive.cooldown'].reduce(applyUpgrade,initialBuild(phase+1,school));
      this.runner.configure(compileBuild(build));this.enemies.waveClock.wave=40;this.enemies.update(60000,this.player);
      this.phase=phase;this.reports.push({school,frames:0,maxEnemies:36,maxShots:0,maxProjectiles:0,maxEffects:0,maxObjects:0,intervals:[]});
    }
    update(_time:number,delta:number){
      try{
        const step=Math.min(delta,50);this.elapsed+=step;this.frames++;
        const phase=Math.min(2,Math.floor(this.elapsed/60000));if(phase!==this.phase)this.prepare(phase);
        const report=this.reports[this.phase];report.frames++;if(report.intervals.length<1200)report.intervals.push(delta);
        this.player.health.reset();this.player.update({x:0,y:0},step);
        this.runner.update(step,this.enemies);this.enemies.update(step,this.player);
        let closest=Infinity,aim={x:1,y:0};
        for(const enemy of this.enemies.enemies){const dx=enemy.view.x-this.player.view.x,dy=enemy.view.y-this.player.view.y,d=Math.hypot(dx,dy);if(enemy.spawning===0&&d>0&&d<closest){closest=d;aim={x:dx/d,y:dy/d};}}
        this.runner.cast(this.player.view.x,this.player.view.y,aim,this.enemies);
        report.maxEnemies=Math.max(report.maxEnemies,this.enemies.enemies.length);report.maxShots=Math.max(report.maxShots,this.enemies.shots.count);
        report.maxProjectiles=Math.max(report.maxProjectiles,this.runner.projectileCount);report.maxEffects=Math.max(report.maxEffects,this.runner.impactCount);report.maxObjects=Math.max(report.maxObjects,this.children.list.length);
        if(report.maxEnemies>36||report.maxShots>32||report.maxProjectiles>64||report.maxEffects>(this.phase===1?8:24))throw Error('object cap exceeded');
        const seconds=Math.floor(this.elapsed/1000);
        if(seconds!==this.reportTime){this.reportTime=seconds;result.textContent=JSON.stringify({running:true,seconds,school:SCHOOLS[this.phase],frames:this.frames,maxEnemies:report.maxEnemies,maxEffects:report.maxEffects,maxShots:report.maxShots},null,2);}
        if(this.elapsed<180000)return;
        this.runner.reset();this.enemies.reset(this.player);
        if(this.children.list.length!==this.baseline)throw Error('final cleanup leaked');
        result.textContent=JSON.stringify({passed:true,seconds:180,frames:this.frames,objectsAfterReset:this.children.list.length,reports:this.reports.map(({intervals,...r})=>{
          const sorted=[...intervals].sort((a,b)=>a-b);return {...r,sample:intervals.length,meanFrameMs:intervals.reduce((sum,n)=>sum+n,0)/intervals.length,p95FrameMs:sorted[Math.floor(sorted.length*0.95)]};
        }),note:'Each school rendered for one minute in a 640×360 test scene, continuously healed player, 36 mixed enemies including capped stats. First 1200 intervals per school; not phone, GPU or whole-game validation.'},null,2);
        this.finish();
      }catch(error){result.textContent=JSON.stringify({passed:false,error:String(error)},null,2);this.finish();}
    }
    private finish(){buttons.forEach(b=>b.disabled=false);this.scene.pause();queueMicrotask(()=>{this.game.pause();this.game.loop.sleep();});}
  }
  game=new Phaser.Game({type:Phaser.AUTO,parent:'test-game',width:640,height:360,scene:Stress,backgroundColor:'#17251f',audio:{noAudio:true}});
};
