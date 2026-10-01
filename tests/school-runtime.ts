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
