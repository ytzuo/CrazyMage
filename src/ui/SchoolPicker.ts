import { MODE_NAMES, isGameMode, readRecords, formatTime, type GameMode } from '../game/modes';
import type { SchoolArtwork, CharacterGender } from '../game/art/CharacterTextures';
import { SCHOOLS, SCHOOL_INFO, isSchool, type School } from '../game/upgrades/definitions';
import './launcher.css';
/** Choose mode, appearance and school before explicitly starting the run. */
export class SchoolPicker {
  private visible:boolean|null=null;
  private mode:GameMode='race';
  private gender:CharacterGender='male';
  private school:School='fire';
  private abort=new AbortController();
  constructor(private host:HTMLElement,choose:(school:School,mode:GameMode,gender:CharacterGender)=>void,private artwork:(gender:CharacterGender)=>SchoolArtwork|null) {
    this.restore();
    host.innerHTML=`<section class="launch-shell">
      <header class="launch-title"><span class="launch-crest" aria-hidden="true">✧</span><h1>失控法师</h1><div class="launch-title-rule" aria-hidden="true"><i></i>◇<i></i></div></header>
      <section class="launch-portrait" aria-label="玩家形象预览">
        <div class="launch-model" aria-hidden="true">
          <svg class="launch-sanctum" viewBox="0 0 640 600" fill="none">
            <g class="sanctum-stone"><path d="M66 536V264C66 110 173 38 320 12C467 38 574 110 574 264V536M93 521V268C93 139 188 68 320 41C452 68 547 139 547 268V521M30 530H128M512 530H610M42 541H119M521 541H598"/><path d="M66 290H93M66 372H93M66 454H93M547 290H574M547 372H574M547 454H574M97 154L119 171M159 79L176 101M543 154L521 171M481 79L464 101"/></g>
            <g class="sanctum-seal"><circle cx="320" cy="281" r="190"/><circle cx="320" cy="281" r="178" stroke-dasharray="2 15"/><circle cx="320" cy="281" r="151"/><path d="M320 91L485 376H155ZM320 471L155 186H485Z"/><path d="M320 65V87M320 475V497M104 281H126M514 281H536M167 128L183 144M457 418L473 434M167 434L183 418M457 144L473 128"/></g>
            <g class="sanctum-floor"><ellipse cx="320" cy="512" rx="238" ry="49"/><ellipse cx="320" cy="512" rx="210" ry="38"/><path d="M82 512L320 474L558 512L320 550ZM320 463V561M110 494L530 531M110 531L530 494"/></g>
          </svg>
          <span class="launch-model-mage"><img class="launch-body" alt="" width="192" height="288"><img class="launch-staff" alt="" width="96" height="168"></span>
          <span class="launch-spell-effect launch-firebolt"></span><span class="launch-spell-effect launch-icebolt"></span>
          <svg class="launch-spell-effect launch-bolt" viewBox="0 0 160 70" fill="none"><path d="M0 38L32 24L26 40L73 32L65 47L113 39L104 56L157 41M73 32L83 12L80 24L108 8"/></svg>
        </div>
        <div class="launch-model-label"><span id="launch-appearance"></span><strong id="launch-school-name"></strong><span id="launch-spell"></span></div>
      </section>
      <section class="launch-settings" aria-label="本局选择">
        <div class="launch-mode-options" role="group" aria-label="游戏模式"><button data-mode="race" aria-pressed="true"><span>竞速</span><small>20 波</small></button><button data-mode="endless" aria-pressed="false"><span>无尽</span><small aria-hidden="true">∞</small></button></div>
        <div class="launch-genders" role="group" aria-label="玩家形象"><button data-gender="male" aria-pressed="true">男法师</button><span aria-hidden="true">/</span><button data-gender="female" aria-pressed="false">女法师</button></div>
        <div class="launch-schools" role="group" aria-label="法术流派">${SCHOOLS.map(school=>{
          const symbol=school==='fire'
            ? '<path d="M33 5C37 20 18 24 22 38C13 33 14 25 15 21C3 35 10 54 30 55C51 56 58 32 43 20C45 31 38 34 36 30C33 24 43 17 33 5Z"/><path class="sigil-core" d="M31 34C33 41 25 42 27 49C37 52 42 43 36 38C37 44 33 43 31 34Z"/>'
            : school==='ice'
              ? '<path d="M32 5V59M9 18L55 46M9 46L55 18M24 10L32 18L40 10M24 54L32 46L40 54M10 28L20 25L18 14M46 50L44 39L54 36M10 36L20 39L18 50M46 14L44 25L54 28"/>'
              : '<path d="M38 4L13 35H29L23 60L52 24H35Z"/><path class="sigil-core" d="M38 4L25 31H35L23 60"/>';
          return `<button class="launch-school school-${school}" data-school="${school}" aria-pressed="false" aria-label="选择${SCHOOL_INFO[school].name}流派"><span class="launch-sigil" aria-hidden="true"><svg viewBox="0 0 64 64">${symbol}</svg></span><span>${SCHOOL_INFO[school].name}</span></button>`;
        }).join('')}</div>
        <p id="launch-record" class="launch-record"></p>
        <div class="launch-start"><p id="launch-summary" class="launch-sr-only" aria-live="polite"></p><button id="start-run" disabled><span aria-hidden="true">✦</span>开始试验<span aria-hidden="true">✦</span></button></div>
        <nav class="launch-guides" aria-label="图鉴"><a class="launch-guide" data-bestiary href="./bestiary.html"><span aria-hidden="true">◇</span>敌人图鉴</a><a class="launch-guide" data-upgrades href="./upgrades.html"><span aria-hidden="true">✧</span>强化图鉴</a></nav>
      </section>
    </section>`;
    document.addEventListener('visibilitychange',()=>host.classList.toggle('preview-sleep',document.hidden),{signal:this.abort.signal});
    host.classList.toggle('preview-sleep',document.hidden);
    window.addEventListener('blur',()=>host.classList.add('preview-sleep'),{signal:this.abort.signal});
    window.addEventListener('focus',()=>host.classList.toggle('preview-sleep',document.hidden),{signal:this.abort.signal});
    host.addEventListener('click',event=>{
      if(this.host.hidden)return;
      const gender=(event.target as Element).closest<HTMLButtonElement>('[data-gender]')?.dataset.gender;
      if(gender==='male'||gender==='female'){this.gender=gender;this.refreshSelection();return;}
      const mode=(event.target as Element).closest<HTMLButtonElement>('[data-mode]')?.dataset.mode;
      if(mode&&isGameMode(mode)){this.mode=mode;this.refreshSelection();return;}
      const value=(event.target as Element).closest<HTMLButtonElement>('button[data-school]')?.dataset.school;
      if(value&&isSchool(value)){this.school=value;this.refreshSelection();return;}
      if((event.target as Element).closest('#start-run')&&!this.host.querySelector<HTMLButtonElement>('#start-run')!.disabled)choose(this.school,this.mode,this.gender);
    },{signal:this.abort.signal});
    host.addEventListener('keydown',event=>{
      if(event.key!=='Tab')return;
      const buttons=[...host.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]')];
      const current=buttons.indexOf(document.activeElement as HTMLElement);
      event.preventDefault();buttons[(current+(event.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();
    },{signal:this.abort.signal});
  }
  update(visible:boolean):void {
    if(visible)this.refreshArtwork();
    if(this.visible===visible)return;
    this.visible=visible;this.host.hidden=!visible;
    this.host.closest('.arena')?.classList.toggle('launching',visible);
    if(visible)this.refreshSelection();
    if(visible)this.host.querySelector<HTMLButtonElement>(`[data-mode="${this.mode}"]`)?.focus({preventScroll:true});
  }
  private refreshArtwork():void {
    const art=this.artwork(this.gender);
    if(!art)return;
    this.host.querySelector<HTMLButtonElement>('#start-run')!.disabled=false;
    for(const [selector,url] of [['.launch-body',art[this.school].body],['.launch-staff',art[this.school].staff]]) {
      const image=this.host.querySelector<HTMLImageElement>(selector)!;if(image.src!==url)image.src=url;
    }
  }
  private refreshSelection():void {
    for(const button of this.host.querySelectorAll<HTMLButtonElement>('[data-gender]'))button.setAttribute('aria-pressed',String(button.dataset.gender===this.gender));
    for(const button of this.host.querySelectorAll<HTMLButtonElement>('[data-school]'))button.setAttribute('aria-pressed',String(button.dataset.school===this.school));
    this.host.dataset.launchSchool=this.school;
    this.host.querySelector('#launch-appearance')!.textContent=this.gender==='male'?'男法师':'女法师';
    this.host.querySelector('#launch-school-name')!.textContent=SCHOOL_INFO[this.school].name+'法师';
    this.host.querySelector('#launch-spell')!.textContent=SCHOOL_INFO[this.school].spell;
    this.host.querySelector('#launch-summary')!.textContent=`${MODE_NAMES[this.mode]} · ${this.gender==='male'?'男法师':'女法师'} · ${SCHOOL_INFO[this.school].name}`;
    this.refreshArtwork();this.refreshRecords();this.persist();
  }
  private restore():void {
    try {const saved=JSON.parse(sessionStorage.getItem('mage-launch-choices')??'null');
      if(saved&&isGameMode(saved.mode))this.mode=saved.mode;
      if(saved&&(saved.gender==='male'||saved.gender==='female'))this.gender=saved.gender;
      if(saved&&isSchool(saved.school))this.school=saved.school;
    }catch{/* Storage restrictions never block starting a run. */}
  }
  private persist():void {
    try{sessionStorage.setItem('mage-launch-choices',JSON.stringify({mode:this.mode,gender:this.gender,school:this.school}));}catch{/* Optional interface preferences only. */}
  }
  private refreshRecords():void {
    const records=readRecords();
    for(const button of this.host.querySelectorAll<HTMLButtonElement>('[data-mode]')) button.setAttribute('aria-pressed',String(button.dataset.mode===this.mode));
    this.host.setAttribute('aria-label',`启动页面，${MODE_NAMES[this.mode]}`);
    const record=records[this.school];
    this.host.querySelector<HTMLElement>('#launch-record')!.textContent=this.mode==='race'
      ? `最快通关 ${record?.fastestMs ? formatTime(record.fastestMs) : '—'}`
      : `最高完成 ${record?.mostWaves ?? 0} 波`;
  }
  destroy():void{this.abort.abort();}
}
