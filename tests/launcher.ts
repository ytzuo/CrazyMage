export {};
const frame=document.querySelector<HTMLIFrameElement>('#fixture')!,output=document.querySelector<HTMLPreElement>('#result')!;
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function load() {
  const began=performance.now();frame.src='/index.html';
  await new Promise(resolve=>frame.addEventListener('load',resolve,{once:true}));
  const doc=frame.contentDocument!,win=frame.contentWindow!;
  for(let i=0;i<250&&!doc.querySelector('#game')?.getAttribute('data-combat');i++)await delay(20);
  return {doc,win,readyMs:performance.now()-began};
}
const assert=(pass:unknown,text:string)=>{if(!pass)throw Error(text);};
document.querySelector<HTMLButtonElement>('#sample')!.onclick=async()=>{
  const rows:unknown[]=[];try {
    for(let trial=1;trial<=3;trial++)for(const mode of ['startup','movement','attack']) {
      const {doc,win,readyMs}=await load();
      doc.querySelector<HTMLButtonElement>('[data-mode="race"]')!.click();
      doc.querySelector<HTMLButtonElement>('[data-gender="male"]')?.click();
      doc.querySelector<HTMLButtonElement>('[data-school="fire"]')!.click();
      doc.querySelector<HTMLButtonElement>('#start-run')?.click();
      const key=mode==='movement'?'KeyD':mode==='attack'?'ArrowRight':null;
      if(key)win.dispatchEvent(new KeyboardEvent('keydown',{code:key,key}));
      const canvas=doc.querySelector('canvas')!;
      for(let i=0;i<300&&!canvas.dataset.performance;i++)await delay(20);
      if(key)win.dispatchEvent(new KeyboardEvent('keyup',{code:key,key}));
      doc.querySelector<HTMLButtonElement>('#pause')!.click();
      assert(canvas.dataset.performance,'No performance sample');
      rows.push({trial,mode,readyMs,...JSON.parse(canvas.dataset.performance!)});
      output.textContent=JSON.stringify({running:true,rows},null,2);
    }
    output.textContent=JSON.stringify({passed:true,rows,note:'Warm Vite dev, iframe 1280x720, DPR '+devicePixelRatio+'. Shared PRE_RENDER to POST_RENDER CPU sample, excludes update/GPU. Ready time includes iframe load and 20ms polling. Nine loads, 120 render frames per row; not cold startup or full battle.'},null,2);
  }catch(error){output.textContent=JSON.stringify({passed:false,error:String(error),rows},null,2);}
};
document.querySelector<HTMLButtonElement>('#check')!.onclick=async()=>{
  const reports:unknown[]=[];try {
    const {doc,win}=await load(),get=(id:string)=>doc.getElementById(id)!,click=(id:string)=>(get(id) as HTMLButtonElement).click();
    const state=()=>JSON.parse(get('game').dataset.combat!),loop=()=>doc.querySelector('canvas')!.dataset.loopRunning;
    assert(get('start-run'),'Launch page missing');
    assert(state().selectingSchool&&state().enemies===0&&state().elapsedTime===0&&loop()==='false','Launch advanced combat');
    assert(doc.querySelector<HTMLAnchorElement>('[data-bestiary]')!.getAttribute('href')==='./bestiary.html','Guide entry missing');
    const counts:number[]=[];
    for(const mode of ['race','endless'])for(const gender of ['male','female'])for(const school of ['fire','ice','lightning']) {
      doc.querySelector<HTMLButtonElement>(`[data-mode="${mode}"]`)!.click();
      doc.querySelector<HTMLButtonElement>(`[data-gender="${gender}"]`)!.click();
      doc.querySelector<HTMLButtonElement>(`[data-school="${school}"]`)!.click();
      assert(state().selectingSchool&&state().enemies===0&&loop()==='false','Selection started before confirmation');
      assert(doc.querySelector<HTMLButtonElement>(`[data-gender="${gender}"]`)!.getAttribute('aria-pressed')==='true','Wrong selected appearance');
      assert(get('launch-summary').textContent!.includes(school==='fire'?'火焰':school==='ice'?'冰霜':'闪电'),'Launch summary wrong');
      click('start-run');const run=state().runId;click('start-run');
      assert(state().school===school&&state().enemies===6&&state().runId===run&&!state().selectingSchool&&loop()==='true','Start not atomic');
      assert(get('wave-number').textContent!.includes(mode==='race'?'竞速':'无尽'),'Wrong mode applied');
      counts.push(state().objects);click('reset');
      assert(state().selectingSchool&&state().enemies===0&&state().elapsedTime===0&&loop()==='false','Restart did not clean battle');
    }
    assert(counts.every(n=>n===counts[0]),'Restart accumulates objects');reports.push({check:'12 mode / appearance / school combinations; selections wait for start; duplicate start guarded; restart clean',counts});
    win.dispatchEvent(new Event('blur'));click('start-run');
    assert(loop()==='false'&&!get('pause-overlay').hidden,'Start erased focus-loss pause');click('resume');
    for(let i=0;i<5;i++) {click('pause');const before=state().elapsedTime;await delay(120);assert(loop()==='false'&&state().elapsedTime===before,'Pause advanced time');click('resume');assert(loop()==='true','Resume failed');}
    win.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyD',key:'d'}));win.dispatchEvent(new Event('blur'));click('resume');
    const beforePosition=get('minimap-player').getAttribute('transform');
    await delay(150);assert(get('minimap-player').getAttribute('transform')===beforePosition,'Resume inherited old input');
    click('pause');click('back-launch');assert(!get('school-overlay').hidden&&loop()==='false','Pause menu did not return to launch');reports.push({check:'focus loss remains paused until explicit resume; 5 pauses; input reset; pause menu returns to launch',passed:true});
    const images=[...doc.querySelectorAll<HTMLImageElement>('.launch-body,.preview-body')].map(img=>img.src);
    const restored=await load();assert(restored.doc.querySelector('[data-mode="endless"][aria-pressed="true"]'),'Mode preference lost');
    assert(restored.doc.querySelector('[data-gender="female"][aria-pressed="true"]'),'Appearance preference lost');
    assert(restored.doc.querySelector('[data-school="lightning"][aria-pressed="true"]'),'School preference lost');
    assert([...restored.doc.querySelectorAll<HTMLImageElement>('.launch-body,.preview-body')].every((img,i)=>img.src===images[i]),'Artwork changed after reload');
    reports.push({check:'reload restores interface choices and cached artwork, still waits for start',passed:true});
    output.textContent=JSON.stringify({passed:true,reports},null,2);
  }catch(error){output.textContent=JSON.stringify({passed:false,error:String(error),reports},null,2);}
};
