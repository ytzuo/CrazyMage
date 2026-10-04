"""Original offline audio drafts. Requires Python 3 and NumPy; never runs in game.

Seeded synthesis, no samples or downloaded material. Music tails wrap around the
loop; all output is 44.1 kHz / 16-bit PCM. Run from any directory.
"""

from pathlib import Path
import hashlib
import json
import math
import wave

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "artifacts/audio-drafts"
SR = 44100
BPM = 96
BEAT = 60 / BPM
TAU = 2 * np.pi
REPORT = []


def rng_for(name):
    return np.random.default_rng(int.from_bytes(hashlib.sha256(name.encode()).digest()[:8], "little"))


def timeline(seconds):
    return np.arange(round(seconds * SR), dtype=np.float64) / SR


def fade(y, attack=.003, release=.035):
    y = y.copy()
    a = min(len(y), round(attack * SR))
    r = min(len(y), round(release * SR))
    if a:
        envelope = np.sin(np.linspace(0, np.pi / 2, a)) ** 2
        y[:a] *= envelope[:, None] if y.ndim == 2 else envelope
    if r:
        envelope = np.sin(np.linspace(np.pi / 2, 0, r)) ** 2
        y[-r:] *= envelope[:, None] if y.ndim == 2 else envelope
    return y


def noise(t, rng, low=50, high=7000, tilt=0):
    """Smooth spectral band shaping is done once, during offline synthesis."""
    n = len(t)
    bins = np.fft.rfftfreq(n, 1 / SR)
    spec = np.fft.rfft(rng.normal(size=n))
    curve = (1 - np.exp(-(bins / max(low, 1)) ** 4)) * np.exp(-(bins / high) ** 4)
    curve *= np.maximum(bins / 800, .08) ** tilt
    y = np.fft.irfft(spec * curve, n=n)
    return y / max(np.std(y), 1e-6)


def sweep(t, start, end, seconds):
    frequency = end + (start - end) * np.exp(-t / seconds)
    return np.sin(TAU * np.cumsum(frequency) / SR)


