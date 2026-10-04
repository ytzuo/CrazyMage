"""Render only five lightning basic sounds and a consecutive audition reel."""

import json
import wave

import numpy as np

from render_drafts import OUT, REPORT, SR, render_lightning_variant, render_reel, verify_outputs


def render_comparison():
    order = ["lightning_cast_01", "lightning_cast_02", "lightning_cast_03",
             "lightning_impact_01", "lightning_impact_02"]
    parts = [np.zeros(round(.35*SR), dtype="<i2")]
    for name in order:
        with wave.open(str(OUT / "sfx" / f"{name}.wav")) as f:
            assert (f.getnchannels(), f.getframerate(), f.getsampwidth()) == (1, SR, 2)
            parts.append(np.frombuffer(f.readframes(f.getnframes()), dtype="<i2"))
        parts.append(np.zeros(round(.60*SR), dtype="<i2"))
    pcm = np.concatenate(parts)
    with wave.open(str(OUT / "lightning_variants_comparison.wav"), "wb") as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
        f.writeframes(pcm.tobytes())
    return {"file":"lightning_variants_comparison.wav", "duration":len(pcm)/SR,
            "order":order, "gap_seconds":.60}


def main():
    path = OUT / "manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    for i in range(3):
        render_lightning_variant("cast", i)
    for i in range(2):
        render_lightning_variant("impact", i)
    verify_outputs()
    replacements = {a["id"]:a for a in REPORT}
    manifest["version"] = max(manifest.get("version", 1), 7)
    manifest["assets"] = [replacements.get(a["id"], a) for a in manifest["assets"]]
    manifest["sampler"] = render_reel()
    manifest["lightning_comparison"] = render_comparison()
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print("Updated five lightning variants and two audition reels; other masters unchanged.")


if __name__ == "__main__":
    main()
