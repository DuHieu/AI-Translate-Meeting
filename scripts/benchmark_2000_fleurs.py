import os
import re
import time
import json
import concurrent.futures
from threading import Lock
import jiwer
from rapidfuzz import fuzz
from faster_whisper import WhisperModel
from huggingface_hub import hf_hub_download

def normalize_text(text: str) -> str:
    t = text.lower().strip()
    # Remove Latin punctuation
    t = re.sub(r'[.,\/#!$%\^&\*;:{}=\-_`~()?"\']', ' ', t)
    # Remove fullwidth / CJK punctuation
    t = re.sub(r'[、。！？「」『』（）［］【】・…—]', ' ', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def load_dataset_records():
    records = []
    configs = [
        ("vi_vn", "vi", "Tiếng Việt"),
        ("en_us", "en", "Tiếng Anh"),
        ("ja_jp", "ja", "Tiếng Nhật"),
    ]
    
    for folder, lang_code, lang_name in configs:
        tsv_path = hf_hub_download(repo_id='google/fleurs', filename=f'data/{folder}/test.tsv', repo_type='dataset')
        with open(tsv_path, 'r', encoding='utf-8') as f:
            count = 0
            for line in f:
                parts = line.strip().split('\t')
                if len(parts) >= 3:
                    audio_filename = parts[1]
                    ref_raw = parts[2]
                    audio_path = f"/tmp/fleurs/{folder}/test/{audio_filename}"
                    if os.path.exists(audio_path):
                        records.append({
                            "lang_code": lang_code,
                            "lang_folder": folder,
                            "lang_name": lang_name,
                            "filename": audio_filename,
                            "audio_path": audio_path,
                            "reference": ref_raw,
                        })
                        count += 1
            print(f"Loaded {count} samples for {lang_name} ({folder})")
            
    print(f"\n--> TỔNG SỐ FILE VOICE THẬT CẦN TEST: {len(records)} CÂU")
    return records

def run_benchmark():
    records = load_dataset_records()
    total_samples = len(records)
    if total_samples == 0:
        print("ERROR: Không tìm thấy file âm thanh nào.")
        return

    print("\nKhởi tạo 2 worker faster-whisper base (int8 CPU)...")
    # 2 worker models on 8-core CPU (3 threads each = 6 threads total)
    model_pool = [
        WhisperModel("base", device="cpu", compute_type="int8", cpu_threads=3, num_workers=1),
        WhisperModel("base", device="cpu", compute_type="int8", cpu_threads=3, num_workers=1),
    ]
    pool_locks = [Lock(), Lock()]

    results = []
    stats_lock = Lock()
    start_time = time.time()
    processed_count = 0

    def process_item(item_and_idx):
        nonlocal processed_count
        idx, item = item_and_idx
        worker_id = idx % len(model_pool)

        # Transcribe with allocated worker
        with pool_locks[worker_id]:
            segments, info = model_pool[worker_id].transcribe(
                item["audio_path"],
                language=item["lang_code"],
                beam_size=1, # beam_size 1 for optimal high-throughput CPU inference
                vad_filter=True,
            )
            predicted_raw = "".join(s.text for s in segments).strip()

        ref_norm = normalize_text(item["reference"])
        hyp_norm = normalize_text(predicted_raw)

        # Calculate metrics
        sim = fuzz.ratio(ref_norm, hyp_norm) if ref_norm else 0.0
        
        try:
            cer = jiwer.cer(ref_norm, hyp_norm) if ref_norm else 0.0
        except Exception:
            cer = 1.0

        if item["lang_code"] in ["vi", "en"]:
            try:
                wer = jiwer.wer(ref_norm, hyp_norm) if ref_norm else 0.0
            except Exception:
                wer = 1.0
        else:
            # Japanese does not use spaces, WER is undefined / equal to CER
            wer = cer

        char_acc = max(0.0, 1.0 - cer) * 100.0
        word_acc = max(0.0, 1.0 - wer) * 100.0

        item_result = {
            "index": idx + 1,
            "lang": item["lang_code"],
            "lang_name": item["lang_name"],
            "filename": item["filename"],
            "reference": item["reference"],
            "predicted": predicted_raw,
            "cer": round(cer, 4),
            "wer": round(wer, 4),
            "similarity": round(sim, 2),
            "char_acc": round(char_acc, 2),
            "word_acc": round(word_acc, 2),
        }

        with stats_lock:
            results.append(item_result)
            processed_count += 1
            cur_count = processed_count

            # Progress log every 100 sentences or first 10
            if cur_count % 100 == 0 or cur_count in [10, 25, 50] or cur_count == total_samples:
                elapsed = time.time() - start_time
                speed = cur_count / elapsed
                remaining = (total_samples - cur_count) / speed if speed > 0 else 0
                
                # Running averages
                avg_sim = sum(r["similarity"] for r in results) / len(results)
                avg_char_acc = sum(r["char_acc"] for r in results) / len(results)
                
                # By language
                vi_res = [r for r in results if r["lang"] == "vi"]
                en_res = [r for r in results if r["lang"] == "en"]
                ja_res = [r for r in results if r["lang"] == "ja"]
                
                vi_acc = (sum(r["word_acc"] for r in vi_res) / len(vi_res)) if vi_res else 0.0
                en_acc = (sum(r["word_acc"] for r in en_res) / len(en_res)) if en_res else 0.0
                ja_acc = (sum(r["char_acc"] for r in ja_res) / len(ja_res)) if ja_res else 0.0

                print(
                    f"[{cur_count}/{total_samples}] ({cur_count/total_samples*100:.1f}%) | "
                    f"Tốc độ: {speed:.1f} câu/s | Còn lại: {remaining/60:.1f}m | "
                    f"Đúng trung bình: {avg_char_acc:.1f}% (VI: {vi_acc:.1f}%, EN: {en_acc:.1f}%, JA: {ja_acc:.1f}%)"
                )

        return item_result

    print(f"\n--> BẮT ĐẦU CHẠY BENCHMARK {total_samples} CÂU...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        list(executor.map(process_item, enumerate(records)))

    total_time = time.time() - start_time
    print(f"\n=======================================================")
    print(f"       HOÀN THÀNH BENCHMARK {len(results)} CÂU VOICE THẬT       ")
    print(f"       Tổng thời gian: {total_time:.1f}s ({total_time/60:.1f} phút)     ")
    print(f"       Tốc độ trung bình: {len(results)/total_time:.2f} câu/giây  ")
    print(f"=======================================================\n")

    # Save detailed JSON report
    out_json = "/tmp/benchmark_fleurs_2000_results.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"Đã lưu kết quả chi tiết từng câu vào: {out_json}")

    # Summary table
    print("\n--- BÁO CÁO TỔNG HỢP ĐỘ CHÍNH XÁC THEO TỪNG NGÔN NGỮ ---")
    for lang_code, lang_name in [("vi", "Tiếng Việt"), ("en", "Tiếng Anh"), ("ja", "Tiếng Nhật")]:
        sub = [r for r in results if r["lang"] == lang_code]
        if not sub:
            continue
        n = len(sub)
        mean_sim = sum(r["similarity"] for r in sub) / n
        mean_cer = sum(r["cer"] for r in sub) / n
        mean_wer = sum(r["wer"] for r in sub) / n
        mean_char_acc = sum(r["char_acc"] for r in sub) / n
        mean_word_acc = sum(r["word_acc"] for r in sub) / n
        
        high_acc = len([r for r in sub if r["similarity"] >= 80.0]) / n * 100.0
        
        print(f"\n* Ngôn ngữ: {lang_name} ({lang_code.upper()}) - Số câu: {n}")
        print(f"  - Độ tương đồng Levenshtein: {mean_sim:.2f}%")
        print(f"  - Độ chính xác ký tự (Character Accuracy): {mean_char_acc:.2f}% (CER = {mean_cer*100:.2f}%)")
        if lang_code in ["vi", "en"]:
            print(f"  - Độ chính xác từ ngữ (Word Accuracy): {mean_word_acc:.2f}% (WER = {mean_wer*100:.2f}%)")
        print(f"  - Tỷ lệ câu đạt độ chính xác cao (>= 80% similarity): {high_acc:.1f}%")

    total_sim = sum(r["similarity"] for r in results) / len(results)
    total_char_acc = sum(r["char_acc"] for r in results) / len(results)
    print(f"\n=======================================================")
    print(f"  ĐỘ CHÍNH XÁC TOÀN DIỆN HỆ THỐNG: {total_char_acc:.2f}% ")
    print(f"  ĐỘ TƯƠNG ĐỒNG NỘI DUNG (SIMILARITY): {total_sim:.2f}% ")
    print(f"=======================================================\n")

if __name__ == "__main__":
    run_benchmark()
