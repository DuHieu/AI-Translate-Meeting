"""
Benchmark 1000 Real Voice Samples with Acoustic Meeting Degradations & Disfluencies
Tests Whisper Audio-level Language Identification (Audio LID) under realistic imperfect conditions:
1. Background Noise / White noise / Fan hiss (SNR 8-12dB)
2. WebRTC Packet Loss / Jitter Audio Dropouts (Stutters)
3. Volume Clipping & Gain Overload
4. Low Gain / Distant Mic (0.25x amplitude)
5. Room Reverberation & Speaker Echo (150ms delay)
6. Hesitation, Long Pauses & Disfluencies (600ms mid-speech gaps)

Dataset: 1000 Real Voice Samples from Google FLEURS (VI: 300, EN: 300, JA: 200, KO: 100, ZH: 100)
"""
import glob
import json
import os
import random
import time
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from faster_whisper import WhisperModel
from faster_whisper.audio import decode_audio

RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

AUDIO_DIRS = {
    "vi": ("/tmp/fleurs/vi_vn/test", 300, "Tiếng Việt"),
    "en": ("/tmp/fleurs/en_us/test", 300, "Tiếng Anh"),
    "ja": ("/tmp/fleurs/ja_jp/test", 200, "Tiếng Nhật"),
    "ko": ("/tmp/fleurs/ko_kr/test", 100, "Tiếng Hàn"),
    "zh": ("/tmp/fleurs/zh_cn/test", 100, "Tiếng Trung"),
}

DISTORTION_NAMES = [
    "Tiếng ồn văn phòng / Tạp âm trắng (SNR 10dB)",
    "Mất gói tin mạng / Giật lag (Packet Dropouts)",
    "Mic rè quá tải / Clipping méo tiếng",
    "Nói quá nhỏ / Mic xa (0.25x volume)",
    "Tiếng vang phòng / Vọng âm (Reverb 150ms)",
    "Nói ngập ngừng / Ngắt quãng (Hesitation 600ms)",
]


def apply_distortion(audio: np.ndarray, distortion_type: int) -> np.ndarray:
    """Applies realistic acoustic corruption / meeting disfluency."""
    audio = audio.copy()
    if distortion_type == 0:
        # Background noise (SNR ~10dB)
        power = np.mean(audio ** 2) + 1e-9
        noise = np.random.normal(0, np.sqrt(power / 10.0), len(audio))
        return (audio + noise).astype(np.float32)
    elif distortion_type == 1:
        # Packet loss / audio dropouts
        for _ in range(np.random.randint(2, 5)):
            if len(audio) > 4000:
                start = np.random.randint(0, len(audio) - 3200)
                length = np.random.randint(800, 2400)
                audio[start : start + length] = 0.0
        return audio
    elif distortion_type == 2:
        # Clipping overload
        return np.clip(audio * 3.5, -0.95, 0.95).astype(np.float32)
    elif distortion_type == 3:
        # Low gain / whisper
        return (audio * 0.25).astype(np.float32)
    elif distortion_type == 4:
        # Echo / Reverb (150ms delay, decay 0.35)
        delay = int(16000 * 0.15)
        if len(audio) > delay:
            audio[delay:] += 0.35 * audio[:-delay]
        return audio
    elif distortion_type == 5:
        # Hesitation gap (600ms mid-speech pause)
        mid = len(audio) // 2
        pause = np.zeros(int(16000 * 0.6), dtype=np.float32)
        return np.concatenate([audio[:mid], pause, audio[mid:]]).astype(np.float32)
    return audio


def collect_1000_samples():
    """Gathers exactly 1000 audio sample tasks across 5 languages."""
    samples = []
    sample_id = 1
    for lang, (path, target_count, name) in AUDIO_DIRS.items():
        wavs = sorted(glob.glob(f"{path}/**/*.wav", recursive=True) + glob.glob(f"{path}/*.wav"))
        if not wavs:
            raise RuntimeError(f"Không tìm thấy file wav cho {lang} tại {path}")

        # Cycle or sample if fewer files than target_count
        selected_wavs = []
        while len(selected_wavs) < target_count:
            for w in wavs:
                selected_wavs.append(w)
                if len(selected_wavs) >= target_count:
                    break

        for idx, w in enumerate(selected_wavs):
            dist_type = idx % 6  # Evenly rotate across 6 distortion types
            samples.append({
                "id": sample_id,
                "file_path": w,
                "true_lang": lang,
                "lang_name": name,
                "distortion_type": dist_type,
                "distortion_name": DISTORTION_NAMES[dist_type],
            })
            sample_id += 1

    random.shuffle(samples)
    return samples


