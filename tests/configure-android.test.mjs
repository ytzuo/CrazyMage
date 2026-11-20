import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('configure-android patches orientation, Chinese app label, MainActivity, and signing idempotently', () => {
  const tempRoot = mkdtempSync(join(tmpdir(), 'mage-android-test-'));
  try {
    const appMain = join(tempRoot, 'app/src/main');
    mkdirSync(join(appMain, 'res/values'), { recursive: true });
    mkdirSync(join(appMain, 'java/com/unstablemage/game'), { recursive: true });

    writeFileSync(
      join(appMain, 'AndroidManifest.xml'),
      '<manifest><application><activity android:name=".MainActivity" android:exported="true"></activity></application></manifest>',
    );
    writeFileSync(
      join(appMain, 'res/values/strings.xml'),
      '<resources><string name="app_name">Unstable Mage</string><string name="title_activity_main">Unstable Mage</string></resources>',
    );
    writeFileSync(
      join(appMain, 'res/values/ic_launcher_background.xml'),
      '<resources><color name="ic_launcher_background">#FFFFFF</color></resources>',
    );
    writeFileSync(join(appMain, 'java/com/unstablemage/game/MainActivity.kt'), 'package com.unstablemage.game\nclass MainActivity : TauriActivity()\n');
    writeFileSync(
      join(tempRoot, 'app/build.gradle.kts'),
      'android {\n    buildTypes {\n        getByName("release") {\n            isMinifyEnabled = true\n        }\n    }\n}\n',
    );

    const script = resolve('tools/configure-android.mjs');
    // Run twice to verify idempotency.
    execFileSync(process.execPath, [script, '--android-dir', tempRoot]);
    execFileSync(process.execPath, [script, '--android-dir', tempRoot]);

    const manifest = readFileSync(join(appMain, 'AndroidManifest.xml'), 'utf8');
    assert.match(manifest, /android:screenOrientation="sensorLandscape"/);

    const strings = readFileSync(join(appMain, 'res/values/strings.xml'), 'utf8');
    assert.match(strings, /<string name="app_name">失控法师<\/string>/);

    const bg = readFileSync(join(appMain, 'res/values/ic_launcher_background.xml'), 'utf8');
    assert.match(bg, /#17251F/);

    const activity = readFileSync(join(appMain, 'java/com/unstablemage/game/MainActivity.kt'), 'utf8');
    assert.match(activity, /FLAG_KEEP_SCREEN_ON/);
    assert.match(activity, /__mageHandleBack/);
    assert.match(activity, /BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE/);

    const gradle = readFileSync(join(tempRoot, 'app/build.gradle.kts'), 'utf8');
    assert.equal(gradle.match(/UNSTABLE_MAGE_SIGNING_CONFIG/g)?.length, 1);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
