export {};
const frame = document.querySelector<HTMLIFrameElement>('#game-frame')!;
const result = document.querySelector<HTMLPreElement>('#result')!;
const run = document.querySelector<HTMLButtonElement>('#run')!;
const size = document.querySelector<HTMLSelectElement>('#size')!;
size.onchange = () => {
  const [width, height] = size.value.split('x');
  frame.style.width = `${width}px`;
  frame.style.height = `${height}px`;
};
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve,ms));
run.onclick = async () => {
  run.disabled=true;
  const reports: unknown[]=[];
  const check=(condition:boolean,message:string)=>{if(!condition)throw new Error(message);};
  try {
    frame.src='/'; await new Promise(resolve=>frame.addEventListener('load',resolve,{once:true})); await delay(500);
    const doc=frame.contentDocument!, win=frame.contentWindow!;
    const get=(id:string)=>doc.getElementById(id)!;
    const click=(id:string)=>(get(id) as HTMLButtonElement).click();
    const combat=()=>JSON.parse(get('game').dataset.combat!);
    const loop=()=>doc.querySelector('canvas')!.dataset.loopRunning;
    click('build');check(loop()==='false','build did not sleep loop');
    const before=combat().elapsedTime;await delay(300);check(combat().elapsedTime===before,'build advanced time');
    doc.querySelector<HTMLButtonElement>('[data-close]')!.click();check(loop()==='true','build close did not resume');
    click('pause');click('build');doc.querySelector<HTMLButtonElement>('[data-close]')!.click();check(loop()==='false','closing build lost existing pause');click('resume');
    click('build');win.dispatchEvent(new Event('blur'));doc.querySelector<HTMLButtonElement>('[data-close]')!.click();check(loop()==='false','closing build resumed after blur');click('resume');
    reports.push({check:'build viewing, existing pause and focus loss',passed:true});
    const pressed=new Set<string>();
    const input=(keys:string[])=>{
      for(const key of pressed)if(!keys.includes(key)){win.dispatchEvent(new KeyboardEvent('keyup',{code:key,key}));pressed.delete(key);}
      for(const key of keys)if(!pressed.has(key)){win.dispatchEvent(new KeyboardEvent('keydown',{code:key,key}));pressed.add(key);}
    };
    let choices=0;
    const start=performance.now();
    while(choices<1&&performance.now()-start<45000) {
      const state=combat();check(!state.dead,'died before upgrade smoke completed');
      const option=get('build-overlay').hidden ? null : doc.querySelector<HTMLButtonElement>('[data-upgrade]');
      if(option) {
        input([]);const frozen=combat().elapsedTime;check(loop()==='false','choice did not sleep loop');await delay(200);check(combat().elapsedTime===frozen,'choice advanced time');
        check(combat().nextWaveIn===3000,'arena clear did not reset countdown before choice');
        const oldRevision=combat().revision;
        doc.querySelector<HTMLButtonElement>('[data-inspect]')!.click();check(!!doc.querySelector('[data-close]'),'choice build details unavailable');doc.querySelector<HTMLButtonElement>('[data-close]')!.click();
        const choose=doc.querySelector<HTMLButtonElement>('[data-upgrade="fire.multi"]')??doc.querySelector<HTMLButtonElement>('[data-upgrade]')!;
        choose.click();choose.click(); await delay(50);
        check(combat().revision===oldRevision+1,'choice applied more than once');
        check(get('wave-countdown').textContent==='3s','choice did not preserve three-second clear countdown');
        check(combat().elapsedTime<frozen+500,'rescheduling changed run duration');
        choices++;continue;
      }
      const parse=(value:string|null)=>value!.match(/[-\d.]+/g)!.map(Number);
      const [px,py]=parse(get('minimap-player').getAttribute('transform'));
      const currentMarkers = new Map([...doc.querySelectorAll('.minimap-enemy-dot')].map(marker => [marker, parse(marker.getAttribute('transform'))]));
      const points=[...currentMarkers.values()].sort((a,b)=>(a[0]-px)**2+(a[1]-py)**2-((b[0]-px)**2+(b[1]-py)**2));
      const moveTarget = points[0];
      if(moveTarget) {
        const dx=moveTarget[0]-px,dy=moveTarget[1]-py,d=Math.hypot(dx,dy);
        const keys:string[]=[];
        const aimX=(points[0]?.[0]??moveTarget[0])-px,aimY=(points[0]?.[1]??moveTarget[1])-py;
        if(Math.abs(aimX)>Math.abs(aimY)*0.4)keys.push(aimX>0?'ArrowRight':'ArrowLeft');
        if(Math.abs(aimY)>Math.abs(aimX)*0.4)keys.push(aimY>0?'ArrowDown':'ArrowUp');
        if(d>70){if(Math.abs(dx)>Math.abs(dy)*0.4)keys.push(dx>0?'KeyD':'KeyA');if(Math.abs(dy)>Math.abs(dx)*0.4)keys.push(dy>0?'KeyS':'KeyW');}
        input(keys);
      } else input([]);
      await delay(100);
      result.textContent=JSON.stringify({running:true,choices,state:combat(),reports},null,2);
    }
    input([]);check(choices===1,'did not acquire one upgrade by clearing a wave');
    check(combat().kills>=6,'partial wave rewarded early');
    click('build');const details=get('build-overlay').textContent!;check(details.includes('获取记录'),'history missing');
    const selected=[...doc.querySelectorAll('.build-details ol li')].length-1;check(selected===1,'history does not match choices');
    reports.push({check:'real full wave clear → one choice → shared build history',choices,state:combat(),details});
    if (new URLSearchParams(location.search).has('preview')) {
      result.textContent=JSON.stringify({passed:true,preview:true,reports},null,2);
      return; // Keep the real upgraded game paused for visual inspection.
    }
    doc.querySelector<HTMLButtonElement>('[data-close]')!.click();
    const waveBefore = combat().wave;
    await delay(3200);
    check(combat().wave===waveBefore+1&&combat().enemies===6,'next wave did not spawn three seconds after choosing');
    reports.push({check:'arena clear resets countdown before choice and spawns next wave after three seconds',wave:combat().wave});
    for(let i=0;i<5;i++){click('pause');check(loop()==='false','pause failed');click('resume');check(loop()==='true','resume failed');}
    const counts: number[]=[];
    for(let i=0;i<10;i++){click('reset');counts.push(combat().objects);check(combat().revision===0&&combat().completedWaves===0&&combat().waveRemaining===6,'restart retained progression');}
    check(counts.every(n=>n===counts[0]),'restart object count accumulates');
    click('pause');reports.push({check:'five pause cycles and ten complete restarts',counts});
    result.textContent=JSON.stringify({passed:true,reports},null,2);
  } catch(error) { result.textContent=JSON.stringify({passed:false,error:String(error),reports},null,2); }
  finally{run.disabled=false;}
};
