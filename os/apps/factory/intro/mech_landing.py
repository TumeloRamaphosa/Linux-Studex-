"""Robusca's boot line, then the mech: metal screeching on the ground, a huge boom, and a metal
T-rex roaring in the background. All local and free: Kokoro voice + numpy/scipy synthesis."""
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve

SR = 44100
OUT = Path(__file__).resolve().parent
TTS = OUT.parent / "tts"
rng = np.random.default_rng(7)


def t(sec):
    return np.arange(int(sec * SR)) / SR


def bp(x, lo, hi, order=4):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def lp(x, f, order=4):
    return sosfilt(butter(order, f, btype="low", fs=SR, output="sos"), x)


def hp(x, f, order=4):
    return sosfilt(butter(order, f, btype="high", fs=SR, output="sos"), x)


def norm(x, peak=0.9):
    m = np.max(np.abs(x)) or 1
    return x / m * peak


def reverb(x, seconds=2.5, wet=0.35, damp=3000):
    n = int(seconds * SR)
    ir = rng.standard_normal(n) * np.exp(-np.linspace(0, 7, n))
    ir = lp(ir, damp)
    ir[0] = 1.0
    y = fftconvolve(x, ir)[: len(x) + n]
    y = np.pad(y, (0, len(x) + n - len(y)))
    dry = np.pad(x, (0, n))
    return norm((1 - wet) * dry / (np.max(np.abs(dry)) or 1) + wet * y / (np.max(np.abs(y)) or 1))


def fade(x, a=0.01, b=0.2):
    na, nb = int(a * SR), int(b * SR)
    x = x.copy()
    x[:na] *= np.linspace(0, 1, na)
    x[-nb:] *= np.linspace(1, 0, nb)
    return x


# ---------------------------------------------------------------- Robusca ----
def robusca(line):
    from kokoro_onnx import Kokoro
    k = Kokoro(str(TTS / "kokoro-v1.0.onnx"), str(TTS / "voices-v1.0.bin"))
    a, sr = k.create(line, voice="bf_emma", speed=0.92, lang="en-gb")
    a = np.interp(np.arange(0, len(a), sr / SR), np.arange(len(a)), a)  # resample to 44.1k
    # light comms-radio colour: band-limit + a touch of drive, then a small room
    a = bp(a, 180, 6500, 2)
    a = np.tanh(a * 2.2) * 0.8
    return reverb(a, 0.6, 0.12, 6000)


# ------------------------------------------------------------- screeching ----
def screech(sec=2.6):
    x = t(sec)
    # two grinding, wobbling metal tones sliding down as it drags along the ground
    f1 = 2300 - 900 * (x / sec) + 120 * np.sin(2 * np.pi * 7.3 * x)
    f2 = 3400 - 1300 * (x / sec) + 200 * np.sin(2 * np.pi * 11.1 * x + 1)
    tone = np.sin(2 * np.pi * np.cumsum(f1) / SR) + 0.6 * np.sin(2 * np.pi * np.cumsum(f2) / SR)
    tone *= 0.6 + 0.4 * (rng.random(len(x)) > 0.03)          # stick-slip stutter
    grind = bp(rng.standard_normal(len(x)), 900, 7000) * (0.7 + 0.3 * np.sin(2 * np.pi * 23 * x))
    sparks = hp(rng.standard_normal(len(x)), 6000) * (rng.random(len(x)) > 0.995) * 6
    env = np.minimum(1, x / 0.15) * np.exp(-0.25 * x)
    y = (0.55 * tone + 0.8 * grind + 0.4 * sparks) * env
    y = np.tanh(y * 1.8)
    return fade(reverb(norm(y), 1.8, 0.3, 5000), 0.005, 0.4)


# ------------------------------------------------------------------- boom ----
def boom(sec=4.5):
    x = t(sec)
    sub = np.sin(2 * np.pi * (55 * np.exp(-x * 1.2) + 28) * x) * np.exp(-x * 1.1)
    body = lp(rng.standard_normal(len(x)), 900) * np.exp(-x * 3.0) * 2.2
    crack = hp(rng.standard_normal(len(x)), 2500) * np.exp(-x * 30) * 1.5
    # metal impact: inharmonic partials ringing out (a steel plate the size of a bus)
    clang = sum(np.sin(2 * np.pi * f * x) * np.exp(-x * d) * g for f, d, g in
                [(87, 1.2, 1), (139, 1.6, .7), (233, 2.1, .5), (371, 2.8, .35), (529, 3.5, .25), (811, 4.5, .15)])
    y = 1.6 * sub + body + crack + 0.5 * clang
    y = np.tanh(y * 1.4)
    return reverb(norm(y), 3.5, 0.45, 2500)


# ---------------------------------------------------------------- the roar ----
def roar(sec=4.8):
    x = t(sec)
    shape = np.minimum(1, x / 0.6) * np.exp(-np.maximum(0, x - 2.6) * 1.1)
    pitch = 95 + 35 * np.sin(np.pi * np.minimum(1, x / 3.2)) - 25 * (x / sec)     # rises then falls
    pitch += 6 * np.sin(2 * np.pi * 5.5 * x)                                       # throat wobble
    ph = 2 * np.pi * np.cumsum(pitch) / SR
    saw = sum(np.sin(k * ph) / k for k in range(1, 40))                             # rough vocal source
    growl = saw * (0.6 + 0.4 * np.sin(2 * np.pi * 31 * x) ** 2)                     # flutter / rasp
    breath = bp(rng.standard_normal(len(x)), 300, 3000) * 0.9
    src = growl + breath
    # throat formants
    voice = 1.0 * bp(src, 250, 700) + 0.8 * bp(src, 900, 1600) + 0.4 * bp(src, 2200, 3400)
    # make it metal: ring-modulate with a low metallic carrier and add a comb (pipe) resonance
    metal = voice * (0.55 + 0.45 * np.sin(2 * np.pi * 73 * x))
    d = int(SR / 180)
    comb = metal.copy()
    comb[d:] += 0.6 * metal[:-d]
    servo = np.sin(2 * np.pi * (380 + 140 * np.sin(2 * np.pi * 0.7 * x)) * x) * 0.12  # hydraulic whine
    y = np.tanh((comb + servo) * 2.0) * shape
    y = lp(y, 5500)
    return reverb(norm(y), 4.0, 0.55, 1800)   # far away, big space: "in the back"


def place(track, clip, at, gain):
    i = int(at * SR)
    end = i + len(clip)
    if end > len(track):
        track = np.pad(track, (0, end - len(track)))
    track[i:end] += clip * gain
    return track


def main(line):
    voice = robusca(line)
    vlen = len(voice) / SR
    mix = np.zeros(int((vlen + 12) * SR))
    mix = place(mix, voice, 0.3, 0.95)
    s = vlen + 0.6                     # a beat of silence after she finishes
    mix = place(mix, screech(), s, 0.55)
    mix = place(mix, boom(), s + 2.2, 1.0)
    mix = place(mix, roar(), s + 3.6, 0.65)       # background, under the boom tail
    mix = place(mix, roar(3.6), s + 7.4, 0.45)  # a second, further-off answer
    mix = fade(norm(mix, 0.95), 0.01, 1.2)
    # trim trailing silence
    nz = np.where(np.abs(mix) > 1e-3)[0]
    mix = mix[: nz[-1] + SR // 2]
    sf.write(OUT / "mech-landing.wav", mix.astype(np.float32), SR)
    print(f"robusca {vlen:.1f}s, total {len(mix)/SR:.1f}s")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else
         "Robusca online. All rooms are reporting. Commander, the machine is awake.")
