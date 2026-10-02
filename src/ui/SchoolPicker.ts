import type { SchoolArtwork } from '../game/art/CharacterTextures';
import { SCHOOLS, SCHOOL_INFO, isSchool, type School } from '../game/upgrades/definitions';
/** One choice per run; illustrative previews never start or update the combat scene. */
export class SchoolPicker {
  private visible:boolean|null=null;
  private artworkReady=false;
  private abort=new AbortController();
  constructor(private host:HTMLElement,choose:(school:School)=>void,private artwork:()=>SchoolArtwork|null) {
    host.innerHTML=`<section class="build-card school-card"><header><div><small>本局起始法术</small><h2>选择流派</h2></div></header><div class="upgrade-options">${SCHOOLS.map(school=>{
      const info=SCHOOL_INFO[school];
      const effect=school==='fire'
        ? '<span class="preview-fireball"></span><span class="preview-impact"></span>'
        : school==='ice' ? '<span class="preview-ice-ring"></span>'
        : '<svg class="preview-lightning" viewBox="0 0 240 160" aria-hidden="true"><polyline class="preview-electric-glow" points="78,92 108,76 99,94 138,90 152,81 160,100 191,108 180,121 208,133"/><polyline points="78,92 108,76 99,94 138,90 152,81 160,100 191,108 180,121 208,133"/><polyline class="preview-electric-core" points="78,92 108,76 99,94 138,90 152,81 160,100 191,108 180,121 208,133"/><path class="preview-electric-branch" d="M108 76L115 63L106 66 M160 100L172 88L165 87 M180 121L168 135L176 131"/></svg>';
      return `<button class="upgrade-option school-${school} school-choice" style="--card-index:${SCHOOLS.indexOf(school)}" data-school="${school}" aria-label="选择${info.name}流派"><div class="school-preview" aria-hidden="true"><span class="preview-ground"></span><span class="preview-mage"><img class="preview-body" alt="" width="72" height="108"><img class="preview-staff" alt="" width="36" height="63"></span><span class="preview-target target-a"></span><span class="preview-target target-b"></span><span class="preview-target target-c"></span>${effect}</div><h3>${info.name}</h3><p>${info.description}</p><span class="school-pick">${info.spell} Lv.1 →</span></button>`;
    }).join('')}</div></section>`;
    document.addEventListener('visibilitychange',()=>host.classList.toggle('preview-sleep',document.hidden),{signal:this.abort.signal});
    host.classList.toggle('preview-sleep',document.hidden);
    host.addEventListener('click',event=>{
      const value=(event.target as Element).closest<HTMLButtonElement>('[data-school]')?.dataset.school;
      if(value&&isSchool(value))choose(value);
    },{signal:this.abort.signal});
    host.addEventListener('keydown',event=>{
      if(event.key!=='Tab')return;
      const buttons=[...host.querySelectorAll<HTMLButtonElement>('button')];
      const current=buttons.indexOf(document.activeElement as HTMLButtonElement);
      event.preventDefault();buttons[(current+(event.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();
    },{signal:this.abort.signal});
  }
  update(visible:boolean):void {
    if(visible&&!this.artworkReady) {
      const art=this.artwork();
      if(art) {
        for(const school of SCHOOLS) {
          const card=this.host.querySelector<HTMLElement>(`[data-school="${school}"]`)!;
          card.querySelector<HTMLImageElement>('.preview-body')!.src=art[school].body;
          card.querySelector<HTMLImageElement>('.preview-staff')!.src=art[school].staff;
        }
        this.artworkReady=true;
      }
    }
    if(this.visible===visible)return;
    this.visible=visible;this.host.hidden=!visible;
    if(visible)this.host.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});
  }
  destroy():void{this.abort.abort();}
}
