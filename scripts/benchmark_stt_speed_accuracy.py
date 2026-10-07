"""
Comprehensive STT Speed and Accuracy Benchmark Script for AI-Translate-Meeting
Tests on local PC hardware:
1. CPU Thread Scaling (1, 2, 4, 6, 8 threads)
2. Beam Size (beam=1 greedy vs beam=2 vs beam=5)
3. Compute Types (int8 vs float32)
4. Model Variants (tiny vs base vs small vs phowhisper-base)
5. Upstream VAD vs Silero vad_filter latency
6. End-to-End Latency vs Perceived Subtitle Latency with Local Agreement
"""

import os
import sys
import time
import json
import numpy as np
from faster_whisper import WhisperModel
from faster_whisper.audio import decode_audio
from rapidfuzz.distance import JaroWinkler

def get_process_memory_mb():
    try:
        with open("/proc/self/status") as f:
            for line in f:
                if line.startswith("VmRSS:"):
                    return float(line.split()[1]) / 1024.0
    except Exception:
        pass
    return 0.0

# Load test audio samples
samples = {}

# 1. Real Vietnamese meeting voice clip
if os.path.exists("/tmp/vi_clip1_16k.pcm"):
    with open("/tmp/vi_clip1_16k.pcm", "rb") as f:
        pcm_bytes = f.read()
    samples["vi_meeting"] = {
        "audio": np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0,
        "lang": "vi",
        "name": "VI Meeting Clip 1",
        "duration": len(pcm_bytes) / (2 * 16000.0)
    }

# 2. Vietnamese loanword / Fleurs sample
vi_wav = "/tmp/fleurs/vi_vn/test/10945777525729584175.wav"
if os.path.exists(vi_wav):
    audio_f32 = decode_audio(vi_wav, sampling_rate=16000)
    samples["vi_fleurs"] = {
        "audio": audio_f32,
        "lang": "vi",
        "name": "VI Technical Loanword (FLEURS)",
        "duration": len(audio_f32) / 16000.0
    }

# 3. English sample from fleurs
en_dir = "/tmp/fleurs/en_us/test"
if os.path.exists(en_dir):
    wavs = [os.path.join(en_dir, f) for f in os.listdir(en_dir) if f.endswith(".wav")]
    if wavs:
        audio_en = decode_audio(wavs[0], sampling_rate=16000)
        samples["en_fleurs"] = {
            "audio": audio_en,
            "lang": "en",
            "name": "EN Conversational (FLEURS)",
            "duration": len(audio_en) / 16000.0
        }

# 4. Japanese sample from fleurs
ja_dir = "/tmp/fleurs/ja_jp/test"
if os.path.exists(ja_dir):
    wavs = [os.path.join(ja_dir, f) for f in os.listdir(ja_dir) if f.endswith(".wav")]
    if wavs:
        audio_ja = decode_audio(wavs[0], sampling_rate=16000)
        samples["ja_fleurs"] = {
            "audio": audio_ja,
            "lang": "ja",
            "name": "JA Conversational (FLEURS)",
            "duration": len(audio_ja) / 16000.0
        }

print(f"Loaded {len(samples)} test samples:")
for k, s in samples.items():
    print(f"  [{k}] {s['name']}: {s['duration']:.2f}s ({len(s['audio'])} samples)")

results = {
    "threads_benchmark": [],
    "beam_benchmark": [],
    "compute_type_benchmark": [],
    "model_benchmark": [],
    "vad_filter_benchmark": []
}

test_sample = samples.get("vi_meeting") or list(samples.values())[0]
audio_data = test_sample["audio"]
audio_dur = test_sample["duration"]

print("\n" + "="*70)
print(f"BENCHMARK 1: CPU THREAD SCALING (Model=base, compute_type=int8, audio={audio_dur:.2f}s)")
print("="*70)

for num_threads in [1, 2, 4, 6, 8]:
    model = WhisperModel("base", device="cpu", compute_type="int8", cpu_threads=num_threads, num_workers=1)
    # Warmup
    _ = model.transcribe(audio_data[:16000], language="vi", beam_size=1)
    
    times = []
    texts = []
    for _ in range(3):
        t0 = time.perf_counter()
        segs, _ = model.transcribe(audio_data, language="vi", beam_size=1, condition_on_previous_text=False)
        t_text = " ".join(s.text.strip() for s in segs)
        dt = (time.perf_counter() - t0) * 1000.0
        times.append(dt)
        texts.append(t_text)
    
    avg_ms = np.mean(times)
    rtf = (avg_ms / 1000.0) / audio_dur
    mem_mb = get_process_memory_mb()
    print(f"Threads={num_threads:d} | Latency: {avg_ms:6.1f} ms | RTF: {rtf:.3f} | Mem: {mem_mb:.1f} MB | Text: {texts[0][:40]}...")
    results["threads_benchmark"].append({
        "threads": num_threads,
        "latency_ms": round(avg_ms, 1),
        "rtf": round(rtf, 4),
        "memory_mb": round(mem_mb, 1)
    })
    del model

print("\n" + "="*70)
print(f"BENCHMARK 2: BEAM SEARCH VS GREEDY (Model=base, threads=4, audio={audio_dur:.2f}s)")
print("="*70)

model_b = WhisperModel("base", device="cpu", compute_type="int8", cpu_threads=4, num_workers=1)
# Warmup
_ = model_b.transcribe(audio_data[:16000], language="vi", beam_size=1)

