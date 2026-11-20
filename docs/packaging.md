# 桌面与安卓打包发布指南（Tauri v2）

本项目使用 **Tauri v2** 将同一份前端产物（`dist/`）打包为四端独立离线应用：

- **macOS**：Universal `.dmg` / `.app`（支持 Apple Silicon 与 Intel）
- **Windows**：`.msi` / `.exe`（NSIS 安装包）
- **Linux**：`.AppImage` / `.deb` / `.rpm`
- **Android**：`.apk`（已锁定 `sensorLandscape` 横屏、沉浸式全屏、防息屏与系统返回键拦截）

应用标识符固定为 `com.unstablemage.game`（请勿随意修改，以免旧版本地 `localStorage` 战绩存档无法继承）。

## 1. 本地前置依赖

- Node.js 22+（或 20.19+）
- Rust 稳定版工具链（`rustup` / `cargo`）
- **Linux 额外依赖**：`libwebkit2gtk-4.1-dev`、`libappindicator3-dev`、`librsvg2-dev`、`patchelf`、`gstreamer1.0-plugins-good`、`gstreamer1.0-libav`
- **Android 额外依赖**：JDK 17、Android SDK（API 35）、Android NDK 27+、Rust Android 目标（`aarch64-linux-android`、`armv7-linux-androideabi`、`x86_64-linux-android`），并配置 `ANDROID_HOME` 与 `NDK_HOME`

## 2. 常用本地命令

```sh
# 桌面端开发预览
npm run tauri:dev

# 打包当前操作系统的桌面发行版
npm run tauri:build

# 仅构建 macOS .app（跳过 DMG 封装，适合快速验证）
npm run tauri:build -- --bundles app

# 初始化并注入 Android 定制配置（横屏/沉浸式/返回键/图标）
npm run tauri:android:init

# 构建 Android Release APK
npm run tauri:android:build
```

## 3. 图标与音频资源维护

- **应用图标**（火属性女法师头像）：
  - 源图生成脚本：[tools/generate-app-icon.mjs](../tools/generate-app-icon.mjs)（基于 [CharacterTextures.ts](../src/game/art/CharacterTextures.ts) 的女法师火系矢量绘制）
  - 产物：`assets/icon-source.svg` 与 `assets/app-icon.png`（1024×1024）
  - 重新生成全平台图标：`npm run tauri:icons`（若修改图标后重跑，请确认 `src-tauri/icons/android/values/ic_launcher_background.xml` 背景色保持 `#1B1414`）
- **运行时音频**：
  - 原始母带 WAV 保留在 `artifacts/audio-drafts/`
  - 压缩运行时 `.m4a`（AAC）位于 `src/game/audio/media/`，由 [tools/compress-audio.sh](../tools/compress-audio.sh) 生成（`dist/` 体积由约 46 MB 压缩至约 6.3 MB）

## 4. GitHub Actions 四端自动构建

工作流位于 [.github/workflows/release.yml](../.github/workflows/release.yml)：

- **手动触发**：在 GitHub 仓库的 `Actions` → `Build & Release (Desktop + Android)` 点击 `Run workflow`，构建完成后直接下载四端产物。
- **标签发布**：推送 `v*` 标签（例如 `git tag v0.1.0 && git push origin v0.1.0`），自动构建四端并生成草稿 GitHub Release。

### Android 正式签名（可选，建议公开分发前配置）

1. 本地生成正式 Keystore：
   ```sh
   keytool -genkeypair -v -keystore unstable-mage.keystore -alias unstable-mage \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
2. 转成 Base64：
   ```sh
   base64 -i unstable-mage.keystore | pbcopy
   ```
3. 在 GitHub 仓库 `Settings → Secrets and variables → Actions` 中添加 4 个 Secret：
   - `ANDROID_KEYSTORE_BASE64`
   - `ANDROID_KEYSTORE_PASSWORD`
   - `ANDROID_KEY_ALIAS`
   - `ANDROID_KEY_PASSWORD`

未配置上述 Secret 时，CI 会使用临时测试密钥自动签出 `unstable-mage-android-test-signed.apk` 供直接装机试玩（注意测试签名包不支持跨构建覆盖安装，正式分发请配置固定 Keystore）。

## 5. 平台已知注意事项

- **macOS 未公证安装包**：首次打开若提示“无法验证开发者”，可在“系统设置 → 隐私与安全性”点击“仍要打开”，或右键应用选择“打开”。
- **Windows SmartScreen**：未购买商业代码签名证书前，首次安装需点击“更多信息 → 仍要运行”。
- **Linux WebKitGTK**：`.deb` 包已声明 `gstreamer1.0-plugins-good` 与 `gstreamer1.0-libav` 以支持 `.m4a` 音频；极少数 NVIDIA + Wayland 环境若遇黑屏，可尝试 `WEBKIT_DISABLE_DMABUF_RENDERER=1` 启动。
- **桌面端交互**：生产桌面版默认拦截右键菜单、刷新（`F5`/`Cmd+R`/`Ctrl+R`）与页面缩放快捷键，按 `F11` 可切换全屏；窗口失焦继续沿用自动暂停并停止游戏循环的规则。
