import Phaser from 'phaser';
import { CATALOG, previewBuild, category } from './catalog';
import type { PreviewScene } from './PreviewScene';
const stats=(v:number[])=>{const sorted=[...v].sort((a,b)=>a-b);return {mean:v.reduce((a,b)=>a+b,0)/v.length,p95:sorted[Math.floor(sorted.length*.95)],over25:v.filter(n=>n>25).length};};
/** Only imported in development. Checks actual combat execution, reset and timing. */
export function installVerification(scene:PreviewScene,host:HTMLElement,restore:()=>void):void {
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='开发验证';
  const result=document.createElement('pre');result.id='verification-result';
  const check=document.createElement('button'),sample=document.createElement('button'),stress=document.createElement('button'),lifecycle=document.createElement('button');
  check.id='verify-upgrades';check.textContent='检查全部强化';sample.id='sample-upgrades';sample.textContent='三轮采样';stress.id='stress-upgrades';stress.textContent='三分钟巡检';
  lifecycle.id='lifecycle-upgrades';lifecycle.textContent='检查暂停与失焦';
  details.append(summary,check,sample,stress,lifecycle,result);host.append(details);
  let running=false;
  const write=(data:unknown)=>result.textContent=JSON.stringify(data,null,2);
  const begin=()=>{if(running||!scene.booted)return false;running=true;check.disabled=sample.disabled=stress.disabled=lifecycle.disabled=true;scene.validating=true;return true;};
  const end=(data:unknown)=>{running=false;scene.validating=false;check.disabled=sample.disabled=stress.disabled=lifecycle.disabled=false;write(data);scene.pause();restore();};
  const bounded=()=>{const d=scene.diagnostics();return d.actors<=8&&d.projectiles<=64&&d.ultimate<=41&&d.fields<=18;};
  const warm=()=>{for(const card of CATALOG){scene.configure({card,layers:1,upgraded:true});scene.advance(50);}scene.clearForCheck();};
  lifecycle.onclick=async()=>{
    if(!begin())return;
    const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
    const assert=(pass:boolean,message:string)=>{if(!pass)throw Error(message);};
    try {
      for(let i=0;i<5;i++){
        scene.resume();await delay(60);assert(scene.diagnostics().loop,'Resume did not wake loop');
        scene.pause();const elapsed=scene.diagnostics().elapsed;await delay(60);
        assert(!scene.diagnostics().loop&&scene.diagnostics().elapsed===elapsed,'Pause advanced animation');
      }
      scene.resume();window.dispatchEvent(new Event('blur'));const elapsed=scene.diagnostics().elapsed;
      await delay(150);assert(scene.paused&&!scene.diagnostics().loop&&scene.diagnostics().elapsed===elapsed,'Blur did not sleep loop');
      scene.resume();window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));
      assert(scene.paused&&!scene.diagnostics().loop,'Cached page remained active');
      end({passed:true,pauseCycles:5,blur:true,cachedPageHide:true});
    }catch(error){end({passed:false,error:String(error)});}
  };
  check.onclick=()=>{
    if(!begin())return;scene.pause();const reports:unknown[]=[];
    try {
      warm();const baseline=scene.diagnostics();
      for(const card of CATALOG)for(const upgraded of [false,true]) {
        scene.configure({card,layers:card.maxStacks,upgraded});const spec=previewBuild(card,upgraded?card.maxStacks:0);
        for(let i=0;i<240;i++){scene.advance(50);if(!bounded())throw Error('Object budget exceeded');}
        const after=scene.diagnostics();
        if(category(card)!=='passive'&&after.casts===0)throw Error('No actual cast: '+card.id);
        if(card.id==='passive.shield'&&upgraded&&after.shield!==spec.player.shield)throw Error('Shield recovery failed');
        reports.push({id:card.id,upgraded,casts:after.casts,damage:after.damage});
        scene.clearForCheck();const cleared=scene.diagnostics();
        if(cleared.roots!==baseline.roots||cleared.textures!==baseline.textures||cleared.projectiles||cleared.ultimate||cleared.fields||cleared.actors)throw Error('Replay leaked: '+card.id);
      }
      for(let i=0;i<10;i++){scene.configure({card:CATALOG.find(c=>c.id==='ultimate.ice.mastery')!,layers:3,upgraded:true});scene.advance(750);scene.advance(50);scene.clearForCheck();if(scene.diagnostics().roots!==baseline.roots)throw Error('Ice replay leaked');}
      end({passed:true,cards:CATALOG.length,cases:reports.length,baselineRoots:baseline.roots,textures:baseline.textures,reports});
    }catch(error){end({passed:false,error:String(error),reports});}
  };
  sample.onclick=()=>{
    if(!begin())return;warm();scene.speed=1;scene.resume();
    const ids=['fire.multi','skill.ice.reach','ultimate.fire.mastery'];let trial=0,frames=0,start=0,last=0,cpu:number[]=[],intervals:number[]=[];const rows:unknown[]=[];
    const setup=()=>{scene.configure({card:CATALOG.find(c=>c.id===ids[trial%3])!,layers:3,upgraded:true});frames=0;last=0;cpu=[];intervals=[];};
    const before=()=>start=performance.now();
    const after=()=>{
      const now=performance.now();cpu.push(now-start);if(last)intervals.push(now-last);last=now;
      if(++frames<120)return;
      rows.push({trial:Math.floor(trial/3)+1,id:ids[trial%3],cpu:stats(cpu),frame:stats(intervals)});
      if(++trial<9)setup();else{scene.events.off(Phaser.Scenes.Events.PRE_UPDATE,before);scene.game.events.off(Phaser.Core.Events.POST_RENDER,after);
        end({passed:true,viewport:[scene.scale.width,scene.scale.height],dpr:devicePixelRatio,userAgent:navigator.userAgent,rows,note:'Warm Vite dev, eight targets, 120 frames each; PRE_UPDATE to POST_RENDER CPU excludes GPU. New page has no comparable pre-change baseline.'});}
    };
    setup();scene.events.on(Phaser.Scenes.Events.PRE_UPDATE,before);scene.game.events.on(Phaser.Core.Events.POST_RENDER,after);
  };
  stress.onclick=()=>{
    if(!begin())return;warm();const baseline=scene.diagnostics();scene.speed=1;scene.resume();
    let total=0,part=0,index=0,frames=0,maxRoots=0,maxProjectiles=0,maxUltimate=0;
    const setup=()=>{const card=CATALOG[index%CATALOG.length];scene.configure({card,layers:card.maxStacks,upgraded:true});};
    const record=(_time:number,delta:number)=>{
      total+=Math.min(delta,50);part+=Math.min(delta,50);frames++;const d=scene.diagnostics();
      maxRoots=Math.max(maxRoots,d.roots);maxProjectiles=Math.max(maxProjectiles,d.projectiles);maxUltimate=Math.max(maxUltimate,d.ultimate);
      if(!bounded()){scene.events.off(Phaser.Scenes.Events.UPDATE,record);end({passed:false,error:'Object budget exceeded',d});return;}
      if(part>=4500){index++;part=0;setup();}
      if(frames%120===0)write({running:true,seconds:Math.floor(total/1000),cases:index+1,maxRoots,maxProjectiles,maxUltimate});
      if(total>=180000){scene.events.off(Phaser.Scenes.Events.UPDATE,record);scene.clearForCheck();const after=scene.diagnostics();
        end({passed:after.roots===baseline.roots&&after.textures===baseline.textures&&after.actors===0,seconds:total/1000,frames,cases:index+1,maxRoots,maxProjectiles,maxUltimate,afterReset:after,scope:'Three active minutes, one scene and up to eight real targets; no GPU or memory profile.'});}
    };
    setup();scene.events.on(Phaser.Scenes.Events.UPDATE,record);
  };
}
