import test from 'node:test';
import assert from 'node:assert/strict';
import { enemyKind, enemySpec } from '../src/game/enemies/roster.ts';
import { rollVariant } from '../src/game/enemies/variants.ts';

test('bombers enter on wave six, priests on wave eight, preserving the mixed roster', () => {
  const kinds=wave=>new Set(Array.from({length:48},(_,index)=>enemyKind(wave,index)));
  assert.ok(!kinds(5).has('bomber'));
  assert.ok(kinds(6).has('bomber'));
  assert.ok(!kinds(7).has('priest'));
  for(let wave=8;wave<=100;wave++)assert.deepEqual(kinds(wave),new Set(['chaser','swift','ranged','brute','artillery','bomber','priest']));
});

test('special variants remain rare even in endless waves while existing variants retain their growth', () => {
  for(const [kind,variant] of [['bomber','chain'],['priest','ward']])for(const wave of [1,8,20,1000]) {
    assert.equal(rollVariant(kind,()=>0.179,wave),variant);
    assert.equal(rollVariant(kind,()=>0.18,wave),'normal');
    assert.equal(rollVariant(kind,()=>0.79,wave),'normal');
  }
  assert.equal(rollVariant('chaser',()=>0.79,1000),'splitter');
  assert.equal(rollVariant('chaser',()=>0.79,1),'normal');
  assert.equal(enemySpec('priest',1000,'endless').damage,0);
  assert.ok(enemySpec('bomber',1000,'endless').damage>enemySpec('bomber',6).damage);
  assert.ok(Object.isFrozen(enemySpec('bomber',6)));
});
