#!/usr/bin/env python3
"""Validate a Tindrop beat-video music catalog without changing it."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import urlparse


ALLOWED_AUDIO_HOST = "media.lagartijalabs.com"
ALLOWED_LICENSES = {"CC0-1.0", "proprietary"}
HEX = set("0123456789abcdef")


def validate(path: Path, audio_root: Path | None) -> None:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or int(payload.get("version", 0)) <= 0:
        raise ValueError("version must be a positive integer")
    if int(payload.get("issuedAtMs", 0)) <= 0:
        raise ValueError("issuedAtMs must be a positive timestamp")
    tracks = payload.get("tracks")
    if not isinstance(tracks, list) or not tracks:
        raise ValueError("tracks must be a non-empty list")
    seen: set[str] = set()
    for index, track in enumerate(tracks):
        if not isinstance(track, dict):
            raise ValueError(f"track {index} must be an object")
        track_id = str(track.get("id", ""))
        if not track_id or track_id in seen:
            raise ValueError(f"track {index} has an empty or duplicate id")
        seen.add(track_id)
        parsed = urlparse(str(track.get("audioUrl", "")))
        if parsed.scheme != "https" or parsed.hostname != ALLOWED_AUDIO_HOST:
            raise ValueError(f"{track_id}: audioUrl must use the allowed HTTPS host")
        digest = str(track.get("sha256", "")).lower()
        if len(digest) != 64 or any(char not in HEX for char in digest):
            raise ValueError(f"{track_id}: invalid sha256")
        if int(track.get("sizeBytes", 0)) <= 0 or int(track.get("sizeBytes", 0)) > 100 * 1024 * 1024:
            raise ValueError(f"{track_id}: invalid sizeBytes")
        if int(track.get("durationMs", 0)) <= 0 or int(track.get("durationMs", 0)) > 10 * 60 * 1000:
            raise ValueError(f"{track_id}: invalid durationMs")
        if track.get("licenseId") not in ALLOWED_LICENSES:
            raise ValueError(f"{track_id}: unsupported licenseId")
        evidence = path.parent / "licenses" / f"{track_id}.md"
        if not evidence.is_file():
            raise ValueError(f"{track_id}: archived license evidence is missing")
        beat_map = track.get("beatMap")
        beats = beat_map.get("beatTimesMs") if isinstance(beat_map, dict) else None
        if not isinstance(beats, list) or len(beats) < 2 or beats != sorted(beats):
            raise ValueError(f"{track_id}: invalid beat map")
        if audio_root is not None:
            candidate = audio_root / Path(parsed.path).name
            if not candidate.is_file():
                raise ValueError(f"{track_id}: local audio candidate is missing")
            if candidate.stat().st_size != int(track["sizeBytes"]):
                raise ValueError(f"{track_id}: size mismatch")
            hasher = hashlib.sha256()
            with candidate.open("rb") as stream:
                for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                    hasher.update(chunk)
            actual = hasher.hexdigest()
            if actual != digest:
                raise ValueError(f"{track_id}: hash mismatch")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("catalog", type=Path)
    parser.add_argument("--audio-root", type=Path)
    args = parser.parse_args()
    validate(args.catalog, args.audio_root)
    print("catalog valid")


if __name__ == "__main__":
    main()
