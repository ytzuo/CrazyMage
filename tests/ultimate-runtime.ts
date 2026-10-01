import Phaser from 'phaser';
import { ArenaScene } from '../src/game/scenes/ArenaScene';
import { MovementInput } from '../src/game/input/MovementInput';
import { UltimateSpell } from '../src/game/ultimates/UltimateSpell';
import { EnemySystem } from '../src/game/enemies/EnemySystem';
import { Player } from '../src/game/entities/Player';
import type { MovementState } from '../src/game/config';
const result=document.querySelector<HTMLPreElement>('#result')!;
let game:Phaser.Game|undefined,input:MovementInput|undefined;
document.querySelector<HTMLButtonElement>('#check')!.onclick=()=>{
  input?.destroy();game?.destroy(true);
  input=new MovementInput(document.querySelector('#joystick')!,document.querySelector('#knob')!);
  let state:MovementState;
  const arena=new ArenaScene(input,s=>{state=s;});
  const create=arena.create.bind(arena);
  arena.create=()=>{
    create();
    const reports:unknown[]=[];
    const check=(ok:boolean,message:string)=>{if(!ok)throw Error(message);};
    const key=(repeat=false)=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyQ',repeat}));
    const up=()=>window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyQ'}));
    // Fixtures inspect internals locally; production exposes no mutation/debug API.
    const internals=arena as unknown as {player:Player;enemies:EnemySystem;ultimate:UltimateSpell};
    const {player,enemies,ultimate}=internals;
    (enemies as unknown as {random:()=>number}).random=()=>0.9;
    try{
      check(!arena.castUltimate(),'selection allowed ultimate');arena.chooseSchool('fire');
      key();arena.update(0,0);up();check(ultimate.casts===0,'uncharged Q cast');
      enemies.update(30000,player);
      const selected=[...enemies.enemies.filter(e=>e.wave===1).slice(0,5),...enemies.enemies.filter(e=>e.wave===2).slice(0,5)];
      check(selected.length===10,'not enough charge targets');
      for(const enemy of selected){enemy.spawning=0;enemies.hit(enemy,10000,{x:1,y:0});enemies.hit(enemy,10000,{x:1,y:0});}
      check(ultimate.charge.energy===100&&enemies.kills===10,'kill path duplicates or misses energy');
      for(const enemy of enemies.enemies){enemy.spawning=0;enemy.view.setPosition(2100,1500);}
      check(!arena.castUltimate()&&ultimate.charge.ready,'empty cast consumed charge');
      for(const enemy of enemies.enemies)enemy.view.setPosition(1300,900);
      arena.setPaused(true);key();check(!arena.castUltimate(),'paused ultimate released');arena.setPaused(false);arena.update(0,0);check(ultimate.casts===0,'paused Q buffered across resume');up();
      key();arena.update(0,0);
      check(ultimate.casts===1&&ultimate.charge.energy===0&&enemies.enemies.length===0,'Q failed to release fire or recursed charge');
      check(state!.progression.choice!==null&&state!.nextWaveIn===3000,'ultimate clear broke wave reward/countdown');
      key(true);arena.update(0,0);check(ultimate.casts===1,'held Q repeated');up();
      check(!arena.castUltimate(),'upgrade selection allowed ultimate');
      arena.resetPosition();check(ultimate.charge.energy===0&&ultimate.effectCount===0,'restart retained ultimate');
      reports.push({check:'real kill charge and deduplication, empty target, Q, pause, held key, wave rewards and reset'});
      arena.chooseSchool('ice');
      enemies.waveClock.wave=30;enemies.update(30000,player);
      const brute=enemies.enemies.find(e=>e.spec.kind==='brute')!;
      for(const enemy of enemies.enemies){enemy.spawning=0;enemy.view.setPosition(2200,1600);}
      brute.view.setPosition(1230,900);brute.windup=400;brute.warning.setVisible(true);
      for(let i=0;i<10;i++)ultimate.charge.onKill();
      const before=brute.health.current;check(arena.castUltimate(),'ice ultimate failed');
      check(brute.health.current===before-40&&brute.frozen===3000&&brute.windup===0,'ice damage/freeze did not apply');
      const x=brute.view.x,hp=player.health.current;
      enemies.update(2999,player);check(brute.view.x===x&&player.health.current===hp&&brute.frozen===1,'frozen enemy moved or attacked');
      enemies.update(0,player);check(brute.frozen===1,'zero time advanced freeze');
      enemies.update(1,player);check(brute.frozen===0,'enemy did not thaw');
      enemies.update(250,player);check(brute.windup>0,'thawed enemy did not resume attacks');
      reports.push({check:'ice damage, cancels attack, freezes movement/attacks for 3 seconds, resumes after thaw'});
      arena.resetPosition();arena.chooseSchool('lightning');enemies.waveClock.wave=30;enemies.update(60000,player);
      for(const enemy of enemies.enemies){enemy.spawning=0;enemy.view.setPosition(1350,900);enemy.health.configure(1000,0);enemy.health.reset();}
      const targets=[...enemies.enemies];for(let i=0;i<10;i++)ultimate.charge.onKill();check(arena.castUltimate(),'lightning failed');
      check(targets.filter(e=>e.health.current===915).length===12&&targets.filter(e=>e.health.current!==1000&&e.health.current!==915).length===0,'lightning cap/damage/dedup failed');
      check(ultimate.effectCount===24,'unexpected lightning effect budget');
      for(let repeat=0;repeat<4;repeat++){for(let i=0;i<10;i++)ultimate.charge.onKill();ultimate.cast(1200,900,enemies);}
      check(ultimate.effectCount<=40,'effect cap exceeded');ultimate.update(800);check(ultimate.effectCount===0,'ultimate effects did not expire');
      reports.push({check:'lightning hits exactly 12 unique targets, effects bounded to 40 and expire within 800 ms'});
      arena.resetPosition();const baseline=arena.children.list.length;
      for(let i=0;i<10;i++){arena.chooseSchool('fire');for(let n=0;n<10;n++)ultimate.charge.onKill();for(const e of enemies.enemies){e.spawning=0;e.view.setPosition(1300,900);}arena.castUltimate();arena.resetPosition();check(arena.children.list.length===baseline,'repeat reset leaked');}
      check(state!.ultimateEnergy===0&&state!.ultimateCasts===0,'published state retained energy');
      reports.push({check:'ten complete resets',objects:baseline});
      result.textContent=JSON.stringify({passed:true,reports},null,2);
    }catch(error){result.textContent=JSON.stringify({passed:false,error:String(error),reports},null,2);}
    arena.setPaused(true);arena.game.events.once(Phaser.Core.Events.POST_RENDER,()=>{arena.game.pause();arena.game.loop.sleep();});
  };
  game=new Phaser.Game({type:Phaser.AUTO,parent:'test-game',width:800,height:520,scene:arena,backgroundColor:'#17251f',audio:{noAudio:true}});
};
