import os
import re
import time
import json
import base64
import urllib.request
import jiwer
from rapidfuzz import fuzz
from huggingface_hub import hf_hub_download

API_KEY = "AQ.Ab8RN6KQDpDEyglkKbOL37Ocvmf_2YNUfwvShUk4A4mYEn4TrA"
GEMINI_MODEL = "gemini-3-flash-preview"

def clean_preamble(text: str) -> str:
    # Remove conversational LLM preambles if any
    text = re.sub(r'^(dưới đây là|đây là|bản chép lại|nội dung|here is the|transcription:|transcript:)[^:\n]*[:\n]+', '', text, flags=re.IGNORECASE).strip()
    text = text.strip('`"\' \n')
    return text

def normalize_text(text: str) -> str:
    t = text.lower().strip()
    t = re.sub(r'[.,\/#!$%\^&\*;:{}=\-_`~()?"\']', ' ', t)
    t = re.sub(r'[、。！？「」『』（）［］【】・…—]', ' ', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def transcribe_gemini_strict(audio_bytes: bytes, lang_prompt: str) -> str:
    audio_b64 = base64.b64encode(audio_bytes).decode()
    payload = {
        "system_instruction": {
            "parts": [{"text": "You are a professional audio transcriber. Transcribe the audio verbatim. Output ONLY the transcribed words with no conversational filler, no greetings, no introductory text like 'Here is the transcript', and no markdown quotes."}]
        },
        "contents": [{
            "parts": [
                {"text": lang_prompt},
                {"inline_data": {"mime_type": "audio/wav", "data": audio_b64}}
            ]
        }],
        "generationConfig": {
            "temperature": 0.0,
            "maxOutputTokens": 500
        }
    }
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={API_KEY}"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                return clean_preamble(raw_text)
        except Exception as e:
            if "429" in str(e):
                wait_sec = 6.0 * (attempt + 1)
                print(f"    [Rate limit 429, đợi {wait_sec}s thử lại...]")
                time.sleep(wait_sec)
            else:
                print(f"    [Lỗi API: {e}]")
                time.sleep(2.0)
    return ""

def run_calibrated_benchmark():
    print(f"=== KIỂM THỬ CHUẨN XÁC GEMINI 3 FLASH ({GEMINI_MODEL}) ĐA NGÔN NGỮ ===")
    
    test_suite = [
        ("vi_vn", "Tiếng Việt", "Transcribe exactly in Vietnamese:", 6),
        ("en_us", "Tiếng Anh", "Transcribe exactly in English:", 6),
        ("ja_jp", "Tiếng Nhật", "Transcribe exactly in Japanese:", 6),
    ]
    
    results = []
    
    for folder, lang_name, prompt, count in test_suite:
        tsv_path = hf_hub_download(repo_id='google/fleurs', filename=f'data/{folder}/test.tsv', repo_type='dataset')
        items = []
        with open(tsv_path, "r", encoding="utf-8") as f:
            for line in f:
                parts = line.strip().split("\t")
                if len(parts) >= 3:
                    fname = parts[1]
                    ref = parts[2]
                    audio_p = f"/tmp/fleurs/{folder}/test/{fname}"
                    if os.path.exists(audio_p):
                        items.append((fname, ref, audio_p))
                if len(items) >= count:
                    break
                    
        print(f"\n=======================================================")
        print(f"  KIỂM THỬ: {lang_name.upper()} ({count} câu ngẫu nhiên từ FLEURS)")
        print(f"=======================================================")
        
        for idx, (fname, ref, audio_p) in enumerate(items, 1):
            with open(audio_p, "rb") as f:
                wav_data = f.read()
            t0 = time.time()
            pred = transcribe_gemini_strict(wav_data, prompt)
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
            
            results.append({
                "lang": folder,
                "lang_name": lang_name,
                "ref": ref,
                "pred": pred,
                "sim": sim,
                "cer": cer,
                "wer": wer,
                "char_acc": char_acc,
                "word_acc": word_acc,
                "cost": cost
            })
            
            print(f"\n[{idx}/{count} {lang_name}] Sim: {sim:5.1f}% | Ký tự đúng: {char_acc:5.1f}% | Từ đúng: {word_acc:5.1f}% ({cost:.2f}s)")
            print(f"  🗣️ Ref:  \"{ref}\"")
            print(f"  🤖 Pred: \"{pred}\"")
            
            # Giữ nhịp 4.5s để không bị nghẽn 15 RPM
            time.sleep(4.5)

    print("\n\n=======================================================")
    print("   BẢNG TỔNG HỢP HIỆU NĂNG GEMINI 3 FLASH (STT ENGINE) ")
    print("=======================================================")
    for folder, lang_name, _, _ in test_suite:
        sub = [r for r in results if r["lang"] == folder]
        m_sim = sum(r["sim"] for r in sub) / len(sub)
        m_char = sum(r["char_acc"] for r in sub) / len(sub)
        m_word = sum(r["word_acc"] for r in sub) / len(sub)
        m_time = sum(r["cost"] for r in sub) / len(sub)
        
        print(f"\n* {lang_name} ({folder}):")
        print(f"  - Độ tương đồng nội dung: {m_sim:.1f}%")
        print(f"  - Độ chính xác ký tự:    {m_char:.1f}% (CER = {(100-m_char):.1f}%)")
        if folder != "ja_jp":
            print(f"  - Độ chính xác từ ngữ:   {m_word:.1f}% (WER = {(100-m_word):.1f}%)")
        print(f"  - Tốc độ phản hồi TB:    {m_time:.2f}s/câu")

    overall_sim = sum(r["sim"] for r in results) / len(results)
    overall_char = sum(r["char_acc"] for r in results) / len(results)
    print(f"\n--> ĐỘ TƯƠNG ĐỒNG TOÀN DIỆN GEMINI 3 FLASH: {overall_sim:.2f}%")
    print(f"--> ĐỘ CHÍNH XÁC KÝ TỰ TOÀN HỆ THỐNG:      {overall_char:.2f}%\n")

if __name__ == "__main__":
    run_calibrated_benchmark()
