import os
import re
import time
import json
import base64
import io
import wave
import urllib.request
import jiwer
from rapidfuzz import fuzz
from huggingface_hub import hf_hub_download

API_KEY = "AQ.Ab8RN6KQDpDEyglkKbOL37Ocvmf_2YNUfwvShUk4A4mYEn4TrA"
GEMINI_MODEL = "gemini-3-flash-preview"

def normalize_text(text: str) -> str:
    t = text.lower().strip()
    t = re.sub(r'[.,\/#!$%\^&\*;:{}=\-_`~()?"\']', ' ', t)
    t = re.sub(r'[、。！？「」『』（）［］【】・…—]', ' ', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def transcribe_with_gemini(audio_bytes: bytes, mime_type: str = "audio/wav", prompt: str = "Chép lại chính xác từng từ trong audio (chỉ trả về text transcribed, không thêm giải thích):") -> str:
    audio_b64 = base64.b64encode(audio_bytes).decode()
    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": mime_type, "data": audio_b64}}
            ]
        }]
    }
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={API_KEY}"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception as e:
            if "429" in str(e):
                time.sleep(3.0 * (attempt + 1))
            else:
                time.sleep(1.0)
    return ""

def pcm_to_wav_bytes(pcm_data: bytes, sample_rate: int = 16000) -> bytes:
    wav_io = io.BytesIO()
    with wave.open(wav_io, "wb") as wav_f:
        wav_f.setnchannels(1)
        wav_f.setsampwidth(2)
        wav_f.setframerate(sample_rate)
        wav_f.writeframes(pcm_data)
    return wav_io.getvalue()

