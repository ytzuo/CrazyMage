import type { School, SkillModule } from '../upgrades/definitions';
export const SCHOOL_SKILLS = {
  fire: {name:'焰爆', cooldown:10000, description:'向前推出烈焰，触敌或到达落点后爆开。'},
  ice: {name:'冰棘扇阵', cooldown:10000, description:'向前生成驻留的扇形冰刺，持续伤害并减速踏入的敌人。'},
  lightning: {name:'贯雷', cooldown:9000, description:'向前射出一道贯穿敌人的雷光。'},
} as const;
export function skillSpec(school:School, modules:Readonly<Partial<Record<SkillModule,number>>>={}) {
  const power=modules.power??0, reach=modules.reach??0, tempo=modules.tempo??0;
  return Object.freeze({...SCHOOL_SKILLS[school], school,
    cooldown:SCHOOL_SKILLS[school].cooldown*(1-0.1*tempo),
    damage:(school==='fire'?70:school==='ice'?6:80)*(1+0.3*power),
    reach:(school==='fire'?230:school==='ice'?300:640)*(1+0.15*reach),
    radius:(school==='fire'?120:school==='ice'?300:0)*(1+0.15*reach),
    width:56*(1+0.15*reach), slow:0.7, duration:3000});
}
export type SkillSpec=ReturnType<typeof skillSpec>;
