#!/usr/bin/env python3
"""Generate Tindrop Originals instrumentals with the ElevenLabs Music API.

Reads a prompts JSON list ([{id, prompt, length_ms?, seed?}]) and writes one
audio file per item plus manifest.json into <out_dir>. Re-running on the same
<out_dir> resumes: items already in its manifest with their file present are
skipped, so a failed or interrupted batch never pays twice for a finished track.

Usage: python3 generate_eleven_tracks.py <prompts.json> <out_dir> [--only id,id]

Environment: MODEL_ID (default music_v2_5), OUTPUT_FORMAT (default
mp3_44100_192), LENGTH_MS (default 90000). The API key is read from the macOS
Keychain item `elevenlabs-api-key` and never printed.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

API = "https://api.elevenlabs.io/v1/music"
MODEL_ID = os.environ.get("MODEL_ID", "music_v2_5")
OUTPUT_FORMAT = os.environ.get("OUTPUT_FORMAT", "mp3_44100_192")
LENGTH_MS = int(os.environ.get("LENGTH_MS", "90000"))
EXTENSIONS = {"mp3": ".mp3", "pcm": ".pcm", "opus": ".opus"}


def api_key() -> str:
    return subprocess.run(
        ["security", "find-generic-password", "-s", "elevenlabs-api-key", "-w"],
        check=True, capture_output=True, text=True,
    ).stdout.strip()


def compose(key: str, item: dict) -> tuple[bytes, dict]:
    body = {
        "prompt": item["prompt"],
        "music_length_ms": item.get("length_ms", LENGTH_MS),
        "model_id": MODEL_ID,
        "force_instrumental": True,
    }
    request = urllib.request.Request(
        f"{API}?output_format={OUTPUT_FORMAT}",
        data=json.dumps(body).encode(),
        headers={"xi-api-key": key, "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=600) as response:
        # Keep request/song identifiers for inpainting and support; never the key.
        headers = {
            name.lower(): value for name, value in response.headers.items()
            if "id" in name.lower() and "key" not in name.lower()
        }
        return response.read(), headers


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("prompts", type=Path)
    parser.add_argument("out_dir", type=Path)
    parser.add_argument("--only", help="comma-separated ids to generate")
    args = parser.parse_args()
    prompts = json.loads(args.prompts.read_text(encoding="utf-8"))
    if args.only:
        wanted = set(args.only.split(","))
        prompts = [item for item in prompts if item["id"] in wanted]
    args.out_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = args.out_dir / "manifest.json"
    manifest = {"model_id": MODEL_ID, "output_format": OUTPUT_FORMAT, "tracks": []}
    if manifest_path.is_file():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest["tracks"] = [t for t in manifest["tracks"] if (args.out_dir / t["file"]).is_file()]
    finished = {t["id"] for t in manifest["tracks"]}
    extension = EXTENSIONS[OUTPUT_FORMAT.split("_")[0]]
    key = api_key()
    failures = 0
    for item in prompts:
        if item["id"] in finished:
            continue
        started = time.time()
        try:
            audio, headers = compose(key, item)
        except urllib.error.HTTPError as error:
            detail = error.read().decode(errors="replace")[:500]
            print(f"[fail] {item['id']}: HTTP {error.code} {detail}", flush=True)
            failures += 1
            if error.code in (401, 402, 403):
                break  # Plan, quota or permission problem: retrying cannot help.
            continue
        target = args.out_dir / f"{item['id']}{extension}"
        partial = target.with_suffix(target.suffix + ".part")
        partial.write_bytes(audio)
        partial.replace(target)
        entry = {
            "id": item["id"],
            "file": target.name,
            "prompt": item["prompt"],
            "length_ms": item.get("length_ms", LENGTH_MS),
            "bpm": item.get("bpm"),
            "key": item.get("key"),
            "response_headers": headers,
            "bytes": len(audio),
            "seconds": round(time.time() - started, 1),
        }
        manifest["tracks"].append(entry)
        manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"[done] {item['id']}: {len(audio)} bytes in {entry['seconds']} s", flush=True)
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
