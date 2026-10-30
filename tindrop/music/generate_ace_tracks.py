"""ACE-Step 1.5 XL on Apple Silicon with the MLX DiT quantized to 8 bits.

The upstream Mac path keeps the PyTorch DiT in float32 and builds a second
float32 MLX copy (~32 GB for XL). This runner converts the decoder tensor by
tensor to bfloat16, frees each PyTorch tensor as it goes, then quantizes the
MLX Linear layers to 8 bits. The LM stays as published (bf16, MLX backend).

Usage: VARIANTS=1 DURATION=90 /Users/macmini/dev/ACE-Step-1.5/.venv/bin/python -I \
    generate_ace_tracks.py <prompts.json> <out_dir>

Non-turbo DiTs (DIT_MODEL=acestep-v15-xl-sft) take STEPS (default 50 there,
8 for turbo), GUIDANCE (CFG, default 7.0) and SHIFT (default 1.0).

The prompts used for catalog v5 are recorded in each batch manifest.json under
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

from acestep.models.mlx import dit_convert  # noqa: E402

DIT_BITS = int(os.environ.get("DIT_BITS", "8"))
DIT_MODEL = os.environ.get("DIT_MODEL", "acestep-v15-xl-turbo")
TURBO = "turbo" in DIT_MODEL
STEPS = int(os.environ.get("STEPS", "8" if TURBO else "50"))
GUIDANCE = float(os.environ.get("GUIDANCE", "7.0"))
SHIFT = float(os.environ.get("SHIFT", "1.0"))
GROUP = 64


def _convert_and_quantize(pytorch_model, mlx_decoder):
    decoder = pytorch_model.decoder
    weights = []
    params = dict(decoder.named_parameters())
    buffers = dict(decoder.named_buffers())
    for key in list(decoder.state_dict().keys()):
        if "rotary_emb" in key:
            continue
        tensor = params.get(key, buffers.get(key))
        np_val = tensor.detach().cpu().float().numpy()
        new_key = key
        if key.startswith("proj_in.1."):
            new_key = key.replace("proj_in.1.", "proj_in.")
            if new_key.endswith(".weight"):
                np_val = np_val.swapaxes(1, 2)
        elif key.startswith("proj_out.1."):
            new_key = key.replace("proj_out.1.", "proj_out.")
            if new_key.endswith(".weight"):
                np_val = np_val.transpose(1, 2, 0)
        array = mx.array(np_val).astype(mx.bfloat16)
        mx.eval(array)
        weights.append((new_key, array))
        # Release the float32 PyTorch copy immediately; MLX owns the decoder now.
        tensor.data = torch.empty(0, dtype=tensor.dtype)
        del np_val
    mlx_decoder.load_weights(weights)
    del weights
    if DIT_BITS < 16:
        nn.quantize(
            mlx_decoder,
            group_size=GROUP,
            bits=DIT_BITS,
            class_predicate=lambda _, m: isinstance(m, nn.Linear)
            and m.weight.shape[-1] % GROUP == 0,
        )
    mx.eval(mlx_decoder.parameters())
    mx.clear_cache()
    print(f"[q8] MLX DiT ready: bits={DIT_BITS}, active={mx.get_active_memory() / 2**30:.2f} GiB", flush=True)


dit_convert.convert_and_load = _convert_and_quantize


def main():
    prompts_path, out_dir = sys.argv[1], sys.argv[2]
    prompts = json.load(open(prompts_path))
    from acestep.handler import AceStepHandler
    from acestep.llm_inference import LLMHandler
    from acestep.inference import GenerationConfig, GenerationParams, generate_music

    t0 = time.time()
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
