"""Validate effective ad policy before signing a Tindrop Remote Config."""
import re


def replace_retired_units(config, policy):
    """Apply approved replacements to the root and version overrides before signing."""
    if policy["serving_suspended"]:
        return
    retired = policy["retired_units"]
    blocked = {unit for entries in retired.values() for unit in entries}
    replacements = policy.get("replacements", {})
    for slot, replacement in replacements.items():
        if slot not in retired or not isinstance(replacement, str) or not re.fullmatch(
            r"ca-app-pub-6279728494613017/\d+", replacement
        ) or replacement in blocked or list(replacements.values()).count(replacement) != 1:
            raise ValueError(f"Reserva inválida para {slot}")
    for profile in [config, *config.get("app_versions", {}).values()]:
        units = profile.get("ads", {}).get("units", {})
        for slot, replacement in replacements.items():
            if units.get(slot) in retired[slot]:
                units[slot] = replacement


def validate_ad_safety(config, policy):
    suspended = policy["serving_suspended"]
    retired = policy["retired_units"]
    if type(suspended) is not bool or not isinstance(retired, dict):
        raise ValueError("Política de seguridad publicitaria inválida")
    for slot, ids in retired.items():
        if not isinstance(ids, list) or not ids or not all(
            isinstance(unit, str) and re.fullmatch(r"ca-app-pub-6279728494613017/\d+", unit) for unit in ids
        ):
            raise ValueError("Lista de unidades retiradas inválida en " + slot)
    root = config.get("ads", {})
    for version, profile in [("root", {})] + list(config.get("app_versions", {}).items()):
        ads = profile.get("ads", {})
        enabled = ads.get("enabled", root.get("enabled"))
        if enabled is False:
            continue
        if suspended or enabled is not True:
            raise ValueError(f"{version}: se requiere ads.enabled=false")
        units = {**root.get("units", {}), **ads.get("units", {})}
        for slot, ids in retired.items():
            unit = units.get(slot)
            if not isinstance(unit, str) or not re.fullmatch(r"ca-app-pub-6279728494613017/\d+", unit) or any(
                unit in blocked for blocked in retired.values()
            ):
                raise ValueError(f"{version}: {slot} necesita una unidad de sustitución válida")
