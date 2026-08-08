#!/usr/bin/env python3
"""Store the current legacy Remote Config body as an immutable app profile."""

from __future__ import annotations

import argparse
import copy
import json
import re
from pathlib import Path


DEFAULT_CONFIG = Path(__file__).resolve().parents[1] / "config.local.json"
VERSION_PATTERN = re.compile(r"^\d+\.\d+\.\d+(?:\+\d+)?$")
ENVELOPE_KEYS = {"version", "issued_at", "expires_at", "app_versions"}


def _load(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise SystemExit("config must be a JSON object")
    return data


def _snapshot(data: dict, app_version: str, *, replace: bool) -> dict:
    if not VERSION_PATTERN.fullmatch(app_version):
        raise SystemExit(
            "app version must use x.y.z or x.y.z+build format"
        )
    profiles = data.get("app_versions")
    if profiles is None:
        profiles = {}
        data["app_versions"] = profiles
    if not isinstance(profiles, dict):
        raise SystemExit("app_versions must be a JSON object")
    if app_version in profiles and not replace:
        raise SystemExit(
            f"profile {app_version} already exists; pass --replace intentionally"
        )

    profile = {
        key: copy.deepcopy(value)
        for key, value in data.items()
        if key not in ENVELOPE_KEYS
    }
    profiles[app_version] = profile
    return data


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Snapshot the current Remote Config for one app version"
    )
    parser.add_argument("app_version", help="x.y.z or x.y.z+build")
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument(
        "--replace",
        action="store_true",
        help="replace an existing profile intentionally",
    )
    args = parser.parse_args()

    data = _snapshot(_load(args.config), args.app_version, replace=args.replace)
    args.config.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Stored app_versions.{args.app_version} in {args.config}")


if __name__ == "__main__":
    main()