def note(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def place(dst, y, seconds, gain=1, pan=0, wrap=False):
    offset = round(seconds * SR)
    if dst.ndim == 2 and y.ndim == 1:
        angle = (np.clip(pan, -1, 1) + 1) * np.pi / 4
        y = np.column_stack((y * np.cos(angle), y * np.sin(angle)))
    if wrap:
        cursor = 0
        while cursor < len(y):
            start = (offset + cursor) % len(dst)
            count = min(len(y) - cursor, len(dst) - start)
            dst[start:start + count] += y[cursor:cursor + count] * gain
            cursor += count
    elif 0 <= offset < len(dst):
        count = min(len(y), len(dst) - offset)
        dst[offset:offset + count] += y[:count] * gain


def room(y, wet=.16, wrap=False):
    """Fixed short diffusion taps; no live DSP dependencies."""
    stereo = np.column_stack((y, y)) if y.ndim == 1 else y.copy()
    out = stereo.copy()
    for i, (delay, gain) in enumerate(((.043,.34),(.079,.28),(.127,.23),(.193,.16),(.281,.10),(.397,.06))):
        shift = round(delay * SR)
        source = stereo[:, ::-1] if i % 2 else stereo
        if wrap:
            out += np.roll(source, shift, axis=0) * wet * gain
        elif shift < len(out):
            out[shift:] += source[:-shift] * wet * gain
    return out


def save(name, title, group, y, peak=.65, loop=False, tags=None):
    y = np.asarray(y, dtype=np.float64)
    assert np.isfinite(y).all(), name
    y -= np.mean(y, axis=0)
    if not loop:
        # Window before the soft saturation: guarantees clean silence at endpoints.
        y = fade(y, .003, .04)
    y = np.tanh(y * .95)
    amplitude = np.max(np.abs(y))
    assert amplitude > 1e-5, name
    y *= peak / amplitude
    if loop:
        # Remove only the tiny endpoint offset, keeping the musical tail intact.
        # This is not a silence fade and does not hide a mismatched arrangement.
        n = round(.005 * SR)
        seam = (y[0] + y[-1]) / 2
        ramp = np.linspace(1, 0, n)[:, None]
        y[:n] += (seam - y[0]) * ramp
        y[-n:] += (seam - y[-1]) * ramp[::-1]
    pcm = np.rint(np.clip(y, -1, 1) * 32767).astype("<i2")
    path = OUT / group / f"{name}.wav"
    path.parent.mkdir(parents=True, exist_ok=True)
    channels = 1 if y.ndim == 1 else y.shape[1]
    with wave.open(str(path), "wb") as f:
        f.setnchannels(channels)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(pcm.tobytes())
    record = {
        "id": name, "title": title, "group": group,
        "file": str(path.relative_to(OUT)), "duration": round(len(y) / SR, 4),
        "sample_rate": SR, "channels": channels, "bits": 16,
        "peak_dbfs": round(20 * np.log10(np.max(np.abs(y))), 2),
        "rms_dbfs": round(20 * np.log10(np.sqrt(np.mean(y ** 2))), 2),
        "clipped_samples": int(np.count_nonzero(np.abs(pcm.astype(np.int32)) >= 32767)),
        "loop": loop, "tags": tags or [],
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
    }
    if loop:
        record.update(bpm=BPM, bars=round(len(y) / SR / BEAT / 4),
                      boundary_step=round(float(np.max(np.abs(y[0] - y[-1]))), 9))
    REPORT.append(record)
    print(f"Rendered {name}: {record['duration']} s", flush=True)


FIRE_VARIANTS = {
    "cast": [("短喷", .32), ("卷焰", .46), ("余烬", .52)],
    "impact": [("脆裂", .24), ("闷爆", .42)],
}


def fire_basic(kind, index):
    """Distinct timbres and envelopes, retaining one common fire palette."""
    _, seconds = FIRE_VARIANTS[kind][index]
    t = timeline(seconds)
    rng = rng_for(f"fire-v3-{kind}-{index}")
    if kind == "cast" and index == 0:
        # Fast nozzle burst: bright air, a short body, almost no lingering flame.
        flame = noise(t, rng, 180, 4500, -.22)
        grit = noise(t, rng, 900, 7200)
        env = (1 - np.exp(-t / .004)) * np.exp(-t / .046)
        y = .34 * flame * env + .085 * grit * np.exp(-t / .015)
        y += .18 * sweep(t, 260, 115, .022) * np.exp(-t / .07)
    elif kind == "cast" and index == 1:
        # Broader rising whoosh: low flame rolls into a small midrange flare.
        flame = noise(t, rng, 80, 2300, -.45)
        flare = noise(t, rng, 400, 3800, -.1)
        env = (1 - np.exp(-t / .035)) * np.exp(-t / .09)
        y = .44 * flame * env * (1 + .13 * np.sin(TAU * 19 * t))
        y += .11 * flare * np.exp(-((t - .16) / .029) ** 2)
        y += .085 * sweep(t, 140, 78, .08) * env
    elif kind == "cast":
        # A round puff, then a clearly separated, quiet crackling ember tail.
        flame = noise(t, rng, 160, 3400, -.3)
        grit = noise(t, rng, 1500, 7400)
        y = .24 * flame * (1 - np.exp(-t / .010)) * np.exp(-t / .059)
        y += .24 * sweep(t, 190, 80, .03) * np.exp(-t / .065)
        y += .055 * flame * np.exp(-t / .14)
        for at, width, gain in ((.115,.004,.085),(.183,.003,.066),(.257,.005,.050),(.34,.004,.030)):
            y += gain * grit * np.exp(-((t - at) / width) ** 2)
    elif index == 0:
        # Dry brittle contact, with little low end and a very short decay.
        crack = noise(t, rng, 700, 6800)
        crunch = noise(t, rng, 500, 3400)
        y = .38 * crack * np.exp(-t / .013)
        y += .15 * crunch * np.exp(-t / .032)
        y += .16 * sweep(t, 200, 72, .018) * np.exp(-t / .045)
    else:
        # Low, rounded combustion impact: thump followed by a muffled flame tail.
        flame = noise(t, rng, 40, 1600, -.45)
        grit = noise(t, rng, 900, 4500)
        y = .48 * sweep(t, 135, 43, .025) * np.exp(-t / .09)
        y += .20 * flame * np.exp(-t / .10)
        y += .03 * grit * np.exp(-((t - .075) / .016) ** 2)
        y += .12 * sweep(t, 70, 50, .08) * np.exp(-t / .10)
    return fade(y, .002, .045)


def render_fire_variant(kind, index):
    character, _ = FIRE_VARIANTS[kind][index]
    label = "普攻" if kind == "cast" else "命中"
    save(f"fire_{kind}_{index+1:02}", f"火焰 · {label} {index+1} / {character}",
         "sfx", fire_basic(kind, index), .50 if kind == "cast" else .40,
         tags=["fire", kind, "variant"])
    REPORT[-1]["variant_character"] = character


def render_fire_pulse():
    save("fire_ultimate", "火焰 · Q 单轮火墙", "sfx", fire("ultimate"), .65,
         tags=["fire", "ultimate", "pulse"])
    REPORT[-1]["trigger"] = "once per fire-wall round, not once per enemy hit"


def fire(kind, seed=0):
    if kind in FIRE_VARIANTS:
        return fire_basic(kind, seed)
    rng = rng_for(f"fire-{kind}-{seed}")
    length = {"skill":1.05,"ultimate":2.1,"embers":1.5}[kind]
    t = timeline(length)
    breath = noise(t, rng, 70, 3900, -.3)
    grit = noise(t, rng, 500, 6200)
    if kind == "skill":
        y = .4 * breath * np.exp(-t/.21) + .10 * grit * np.exp(-t/.075)
        y += .50 * sweep(t, 195, 43, .034) * np.exp(-t/.25)
        y += .11 * sweep(t, 600, 90, .14) * np.exp(-t/.19)
    elif kind == "ultimate":
        # Keep the original sustained combustion texture and its first wall.
        # Use the original synthesis length so the seeded noise is unchanged.
        envelope = (1-np.exp(-t/.07)) * np.exp(-t/.50)
        y = .37 * breath * envelope * (1+.15*np.sin(TAU*11*t))
        for onset, pitch in ((.05,150),(.43,130),(.83,105)):
            local = t-onset
            active = local >= 0
            lt = np.maximum(local, 0)
            y += active * .35 * sweep(lt,pitch,43,.055) * np.exp(-lt/.23)
        y += .09 * grit * envelope
        # Smoothly roll off the sharp hiss, retaining the combustion envelope.
        # Reflect-padding keeps the offline filter from wrapping the endpoints.
        padding = round(.10 * SR)
        padded = np.pad(y, (padding, padding), mode="reflect")
        frequencies = np.fft.rfftfreq(len(padded), 1 / SR)
        response = 1 / np.sqrt(1 + (frequencies / 950) ** 8)
        y = np.fft.irfft(np.fft.rfft(padded) * response, n=len(padded))[padding:-padding]
        # End before the old second wall at 430 ms, with a short smooth release.
        return fade(fade(y, .004, .06)[:round(.38 * SR)], .004, .055)
    else:
        y = .13 * breath * np.exp(-t/.42)
        for onset in (.03,.17,.28,.41,.64,.91):
            y += .08 * grit * np.exp(-((t-onset)/.006)**2)
    return fade(y, .004, .06)


def crystal(t, frequency, decay, rng, strength=1):
    y = np.zeros(len(t))
    for ratio, gain in ((1,.5),(1.51,.22),(2.03,.16),(2.71,.075),(3.93,.04)):
        y += gain * np.sin(TAU*frequency*ratio*t + rng.uniform(-.1,.1)) * np.exp(-t/(decay/np.sqrt(ratio)))
    return y * strength


def ice(kind, seed=0):
    rng = rng_for(f"ice-{kind}-{seed}")
    length = {"cast":.65,"impact":.58,"skill":1.5,"ultimate":2.7,"shatter":.85}[kind]
    t = timeline(length)
    air = noise(t, rng, 900, 6700)
    f = 1250 * (1+(seed-1)*.055)
    if kind == "cast":
        y = .17 * air * np.exp(-((t-.075)/.04)**2)
        y += crystal(t, f, .13, rng) * .30
        y += .08 * sweep(t, 1900, 650, .06) * np.exp(-t/.07)
    elif kind == "impact":
        y = .10 * air * np.exp(-t/.045) + .34 * crystal(t, f*.72, .14, rng)
        y += .16 * sweep(t, 260, 95, .021) * np.exp(-t/.055)
    elif kind == "skill":
        y = .12 * air * (1-np.exp(-t/.045)) * np.exp(-t/.23)
        for i, midi in enumerate((74,81,86,89,93)):
            place(y, fade(crystal(timeline(.75),note(midi),.21,rng),.006,.08),i*.075,.22)
        y += .16 * sweep(t, 150, 58, .09) * np.exp(-t/.20)
    elif kind == "ultimate":
        envelope = (1-np.exp(-t/.12)) * np.exp(-t/.62)
        y = .12 * air * envelope
        for midi in (50,57,62,65,69,76):
            y += .12 * np.sin(TAU*note(midi)*t + .5*np.sin(TAU*.7*t)) * envelope
        for i, midi in enumerate((86,81,89,93,86)):
            place(y,fade(crystal(timeline(.9),note(midi),.24,rng),.01,.09),.07+i*.20,.18)
    else:
        y = .16 * air * np.exp(-t/.10)
        for i, frequency in enumerate((940,1530,2220,3110,3850,1260)):
            place(y,fade(crystal(timeline(.6),frequency,.14,rng),.001,.05),i*.021,.19)
        y += .17 * sweep(t, 170, 60, .025) * np.exp(-t/.075)
    return room(fade(y,.002,.10), .28)


def lightning(kind, seed=0):
    rng = rng_for(f"lightning-{kind}-{seed}")
    length = {"cast":.32,"impact":.33,"skill":.82,"ultimate":2.3,"discharge":.72}[kind]
    t = timeline(length)
    crack = noise(t,rng,800,7600)
    body = noise(t,rng,40,1900,-.35)
    pitch = 1 + (seed-1)*.06
    def arc(at, power=1, tail=.05):
        lt = np.maximum(t-at,0)
        alive = t >= at
        tone = np.sin(TAU*950*pitch*lt + 2*np.sin(TAU*190*lt))
        return alive * power * (.23*crack*np.exp(-lt/.014)+.12*tone*np.exp(-lt/tail))
    if kind == "cast":
        y = arc(.003) + arc(.045,.6) + arc(.09,.27)
        y += .13*sweep(t,230,80,.02)*np.exp(-t/.06)
    elif kind == "impact":
        y = arc(.002,.8,.034) + arc(.022,.4)
        y += .16*sweep(t,150,57,.022)*np.exp(-t/.065)
    elif kind == "skill":
        y = arc(.003,1.1,.09)+arc(.06,.7,.08)+arc(.14,.45)
        y += .25*body*np.exp(-t/.15)
        y += .23*sweep(t,240,45,.03)*np.exp(-t/.16)
    elif kind == "ultimate":
        y = np.zeros(len(t))
        for onset in (.015,.54,1.07):
            y += arc(onset,1.05,.085) + arc(onset+.025,.45)
            lt = np.maximum(t-onset,0)
            y += (t>=onset)*(.32*body+.24*sweep(lt,130,38,.035))*np.exp(-lt/.24)
    else:
        y = arc(.003,.65,.11)+arc(.045,.5,.08)+arc(.095,.35)
        y += .13 * np.sin(TAU*280*t+4*np.sin(TAU*48*t))*np.exp(-t/.11)
        y += .12*body*np.exp(-t/.15)
    return room(fade(y,.001,.07), .12)


def chime(notes, spacing=.09, seconds=1, decay=.17):
    rng = rng_for(str(notes)+str(seconds))
    y = np.zeros(round(seconds*SR))
    for i,midi in enumerate(notes):
        t = timeline(min(seconds-i*spacing,.85))
        part = fade(crystal(t,note(midi),decay,rng),.005,.08)
        place(y,part,i*spacing,.35)
    return room(y,.25)


def render_effects():
    schools = {"fire":(fire,"火焰"),"ice":(ice,"冰霜"),"lightning":(lightning,"闪电")}
    for school,(make,label) in schools.items():
        for i in range(3):
            if school == "fire":
                render_fire_variant("cast", i)
            else:
                save(f"{school}_cast_{i+1:02}",f"{label} · 普攻 {i+1}","sfx",make("cast",i),.50,tags=[school,"cast","variant"])
        for i in range(2):
            if school == "fire":
                render_fire_variant("impact", i)
            else:
                save(f"{school}_impact_{i+1:02}",f"{label} · 命中 {i+1}","sfx",make("impact",i),.40,tags=[school,"impact","variant"])
        save(f"{school}_skill",f"{label} · E 技能","sfx",make("skill"),.72,tags=[school,"skill"])
        if school == "fire":
            render_fire_pulse()
        else:
            save(f"{school}_ultimate",f"{label} · Q 大招概念","sfx",make("ultimate"),.78,tags=[school,"ultimate","concept"])
        special = {"fire":("embers","余烬"),"ice":("shatter","碎冰处决"),"lightning":("discharge","蓄雷放电")}[school]
        save(f"{school}_{special[0]}",f"{label} · {special[1]}","sfx",make(special[0]),.50,tags=[school,"special"])
    for i in range(2):
        t = timeline(.43)
        rng = rng_for(f"hurt-{i}")
        y = .28*sweep(t,155+i*15,53,.023)*np.exp(-t/.11)
        y += .15*noise(t,rng,180,2800)*np.exp(-t/.05)
        y += .12*np.sin(TAU*330*t)*np.exp(-t/.075)
        save(f"player_hurt_{i+1:02}",f"玩家受伤 {i+1}","sfx",room(y,.06),.67,tags=["player","priority"])
    save("shield_break","护盾破裂","sfx",ice("shatter",3)+chime([77,70],.11,.85,.14)*.32,.63,tags=["player","priority"])
    for name,title,notes,seconds,peak in (
        ("skill_ready","技能就绪",[81,86],.72,.27),
        ("wave_clear","清波完成",[74,77,81,86],1.15,.50),
        ("ui_select","菜单选择",[81],.27,.23),
        ("upgrade_accept","强化确认",[69,74,77,81],.95,.43),
        ("victory","通关收束",[62,69,74,77,81,86],2.3,.65),
        ("defeat","失败收束",[74,69,65,62,50],2.1,.50),
    ):
        save(name,title,"sfx",chime(notes,.115 if seconds>1 else .065,seconds,.31 if seconds>1 else .14),peak,tags=["ui" if name.startswith("ui") else "event"])
    t = timeline(1.85)
    rng = rng_for("boss-arrival")
    env = (1-np.exp(-t/.018))*np.exp(-t/.38)
    y = .40*sweep(t,100,34,.09)*env + .15*noise(t,rng,40,1200,-.4)*env
    for midi in (38,45,50,56):
        y += .07*np.sin(TAU*note(midi)*t)*env
    save("boss_arrival","Boss 登场","sfx",room(y,.35),.75,tags=["boss","priority"])


def pluck(midi, seconds=.8, color=0):
    t = timeline(seconds)
    f = note(midi)
    env = (1-np.exp(-t/.0025))*np.exp(-t/(.14+color*.045))
    y = np.zeros(len(t))
    for harmonic in range(1,8):
        y += np.sin(TAU*f*harmonic*t + .1*harmonic) / harmonic**1.55 * np.exp(-t*(harmonic-1)*5)
    y += .11*np.sin(TAU*f*2.003*t + 1.2*np.sin(TAU*f*t)*np.exp(-t/.06))
    return fade(y*env,.003,.07)


def pad(midi, seconds, phase=0):
    t = timeline(seconds)
    f = note(midi)
    y = np.zeros(len(t))
    for h in range(1,7):
        amplitude = .55/h**2.15
        y += amplitude*(np.sin(TAU*f*h*.9985*t+phase)+np.sin(TAU*f*h*1.0015*t-phase))
    y *= .90+.1*np.sin(TAU*.23*t+phase)
    return fade(y,.38,.80)


def bass(midi, seconds=.42, hard=False):
    t = timeline(seconds)
    f = note(midi)
    y = np.sin(TAU*f*t)+.23*np.sin(TAU*f*2*t)+.08*np.sin(TAU*f*3*t)
    if hard:
        y += .06*np.sin(TAU*f*5*t)*np.exp(-t/.08)
    env = (1-np.exp(-t/.005))*np.exp(-t/.22)
    return fade(y*env,.006,.06)


def percussion(kind):
    rng = rng_for(f"drum-{kind}")
    length = {"kick":.46,"snare":.23,"hat":.075,"open":.20,"tom":.38,"metal":.8}[kind]
    t = timeline(length)
    if kind == "kick":
        y = .8*sweep(t,170,44,.025)*np.exp(-t/.105)
        y += .07*noise(t,rng,200,3200)*np.exp(-t/.008)
    elif kind == "snare":
        y = .23*noise(t,rng,400,6700)*np.exp(-t/.048)
        y += .35*np.sin(TAU*175*t)*np.exp(-t/.04)
    elif kind in ("hat","open"):
        y = noise(t,rng,3500,10000)*np.exp(-t/(.013 if kind=="hat" else .045))*.12
    elif kind == "tom":
        y = sweep(t,160,76,.026)*np.exp(-t/.1)*.48
        y += .06*noise(t,rng,50,1500)*np.exp(-t/.04)
    else:
        y = crystal(t,300,.22,rng)*.45
    return fade(y,.001,.025)


CHORDS = [
    (38,[50,57,60,65,69]), (38,[50,57,62,65,76]),
    (34,[46,53,57,62,65]), (34,[46,53,57,60,65]),
    (43,[55,62,65,69,74]), (43,[55,62,65,70,74]),
    (45,[57,64,67,74,76]), (45,[57,64,67,69,74]),
]


def render_music(kind):
    bars = 16 if kind=="menu" else 32
    seconds = bars * 4 * BEAT
    dst = np.zeros((round(seconds*SR),2))
    drums = {k:percussion(k) for k in ("kick","snare","hat","open","tom","metal")}
    # The four-note rising / falling cell appears in every arrangement.
    motif = [(0,74,1),(.75,77,.7),(1.5,76,.9),(2.75,69,1.1)]
    response = [(0,72,1),(.75,69,.7),(1.5,67,.9),(2.75,74,1.1)]
    for bar in range(bars):
        start = bar * 4 * BEAT
        root,voicing = CHORDS[bar%8]
        section = bar//8
        # Each chord lasts slightly into the next one; the final tail wraps to bar 1.
        for i,midi in enumerate(voicing):
            gain = .12 if kind=="menu" else .075 if kind=="battle" else .063
            place(dst,pad(midi,4*BEAT+.9,i*.63),start,gain,(i-2)*.32,True)
        if kind=="menu":
            # A restrained heartbeat and scattered glass notes, no dance beat.
            place(dst,bass(root,1.0),start,.17,0,True)
            place(dst,bass(root+12,.8),start+2*BEAT,.09,0,True)
            if bar%2==0:
                pattern = motif if bar%4==0 else response
                for beat,midi,duration in pattern:
                    place(dst,pluck(midi,duration*BEAT+.6,2),start+beat*BEAT,.115,math.sin(beat+bar)*.45,True)
            for i in range(3):
                midi = voicing[(i+bar)%len(voicing)]+12
                place(dst,pluck(midi,.95,2),start+(.45+i*1.2)*BEAT,.040,(-1 if i%2 else 1)*.65,True)
        else:
            hard = kind=="boss"
            # Bass and drums are syncopated; an eight-bar phrase avoids a one-bar drone.
            pulse = (0,.75,1.5,2,2.75,3.5) if not hard else (0,.5,1,1.75,2,2.5,3,3.5)
            for i,beat in enumerate(pulse):
                midi = root+(12 if i==len(pulse)-1 and bar%2 else 0)
                place(dst,bass(midi,.36,hard),start+beat*BEAT,.30 if hard else .24,0,True)
            kick_beats = (0,1.5,2.5) if not hard else (0,.75,1.5,2,2.75,3.5)
            for beat in kick_beats:
                place(dst,drums["kick"],start+beat*BEAT,.34 if hard else .26,0,True)
            for beat in (1,3):
                place(dst,drums["snare"],start+beat*BEAT,.25 if hard else .15,-.08,True)
            for i in range(8):
                gain = (.21 if hard else .16)*(1 if i%2 else .65)
                place(dst,drums["hat"],start+i*.5*BEAT,gain,(-1 if i%2 else 1)*.32,True)
            if bar%4==3:
                for j in range(3):
                    place(dst,drums["tom"],start+(3+j*.25)*BEAT,.16+j*.035,(j-1)*.40,True)
            if bar%8==0:
                place(dst,drums["metal"],start,.15 if hard else .09,.45,True)
            arp_order = (0,2,1,3,2,4,1,3)
            for i,index in enumerate(arp_order):
                # The arpeggio rests occasionally to leave room for spell attacks.
                if (bar+i)%7==0 and not hard:
                    continue
                midi = voicing[index]+12
                gain = (.084 if hard else .075)*(1 if i%2 else .8)
                place(dst,pluck(midi,.55,0),start+(i*.5+.125)*BEAT,gain,(-1 if i%2 else 1)*.55,True)
            # Four phrases: introduce theme, answer, breathe, return with harmony.
            if bar%2==0 and (section!=2 or bar%4==0):
                pattern = motif if bar%4==0 else response
                for beat,midi,duration in pattern:
                    if hard:
                        midi -= 12
                    place(dst,pluck(midi,duration*BEAT+.7,1),start+beat*BEAT,.14 if hard else .12,.08,True)
                    if section==3:
                        place(dst,pluck(midi+12,duration*BEAT+.5,2),start+beat*BEAT,.035,-.24,True)
            if hard and bar%4 in (0,2):
                # An ominous low fifth, deliberately softer than the drums.
                place(dst,pad(root+12,1.3,bar*.2),start,.13,-.30,True)
                place(dst,pad(root+19,1.3,bar*.2),start,.08,.30,True)
    dst = room(dst,.52 if kind=="menu" else .28,True)
    # Blend a modest rhythmic duck into the mix, with periodic envelopes.
    if kind!="menu":
        t = timeline(seconds)
        dst *= (1-.07*np.exp(-(t%BEAT)/.060))[:,None]
    titles = {"menu":"法阵余光 · 主菜单","battle":"试验失控 · 普通战斗","boss":"魔核苏醒 · Boss 战"}
    save(f"{kind}_loop",titles[kind],"music",dst,.68 if kind=="menu" else .76,True,[kind,"original","loop"])


def render_reel():
    # A convenient sampler with quiet gaps; no spoken announcements.
    ids = ["fire_cast_01","fire_impact_01","fire_skill","fire_ultimate",
           "ice_cast_01","ice_impact_01","ice_skill","ice_shatter",
           "lightning_cast_01","lightning_impact_01","lightning_skill","lightning_ultimate",
           "player_hurt_01","shield_break","wave_clear","upgrade_accept","boss_arrival"]
    chunks = [np.zeros((round(.4*SR),2))]
    for name in ids:
        with wave.open(str(OUT/"sfx"/f"{name}.wav")) as f:
            y = np.frombuffer(f.readframes(f.getnframes()),dtype="<i2").astype(float)/32767
            y = y.reshape(-1,f.getnchannels())
        if y.shape[1]==1:
            y = np.repeat(y,2,axis=1)
        chunks.extend((y,np.zeros((round(.48*SR),2))))
    # Preserve individual playback levels, instead of remastering the reel.
    y = np.concatenate(chunks)
    path = OUT/"sfx_sampler.wav"
    with wave.open(str(path),"wb") as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
        f.writeframes(np.rint(y*32767).astype("<i2").tobytes())
    return {"file":"sfx_sampler.wav","duration":round(len(y)/SR,3),"order":ids,"gap_seconds":.48}


def verify_outputs():
    for item in REPORT:
        with wave.open(str(OUT/item["file"])) as f:
            assert f.getframerate()==SR and f.getsampwidth()==2
            assert f.getnchannels()==item["channels"]
            pcm = np.frombuffer(f.readframes(f.getnframes()),dtype="<i2").reshape(-1,f.getnchannels())
        assert len(pcm)>0 and np.any(pcm), item["id"]
        assert np.max(np.abs(pcm.astype(np.int32)))<32767, item["id"]
        if item["loop"]:
            assert len(pcm)==round(item["bars"]*4*BEAT*SR)
            assert np.max(np.abs(pcm[0].astype(int)-pcm[-1].astype(int)))<=1
        else:
            assert np.max(np.abs(pcm[[0,-1]].astype(int)))<=2


def main():
    render_effects()
    for kind in ("menu","battle","boss"):
        render_music(kind)
    reel = render_reel()
    verify_outputs()
    manifest = {
        "version":1, "title":"失控法师 · 原创合成音频小样",
        "method":"Deterministic offline NumPy synthesis; no third-party samples.",
        "integrated_into_game":False,
        "limitations":"Technical file checks only; subjective listening and device playback require review.",
        "music":{"bpm":BPM,"meter":"4/4","key_center":"D minor","loop_master":"WAV, exact bar length; wrapped synthesis and diffusion tails"},
        "assets":REPORT,"sampler":reel,
        "validation":{"pcm_header":True,"non_silent":True,"no_full_scale_clipping":True,"sfx_endpoints":True,"loop_length_and_endpoints":True},
    }
    (OUT/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Verified {len(REPORT)} assets; sampler {reel['duration']} s",flush=True)


if __name__=="__main__":
    main()
