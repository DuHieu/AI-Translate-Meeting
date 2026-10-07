import json
import urllib.request
from rapidfuzz.distance import JaroWinkler
import jiwer

API_KEY = "AQ.Ab8RN6KQDpDEyglkKbOL37Ocvmf_2YNUfwvShUk4A4mYEn4TrA"
MODEL = "gemini-3.1-flash-lite"

test_cases = [
    {
        "ref": "Xin chào các bạn",
        "whisper_raw": "Xin chào các bạn!",
        "glossary": ["chào", "các bạn"],
    },
    {
        "ref": "Anh Nam gửi báo cáo dự án trước 17 giờ hôm nay nhé.",
        "whisper_raw": "Anh Nam gửi báo cáo dự án trước 17:00 hôm nay nhé.",
        "glossary": ["Nam", "báo cáo dự án", "17 giờ"],
    },
    {
        "ref": "Chúng ta thống nhất chốt giải pháp triển khai trên AWS",
        "whisper_raw": "Chúng ta thống nhất trút giải pháp truyền khai trên AWS.",
        "glossary": ["chốt", "triển khai", "AWS", "kiến trúc"],
    },
    {
        "ref": "Mặt khác, băng và tuyết là hiện tượng bình thường ở nhiều nước, và quanh năm giao thông gần như không bị gián đoạn.",
        "whisper_raw": "Mặc khác, băng và tích là hình tưởng bình thường ở nhiều nước và quân năm do thông, dần như không bị dáng đoạn.",
        "glossary": ["mặt khác", "băng và tuyết", "giao thông", "gián đoạn"],
    },
]

print("=== KIỂM CHỨNG GIẢI PHÁP TWO-STAGE HYBRID (WHISPER BASE + GEMINI FLASH-LITE POST-CORRECTION) ===")

for i, tc in enumerate(test_cases, 1):
    prompt = (
        f"Bạn là AI hiệu đính transcript cuộc họp trực tiếp.\n"
        f"Nhiệm vụ: Sửa các lỗi nghe nhầm ngữ âm (homophone errors) của hệ thống STT để câu văn đúng chuẩn ngữ cảnh cuộc họp.\n"
        f"Từ điển ngữ cảnh: {tc['glossary']}\n"
        f"Văn bản STT gốc: \"{tc['whisper_raw']}\"\n"
        f"Quy tắc tuyệt đối:\n"
        f"1. Chỉ sửa các từ nghe nhầm ngữ âm hiển nhiên (ví dụ 'trút' -> 'chốt', 'truyền khai' -> 'triển khai', 'mặc khác' -> 'mặt khác', 'băng và tích' -> 'băng và tuyết').\n"
        f"2. KHÔNG tóm tắt, KHÔNG thêm bớt ý, giữ nguyên cấu trúc câu.\n"
        f"3. Chỉ trả về duy nhất câu đã sửa, không thêm bất kỳ lời giải thích nào."
    )
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        corrected = res["candidates"][0]["content"]["parts"][0]["text"].strip()
        ref = tc["ref"]
        raw = tc["whisper_raw"]
        jw_raw = JaroWinkler.similarity(ref, raw) * 100
        jw_cor = JaroWinkler.similarity(ref, corrected) * 100
        cer_raw = jiwer.cer(ref, raw) * 100
        cer_cor = jiwer.cer(ref, corrected) * 100
        print(f"\n[Case {i}]")
        print(f"  Reference : {ref}")
        print(f"  WhisperRaw: {raw} (JW: {jw_raw:.1f}%, CER: {cer_raw:.1f}%)")
        print(f"  Stage-2   : {corrected} (JW: {jw_cor:.1f}%, CER: {cer_cor:.1f}%)")
