import test from 'node:test';
import assert from 'node:assert/strict';
import { isGuideReturnHref, shouldBlockBrowserShortcut } from '../src/platform/shell.ts';

const key = (code, mods = {}) => ({
  code,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  repeat: false,
  ...mods,
});

test('production native shell blocks reload, zoom, and alt-history shortcuts only', () => {
  assert.equal(shouldBlockBrowserShortcut(key('F5'), true, true), true);
  assert.equal(shouldBlockBrowserShortcut(key('KeyR', { ctrlKey: true }), true, true), true);
  assert.equal(shouldBlockBrowserShortcut(key('KeyR', { metaKey: true }), true, true), true);
  assert.equal(shouldBlockBrowserShortcut(key('Equal', { ctrlKey: true }), true, true), true);
  assert.equal(shouldBlockBrowserShortcut(key('Minus', { metaKey: true }), true, true), true);
  assert.equal(shouldBlockBrowserShortcut(key('Digit0', { ctrlKey: true }), true, true), true);
  assert.equal(shouldBlockBrowserShortcut(key('ArrowLeft', { altKey: true }), true, true), true);
  assert.equal(shouldBlockBrowserShortcut(key('ArrowRight', { altKey: true }), true, true), true);
});

test('gameplay keys, dev mode, and regular browser sessions remain unaffected', () => {
  for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyE', 'KeyU', 'Escape', 'Space']) {
    assert.equal(shouldBlockBrowserShortcut(key(code), true, true), false, `${code} should not be blocked`);
  }
  assert.equal(shouldBlockBrowserShortcut(key('F5'), true, false), false);
  assert.equal(shouldBlockBrowserShortcut(key('F5'), false, true), false);
  assert.equal(shouldBlockBrowserShortcut(key('KeyR', { ctrlKey: true }), false, true), false);
});

test('guide return link matcher only intercepts main-menu index.html links', () => {
  assert.equal(isGuideReturnHref('./index.html'), true);
  assert.equal(isGuideReturnHref('/index.html'), true);
  assert.equal(isGuideReturnHref('index.html?from=guide'), true);
  assert.equal(isGuideReturnHref('./bestiary.html'), false);
  assert.equal(isGuideReturnHref('./upgrades.html'), false);
  assert.equal(isGuideReturnHref(null), false);
});
