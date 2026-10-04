"""Arrange a continuous 64-bar theme with bar-aligned backing handovers.

Reuse the Boss master with phrase-length fades and continuous reprise/climax
playback; synthesize connective voicings and a cadence. Never runs in game.
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


def backing(dst, boss, source_bar, start_bar, end_bar, gain, fade_in, fade_out):
    """Continue the source's own beat/phrase through a section boundary."""
    count = round((end_bar - start_bar) * BAR * SR)
    segment = np.empty((count, 2))
    cursor = 0
    source = round(source_bar * BAR * SR) % len(boss)
    while cursor < count:
        size = min(count - cursor, len(boss) - source)
        segment[cursor:cursor + size] = boss[source:source + size]
        cursor += size
        source = 0
    # Whole-bar overlap preserves rhythm; only source phrase endpoints fade.
    place(dst, fade(segment, fade_in * BAR, fade_out * BAR), start_bar * BAR, gain)


def render_transition_preview():
    with wave.open(str(OUT / "music" / f"{ID}.wav")) as f:
        pcm = np.frombuffer(f.readframes(f.getnframes()), dtype="<i2").reshape(-1, 2)
    windows = []
    chunks = [np.zeros((round(.35 * SR), 2), dtype="<i2")]
    cursor = .35
    for previous, current in zip(SECTIONS, SECTIONS[1:]):
        at = current[1] * BAR
        start, end = at - 3, at + 3
        # Keep the boundary itself untouched; fade only audition clip edges.
        clip = pcm[round(start * SR):round(end * SR)].astype(float)
        clip = np.rint(fade(clip, .025, .050)).astype("<i2")
        chunks.extend((clip, np.zeros((round(.65 * SR), 2), dtype="<i2")))
        windows.append({"title": previous[0].split(" · ")[0] + " → " + current[0].split(" · ")[0],
                        "boundary_seconds": at, "source_start_seconds": start,
                        "source_end_seconds": end, "preview_start_seconds": round(cursor, 2)})
        cursor += 6.65
    preview = np.concatenate(chunks)
    filename = "theme_transitions.wav"
    with wave.open(str(OUT / filename), "wb") as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
        f.writeframes(preview.tobytes())
    return {"file": filename, "duration": len(preview) / SR, "windows": windows}


def render_theme():
    boss = read_boss()
    dst = np.zeros((round(64 * BAR * SR), 2))
    atmosphere = np.zeros_like(dst)
    drums = {k: percussion(k) for k in ("kick", "snare", "hat", "open", "tom", "metal")}

    # The pickup follows the intro's A harmony, then continues into source D.
    # Theme drums enter over 15–22.5 s and leave over 55–62.5 s.
    backing(dst, boss, 30, 6, 25, .83, 3, 3)
    # Reprise and climax share one continuous source, including its loop seam.
    # Re-enter over 75–82.5 s; leave room for a composed A7 cadence at bar 59.
    backing(dst, boss, 14, 30, 59, .86, 3, 1)

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
        # The backing's own pickup handles bar 7, avoiding doubled drum fills.

    # The bridge's texture takes over before the outgoing drums become quiet.
    for bar in (22, 23):
        root, voicing = CHORDS[(bar - 8) % 8]
        chord(atmosphere, bar, voicing, .09 if bar == 22 else .12, sustain=.76)
        for beat in (0, 1.5, 2.75):
            place(atmosphere, bass(root, .55), bar * BAR + beat * BEAT,
                  .08 if bar == 22 else .12)
    melody(atmosphere, 23, [(2.5, 69, .4), (3.25, 72, .5)], .10, 0, -.22)

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
        # Retain a quiet pulse as the source drums leave and later return.
        for beat in (1.5, 2.75):
            place(atmosphere, bass(root, .45), bar * BAR + beat * BEAT, .07)
        if local % 2 == 0:
            melody(atmosphere, bar, MOTIF if local % 4 == 0 else ANSWER, .22, 12, -.22, 1.4)
        for i, midi in enumerate((voicing[2] + 12, voicing[4], voicing[1] + 12)):
            place(atmosphere, pluck(midi, 1.0, 2), bar * BAR + (.5 + i) * BEAT,
                  .06, (-1 if i % 2 else 1) * .62)
        if local >= 4:
            for i in range(8):
                place(atmosphere, drums["hat"], bar * BAR + i * .5 * BEAT,
                      .08 + (local - 4) * .045, (-1 if i % 2 else 1) * .30)
        # The continuing source supplies the final pickup into the reprise.

    # Reprise keeps the source's second half; the added high reply grows into climax.
    for bar in range(40, 48, 2):
        melody(atmosphere, bar + 1, [(0, 74, .8), (1.5, 77, .8), (2.75, 76, 1)],
               .075 + (bar - 40) * .007, 0, -.35)

    # Climax: retain source drums and bass, add an octave theme and sustained lead.
    for bar in range(48, 60):
        root, voicing = CHORDS[(bar - 48) % 8]
        if bar == 58:
            root, voicing = 43, [55, 58, 62, 65, 69]  # G minor prepares A7.
        elif bar == 59:
            root, voicing = 45, [49, 55, 57, 64, 69]  # C# resolves to coda D.
        entrance = min(1, .5 + (bar - 48) * .25)
        chord(atmosphere, bar, voicing, .046 * entrance if bar < 58 else .13,
              sustain=1 if bar < 59 else .56)
        if bar >= 58:
            for beat in (0, 1.5, 2.5):
                place(atmosphere, bass(root, .55, True), bar * BAR + beat * BEAT, .20)
                place(atmosphere, drums["kick"], bar * BAR + beat * BEAT, .17 if bar == 58 else .10)
        if bar % 2 == 0:
            melody(atmosphere, bar, MOTIF if bar % 4 == 0 else ANSWER,
                   .19 * entrance, 12, -.14)
        else:
            for beat, midi, duration in ((.5, voicing[2] + 12, .55),
                                         (1.75, voicing[3] + 12, .65),
                                         (3, voicing[4], .75)):
                place(atmosphere, pluck(midi, duration * BEAT + .5, 1),
                      bar * BAR + beat * BEAT, .11 * entrance, .35)
        if bar % 4 == 0:
            place(atmosphere, drums["metal"], bar * BAR, .25, -.40)
        for beat in (1.5, 3.5):
            place(atmosphere, drums["open"], bar * BAR + beat * BEAT, .17, .48)
        # Broader melodic notes turn the short attack cell into a title melody.
        if bar in (50, 54):
            place(atmosphere, pad(voicing[3] + 12, BAR * 1.3, .4), bar * BAR,
                  .13, -.26)
    # A quiet E-C# pickup makes the final D feel resolved rather than interrupted.
    melody(atmosphere, 59, [(2, 76, .5), (3, 73, .6)], .12, 0, -.12)

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
    manifest["version"] = max(manifest.get("version", 1), 17)
    manifest["assets"] = [a for a in manifest["assets"] if a["id"] != ID] + [record]
    manifest["music"]["theme_master"] = "WAV, 64 bars, intro and resolved coda; not a loop"
    manifest["theme_transitions"] = render_transition_preview()
    manifest["validation"]["theme_length_and_endpoints"] = True
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Verified theme: 160 seconds, 64 bars; original Boss master unchanged.", flush=True)


if __name__ == "__main__":
    render_theme()
