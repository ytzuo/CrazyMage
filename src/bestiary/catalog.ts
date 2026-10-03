import type { EnemyKind } from '../game/enemies/roster';
import { VARIANTS } from '../game/enemies/variants';
import type { EnemyVariant } from '../game/enemies/variants';
export type DemoMode='movement'|'attack'|'mechanic';
export interface Form {
  label:string;name:string;variant:EnemyVariant;half?:boolean;
  attack:string[];mechanics:string[];action?:string;
}
export interface Entry {kind:EnemyKind;name:string;role:string;firstWave:number;forms:Form[];moves?:{id:string;label:string;description:string;halfDescription?:string}[]}
const form=(name:string,attack:string[],mechanics:string[],variant:EnemyVariant='normal',action?:string):Form=>
  ({label:variant==='normal'?'普通形态':'特殊形态',name,attack,mechanics,variant,action});
export const CATALOG:Entry[]=[
  {kind:'chaser',name:'追击怪',role:'近战 · 追击',firstWave:1,forms:[
    form('追击怪',
      ['进入 50 的攻击距离后，橙色圆环预警 0.3 秒，再进行近战挥击。','受击会打断蓄力；移动步频随实际位移和减速变化。'],
      ['沿直线追击，没有突进或远程能力。','同类越多，越容易限制退路；基础冷却 1.2 秒。']),
    form('分裂怪',
      ['保留追击怪的近战预警和挥击。','死亡后出现两只更小的追击怪，短暂出生预警后继续追击。'],
      ['碎片体型 65%、生命 45%、攻击 60%、速度 115%；出生预警 0.35 秒。','碎片不会再次分裂；它们都计入原波次，全部击杀才算清波。'],'splitter','击杀母体 · 看分裂') ]},
  {kind:'swift',name:'迅捷怪',role:'近战 · 快速',firstWave:2,forms:[
    form('迅捷怪',
      ['移速 160，近身 40 范围内预警 0.35 秒后攻击。','停步、蓄力和受击时收住腿部动作，基础冷却 1 秒。'],
      ['普通形态没有冲刺，靠持续快速追击形成压力。']),
    form('突刺怪',
      ['260 距离内显示 0.55 秒直线预警；随后突刺 0.3 秒。','突刺速度 780，方向在蓄力时锁定，一次突刺最多造成一次接触伤害。'],
      ['不追踪已经移动的目标；减速降低突刺位移。','受击或冻结能取消蓄力与突刺，基础冷却 1.8 秒。'],'dasher') ]},
  {kind:'ranged',name:'远程小怪',role:'远程 · 弹丸',firstWave:3,forms:[
    form('远程小怪',
      ['520 距离内瞄准 0.7 秒，再发射一枚晶核；基础冷却 2 秒。','太近会后退，太远会靠近，弹丸不会追踪。'],
      ['弹丸速度 210，最长飞行 3.2 秒。','蓄力可被命中打断；已经发出的弹丸继续飞行。']),
    form('连射怪',
      ['0.7 秒蓄力后连续三发，每发间隔 0.18 秒。','三发都沿最初瞄准方向飞行，连射期间保持瞄准线。'],
      ['受击或冻结会取消尚未发出的晶核。','发射后的弹丸不随目标改变方向。'],'volley') ]},
  {kind:'brute',name:'重型怪',role:'近战 · 重击',firstWave:4,forms:[
    form('重型怪',
      ['74 范围内蓄力 0.85 秒后重击；基础冷却 1.8 秒。','迈步伴随较轻的承重起伏，蓄力时双脚收稳。'],
      ['基础生命 120、攻击 24，移动慢，击退较小。','攻击仍检查出手时的距离，离开范围可躲掉。']),
    form('盾甲怪',
      ['保留重型怪的预警与重击。','格挡成功时蓝色闪光与护盾环出现，不损失生命。'],
      [`普通直接命中有 ${Math.round(VARIANTS.blockChance*100)}% 概率格挡；成功后 0.4 秒内不能再次格挡。`,'格挡不击退、不打断；持续伤害不触发此格挡，冻结期间不能格挡。'],'guardian','连续命中 · 看格挡') ]},
  {kind:'artillery',name:'咒印投手',role:'远程 · 范围',firstWave:4,forms:[
    form('咒印投手',
      ['620 距离内锁定目标脚下，半径 70 的落点预警 1.1 秒后爆发。','保持中距离，基础冷却 3.2 秒。'],
      ['落点锁定后不追踪目标，没有飞行弹丸。','命中、冻结或击杀施法者会取消它的待发区域。']),
    form('三重咒印',
      ['每隔 0.45 秒锁定一个新落点，共三个。','每个落点各自完整预警 1.1 秒，再按顺序爆发。'],
      ['后续咒印读取锁定时的目标位置；已锁定的点保持不动。','命中或冻结会取消整组待发咒印。'],'triple') ]},
  {kind:'bomber',name:'爆核傀儡',role:'近战 · 自爆',firstWave:6,forms:[
    form('爆核傀儡',
      ['150 距离内开始 1.2 秒倒数，随后在自身位置引爆半径 110 的区域。','开始倒数后不走路；普通受击不取消倒数，击退会移动爆心。'],
      ['蓄力中被击杀，转为只伤敌人的友军爆炸，伤害为自身攻击的 3 倍。','冻结暂停倒数；自毁不计玩家击杀或 Q 充能。'],'normal','蓄力击杀 · 友军爆炸'),
    form('连爆傀儡',
      ['保留 1.2 秒第一爆；随后再预警 1.05 秒，触发第二次环形爆炸。','第二圈内半径 80、外半径 180，落点固定。'],
      ['中心为空，第二圈只伤害环带内的目标。','蓄力时被击杀仍只触发友军爆炸，不追加危险第二圈。'],'chain','蓄力击杀 · 友军爆炸') ]},
  {kind:'priest',name:'魔核祭司',role:'支援 · 保护',firstWave:8,forms:[
    form('魔核祭司',
      ['目标在 520 内、身边 140 内有可保护同伴时，蓄力 1 秒施放。','保持中距离，每次保护最多三只小怪，冷却 4.2 秒。'],
      ['护盾最多吸收同伴最大生命的 25%，第一次有效命中后破碎，最长 4 秒。','超出护盾的伤害继续扣血；祭司死亡或冻结撤掉自己提供的护盾。'],'normal','击中同伴 · 看护盾'),
    form('结界祭司',
      ['蓄力 1 秒后在自身位置展开半径 140 的结界，维持时停步。','结界固定在施法位置，最长持续 4 秒。'],
      ['结界内其他普通怪物减伤 30%；祭司、Boss 不受保护，重叠不叠加。','冻结或击杀祭司立即解除结界。'],'ward','移出同伴 · 看结界') ]},
  {kind:'boss',name:'魔核守卫',role:'Boss · 重装近战',firstWave:5,moves:[{id:'sweep',label:'重拳横扫',description:'预警 1.1 秒后挥出半径 180、120° 的扇形重拳；绕到侧后方躲避。',halfDescription:'第一拳后追加一次转过 60° 的横扫，继续看第二段预警。'},{id:'stomp',label:'魔核重踏',description:'原地蓄力 1.3 秒后重踏，再向外延伸三条裂纹；裂纹各预警 1 秒后爆发。'},{id:'charge',label:'锁向冲撞',description:'用 1.3 秒预警锁定直线方向，随后最多冲出 520；横向离开冲撞路线。',halfDescription:'冲撞结束后追加一次重踏，整套结束才进入休息与露核。'},{id:'rupture',label:'地脉连爆',description:'三个固定落点由近到远依次爆发，首段预警 1.4 秒、后续间隔 0.45 秒。',halfDescription:'落点增加为四个；沿侧向移动，避开整条连爆路线。'}],forms:[
    form('魔核守卫',
      ['横扫：1.1 秒预警，半径 180、120° 扇形；重踏：1.3 秒预警后再亮三条裂纹，各预警 1 秒。','冲撞：1.3 秒锁向预警后冲出，最长 520；连爆：三个固定落点由近到远，首段 1.4 秒，间隔 0.45 秒。'],
      ['每套攻击后休息至少 5 秒，前 1.8 秒原地打开胸甲；露核时所受伤害 ×1.3。','第 5、15、25……波出现；普通命中不取消招式，冻结可以取消。']),
    {...form('破甲守卫',
      ['横扫追加一次转过 60° 的横扫；冲撞后追加一次重踏。','地脉连爆从三个落点变为四个，后续招式保留完整预警。'],
      ['生命低于一半时显露破甲外观。','攻击后仍休息 5 秒，露核窗口延长为 2.2 秒，所受伤害仍 ×1.3。']),label:'半血 · 破甲',half:true} ]},
  {kind:'weaver',name:'裂隙织主',role:'Boss · 换位封路',firstWave:10,moves:[{id:'teleport',label:'裂隙换位',description:'落点轮廓预警 0.8 秒后瞬移，落地停顿 0.8 秒；瞬移本身没有接触伤害。',halfDescription:'原位置留下残影，补一条预警 1 秒、生效 1.4 秒的切线；主身停顿延长到 1.2 秒，残影结束后才开始休息。'},{id:'lines',label:'织界切线',description:'两条切线同时预警 1 秒，再成为持续 1.4 秒的伤害带；预警时穿过，生效后避开。'},{id:'orbs',label:'魔核回收',description:'三枚魔核预警 1 秒，飞出 2 秒、停顿 0.55 秒，再用 2 秒原路返回；去程和返程都要躲避。'}],forms:[
    form('裂隙织主',
      ['换位：落点轮廓预警 0.8 秒后瞬移，落地停顿 0.8 秒。','双切线：1 秒预警，伤害带生效 1.4 秒；魔核：1 秒预警，2 秒飞出、停顿 0.55 秒、2 秒原路返回。'],
      ['换位 → 双切线 → 三枚魔核循环，每套结束后休息 5 秒。','第 10、20、30……波出现；生命约同波守卫的 75%，始终可受伤，瞬移不造成接触伤害。']),
    {...form('断界织主',
      ['半血以下显示六臂。瞬移原点留下残影，额外锁定一条切线。','残影只补一招，完整预警 1 秒、生效 1.4 秒，然后消失；主身落地停顿延长到 1.2 秒。'],
      ['等残影切线结束，才开始整套攻击后的 5 秒休息。','主身始终可受伤，其他招式预警不缩短；冻结取消当前招式与残影。']),label:'半血 · 断界',half:true} ]},
];

/** Only offer distinct demonstrations; attack-like abilities share the mechanism view. */
export function demoModes(entry:Entry,form:Form):DemoMode[] {
  if(entry.kind==='priest'||['dasher','volley','triple'].includes(form.variant))return ['movement','mechanic'];
  if(entry.kind==='bomber'||['splitter','guardian'].includes(form.variant))return ['movement','attack','mechanic'];
  return ['movement','attack'];
}
export function hasSpecialMechanic(entry:Entry,form:Form):boolean {
  return !!entry.moves||entry.kind==='bomber'||entry.kind==='priest'||form.variant!=='normal';
}
