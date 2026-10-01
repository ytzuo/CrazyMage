import Phaser from 'phaser';
import { Player } from '../src/game/entities/Player';
import { EnemySystem } from '../src/game/enemies/EnemySystem';
import { compileBuild, initialBuild } from '../src/game/upgrades/build';
import { SCHOOLS } from '../src/game/upgrades/definitions';
const result=document.querySelector<HTMLPreElement>('#result')!;
let game:Phaser.Game|undefined;
document.querySelector<HTMLButtonElement>('#check')!.onclick=()=>{
  game?.destroy(true);
  class Checks extends Phaser.Scene {
    create(){
      const check=(ok:boolean,message:string)=>{if(!ok)throw Error(message);};
      const reports:unknown[]=[];
      try{
        const player=new Player(this),enemies=new EnemySystem(this);
        const figure=player.view.list[2] as Phaser.GameObjects.Container;
        const wand=figure.list[1] as Phaser.GameObjects.Container;
        const baseline=this.children.list.length;
        check(player.health.maximum===120,'starting health mismatch');
        const intervals=SCHOOLS.map(school=>{const b=compileBuild(initialBuild(1,school));return school==='fire'?b.fireball.cooldown:school==='ice'?b.ice.cooldown:b.lightning.cooldown;});
        check(intervals.join() === '550,1100,900','starting cast intervals mismatch');
        for(const school of SCHOOLS){
          player.reset();player.cast({x:1,y:0},school);player.update({x:0,y:-1},70);
          check(player.casting&&figure.x>0&&wand.rotation!==0&&player.view.y<900,'cast pose blocked movement or did not animate');
          const rotation=wand.rotation;player.update({x:0,y:0},0);
          check(wand.rotation===rotation,'zero delta advanced casting');
          player.update({x:0,y:0},210);check(!player.casting&&wand.rotation===0&&figure.x===0,'cast did not return to idle');
          player.cast({x:-1,y:0},school);player.update({x:1,y:0},70);check(figure.scaleX<0,'movement overrode cast facing');
          player.reset();check(!player.casting&&wand.rotation===0,'reset retained cast');
        }
        check(this.children.list.length===baseline,'casting created persistent objects');
        reports.push({check:'three schools cast, move simultaneously, face aim, freeze and reset',health:120,intervals});
        enemies.reset(player);enemies.waveClock.wave=3;enemies.update(30000,player);
        const kinds=['chaser','swift','ranged','brute'] as const;
        for(const kind of kinds){
          player.reset();
          for(const enemy of enemies.enemies){enemy.spawning=100000;enemy.view.setPosition(2100,1500);}
          const enemy=enemies.enemies.find(e=>e.spec.kind===kind)!;
          check(!!enemy,'missing enemy');enemy.spawning=0;enemy.cooldown=enemy.attackTime=enemy.windup=0;
          enemy.view.setPosition(1200+enemy.spec.range-5,900);
          enemies.update(1,player);check(enemy.windup>0&&enemy.warning.visible,'attack had no windup');
          enemies.update(enemy.spec.windup/2,player);check(enemy.body.x!==0&&enemy.body.rotation!==0,'windup had no body motion');
          const x=enemy.body.x,windup=enemy.windup;enemies.update(0,player);check(enemy.body.x===x&&enemy.windup===windup,'zero delta advanced enemy pose');
          const hp=player.health.current;enemies.update(enemy.windup,player);
          check(enemy.attackTime===230&&enemy.windup===0,'release did not start attack action');
          if(kind==='ranged')check(enemies.shots.count>0,'ranged action suppressed projectile');
          else check(player.health.current===hp-enemy.spec.damage,'melee motion changed damage timing');
          enemies.update(80,player);check(enemy.body.x!==0,'attack release had no body motion');
          enemies.hit(enemy,1,{x:1,y:0});check(enemy.attackTime===0&&enemy.body.x===0&&enemy.body.rotation===0,'hit did not cancel attack pose');
          enemy.knockback.x=0;enemy.knockback.y=0;
          enemy.windup=enemy.spec.windup/2;enemies.hit(enemy,1,{x:1,y:0});check(enemy.windup===0&&!enemy.warning.visible,'hit did not cancel windup');
          reports.push({check:'windup, release, freeze, hit interruption',kind});
        }
        for(let i=0;i<10;i++){enemies.reset(player);player.cast({x:1,y:0},'fire');player.reset();enemies.reset();check(this.children.list.length===baseline,'reset accumulated objects');}
        reports.push({check:'ten resets return to baseline',objects:baseline});
        // Keep a deterministic pose gallery visible after tests for review.
        enemies.reset(player);enemies.waveClock.wave=3;enemies.update(30000,player);
        player.view.setPosition(1200,900);player.cast({x:1,y:0},'fire');player.update({x:0,y:0},85);
        for(const enemy of enemies.enemies){enemy.spawning=100000;enemy.view.setPosition(2100,1500);}
        kinds.forEach((kind,i)=>{const enemy=enemies.enemies.find(e=>e.spec.kind===kind)!;enemy.spawning=0;enemy.view.setPosition(1000+i*140,1080);enemy.aim={x:0,y:-1};enemy.windup=enemy.spec.windup/2;enemy.warning.setVisible(true);});
        enemies.update(0,player);this.cameras.main.setZoom(1.35).centerOn(1210,980);
        this.add.text(1020,810,'施法：抬杖 → 前推 → 回落',{fontSize:'16px',color:'#f6d49d'});
        kinds.forEach((kind,i)=>this.add.text(966+i*140,1125,{chaser:'追击怪',swift:'快速怪',ranged:'远程怪',brute:'重型怪'}[kind],{fontSize:'13px',color:'#e0e7ca'}));
        result.textContent=JSON.stringify({passed:true,reports},null,2);
      }catch(error){result.textContent=JSON.stringify({passed:false,error:String(error),reports},null,2);}
      this.scene.pause();this.game.events.once(Phaser.Core.Events.POST_RENDER,()=>{this.game.pause();this.game.loop.sleep();});
    }
  }
  game=new Phaser.Game({type:Phaser.AUTO,parent:'test-game',width:800,height:520,scene:Checks,backgroundColor:'#17251f',audio:{noAudio:true}});
};
