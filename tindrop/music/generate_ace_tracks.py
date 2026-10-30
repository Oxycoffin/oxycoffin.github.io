"""ACE-Step 1.5 XL on Apple Silicon with a native MLX DiT (bf16 or 8-bit).

Upstream loads the whole PyTorch model in float32 (~20 GB for XL) onto MPS and
then builds an MLX copy of the decoder. This runner instead keeps a one-time
cache per model under <checkpoints>/.mlx-cache/<model>/:

- decoder-<bf16|q8>.safetensors: the MLX DiT decoder, already converted (and
  quantized for DIT_BITS=8);
- conditioning.safetensors: only the non-decoder weights (encoder, audio code
  tokenizer/detokenizer, null condition; ~0.8B of the 5B parameters).

PyTorch then builds the decoder on the meta device and drops it, so only the
small conditioning model touches MPS, and startup skips the conversion. The
cache is regenerable from the Hugging Face checkpoint and is rebuilt when it is
missing.

Usage: VARIANTS=1 DURATION=90 /Users/macmini/dev/ACE-Step-1.5/.venv/bin/python -I \
    generate_ace_tracks.py <prompts.json> <out_dir>

Non-turbo DiTs (DIT_MODEL=acestep-v15-xl-sft) take STEPS (default 50 there,
8 for turbo), GUIDANCE (CFG, default 7.0) and SHIFT (default 1.0). Re-running
on the same <out_dir> resumes: tracks already in its manifest are skipped.

The prompts used for the catalog are recorded in each batch manifest.json under
/Volumes/Externo/Creaciones/tindrop-musica/.
"""
import json
import os
import resource
import sys
import time

REPO = "/Users/macmini/dev/ACE-Step-1.5"
CHECKPOINTS = "/Volumes/Externo/IA/musica/ace-step-1.5/checkpoints"
os.environ.setdefault("ACESTEP_CHECKPOINTS_DIR", CHECKPOINTS)
os.environ.setdefault("ACESTEP_LM_BACKEND", "mlx")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
sys.path.insert(0, REPO)

import mlx.core as mx  # noqa: E402
import mlx.nn as nn  # noqa: E402
import torch  # noqa: E402
from mlx.utils import tree_flatten  # noqa: E402
from safetensors import safe_open  # noqa: E402
from safetensors.torch import load_file, save_file  # noqa: E402

from acestep.models.mlx import dit_convert  # noqa: E402

DIT_BITS = int(os.environ.get("DIT_BITS", "8"))
DIT_MODEL = os.environ.get("DIT_MODEL", "acestep-v15-xl-turbo")
TURBO = "turbo" in DIT_MODEL
STEPS = int(os.environ.get("STEPS", "8" if TURBO else "50"))
GUIDANCE = float(os.environ.get("GUIDANCE", "7.0"))
SHIFT = float(os.environ.get("SHIFT", "1.0"))
GROUP = 64
MODEL_DIR = os.path.join(CHECKPOINTS, DIT_MODEL)
CACHE_DIR = os.path.join(CHECKPOINTS, ".mlx-cache", DIT_MODEL)
DECODER_CACHE = os.path.join(CACHE_DIR, f"decoder-{'bf16' if DIT_BITS >= 16 else f'q{DIT_BITS}'}.safetensors")
CONDITIONING_CACHE = os.path.join(CACHE_DIR, "conditioning.safetensors")


def _checkpoint_tensors():
    index = json.load(open(os.path.join(MODEL_DIR, "model.safetensors.index.json")))["weight_map"]
    for shard in sorted(set(index.values())):
        with safe_open(os.path.join(MODEL_DIR, shard), "pt") as handle:
            for key in handle.keys():
                yield key, handle


