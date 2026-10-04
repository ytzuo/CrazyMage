"""Refresh player hurt masters and an alternating-hit audition, offline only."""

import json
import wave

import numpy as np

from render_drafts import OUT, REPORT, SR, PLAYER_HURT_VARIANTS, render_player_hurt, render_reel, verify_outputs


def render_preview():
    # Current player protection is 900 ms; audition successive accepted hits.
    interval, intro, outro = .90, .25, .35
    order = ["player_hurt_01", "player_hurt_03", "player_hurt_02", "player_hurt_04"]
    chunks = []
    for name in order:
        with wave.open(str(OUT / "sfx" / f"{name}.wav")) as f:
            assert f.getnchannels() == 1 and f.getframerate() == SR
            chunks.append(np.frombuffer(f.readframes(f.getnframes()), dtype="<i2"))
    onsets = [round(intro + i * interval, 2) for i in range(len(order))]
    pcm = np.zeros(round((onsets[-1] + len(chunks[-1]) / SR + outro) * SR), dtype="<i2")
    for at, chunk in zip(onsets, chunks):
        offset = round(at * SR)
        pcm[offset:offset + len(chunk)] = chunk
    filename = "player_hurt_preview.wav"
    with wave.open(str(OUT / filename), "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(pcm.tobytes())
    return {"file": filename, "duration": len(pcm) / SR, "order": order,
            "interval_seconds": interval, "onsets_seconds": onsets}


def main():
    path = OUT / "manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    for index in range(len(PLAYER_HURT_VARIANTS)):
        render_player_hurt(index)
    verify_outputs()
    replacements = {a["id"]: a for a in REPORT}
    assets = []
    for a in manifest["assets"]:
        if a["id"] == "player_hurt_01":
            assets.extend(replacements[name] for name in
                          ("player_hurt_01", "player_hurt_03", "player_hurt_02", "player_hurt_04"))
        elif a["id"] not in replacements:
            assets.append(a)
    manifest["assets"] = assets
    manifest["version"] = max(manifest.get("version", 1), 13)
    manifest["title"] = "失控法师 · 音频小样"
    manifest["method"] = "Offline NumPy synthesis with four edited CC0 human vocal takes; see sources/README.md."
    manifest["sampler"] = render_reel()
    manifest["player_hurt_preview"] = render_preview()
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Updated four player hurt masters, sampler and four-version preview.")


if __name__ == "__main__":
    main()
