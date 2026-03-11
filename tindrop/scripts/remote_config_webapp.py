#!/usr/bin/env python3
"""Local UI to edit and publish Tindrop remote config."""

from __future__ import annotations

import argparse
import copy
import html
import json
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Optional
from urllib.parse import parse_qs


REPO_ROOT = Path(__file__).resolve().parents[2]
TINDROP_DIR = REPO_ROOT / "tindrop"
CONFIG_LOCAL = TINDROP_DIR / "config.local.json"
CONFIG_OUT = TINDROP_DIR / "config.json"
SIG_OUT = TINDROP_DIR / "config.json.sig"
SIGN_SCRIPT = TINDROP_DIR / "scripts" / "sign_remote_config.py"
DEFAULT_COMMIT = "chore: update tindrop remote config"


@dataclass(frozen=True)
class FieldDef:
    path: str
    label: str
    kind: str  # bool | int | float | text | int_list
    default: Any
    help_text: str = ""
    placeholder: str = ""


@dataclass(frozen=True)
class SectionDef:
    key: str
    title: str
    description: str
    fields: tuple[FieldDef, ...]
    collapsed: bool = False


SECTIONS: tuple[SectionDef, ...] = (
    SectionDef(
        key="flags",
        title="Feature Flags",
        description="Claves activas en RemoteConfigFlags.",
        fields=(
            FieldDef("flags.show_source_selector", "show_source_selector", "bool", True),
            FieldDef("flags.enable_whats_new", "enable_whats_new", "bool", True),
            FieldDef("flags.enable_interactive_tutorial", "enable_interactive_tutorial", "bool", True),
        ),
    ),
    SectionDef(
        key="ads_core",
        title="Ads Core",
        description="Claves activas en RemoteConfigAds.",
        fields=(
            FieldDef("ads.frequency", "frequency", "int", 10),
            FieldDef("ads.premium_first_ad", "premium_first_ad", "int", 3),
            FieldDef("ads.premium_ad_frequency", "premium_ad_frequency", "int", 7),
            FieldDef(
                "ads.rewarded_interstitial_cooldown_minutes",
                "rewarded_interstitial_cooldown_minutes",
                "int",
                5,
                "Reemplaza al legacy cooldown_minutes.",
            ),
        ),
    ),
    SectionDef(
        key="ads_units",
        title="Ads Units",
        description="Claves activas en RemoteConfigAdUnits.",
        fields=(
            FieldDef("ads.units.android_native", "android_native", "text", "ca-app-pub-6279728494613017/8616979665"),
            FieldDef("ads.units.ios_native", "ios_native", "text", "ca-app-pub-6279728494613017/5081354485"),
            FieldDef("ads.units.android_interstitial", "android_interstitial", "text", "ca-app-pub-6279728494613017/5015294938"),
            FieldDef("ads.units.ios_interstitial", "ios_interstitial", "text", "ca-app-pub-6279728494613017/7703664303"),
            FieldDef("ads.units.android_rewarded", "android_rewarded", "text", "ca-app-pub-6279728494613017/4690020554"),
            FieldDef("ads.units.ios_rewarded", "ios_rewarded", "text", "ca-app-pub-6279728494613017/4963345117"),
            FieldDef("ads.units.android_rewarded_interstitial", "android_rewarded_interstitial", "text", "ca-app-pub-6279728494613017/1656323137"),
            FieldDef("ads.units.ios_rewarded_interstitial", "ios_rewarded_interstitial", "text", "ca-app-pub-6279728494613017/9395358143"),
        ),
    ),
    SectionDef(
        key="premium",
        title="Premium",
        description="Claves activas en RemoteConfigPremium.",
        fields=(
            FieldDef("premium.free_swipes_intro_limit", "free_swipes_intro_limit", "int", 100),
            FieldDef("premium.filter_trial_limit", "filter_trial_limit", "int", 50),
            FieldDef("premium.free_swipes_daily_limit", "free_swipes_daily_limit", "int", 20),
            FieldDef("premium.rewarded_swipe_grant", "rewarded_swipe_grant", "int", 50),
        ),
    ),
    SectionDef(
        key="rating",
        title="Rating",
        description="Claves activas en RemoteConfigRating.",
        fields=(
            FieldDef("rating.swipe_threshold", "swipe_threshold", "int", 200),
            FieldDef("rating.cooldown_days", "cooldown_days", "int", 7),
            FieldDef("rating.ios_app_store_id", "ios_app_store_id", "text", "6756980913"),
        ),
    ),
    SectionDef(
        key="notifications",
        title="Notifications",
        description="Claves activas en RemoteConfigNotifications.",
        fields=(
            FieldDef("notifications.default_frequency_minutes", "default_frequency_minutes", "int", 10080),
            FieldDef("notifications.default_min_pending_assets", "default_min_pending_assets", "int", 200),
            FieldDef("notifications.threshold_options", "threshold_options (comma separated)", "int_list", [50, 100, 200, 500, 1000]),
        ),
    ),
    SectionDef(
        key="links",
        title="Links",
        description="Claves activas en RemoteConfigLinks.",
        fields=(
            FieldDef("links.privacy_policy_url", "privacy_policy_url", "text", "https://oxycoffin.github.io/Tindrop_pages/privacy.html"),
            FieldDef("links.terms_url", "terms_url", "text", "https://oxycoffin.github.io/Tindrop_pages/terms.html"),
            FieldDef("links.support_email", "support_email", "text", "lagartijalabs@gmail.com"),
            FieldDef("links.play_store_url", "play_store_url", "text", "https://lagartijalabs.com/tindrop/go/"),
        ),
    ),
    SectionDef(
        key="monetization_core",
        title="Monetization Core",
        description="Claves activas en RemoteConfigMonetization.",
        collapsed=True,
        fields=(
            FieldDef("monetization.intent_high_threshold", "intent_high_threshold", "float", 0.70),
            FieldDef("monetization.intent_medium_threshold", "intent_medium_threshold", "float", 0.45),
            FieldDef("monetization.risk_high_threshold", "risk_high_threshold", "float", 0.65),
            FieldDef("monetization.high_backlog_threshold", "high_backlog_threshold", "int", 1200),
            FieldDef("monetization.prompt_cooldown_seconds", "prompt_cooldown_seconds", "int", 45),
            FieldDef("monetization.max_prompts_per_session", "max_prompts_per_session", "int", 3),
            FieldDef("monetization.high_intent_prompt_cooldown_seconds", "high_intent_prompt_cooldown_seconds", "int", 30),
            FieldDef("monetization.fatigued_prompt_cooldown_seconds", "fatigued_prompt_cooldown_seconds", "int", 90),
            FieldDef("monetization.intent_bias", "intent_bias", "float", -0.65),
            FieldDef("monetization.intent_weight_swipes_10m", "intent_weight_swipes_10m", "float", 1.40),
            FieldDef("monetization.intent_weight_gate_hits_24h", "intent_weight_gate_hits_24h", "float", 1.10),
            FieldDef("monetization.intent_weight_pending_ratio", "intent_weight_pending_ratio", "float", 0.75),
            FieldDef("monetization.intent_weight_free_remaining_inverse", "intent_weight_free_remaining_inverse", "float", 0.95),
            FieldDef("monetization.intent_weight_sessions_3d", "intent_weight_sessions_3d", "float", 0.60),
            FieldDef("monetization.risk_bias", "risk_bias", "float", -0.75),
            FieldDef("monetization.risk_weight_pending_ratio", "risk_weight_pending_ratio", "float", 1.50),
            FieldDef("monetization.risk_weight_swipes_10m", "risk_weight_swipes_10m", "float", 0.90),
            FieldDef("monetization.risk_weight_gate_hits_24h", "risk_weight_gate_hits_24h", "float", 0.75),
            FieldDef("monetization.risk_weight_sessions_3d", "risk_weight_sessions_3d", "float", 0.50),
        ),
    ),
    SectionDef(
        key="monetization_intent_context",
        title="Monetization Intent Context",
        description="Claves activas en monetization.intent_context.",
        collapsed=True,
        fields=(
            FieldDef("monetization.intent_context.classify_confirm_boost", "classify_confirm_boost", "float", 0.22),
            FieldDef("monetization.intent_context.daily_clean_start_boost", "daily_clean_start_boost", "float", 0.18),
            FieldDef("monetization.intent_context.random_sort_select_boost", "random_sort_select_boost", "float", 0.14),
            FieldDef("monetization.intent_context.size_sort_select_boost", "size_sort_select_boost", "float", 0.15),
            FieldDef("monetization.intent_context.filter_select_boost", "filter_select_boost", "float", 0.16),
            FieldDef("monetization.intent_context.drive_source_select_boost", "drive_source_select_boost", "float", 0.20),
            FieldDef("monetization.intent_context.swipe_limit_reached_boost", "swipe_limit_reached_boost", "float", 0.26),
            FieldDef("monetization.intent_context.settings_premium_boost", "settings_premium_boost", "float", 0.10),
            FieldDef("monetization.intent_context.high_velocity_boost", "high_velocity_boost", "float", 0.10),
            FieldDef("monetization.intent_context.hard_gate_boost", "hard_gate_boost", "float", 0.08),
        ),
    ),
    SectionDef(
        key="monetization_fatigue",
        title="Monetization Fatigue",
        description="Claves activas en monetization.fatigue.",
        collapsed=True,
        fields=(
            FieldDef("monetization.fatigue.dismiss_penalty_weight", "dismiss_penalty_weight", "float", 0.55),
            FieldDef("monetization.fatigue.impression_penalty_weight", "impression_penalty_weight", "float", 0.30),
            FieldDef("monetization.fatigue.gate_penalty_weight", "gate_penalty_weight", "float", 0.25),
            FieldDef("monetization.fatigue.suppress_prompt_threshold", "suppress_prompt_threshold", "float", 0.78),
            FieldDef("monetization.fatigue.close_offer_threshold", "close_offer_threshold", "float", 0.58),
        ),
    ),
    SectionDef(
        key="monetization_copy",
        title="Monetization Copy Policy",
        description="Claves activas en monetization.copy_policy.",
        collapsed=True,
        fields=(
            FieldDef("monetization.copy_policy.max_highlights_compact", "max_highlights_compact", "int", 2),
            FieldDef("monetization.copy_policy.social_proof_min_width", "social_proof_min_width", "float", 380.0),
            FieldDef("monetization.copy_policy.show_swipe_limit_reset_hint", "show_swipe_limit_reset_hint", "bool", True),
        ),
    ),
    SectionDef(
        key="monetization_funnel",
        title="Monetization Funnel",
        description="Claves activas en monetization.funnel.",
        collapsed=True,
        fields=(
            FieldDef("monetization.funnel.hard_gate_after_gate_hits_24h", "hard_gate_after_gate_hits_24h", "int", 2),
            FieldDef("monetization.funnel.close_offer_after_gate_hits_24h", "close_offer_after_gate_hits_24h", "int", 4),
            FieldDef("monetization.funnel.close_offer_after_impressions_24h", "close_offer_after_impressions_24h", "int", 2),
        ),
    ),
    SectionDef(
        key="monetization_urgency",
        title="Monetization Urgency",
        description="Claves activas en monetization.urgency.",
        collapsed=True,
        fields=(
            FieldDef("monetization.urgency.free_swipes_low_pressure_threshold", "free_swipes_low_pressure_threshold", "int", 8),
            FieldDef("monetization.urgency.free_swipes_high_pressure_threshold", "free_swipes_high_pressure_threshold", "int", 3),
            FieldDef("monetization.urgency.pending_assets_high_pressure_threshold", "pending_assets_high_pressure_threshold", "int", 900),
        ),
    ),
    SectionDef(
        key="monetization_creative",
        title="Monetization Creative",
        description="Claves activas en monetization.creative.",
        collapsed=True,
        fields=(
            FieldDef("monetization.creative.enable_social_proof", "enable_social_proof", "bool", True),
            FieldDef("monetization.creative.enable_value_stack", "enable_value_stack", "bool", True),
            FieldDef("monetization.creative.enable_savings_hint", "enable_savings_hint", "bool", True),
        ),
    ),
    SectionDef(
        key="monetization_catalog",
        title="Monetization Subscription Catalog",
        description="Claves activas en monetization.subscription_catalog.",
        collapsed=True,
        fields=(
            FieldDef("monetization.subscription_catalog.enable_annual_trial_7d", "enable_annual_trial_7d", "bool", True),
            FieldDef("monetization.subscription_catalog.enable_annual_best_value", "enable_annual_best_value", "bool", False),
            FieldDef("monetization.subscription_catalog.enable_monthly_flex", "enable_monthly_flex", "bool", True),
            FieldDef("monetization.subscription_catalog.enable_quarterly_bridge", "enable_quarterly_bridge", "bool", False),
        ),
    ),
)

