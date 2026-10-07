import urllib.request
import json
import base64
import io
import wave
import time
from rapidfuzz import fuzz

API_KEY = "AQ.Ab8RN6KQDpDEyglkKbOL37Ocvmf_2YNUfwvShUk4A4mYEn4TrA"
MODEL = "gemini-3.1-flash-lite"

def test_audio(path, ref, lang_prompt):
    if path.endswith('.pcm'):
        with open(path, 'rb') as f:
            pcm = f.read()
        wav_io = io.BytesIO()
        with wave.open(wav_io, 'wb') as wav_f:
            wav_f.setnchannels(1)
            wav_f.setsampwidth(2)
            wav_f.setframerate(16000)
            wav_f.writeframes(pcm)
        audio_bytes = wav_io.getvalue()
    else:
        with open(path, 'rb') as f:
            audio_bytes = f.read()
            
    payload = {
        'contents': [{
            'parts': [
                {'text': lang_prompt + ' (Chỉ trả về văn bản đã nhận diện, không thêm bất kỳ từ ngữ nào khác):'},
                {'inline_data': {'mime_type': 'audio/wav', 'data': base64.b64encode(audio_bytes).decode()}}
            ]
        }]
    }
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}'
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json'})
    
    t0 = time.time()
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        pred = res['candidates'][0]['content']['parts'][0]['text'].strip()
        cost = time.time() - t0
        sim = fuzz.ratio(ref.lower().strip(), pred.lower().strip())
        print(f"  🗣️ Ref:  \"{ref}\"")
        print(f"  🤖 Pred: \"{pred}\"")
        print(f"  🎯 Độ tương đồng: {sim:.1f}% (Thời gian: {cost:.2f}s)\n")
        return sim

def main():
    print(f"=== KIỂM THỬ THỰC TẾ GEMINI FLASH LITE ({MODEL}) TRÊN CÁC FILE VOICE ĐÃ TẢI ===\n")
    sims = []
    
    print("1. [Cuộc họp - Clip 1 - Chào hỏi]")
    sims.append(test_audio('/tmp/vi_clip1_16k.pcm', 'Xin chào các bạn', 'Chép lại tiếng Việt:'))
    time.sleep(2)

    print("2. [Cuộc họp - Clip 2 - Deadline & Số]")
    sims.append(test_audio('/tmp/vi_clip2_16k.pcm', 'Anh Nam gửi báo cáo dự án trước 17 giờ hôm nay nhé.', 'Chép lại tiếng Việt:'))
    time.sleep(2)

    print("3. [Cuộc họp - Clip 3 - Kiến trúc AWS]")
    sims.append(test_audio('/tmp/vi_clip3_16k.pcm', 'Chúng ta thống nhất chốt giải pháp triển khai trên AWS', 'Chép lại tiếng Việt:'))
    time.sleep(2)

    print("4. [Google FLEURS - Tiếng Việt]")
    sims.append(test_audio('/tmp/fleurs/vi_vn/test/7702082596424665893.wav', 'Mặt khác, băng và tuyết là hiện tượng bình thường ở nhiều nước, và quanh năm giao thông gần như không bị gián đoạn.', 'Chép lại tiếng Việt:'))
    time.sleep(2)

    print("5. [Google FLEURS - Tiếng Anh]")
    sims.append(test_audio('/tmp/fleurs/en_us/test/12741024238657315067.wav', 'Unfortunately, studying traffic flow is difficult because driver behavior cannot be predicted with one-hundred percent certainty.', 'Transcribe English:'))
    time.sleep(2)

    print("6. [Google FLEURS - Tiếng Nhật]")
    sims.append(test_audio('/tmp/fleurs/ja_jp/test/17808260654685775088.wav', '技術決定論のほとんどの解釈は、2つの一般論を共有しています。1つは技術の発展自体が文化的・政治的な影響を大きく超えた道をたどっていること、もう1つは技術が社会的に条件づけられたものではなく、むしろ内在する社会に「影響」を与えることです。', '日本語を書き起こしてください:'))

    avg_sim = sum(sims) / len(sims)
    print("=======================================================")
    print(f"  ĐỘ TƯƠNG ĐỒNG TRUNG BÌNH CỦA GEMINI FLASH LITE: {avg_sim:.1f}%")
    print("=======================================================")

if __name__ == '__main__':
    main()