def _mlx_decoder_weight(key, tensor):
    # Same layout rules as acestep.models.mlx.dit_convert, read straight from
    # the checkpoint so the float32 decoder never has to be materialized.
    value = tensor.float().numpy()
    if key.startswith("proj_in.1."):
        key = key.replace("proj_in.1.", "proj_in.")
        if key.endswith(".weight"):
            value = value.swapaxes(1, 2)
    elif key.startswith("proj_out.1."):
        key = key.replace("proj_out.1.", "proj_out.")
        if key.endswith(".weight"):
            value = value.transpose(1, 2, 0)
    return key, mx.array(value).astype(mx.bfloat16)


def _ensure_conditioning_cache():
    if os.path.isfile(CONDITIONING_CACHE):
        return
    os.makedirs(CACHE_DIR, exist_ok=True)
    tensors = {
        key: handle.get_tensor(key).contiguous()
        for key, handle in _checkpoint_tensors()
        if not key.startswith("decoder.")
    }
    save_file(tensors, CONDITIONING_CACHE + ".tmp")
    os.replace(CONDITIONING_CACHE + ".tmp", CONDITIONING_CACHE)
    print(f"[cache] conditioning weights: {len(tensors)} tensors", flush=True)


def _quantize(mlx_decoder):
    nn.quantize(
        mlx_decoder,
        group_size=GROUP,
        bits=DIT_BITS,
        class_predicate=lambda _, m: isinstance(m, nn.Linear) and m.weight.shape[-1] % GROUP == 0,
    )


def _load_cached_decoder(_pytorch_model, mlx_decoder):
    if os.path.isfile(DECODER_CACHE):
        if DIT_BITS < 16:
            _quantize(mlx_decoder)
        mlx_decoder.load_weights(DECODER_CACHE)
    else:
        weights = []
        for key, handle in _checkpoint_tensors():
            if not key.startswith("decoder.") or "rotary_emb" in key:
                continue
            name, array = _mlx_decoder_weight(key[len("decoder."):], handle.get_tensor(key))
            mx.eval(array)
            weights.append((name, array))
        mlx_decoder.load_weights(weights)
        del weights
        if DIT_BITS < 16:
            _quantize(mlx_decoder)
        mx.eval(mlx_decoder.parameters())
        os.makedirs(CACHE_DIR, exist_ok=True)
        mx.save_safetensors(DECODER_CACHE + ".tmp.safetensors", dict(tree_flatten(mlx_decoder.parameters())))
        os.replace(DECODER_CACHE + ".tmp.safetensors", DECODER_CACHE)
        print(f"[cache] MLX decoder written: {DECODER_CACHE}", flush=True)
    mx.eval(mlx_decoder.parameters())
    mx.clear_cache()
    print(f"[dit] MLX DiT ready: bits={DIT_BITS}, active={mx.get_active_memory() / 2**30:.2f} GiB", flush=True)


def _install_slim_loader():
    import transformers
    from accelerate import init_empty_weights

    original = transformers.AutoModel.from_pretrained.__func__

    def from_pretrained(cls, path, *args, **kwargs):
        if os.path.realpath(str(path)) != os.path.realpath(MODEL_DIR):
            return original(cls, path, *args, **kwargs)
        config = transformers.AutoConfig.from_pretrained(path, trust_remote_code=True)
        with init_empty_weights(include_buffers=False):
            model = transformers.AutoModel.from_config(
                config,
                trust_remote_code=True,
                attn_implementation=kwargs.get("attn_implementation"),
                torch_dtype=kwargs.get("dtype"),
            )
        # The MLX decoder replaces it; keeping an empty module avoids
        # allocating 4B float32 parameters that would never be used.
        model.decoder = torch.nn.Module()
        missing, unexpected = model.load_state_dict(load_file(CONDITIONING_CACHE), strict=False, assign=True)
        missing = [key for key in missing if not key.startswith("decoder.")]
        if missing or unexpected:
            raise RuntimeError(f"conditioning cache mismatch: missing={missing[:5]} unexpected={unexpected[:5]}")
        return model

    transformers.AutoModel.from_pretrained = classmethod(from_pretrained)


dit_convert.convert_and_load = _load_cached_decoder


