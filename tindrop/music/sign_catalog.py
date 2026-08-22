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
    parser.add_argument("--catalog-output", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    validate(args.catalog, None)
    key_bytes = args.key.read_bytes()
    try:
        private_key = serialization.load_ssh_private_key(key_bytes, password=None)
    except ValueError:
        private_key = serialization.load_pem_private_key(key_bytes, password=None)
    if not isinstance(private_key, Ed25519PrivateKey):
        raise TypeError("the catalog key must be Ed25519")
    payload = args.catalog.read_bytes()
    catalog_output = args.catalog_output or args.catalog
    if catalog_output != args.catalog:
        catalog_output.write_bytes(payload)
    signature = private_key.sign(payload)
    output = args.output or Path(f"{catalog_output}.sig")
    output.write_text(base64.b64encode(signature).decode("ascii") + "\n", encoding="ascii")
    print(catalog_output)
    print(output)


if __name__ == "__main__":
    main()
