import Phaser from 'phaser';
import { Player } from '../src/game/entities/Player';
import { EnemySystem } from '../src/game/enemies/EnemySystem';
import { FireballSpell } from '../src/game/spells/FireballSpell';
import { compileBuild, initialBuild } from '../src/game/upgrades/build';
import { ENEMY_SHOTS } from '../src/game/enemies/roster';
const result=document.querySelector<HTMLPreElement>('#result')!;
let game:Phaser.Game|undefined;
function run(preview:boolean) {
  game?.destroy(true);
  class Checks extends Phaser.Scene {
    create() {
      const player=new Player(this),enemies=new EnemySystem(this, undefined, undefined, () => 0.9);
      const check=(ok:boolean,message:string)=>{if(!ok)throw Error(message);};
      const reports:unknown[]=[];
      try {
        enemies.reset(player);enemies.update(90000,player);
        check(enemies.enemies.length===36,'global cap or growing waves failed');
        check(new Set(enemies.enemies.map(e=>e.spec.kind)).size===4,'missing enemy kind');
        reports.push({check:'four kinds, growing waves and 36-enemy cap',count:enemies.enemies.length});
        for(const enemy of enemies.enemies) {enemy.spawning=100000;enemy.view.setPosition(2000,1500);}
        const ranged=enemies.enemies.find(e=>e.spec.kind==='ranged')!;
        ranged.spawning=0;ranged.view.setPosition(player.view.x+300,player.view.y);
        enemies.update(1,player);
        check(ranged.aimLine.visible&&ranged.windup===700&&enemies.shots.count===0,'ranged warning did not precede shot');
        enemies.hit(ranged,1,{x:1,y:0});
        check(!ranged.aimLine.visible&&ranged.windup===0,'hit failed to interrupt ranged windup');
        ranged.cooldown=0;ranged.knockback.x=0;enemies.update(1,player);
        const aim={...ranged.aim};player.view.y+=150;
        enemies.update(700,player);
        check(enemies.shots.count===1&&ranged.aim.x===aim.x&&ranged.aim.y===aim.y,'ranged aim followed player or failed to fire');
        enemies.update(1600,player);
        check(player.health.current===player.health.maximum,'fixed-aim shot could not be dodged');
        reports.push({check:'700 ms telegraph, interruption, fixed aim and successful dodge'});
        enemies.shots.reset();player.reset();ranged.view.setPosition(player.view.x+10,player.view.y);
        ranged.cooldown=0;ranged.windup=0;ranged.knockback.x=0;enemies.update(1,player);enemies.update(700,player);
        check(player.health.current===player.health.maximum-ranged.spec.damage,'point-blank ranged shot skipped player');
        reports.push({check:'point-blank ranged attacks hit without spawning beyond player'});
        enemies.shots.reset();player.reset();
        enemies.shots.fire(player.view.x-100,player.view.y,{x:1,y:0},8);
        enemies.shots.update(500,player);
        check(player.health.current===192&&enemies.shots.count===0,'fast shot missed swept collision or did not release');
        enemies.shots.fire(player.view.x-100,player.view.y,{x:1,y:0},8);enemies.shots.update(500,player);
        check(player.health.current===192,'projectile bypassed invulnerability');
        player.reset();
        for(let i=0;i<40;i++)enemies.shots.fire(1200,900,{x:1,y:0},8);
        check(enemies.shots.count===ENEMY_SHOTS.maximum,'enemy shot cap exceeded');
        enemies.shots.update(ENEMY_SHOTS.lifetime,player);check(enemies.shots.count===0,'expired shots retained');
        reports.push({check:'swept player hits, shared invulnerability, 32-shot cap and expiry'});
        // A grazing fireball must use the brute radius rather than the original chaser radius.
        for(const enemy of enemies.enemies) {enemy.spawning=100000;enemy.view.setPosition(2000,1500);}
        const brute=enemies.enemies.find(e=>e.spec.kind==='brute')!;
        brute.spawning=0;brute.view.setPosition(1350,932);
        const before=brute.health.current;
        const spell=new FireballSpell(this,compileBuild(initialBuild(1)).fireball);
        spell.cast(1200,900,{x:1,y:0});spell.update(250,enemies);
        check(brute.health.current===before-20,'brute edge missed actual body radius');spell.reset();
        reports.push({check:'fireball collision uses each enemy body radius'});
        enemies.reset(player);const baseline=this.children.list.length;
        for(let i=0;i<10;i++) {
          enemies.update(90000,player);enemies.shots.fire(1200,900,{x:1,y:0},8);enemies.reset(player);
          check(this.children.list.length===baseline&&enemies.shots.count===0,'restart leaked enemy objects');
        }
        reports.push({check:'ten mixed-roster restarts release enemies, shots and telegraphs',objects:baseline});
        if(preview) {
          enemies.update(90000,player);
          const representatives=['chaser','swift','ranged','brute'].map(kind=>enemies.enemies.find(e=>e.spec.kind===kind)!);
          for(const enemy of enemies.enemies) enemy.view.setVisible(representatives.includes(enemy));
          const names=['追击怪','快速小怪','远程小怪','重型大怪'];
          representatives.forEach((enemy,i)=>{
            enemy.view.setPosition(900+i*200,800).setAlpha(1);enemy.warning.setVisible(false);
            this.add.text(enemy.view.x,700,names[i],{fontSize:'18px',color:'#e6e8dd'}).setOrigin(0.5);
            this.add.text(enemy.view.x,875,`生命 ${enemy.spec.health}\n攻击 ${enemy.spec.damage}\n速度 ${Math.round(enemy.spec.speed)}`,{fontSize:'14px',color:'#abb6a4',align:'center'}).setOrigin(0.5);
          });
          player.view.setPosition(1200,1050);this.cameras.main.centerOn(1200,900);
        }
        result.textContent=JSON.stringify({passed:true,reports},null,2);
      } catch(error) {result.textContent=JSON.stringify({passed:false,error:String(error),reports},null,2);}
      this.scene.pause();
      const pause = () => { this.game.pause(); this.game.loop.sleep(); };
      if(preview) this.game.events.once(Phaser.Core.Events.POST_RENDER, pause);
      else queueMicrotask(pause);
    }
  }
  game=new Phaser.Game({type:Phaser.AUTO,parent:'test-game',width:900,height:480,scene:Checks,backgroundColor:'#17251f',audio:{noAudio:true}});
}
document.querySelector<HTMLButtonElement>('#check')!.onclick=()=>run(false);
document.querySelector<HTMLButtonElement>('#preview')!.onclick=()=>run(true);