def main():
    prompts_path, out_dir = sys.argv[1], sys.argv[2]
    prompts = json.load(open(prompts_path))
    from acestep.handler import AceStepHandler
    from acestep.llm_inference import LLMHandler
    from acestep.inference import GenerationConfig, GenerationParams, generate_music

    t0 = time.time()
    _ensure_conditioning_cache()
    _install_slim_loader()
    dit = AceStepHandler()
    status = dit.initialize_service(
        project_root=REPO,
        config_path=DIT_MODEL,
        device="mps",
        use_mlx_dit=True,
    )
    print("[init] dit:", status, flush=True)
    if not dit.use_mlx_dit:
        sys.exit("MLX DiT did not initialize; refusing to run the float32 fallback")
    llm = LLMHandler()
    print("[init] lm:", llm.initialize(
        checkpoint_dir=CHECKPOINTS,
        lm_model_path=os.environ.get("LM_MODEL", "acestep-5Hz-lm-1.7B"),
        backend="mlx",
        device="mps",
    ), flush=True)
    print(f"[init] {time.time() - t0:.0f}s, peak RSS {resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 2**30:.1f} GiB", flush=True)

    variants = int(os.environ.get("VARIANTS", "1"))
    duration = float(os.environ.get("DURATION", "60"))
    manifest_path = os.path.join(out_dir, "manifest.json")
    manifest = []
    if os.path.isfile(manifest_path):
        manifest = [
            entry for entry in json.load(open(manifest_path))["tracks"]
            if os.path.isfile(os.path.join(out_dir, entry["file"]))
        ]
    finished = {entry["id"] for entry in manifest}

    def write_manifest():
        peak = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 2**30
        json.dump(
            {"model": DIT_MODEL, "dit_bits": DIT_BITS, "steps": STEPS, "guidance": GUIDANCE, "shift": SHIFT,
             "lm": os.environ.get("LM_MODEL", "acestep-5Hz-lm-1.7B"), "peak_rss_gib": round(peak, 1),
             "tracks": manifest},
            open(manifest_path, "w"), indent=2, ensure_ascii=False,
        )

    for index, item in enumerate(prompts):
        structure = item.get("structure", "")
        lyrics = "[Instrumental]\n\n" + structure if structure else "[Instrumental]"
        for variant in range(1, variants + 1):
            name = f"{item['id']}-v{variant}" if variants > 1 else item["id"]
            if name in finished:
                continue
            seed = item.get("seed", 1000 * (index + 1) + variant)
            t = time.time()
            params = GenerationParams(
                caption=item["caption"],
                lyrics=lyrics,
                instrumental=True,
                bpm=item.get("bpm"),
                keyscale=item.get("key", ""),
                duration=item.get("duration", duration),
                seed=seed,
                inference_steps=STEPS,
                guidance_scale=GUIDANCE,
                shift=SHIFT,
            )
            config = GenerationConfig(batch_size=1, audio_format="wav", use_random_seed=False, seeds=[seed])
            result = generate_music(dit, llm, params, config, save_dir=out_dir)
            if not result.success:
                print(f"[fail] {name}: {result.error}", flush=True)
                continue
            audio = result.audios[0]
            target = os.path.join(out_dir, f"{name}.wav")
            os.replace(audio["path"], target)
            entry = {
                "id": name,
                "file": os.path.basename(target),
                "caption": item["caption"],
                "structure": structure,
                "bpm": item.get("bpm"),
                "key": item.get("key"),
                "duration_s": item.get("duration", duration),
                "seed": audio["params"].get("seed"),
                "seconds": round(time.time() - t, 1),
            }
            manifest.append(entry)
            write_manifest()
            print("[done]", json.dumps(entry, ensure_ascii=False), flush=True)
    write_manifest()
    peak = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 2**30
    print(f"[total] {time.time() - t0:.0f}s, peak RSS {peak:.1f} GiB", flush=True)


if __name__ == "__main__":
    main()
