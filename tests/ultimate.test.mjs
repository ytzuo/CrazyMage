import test from 'node:test';
import assert from 'node:assert/strict';
import { UltimateCharge } from '../src/game/ultimates/UltimateCharge.ts';
import { ultimateSpec } from '../src/game/ultimates/definitions.ts';
test('ten spell kills fill energy, consumption is atomic and capped',()=>{
  const charge=new UltimateCharge();assert.equal(charge.consume(),false);
  for(let i=0;i<9;i++)charge.onKill();assert.equal(charge.energy,90);assert.equal(charge.consume(),false);
  charge.onKill();assert.equal(charge.ready,true);
  for(let i=0;i<100;i++)charge.onKill();assert.equal(charge.energy,100);
  assert.equal(charge.consume(),true);assert.equal(charge.consume(),false);assert.equal(charge.energy,0);
});
test('ultimate kills cannot recharge themselves and reset discards stored energy',()=>{
  const charge=new UltimateCharge();for(let i=0;i<36;i++)charge.onKill('ultimate');assert.equal(charge.energy,0);
  charge.onKill();charge.reset();assert.equal(charge.energy,0);assert.equal(charge.ready,false);
});
test('school ultimates preserve distinct ranges and control while levels scale damage only',()=>{
  for(const school of ['fire','ice','lightning']){
    const first=ultimateSpec(school,1),last=ultimateSpec(school,4);
    assert.equal(last.damage,first.damage+(school==='ice'?6:45));
    assert.equal(last.radius,first.radius);assert.equal(last.targets,first.targets);
    assert.deepEqual(ultimateSpec(school,99),last);assert.ok(Object.isFrozen(last));
  }
  assert.equal(ultimateSpec('ice',1).freeze,1000);assert.equal(ultimateSpec('lightning',1).targets,4);
});
