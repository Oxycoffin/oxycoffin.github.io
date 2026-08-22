"""Bridge catalog preparation to Tindrop's canonical Dart cue engine."""

from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path


ANALYSIS_SAMPLE_RATE = 11_025


def canonical_beat_map(encoded: Path, total_ms: int, tindrop_root: Path) -> dict:
    dart = tindrop_root.parent / ".flutter" / "flutter" / "bin" / "dart"
    tool = tindrop_root / "tool" / "beat_video_catalog_analyzer.dart"
    if not dart.is_file() or not tool.is_file():
        raise FileNotFoundError("Tindrop Dart SDK or canonical analyzer tool is missing")
    with tempfile.TemporaryDirectory(prefix="tindrop_catalog_pcm_") as temporary:
        pcm = Path(temporary) / "track.f32le"
        subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-i",
                str(encoded),
                "-f",
                "f32le",
                "-ac",
                "1",
                "-ar",
                str(ANALYSIS_SAMPLE_RATE),
                str(pcm),
            ],
            check=True,
        )
        result = subprocess.run(
            [
                str(dart),
                "run",
                str(tool),
                "--pcm",
                str(pcm),
                "--sample-rate",
                str(ANALYSIS_SAMPLE_RATE),
                "--duration-ms",
                str(total_ms),
            ],
            cwd=tindrop_root,
            capture_output=True,
            text=True,
        )
    if result.returncode != 0:
        raise RuntimeError(
            "Tindrop canonical Dart analyzer failed:\n"
            + (result.stderr or result.stdout)
        )
    json_start = result.stdout.find('{"schemaVersion"')
    if json_start < 0:
        raise RuntimeError("Tindrop canonical Dart analyzer returned no BeatMap")
    return json.loads(result.stdout[json_start:])


def preview_start(beat_map: dict, total_ms: int) -> int:
    sections = beat_map.get("sections") or []
    strongest = max(sections, key=lambda section: section["energy"], default=None)
    latest = max(0, total_ms - 30_000)
    target = min(
        latest,
        max(8_000, int(strongest["startMs"]) - 4_000 if strongest else 8_000),
    )
    beats = beat_map.get("downbeatTimesMs") or beat_map.get("beatTimesMs") or []
    return min(beats, key=lambda value: abs(value - target)) if beats else target
