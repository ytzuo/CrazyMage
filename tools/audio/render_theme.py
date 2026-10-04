"""Expand the existing Boss WAV into a 64-bar, non-looping title theme.

The complete 32-bar Boss arrangement is retained across two sections. New intro,
interlude, layered climax and resolved coda are synthesized using its sound palette.
Requires the existing drafts and NumPy; does not touch game code.
"""

import json
import wave

import numpy as np

from render_drafts import (
    OUT, SR, BEAT, BPM, CHORDS, REPORT, bass, fade, pad, percussion,
    place, pluck, room, save, verify_outputs,
)

ID = "unstable_mage_theme"
BAR = 4 * BEAT
SECTIONS = [
    ("前奏 · 法阵唤醒", 0, 8),
    ("主题 · 魔核苏醒", 8, 24),
    ("过渡 · 核心回响", 24, 32),
    ("再现 · 失控试验", 32, 48),
    ("高潮 · 魔力奔涌", 48, 60),
    ("尾声 · 余光", 60, 64),
]
MOTIF = [(0, 62, 1), (.75, 65, .7), (1.5, 64, .9), (2.75, 57, 1.1)]
ANSWER = [(0, 60, 1), (.75, 57, .7), (1.5, 55, .9), (2.75, 62, 1.1)]


def read_boss():
    with wave.open(str(OUT / "music/boss_loop.wav")) as f:
        assert f.getframerate() == SR and f.getnchannels() == 2
        assert f.getsampwidth() == 2 and f.getnframes() == round(32 * BAR * SR)
        return np.frombuffer(f.readframes(f.getnframes()), dtype="<i2").reshape(-1, 2).astype(float) / 32767


def chord(dst, bar, voicing, gain, sustain=1, offset=0):
    for i, midi in enumerate(voicing):
        place(dst, pad(midi, BAR * sustain + .9, i * .63), bar * BAR + offset,
              gain, (i - (len(voicing) - 1) / 2) * .27)


def melody(dst, bar, pattern, gain, transpose=0, pan=0, stretch=1):
    for beat, midi, duration in pattern:
        place(dst, pluck(midi + transpose, duration * BEAT * stretch + .7, 2),
              bar * BAR + beat * BEAT * stretch, gain, pan)