def run_benchmark():
    print("=" * 70)
    print("BENCHMARK AUDIO LID TRÊN 1000 MẪU GIỌNG NÓI THẬT (VOICE XẤU & NGẬP NGỪNG)")
    print("=" * 70)

    samples = collect_1000_samples()
    print(f"Tổng số mẫu chuẩn bị: {len(samples)} mẫu.")
    print("Phân bổ ngôn ngữ:")
    for lang, (_, count, name) in AUDIO_DIRS.items():
        print(f"  - {name} ({lang.upper()}): {count} mẫu")

    print("\nKhởi tạo mô hình Faster-Whisper Base (int8) với 6 worker threads...")
    model = WhisperModel("base", device="cpu", compute_type="int8", num_workers=6)

    print("\nBắt đầu chạy benchmark trên 1000 file...")
    t_start = time.perf_counter()

    results = []
    confusion = {}
    lang_stats = {lang: {"total": 0, "correct": 0, "confidences": [], "latencies": []} for lang in AUDIO_DIRS}
    dist_stats = {i: {"total": 0, "correct": 0, "confidences": []} for i in range(6)}

    def eval_single(item):
        try:
            raw_audio = decode_audio(item["file_path"], sampling_rate=16000)
            corrupted_audio = apply_distortion(raw_audio, item["distortion_type"])
            t0 = time.perf_counter()
            pred_lang, prob, _ = model.detect_language(corrupted_audio)
            lat = (time.perf_counter() - t0) * 1000
            return {
                "id": item["id"],
                "file": os.path.basename(item["file_path"]),
                "true_lang": item["true_lang"],
                "pred_lang": pred_lang,
                "is_correct": (pred_lang == item["true_lang"]),
                "prob": float(prob),
                "latency_ms": float(lat),
                "distortion_type": item["distortion_type"],
                "distortion_name": item["distortion_name"],
            }
        except Exception as e:
            return {
                "id": item["id"],
                "file": os.path.basename(item["file_path"]),
                "true_lang": item["true_lang"],
                "pred_lang": "error",
                "is_correct": False,
                "prob": 0.0,
                "latency_ms": 0.0,
                "distortion_type": item["distortion_type"],
                "distortion_name": item["distortion_name"],
                "error": str(e),
            }

    completed = 0
    with ThreadPoolExecutor(max_workers=6) as executor:
        for res in executor.map(eval_single, samples):
            completed += 1
            results.append(res)

            t_lang = res["true_lang"]
            d_type = res["distortion_type"]
            corr = res["is_correct"]

            lang_stats[t_lang]["total"] += 1
            if corr:
                lang_stats[t_lang]["correct"] += 1
            lang_stats[t_lang]["confidences"].append(res["prob"])
            lang_stats[t_lang]["latencies"].append(res["latency_ms"])

            dist_stats[d_type]["total"] += 1
            if corr:
                dist_stats[d_type]["correct"] += 1
            dist_stats[d_type]["confidences"].append(res["prob"])

            if not corr:
                p_lang = res["pred_lang"]
                pair = f"{t_lang.upper()} -> {p_lang.upper()}"
                confusion[pair] = confusion.get(pair, 0) + 1

            if completed % 100 == 0:
                elapsed_curr = time.perf_counter() - t_start
                curr_acc = sum(1 for r in results if r["is_correct"]) / completed * 100
                print(f"  [Tiến độ: {completed}/1000] Độ chính xác hiện tại: {curr_acc:.1f}% ({elapsed_curr:.1f}s)")

    total_time = time.perf_counter() - t_start
    total_correct = sum(1 for r in results if r["is_correct"])
    overall_acc = (total_correct / len(results)) * 100
    avg_conf = (sum(r["prob"] for r in results) / len(results)) * 100
    avg_lat = sum(r["latency_ms"] for r in results) / len(results)

    print("\n" + "=" * 70)
    print("KẾT QUẢ ĐỐI ĐẦU TỔNG THỂ TRÊN 1000 FILE VOICE XẤU & NGẬP NGỪNG")
    print("=" * 70)
    print(f"  Tổng số file kiểm thử:          {len(results)}")
    print(f"  Số file nhận diện đúng:         {total_correct} / {len(results)}")
    print(f"  Độ chính xác tổng thể (Accuracy): {overall_acc:.2f}%")
    print(f"  Độ tin cậy trung bình (Confidence): {avg_conf:.2f}%")
    print(f"  Độ trễ phát hiện trung bình:     {avg_lat:.1f} ms")
    print(f"  Tổng thời gian đo kiểm:         {total_time:.1f} giây ({len(results)/total_time:.2f} file/giây)")

    print("\n" + "-" * 70)
    print("BẢNG 1: ĐỘ CHÍNH XÁC THEO TỪNG NGÔN NGỮ (KHI CÓ NHIỄU VÀ NGẬP NGỪNG)")
    print("-" * 70)
    print(f"{'Ngôn ngữ':<15} {'Số mẫu':<8} {'Chính xác':<12} {'Độ tin cậy TB':<15} {'Độ trễ TB':<12}")
    print("─" * 65)
    for lang, st in lang_stats.items():
        name = AUDIO_DIRS[lang][2]
        acc = (st["correct"] / st["total"]) * 100 if st["total"] else 0
        c_prob = (sum(st["confidences"]) / len(st["confidences"])) * 100 if st["confidences"] else 0
        l_ms = sum(st["latencies"]) / len(st["latencies"]) if st["latencies"] else 0
        print(f"{name:<15} {st['total']:<8} {acc:>6.2f}% ({st['correct']}/{st['total']}) {c_prob:>8.1f}%       {l_ms:>6.1f}ms")

    print("\n" + "-" * 70)
    print("BẢNG 2: ĐỘ CHỊU ĐỰNG THEO TỪNG LOẠI TẠP ÂM / BIẾN DẠNG ÂM HỌC")
    print("-" * 70)
    print(f"{'Loại tạp âm / Trạng thái nói':<42} {'Số mẫu':<8} {'Chính xác':<12} {'Tin cậy TB'}")
    print("─" * 68)
    for d_idx, st in dist_stats.items():
        d_name = DISTORTION_NAMES[d_idx]
        acc = (st["correct"] / st["total"]) * 100 if st["total"] else 0
        c_prob = (sum(st["confidences"]) / len(st["confidences"])) * 100 if st["confidences"] else 0
        print(f"{d_name:<42} {st['total']:<8} {acc:>6.2f}%        {c_prob:>5.1f}%")

    if confusion:
        print("\n" + "-" * 70)
        print("DANH SÁCH CÁC CẶP NHẦM LẪN (CONFUSION ERRORS):")
        print("-" * 70)
        for pair, count in sorted(confusion.items(), key=lambda x: -x[1]):
            print(f"  - {pair}: {count} lần ({count/len(results)*100:.2f}%)")
    else:
        print("\nKhông phát hiện bất kỳ trường hợp nhầm lẫn nào!")

    # Save output to JSON
    output_path = "/tmp/benchmark_1000_noisy_results.json"
    summary_data = {
        "summary": {
            "total_samples": len(results),
            "correct_samples": total_correct,
            "overall_accuracy": round(overall_acc, 2),
            "average_confidence": round(avg_conf, 2),
            "average_latency_ms": round(avg_lat, 1),
            "total_duration_sec": round(total_time, 1),
        },
        "by_language": {
            lang: {
                "name": AUDIO_DIRS[lang][2],
                "total": st["total"],
                "correct": st["correct"],
                "accuracy": round((st["correct"] / st["total"]) * 100, 2),
                "avg_confidence": round((sum(st["confidences"]) / len(st["confidences"])) * 100, 2),
                "avg_latency_ms": round(sum(st["latencies"]) / len(st["latencies"]), 1),
            }
            for lang, st in lang_stats.items()
        },
        "by_distortion": {
            DISTORTION_NAMES[d_idx]: {
                "total": st["total"],
                "correct": st["correct"],
                "accuracy": round((st["correct"] / st["total"]) * 100, 2),
                "avg_confidence": round((sum(st["confidences"]) / len(st["confidences"])) * 100, 2),
            }
            for d_idx, st in dist_stats.items()
        },
        "confusion_matrix": confusion,
        "sample_errors": [r for r in results if not r["is_correct"]][:30],
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(summary_data, f, ensure_ascii=False, indent=2)

    print(f"\nToàn bộ kết quả chi tiết đã được lưu trữ tại: {output_path}")


if __name__ == "__main__":
    run_benchmark()
