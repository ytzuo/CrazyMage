# 失控法师

《失控法师》使用 TypeScript 编写，Phaser 3 负责 2D 渲染、场景和战斗循环，Vite 负责本地开发与网页构建。网页版可静态部署，Tauri 2 将同一份网页产物打包为 macOS、Windows、Linux 和 Android 应用。

## 玩法与内容

在魔法试验场里边走位边施法，躲开敌人的攻击预警，清空波次后选卡强化。开局选择游戏模式、法师外观和流派，经过三秒倒计时进入战斗。普通清波的三选一涵盖本流派的普攻、小技能和通用被动，清完 Boss 波另有大招强化。

| 模式 | 目标 | 本地纪录 |
| --- | --- | --- |
| 竞速 | 清完 20 波，每 5 波迎战一位 Boss | 各流派最快通关时间 |
| 无尽 | 在持续变强的敌人波次中尽量打得更远，强化层数不限 | 各流派最多完成波数 |

| 流派 | 普通攻击 | E 小技能 | Q 大招 |
| --- | --- | --- | --- |
| 火焰 | 火球，可强化为多重、穿透、爆炸等组合 | 焰爆 | 焚天火墙 |
| 冰霜 | 穿透冰矛，以减速、冰片和冰棘控场 | 冰棘扇阵 | 永冬寒域 |
| 闪电 | 连锁闪电，可强化分叉和蓄雷印记 | 贯雷 | 雷暴追猎 |

竞技场有七类普通敌人及其变种，以及魔核守卫和裂隙织主两位 Boss。主菜单提供敌人图鉴和强化图鉴，可以逐招观看敌人演示，比较强化前后的数值与效果。

### 操作

- 键盘用 **WASD** 移动，按方向键定向普攻，可以边走边攻击。触屏用左下角摇杆移动，普攻自动瞄准有效目标。
- 按 **E** 或 **Q** 释放小技能或大招，也可以点对应按钮。E 随战斗时间充能，Q 通过有效击杀充能。
- 按 **U** 或点构筑按钮查看已取得的强化。按 **Esc**、**空格**或点暂停按钮可以暂停和继续。战斗中切到后台会自动暂停。

## 开发与维护

### 本地运行

需要 Node.js 20.19+（20.x）或 22.12+。安装依赖后启动开发服务，在浏览器打开终端显示的地址，默认是 `http://localhost:5173`。

```sh
npm install
npm run dev
```

使用 `npm run typecheck` 检查类型，在 Node.js 22 下使用 `npm test` 运行测试，`npm run build` 生成 `dist/`，`npm run preview` 本地预览构建结果。开发服务也提供 [法术运行检查](tests/runtime.html) 和 [战斗界面检查](tests/ui.html)。桌面和 Android 的开发、打包与发布流程见 [打包指南](docs/packaging.md)。

### 文档索引

| 分类 | 文档 |
| --- | --- |
| 项目约定与发布 | [项目编码约定](AGENTS.md)、[需求说明](docs/requirements.md)、[性能保障指南](docs/performance-guide.md)、[桌面与安卓打包发布](docs/packaging.md) |
| 玩法、界面与图鉴 | [竞速与无尽模式](docs/game-modes.md)、[游戏启动页](docs/launcher.md)、[敌人图鉴](docs/bestiary.md)、[强化图鉴](docs/upgrade-guide.md)、[升级选项卡布局](docs/reward-card-layout.md)、[E/Q 技能按钮布局](docs/skill-hud-layout.md) |
| 流派与技能 | [火冰电三流派设计](docs/schools-design.md)、[E 小技能](docs/school-skills.md)、[Q 大招](docs/ultimates.md)、[火焰路线](docs/fire-routes.md)、[冰霜路线](docs/ice-routes.md)、[闪电路线](docs/lightning-routes.md) |
| 强化与构筑 | [攻击升级与组合设计](docs/attack-upgrade-design.md)、[升级兼容架构](docs/upgrade-architecture.md)、[三流派强化对照](docs/upgrade-comparison.md) |
| 敌人与 Boss | [小怪移动](docs/enemy-movement.md)、[怪物变种](docs/enemy-variants.md)、[咒印投手](docs/area-enemy.md)、[爆核傀儡与魔核祭司](docs/special-enemies.md)、[魔核守卫](docs/bosses.md)、[裂隙织主](docs/rift-weaver.md) |
| 美术、动作与战斗反馈 | [角色与敌人贴图](docs/character-art.md)、[追击怪与分裂怪四肢](docs/chaser-art.md)、[长袍角色与双脚](docs/player-limbs.md)、[初始数值与攻击动作](docs/actions.md)、[法术攻击美术](docs/spell-art.md)、[战斗与选择反馈](docs/combat-feedback.md) |
| 音频接入与制作 | [游戏音效与音乐接入](docs/audio-integration.md)、[音频小样总览](artifacts/audio-drafts/README.md)、[主题曲段落衔接](artifacts/audio-drafts/theme-transitions.md)、[玩家受伤音效](artifacts/audio-drafts/player-hurt.md)、[原始录音来源](artifacts/audio-drafts/sources/README.md) |