ALL_FIELDS: tuple[FieldDef, ...] = tuple(field for section in SECTIONS for field in section.fields)


def _load_config_dict() -> dict[str, Any]:
    for candidate in (CONFIG_LOCAL, TINDROP_DIR / "config.example.json", CONFIG_OUT):
        if candidate.exists():
            data = json.loads(candidate.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                return data
            raise ValueError("config must be a JSON object")
    return {}


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
    return proc.returncode, "\n".join(part for part in output if part)


def _git_status_short() -> str:
    rc, out = _run(["git", "status", "--short", "--branch"])
    if rc != 0:
        return f"Unable to get git status (exit {rc})"
    return out or "Clean working tree"


def _field_name(path: str) -> str:
    return path.replace(".", "__")


def _deep_get(data: dict[str, Any], path: str, default: Any) -> Any:
    current: Any = data
    for part in path.split("."):
        if not isinstance(current, dict) or part not in current:
            return default
        current = current[part]
    return current


def _deep_set(data: dict[str, Any], path: str, value: Any) -> None:
    parts = path.split(".")
    current: dict[str, Any] = data
    for part in parts[:-1]:
        node = current.get(part)
        if not isinstance(node, dict):
            node = {}
            current[part] = node
        current = node
    current[parts[-1]] = value


def _deep_merge(base: dict[str, Any], overlay: dict[str, Any]) -> dict[str, Any]:
    for key, value in overlay.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            _deep_merge(base[key], value)
        else:
            base[key] = copy.deepcopy(value)
    return base


def _defaults_config() -> dict[str, Any]:
    defaults: dict[str, Any] = {}
    for field in ALL_FIELDS:
        _deep_set(defaults, field.path, copy.deepcopy(field.default))
    return defaults


def _editable_config(source: dict[str, Any]) -> dict[str, Any]:
    config = _defaults_config()
    return _deep_merge(config, source)


def _normalize_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return bool(value)


def _value_as_form_string(field: FieldDef, config: dict[str, Any]) -> str:
    value = _deep_get(config, field.path, field.default)
    if field.kind == "int_list":
        if isinstance(value, list):
            return ", ".join(str(item) for item in value)
        return ", ".join(str(item) for item in field.default)
    if field.kind == "bool":
        return "1" if _normalize_bool(value) else "0"
    return str(value)


def _field_value_from_form(field: FieldDef, form: dict[str, list[str]]) -> Any:
    name = _field_name(field.path)
    if field.kind == "bool":
        return name in form

    raw = form.get(name, [""])[0].strip()
    if raw == "":
        return copy.deepcopy(field.default)

    if field.kind == "int":
        try:
            return int(raw)
        except ValueError as exc:
            raise ValueError(f"Invalid integer in '{field.label}': {raw}") from exc

    if field.kind == "float":
        try:
            return float(raw)
        except ValueError as exc:
            raise ValueError(f"Invalid float in '{field.label}': {raw}") from exc

    if field.kind == "int_list":
        try:
            return [int(item.strip()) for item in raw.split(",") if item.strip()]
        except ValueError as exc:
            raise ValueError(f"Invalid integer list in '{field.label}': {raw}") from exc

    return raw


def _render_field(
    field: FieldDef,
    config: dict[str, Any],
    form_values: Optional[dict[str, str]],
    form_keys: Optional[set[str]],
) -> str:
    name = _field_name(field.path)
    help_html = f'<div class="help">{html.escape(field.help_text)}</div>' if field.help_text else ""

    if field.kind == "bool":
        if form_keys is not None:
            checked = "checked" if name in form_keys else ""
        else:
            checked = "checked" if _normalize_bool(_deep_get(config, field.path, field.default)) else ""
        return (
            '<label class="bool-row" for="{name}">' 
            '<input id="{name}" name="{name}" type="checkbox" value="1" {checked} />'
            '<span>{label}</span>'
            "</label>{help}"
        ).format(name=name, checked=checked, label=html.escape(field.label), help=help_html)

    if form_values is not None and name in form_values:
        raw_value = form_values[name]
    else:
        raw_value = _value_as_form_string(field, config)

    value = html.escape(raw_value)
    if field.kind == "int":
        input_type = "number"
        step_attr = ' step="1"'
    elif field.kind == "float":
        input_type = "number"
        step_attr = ' step="0.01"'
    else:
        input_type = "text"
        step_attr = ""

    placeholder = html.escape(field.placeholder)

    return (
        '<label for="{name}">{label}</label>'
        '<input id="{name}" name="{name}" type="{input_type}" value="{value}" placeholder="{placeholder}"{step_attr} />'
        "{help}"
    ).format(
        name=name,
        label=html.escape(field.label),
        input_type=input_type,
        value=value,
        placeholder=placeholder,
        step_attr=step_attr,
        help=help_html,
    )


def _config_preview(config: dict[str, Any]) -> str:
    return json.dumps(config, indent=2, ensure_ascii=False) + "\n"


def _render_section(
    section: SectionDef,
    config: dict[str, Any],
    form_values: Optional[dict[str, str]],
    form_keys: Optional[set[str]],
) -> str:
    fields_html = "\n".join(
        f'<div class="field">{_render_field(field, config, form_values, form_keys)}</div>'
        for field in section.fields
    )
    card = f"""
      <section class="section-card" id="section-{html.escape(section.key)}">
        <h2>{html.escape(section.title)}</h2>
        <p class="section-desc">{html.escape(section.description)}</p>
        <div class="field-grid">{fields_html}</div>
      </section>
    """
    if not section.collapsed:
        return card

    return f"""
      <details class="section-details">
        <summary>{html.escape(section.title)}</summary>
        {card}
      </details>
    """


def _render_page(
    *,
    config: dict[str, Any],
    commit_message: str,
    push_enabled: bool,
    log_text: str,
    notice: str,
    advanced_json: str,
    form_values: Optional[dict[str, str]] = None,
    form_keys: Optional[set[str]] = None,
) -> bytes:
    escaped_log = html.escape(log_text)
    escaped_notice = html.escape(notice)
    escaped_message = html.escape(commit_message)
    escaped_advanced = html.escape(advanced_json)
    checked = "checked" if push_enabled else ""
    generated = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    sections_html = "\n".join(
        _render_section(section, config, form_values, form_keys) for section in SECTIONS
    )
    preview = html.escape(_config_preview(config))

    page = f"""<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Tindrop Remote Config Admin</title>
    <style>
      :root {{
        --bg: #0a0f1c;
        --panel: #131f3b;
        --panel-soft: #1c2d55;
        --line: #2f4d8b;
        --text: #edf3ff;
        --muted: #b4c4e6;
        --accent: #ff8a00;
        --ok: #34d399;
        --error: #ff6b6b;
      }}
      * {{ box-sizing: border-box; }}
      body {{
        margin: 0;
        font-family: "Avenir Next", "Segoe UI", sans-serif;
        color: var(--text);
        background: radial-gradient(circle at top right, #243e7a 0%, #0a0f1c 58%);
      }}
      .wrap {{ max-width: 1240px; margin: 22px auto 40px; padding: 0 14px; }}
      .hero {{
        background: linear-gradient(165deg, var(--panel) 0%, var(--panel-soft) 100%);
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 16px;
        box-shadow: 0 20px 30px rgba(0, 0, 0, 0.25);
      }}
      h1 {{ margin: 0 0 6px; font-size: 26px; }}
      p {{ margin: 0; color: var(--muted); }}
      .meta {{ margin-top: 10px; font-size: 13px; color: var(--muted); }}
      .meta strong {{ color: var(--text); }}
      .tip {{
        margin-top: 12px;
        border-left: 3px solid var(--accent);
        padding: 8px 10px;
        background: rgba(9, 17, 38, 0.6);
        border-radius: 8px;
        color: var(--muted);
      }}
      .layout {{ margin-top: 14px; display: grid; grid-template-columns: 1fr; gap: 12px; }}
      .section-details {{
        border: 1px solid var(--line);
        border-radius: 12px;
        overflow: hidden;
        background: #122449;
      }}
      .section-details summary {{
        cursor: pointer;
        padding: 12px;
        font-weight: 800;
        user-select: none;
      }}
      .section-card {{
        background: linear-gradient(170deg, #102045 0%, #192e5f 100%);
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 14px;
      }}
      .section-details .section-card {{ border-radius: 0; border-width: 1px 0 0 0; }}
      h2 {{ margin: 0 0 4px; font-size: 18px; }}
      .section-desc {{ margin-bottom: 10px; font-size: 13px; color: var(--muted); }}
      .field-grid {{ display: grid; grid-template-columns: repeat(2, minmax(240px, 1fr)); gap: 10px 12px; }}
      .field {{
        background: rgba(8, 18, 41, 0.7);
        border: 1px solid #315192;
        border-radius: 10px;
        padding: 10px;
      }}
      label {{ display: block; font-weight: 700; margin-bottom: 8px; font-size: 13px; }}
      input[type="text"], input[type="number"], textarea {{
        width: 100%;
        border: 1px solid #3f65ae;
        border-radius: 9px;
        padding: 9px;
        background: #0c1a35;
        color: var(--text);
        font-family: "SF Mono", Menlo, Consolas, monospace;
        font-size: 13px;
      }}
      .bool-row {{ display: flex; align-items: center; gap: 8px; margin: 0; font-size: 14px; }}
      .bool-row input {{ width: 16px; height: 16px; }}
      .help {{ font-size: 12px; margin-top: 6px; color: #88a3d7; }}
      .publish {{
        background: linear-gradient(170deg, #132241 0%, #1b315f 100%);
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 14px;
      }}
      .publish-grid {{ display: grid; grid-template-columns: 1fr; gap: 10px; }}
      .controls {{ display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }}
      .push-row {{ display: flex; align-items: center; gap: 8px; color: var(--muted); }}
      button {{
        border: none;
        border-radius: 10px;
        padding: 11px 16px;
        font-size: 14px;
        font-weight: 800;
        cursor: pointer;
        color: #fff;
        background: linear-gradient(135deg, #ff8a00 0%, #ff6200 100%);
      }}
      button:hover {{ filter: brightness(1.08); }}
      .status, .preview, .logs {{
        margin-top: 12px;
        background: rgba(8, 18, 41, 0.78);
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 10px;
      }}
      .status strong, .preview strong, .logs strong {{ display: block; margin-bottom: 6px; }}
      pre {{
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        font-family: "SF Mono", Menlo, Consolas, monospace;
        font-size: 12px;
        color: #eaf0ff;
      }}
      textarea {{ min-height: 120px; resize: vertical; }}
      .notice {{ margin-top: 8px; font-weight: 700; color: var(--ok); }}
      .notice.error {{ color: var(--error); }}
      @media (max-width: 920px) {{ .field-grid {{ grid-template-columns: 1fr; }} }}
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="hero">
        <h1>Tindrop Remote Config Admin</h1>
        <p>Formulario alineado con claves activas de <code>remote_config.dart</code>.</p>
        <div class="meta"><strong>Repo:</strong> {html.escape(str(REPO_ROOT))}<br /><strong>Generado:</strong> {generated}</div>
        <div class="tip">Nota: <code>version</code> e <code>issued_at</code> se actualizan automaticamente al firmar.</div>
      </div>

      <form method="post" class="layout">
        {sections_html}

        <section class="section-card">
          <h2>Advanced JSON Merge</h2>
          <p class="section-desc">Objeto JSON opcional para agregar campos nuevos no cubiertos aun por el formulario.</p>
          <div class="field">
            <label for="advanced_json">advanced_json</label>
            <textarea id="advanced_json" name="advanced_json" spellcheck="false" placeholder='{{ "new_block": {{ "enabled": true }} }}'>{escaped_advanced}</textarea>
          </div>
        </section>

        <section class="publish">
          <h2>Publish</h2>
          <div class="publish-grid">
            <div>
              <label for="commit_message">Commit message</label>
              <input id="commit_message" name="commit_message" type="text" value="{escaped_message}" />
            </div>
            <div class="controls">
              <label class="push-row" for="push">
                <input id="push" name="push" type="checkbox" value="1" {checked} />
                Push automatico a origin/HEAD
              </label>
              <button type="submit">Guardar + firmar + commit + push</button>
            </div>
          </div>

          <div class="status"><strong>Git status</strong><pre>{html.escape(_git_status_short())}</pre></div>
          <div class="preview"><strong>Preview JSON (payload a guardar)</strong><pre>{preview}</pre></div>
          <div class="notice{' error' if notice.lower().startswith('error') else ''}">{escaped_notice}</div>
          <div class="logs"><strong>Logs</strong><pre>{escaped_log}</pre></div>
        </section>
      </form>
    </div>
  </body>
</html>
"""
    return page.encode("utf-8")


class RemoteConfigHandler(BaseHTTPRequestHandler):
    server_version = "TindropConfigServer/2.1"

    def log_message(self, fmt: str, *args) -> None:
        return

    def _send_html(self, body: bytes) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        config = _editable_config(_load_config_dict())
        body = _render_page(
            config=config,
            commit_message=DEFAULT_COMMIT,
            push_enabled=True,
            log_text="Esperando cambios.",
            notice="",
            advanced_json="",
        )
        self._send_html(body)

    def do_POST(self) -> None:  # noqa: N802
        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length).decode("utf-8")
        form = parse_qs(raw_body)

        form_values = {key: values[0] for key, values in form.items()}
        form_keys = set(form.keys())

        commit_message = form_values.get("commit_message", DEFAULT_COMMIT).strip() or DEFAULT_COMMIT
        push_enabled = form_values.get("push", "") == "1"
        advanced_json_raw = form_values.get("advanced_json", "").strip()

        logs: list[str] = []
        notice = ""

        try:
            config = _editable_config(_load_config_dict())

            for field in ALL_FIELDS:
                _deep_set(config, field.path, _field_value_from_form(field, form))

            if advanced_json_raw:
                advanced_payload = json.loads(advanced_json_raw)
                if not isinstance(advanced_payload, dict):
                    raise ValueError("advanced_json must be a JSON object")
                _deep_merge(config, advanced_payload)

            CONFIG_LOCAL.write_text(json.dumps(config, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
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

            add_cmd = ["git", "add", "tindrop/config.local.json", "tindrop/config.json", "tindrop/config.json.sig"]
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

            rendered_config = _editable_config(_load_config_dict())
            body = _render_page(
                config=rendered_config,
                commit_message=commit_message,
                push_enabled=push_enabled,
                log_text="\n\n".join(logs) if logs else "Sin logs.",
                notice=notice,
                advanced_json="",
            )
            self._send_html(body)
            return

        except Exception as exc:  # noqa: BLE001
            logs.append(f"ERROR: {exc}")
            notice = "Error durante el flujo. Revisa el log."

        fallback_config = _editable_config(_load_config_dict())
        body = _render_page(
            config=fallback_config,
            commit_message=commit_message,
            push_enabled=push_enabled,
            log_text="\n\n".join(logs) if logs else "Sin logs.",
            notice=notice,
            advanced_json=advanced_json_raw,
            form_values=form_values,
            form_keys=form_keys,
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