def render_theme():
    boss = read_boss()
    dst = np.zeros((round(64 * BAR * SR), 2))
    atmosphere = np.zeros_like(dst)
    drums = {k: percussion(k) for k in ("kick", "snare", "hat", "open", "tom", "metal")}

    # Preserve both halves of the existing composition, with small transition fades.
    midpoint = round(16 * BAR * SR)
    place(dst, fade(boss[:midpoint], .05, .28), 8 * BAR, .83)
    place(dst, fade(boss[midpoint:], .05, .28), 32 * BAR, .86)
    place(dst, fade(boss[:round(12 * BAR * SR)], .05, .22), 48 * BAR, .88)

    # Intro: gradually reveal the source arpeggio, low fifth and four-note theme.
    for bar in range(8):
        root, voicing = CHORDS[bar]
        chord(atmosphere, bar, voicing, .075 + bar * .006)
        place(atmosphere, bass(root, 1.0), bar * BAR, .10 + bar * .02)
        if bar >= 2:
            melody(atmosphere, bar, MOTIF if bar % 4 < 2 else ANSWER,
                   .10 if bar < 4 else .15, 12 if bar < 4 else 0, .12)
        if bar >= 4:
            for i, index in enumerate((0, 2, 1, 3, 2, 4, 1, 3)):
                place(atmosphere, pluck(voicing[index] + 12, .7),
                      bar * BAR + (i * .5 + .125) * BEAT,
                      .032 + (bar - 4) * .008, (-1 if i % 2 else 1) * .55)
            for beat in (0, 2):
                place(atmosphere, drums["tom"], bar * BAR + beat * BEAT,
                      .10 + (bar - 4) * .025, 0)
        if bar == 7:
            for i in range(4):
                place(atmosphere, drums["tom"], bar * BAR + (3 + i * .25) * BEAT,
                      .13 + i * .025, (i - 1.5) * .20)

    # Interlude: thin the drums out and develop the motif over a contrasting voicing.
    bridge_chords = [
        (38, [50, 57, 62, 65, 76]), (38, [50, 57, 62, 65, 69]),
        (41, [53, 60, 65, 69, 72]), (41, [53, 60, 65, 67, 72]),
        (43, [55, 62, 65, 69, 74]), (43, [55, 62, 65, 70, 74]),
        (45, [57, 64, 67, 74, 76]), (45, [57, 64, 67, 69, 74]),
    ]
    for local, (root, voicing) in enumerate(bridge_chords):
        bar = 24 + local
        chord(atmosphere, bar, voicing, .12)
        place(atmosphere, bass(root, .95), bar * BAR, .14)
        if local % 2 == 0:
            melody(atmosphere, bar, MOTIF if local % 4 == 0 else ANSWER, .22, 12, -.22, 1.4)
        for i, midi in enumerate((voicing[2] + 12, voicing[4], voicing[1] + 12)):
            place(atmosphere, pluck(midi, 1.0, 2), bar * BAR + (.5 + i) * BEAT,
                  .06, (-1 if i % 2 else 1) * .62)
        if local >= 4:
            for i in range(8):
                place(atmosphere, drums["hat"], bar * BAR + i * .5 * BEAT,
                      .08 + (local - 4) * .045, (-1 if i % 2 else 1) * .30)
        if local == 7:
            for i in range(6):
                place(atmosphere, drums["tom"], bar * BAR + (2.5 + i * .25) * BEAT,
                      .13 + i * .02, (i % 3 - 1) * .35)

    # Reprise keeps the source's second half; the added high reply grows into climax.
    for bar in range(40, 48, 2):
        melody(atmosphere, bar + 1, [(0, 74, .8), (1.5, 77, .8), (2.75, 76, 1)],
               .075 + (bar - 40) * .007, 0, -.35)

    # Climax: retain source drums and bass, add an octave theme and sustained lead.
    for bar in range(48, 60):
        root, voicing = CHORDS[(bar - 48) % 8]
        chord(atmosphere, bar, voicing, .046)
        if bar % 2 == 0:
            melody(atmosphere, bar, MOTIF if bar % 4 == 0 else ANSWER,
                   .19, 12, -.14)
        else:
            for beat, midi, duration in ((.5, voicing[2] + 12, .55),
                                         (1.75, voicing[3] + 12, .65),
                                         (3, voicing[4], .75)):
                place(atmosphere, pluck(midi, duration * BEAT + .5, 1),
                      bar * BAR + beat * BEAT, .11, .35)
        if bar % 4 == 0:
            place(atmosphere, drums["metal"], bar * BAR, .25, -.40)
        for beat in (1.5, 3.5):
            place(atmosphere, drums["open"], bar * BAR + beat * BEAT, .17, .48)
        # Broader melodic notes turn the short attack cell into a title melody.
        if bar in (50, 54, 58):
            place(atmosphere, pad(voicing[3] + 12, BAR * 1.3, .4), bar * BAR,
                  .13, -.26)

    # Coda resolves back to D minor. Stop new notes early enough for a natural tail.
    chord(atmosphere, 60, [50, 57, 62, 65, 69], .16, sustain=2)
    place(atmosphere, drums["kick"], 60 * BAR, .27)
    place(atmosphere, bass(38, 1.3), 60 * BAR, .27)
    melody(atmosphere, 60, [(0, 74, 1), (1, 77, 1), (2, 76, 1), (3, 74, 2)], .21, 0, -.1)
    chord(atmosphere, 62, [50, 57, 62, 65], .10, sustain=1.65)
    place(atmosphere, pluck(74, 3.3, 2), 62 * BAR, .15, .18)
    place(atmosphere, pluck(62, 3.7, 2), 62 * BAR + BEAT, .16, -.15)

    dst += room(atmosphere, .38)
    dst = fade(dst, .65, 1.3)
    save(ID, "魔核苏醒 · 失控法师主题曲", "music", dst, .78, False,
         ["theme", "boss-derived", "original", "full-track"])
    record = REPORT[-1]
    record.update(bpm=BPM, bars=64, derived_from="boss_loop",
                  sections=[{"title": title, "start_seconds": first * BAR,
                             "end_seconds": last * BAR, "bars": last - first}
                            for title, first, last in SECTIONS])
    verify_outputs()
    manifest_path = OUT / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["version"] = 2
    manifest["assets"] = [a for a in manifest["assets"] if a["id"] != ID] + [record]
    manifest["music"]["theme_master"] = "WAV, 64 bars, intro and resolved coda; not a loop"
    manifest["validation"]["theme_length_and_endpoints"] = True
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Verified theme: 160 seconds, 64 bars; original Boss master unchanged.", flush=True)


if __name__ == "__main__":
    render_theme()
