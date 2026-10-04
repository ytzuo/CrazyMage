import Phaser from 'phaser';
import { GameAudio, attachAudio, detachAudio } from '../src/game/audio/GameAudio';
import { soundUrls } from '../src/game/audio/assets';
import { Player } from '../src/game/entities/Player';
import { EnemySystem } from '../src/game/enemies/EnemySystem';
import { SchoolSkill } from '../src/game/spells/SchoolSkill';
import { UltimateSpell } from '../src/game/ultimates/UltimateSpell';
import { SCHOOLS } from '../src/game/upgrades/definitions';
const output=document.querySelector<HTMLPreElement>('#result')!;
const check=(value:unknown,message:string)=>{if(!value)throw Error(message);};
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const audio=new GameAudio(soundUrls);
const calls:{id:string;time:number}[]=[];
const original=audio.play.bind(audio);
audio.play=(id,options)=>{calls.push({id,time:performance.now()});return original(id,options);};
let game:Phaser.Game|undefined;
async function run(stress:boolean){
  try {
    await audio.ready;
    // Device startup may take longer than one frame after the trusted gesture.
    const unlockDeadline=performance.now()+10000;
    while(audio.status.state==='suspended'&&performance.now()<unlockDeadline)await wait(50);
    if(audio.isMuted)audio.toggleMute();
    audio.reset();audio.setPaused(false);calls.length=0;
    check(audio.status.loaded===36,'Not all 36 assets decoded');
    check(audio.status.state==='running','Real user gesture did not unlock audio');
    check(audio.play('fire_cast_01'),'Unable to start source');
    check(!audio.play('fire_cast_01'),'Identical cue not throttled');
    for(let i=0;i<100;i++)audio.play('ice_impact_01',{gap:0});
    check(audio.status.active===8,'Ordinary voices not capped at eight');
    for(let i=0;i<100;i++)audio.play('shield_break',{gap:0,priority:3});
    check(audio.status.active===12,'Priority voices not capped at twelve');
    audio.setPaused(true);check(audio.status.active===0,'Pause leaked combat voices');
    check(!audio.play('fire_cast_01'),'Combat plays while paused');
    check(audio.play('wave_clear',{combat:false}),'UI sound blocked while paused');
    audio.toggleMute();check(audio.status.active===0&&!audio.play('ui_select',{combat:false}),'Mute failed');audio.toggleMute();
    audio.reset();audio.setPaused(false);
    const reports:string[]=['36 decoded; real gesture unlock; 8/12 voice caps; throttling; paused combat/UI separation; mute'];
    game?.destroy(true);
    await new Promise<void>((resolve,reject)=>{
      class Checks extends Phaser.Scene {
        create(){try {
          attachAudio(this,audio);
          const player=new Player(this), enemies=new EnemySystem(this,undefined,undefined,()=>0.9);
          const skill=new SchoolSkill(this),ultimate=new UltimateSpell(this);
          const targets=()=>{enemies.reset(player);enemies.enemies.forEach((e,i)=>{e.spawning=0;e.view.setPosition(player.view.x+100+i*12,player.view.y);e.health.configure(10000,0);});};
          for(const school of SCHOOLS){
            audio.reset();calls.length=0;targets();skill.reset(school);
            check(skill.cast(player.view.x,player.view.y,{x:1,y:0},enemies),'E rejected');
            check(!skill.cast(player.view.x,player.view.y,{x:1,y:0},enemies),'E cooldown failed');
            skill.update(160);
            check(calls.filter(c=>c.id===school+'_skill').length===1,school+' E sound not exactly once');
            skill.reset();ultimate.reset(school);targets();ultimate.charge.fill();calls.length=0;
            check(ultimate.cast(player.view.x,player.view.y,enemies,{x:1,y:0}),'Q rejected');
            ultimate.update(450,{x:player.view.x,y:player.view.y});ultimate.update(450,{x:player.view.x,y:player.view.y});
            check(calls.filter(c=>c.id===school+'_ultimate').length===(school==='ice'?1:3),school+' Q round sound count');
            ultimate.reset();reports.push(school+' E once / Q per round');
          }
          calls.length=0;player.reset();player.setGender('male');player.hurt(1,0,0);player.hurt(1,0,0);
          check(calls.filter(c=>['player_hurt_01','player_hurt_03'].includes(c.id)).length===1,'Male hurt/invulnerability');
          player.reset();player.setGender('female');player.hurt(1,0,0);
          check(calls.some(c=>['player_hurt_02','player_hurt_04'].includes(c.id)),'Female hurt missing');
          player.reset();player.health.configure(120,20);calls.length=0;player.hurt(10,0,0);
          check(!calls.length,'Shield absorb incorrectly grunts');
          player.update({x:0,y:0},1000);player.hurt(20,0,0);
          check(calls.some(c=>c.id==='shield_break'),'Shield break missing');
          player.reset();calls.length=0;player.hurt(1000,0,0);player.hurt(1000,0,0);
          check(calls.filter(c=>c.id==='defeat').length===1,'Defeat repeats');
          reports.push('Male/female hurt, invulnerability, shield absorb/break, defeat once');
          for(let i=0;i<10;i++){audio.play('ice_ultimate',{gap:0});audio.reset();skill.reset();ultimate.reset();enemies.reset();check(audio.status.active===0,'Restart leaked source');}
          reports.push('Ten resets return voices to zero');
          if(stress){
            let elapsed=0,peak=0,frames=0,last=performance.now();const intervals:number[]=[];
            this.events.on('update',(_time:number,delta:number)=>{
              elapsed+=delta;frames++;const now=performance.now();intervals.push(now-last);last=now;
              for(let i=0;i<72;i++)audio.impact(SCHOOLS[i%3]);
              audio.cast(SCHOOLS[frames%3]);audio.play('fire_ultimate',{priority:2,gap:0.45});
              peak=Math.max(peak,audio.status.active);
              if(elapsed>=180000){audio.reset();this.game.loop.sleep();intervals.sort((a,b)=>a-b);output.textContent=JSON.stringify({passed:peak<=12,reports,seconds:elapsed/1000,peak,active:audio.status.active,frames,p95FrameMs:intervals[Math.floor(intervals.length*0.95)],note:'72 impact requests per frame + cast/Q; real audio nodes, not a full combat/GPU benchmark'},null,2);resolve();}
            });
            output.textContent=JSON.stringify({running:true,reports,stressSeconds:180});
          }else{audio.reset();this.game.loop.sleep();output.textContent=JSON.stringify({passed:true,reports,status:audio.status},null,2);resolve();}
        }catch(e){reject(e);}}
      }
      game=new Phaser.Game({type:Phaser.AUTO,width:1280,height:720,audio:{noAudio:true},scene:[Checks],banner:false});
    });
  }catch(e){audio.reset();output.textContent=JSON.stringify({passed:false,error:String(e),status:audio.status},null,2);}
}
document.querySelector<HTMLButtonElement>('#check')!.onclick=()=>void run(false);
document.querySelector<HTMLButtonElement>('#stress')!.onclick=()=>void run(true);
window.addEventListener('pagehide',()=>{audio.destroy();game?.destroy(true);});
