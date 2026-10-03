import './style.css';
import Phaser from 'phaser';
import { CATALOG, type DemoMode } from './catalog';
import { enemySpec } from '../game/enemies/roster';
import type { GameMode } from '../game/modes';
import { PreviewScene, type PreviewSelection } from './PreviewScene';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
let entryIndex=0,formIndex=0,demo:DemoMode='attack',move='sweep',wave=1,growth:GameMode='race';
let portraits=new Map<string,string>(),lastPhase='';
const selection=():PreviewSelection=>({entry:CATALOG[entryIndex],form:CATALOG[entryIndex].forms[formIndex],demo,move,wave,growth});
const scene=new PreviewScene($('stage'),images=>{portraits=images;$('loading').remove();renderList();renderEntry();},phase=>{
  if(phase!==lastPhase){$('live-phase').textContent=phase;lastPhase=phase;}
  $('play').textContent=scene.manualPause?'▶ 继续':'Ⅱ 暂停';$('play').setAttribute('aria-label',scene.manualPause?'继续演示':'暂停演示');
  for(const id of ['hit','freeze','mechanic-action'])$<HTMLButtonElement>(id).disabled=!scene.hasActor;
  if(import.meta.env.DEV)$('stage').dataset.snapshot=JSON.stringify(scene.diagnostics());
});
scene.selection=selection();
const game=new Phaser.Game({type:Phaser.AUTO,parent:'stage',width:900,height:420,backgroundColor:'#172321',scene,audio:{noAudio:true},render:{antialias:true}});
function renderList():void {
  const query=$<HTMLInputElement>('search').value.trim().toLocaleLowerCase(),list=$('enemy-list');
  list.replaceChildren();let count=0;
  CATALOG.forEach((entry,i)=>{
    const searchable=[entry.name,entry.role,...entry.forms.flatMap(f=>[f.name,f.summary,...f.mechanics,...f.attack,...f.counter])].join(' ');
    if(query&&!searchable.toLocaleLowerCase().includes(query))return;
    if(i===0||i===7){const label=document.createElement('div');label.className='list-label';label.textContent=i===7?'周期 BOSS':'试验场小怪';list.append(label);}
    const button=document.createElement('button');button.className='enemy-link';button.dataset.kind=entry.kind;button.setAttribute('aria-current',String(i===entryIndex));
    const picture=document.createElement('img');picture.alt='';picture.src=portraits.get(entry.kind+':'+entry.forms[0].name)??'';
    const text=document.createElement('span'),name=document.createElement('strong'),role=document.createElement('small');name.textContent=entry.name;role.textContent=entry.role;text.append(name,role);
    const arrow=document.createElement('span');arrow.className='chevron';arrow.textContent='›';arrow.setAttribute('aria-hidden','true');
    button.append(picture,text,arrow);button.onclick=()=>{entryIndex=i;formIndex=0;wave=entry.firstWave;move=entry.moves?.[0].id??'';renderList();renderEntry();};
    list.append(button);count++;
  });
  $('empty').hidden=count!==0;
}
function renderEntry():void {
  const {entry,form}=selection();
  $('entry-number').textContent=`NO. ${String(entryIndex+1).padStart(2,'0')}`;
  $('entry-role').textContent=entry.role;$('enemy-name').textContent=form.name;$('enemy-summary').textContent=form.summary;
  document.title=`${form.name} · 敌人图鉴`;
  const forms=$('forms');forms.replaceChildren();
  entry.forms.forEach((f,i)=>{const button=document.createElement('button');button.textContent=f.label;button.setAttribute('aria-pressed',String(i===formIndex));
    button.onclick=()=>{formIndex=i;renderEntry();};forms.append(button);});
  const attacks=form.half?[...entry.forms[0].attack,...form.attack]:form.attack;
  for(const [id,paragraphs] of [['attack-notes',attacks],['mechanic-notes',form.mechanics],['counter-notes',form.counter]] as const) {
    $(id).replaceChildren(...paragraphs.map(text=>{const p=document.createElement('p');p.textContent=text;return p;}));
  }
  const spec=enemySpec(entry.kind,wave,growth);
  $('stat-health').textContent=String(spec.health);$('stat-damage').textContent=spec.damage?String(spec.damage):'支援';
  $('stat-speed').textContent=String(Math.round(spec.speed));$('stat-wave').textContent=`第 ${entry.firstWave} 波`;
  $('wave-value').textContent=String(wave);$<HTMLInputElement>('wave').value=String(wave);
  const picker=$<HTMLSelectElement>('move-picker');picker.replaceChildren();
  for(const attack of entry.moves??[]) {const option=new Option(attack.label,attack.id);picker.add(option);}
  picker.value=move;$('move-picker-label').hidden=!entry.moves||demo==='movement';
  $('mechanic-action').hidden=!form.action||demo==='movement';$('mechanic-action').textContent=form.action??'';
  $('hit').hidden=$('freeze').hidden=demo==='movement';
  $('stage-hint').textContent=demo==='movement'?'近看真实步态；切换形态可以比较腿部与漂浮动作。':
    demo==='mechanic'?'自动演示关键机制；也可以用右侧按钮尝试命中和冻结。':'拖动法师演示靶，观察预警锁定和攻击范围。';
  document.querySelectorAll<HTMLButtonElement>('[data-demo]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.demo===demo)));
  scene.configure(selection());
}
$<HTMLInputElement>('search').oninput=renderList;
document.querySelectorAll<HTMLButtonElement>('[data-demo]').forEach(button=>button.onclick=()=>{demo=button.dataset.demo as DemoMode;renderEntry();});
$('play').onclick=()=>{if(scene.manualPause)scene.resume();else scene.pause();};
$('replay').onclick=()=>{scene.resetEncounter();scene.redraw();};
$('hit').onclick=()=>scene.hit();$('freeze').onclick=()=>scene.freeze();$('mechanic-action').onclick=()=>scene.mechanicAction();
$<HTMLSelectElement>('speed').onchange=()=>scene.speed=Number($<HTMLSelectElement>('speed').value);
$<HTMLSelectElement>('move-picker').onchange=()=>{move=$<HTMLSelectElement>('move-picker').value;scene.configure(selection());};
$<HTMLInputElement>('wave').oninput=()=>{wave=Number($<HTMLInputElement>('wave').value);renderEntry();};
$<HTMLSelectElement>('growth').onchange=()=>{
  growth=$<HTMLSelectElement>('growth').value as GameMode;$<HTMLInputElement>('wave').max=growth==='race'?'20':'100';
  wave=Math.min(wave,growth==='race'?20:100);renderEntry();
};
window.addEventListener('pagehide',event=>{if(event.persisted)scene.pause('后台');else{game.destroy(true);game.loop.wake();}});
if(import.meta.hot)import.meta.hot.dispose(()=>{game.destroy(true);game.loop.wake();});
renderList();renderEntry();
if(import.meta.env.DEV) {
  void import('./verification').then(({installVerification})=>installVerification(scene,$('dev-tools'),()=>{renderEntry();}));
}
