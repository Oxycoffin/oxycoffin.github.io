#!/usr/bin/env python3
import argparse
import base64
import json
import struct
from datetime import datetime, timedelta, timezone
from pathlib import Path

from cryptography.hazmat.primitives.serialization import load_ssh_private_key

DEFAULT_CONFIG_IN = Path(__file__).resolve().parents[1] / "config.local.json"
DEFAULT_CONFIG_OUT = Path(__file__).resolve().parents[1] / "config.json"
DEFAULT_SIG_OUT = Path(__file__).resolve().parents[1] / "config.json.sig"
DEFAULT_PUB_OUT = Path(__file__).resolve().parents[1] / "REMOTE_CONFIG_PUBLIC_KEY.txt"
DEFAULT_KEY = Path.home() / ".tindrop_remote_config" / "remote_config_ed25519"
DEFAULT_PUB_KEY = Path.home() / ".tindrop_remote_config" / "remote_config_ed25519.pub"


def _canonical_json(data: dict) -> bytes:
    return json.dumps(data, separators=(",", ":"), sort_keys=True).encode("utf-8")


def _load_json(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8")
    data = json.loads(raw)
    if not isinstance(data, dict):
        raise ValueError("config must be a JSON object")
    return data


def _stamp_times(data: dict, days: int) -> dict:
    now = datetime.now(timezone.utc)
    data = dict(data)
    data.setdefault("issued_at", int(now.timestamp()))
    data.setdefault("expires_at", int((now + timedelta(days=days)).timestamp()))
    return data


def _load_private_key(path: Path):
    key_bytes = path.read_bytes()
    return load_ssh_private_key(key_bytes, password=None)


def _write_signature(sig_path: Path, payload: bytes, key_path: Path) -> None:
    key = _load_private_key(key_path)
    sig = key.sign(payload)
    sig_path.write_text(base64.b64encode(sig).decode("ascii"), encoding="utf-8")


def _write_public_key(pub_out: Path, pub_path: Path) -> None:
    # Extract raw ed25519 bytes from OpenSSH public key.
    parts = pub_path.read_text(encoding="utf-8").strip().split()
    if len(parts) < 2:
        raise ValueError("invalid ssh public key")
    blob = base64.b64decode(parts[1])
    pos = 0
    length = struct.unpack(">I", blob[pos:pos + 4])[0]
    pos += 4 + length
    length = struct.unpack(">I", blob[pos:pos + 4])[0]
    pos += 4
    key_bytes = blob[pos:pos + length]
    pub_out.write_text(base64.b64encode(key_bytes).decode("ascii"), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Sign Tindrop remote config")
    parser.add_argument(
        "--config-in",
        type=Path,
        default=DEFAULT_CONFIG_IN,
        help="Path to plaintext config JSON (default: tindrop/config.local.json)",
    )
    parser.add_argument(
        "--config-out",
        type=Path,
        default=DEFAULT_CONFIG_OUT,
        help="Path to output config JSON (default: tindrop/config.json)",
    )
    parser.add_argument(
        "--sig-out",
        type=Path,
        default=DEFAULT_SIG_OUT,
        help="Path to output signature (default: tindrop/config.json.sig)",
    )
    parser.add_argument(
        "--key",
        type=Path,
        default=DEFAULT_KEY,
        help="Path to Ed25519 private key (default: ~/.tindrop_remote_config/remote_config_ed25519)",
    )
    parser.add_argument(
        "--stamp",
        action="store_true",
        help="Set issued_at/expires_at if missing",
    )
    parser.add_argument(
        "--expires-days",
        type=int,
        default=30,
        help="Days until expiration when using --stamp (default: 30)",
    )
    parser.add_argument(
        "--update-public-key",
        action="store_true",
        help="Write REMOTE_CONFIG_PUBLIC_KEY.txt from ssh public key",
    )
    parser.add_argument(
        "--pub-key",
        type=Path,
        default=DEFAULT_PUB_KEY,
        help="Path to ssh public key (default: ~/.tindrop_remote_config/remote_config_ed25519.pub)",
    )
    parser.add_argument(
        "--pub-out",
        type=Path,
        default=DEFAULT_PUB_OUT,
        help="Path to public key output (default: tindrop/REMOTE_CONFIG_PUBLIC_KEY.txt)",
    )
    args = parser.parse_args()

    if not args.config_in.exists():
        raise SystemExit(f"config not found: {args.config_in}")
    if not args.key.exists():
        raise SystemExit(f"private key not found: {args.key}")

    data = _load_json(args.config_in)
    if args.stamp:
        data = _stamp_times(data, args.expires_days)

    payload = _canonical_json(data)
    args.config_out.write_bytes(payload)
    _write_signature(args.sig_out, payload, args.key)

    if args.update_public_key:
        if not args.pub_key.exists():
            raise SystemExit(f"public key not found: {args.pub_key}")
        _write_public_key(args.pub_out, args.pub_key)

    print(f"Wrote: {args.config_out}")
    print(f"Wrote: {args.sig_out}")
    if args.update_public_key:
        print(f"Wrote: {args.pub_out}")


if __name__ == "__main__":
    main()
