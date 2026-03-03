#!/usr/bin/env python3
"""Minimal local UI to edit Tindrop remote config and publish to GitHub."""

from __future__ import annotations

import argparse
import html
import json
import subprocess
import sys
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Optional
from urllib.parse import parse_qs


REPO_ROOT = Path(__file__).resolve().parents[2]
TINDROP_DIR = REPO_ROOT / "tindrop"
CONFIG_LOCAL = TINDROP_DIR / "config.local.json"
CONFIG_OUT = TINDROP_DIR / "config.json"
SIG_OUT = TINDROP_DIR / "config.json.sig"
SIGN_SCRIPT = TINDROP_DIR / "scripts" / "sign_remote_config.py"


def _load_config_text() -> str:
    for candidate in (CONFIG_LOCAL, TINDROP_DIR / "config.example.json", CONFIG_OUT):
        if candidate.exists():
            data = json.loads(candidate.read_text(encoding="utf-8"))
            return json.dumps(data, indent=2, ensure_ascii=False)
    return "{}\n"


def _run(cmd: list[str], *, cwd: Optional[Path] = None) -> tuple[int, str]:
    proc = subprocess.run(
        cmd,
        cwd=str(cwd or REPO_ROOT),
        text=True,
        capture_output=True,
        check=False,
    )
    output = []
    if proc.stdout:
        output.append(proc.stdout.strip())
    if proc.stderr:
        output.append(proc.stderr.strip())
    joined = "\n".join(part for part in output if part)
    return proc.returncode, joined


def _git_status_short() -> str:
    rc, out = _run(["git", "status", "--short", "--branch"])
    if rc != 0:
        return f"Unable to get git status (exit {rc})"
    return out or "Clean working tree"


def _render_page(
    config_text: str,
    *,
    commit_message: str,
    push_enabled: bool,
    log_text: str,
    notice: str,
) -> bytes:
    escaped_config = html.escape(config_text)
    escaped_message = html.escape(commit_message)
    escaped_log = html.escape(log_text)
    escaped_notice = html.escape(notice)
    checked = "checked" if push_enabled else ""
    generated = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    page = f"""<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Tindrop Remote Config Admin</title>
    <style>
      :root {{
        --bg: #0b1221;
        --panel: #14213d;
        --panel-2: #1f2f56;
        --text: #f4f8ff;
        --muted: #c0cee9;
        --accent: #ff8a00;
        --ok: #22c55e;
      }}
      * {{ box-sizing: border-box; }}
      body {{
        margin: 0;
        font-family: "Avenir Next", "Segoe UI", sans-serif;
        background: radial-gradient(circle at top right, #20315e 0%, var(--bg) 55%);
        color: var(--text);
      }}
      .wrap {{
        max-width: 980px;
        margin: 24px auto;
        padding: 0 16px;
      }}
      .card {{
        background: linear-gradient(170deg, var(--panel) 0%, var(--panel-2) 100%);
        border: 1px solid #2f4b82;
        border-radius: 14px;
        padding: 16px;
        box-shadow: 0 20px 32px rgba(0, 0, 0, 0.3);
      }}
      h1 {{ margin: 0 0 8px; font-size: 24px; }}
      p {{ margin: 4px 0 0; color: var(--muted); }}
      .meta {{
        margin: 12px 0 16px;
        font-size: 13px;
        color: var(--muted);
      }}
      label {{ display: block; font-weight: 600; margin: 14px 0 8px; }}
      textarea, input[type="text"] {{
        width: 100%;
        border: 1px solid #3b5ea0;
        border-radius: 10px;
        padding: 10px;
        background: #0f1b35;
        color: var(--text);
        font-family: "SF Mono", Menlo, Consolas, monospace;
        font-size: 14px;
      }}
      textarea {{ min-height: 420px; resize: vertical; }}
      .controls {{
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin: 14px 0;
      }}
      .row {{ display: flex; align-items: center; gap: 8px; color: var(--muted); }}
      button {{
        border: none;
        border-radius: 10px;
        padding: 11px 16px;
        background: linear-gradient(135deg, #ff8a00 0%, #ff6a00 100%);
        color: #fff;
        font-weight: 700;
        cursor: pointer;
      }}
      button:hover {{ filter: brightness(1.08); }}
      pre {{
        margin-top: 10px;
        background: #091126;
        border: 1px solid #2f4b82;
        border-radius: 10px;
        padding: 12px;
        overflow: auto;
        white-space: pre-wrap;
        color: #f5f9ff;
      }}
      .notice {{
        margin-top: 8px;
        color: var(--ok);
        font-weight: 600;
      }}
      .status {{
        border: 1px solid #2f4b82;
        border-radius: 10px;
        padding: 10px;
        background: rgba(9, 17, 38, 0.65);
      }}
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>Tindrop Remote Config Admin</h1>
        <p>Edita JSON, firma config y sube al repo en un clic.</p>
        <div class="meta">Repo: {html.escape(str(REPO_ROOT))} | Generado: {generated}</div>

        <form method="post">
          <label for="config_json">Config JSON</label>
          <textarea id="config_json" name="config_json" spellcheck="false">{escaped_config}</textarea>

          <label for="commit_message">Mensaje de commit</label>
          <input id="commit_message" name="commit_message" type="text" value="{escaped_message}" />

          <div class="controls">
            <label class="row" for="push">
              <input id="push" name="push" type="checkbox" value="1" {checked} />
              Push automático a origin/HEAD
            </label>
            <button type="submit">Guardar + firmar + commit + push</button>
          </div>
        </form>

        <div class="status">
          <strong>Git status</strong>
          <pre>{html.escape(_git_status_short())}</pre>
        </div>

        <div class="notice">{escaped_notice}</div>
        <pre>{escaped_log}</pre>
      </div>
    </div>
  </body>
</html>
"""
    return page.encode("utf-8")


