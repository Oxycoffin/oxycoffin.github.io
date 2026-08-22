#!/usr/bin/env python3
"""Sign an already validated catalog. Running this is a gated release action."""

from __future__ import annotations

import argparse
import base64
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from validate_catalog import validate


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("catalog", type=Path)
    parser.add_argument("--key", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    validate(args.catalog, None)
    private_key = serialization.load_pem_private_key(
        args.key.read_bytes(),
        password=None,
    )
    if not isinstance(private_key, Ed25519PrivateKey):
        raise TypeError("the catalog key must be Ed25519")
    signature = private_key.sign(args.catalog.read_bytes())
    output = args.output or Path(f"{args.catalog}.sig")
    output.write_text(base64.b64encode(signature).decode("ascii") + "\n", encoding="ascii")
    print(output)


if __name__ == "__main__":
    main()
