# Tindrop music catalog / Catálogo musical de Tindrop

This directory contains only the versioned contract and local validation/signing tools. Production audio, the live `catalog.json`, and its signature are intentionally absent until the R2 upload and publication are explicitly approved.

Este directorio contiene únicamente el contrato versionado y las herramientas locales de validación/firma. El audio de producción, el `catalog.json` público y su firma se omiten de forma intencionada hasta que se autoricen explícitamente la carga a R2 y la publicación.

For every track / Para cada pista:

- use a stable ID and immutable public URL;
- archive authorship/commission or CC0 evidence under `licenses/`;
- verify duration, byte size and SHA-256 from the exact upload candidate;
- provide a manually reviewed beat map;
- run `python3 tindrop/music/validate_catalog.py <catalog>`;
- sign only after approval with `python3 tindrop/music/sign_catalog.py <catalog> --key <private-key>`;
- upload audio, catalog and signature only after a second explicit approval, then read them back from the public CDN.

Never commit the private Ed25519 key or unlicensed music.

