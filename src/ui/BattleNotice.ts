import { SCHOOL_INFO, type School } from '../game/upgrades/definitions';
/** One replacing notice; CSS controls duration, no wall-clock timers or queue. */
export class BattleNotice {
  private alternate=false;
  private abort=new AbortController();
  constructor(private host:HTMLElement){
    host.addEventListener('animationend',event=>{if(event.target===host)this.clear();},{signal:this.abort.signal});
  }
  show(title:string,detail:string,school?:School):void{
    this.alternate=!this.alternate;
    this.host.replaceChildren();
    const heading=document.createElement('strong'),description=document.createElement('span');
    heading.textContent=title;description.textContent=detail;this.host.append(heading,description);
    this.host.dataset.tone=school??'clear';
    this.host.className=`battle-notice notice-${this.alternate?'a':'b'}`;this.host.hidden=false;
    this.host.setAttribute('aria-label',`${school?SCHOOL_INFO[school].name+' · ':''}${title}，${detail}`);
  }
  clear():void{this.host.hidden=true;this.host.className='battle-notice';}
  destroy():void{this.abort.abort();this.clear();}
}
