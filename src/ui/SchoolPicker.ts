import { SCHOOLS, SCHOOL_INFO, isSchool, type School } from '../game/upgrades/definitions';
/** One choice per run; scene validates stale/double clicks before starting combat. */
export class SchoolPicker {
  private visible:boolean|null=null;
  private abort=new AbortController();
  constructor(private host:HTMLElement,choose:(school:School)=>void) {
    host.innerHTML=`<section class="build-card school-card"><header><h2>选择流派</h2></header><div class="upgrade-options">${SCHOOLS.map(school=>{
      const info=SCHOOL_INFO[school];
      return `<button class="upgrade-option school-${school}" data-school="${school}" aria-label="选择${info.name}流派"><b class="school-symbol" aria-hidden="true">${info.symbol}</b><h3>${info.name}</h3><p>${info.description}</p><span>${info.spell} Lv.1 →</span></button>`;
    }).join('')}</div></section>`;
    host.addEventListener('click',event=>{
      const value=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-school]')?.dataset.school;
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
    if(this.visible===visible)return;
    this.visible=visible;this.host.hidden=!visible;
    if(visible)this.host.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});
  }
  destroy():void{this.abort.abort();}
}
