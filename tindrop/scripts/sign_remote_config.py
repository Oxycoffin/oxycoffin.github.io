#!/usr/bin/env python3
import argparse
import base64
import json
import struct
import sys
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


def _run_sign(
    config_in: Path,
    config_out: Path,
    sig_out: Path,
    key_path: Path,
    stamp: bool,
    expires_days: int,
) -> None:
    if not config_in.exists():
        raise SystemExit(f"config not found: {config_in}")
    if not key_path.exists():
        raise SystemExit(f"private key not found: {key_path}")

    data = _load_json(config_in)
    if stamp:
        data = _stamp_times(data, expires_days)

    payload = _canonical_json(data)
    config_out.write_bytes(payload)
    _write_signature(sig_out, payload, key_path)


def _prompt_path(label: str, default: Path) -> Path:
    raw = input(f"{label} [{default}]: ").strip()
    return Path(raw) if raw else default


def _prompt_bool(label: str, default: bool = False) -> bool:
    suffix = "Y/n" if default else "y/N"
    raw = input(f"{label} ({suffix}): ").strip().lower()
    if not raw:
        return default
    return raw in ("y", "yes", "1", "true")


def _prompt_int(label: str, default: int) -> int:
    raw = input(f"{label} [{default}]: ").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise SystemExit(f"invalid integer: {raw}") from exc


def _interactive() -> None:
    print("Tindrop Remote Config Signer")
    print("=" * 30)
    print("1) Sign config.json (optional timestamps)")
    print("2) Update public key file")
    print("3) Sign config.json + update public key")
    print("4) Show dart-define snippet")
    print("5) Exit")
    choice = input("Select option [1]: ").strip() or "1"

    if choice == "5":
        return

    if choice in ("1", "3"):
        config_in = _prompt_path("config.local.json", DEFAULT_CONFIG_IN)
        config_out = _prompt_path("config.json", DEFAULT_CONFIG_OUT)
        sig_out = _prompt_path("config.json.sig", DEFAULT_SIG_OUT)
        key_path = _prompt_path("private key", DEFAULT_KEY)
        stamp = _prompt_bool("Add issued_at/expires_at if missing", True)
        expires_days = _prompt_int("Expires in days", 30)
        print(
            f"Command: sign config_in={config_in} config_out={config_out} sig_out={sig_out} "
            f"key={key_path} stamp={stamp} expires_days={expires_days}"
        )
        _run_sign(
            config_in=config_in,
            config_out=config_out,
            sig_out=sig_out,
            key_path=key_path,
            stamp=stamp,
            expires_days=expires_days,
        )
        print(f"Wrote: {config_out}")
        print(f"Wrote: {sig_out}")

    if choice in ("2", "3"):
        pub_key = _prompt_path("public key", DEFAULT_PUB_KEY)
        pub_out = _prompt_path("public key output", DEFAULT_PUB_OUT)
        print(f"Command: update public key pub_key={pub_key} pub_out={pub_out}")
        if not pub_key.exists():
            raise SystemExit(f"public key not found: {pub_key}")
        _write_public_key(pub_out, pub_key)
        print(f"Wrote: {pub_out}")

    if choice == "4":
        key = DEFAULT_PUB_OUT.read_text(encoding="utf-8").strip()
        print("Dart defines:")
        print(
            f"--dart-define=REMOTE_CONFIG_URL=https://lagartijalabs.com/tindrop/config.json "
            f"--dart-define=REMOTE_CONFIG_PUBLIC_KEY={key}"
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Sign Tindrop remote config")
    parser.add_argument(
        "--interactive",
        action="store_true",
        help="Run interactive menu",
    )
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

    if args.interactive or (len(sys.argv) == 1 and sys.stdin.isatty()):
        _interactive()
        return

    _run_sign(
        config_in=args.config_in,
        config_out=args.config_out,
        sig_out=args.sig_out,
        key_path=args.key,
        stamp=args.stamp,
        expires_days=args.expires_days,
    )
    print(f"Wrote: {args.config_out}")
    print(f"Wrote: {args.sig_out}")

    if args.update_public_key:
        if not args.pub_key.exists():
            raise SystemExit(f"public key not found: {args.pub_key}")
        _write_public_key(args.pub_out, args.pub_key)
        print(f"Wrote: {args.pub_out}")


if __name__ == "__main__":
    main()