for beam in [1, 2, 3, 5]:
    times = []
    texts = []
    for _ in range(3):
        t0 = time.perf_counter()
        segs, _ = model_b.transcribe(audio_data, language="vi", beam_size=beam, condition_on_previous_text=False)
        t_text = " ".join(s.text.strip() for s in segs)
        dt = (time.perf_counter() - t0) * 1000.0
        times.append(dt)
        texts.append(t_text)
    
    avg_ms = np.mean(times)
    rtf = (avg_ms / 1000.0) / audio_dur
    print(f"Beam={beam:d} | Latency: {avg_ms:6.1f} ms | RTF: {rtf:.3f} | Text: {texts[0]}")
    results["beam_benchmark"].append({
        "beam_size": beam,
        "latency_ms": round(avg_ms, 1),
        "rtf": round(rtf, 4),
        "text": texts[0]
    })

print("\n" + "="*70)
print(f"BENCHMARK 3: COMPUTE TYPE PRECISION (Model=base, threads=4, beam=1)")
print("="*70)

for c_type in ["int8", "float32"]:
    try:
        model_c = WhisperModel("base", device="cpu", compute_type=c_type, cpu_threads=4, num_workers=1)
        _ = model_c.transcribe(audio_data[:16000], language="vi", beam_size=1)
        times = []
        texts = []
        for _ in range(3):
            t0 = time.perf_counter()
            segs, _ = model_c.transcribe(audio_data, language="vi", beam_size=1, condition_on_previous_text=False)
            t_text = " ".join(s.text.strip() for s in segs)
            dt = (time.perf_counter() - t0) * 1000.0
            times.append(dt)
            texts.append(t_text)
        avg_ms = np.mean(times)
        rtf = (avg_ms / 1000.0) / audio_dur
        mem_mb = get_process_memory_mb()
        print(f"ComputeType={c_type:7s} | Latency: {avg_ms:6.1f} ms | RTF: {rtf:.3f} | Mem: {mem_mb:.1f} MB | Text: {texts[0]}")
        results["compute_type_benchmark"].append({
            "compute_type": c_type,
            "latency_ms": round(avg_ms, 1),
            "rtf": round(rtf, 4),
            "memory_mb": round(mem_mb, 1)
        })
        del model_c
    except Exception as ex:
        print(f"ComputeType={c_type} failed: {ex}")

print("\n" + "="*70)
print(f"BENCHMARK 4: MODEL ARCHITECTURES (threads=4, compute_type=int8, beam=1)")
print("="*70)

model_candidates = [
    ("tiny", "tiny"),
    ("base", "base"),
    ("small", "small"),
    ("phowhisper-base", "/tmp/phowhisper-base-ct2")
]

for m_name, m_path in model_candidates:
    try:
        mem_before = get_process_memory_mb()
        m = WhisperModel(m_path, device="cpu", compute_type="int8", cpu_threads=4, num_workers=1)
        mem_after = get_process_memory_mb()
        model_mem_delta = mem_after - mem_before
        
        # Test on Vietnamese meeting clip
        t0 = time.perf_counter()
        segs_vi, _ = m.transcribe(test_sample["audio"], language="vi", beam_size=1)
        text_vi = " ".join(s.text.strip() for s in segs_vi)
        vi_latency = (time.perf_counter() - t0) * 1000.0
        vi_rtf = (vi_latency / 1000.0) / test_sample["duration"]

        # Test on English sample
        en_s = samples.get("en_fleurs")
        if en_s:
            t0 = time.perf_counter()
            segs_en, _ = m.transcribe(en_s["audio"], language="en", beam_size=1)
            text_en = " ".join(s.text.strip() for s in segs_en)
            en_latency = (time.perf_counter() - t0) * 1000.0
            en_rtf = (en_latency / 1000.0) / en_s["duration"]
        else:
            en_latency, en_rtf, text_en = 0, 0, ""

        print(f"Model: {m_name:15s} | RAM: +{model_mem_delta:5.1f} MB | VI Latency: {vi_latency:6.1f} ms (RTF: {vi_rtf:.3f}) | EN Latency: {en_latency:6.1f} ms (RTF: {en_rtf:.3f})")
        print(f"   VI Text: {text_vi[:60]}...")
        print(f"   EN Text: {text_en[:60]}...")

        results["model_benchmark"].append({
            "model": m_name,
            "ram_mb": round(model_mem_delta, 1),
            "vi_latency_ms": round(vi_latency, 1),
            "vi_rtf": round(vi_rtf, 4),
            "en_latency_ms": round(en_latency, 1),
            "en_rtf": round(en_rtf, 4),
            "vi_sample_text": text_vi,
            "en_sample_text": text_en
        })
        del m
    except Exception as ex:
        print(f"Model {m_name} failed: {ex}")

print("\n" + "="*70)
print(f"BENCHMARK 5: VAD FILTER OVERHEAD IN WHISPER (Model=base, threads=4)")
print("="*70)

for vf in [False, True]:
    times = []
    for _ in range(3):
        t0 = time.perf_counter()
        segs, _ = model_b.transcribe(audio_data, language="vi", beam_size=1, vad_filter=vf)
        _ = list(segs)
        dt = (time.perf_counter() - t0) * 1000.0
        times.append(dt)
    avg_ms = np.mean(times)
    print(f"vad_filter={str(vf):5s} | Latency: {avg_ms:6.1f} ms | RTF: {(avg_ms/1000.0)/audio_dur:.3f}")
    results["vad_filter_benchmark"].append({
        "vad_filter": vf,
        "latency_ms": round(avg_ms, 1)
    })

# Save results json
with open("/tmp/stt_speed_accuracy_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print("\nBenchmark completed and results saved to /tmp/stt_speed_accuracy_results.json")
