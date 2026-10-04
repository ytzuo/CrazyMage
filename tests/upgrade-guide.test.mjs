import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG, category, schoolOf, previewBuild, metrics } from '../src/upgrade-guide/catalog.ts';
import { initialBuild, applyUpgrade, compileBuild } from '../src/game/upgrades/build.ts';

test('guide includes every unique upgrade with valid initial and maximum-layer builds',()=>{
  assert.equal(CATALOG.length,40);assert.equal(new Set(CATALOG.map(c=>c.id)).size,40);
  for(const card of CATALOG) {
    let build=initialBuild(0,schoolOf(card));
    assert.deepEqual(previewBuild(card,0),compileBuild(build));
    for(let layer=1;layer<=card.maxStacks;layer++) {
      build=applyUpgrade(build,card.id);
      assert.deepEqual(previewBuild(card,layer),compileBuild(build));
      const rows=metrics(card,layer);
      assert.ok(rows.length>=1&&rows.length<=3,card.id);
      assert.ok(rows.every(row=>row.label&&row.before&&row.after&&!/NaN|undefined|Infinity/.test(row.before+row.after)),card.id);
      assert.ok(rows.some(row=>row.before!==row.after),card.id);
    }
    assert.deepEqual(previewBuild(card,99),compileBuild(build));
  }
});

test('guide presents attack tradeoffs and derived effects from the shared compiler',()=>{
  const card=id=>CATALOG.find(c=>c.id===id);
  assert.equal(category(card('ultimate.ice.mastery')),'ultimate');
  assert.deepEqual(metrics(card('fire.multi'),1),[
    {label:'火球数量',before:'1',after:'3'}, {label:'单枚伤害',before:'20',after:'13'},
  ]);
  assert.equal(metrics(card('ice.echo'),3)[0].after,'4');
  assert.equal(metrics(card('ice.echo'),3)[1].after,'24');
  const health=metrics(card('passive.health'),3);
  assert.equal(health[0].after,'180');assert.equal(health[1].after,'60');
  assert.equal(metrics(card('lightning.conduction'),1)[0].after,'95%');
  assert.equal(metrics(card('skill.ice.power'),2)[0].after,String(previewBuild(card('skill.ice.power'),2).skill.initialDamage));
});
