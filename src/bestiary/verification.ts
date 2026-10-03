import Phaser from 'phaser';
import { CATALOG, demoModes, type DemoMode } from './catalog';
import { enemySpec } from '../game/enemies/roster';
import type { PreviewScene } from './PreviewScene';
const modes:DemoMode[]=['movement','attack','mechanic'];
const stats=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);return {mean:values.reduce((a,b)=>a+b,0)/values.length,p95:sorted[Math.floor(sorted.length*.95)],over25:values.filter(x=>x>25).length};};
/** Dynamically imported in development only; no diagnostic UI ships in the book. */
export function installVerification(scene:PreviewScene,host:HTMLElement,restore:()=>void):void {
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='开发验证';
  const result=document.createElement('pre');result.id='verification-result';
  const checkButton=document.createElement('button');checkButton.id='verify-book';checkButton.textContent='检查全部形态';
  const sampleButton=document.createElement('button');sampleButton.id='sample-book';sampleButton.textContent='三轮动作采样';
  const stressButton=document.createElement('button');stressButton.id='stress-book';stressButton.textContent='三分钟巡检';
  details.append(summary,checkButton,sampleButton,stressButton,result);host.append(details);
  let running=false;
  const write=(data:unknown)=>result.textContent=JSON.stringify(data,null,2);
  const begin=()=>{if(running||!scene.booted)return false;running=true;checkButton.disabled=sampleButton.disabled=stressButton.disabled=true;return true;};
  const end=(data:unknown)=>{running=false;scene.validating=false;write(data);checkButton.disabled=sampleButton.disabled=stressButton.disabled=false;scene.pause();restore();};
  const bounded=()=>{const d=scene.diagnostics();return d.actors<=4&&d.shots<=32&&d.guardianZones<=24&&d.lines<=12&&d.orbs<=18&&d.ghosts<=6;};
  checkButton.onclick=()=>{
    if(!begin())return;scene.pause();scene.validating=true;scene.clearForCheck();const baseline=scene.diagnostics(),reports:string[]=[];
    try {
      for(const entry of CATALOG)for(const form of entry.forms)for(const demo of demoModes(entry,form)) {
        for(const move of demo==='movement'?['']:(entry.moves?.map(m=>m.id)??[''])) {
          scene.configure({entry,form,demo,move,wave:entry.firstWave,growth:'race'});
          const spec=enemySpec(entry.kind,entry.firstWave);if(!Number.isFinite(spec.health)||spec.health<=0)throw Error('Invalid stats');
          for(let i=0;i<240;i++){
            scene.advance(50);if(!bounded())throw Error('Object budget exceeded');
            const d=scene.diagnostics();if(demo!=='movement'&&entry.moves&&d.bossStarted&&d.bossMove!==move)throw Error('Selected boss move changed');
          }
          reports.push(form.name+'/'+demo+(move?'/'+move:''));
          scene.clearForCheck();const after=scene.diagnostics();
          if(after.roots!==baseline.roots||after.rigs!==0||after.shots!==0||after.lines!==0||after.orbs!==0||after.textures!==baseline.textures)throw Error('Replay leaked resources / textures');
        }
      }
      for(let i=0;i<10;i++){
        scene.configure({entry:CATALOG[8],form:CATALOG[8].forms[1],demo:'attack',move:'orbs',wave:20,growth:'race'});
        scene.advance(50);scene.freeze();scene.clearForCheck();
        if(scene.diagnostics().roots!==baseline.roots)throw Error('Frozen reset leaked');
      }
      const runMechanic=(entryIndex:number,formIndex:number,ms:number)=>{
        const entry=CATALOG[entryIndex];scene.configure({entry,form:entry.forms[formIndex],demo:'mechanic',move:'',wave:entry.firstWave,growth:'race'});
        for(let t=0;t<ms;t+=50)scene.advance(50);return scene.diagnostics();
      };
      let state=runMechanic(0,1,1800);if(state.actors!==2||state.phase?.health!==0)throw Error('Splitter demonstration failed');
      state=runMechanic(3,1,1250);if(state.phase?.health!==enemySpec('brute',4).health)throw Error('First shield block demonstration failed');
      for(let t=0;t<600;t+=50)scene.advance(50);
      if(scene.diagnostics().phase!.health>=enemySpec('brute',4).health)throw Error('Second shield hit demonstration failed');
      state=runMechanic(5,0,1500);if(state.actors!==1||state.phase?.health!==0)throw Error('Friendly bomb demonstration failed');
      state=runMechanic(6,0,1800);if(state.protection.shields!==2||state.allies[0].health>=state.allies[0].maximum)throw Error('Priest shield demonstration failed');
      state=runMechanic(6,1,3000);if(state.protection.wards!==1||state.allies[0].x!==1330)throw Error('Ward exit demonstration failed');
      scene.freeze();if(scene.diagnostics().protection.wards!==0)throw Error('Ward freeze demonstration failed');
      scene.clearForCheck();if(scene.diagnostics().roots!==baseline.roots)throw Error('Mechanism checks leaked');
      end({passed:true,forms:CATALOG.reduce((n,e)=>n+e.forms.length,0),scenarios:reports.length,baselineRoots:baseline.roots,textures:baseline.textures,reports});
    }catch(error){end({passed:false,error:String(error),reports});}
  };
  sampleButton.onclick=()=>{
    if(!begin())return;const original={...scene.selection};scene.validating=true;scene.resume();
    let trial=0,frames=0,start=0,last=0,cpu:number[]=[],intervals:number[]=[],rows:unknown[]=[];
    const setup=()=>{scene.configure({...original,demo:modes[trial%3]});frames=0;last=0;cpu=[];intervals=[];};
    const before=()=>start=performance.now();
    const after=()=>{
      const now=performance.now();cpu.push(now-start);if(last)intervals.push(now-last);last=now;
      if(++frames<120)return;rows.push({trial:Math.floor(trial/3)+1,mode:modes[trial%3],cpu:stats(cpu),frame:stats(intervals)});
      if(++trial<9)setup();else{scene.events.off(Phaser.Scenes.Events.PRE_UPDATE,before);scene.game.events.off(Phaser.Core.Events.POST_RENDER,after);
        end({passed:true,viewport:[scene.scale.width,scene.scale.height],dpr:devicePixelRatio,userAgent:navigator.userAgent,rows,note:'Warm Vite dev book, one real actor, 120 rendered frames per trial. CPU PRE_UPDATE to POST_RENDER excludes GPU. New standalone page; no comparable before-page baseline. First-cast warning may extend beyond the short sample.'});}
    };
    setup();scene.events.on(Phaser.Scenes.Events.PRE_UPDATE,before);scene.game.events.on(Phaser.Core.Events.POST_RENDER,after);
  };
  stressButton.onclick=()=>{
    if(!begin())return;scene.validating=true;scene.speed=1;scene.resume();
    const cases=CATALOG.flatMap(entry=>entry.forms.map(form=>({entry,form})));
    let index=0,total=0,part=0,frames=0,last=0,maxActors=0,maxRoots=0,maxShots=0,maxLines=0,maxOrbs=0;const intervals:number[]=[];
    const setup=()=>{const c=cases[index%cases.length],demo=modes[(index+Math.floor(index/cases.length))%3];
      scene.configure({...c,demo,move:c.entry.kind==='weaver'?'orbs':c.entry.kind==='boss'?'charge':'',wave:c.entry.firstWave,growth:'race'});};
    const record=(_time:number,delta:number)=>{
      const step=Math.min(delta,50);total+=step;part+=step;frames++;const d=scene.diagnostics();
      maxActors=Math.max(maxActors,d.actors);maxRoots=Math.max(maxRoots,d.roots);maxShots=Math.max(maxShots,d.shots);maxLines=Math.max(maxLines,d.lines);maxOrbs=Math.max(maxOrbs,d.orbs);
      const now=performance.now();if(last)intervals.push(now-last);last=now;
      if(!bounded()){scene.events.off(Phaser.Scenes.Events.UPDATE,record);end({passed:false,error:'Object budget exceeded',d});return;}
      if(part>=6000){part=0;index++;setup();}
      if(frames%120===0)write({running:true,seconds:Math.floor(total/1000),encounters:index+1,maxActors,maxRoots,maxShots,maxLines,maxOrbs});
      if(total>=180000){scene.events.off(Phaser.Scenes.Events.UPDATE,record);scene.clearForCheck();const final=scene.diagnostics();
        end({passed:final.actors===0&&final.rigs===0&&final.roots===3,seconds:total/1000,frames,encounters:index+1,maxActors,maxRoots,maxShots,maxLines,maxOrbs,afterReset:final,frame:stats(intervals),
          scope:'Real-time book animation across 18 forms and three demonstration modes. One encounter at a time; switches every six active seconds. One scene, cached artwork, no GPU or device memory profile.'});}
    };
    setup();scene.events.on(Phaser.Scenes.Events.UPDATE,record);
  };
}
