"""Restrained battle rewrite around the existing D–F–E–A cell. Offline only."""

import hashlib
import json
import platform
import wave

import numpy as np

from render_drafts import OUT, SR, REPORT, bass, pad, percussion, place, pluck, room, save

BPM = 100
BEAT = 60 / BPM
BAR = BEAT * 4
BARS = 32
MOTIF = [(0, 74, .7), (.75, 77, .55), (1.5, 76, .8), (2.75, 69, .85)]
ANSWER = [(.25, 72, .65), (1, 69, .6), (2, 67, .5), (2.75, 69, .45), (3.5, 74, .4)]
LIFT = [(0, 77, .7), (.75, 81, .6), (1.5, 79, .7), (2.5, 76, .5), (3.25, 74, .55)]
TURN = [(.25, 76, .5), (1, 74, .6), (2, 72, .5), (2.75, 69, .8)]
HARMONY = [
    (38, [50, 57, 62, 65]), (38, [50, 57, 64, 65]),
    (34, [46, 53, 62, 65]), (41, [53, 57, 60, 67]),
    (43, [55, 58, 62, 65]), (34, [46, 53, 60, 65]),
    (45, [57, 62, 64, 67]), (45, [57, 61, 64, 67]),
]


def render_battle():
    dst = np.zeros((round(BARS * BAR * SR), 2))
    drums = {kind: percussion(kind) for kind in ('kick', 'snare', 'hat', 'tom')}
    for bar in range(BARS):
        section, phrase = divmod(bar, 8)
        root, chord = HARMONY[phrase]
        start = bar * BAR
        breath = section == 2
        energy = .78 if breath else 1
        for i, midi in enumerate(chord):
            place(dst, pad(midi, BAR + .6, i * .63), start, .054, (i - 1.5) * .28, True)

        # Light syncopation, no low-octave ostinato or cinematic drum layer.
        pulse = (0, 1.5, 2.75) if breath else (0, .75, 1.5, 2.5, 3.25)
        for i, beat in enumerate(pulse):
            pitch = root + (12 if i == len(pulse) - 1 and bar % 2 else 0)
            place(dst, bass(pitch, .30), start + beat * BEAT, .235 * energy, 0, True)
        for beat in ((0, 2.5) if breath else (0, 1.5, 2.5)):
            place(dst, drums['kick'], start + beat * BEAT, .255 * energy, 0, True)
        for beat in (1, 3):
            place(dst, drums['snare'], start + beat * BEAT, .17 * energy, -.10, True)
        for i in range(8):
            if breath and i % 2 == 0:
                continue
            place(dst, drums['hat'], start + i * .5 * BEAT,
                  (.14 if i % 2 else .09) * energy, .24 if i % 2 else -.24, True)
        # Two quiet pickup taps per eight-bar phrase; no big cymbal crashes.
        if phrase == 7:
            for i, beat in enumerate((3.25, 3.75)):
                place(dst, drums['tom'], start + beat * BEAT, .08 + i * .025, -.2 + i * .4, True)

        for i, index in enumerate((0, 2, 1, 3, 2, 1, 3, 2)):
            if i in ((1, 3, 6) if breath else (3,)):
                continue
            place(dst, pluck(chord[index] + 12, .42), start + (i * .5 + .125) * BEAT,
                  .059 * energy * (1 if i % 2 else .8), -.46 if i % 2 else .46, True)

        # Theme / rising answer / breathing space / return, with rests between calls.
        pattern = {0: MOTIF, 2: ANSWER, 4: MOTIF, 6: TURN}.get(phrase, [])
        if section in (1, 3) and phrase == 4:
            pattern = LIFT
        if breath and phrase in (2, 6):
            pattern = []
        for beat, midi, duration in pattern:
            place(dst, pluck(midi - (12 if breath else 0), duration * BEAT + .45, 2),
                  start + beat * BEAT, .155 if not breath else .125, .06, True)
        if section in (1, 3) and phrase in (1, 5):
            for beat, midi in ((2.5, chord[2] + 12), (3.25, chord[1] + 12)):
                place(dst, pluck(midi, .65, 1), start + beat * BEAT, .073, -.23, True)

    dst = room(dst, .25, True)
    save('battle_loop', '试验失控 · 普通战斗', 'music', dst, .76, True,
         ['battle', 'original', 'loop', 'restrained-rewrite'])
    record = REPORT[-1]
    record.update(bpm=BPM, bars=BARS, motif='D–F–E–A',
                  sections=[{'title': title, 'start_seconds': round(i * 8 * BAR, 1),
                             'end_seconds': round((i + 1) * 8 * BAR, 1)}
                            for i, title in enumerate(('主题推进', '旋律回应', '留白呼吸', '主题回归'))])
    return record


def verify(record):
    path = OUT / record['file']
    with wave.open(str(path)) as f:
        assert (f.getframerate(), f.getnchannels(), f.getsampwidth()) == (SR, 2, 2)
        pcm = np.frombuffer(f.readframes(f.getnframes()), dtype='<i2').reshape(-1, 2).astype(float)
    assert len(pcm) == round(BARS * BAR * SR)
    assert 0 < np.max(np.abs(pcm)) < 32767
    assert np.max(np.abs(pcm[0] - pcm[-1])) <= 1
    assert np.sqrt(np.mean(pcm.mean(axis=1) ** 2)) > 100
    assert hashlib.sha256(path.read_bytes()).hexdigest() == record['sha256']
    return {'environment': platform.platform(), 'asset': record,
            'checks': ['PCM format', '32 exact bars', 'non-silent stereo and mono',
                       'no full-scale clipping', 'loop endpoints within 1 PCM unit', 'SHA256'],
            'section_rms_dbfs': [round(float(20 * np.log10(np.sqrt(np.mean(s ** 2)) / 32767)), 2)
                                   for s in np.array_split(pcm, 4)],
            'limitations': ['Offline file checks only; no human listening or live combat mix validation.',
                            'Endpoint continuity does not establish perceptual loop quality.']}


if __name__ == '__main__':
    record = render_battle()
    report = verify(record)
    manifest_path = OUT / 'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    manifest['version'] = max(manifest.get('version', 1), 19)
    manifest['assets'] = [record if a['id'] == 'battle_loop' else a for a in manifest['assets']]
    manifest['music']['bpm_by_asset'] = {a['id']: a['bpm'] for a in manifest['assets'] if 'bpm' in a}
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    (OUT / 'battle-rewrite-verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
