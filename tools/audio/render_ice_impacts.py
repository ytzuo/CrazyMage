"""Render two ice contacts and their short comparison; no game integration."""

import json
import wave

import numpy as np

from render_drafts import OUT, REPORT, SR, render_ice_impact, render_reel, verify_outputs


def main():
    path = OUT / "manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    for i in range(2):
        render_ice_impact(i)
    verify_outputs()
    replacements = {a["id"]:a for a in REPORT}
    manifest["assets"] = [replacements.get(a["id"],a) for a in manifest["assets"]]
    manifest["version"] = max(manifest.get("version",1),10)
    manifest["sampler"] = render_reel()
    order = ["ice_impact_01", "ice_impact_02"]
    parts = [np.zeros(round(.35*SR),dtype="<i2")]
    for name in order:
        with wave.open(str(OUT / "sfx" / f"{name}.wav")) as f:
            assert (f.getnchannels(),f.getframerate(),f.getsampwidth()) == (1,SR,2)
            parts.append(np.frombuffer(f.readframes(f.getnframes()),dtype="<i2"))
        parts.append(np.zeros(round(.60*SR),dtype="<i2"))
    pcm = np.concatenate(parts)
    with wave.open(str(OUT / "ice_impacts_comparison.wav"),"wb") as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
        f.writeframes(pcm.tobytes())
    manifest["ice_impact_comparison"] = {"file":"ice_impacts_comparison.wav",
                                        "duration":len(pcm)/SR,"order":order,
                                        "gap_seconds":.60}
    path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Updated two ice impacts and audition reels; other masters unchanged.")


if __name__ == "__main__":
    main()
