#!/usr/bin/env python3
"""Optional end-to-end browser smoke test for POTAMORSE.

Requires Playwright for Python and a Chromium executable. It deliberately uses
``page.set_content`` so the test works in sandboxes that block ``file://`` and
localhost navigation.

Examples
--------
    pip install playwright
    playwright install chromium
    python3 qa/browser_smoke.py
    python3 qa/browser_smoke.py --chromium /usr/bin/chromium --screenshot /tmp/potamorse.png
"""
from __future__ import annotations

import argparse
import asyncio
from pathlib import Path

from playwright.async_api import Page, async_playwright

ROOT = Path(__file__).resolve().parents[1]


async def finish_tutorial(page: Page) -> None:
    for _ in range(3):
        await page.locator(".action-btn.primary").click()
        await page.wait_for_timeout(20)


async def select_local_mode(page: Page) -> None:
    await page.locator("#settingsBtn").click()
    await page.locator('[data-setting-mode="local"]').click()
    await page.locator(".action-btn.primary").click()
    await page.wait_for_function("!document.querySelector('.modal-layer:not(.hidden)')")


async def play_one_pulse(page: Page) -> None:
    # A move increments ``beat`` before its short post-move cadence finishes.
    # Wait for the interface lock to clear before attempting the next pulse.
    await page.wait_for_function(
        "window.POTAMORSE.snapshot().intermission || window.POTAMORSE.snapshot().over || "
        "!document.querySelector('#hintBtn').disabled",
        timeout=3_000,
    )
    snapshot = await page.evaluate("window.POTAMORSE.snapshot()")
    if snapshot["intermission"] or snapshot["over"]:
        return
    before = snapshot["beat"]
    pieces = page.locator(".cell.own-piece")
    for index in range(await pieces.count()):
        await pieces.nth(index).click(force=True)
        legal_cells = page.locator(".cell.legal")
        legal_nooks = page.locator(".nook.legal")
        if await legal_cells.count():
            await legal_cells.first.click(force=True)
            break
        if await legal_nooks.count():
            await legal_nooks.first.click(force=True)
            break
    # If every active piece was anchored, the built-in automatic pass advances.
    await page.wait_for_function(
        "previous => window.POTAMORSE.snapshot().beat > previous || "
        "window.POTAMORSE.snapshot().intermission || window.POTAMORSE.snapshot().over",
        arg=before,
        timeout=3_000,
    )


async def run(args: argparse.Namespace) -> None:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    errors: list[str] = []

    async with async_playwright() as playwright:
        launch = {"headless": True, "args": ["--no-sandbox"]}
        if args.chromium:
            launch["executable_path"] = args.chromium
        browser = await playwright.chromium.launch(**launch)
        context = await browser.new_context(
            viewport={"width": args.width, "height": args.height},
            device_scale_factor=1,
            is_mobile=args.width <= 500,
            has_touch=args.width <= 500,
        )
        page = await context.new_page()
        page.on("console", lambda message: errors.append(f"console {message.type}: {message.text}") if message.type == "error" else None)
        page.on("pageerror", lambda error: errors.append(f"pageerror: {error}"))
        await page.emulate_media(reduced_motion="reduce")
        await page.set_content(html, wait_until="load")
        await page.wait_for_function("window.POTAMORSE && window.POTAMORSE.selfTests().length >= 8")

        await finish_tutorial(page)
        await select_local_mode(page)

        while True:
            snapshot = await page.evaluate("window.POTAMORSE.snapshot()")
            if snapshot["over"]:
                break
            if snapshot["intermission"]:
                await page.locator(".action-btn.primary").click()
                await page.wait_for_function("!window.POTAMORSE.snapshot().intermission")
                continue
            await play_one_pulse(page)

        snapshot = await page.evaluate("window.POTAMORSE.snapshot()")
        dimensions = await page.evaluate(
            "({scrollHeight: document.documentElement.scrollHeight, innerHeight, "
            "scrollWidth: document.documentElement.scrollWidth, innerWidth})"
        )
        tests = await page.evaluate("window.POTAMORSE.selfTests()")

        assert snapshot["over"] is True
        assert snapshot["leg"] == 2
        assert len(snapshot["legRecords"]) == 2
        assert len(tests) >= 8
        assert dimensions["scrollHeight"] == dimensions["innerHeight"]
        assert dimensions["scrollWidth"] == dimensions["innerWidth"]
        assert not errors, "\n".join(errors)

        if args.screenshot:
            await page.screenshot(path=str(args.screenshot), full_page=False)

        print("PASS: 32-pulse browser season")
        print(f"totals: {snapshot['totals']}")
        print(f"viewport: {args.width}×{args.height}; page scroll: none")
        print(f"console/page errors: {len(errors)}")
        await browser.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--chromium", help="path to Chromium/Chrome executable")
    parser.add_argument("--width", type=int, default=390)
    parser.add_argument("--height", type=int, default=844)
    parser.add_argument("--screenshot", type=Path)
    args = parser.parse_args()
    asyncio.run(run(args))


if __name__ == "__main__":
    main()