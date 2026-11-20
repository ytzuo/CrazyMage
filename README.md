# 失控法师 · 基础战斗原型

基于 TypeScript、Phaser 3 和 Vite 的浏览器基础战斗原型。

竞技场铺满浏览器窗口，去掉外围边框和侧栏；不展示标题、介绍或操作提示，保留暂停、重新开始、生命条、手机摇杆和右下角小地图。支持手机竖屏、横屏及安全区域，窗口缩放时画布和镜头同步调整。

地砖、法阵及装饰缓存为小纹理，避免每帧重新计算整张地图的矢量图形。暂停或失焦时停止渲染循环，继续后恢复；浏览器尺寸未变化时不重复调整画布。开发模式采样启动阶段的帧耗时，结果保存在游戏 canvas 的 `data-performance` 属性中，不增加界面文字。采样范围及限制见性能保障指南。

每个流派拥有专属大招，普通击杀充能，按 Q 或点击按钮释放。规则与验证见 [流派大招](docs/ultimates.md)。

四类怪物各有随机变种：死亡分裂、预警突刺、固定方向三连发、概率格挡。规则见 [怪物变种](docs/enemy-variants.md)。

## 启动

需要 Node.js 20.19+ 或 22.12+。

```sh
npm install
npm run dev
```

在浏览器打开终端显示的地址（默认 `http://localhost:5173`）。手机与电脑连接同一网络后，访问启动输出中的 Network 地址。手机浏览器使用左下角虚拟摇杆。

```sh
npm run typecheck
npm run build
npm run preview
```

生产文件生成在 `dist/`，可以部署到任意静态文件服务器，支持子目录部署。

## 当前操作

- WASD：移动，斜向速度保持一致。
- ↑ ↓ ← →：朝对应方向施放所选流派的普通攻击，点按一次，按住连续发射；支持斜向组合及边走边攻击。方向键不会移动角色。
- 手机等以触屏为主要输入的设备显示左下角摇杆：拖动移动，拖出摇杆后仍可控制。通过粗指针且无悬停能力检测；电脑端隐藏，缩窄窗口不会显示。
- E、Q 或对应按钮：释放流派小技能和大招。
- 构筑按钮、U：查看最终攻击参数与获取记录；查看时暂停，关闭后恢复之前的暂停状态。升级选择完成后才能继续。
- 暂停按钮、Esc、空格：暂停 / 继续。
- 回转箭头按钮：重新开始，回到中央、恢复满血并重置怪物和火球。
- 窗口失焦或切换标签页：自动暂停，点击继续探索恢复。

## 范围

在 [启动页](docs/launcher.md) 选择竞速或无尽、法师形象及火焰、冰霜或闪电流派。竞速共 20 波，无尽持续生成新波，两种模式各自保存流派最好成绩。清波时从本流派强化和通用被动中选择，Boss 波另有大招强化。规则见 [游戏模式与成绩](docs/game-modes.md) 和 [三流派强化对照](docs/upgrade-comparison.md)。

主菜单提供 [敌人图鉴](bestiary.html) 和 [强化图鉴](upgrades.html)，可查看敌人招式与强化效果。

核心伤害与碰撞检查可在支持 TypeScript 类型剥离的 Node.js 中运行：

```sh
npm test
```

本地开发服务还提供 `/tests/runtime.html`（真实法术运行器、组合与回收检查）和 `/tests/ui.html`（真实清波、选卡与暂停流程检查）；点击检查按钮执行，测试页不进入生产构建。

完整设计与当前验收条件见 [需求说明](docs/requirements.md)。

## 开发参考

- [攻击升级与组合设计](docs/attack-upgrade-design.md)：升级查看、法术模块、兼容规则、危险强化及后续实现计划。
- [升级兼容架构](docs/upgrade-architecture.md)：构筑计算、行为组合、战斗结算与当前实现范围。
- [性能保障指南](docs/performance-guide.md)：渲染、战斗循环、对象回收、暂停、启动与性能回归检查。
- [项目编码约定](AGENTS.md)：后续编码的需求与性能指南入口。
- [桌面与安卓打包发布](docs/packaging.md)：Tauri v2 四端本地打包、图标与音频维护及 GitHub Actions 自动构建。

## 结构

```text
docs/requirements.md          需求、首版范围、迭代计划
docs/performance-guide.md     性能目标、编码约束、验证流程
src/main.ts                   网页界面、游戏启动、暂停和窗口生命周期
src/style.css                 桌面和手机布局
src/game/config.ts            地图、角色参数、界面状态类型
src/game/input/MovementInput.ts 键盘 / 虚拟摇杆统一输入
src/game/entities/Player.ts    角色移动、边界与程序绘制外观
src/game/spells/FireballSpell.ts 定向火球、冷却、消散特效
src/game/enemies/EnemySystem.ts 怪物生成、追击、预警、伤害与回收
src/game/combat/Health.ts       生命值和受击保护
src/game/combat/collision.ts    防穿越碰撞检测
src/game/combat/DamageResolver.ts 命中来源、穿透与施法级溅射去重
src/game/upgrades/             升级定义、清波奖励队列、构筑与纯计算
src/game/enemies/WaveTracker.ts 每波实际怪物数与完成判定
src/ui/BuildPanel.ts           选卡预览、构筑和升级历史
src/game/scenes/ArenaScene.ts  地图、镜头、更新循环
```