class RemoteConfigHandler(BaseHTTPRequestHandler):
    server_version = "TindropConfigServer/1.0"

    def log_message(self, fmt: str, *args) -> None:
        # Quiet default access logs; command logs are shown in the UI.
        return

    def _send_html(self, body: bytes) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802 (http method name)
        body = _render_page(
            _load_config_text(),
            commit_message="chore: update tindrop remote config",
            push_enabled=True,
            log_text="Esperando cambios.",
            notice="",
        )
        self._send_html(body)

    def do_POST(self) -> None:  # noqa: N802 (http method name)
        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length).decode("utf-8")
        form = parse_qs(raw_body)

        config_text = form.get("config_json", [""])[0]
        commit_message = form.get("commit_message", ["chore: update tindrop remote config"])[0].strip()
        push_enabled = form.get("push", [""])[0] == "1"

        logs: list[str] = []
        notice = ""

        try:
            parsed = json.loads(config_text)
            if not isinstance(parsed, dict):
                raise ValueError("El JSON debe ser un objeto")

            CONFIG_LOCAL.write_text(
                json.dumps(parsed, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
            logs.append(f"Updated: {CONFIG_LOCAL}")

            sign_cmd = [
                sys.executable,
                str(SIGN_SCRIPT),
                "--config-in",
                str(CONFIG_LOCAL),
                "--config-out",
                str(CONFIG_OUT),
                "--sig-out",
                str(SIG_OUT),
            ]
            rc, out = _run(sign_cmd, cwd=REPO_ROOT)
            logs.append("$ " + " ".join(sign_cmd))
            if out:
                logs.append(out)
            if rc != 0:
                raise RuntimeError(f"Sign failed with exit code {rc}")

            add_cmd = [
                "git",
                "add",
                "tindrop/config.local.json",
                "tindrop/config.json",
                "tindrop/config.json.sig",
            ]
            rc, out = _run(add_cmd)
            logs.append("$ " + " ".join(add_cmd))
            if out:
                logs.append(out)
            if rc != 0:
                raise RuntimeError(f"git add failed with exit code {rc}")

            rc, _ = _run(["git", "diff", "--cached", "--quiet"])
            if rc == 0:
                notice = "No hay cambios para commitear."
            else:
                if not commit_message:
                    commit_message = "chore: update tindrop remote config"

                commit_cmd = ["git", "commit", "-m", commit_message]
                rc, out = _run(commit_cmd)
                logs.append("$ " + " ".join(commit_cmd))
                if out:
                    logs.append(out)
                if rc != 0:
                    raise RuntimeError(f"git commit failed with exit code {rc}")

                if push_enabled:
                    push_cmd = ["git", "push", "origin", "HEAD"]
                    rc, out = _run(push_cmd)
                    logs.append("$ " + " ".join(push_cmd))
                    if out:
                        logs.append(out)
                    if rc != 0:
                        raise RuntimeError(f"git push failed with exit code {rc}")
                    notice = "Config publicada y push completado."
                else:
                    notice = "Config firmada y commit creado (sin push)."

            # Refresh text with signed output so version/issued_at are visible after publish.
            config_text = CONFIG_OUT.read_text(encoding="utf-8")

        except Exception as exc:  # noqa: BLE001
            logs.append(f"ERROR: {exc}")
            notice = "Error durante el flujo. Revisa el log."

        body = _render_page(
            config_text,
            commit_message=commit_message,
            push_enabled=push_enabled,
            log_text="\n\n".join(logs) if logs else "Sin logs.",
            notice=notice,
        )
        self._send_html(body)


def main() -> None:
    parser = argparse.ArgumentParser(description="Local UI for Tindrop remote config")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind")
    parser.add_argument("--port", type=int, default=8787, help="Port to bind")
    args = parser.parse_args()

    if not SIGN_SCRIPT.exists():
        raise SystemExit(f"Missing signer script: {SIGN_SCRIPT}")

    server = ThreadingHTTPServer((args.host, args.port), RemoteConfigHandler)
    print(f"Remote config UI running at http://{args.host}:{args.port}")
    print("Press Ctrl+C to stop")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
