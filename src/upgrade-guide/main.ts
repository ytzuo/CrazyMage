import './style.css';
import Phaser from 'phaser';
import { CATALOG, CATEGORY_NAMES, category, schoolOf, subject, note, metrics, type Category } from './catalog';
import { SCHOOL_INFO, type School } from '../game/upgrades/definitions';
import { PreviewScene } from './PreviewScene';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
let current=CATALOG.find(card=>card.id==='fire.multi')!,layers=1,upgraded=true;
let filter:School|'passive'='fire',type:Category|'all'='all',lastState='';
const scene=new PreviewScene($('stage'),status=>{
  if(status!==lastState){$('live-state').textContent=status;lastState=status;}
  $('play').textContent=scene.paused?'▶ 继续':'Ⅱ 暂停';$('play').setAttribute('aria-label',scene.paused?'继续演示':'暂停演示');
  if(import.meta.env.DEV&&scene.booted)$('stage').dataset.snapshot=JSON.stringify(scene.diagnostics());
},()=>{$('loading').remove();});
const selection=()=>({card:current,layers,upgraded});
scene.selection=selection();
const game=new Phaser.Game({type:Phaser.AUTO,parent:'stage',width:900,height:360,backgroundColor:'#15221e',scene,audio:{noAudio:true},render:{antialias:true}});
function renderFilters():void {
  $('schools').replaceChildren(...(['fire','ice','lightning','passive'] as const).map(value=>{
    const button=document.createElement('button');button.textContent=value==='passive'?'通用':SCHOOL_INFO[value].name;
    button.setAttribute('aria-pressed',String(value===filter));button.onclick=()=>{filter=value;type='all';renderFilters();renderList(true);};return button;
  }));
  $('categories').replaceChildren(...(['all','spell','skill','ultimate'] as const).map(value=>{
    const button=document.createElement('button');button.textContent=value==='all'?'全部':CATEGORY_NAMES[value];button.hidden=filter==='passive'&&value!=='all';
    button.setAttribute('aria-pressed',String(value===type));button.onclick=()=>{type=value;renderFilters();renderList(true);};return button;
  }));
}
function renderList(selectFirst=false):void {
  const list=$('upgrade-list'),left=selectFirst?0:list.scrollLeft,top=selectFirst?0:list.scrollTop;
  const query=$<HTMLInputElement>('search').value.trim().toLocaleLowerCase();
  const cards=CATALOG.filter(card=>(filter==='passive'?category(card)==='passive':category(card)!=='passive'&&schoolOf(card)===filter)&&(type==='all'||category(card)===type)&&(!query||[card.name,note(card),subject(card)].join(' ').toLocaleLowerCase().includes(query)));
  if(selectFirst&&cards.length&&!cards.includes(current)){current=cards[0];layers=1;upgraded=true;renderEntry();}
  let previous='';$('upgrade-list').replaceChildren();
  for(const card of cards) {
    const kind=category(card);
    if(kind!==previous){const label=document.createElement('div');label.className='list-label';label.textContent=CATEGORY_NAMES[kind];$('upgrade-list').append(label);previous=kind;}
    const button=document.createElement('button');button.className='upgrade-link';button.dataset.upgrade=card.id;button.setAttribute('aria-current',String(card===current));
    const symbol=document.createElement('span');symbol.className='symbol';symbol.setAttribute('aria-hidden','true');symbol.textContent=kind==='passive'?'◇':SCHOOL_INFO[schoolOf(card)].symbol;
    const text=document.createElement('span'),name=document.createElement('strong'),sub=document.createElement('small');name.textContent=card.name;sub.textContent=`${CATEGORY_NAMES[kind]} · ${card.maxStacks} 层`;text.append(name,sub);
    const arrow=document.createElement('span');arrow.className='chevron';arrow.textContent='›';arrow.setAttribute('aria-hidden','true');button.append(symbol,text,arrow);
    button.onclick=()=>{current=card;layers=1;upgraded=true;renderList();renderEntry();};$('upgrade-list').append(button);
  }
  $('empty').hidden=cards.length!==0;
  list.scrollLeft=left;list.scrollTop=top;
}
function renderEntry():void {
  document.documentElement.style.setProperty('--accent',category(current)==='passive'?'#d5c28d':schoolOf(current)==='fire'?'#efb16d':schoolOf(current)==='ice'?'#9fd7e3':'#cebbf4');
  $('entry-kind').textContent=category(current)==='passive'?'通用强化':`${SCHOOL_INFO[schoolOf(current)].name} / ${CATEGORY_NAMES[category(current)]}`;
  $('entry-layers').textContent=`最多 ${current.maxStacks} 层`;$('upgrade-name').textContent=current.name;$('note').textContent=note(current);$('subject').textContent=subject(current);
  document.title=`${current.name} · 强化图鉴`;
  document.querySelectorAll<HTMLButtonElement>('[data-version]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.version==='after')===upgraded)));
  $('layers').replaceChildren(...Array.from({length:current.maxStacks},(_,i)=>{
    const button=document.createElement('button');button.textContent=`${i+1} 层`;button.setAttribute('aria-pressed',String(layers===i+1));
    button.onclick=()=>{layers=i+1;renderEntry();};return button;
  }));
  $('metrics').replaceChildren(...metrics(current,layers).map(row=>{
    const item=document.createElement('dl');item.className='metric';const label=document.createElement('dt');label.textContent=row.label;
    const value=document.createElement('dd'),before=document.createElement('small'),arrow=document.createElement('i'),after=document.createElement('span');before.textContent=row.before;arrow.textContent='›';arrow.setAttribute('aria-hidden','true');after.textContent=row.after;
    value.append(before,arrow,after);item.append(label,value);return item;
  }));
  scene.configure(selection());
}
$('search').oninput=()=>renderList();
document.querySelectorAll<HTMLButtonElement>('[data-version]').forEach(button=>button.onclick=()=>{upgraded=button.dataset.version==='after';renderEntry();});
$('play').onclick=()=>scene.paused?scene.resume():scene.pause();$('replay').onclick=()=>{scene.resetEncounter();scene.redraw();};
$<HTMLSelectElement>('speed').onchange=()=>scene.speed=Number($<HTMLSelectElement>('speed').value);
const hide=(event:PageTransitionEvent)=>{if(event.persisted)scene.pause();else{game.destroy(true);game.loop.wake();}};
window.addEventListener('pagehide',hide);
if(import.meta.hot)import.meta.hot.dispose(()=>{window.removeEventListener('pagehide',hide);game.destroy(true);game.loop.wake();});
renderFilters();renderList();renderEntry();
if(import.meta.env.DEV)void import('./verification').then(({installVerification})=>installVerification(scene,$('dev-tools'),renderEntry));
