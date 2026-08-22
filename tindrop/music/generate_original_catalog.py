#!/usr/bin/env python3
"""Generate the deterministic Tindrop Originals v1 audio and catalog source."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import subprocess
import tempfile
import wave
from dataclasses import dataclass
from pathlib import Path

import numpy as np


SAMPLE_RATE = 44_100
ARTIST = "Tindrop Originals"
LICENSE_URL = "https://lagartijalabs.com/tindrop/music/licenses/originals.html"
MEDIA_ROOT = "https://media.lagartijalabs.com/tindrop/music/v1"


@dataclass(frozen=True)
class Track:
    id: str
    title: str
    mood: str
    bpm: int
    beats: int
    root: int
    progression: tuple[int, ...]
    melody: tuple[int, ...]
    seed: int
    sort_order: int
    featured: bool = False
    softness: float = 0.0


TRACKS = (
    Track("sunlit-steps", "Sunlit Steps", "upbeat", 120, 96, 60, (0, 5, 9, 7), (0, 4, 7, 11, 7, 4, 2, 7), 11, 10, True),
    Track("neon-sprint", "Neon Sprint", "upbeat", 140, 112, 57, (0, 8, 5, 10), (0, 7, 10, 12, 10, 7, 5, 3), 23, 20),
    Track("slow-current", "Slow Current", "chill", 92, 72, 55, (0, 7, 3, 10), (7, 10, 12, 10, 7, 3, 5, 7), 31, 30, True, 0.35),
    Track("golden-hour", "Golden Hour", "chill", 104, 80, 62, (0, 5, 7, 4), (0, 2, 4, 7, 9, 7, 4, 2), 41, 40, False, 0.2),
    Track("wide-horizon", "Wide Horizon", "cinematic", 108, 88, 50, (0, 8, 5, 10), (0, 7, 12, 10, 8, 7, 3, 5), 53, 50, True, 0.15),
    Track("rising-frames", "Rising Frames", "cinematic", 126, 100, 52, (0, 5, 9, 7), (0, 4, 7, 12, 11, 7, 9, 4), 67, 60),
    Track("pocket-confetti", "Pocket Confetti", "playful", 132, 88, 65, (0, 7, 5, 9), (0, 4, 7, 9, 12, 9, 7, 4), 79, 70, True),
    Track("soft-orbit", "Soft Orbit", "ambient", 76, 64, 48, (0, 5, 10, 7), (0, 7, 10, 14, 12, 10, 7, 5), 97, 80, False, 0.65),
)


def frequency(midi: float) -> float:
    return 440.0 * 2.0 ** ((midi - 69.0) / 12.0)


def envelope(length: int, attack: float, release: float) -> np.ndarray:
    values = np.ones(length, dtype=np.float32)
    attack_samples = min(length, max(1, int(attack * SAMPLE_RATE)))
    release_samples = min(length, max(1, int(release * SAMPLE_RATE)))
    values[:attack_samples] *= np.linspace(0, 1, attack_samples, dtype=np.float32)
    values[-release_samples:] *= np.linspace(1, 0, release_samples, dtype=np.float32)
    return values


def add_tone(
    mix: np.ndarray,
    start: float,
    duration: float,
    midi: float,
    gain: float,
    pan: float = 0.0,
    timbre: str = "soft",
    attack: float = 0.01,
    release: float = 0.12,
) -> None:
    begin = max(0, int(start * SAMPLE_RATE))
    end = min(len(mix), begin + int(duration * SAMPLE_RATE))
    if end <= begin:
        return
    t = np.arange(end - begin, dtype=np.float32) / SAMPLE_RATE
    phase = 2 * np.pi * frequency(midi) * t
    if timbre == "bright":
        signal = np.sin(phase) + 0.28 * np.sin(2 * phase) + 0.12 * np.sin(3 * phase)
    elif timbre == "glass":
        signal = np.sin(phase) + 0.18 * np.sin(3 * phase) + 0.08 * np.sin(5 * phase)
    elif timbre == "bass":
        signal = np.sin(phase) + 0.35 * np.sin(phase / 2)
    else:
        signal = np.sin(phase) + 0.16 * np.sin(2 * phase)
    signal = signal.astype(np.float32) * envelope(len(signal), attack, release) * gain
    left = math.sqrt((1 - pan) / 2)
    right = math.sqrt((1 + pan) / 2)
    mix[begin:end, 0] += signal * left
    mix[begin:end, 1] += signal * right


def add_kick(mix: np.ndarray, start: float, gain: float) -> None:
    begin = int(start * SAMPLE_RATE)
    length = min(int(0.34 * SAMPLE_RATE), len(mix) - begin)
    if length <= 0:
        return
    t = np.arange(length, dtype=np.float32) / SAMPLE_RATE
    phase = 2 * np.pi * (48 * t + 45 * np.exp(-t * 22) * t)
    signal = np.sin(phase) * np.exp(-t * 15) * gain
    mix[begin:begin + length] += signal[:, None]


def add_noise_hit(mix: np.ndarray, start: float, gain: float, rng: np.random.Generator, short: bool) -> None:
    duration = 0.08 if short else 0.24
    begin = int(start * SAMPLE_RATE)
    length = min(int(duration * SAMPLE_RATE), len(mix) - begin)
    if length <= 1:
        return
    noise = rng.normal(0, 1, length).astype(np.float32)
    noise = np.concatenate(([0], np.diff(noise))).astype(np.float32)
    t = np.arange(length, dtype=np.float32) / SAMPLE_RATE
    signal = noise * np.exp(-t * (48 if short else 16)) * gain
    mix[begin:begin + length, 0] += signal * 0.72
    mix[begin:begin + length, 1] += signal * 0.68


def arrangement_gain(beat: int, total: int) -> float:
    progress = beat / max(1, total - 1)
    if progress < 0.12:
        return 0.48 + progress * 2.2
    if progress < 0.38:
        return 0.78
    if progress < 0.72:
        return 1.0
    if progress < 0.9:
        return 0.84
    return max(0.42, 0.84 - (progress - 0.9) * 4.2)


def synthesize(track: Track) -> np.ndarray:
    beat_seconds = 60.0 / track.bpm
    duration = track.beats * beat_seconds
    mix = np.zeros((int(duration * SAMPLE_RATE), 2), dtype=np.float32)
    rng = np.random.default_rng(track.seed)
    drum_gain = 0.15 * (1 - 0.55 * track.softness)

    for beat in range(track.beats):
        time = beat * beat_seconds
        energy = arrangement_gain(beat, track.beats)
        bar = beat // 4
        degree = track.progression[bar % len(track.progression)]
        root = track.root + degree
        if beat % 4 == 0:
            chord_duration = beat_seconds * 3.85
            for index, interval in enumerate((0, 4 if degree not in (3, 5, 8, 10) else 3, 7)):
                add_tone(
                    mix,
                    time,
                    chord_duration,
                    root + interval + 12,
                    0.055 * energy,
                    pan=(-0.48 + index * 0.48),
                    timbre="soft",
                    attack=0.18 + track.softness * 0.25,
                    release=0.42,
                )
        add_tone(
            mix,
            time,
            beat_seconds * 0.82,
            root - 12,
            0.105 * energy,
            timbre="bass",
            attack=0.008,
            release=0.16,
        )
        add_kick(mix, time, drum_gain * energy)
        if beat % 4 in (1, 3):
            add_noise_hit(mix, time, drum_gain * 0.62 * energy, rng, short=False)
        for half in (0, 1):
            onset = time + half * beat_seconds / 2
            add_noise_hit(mix, onset, drum_gain * 0.19 * energy, rng, short=True)
            melody_index = (beat * 2 + half + bar) % len(track.melody)
            melody_note = track.root + 12 + track.melody[melody_index]
            if (beat + half) % 3 != 1 or track.mood == "playful":
                add_tone(
                    mix,
                    onset,
                    beat_seconds * (0.38 if track.softness < 0.5 else 0.72),
                    melody_note,
                    (0.052 + 0.018 * (1 - track.softness)) * energy,
                    pan=-0.42 if half == 0 else 0.42,
                    timbre="glass" if track.softness > 0.3 else "bright",
                    attack=0.015,
                    release=0.11 + track.softness * 0.2,
                )

    fade = min(len(mix), int(SAMPLE_RATE * 1.5))
    mix[:fade] *= np.linspace(0, 1, fade, dtype=np.float32)[:, None]
    mix[-fade:] *= np.linspace(1, 0, fade, dtype=np.float32)[:, None]
    peak = float(np.max(np.abs(mix)))
    if peak > 0:
        mix *= 0.88 / peak
    return mix


def write_wav(path: Path, audio: np.ndarray) -> None:
    pcm = np.clip(audio * 32767, -32768, 32767).astype("<i2")
    with wave.open(str(path), "wb") as stream:
        stream.setnchannels(2)
        stream.setsampwidth(2)
        stream.setframerate(SAMPLE_RATE)
        stream.writeframes(pcm.tobytes())


def encode_aac(wav_path: Path, output: Path) -> None:
    subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(wav_path), "-af", "loudnorm=I=-16:TP=-1.5:LRA=7,alimiter=limit=0.70:level=false",
            "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart", str(output),
        ],
        check=True,
    )


def encoded_duration_ms(path: Path) -> int:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    seconds = float(json.loads(result.stdout)["format"]["duration"])
    return round(seconds * 1000)


def beat_map(track: Track, duration_ms: int, audio: np.ndarray) -> dict:
    beat_ms = 60_000 / track.bpm
    beats = [round(index * beat_ms) for index in range(track.beats) if round(index * beat_ms) < duration_ms]
    downbeats = beats[::4]
    onsets = sorted(set(beats + [round(value + beat_ms / 2) for value in beats if value + beat_ms / 2 < duration_ms]))
    section_edges = [0, round(duration_ms * 0.2), round(duration_ms * 0.48), round(duration_ms * 0.78), duration_ms]
    energies = [0.52, 0.78, 1.0, 0.66]
    mono = np.mean(np.abs(audio), axis=1)
    waveform = []
    for bucket in np.array_split(mono, 240):
        waveform.append(round(float(np.percentile(bucket, 92)) / max(1e-6, float(np.max(mono))), 5))
    return {
        "schemaVersion": 2,
        "bpm": track.bpm,
        "beatTimesMs": beats,
        "downbeatTimesMs": downbeats,
        "onsetTimesMs": onsets,
        "sections": [
            {"startMs": section_edges[index], "endMs": section_edges[index + 1], "energy": energies[index]}
            for index in range(4)
        ],
        "waveform": waveform,
        "confidence": "high",
        "confidenceScore": 1.0,
    }


def write_evidence(root: Path, track: Track) -> None:
    evidence = root / "licenses" / f"{track.id}.md"
    evidence.write_text(
        f"# {track.title}\n\n"
        "- Artist: Tindrop Originals / Lagartija Labs\n"
        "- License ID in catalog: `proprietary`\n"
        "- Provenance: original deterministic composition synthesized by "
        "`tindrop/music/generate_original_catalog.py`; no third-party samples or melodies are used.\n"
        f"- Generator seed: `{track.seed}`\n"
        "- Distribution grant: approved for use inside Tindrop exports and the public Tindrop music CDN.\n"
        "- Evidence owner: Lagartija Labs repository history and exact generator configuration.\n",
        encoding="utf-8",
    )


def write_public_license(root: Path) -> None:
    (root / "licenses" / "originals.html").write_text(
        "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\">"
        "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
        "<title>Tindrop Originals licence</title><body><main>"
        "<h1>Tindrop Originals</h1><p>These tracks were created by Lagartija Labs "
        "for use in videos made with Tindrop. They contain no third-party samples.</p>"
        "<p>You may use and share the track only as part of a video exported by Tindrop. "
        "Standalone redistribution, resale or claiming the music as your own is not permitted.</p>"
        "<h2>Español</h2><p>Estas pistas han sido creadas por Lagartija Labs para su uso "
        "en vídeos hechos con Tindrop y no contienen samples de terceros.</p>"
        "<p>Puedes usarlas y compartirlas únicamente como parte de un vídeo exportado por "
        "Tindrop. No se permite redistribuirlas por separado, revenderlas o atribuirse su autoría.</p>"
        "</main></body></html>\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    root = Path(__file__).resolve().parent
    parser.add_argument("--output", type=Path, default=root.parent.parent / ".artifacts" / "tindrop_music_v1")
    parser.add_argument("--catalog", type=Path, default=root / "catalog.local.json")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    catalog_tracks = []
    with tempfile.TemporaryDirectory(prefix="tindrop_music_") as temporary:
        temporary_root = Path(temporary)
        for track in TRACKS:
            audio = synthesize(track)
            wav_path = temporary_root / f"{track.id}.wav"
            output = args.output / f"{track.id}.m4a"
            write_wav(wav_path, audio)
            encode_aac(wav_path, output)
            duration_ms = encoded_duration_ms(output)
            digest = hashlib.sha256(output.read_bytes()).hexdigest()
            catalog_tracks.append({
                "id": track.id,
                "title": track.title,
                "artist": ARTIST,
                "audioUrl": f"{MEDIA_ROOT}/{track.id}.m4a",
                "durationMs": duration_ms,
                "sizeBytes": output.stat().st_size,
                "sha256": digest,
                "licenseId": "proprietary",
                "licenseUrl": LICENSE_URL,
                "mood": track.mood,
                "sortOrder": track.sort_order,
                "previewStartMs": min(duration_ms - 1, round(duration_ms * 0.42)),
                "featured": track.featured,
                "beatMap": beat_map(track, duration_ms, audio),
            })
            write_evidence(root, track)
            print(f"generated {output.name} ({duration_ms} ms)")
    write_public_license(root)
    payload = {"version": 1, "issuedAtMs": 1787356800000, "tracks": catalog_tracks}
    args.catalog.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(args.catalog)


if __name__ == "__main__":
    main()