def run_gemini_voice_benchmark():
    print(f"=== BENCHMARK GEMINI FLASH ({GEMINI_MODEL}) TRÊN DỮ LIỆU VOICE THẬT ===")
    
    # 1. Test các file voice cuộc họp thực tế
    print("\n--- PHẦN 1: TEST TRÊN CÁC FILE VOICE CUỘC HỌP (vi_clip1, vi_clip2, vi_clip3) ---")
    meeting_clips = [
        ("/tmp/vi_clip1_16k.pcm", "Clip 1 (Chào hỏi)", "Xin chào các bạn"),
        ("/tmp/vi_clip2_16k.pcm", "Clip 2 (Giao việc)", "Anh Nam gửi báo cáo dự án trước 17 giờ hôm nay nhé."),
        ("/tmp/vi_clip3_16k.pcm", "Clip 3 (Kiến trúc AWS)", "Chúng ta thống nhất chốt giải pháp triển khai trên AWS"),
    ]
    
    for path, label, ground_truth in meeting_clips:
        if not os.path.exists(path):
            continue
        with open(path, "rb") as f:
            pcm = f.read()
        wav = pcm_to_wav_bytes(pcm)
        t0 = time.time()
        pred = transcribe_with_gemini(wav, "audio/wav")
        cost = time.time() - t0
        
        norm_ref = normalize_text(ground_truth)
        norm_pred = normalize_text(pred)
        sim = fuzz.ratio(norm_ref, norm_pred)
        wer = jiwer.wer(norm_ref, norm_pred) if norm_ref else 0.0
        cer = jiwer.cer(norm_ref, norm_pred) if norm_ref else 0.0
        
        print(f"\n[{label}] ({len(pcm)/32000:.2f}s audio) -> Nhận diện trong {cost:.2f}s:")
        print(f"  * Gốc:       \"{ground_truth}\"")
        print(f"  * Gemini 3:  \"{pred}\"")
        print(f"  * Độ tương đồng: {sim:.1f}% | WER: {wer*100:.1f}% (Đúng từ: {max(0, 1-wer)*100:.1f}%) | CER: {cer*100:.1f}%")
        time.sleep(1.2)

    # 2. Test mẫu trên Google FLEURS đã tải trước đó (20 câu mỗi ngôn ngữ = 60 câu đa ngôn ngữ)
    print("\n\n--- PHẦN 2: TEST ĐA NGÔN NGỮ TRÊN TẬP DỮ LIỆU GOOGLE FLEURS (60 CÂU THẬT) ---")
    configs = [
        ("vi_vn", "Tiếng Việt", "Chép lại chính xác từng từ tiếng Việt:"),
        ("en_us", "Tiếng Anh", "Transcribe exactly the spoken English words:"),
        ("ja_jp", "Tiếng Nhật", "この音声を正確に日本語で書き起こしてください:"),
    ]
    
    overall_results = []
    
    for folder, lang_name, prompt in configs:
        tsv_path = hf_hub_download(repo_id='google/fleurs', filename=f'data/{folder}/test.tsv', repo_type='dataset')
        samples = []
        with open(tsv_path, "r", encoding="utf-8") as f:
            for line in f:
                parts = line.strip().split("\t")
                if len(parts) >= 3:
                    fname = parts[1]
                    ref = parts[2]
                    audio_p = f"/tmp/fleurs/{folder}/test/{fname}"
                    if os.path.exists(audio_p):
                        samples.append((fname, ref, audio_p))
                if len(samples) >= 20: # 20 câu mỗi ngôn ngữ
                    break
                    
        print(f"\n>>> Chạy 20 câu {lang_name} ({folder})...")
        lang_res = []
        for idx, (fname, ref, audio_p) in enumerate(samples, 1):
            with open(audio_p, "rb") as f:
                wav_bytes = f.read()
            t0 = time.time()
            pred = transcribe_with_gemini(wav_bytes, "audio/wav", prompt)
            cost = time.time() - t0
            
            norm_ref = normalize_text(ref)
            norm_pred = normalize_text(pred)
            sim = fuzz.ratio(norm_ref, norm_pred)
            cer = jiwer.cer(norm_ref, norm_pred) if norm_ref else 0.0
            
            if folder != "ja_jp":
                wer = jiwer.wer(norm_ref, norm_pred) if norm_ref else 0.0
            else:
                wer = cer
                
            char_acc = max(0.0, 1.0 - cer) * 100.0
            word_acc = max(0.0, 1.0 - wer) * 100.0
            
            lang_res.append({
                "lang": folder,
                "ref": ref,
                "pred": pred,
                "sim": sim,
                "cer": cer,
                "wer": wer,
                "char_acc": char_acc,
                "word_acc": word_acc,
                "cost": cost
            })
            overall_results.append(lang_res[-1])
            print(f"  [{idx}/20] Sim: {sim:5.1f}% | CharAcc: {char_acc:5.1f}% | Thời gian: {cost:.2f}s | Ref: \"{ref[:35]}...\" -> Pred: \"{pred[:35]}...\"")
            time.sleep(1.2) # Tránh rate limit
            
        mean_sim = sum(r["sim"] for r in lang_res) / len(lang_res)
        mean_char_acc = sum(r["char_acc"] for r in lang_res) / len(lang_res)
        mean_word_acc = sum(r["word_acc"] for r in lang_res) / len(lang_res)
        print(f"\n===> KẾT QUẢ {lang_name.upper()}:")
        print(f"     * Độ tương đồng (Similarity): {mean_sim:.2f}%")
        print(f"     * Độ chính xác ký tự (Char Accuracy): {mean_char_acc:.2f}% (CER = {(100-mean_char_acc):.2f}%)")
        if folder != "ja_jp":
            print(f"     * Độ chính xác từ ngữ (Word Accuracy): {mean_word_acc:.2f}% (WER = {(100-mean_word_acc):.2f}%)")

    # Tổng kết
    all_sim = sum(r["sim"] for r in overall_results) / len(overall_results)
    all_char_acc = sum(r["char_acc"] for r in overall_results) / len(overall_results)
    print("\n=======================================================")
    print(f"  TỔNG KẾT GEMINI FLASH TRÊN TOÀN BỘ VOICE ĐA NGÔN NGỮ:")
    print(f"  * ĐỘ TƯƠNG ĐỒNG NỘI DUNG (SIMILARITY): {all_sim:.2f}%")
    print(f"  * ĐỘ CHÍNH XÁC KÝ TỰ (CHAR ACCURACY):   {all_char_acc:.2f}%")
    print("=======================================================\n")

if __name__ == "__main__":
    run_gemini_voice_benchmark()
