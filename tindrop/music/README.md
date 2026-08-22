# Tindrop music catalog / Catálogo musical de Tindrop

This directory contains only the versioned contract and local validation/signing tools. Production audio, the live `catalog.json`, and its signature are intentionally absent until the R2 upload and publication are explicitly approved.

Este directorio contiene únicamente el contrato versionado y las herramientas locales de validación/firma. El audio de producción, el `catalog.json` público y su firma se omiten de forma intencionada hasta que se autoricen explícitamente la carga a R2 y la publicación.

For every track / Para cada pista:

- use a stable ID and immutable public URL;
- archive authorship/commission or CC0 evidence under `licenses/`;
- verify duration, byte size and SHA-256 from the exact upload candidate;
- provide a manually reviewed beat map;
- assign one stable mood (`upbeat`, `chill`, `cinematic`, `playful` or `ambient`), deterministic `sortOrder`, a useful `previewStartMs` and a normalized waveform;
- run `python3 tindrop/music/validate_catalog.py <catalog>`;
- sign only after approval with `python3 tindrop/music/sign_catalog.py tindrop/music/catalog.local.json --key ~/.tindrop_remote_config/remote_config_ed25519 --catalog-output tindrop/music/catalog.json --output tindrop/music/catalog.json.sig`;
- upload audio, catalog and signature only after a second explicit approval, then read them back from the public CDN.

Never commit the private Ed25519 key or unlicensed music.

`catalog.local.json` is the auditable source manifest. The deterministic
`generate_original_catalog.py` command recreates the eight Tindrop Originals v1
AAC candidates under the ignored `.artifacts/tindrop_music_v1/` directory and
refreshes hashes, sizes, waveforms, beat maps and per-track provenance. Signing
creates the public `catalog.json` and `catalog.json.sig` only after explicit
approval; R2 audio and GitHub Pages catalog publication are separate gated
writes and must both be verified by public readback.
