#!/usr/bin/env python3
"""Run generate_ace_tracks.py until the whole batch is done, surviving drives
that briefly drop off the bus.

The output (and the checkpoints) live on an external SSD. When it disappears
the generator dies; this supervisor then waits for the *same* volume (same
APFS UUID, writable) to come back and relaunches it. The generator resumes
from its manifest, so finished tracks are never redone. Nothing is written to
a substitute folder while the volume is missing.

Usage: DIT_MODEL=acestep-v15-xl-sft DIT_BITS=16 caffeinate -ims python3 \
    run_ace_batch.py <prompts.json> <out_dir> [--after-pid PID]

Environment: everything is passed through to the generator. WAIT_HOURS
(default 12) bounds the wait for a missing volume; MAX_FAILURES (default 3)
bounds consecutive relaunches that made no progress while the volume stayed
mounted, so a real bug stops instead of looping.
"""

from __future__ import annotations

import argparse
import json
import os
import plistlib
import subprocess
import sys
import time
from pathlib import Path

PYTHON = "/Users/macmini/dev/ACE-Step-1.5/.venv/bin/python"
GENERATOR = Path(__file__).resolve().parent / "generate_ace_tracks.py"
POLL_S = 10


def log(message: str) -> None:
    print(f"[supervisor {time.strftime('%H:%M:%S')}] {message}", flush=True)


def volume_root(path: Path) -> Path:
    parts = path.resolve().parts
    if len(parts) < 3 or parts[1] != "Volumes":
        raise SystemExit(f"{path} is not on an external volume under /Volumes")
    return Path(*parts[:3])


def volume_uuid(root: Path) -> str | None:
    if not root.is_dir():
        return None
    result = subprocess.run(["diskutil", "info", "-plist", str(root)], capture_output=True)
    if result.returncode:
        return None
    info = plistlib.loads(result.stdout)
    if info.get("MountPoint") != str(root) or not info.get("WritableVolume"):
        return None
    return info.get("VolumeUUID")


def wait_for_volume(root: Path, uuid: str, deadline: float) -> None:
    if volume_uuid(root) == uuid:
        return
    log(f"{root} ({uuid}) is missing; waiting for it to come back")
    while volume_uuid(root) != uuid:
        if time.time() > deadline:
            raise SystemExit(f"{root} did not come back in time; batch left resumable")
        time.sleep(POLL_S)
    log(f"{root} is back")


def finished(out_dir: Path) -> set[str]:
    try:
        tracks = json.loads((out_dir / "manifest.json").read_text())["tracks"]
    except (OSError, ValueError, KeyError):
        return set()
    return {t["id"] for t in tracks if (out_dir / t["file"]).is_file()}


def expected(prompts: Path) -> set[str]:
    variants = int(os.environ.get("VARIANTS", "1"))
    ids = [item["id"] for item in json.loads(prompts.read_text())]
    return {f"{i}-v{v}" if variants > 1 else i for i in ids for v in range(1, variants + 1)}


def wait_for_pid(pid: int) -> None:
    log(f"waiting for the running generator (pid {pid}) to exit")
    while True:
        try:
            os.kill(pid, 0)
        except ProcessLookupError:
            return
        time.sleep(POLL_S)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("prompts", type=Path)
    parser.add_argument("out_dir", type=Path)
    parser.add_argument("--after-pid", type=int, help="adopt a generator already running on out_dir")
    args = parser.parse_args()
    prompts, out_dir = args.prompts.resolve(), args.out_dir.resolve()
    root = volume_root(out_dir)
    uuid = volume_uuid(root)
    if uuid is None:
        raise SystemExit(f"{root} is not mounted and writable; not starting")
    wait_hours = float(os.environ.get("WAIT_HOURS", "12"))
    max_failures = int(os.environ.get("MAX_FAILURES", "3"))
    # The prompts may sit on the same volume; read them while it is mounted.
    wanted = expected(prompts)
    log(f"{len(wanted)} tracks into {out_dir} on {root} ({uuid})")

    if args.after_pid:
        wait_for_pid(args.after_pid)
    failures = 0
    run = 0
    while True:
        wait_for_volume(root, uuid, time.time() + wait_hours * 3600)
        done = finished(out_dir) & wanted
        if wanted <= done:
            log(f"batch complete: {len(done)} tracks")
            return
        run += 1
        log(f"run {run}: {len(done)}/{len(wanted)} done, launching generator")
        log_path = out_dir / "generation.log"
        try:
            with log_path.open("a") as stream:
                stream.write(f"\n===== supervisor run {run} {time.strftime('%Y-%m-%d %H:%M:%S %z')} =====\n")
                stream.flush()
                code = subprocess.run(
                    [PYTHON, "-I", str(GENERATOR), str(prompts), str(out_dir)],
                    stdout=stream, stderr=subprocess.STDOUT,
                ).returncode
        except OSError as error:
            # The volume vanished while opening or writing the log.
            code = -1
            log(f"run {run}: {error}")
        if volume_uuid(root) != uuid:
            log(f"run {run}: exit {code}, volume missing")
            failures = 0
            continue
        progress = len(finished(out_dir) & wanted) - len(done)
        log(f"run {run}: exit {code}, +{progress} tracks")
        failures = 0 if progress > 0 else failures + 1
        if failures >= max_failures:
            raise SystemExit(f"{failures} runs without progress with {root} mounted; see {log_path}")


if __name__ == "__main__":
    sys.exit(main())
