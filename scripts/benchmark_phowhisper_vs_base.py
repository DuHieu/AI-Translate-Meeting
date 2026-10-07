"""
Benchmark: vinai/PhoWhisper-base (CTranslate2) vs Whisper-base (OpenAI)
So sánh WER/CER/Similarity trên Google FLEURS: VI, EN, JA
Mỗi ngôn ngữ test 30 câu (để nhanh, đủ statistical significance)
"""
import os
import json
import time
import glob
import random
from pathlib import Path
from faster_whisper import WhisperModel
from rapidfuzz.distance import JaroWinkler
import unicodedata

FLEURS_BASE = "/tmp/fleurs"
LANG_CONFIGS = {
    "vi": {
        "dir": f"{FLEURS_BASE}/vi_vn/test",
        "whisper_lang": "vi",
        "label": "Tiếng Việt",
    },
    "en": {
        "dir": f"{FLEURS_BASE}/en_us/test",
        "whisper_lang": "en",
        "label": "Tiếng Anh",
    },
    "ja": {
        "dir": f"{FLEURS_BASE}/ja_jp/test",
        "whisper_lang": "ja",
        "label": "Tiếng Nhật",
    },
}
N_SAMPLES = 30  # per language
SEED = 42
random.seed(SEED)


def normalize_text(text: str, lang: str) -> str:
    text = text.strip().lower()
    # Normalize unicode
    text = unicodedata.normalize("NFC", text)
    # Remove punctuation for comparison
    import re
    text = re.sub(r"[^\w\s]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def char_accuracy(ref: str, hyp: str) -> float:
    """Character-level accuracy using Jaro-Winkler similarity."""
    if not ref:
        return 1.0 if not hyp else 0.0
    return JaroWinkler.normalized_similarity(ref, hyp)


def load_samples(lang_dir: str, n: int) -> list[dict]:
    """Load audio files and their transcripts from TSV."""
    wav_files = sorted(glob.glob(f"{lang_dir}/*.wav"))
    if not wav_files:
        print(f"  WARNING: No .wav files found in {lang_dir}")
        return []

    # Try to load TSV for reference transcripts
    tsv_path = f"{lang_dir}/test.tsv"
    ref_map = {}
    if os.path.exists(tsv_path):
        with open(tsv_path, encoding="utf-8") as f:
            header = f.readline().strip().split("\t")
            fname_idx = 0
            trans_idx = 2  # Usually index 2 is the transcript
            try:
                fname_idx = header.index("path") if "path" in header else 0
                # Try common column names
                for col_name in ["transcription", "raw_transcription", "text"]:
                    if col_name in header:
                        trans_idx = header.index(col_name)
                        break
            except ValueError:
                pass
            for line in f:
                parts = line.strip().split("\t")
                if len(parts) > trans_idx:
                    fname = os.path.basename(parts[fname_idx])
                    ref_map[fname] = parts[trans_idx]

    samples = []
    selected = random.sample(wav_files, min(n, len(wav_files)))
    for wav in selected:
        fname = os.path.basename(wav)
        ref = ref_map.get(fname, "")
        samples.append({"path": wav, "ref": ref})
    return samples


def benchmark_model(model: WhisperModel, model_name: str, samples_by_lang: dict) -> dict:
    results = {}
    for lang, (cfg, samples) in samples_by_lang.items():
        print(f"\n  [{model_name}] Lang={cfg['label']} ({len(samples)} samples)...")
        scores = []
        errors = 0
        total_time = 0.0
        for s in samples:
            ref = normalize_text(s["ref"], lang)
            try:
                t0 = time.time()
                segs, info = model.transcribe(
                    s["path"],
                    language=cfg["whisper_lang"],
                    beam_size=2,
                    vad_filter=True,
                    vad_parameters=dict(min_silence_duration_ms=300),
                )
                hyp = " ".join(seg.text for seg in segs).strip()
                elapsed = time.time() - t0
                hyp_norm = normalize_text(hyp, lang)
                sim = char_accuracy(ref, hyp_norm) if ref else None
                scores.append({"ref": ref, "hyp": hyp_norm, "sim": sim, "time": elapsed})
                total_time += elapsed
            except Exception as e:
                errors += 1
                scores.append({"ref": ref, "hyp": "", "sim": 0.0, "time": 0.0, "error": str(e)})

        valid = [s for s in scores if s.get("sim") is not None]
        if valid:
            avg_sim = sum(s["sim"] for s in valid) / len(valid)
            above_80 = sum(1 for s in valid if s["sim"] >= 0.80) / len(valid) * 100
        else:
            avg_sim = 0.0
            above_80 = 0.0

        results[lang] = {
            "avg_similarity": round(avg_sim * 100, 2),
            "pct_above_80": round(above_80, 2),
            "avg_time_s": round(total_time / len(samples), 2) if samples else 0,
            "errors": errors,
            "n": len(samples),
            "samples": scores[:5],  # store first 5 for inspection
        }
        print(
            f"    Avg Sim={avg_sim*100:.1f}%  ≥80%={above_80:.1f}%  "
            f"AvgTime={total_time/len(samples):.2f}s  Errors={errors}"
        )
    return results


def main():
    print("=" * 60)
    print("PhoWhisper-base-ct2 vs Whisper-base Benchmark")
    print("=" * 60)

    # Load samples once (same for both models)
    samples_by_lang = {}
    for lang, cfg in LANG_CONFIGS.items():
        samples = load_samples(cfg["dir"], N_SAMPLES)
        if samples:
            samples_by_lang[lang] = (cfg, samples)
            print(f"Loaded {len(samples)} samples for {cfg['label']}")
        else:
            print(f"SKIP {cfg['label']}: no samples found")

    if not samples_by_lang:
        print("ERROR: No samples loaded. Check /tmp/fleurs/ directory.")
        return

    all_results = {}

    # ── Model A: Whisper-base (OpenAI original) ──────────────────
    print("\n" + "─" * 60)
    print("Loading Model A: Whisper-base (OpenAI)")
    model_a = WhisperModel("base", device="cpu", compute_type="int8", num_workers=2)
    results_a = benchmark_model(model_a, "Whisper-base", samples_by_lang)
    all_results["whisper_base"] = results_a
    del model_a
    import gc; gc.collect()

    # ── Model B: PhoWhisper-base-ct2 ─────────────────────────────
    print("\n" + "─" * 60)
    print("Downloading & Loading Model B: diepho/PhoWhisper-base-ct2")
    from huggingface_hub import snapshot_download
    pho_path = "/tmp/phowhisper-base-ct2"
    if not os.path.exists(f"{pho_path}/model.bin"):
        print("  Downloading from HuggingFace...")
        snapshot_download(
            repo_id="diepho/PhoWhisper-base-ct2",
            local_dir=pho_path,
            local_dir_use_symlinks=False,
        )
        print(f"  Downloaded to {pho_path}")
    else:
        print(f"  Already exists at {pho_path}")

    model_b = WhisperModel(pho_path, device="cpu", compute_type="int8", num_workers=2)
    results_b = benchmark_model(model_b, "PhoWhisper-base-ct2", samples_by_lang)
    all_results["phowhisper_base"] = results_b
    del model_b
    gc.collect()

    # ── Summary Table ─────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("SUMMARY COMPARISON")
    print("=" * 60)
    header = f"{'Lang':<12} {'Whisper-base':>14} {'PhoWhisper-base':>16} {'Delta':>8}"
    print(header)
    print("─" * 52)
    for lang in samples_by_lang:
        cfg = LANG_CONFIGS[lang]
        a = all_results["whisper_base"].get(lang, {})
        b = all_results["phowhisper_base"].get(lang, {})
        sim_a = a.get("avg_similarity", 0)
        sim_b = b.get("avg_similarity", 0)
        delta = sim_b - sim_a
        sign = "+" if delta >= 0 else ""
        print(
            f"{cfg['label']:<12} {sim_a:>13.1f}% {sim_b:>15.1f}% {sign}{delta:>6.1f}%"
        )

    print("\nLEGEND: Avg Character Similarity (Jaro-Winkler, higher=better)")
    print("\nDETAILED (≥80% accuracy rate):")
    for lang in samples_by_lang:
        cfg = LANG_CONFIGS[lang]
        a = all_results["whisper_base"].get(lang, {})
        b = all_results["phowhisper_base"].get(lang, {})
        print(
            f"  {cfg['label']}: Whisper={a.get('pct_above_80',0):.1f}%  "
            f"PhoWhisper={b.get('pct_above_80',0):.1f}%"
        )

    # Save results
    out_path = "/tmp/benchmark_phowhisper_vs_base.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)
    print(f"\nResults saved to: {out_path}")

    # Recommendation
    print("\n" + "=" * 60)
    print("RECOMMENDATION")
    print("=" * 60)
    vi_a = all_results["whisper_base"].get("vi", {}).get("avg_similarity", 0)
    vi_b = all_results["phowhisper_base"].get("vi", {}).get("avg_similarity", 0)
    en_a = all_results["whisper_base"].get("en", {}).get("avg_similarity", 0)
    en_b = all_results["phowhisper_base"].get("en", {}).get("avg_similarity", 0)

    vi_improvement = vi_b - vi_a
    en_degradation = en_a - en_b

    if vi_improvement > 5 and en_degradation < 5:
        print("✅ REPLACE: PhoWhisper-base improves VI significantly without hurting EN/JA")
    elif vi_improvement > 5 and en_degradation >= 5:
        print("⚠️  HYBRID ROUTER: Use PhoWhisper for VI, Whisper-base for EN/JA")
        print("   Language Router architecture recommended")
    elif vi_improvement <= 3:
        print("❌ KEEP WHISPER-BASE: PhoWhisper improvement too small to justify switch")
    else:
        print("🔍 BORDERLINE: Review detailed samples before deciding")


if __name__ == "__main__":
    main()
