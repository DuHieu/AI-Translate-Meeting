#!/usr/bin/env python3
"""
Rigorous Head-to-Head Benchmark: OpenAI Whisper-base (int8) vs VinAI PhoWhisper-base (int8)
Evaluated across:
  - 30 Vietnamese samples (3 real meeting PCM clips + 27 FLEURS test samples)
  - 30 English samples (30 FLEURS test samples)
  - 30 Japanese samples (30 FLEURS test samples)

Metrics evaluated:
  - Jaro-Winkler Similarity (0.0 to 1.0)
  - Character Error Rate (CER)
  - Word Error Rate (WER)
  - Latency (inference time in seconds)
"""

import gc
import glob
import json
import os
import random
import re
import time
from pathlib import Path
import numpy as np
import jiwer
from rapidfuzz.distance import JaroWinkler
from faster_whisper import WhisperModel

SEED = 42
random.seed(SEED)
np.random.seed(SEED)

def normalize_text(text: str, lang: str = "vi") -> str:
    if not text:
        return ""
    text = text.lower()
    # Remove standard punctuation
    text = re.sub(r"[,\.\?!;:\(\)\"\'`\-\–\—\…/\\]", " ", text)
    if lang == "ja":
        # Remove Japanese punctuation
        text = re.sub(r"[、。・「」『』（）！？]", "", text)
        text = re.sub(r"\s+", "", text)
        return text.strip()
    # Collapse multiple whitespaces
    text = re.sub(r"\s+", " ", text).strip()
    return text

