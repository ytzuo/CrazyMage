"""Render a short fire-wall round and a three-round audition; no game edits."""

import json
import wave

import numpy as np

from render_drafts import OUT, REPORT, SR, render_fire_pulse, render_reel, verify_outputs


def main():
    path = OUT / "manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    render_fire_pulse()
    verify_outputs()
    manifest["version"] = max(manifest.get("version", 1), 4)
    manifest["assets"] = [REPORT[0] if a["id"] == "fire_ultimate" else a
                          for a in manifest["assets"]]
    manifest["sampler"] = render_reel()
    # Explicit silence outside the preview; successive onsets are 450 ms apart.
    with wave.open(str(OUT / "sfx/fire_ultimate.wav")) as f:
        pulse = np.frombuffer(f.readframes(f.getnframes()), dtype="<i2")
    intro, interval, outro, rounds = .30, .45, .30, 3
    pcm = np.zeros(round((intro + interval * (rounds-1) + len(pulse)/SR + outro)*SR), dtype="<i2")
    onsets = [intro + i*interval for i in range(rounds)]
    for at in onsets:
        offset = round(at*SR)
        pcm[offset:offset+len(pulse)] = pulse
    with wave.open(str(OUT / "fire_wall_rounds_preview.wav"), "wb") as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
        f.writeframes(pcm.tobytes())
    manifest["fire_pulse_preview"] = {"file":"fire_wall_rounds_preview.wav",
                                     "duration":len(pcm)/SR, "rounds":rounds,
                                     "interval_seconds":interval,
                                     "onsets_seconds":onsets}
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print("Updated single-round fire Q and audition reels; other masters unchanged.")


if __name__ == "__main__":
    main()
