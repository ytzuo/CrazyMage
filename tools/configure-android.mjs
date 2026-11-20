#!/usr/bin/env node
/**
 * Applies Unstable Mage Android customizations onto Tauri's generated Android project
 * (`src-tauri/gen/android/`):
 * 1. Lock orientation to sensorLandscape & configure runtime configChanges.
 * 2. Set Chinese app label (`失控法师`).
 * 3. Enable immersive sticky fullscreen, keep-screen-on, and back-button delegation to `window.__mageHandleBack()`.
 * 4. Enable optional release signing when ANDROID_KEYSTORE_* env vars are provided (e.g. CI).
 */
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dirFlagIndex = process.argv.indexOf('--android-dir');
const androidRoot = dirFlagIndex >= 0 && process.argv[dirFlagIndex + 1]
  ? resolve(process.argv[dirFlagIndex + 1])
  : resolve(root, 'src-tauri/gen/android');
const appMain = resolve(androidRoot, 'app/src/main');

if (!existsSync(androidRoot)) {
  console.error('Missing src-tauri/gen/android. Run "npm run tauri -- android init" first.');
  process.exit(1);
}

// 1. AndroidManifest.xml: lock sensorLandscape on MainActivity.
const manifestPath = resolve(appMain, 'AndroidManifest.xml');
let manifest = readFileSync(manifestPath, 'utf8');
if (manifest.includes('android:screenOrientation=')) {
  manifest = manifest.replace(/android:screenOrientation="[^"]*"/, 'android:screenOrientation="sensorLandscape"');
} else {
  manifest = manifest.replace(
    /(<activity\b[^>]*android:name="\.MainActivity")/,
    '$1\n            android:screenOrientation="sensorLandscape"',
  );
}
writeFileSync(manifestPath, manifest, 'utf8');

// 2. Copy generated icons first, then apply localized Chinese label & dark sanctum launcher background.
const androidIcons = resolve(root, 'src-tauri/icons/android');
if (existsSync(androidIcons)) {
  cpSync(androidIcons, resolve(appMain, 'res'), { recursive: true, force: true });
}

const stringsPath = resolve(appMain, 'res/values/strings.xml');
if (existsSync(stringsPath)) {
  let strings = readFileSync(stringsPath, 'utf8');
  strings = strings
    .replace(/(<string name="app_name">)[^<]*(<\/string>)/, '$1失控法师$2')
    .replace(/(<string name="title_activity_main">)[^<]*(<\/string>)/, '$1失控法师$2');
  writeFileSync(stringsPath, strings, 'utf8');
}

const icBgPath = resolve(appMain, 'res/values/ic_launcher_background.xml');
if (existsSync(icBgPath)) {
  const bg = readFileSync(icBgPath, 'utf8').replace(
    /(<color name="ic_launcher_background">)[^<]*(<\/color>)/,
    '$1#17251F$2',
  );
  writeFileSync(icBgPath, bg, 'utf8');
}

// 3. MainActivity.kt: immersive sticky fullscreen, cutout edges, keep screen on, back-key bridge.
const activityPath = resolve(appMain, 'java/com/unstablemage/game/MainActivity.kt');
const mainActivityKt = `package com.unstablemage.game

import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.webkit.WebView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

class MainActivity : TauriActivity() {
  private var gameWebView: WebView? = null
  private var lastExitPromptMs: Long = 0L

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      window.attributes.layoutInDisplayCutoutMode =
        WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
    }
    applyImmersiveMode()

    onBackPressedDispatcher.addCallback(
      this,
      object : OnBackPressedCallback(true) {
        override fun handleOnBackPressed() {
          val webView = gameWebView
          if (webView == null) {
            handleExitPrompt()
            return
          }
          webView.evaluateJavascript(
            "(function(){try{return typeof window.__mageHandleBack==='function'&&!!window.__mageHandleBack();}catch(_){return false;}})();"
          ) { result ->
            if (result != "true") {
              runOnUiThread { handleExitPrompt() }
            }
          }
        }
      }
    )
  }

  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    gameWebView = webView
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) applyImmersiveMode()
  }

  private fun applyImmersiveMode() {
    WindowCompat.setDecorFitsSystemWindows(window, false)
    val controller = WindowInsetsControllerCompat(window, window.decorView)
    controller.hide(WindowInsetsCompat.Type.systemBars())
    controller.systemBarsBehavior =
      WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
  }

  private fun handleExitPrompt() {
    val now = System.currentTimeMillis()
    if (now - lastExitPromptMs < 2000L) {
      finish()
    } else {
      lastExitPromptMs = now
      Toast.makeText(this, "再按一次退出游戏", Toast.LENGTH_SHORT).show()
    }
  }
}
`;
writeFileSync(activityPath, mainActivityKt, 'utf8');

// 4. Optional Release Keystore wiring in app/build.gradle.kts (idempotent).
const gradlePath = resolve(androidRoot, 'app/build.gradle.kts');
if (existsSync(gradlePath)) {
  let gradle = readFileSync(gradlePath, 'utf8');
  const marker = '// UNSTABLE_MAGE_SIGNING_CONFIG';
  if (!gradle.includes(marker)) {
    const signingBlock = `
    ${marker}
    signingConfigs {
        create("release") {
            val storePath = System.getenv("ANDROID_KEYSTORE_PATH")
            if (!storePath.isNullOrBlank()) {
                storeFile = file(storePath)
                storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD") ?: ""
                keyAlias = System.getenv("ANDROID_KEY_ALIAS") ?: ""
                keyPassword = System.getenv("ANDROID_KEY_PASSWORD") ?: ""
            }
        }
    }
`;
    gradle = gradle.replace(/(android\s*\{)/, `$1\n${signingBlock}`);
    gradle = gradle.replace(
      /(getByName\("release"\)\s*\{)/,
      '$1\n            if (!System.getenv("ANDROID_KEYSTORE_PATH").isNullOrBlank()) { signingConfig = signingConfigs.getByName("release") }',
    );
    writeFileSync(gradlePath, gradle, 'utf8');
  }
}

console.log('Configured Android project: sensorLandscape, immersive fullscreen, keep-screen-on, back handler, and optional release signing.');
