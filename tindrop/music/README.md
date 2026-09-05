# Tindrop music catalog / Catálogo musical de Tindrop

This directory contains the auditable source manifest, the live signed catalog, licensing evidence and the local validation/signing tools. Production audio is served from the dedicated R2 domain and is not committed to this repository.

Este directorio contiene el manifiesto fuente auditable, el catálogo firmado publicado, la evidencia de licencia y las herramientas locales de validación/firma. El audio de producción se sirve desde el dominio R2 dedicado y no se incluye en este repositorio.

For every track / Para cada pista:

- use a stable ID and immutable public URL;
- archive authorship/commission or CC0 evidence under `licenses/`;
- verify duration, byte size and SHA-256 from the exact upload candidate;
- generate the full-track beat map with Tindrop's canonical Dart analyzer and
  review its confidence/continuity without hand-authoring a catalog-only cue
  path;
- do not author genre, mood or pace labels: the app derives Slow (<90 BPM),
  Medium (90–<120 BPM) or Fast (>=120 BPM) exclusively from the canonical
  `beatMap.bpm`; provide a deterministic `sortOrder` only as a same-title
  tie-breaker, a useful `previewStartMs` and a normalized waveform;
- run `python3 tindrop/music/validate_catalog.py <catalog>`;
- sign only after approval with `python3 tindrop/music/sign_catalog.py tindrop/music/catalog.local.json --key ~/.tindrop_remote_config/remote_config_ed25519 --catalog-output tindrop/music/catalog.json --output tindrop/music/catalog.json.sig`; the signer compacts the delivery copy before signing so the readable source manifest can retain audited beat-map formatting without exceeding the app's 2 MiB transport limit;
- upload audio, catalog and signature only after a second explicit approval, then read them back from the public CDN.

Never commit the private Ed25519 key or unlicensed music.

## Production snapshot

Catalog v4 refreshes all 20 complete CC0 works with the canonical Dart analyzer
at Tindrop commit `18866b5a4` (`schemaVersion=6`, `analysisVersion=1`). The maps
include local rhythm regions and audible attacks, generated from the exact
published AAC files. Track IDs, URLs, audio hashes, titles, licenses, ordering
and preview points are preserved. Audio remains 52,911,030 bytes on demand;
the signed manifest is 1,375,687 bytes with SHA-256
`47e2800351b876bf519eec1bee218d8cb4070a5007d34d09a668eadfd1287839`.
The eight retired Tindrop Originals remain at their immutable R2 URLs for old
drafts. No audio upload or deletion is part of this analysis refresh.

El catálogo v4 actualiza las 20 canciones CC0 completas con el analizador Dart
canónico del commit `18866b5a4` de Tindrop (`schemaVersion=6`,
`analysisVersion=1`). Los mapas incluyen ritmo por tramos y ataques audibles,
calculados sobre los AAC publicados. Se conservan los identificadores, URLs,
hashes de audio, títulos, licencias, orden y puntos de preescucha. Los audios
suman 52.911.030 bytes bajo demanda y el manifiesto firmado ocupa 1.375.687
bytes. Esta actualización no sube ni elimina audios.

`catalog.local.json` is the auditable source manifest. The deterministic
`generate_original_catalog.py` command recreates the eight Tindrop Originals v1
AAC candidates under the ignored `.artifacts/tindrop_music_v1/` directory and
refreshes hashes, sizes, waveforms, beat maps and per-track provenance without
removing curated third-party CC0 tracks already present in the manifest.

```bash
python3 tindrop/music/generate_original_catalog.py \
  --tindrop-root /path/to/Tindrop2/tindrop \
  --reuse-encoded
```

`prepare_cc0_catalog.py` owns the curated CC0 expansion. Its non-negotiable
policy for future additions is:

- publish the complete song so the user, not the catalog curator, chooses the
  fragment used by the collage;
- start from the author's exact downloadable source and pin its SHA-256;
- accept only an individually verifiable CC0 dedication from the
  artist/rightsholder; generic "royalty-free" or video-only licences are not
  sufficient for hosting the audio on Tindrop's R2;
- keep lossless/high-bitrate source files only in ignored local artifacts and
  publish AAC-LC/M4A at the mobile delivery profile (currently 128 kbps,
  44.1 kHz stereo, -16 LUFS and fast-start metadata);
- retain the artist name in the UI voluntarily even when CC0 does not require
  attribution;
- provide a full-track waveform, beat/onset map, energy sections and useful
  preview point; the UI classifies speed from canonical BPM and sorts every
  complete or filtered list alphabetically by title;
- mark ambiguous material as low confidence instead of presenting a false exact
  beat grid.

Prepare the complete CC0 set with an explicit manifest timestamp:

```bash
python3 tindrop/music/prepare_cc0_catalog.py \
  --tindrop-root /path/to/Tindrop2/tindrop \
  --issued-at-ms "$(date +%s000)"
```

Both preparers decode the mobile candidate to mono PCM and delegate all cue
generation to `tool/beat_video_catalog_analyzer.dart` in the Tindrop app. That
tool calls the same `BeatVideoTrackAnalyzer` and `BeatAudioAnalyzer` used for a
user-imported song; the catalog must not grow a second Python cue algorithm or
hand-authored timing semantics that imported audio cannot reproduce.

The current mobile set is deliberately download-on-demand. The prepared v3
candidate ranges from about 0.5 to 5.2 MiB per complete song. Signing refreshes `catalog.json` and
`catalog.json.sig` only after explicit approval; R2 audio and GitHub Pages
catalog publication remain separate gated writes and must both be verified by
public readback.

## CC0-only v3 contents

The v3 catalog contains 20 complete CC0 tracks and no Tindrop
Originals. It keeps the 10 previously published CC0 works and adds 10 curated
works spanning orchestral, funk, electro/chiptune, bossa nova, reggae,
emotional piano, acoustic ambient, and koto/shakuhachi.
The 10 new mobile files total 22,864,828 bytes; the whole on-demand set totals
52,911,030 bytes. The source pages, immutable download hashes, mobile hashes,
and preparation details are archived per track under `licenses/`.

The eight retired original audio objects are intentionally not deleted from R2:
leaving their immutable URLs in place preserves old drafts and exports while
removing them from all newly fetched library manifests.

Validate the composed manifest against both ignored candidate collections:

```bash
python3 tindrop/music/validate_catalog.py tindrop/music/catalog.local.json \
  --audio-root .artifacts/tindrop_music_v1 \
  --audio-root .artifacts/tindrop_music_cc0_v1/encoded
```
