"""Build a self-contained listening page from the rendered WAV manifest."""

from html import escape
import json
from pathlib import Path
import wave

import numpy as np

OUT = Path(__file__).resolve().parents[2] / "artifacts/audio-drafts"


def waveform(file):
    with wave.open(str(OUT / file)) as f:
        pcm = np.frombuffer(f.readframes(f.getnframes()), dtype="<i2").astype(float)
        pcm = pcm.reshape(-1, f.getnchannels())
    chunks = np.array_split(pcm, 100)
    heights = np.array([np.sqrt(np.mean(c ** 2)) for c in chunks])
    heights = np.maximum(2, heights / max(np.max(heights), 1) * 40)
    rects = ''.join(f'<rect x="{i*5+1}" y="{44-h:.1f}" width="3" height="{h*2:.1f}" rx="1.5"/>' for i, h in enumerate(heights))
    return f'<svg class="wave" viewBox="0 0 500 88" aria-hidden="true">{rects}</svg>'


def make_preview():
    manifest = json.loads((OUT / "manifest.json").read_text())
    music = [a for a in manifest["assets"] if a["group"] == "music" and a["loop"]]
    themes = [a for a in manifest["assets"] if a["group"] == "music" and "theme" in a["tags"]]
    effects = [a for a in manifest["assets"] if a["group"] == "sfx"]
    descriptions = {
        "menu_loop": "空灵晶体、缓慢和弦与低声脉冲。法阵尚未醒来。",
        "battle_loop": "主题旋律、跳动低音与轻打击乐。让法术保留前景。",
        "boss_loop": "更密的节奏、低音五度与沉重鼓点。魔核开始回应。",
    }
    colors = {"menu_loop": "#9dbfd0", "battle_loop": "#d8ae73", "boss_loop": "#b9a2e3"}
    cards = []
    for i, a in enumerate(music):
        cards.append(f'''<article class="music-card" style="--tint:{colors[a['id']]}">
          <div class="card-top"><span class="eyebrow">0{i+1} / {a['duration']:.0f} 秒</span><span class="chip">96 BPM</span></div>
          <h3>{escape(a['title'])}</h3><p>{descriptions[a['id']]}</p>
          {waveform(a['file'])}
          <audio controls preload="none" data-music data-loop="true" src="{a['file']}" aria-label="{escape(a['title'])}"></audio>
          <div class="card-bottom"><label><input type="checkbox" checked class="loop-check"> 循环试听</label><a href="{a['file']}" download>下载 WAV ↗</a></div>
        </article>''')
    theme_cards = []
    for a in themes:
        jumps = ''.join(f'''<button type="button" data-theme-seek="{s['start_seconds']}"><small>{int(s['start_seconds']//60)}:{int(s['start_seconds']%60):02d}</small>{escape(s['title'].split(' · ')[0])}</button>''' for s in a['sections'])
        theme_cards.append(f'''<article class="music-card theme-card" style="--tint:#d8ba85">
          <div class="card-top"><span class="eyebrow">THEME / 完整主题曲 · 2 分 40 秒</span><span class="chip">96 BPM · 64 小节</span></div>
          <h3>{escape(a['title'])}</h3><p>沿用 Boss 战的主题与音色，展开为前奏、主题、过渡、再现、高潮与尾声。完整曲目，默认单次播放。</p>
          {waveform(a['file'])}
          <audio controls preload="none" data-music data-theme data-loop="false" src="{a['file']}" aria-label="{escape(a['title'])}"></audio>
          <div class="theme-sections" aria-label="主题曲段落">{jumps}</div>
          <div class="card-bottom"><span>原版 Boss 战音乐保留在下方</span><a href="{a['file']}" download>下载主题曲 WAV ↗</a></div>
        </article>''')
    groups = [
        ("fire", "01", "火焰", "喷燃 / 爆裂 / 推进", "#eaa375"),
        ("ice", "02", "冰霜", "破空 / 结晶 / 碎裂", "#90cce3"),
        ("lightning", "03", "闪电", "电弧 / 贯雷 / 放电", "#c1a4ee"),
        ("common", "04", "战斗与界面", "受伤 / 强化 / 胜负", "#c6c88c"),
    ]
    sections = []
    for key, number, label, desc, color in groups:
        group = [a for a in effects if key in a['tags']] if key != "common" else [a for a in effects if not any(k in a['tags'] for k in ("fire", "ice", "lightning"))]
        rows = []
        for a in group:
            rows.append(f'''<div class="sound-row"><div class="sound-name">{escape(a['title'])}<small>{a['duration']:.2f} 秒</small></div>
              <audio controls preload="none" src="{a['file']}" aria-label="{escape(a['title'])}"></audio>
              <a href="{a['file']}" download aria-label="下载 {escape(a['title'])}">↓</a></div>''')
        sections.append(f'''<section class="sound-group" style="--tint:{color}"><div class="group-heading"><span>{number}</span><div><h3>{label}</h3><p>{desc}</p></div><span class="count">{len(group)} 个</span></div>{''.join(rows)}</section>''')
    html = '''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>失控法师 · 声音试验室</title>
<style>
:root{color-scheme:dark;font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#101318;color:#e7e4dd}*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 78% 0%,#293b443d,transparent 50%),radial-gradient(ellipse at 4% 55%,#34254122,transparent 50%),#101318}main{max-width:1160px;margin:auto;padding:54px 32px 40px}a{color:inherit;text-decoration:none}a:hover{color:#fff}header{border-bottom:1px solid #ffffff17;padding-bottom:36px;position:relative;overflow:hidden}.eyebrow{font-size:11px;letter-spacing:2px;color:#aaa79d}h1{font-size:clamp(30px,5vw,54px);font-weight:500;letter-spacing:3px;margin:20px 0 16px}h1 em{font-style:normal;color:#d5ba86}header p{max-width:680px;line-height:1.9;color:#a4abb4;margin:0;font-size:14px}.stats{display:flex;gap:26px;margin-top:28px;color:#8d96a1;font-size:12px}.stats strong{font-weight:500;font-size:20px;color:#d5ba86;margin-right:6px}.section-head{display:flex;align-items:center;justify-content:space-between;gap:20px;margin:40px 0 20px}h2{font-size:19px;letter-spacing:1px;font-weight:500;margin:0}.section-head p{color:#798390;font-size:12px;margin:0}.music-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.music-card{background:linear-gradient(145deg,#232a3290,#181d24);border:1px solid #ffffff13;border-top:2px solid var(--tint);padding:22px;border-radius:12px}.card-top{display:flex;align-items:center;justify-content:space-between;gap:12px}.chip{color:var(--tint);border:1px solid #ffffff18;border-radius:20px;padding:4px 8px;font-size:10px;white-space:nowrap}h3{font-size:17px;font-weight:500;margin:23px 0 12px}.music-card p{color:#9aa4b0;font-size:12px;line-height:1.8;min-height:44px;margin:0}.wave{display:block;width:100%;height:72px;margin:20px 0 8px;fill:var(--tint);opacity:.6}audio{width:100%;height:36px}.card-bottom{display:flex;align-items:center;justify-content:space-between;font-size:11px;color:#8994a0;margin-top:16px}.card-bottom label{display:flex;align-items:center;gap:5px;cursor:pointer}input{accent-color:#d5ba86}.sampler{display:flex;align-items:center;gap:30px;padding:22px 24px;border:1px solid #d5ba8630;background:#d5ba8608;border-radius:10px;margin-bottom:22px}.sampler div{flex:1}.sampler strong{font-size:15px;font-weight:500;color:#d8c296}.sampler p{font-size:12px;color:#8994a0;line-height:1.8;margin:8px 0 0}.sampler audio{width:350px}.sound-grid{display:grid;grid-template-columns:1fr 1fr;gap:22px}.sound-group{background:#171c23;border:1px solid #ffffff10;border-radius:12px;overflow:hidden}.group-heading{display:flex;gap:17px;align-items:center;padding:23px 22px;border-bottom:1px solid #ffffff10}.group-heading>span:first-child{font-size:28px;font-weight:300;color:var(--tint);opacity:.7}.group-heading h3{margin:0 0 7px;color:var(--tint)}.group-heading p{font-size:11px;color:#818c99;margin:0;letter-spacing:1px}.count{margin-left:auto;font-size:11px;color:#818c99}.sound-row{display:grid;grid-template-columns:minmax(130px,1fr) 235px 22px;gap:12px;align-items:center;padding:13px 20px;border-bottom:1px solid #ffffff08}.sound-row:last-child{border-bottom:0}.sound-name{font-size:12px;color:#cad0d8}.sound-name small{display:block;margin-top:5px;font-size:10px;color:#73808e}.sound-row>a{font-size:18px;color:#818c99;text-align:right}footer{border-top:1px solid #ffffff10;margin-top:36px;padding-top:22px;color:#7e8995;font-size:12px;line-height:1.9}.toolbar{display:flex;gap:20px;align-items:center;margin-top:25px}.toolbar button{background:#d5ba8610;border:1px solid #d5ba8638;color:#d8c296;border-radius:7px;padding:8px 14px;cursor:pointer}.toolbar label{font-size:12px;color:#a4abb4;display:flex;align-items:center;gap:10px}.toolbar input{max-width:140px}.status{color:#8c97a4;font-size:12px;min-height:18px;margin-top:12px}@media(max-width:1000px){.sound-grid{grid-template-columns:1fr}.sound-row{grid-template-columns:1fr 260px 24px}}@media(max-width:760px){main{padding:30px 18px}.music-grid{grid-template-columns:1fr}.music-card p{min-height:0}.sampler{flex-direction:column;align-items:stretch;gap:16px}.sampler audio{width:100%}.section-head{align-items:flex-start;flex-direction:column;gap:10px}.stats{gap:15px;flex-wrap:wrap}.sound-row{grid-template-columns:1fr 22px;gap:8px}.sound-row audio{grid-column:1/-1;grid-row:2}.sound-row>a{grid-column:2;grid-row:1}.toolbar{flex-wrap:wrap}.group-heading{padding:20px}}
.theme-card{margin-top:30px;padding:26px 28px;background:linear-gradient(115deg,#3a302a70,#202532);border-top-color:#d8ba85}.theme-card h3{font-size:23px;margin-top:22px}.theme-card p{min-height:0}.theme-card .wave{height:80px;margin-top:16px}.theme-sections{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-top:18px}.theme-sections button{color:#c9ba9e;background:#d8ba8508;border:1px solid #d8ba8525;border-radius:6px;padding:10px 8px;font:inherit;font-size:12px;text-align:left;cursor:pointer}.theme-sections button:hover{background:#d8ba851a;border-color:#d8ba8570}.theme-sections small{display:block;font-size:10px;color:#818b98;margin-bottom:6px}@media(max-width:760px){.theme-card{padding:22px}.theme-sections{grid-template-columns:repeat(3,1fr)}}
</style></head><body><main>
<header><div class="eyebrow">UNSTABLE MAGE / AUDIO STUDIES · VOL. 01</div><h1>失控法师 <em>声音试验室</em></h1>
<p>古老法阵里的电子魔法。先听音色，再决定它如何进入战斗。这里的音乐与音效均为原创离线合成小样，尚未接入游戏。</p>
<div class="stats"><span><strong>34</strong> 个音效</span><span><strong>3</strong> 段循环音乐</span>__THEME_STAT__<span><strong>44.1</strong> kHz / 无损 WAV</span></div>
<div class="toolbar"><button id="stop" type="button">停止播放</button><label>试听音量 <input id="volume" type="range" min="0" max="1" step="0.01" value="0.6" aria-label="试听音量"></label></div><div class="status" id="status" role="status">点击播放器开始试听。每次只播放一个声音。</div></header>
__THEME__
<div class="section-head"><h2>主题与场景音乐</h2><p>共同主题 · D 小调色彩 · 96 BPM · 4/4 拍</p></div>
<div class="music-grid">__MUSIC__</div>
<div class="section-head"><h2>法术与战斗反馈</h2><p>普攻三种变体、命中两种变体，另有 E / Q 与特殊反馈</p></div>
<div class="sampler"><div><strong>25 秒音效速览</strong><p>按火焰 → 冰霜 → 闪电 → 受伤与护盾 → 清波与强化 → Boss 登场排列。各声音之间留有短暂停顿。</p></div><audio controls preload="none" src="sfx_sampler.wav" aria-label="音效速览"></audio></div>
<div class="sound-grid">__SOUNDS__</div>
<footer>文件已检查：可读取、非静音、无满幅削波，音效首尾与音乐循环端点符合制作约束。听感、实际浏览器循环与手机外放仍待试听。Q 是完整声音概念，后续接入时需按实际技能阶段拆分同步。<br><a href="README.md">制作说明 ↗</a>　·　<a href="manifest.json">素材清单 ↗</a></footer>
</main><script>
const players = Array.from(document.querySelectorAll('audio'));
const volume = document.getElementById('volume');
const status = document.getElementById('status');
function stopAll(reset = true) { for (const p of players) { p.pause(); if (reset) p.currentTime = 0; } }
for (const p of players) {
  p.volume = Number(volume.value);
  p.loop = p.dataset.loop === 'true';
  p.addEventListener('play', () => {
    for (const other of players) if (other !== p) other.pause();
    status.textContent = '正在试听：' + p.getAttribute('aria-label');
  });
  p.addEventListener('error', () => { status.textContent = '文件读取失败，请使用本地试听服务或直接打开 WAV 文件。'; });
  p.addEventListener('ended', () => { status.textContent = '播放结束。'; });
}
for (const box of document.querySelectorAll('.loop-check')) box.addEventListener('change', () => { box.closest('article').querySelector('audio').loop = box.checked; });
const theme = document.querySelector('audio[data-theme]');
let pendingThemeSeek = null;
for (const button of document.querySelectorAll('[data-theme-seek]')) button.addEventListener('click', () => {
  if (!theme) return;
  if (pendingThemeSeek) theme.removeEventListener('loadedmetadata', pendingThemeSeek);
  const jump = () => {
    pendingThemeSeek = null;
    theme.currentTime = Number(button.dataset.themeSeek);
    theme.play().catch(() => { status.textContent = '请点击主题曲播放器开始播放。'; });
  };
  if (theme.readyState >= 1) jump();
  else { pendingThemeSeek = jump; theme.addEventListener('loadedmetadata', jump, {once:true}); theme.load(); }
});
volume.addEventListener('input', () => { for (const p of players) p.volume = Number(volume.value); });
document.getElementById('stop').addEventListener('click', () => { stopAll(); status.textContent = '已停止播放。'; });
document.addEventListener('visibilitychange', () => { if (document.hidden) { stopAll(false); status.textContent = '页面隐藏，播放已暂停。'; } });
window.addEventListener('pagehide', () => stopAll(false));
</script></body></html>
'''.replace("__MUSIC__", ''.join(cards)).replace("__SOUNDS__", ''.join(sections)).replace("__THEME__", ''.join(theme_cards)).replace("__THEME_STAT__", '<span><strong>1</strong> 首主题曲</span>' if themes else '')
    (OUT / "index.html").write_text(html, encoding="utf-8")
    print("Built listening page", flush=True)


if __name__ == "__main__":
    make_preview()
