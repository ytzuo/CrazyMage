# 玩家受击真人录音来源

四个受击音效使用分别录制的男声与女声，每种性别各两段独立发声；不会把同一声源转换为另一性别。为少年少女的角色方向，小幅提调 0.5–1.5 个半音并同步缩短时长。此方向不表示录音者实际年龄。2026-10-04 查询时，以下 OpenGameArt 页面均明确标注 [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)。作者原始录音经过截取、小幅变速提调、低频收整、采样率转换、首尾淡化和电平调整；未生成或模仿特定人物声音。

| 本地来源文件 | 作者及作品 | 原始下载 | 保存内容 |
| --- | --- | --- | --- |
| [player_hurt_male.wav](player_hurt_male.wav) | qubodup，[15 vocal male strain/hurt/pain/jump sounds](https://opengameart.org/content/15-vocal-male-strainhurtpainjump-sounds) | [slightscreams.7z](https://opengameart.org/sites/default/files/slightscreams.7z) | 包内 `slightscream-01.flac` 完整解码，44.1 kHz，16 位 PCM |
| [player_hurt_female.wav](player_hurt_female.wav) | AuraVoice，上传账号 Nocturnal_Vanguard，[Female Hurt Grunts & Groans](https://opengameart.org/content/female-hurt-grunts-groans) | [female_hurt_grunts_groans_1.ogg](https://opengameart.org/sites/default/files/female_hurt_grunts_groans_1.ogg) | 原录音 3.70–4.12 秒，48 kHz，16 位 PCM |

第二版本新增来源：

- [player_hurt_male_02.wav](player_hurt_male_02.wav)：同一男声压缩包的 `slightscream-03.flac`，完整解码。该 FLAC 的 SHA-256 为 `4d150f341ac621a7d8b6d0891d946c6c934964b0b5ef06a00ffe24ddacfea235`。
- [player_hurt_female_02.wav](player_hurt_female_02.wav)：同一女声 OGG 的 2.08–2.55 秒，独立于第一版本使用的第三段发声。许可与作者沿用上表。

男声页面注明自 2024-08-30 起按 CC0 提供。女声页面作者说明这些音效来自自己过去项目的录音。保留上述作者与来源，方便后续追溯；不得将这两个音效描述为本项目原创人声。

原始下载内容 SHA-256：

- 男声包内 `slightscream-01.flac`：`f7ed88189eb9861384fbcf984733be9702f0ed8b0d0724fba34928b13289d91a`
- 女声原始 OGG：`80a9fb09203bb8feb065ba15197609b118cbe167c9a2264670a31ee22c384adb`

本地来源 WAV 的校验值、最终剪辑起点与长度在[素材清单](../manifest.json)各受击条目的 `source` 中记录。重新生成仅需仓库中的 WAV 和 NumPy，无需联网或重新下载。来源解码使用 SoundFile 0.13.1，输出不依赖其运行时。
