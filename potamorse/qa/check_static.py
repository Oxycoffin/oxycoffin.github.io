#!/usr/bin/env python3
"""Static, dependency-free checks for the POTAMORSE package."""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--extract-js", action="store_true", help="write qa/extracted-script.js for node --check")
    args = parser.parse_args()

    html = INDEX.read_text(encoding="utf-8")
    scripts = re.findall(r"<script(?:\s[^>]*)?>(.*?)</script>", html, flags=re.S | re.I)

    require(html.lower().startswith("<!doctype html>"), "missing HTML5 doctype")
    require(len(scripts) == 1, f"expected one inline script, found {len(scripts)}")
    require("type=\"module\"" not in html and "type='module'" not in html, "unexpected ES module")
    require("webgl" not in html.lower(), "unexpected WebGL dependency")
    require("decompressionstream" not in html.lower(), "unexpected DecompressionStream dependency")
    require("fetch(" not in scripts[0] and "XMLHttpRequest" not in scripts[0], "runtime network access detected")
    require("ABBABAABBAABABBA" in html, "documented pulse sequence missing")
    require("0110100110010110" in scripts[0], "Thue–Morse self-test missing")
    require("window.POTAMORSE" in scripts[0], "public QA hook missing")
    require("prefers-reduced-motion" in html, "reduced-motion support missing")
    require("aria-label" in html, "ARIA labels missing")
    require("localStorage" in scripts[0] and "try" in scripts[0], "resilient local persistence missing")

    # Only the embedded data favicon may contain an href; runtime assets are inline.
    external = re.findall(r"(?:src|href)=[\"'](https?://[^\"']+)", html, flags=re.I)
    require(not external, f"external runtime resources detected: {external}")

    if args.extract_js:
        target = ROOT / "qa" / "extracted-script.js"
        target.write_text(scripts[0].strip() + "\n", encoding="utf-8")
        print(f"extracted: {target}")

    print("PASS: static package checks")
    print(f"index bytes: {INDEX.stat().st_size:,}")
    print("runtime dependencies: 0")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        raise