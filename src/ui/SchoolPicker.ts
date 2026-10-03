import { MODE_NAMES, isGameMode, readRecords, formatTime, type GameMode } from '../game/modes';
import type { SchoolArtwork, CharacterGender } from '../game/art/CharacterTextures';
import { SCHOOLS, SCHOOL_INFO, isSchool, type School } from '../game/upgrades/definitions';
import './launcher.css';
/** Choose mode, appearance and school before explicitly starting the run. */
export class SchoolPicker {
  private visible:boolean|null=null;
  private artworkReady=false;
  private mode:GameMode='race';
  private gender:CharacterGender='male';
  private school:School='fire';
  private abort=new AbortController();
  constructor(private host:HTMLElement,choose:(school:School,mode:GameMode,gender:CharacterGender)=>void,private artwork:(gender:CharacterGender)=>SchoolArtwork|null) {
    this.restore();
    host.innerHTML=`<section class="launch-shell">
      <header class="launch-header"><a class="launch-brand" href="./index.html"><span aria-hidden="true">✧</span>失控法师</a><span>魔法试验场</span></header>
      <div class="launch-layout">
        <section class="launch-portrait" aria-label="玩家形象预览"><small>THE ARCANE TRIAL</small><h1>踏入试验场</h1><p>选择你的法师，迎接下一场试炼。</p>
          <div class="launch-model" aria-hidden="true"><i class="launch-ring"></i><i class="launch-ring ring-two"></i><span class="launch-model-mage"><img class="launch-body" alt="" width="192" height="288"><img class="launch-staff" alt="" width="96" height="168"></span></div>
          <div class="launch-model-label"><span id="launch-appearance"></span><strong id="launch-school-name"></strong></div>
          <a class="launch-guide" data-bestiary href="./bestiary.html"><span aria-hidden="true">◇</span><span><strong>敌人图鉴</strong><small>18 种形态 · 动作、攻击与机制</small></span><b aria-hidden="true">↗</b></a>
        </section>
        <section class="launch-settings" aria-label="本局选择">
          <div class="launch-section-title"><span>01</span><h2>游戏模式</h2></div>
          <div class="mode-options" aria-label="游戏模式"><button data-mode="race" aria-pressed="true"><strong>竞速模式<span>20 WAVES</span></strong><small>挑战 20 波，刷新最快通关记录</small></button><button data-mode="endless" aria-pressed="false"><strong>无尽模式<span>ENDLESS</span></strong><small>持续成长，挑战更高完成波数</small></button></div>
          <div class="launch-gender-row"><div class="launch-section-title"><span>02</span><h2>玩家形象</h2></div><div class="launch-genders" aria-label="玩家形象"><button data-gender="male" aria-pressed="true">男法师</button><button data-gender="female" aria-pressed="false">女法师</button></div></div>
          <div class="launch-section-title"><span>03</span><h2>法术流派</h2></div>
          <div class="upgrade-options launch-schools">${SCHOOLS.map(school=>{
      const info=SCHOOL_INFO[school];
      const effect=school==='fire'
        ? '<span class="preview-fireball"></span><span class="preview-impact"></span>'
        : school==='ice' ? '<span class="preview-ice-lance"></span>'
        : '<svg class="preview-lightning" viewBox="0 0 240 160" aria-hidden="true"><polyline class="preview-electric-glow" points="78,92 108,76 99,94 138,90 152,81 160,100 191,108 180,121 208,133"/><polyline points="78,92 108,76 99,94 138,90 152,81 160,100 191,108 180,121 208,133"/><polyline class="preview-electric-core" points="78,92 108,76 99,94 138,90 152,81 160,100 191,108 180,121 208,133"/><path class="preview-electric-branch" d="M108 76L115 63L106 66 M160 100L172 88L165 87 M180 121L168 135L176 131"/></svg>';
      return `<button class="upgrade-option school-${school} school-choice" style="--card-index:${SCHOOLS.indexOf(school)}" data-school="${school}" aria-pressed="false" aria-label="选择${info.name}流派"><div class="school-preview" aria-hidden="true"><span class="preview-ground"></span><span class="preview-mage"><img class="preview-body" alt="" width="72" height="108"><img class="preview-staff" alt="" width="36" height="63"></span><span class="preview-target target-a"></span><span class="preview-target target-b"></span><span class="preview-target target-c"></span>${effect}</div><h3>${info.name}</h3><p>${info.description}</p><span class="school-record" data-record="${school}"></span><span class="school-pick">${info.spell} Lv.1</span></button>`;
    }).join('')}</div>
          <footer class="launch-start"><div><small>本局选择</small><p id="launch-summary"></p></div><button id="start-run" disabled>开始试验<span aria-hidden="true">→</span></button></footer>
        </section>
      </div>
    </section>`;
    document.addEventListener('visibilitychange',()=>host.classList.toggle('preview-sleep',document.hidden),{signal:this.abort.signal});
    host.classList.toggle('preview-sleep',document.hidden);
    window.addEventListener('blur',()=>host.classList.add('preview-sleep'),{signal:this.abort.signal});
    window.addEventListener('focus',()=>host.classList.toggle('preview-sleep',document.hidden),{signal:this.abort.signal});
    host.addEventListener('click',event=>{
      if(this.host.hidden)return;
      const gender=(event.target as Element).closest<HTMLButtonElement>('[data-gender]')?.dataset.gender;
      if(gender==='male'||gender==='female'){this.gender=gender;this.artworkReady=false;this.refreshSelection();return;}
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
    if(!this.artworkReady) {
      const art=this.artwork(this.gender);
      if(art) {
        for(const school of SCHOOLS) {
          const card=this.host.querySelector<HTMLElement>(`[data-school="${school}"]`)!;
          card.querySelector<HTMLImageElement>('.preview-body')!.src=art[school].body;
          card.querySelector<HTMLImageElement>('.preview-staff')!.src=art[school].staff;
        }
        this.artworkReady=true;
        this.host.querySelector<HTMLButtonElement>('#start-run')!.disabled=false;
      }
    }
    const art=this.artwork(this.gender);
    if(art)for(const [selector,url] of [['.launch-body',art[this.school].body],['.launch-staff',art[this.school].staff]]) {
      const image=this.host.querySelector<HTMLImageElement>(selector)!;if(image.src!==url)image.src=url;
    }
  }
  private refreshSelection():void {
    for(const button of this.host.querySelectorAll<HTMLButtonElement>('[data-gender]'))button.setAttribute('aria-pressed',String(button.dataset.gender===this.gender));
    for(const button of this.host.querySelectorAll<HTMLButtonElement>('[data-school]'))button.setAttribute('aria-pressed',String(button.dataset.school===this.school));
    this.host.dataset.launchSchool=this.school;
    this.host.querySelector('#launch-appearance')!.textContent=this.gender==='male'?'男法师':'女法师';
    this.host.querySelector('#launch-school-name')!.textContent=SCHOOL_INFO[this.school].name+'流派';
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
    for(const school of SCHOOLS) {
      const record=records[school];
      this.host.querySelector<HTMLElement>(`[data-record="${school}"]`)!.textContent=this.mode==='race'
        ? `最快通关 ${record?.fastestMs ? formatTime(record.fastestMs) : '—'}`
        : `最高完成 ${record?.mostWaves ?? 0} 波`;
    }
  }
  destroy():void{this.abort.abort();}
}