def load_fleurs_data(tsv_path: str, wav_dir: str, n: int) -> list[dict]:
    tsv_map = {}
    with open(tsv_path, encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split("\t")
            if len(parts) >= 3:
                tsv_map[parts[1]] = parts[2]

    all_wavs = sorted(glob.glob(f"{wav_dir}/*.wav"))
    matched = [w for w in all_wavs if os.path.basename(w) in tsv_map]
    
    # Deterministic sample using fixed seed
    rng = random.Random(SEED)
    selected = rng.sample(matched, min(n, len(matched)))
    
    samples = []
    for wav_path in selected:
        fname = os.path.basename(wav_path)
        ref_text = tsv_map[fname]
        samples.append({
            "type": "fleurs",
            "path": wav_path,
            "filename": fname,
            "ref_raw": ref_text,
        })
    return samples

def load_all_datasets() -> dict[str, list[dict]]:
    datasets = {}

    # 1. VIETNAMESE: 3 real meeting clips + 27 FLEURS samples = 30 samples
    vi_meeting_clips = [
        {
            "type": "meeting_pcm",
            "path": "/tmp/vi_clip1_16k.pcm",
            "filename": "vi_clip1_16k.pcm",
            "ref_raw": "Xin chào các bạn",
        },
        {
            "type": "meeting_pcm",
            "path": "/tmp/vi_clip2_16k.pcm",
            "filename": "vi_clip2_16k.pcm",
            "ref_raw": "Anh Nam gửi báo cáo dự án trước 17 giờ hôm nay nhé.",
        },
        {
            "type": "meeting_pcm",
            "path": "/tmp/vi_clip3_16k.pcm",
            "filename": "vi_clip3_16k.pcm",
            "ref_raw": "Chúng ta thống nhất chốt giải pháp triển khai trên AWS",
        },
    ]

    vi_tsv = "/root/.cache/huggingface/hub/datasets--google--fleurs/snapshots/70bb2e84b976b7e960aa89f1c648e09c59f894dd/data/vi_vn/test.tsv"
    vi_fleurs = load_fleurs_data(vi_tsv, "/tmp/fleurs/vi_vn/test", 27)
    datasets["vi"] = vi_meeting_clips + vi_fleurs

    # 2. ENGLISH: 30 FLEURS samples
    en_tsv = "/root/.cache/huggingface/hub/datasets--google--fleurs/snapshots/70bb2e84b976b7e960aa89f1c648e09c59f894dd/data/en_us/test.tsv"
    datasets["en"] = load_fleurs_data(en_tsv, "/tmp/fleurs/en_us/test", 30)

    # 3. JAPANESE: 30 FLEURS samples
    ja_tsv = "/root/.cache/huggingface/hub/datasets--google--fleurs/snapshots/70bb2e84b976b7e960aa89f1c648e09c59f894dd/data/ja_jp/test.tsv"
    datasets["ja"] = load_fleurs_data(ja_tsv, "/tmp/fleurs/ja_jp/test", 30)

    return datasets

def transcribe_sample(model: WhisperModel, sample: dict, lang: str) -> tuple[str, float]:
    path = sample["path"]
    t0 = time.perf_counter()
    if sample["type"] == "meeting_pcm":
        with open(path, "rb") as f:
            pcm_data = f.read()
        audio_array = np.frombuffer(pcm_data, dtype=np.int16).astype(np.float32) / 32768.0
        segs, _ = model.transcribe(audio_array, language=lang, beam_size=2)
    else:
        segs, _ = model.transcribe(path, language=lang, beam_size=2)
    hyp_text = " ".join(s.text for s in segs).strip()
    latency = time.perf_counter() - t0
    return hyp_text, latency

def run_evaluation(model: WhisperModel, model_id: str, datasets: dict) -> dict:
    eval_results = {}
    for lang, samples in datasets.items():
        print(f"\nEvaluating {model_id} on [{lang.upper()}] ({len(samples)} samples)...")
        sample_results = []
        for i, s in enumerate(samples, 1):
            ref_raw = s["ref_raw"]
            ref_norm = normalize_text(ref_raw, lang)
            
            hyp_raw, latency = transcribe_sample(model, s, lang)
            hyp_norm = normalize_text(hyp_raw, lang)

            # Metrics calculation
            jw_sim = JaroWinkler.similarity(ref_norm, hyp_norm) if ref_norm else 0.0
            cer_val = jiwer.cer(ref_norm, hyp_norm) if ref_norm else 1.0
            
            if lang == "ja":
                # For Japanese, word boundary is not space-delimited, use character-level WER
                wer_val = cer_val
            else:
                wer_val = jiwer.wer(ref_norm, hyp_norm) if ref_norm else 1.0

            sample_results.append({
                "index": i,
                "type": s["type"],
                "filename": s["filename"],
                "ref_raw": ref_raw,
                "hyp_raw": hyp_raw,
                "ref_norm": ref_norm,
                "hyp_norm": hyp_norm,
                "jw_similarity": round(jw_sim, 4),
                "cer": round(cer_val, 4),
                "wer": round(wer_val, 4),
                "latency_s": round(latency, 3),
            })
            if i <= 3 or i == len(samples):
                print(f"  [{i:02d}/{len(samples)}] Latency: {latency:.2f}s | JW: {jw_sim*100:.1f}% | CER: {cer_val*100:.1f}%")
                print(f"       Ref: {ref_raw[:65]}...")
                print(f"       Hyp: {hyp_raw[:65]}...")

        # Compute aggregates
        avg_jw = np.mean([r["jw_similarity"] for r in sample_results]) * 100
        avg_cer = np.mean([r["cer"] for r in sample_results]) * 100
        avg_wer = np.mean([r["wer"] for r in sample_results]) * 100
        avg_latency = np.mean([r["latency_s"] for r in sample_results])
        
        eval_results[lang] = {
            "num_samples": len(samples),
            "avg_jw_similarity": round(avg_jw, 2),
            "avg_cer": round(avg_cer, 2),
            "avg_wer": round(avg_wer, 2),
            "avg_latency_s": round(avg_latency, 3),
            "samples": sample_results,
        }
        print(f"  --> {lang.upper()} SUMMARY: JW={avg_jw:.2f}% | CER={avg_cer:.2f}% | WER={avg_wer:.2f}% | Latency={avg_latency:.2f}s")

    return eval_results

def main():
    print("=" * 80)
    print("  HEAD-TO-HEAD BENCHMARK: OPENAI WHISPER BASE (INT8) vs VINAI PHOWHISPER BASE (INT8)")
    print("=" * 80)

    datasets = load_all_datasets()
    for lang, items in datasets.items():
        print(f"Loaded {len(items)} {lang.upper()} samples ({sum(1 for x in items if x['type']=='meeting_pcm')} meeting clips, {sum(1 for x in items if x['type']=='fleurs')} FLEURS)")

    results = {}

    # 1. MODEL A: OpenAI Whisper-base (int8)
    print("\n" + "=" * 80)
    print("  [1/2] LOADING MODEL A: OpenAI Whisper-base (ct2 int8)")
    print("=" * 80)
    model_a = WhisperModel("base", device="cpu", compute_type="int8", num_workers=2)
    results["whisper_base"] = run_evaluation(model_a, "OpenAI Whisper-base", datasets)
    del model_a
    gc.collect()

    # 2. MODEL B: VinAI PhoWhisper-base (ct2 int8)
    print("\n" + "=" * 80)
    print("  [2/2] LOADING MODEL B: VinAI PhoWhisper-base (diepho/PhoWhisper-base-ct2 int8)")
    print("=" * 80)
    pho_model_dir = "/tmp/phowhisper-base-ct2"
    model_b = WhisperModel(pho_model_dir, device="cpu", compute_type="int8", num_workers=2)
    results["phowhisper_base"] = run_evaluation(model_b, "VinAI PhoWhisper-base", datasets)
    del model_b
    gc.collect()

    # 3. CONSOLIDATED HEAD-TO-HEAD COMPARISON
    print("\n" + "=" * 80)
    print("  FINAL HEAD-TO-HEAD COMPARISON MATRIX")
    print("=" * 80)
    print(f"{'Language':<12} | {'Model':<20} | {'Jaro-Winkler':>13} | {'CER':>10} | {'WER':>10} | {'Latency':>10}")
    print("-" * 85)

    for lang in ["vi", "en", "ja"]:
        a = results["whisper_base"][lang]
        b = results["phowhisper_base"][lang]
        lang_name = {"vi": "Vietnamese", "en": "English", "ja": "Japanese"}[lang]
        
        print(f"{lang_name:<12} | {'Whisper-base':<20} | {a['avg_jw_similarity']:>12.2f}% | {a['avg_cer']:>9.2f}% | {a['avg_wer']:>9.2f}% | {a['avg_latency_s']:>9.2f}s")
        print(f"{'':<12} | {'PhoWhisper-base':<20} | {b['avg_jw_similarity']:>12.2f}% | {b['avg_cer']:>9.2f}% | {b['avg_wer']:>9.2f}% | {b['avg_latency_s']:>9.2f}s")
        
        delta_jw = b["avg_jw_similarity"] - a["avg_jw_similarity"]
        delta_cer = b["avg_cer"] - a["avg_cer"]
        delta_wer = b["avg_wer"] - a["avg_wer"]
        sign_jw = "+" if delta_jw >= 0 else ""
        sign_cer = "+" if delta_cer >= 0 else ""
        sign_wer = "+" if delta_wer >= 0 else ""
        print(f"{'':<12} | {'Delta (Pho - Base)':<20} | {sign_jw}{delta_jw:>11.2f}% | {sign_cer}{delta_cer:>8.2f}% | {sign_wer}{delta_wer:>8.2f}% |")
        print("-" * 85)

    # Output JSON file
    out_json = "/tmp/head_to_head_benchmark_results.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\nDetailed per-sample benchmark results written to: {out_json}")

if __name__ == "__main__":
    main()
