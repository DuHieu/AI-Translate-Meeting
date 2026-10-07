import asyncio
import json
import urllib.request
import websockets

BASE_API = "http://localhost:5000"
AI_API = "http://localhost:8000"
ADMIN_KEY = "vimeet-admin-secret-2026"

# Test scenarios containing noisy, mumbled, stuttering, and fragmented speech
NOISY_VOICE_UTTERANCES = [
    {
        "description": "Nói lắp, ngập ngừng, lẫn tiếng ậm ừ (Stutter & fillers)",
        "source": "vi",
        "target": "ja",
        "text": "À... ờ... tôi... tôi nghĩ là cái bug... cái lỗi này do database quá tải.",
        "confidence": 0.62, # STT confidence giảm do tiếng ngập ngừng
    },
    {
        "description": "Mất âm, nuốt chữ, câu nói bị ngắt cụt (Fragmented / clipped utterance)",
        "source": "vi",
        "target": "ja",
        "text": "Alo nghe... deploy... bên kia... không được.",
        "confidence": 0.45, # STT confidence thấp
    },
    {
        "description": "Nhiễu micro, tạp âm nền môi trường (Microphone noise & corrupted words)",
        "source": "vi",
        "target": "ja",
        "text": "Xột xoạt rè rè... phần backend microservice... rè rè...",
        "confidence": 0.35, # Cực thấp (nhiễu âm nặng)
    },
    {
        "description": "Nói chêm từ mượn nửa nạc nửa mỡ (Mixed code-switching slang)",
        "source": "vi",
        "target": "ja",
        "text": "Team mình check giùm cái PR hotfix gấp để kịp release tối nay nhé.",
        "confidence": 0.78, # Độ tin cậy trung bình khá
    },
    {
        "description": "Nói quá nhanh, dính chữ không ngắt câu (Fast mumbled speech)",
        "source": "vi",
        "target": "ja",
        "text": "Okchốtvậynhéngàymaihọptiếpbye.",
        "confidence": 0.40, # Dính chữ, không dấu cách
    },
]


def create_and_join_meeting():
    print("[1] Tạo phòng họp test Voice data xấu...")
    req = urllib.request.Request(
        f"{BASE_API}/api/meetings",
        data=json.dumps({"name": "Noisy Voice Robustness Test"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as resp:
        meeting_data = json.loads(resp.read().decode("utf-8"))

    meeting_code = meeting_data["meetingCode"]
    meeting_id = meeting_data["meetingId"]
    host_token = meeting_data["hostToken"]

    # Join
    join_req = urllib.request.Request(
        f"{BASE_API}/api/meetings/{meeting_code}/join",
        data=json.dumps({"displayName": "Tester Noisy Mic", "spokenLanguage": "vi", "targetLanguage": "ja"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(join_req) as resp:
        join_res = json.loads(resp.read().decode("utf-8"))

    # Approve
    dec_req = urllib.request.Request(
        f"{BASE_API}/api/meetings/{meeting_code}/admissions/{join_res['admissionId']}/decision",
        data=json.dumps({"decision": "approved"}).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {host_token}"},
    )
    with urllib.request.urlopen(dec_req) as resp:
        pass

    # Final Join
    final_join_req = urllib.request.Request(
        f"{BASE_API}/api/meetings/{meeting_code}/join",
        data=json.dumps({
            "displayName": "Tester Noisy Mic",
            "spokenLanguage": "vi",
            "targetLanguage": "ja",
            "admissionToken": join_res["admissionToken"]
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(final_join_req) as resp:
        final_join_res = json.loads(resp.read().decode("utf-8"))

    return {
        "meetingCode": meeting_code,
        "meetingId": meeting_id,
        "participantId": final_join_res["participantId"],
        "subtitleToken": final_join_res["subtitleToken"],
    }


async def run_noisy_voice_session(session_info):
    ws_url = (
        f"ws://localhost:8000/ws/transcribe"
        f"?meetingId={session_info['meetingId']}"
        f"&participantId={session_info['participantId']}"
    )
    print(f"\n[2] Kết nối WebSocket: {ws_url}")

    async with websockets.connect(ws_url) as ws:
        await ws.send(json.dumps({
            "type": "authenticate",
            "token": session_info["subtitleToken"],
            "participantName": "Tester Noisy Mic",
            "sourceLanguage": "vi",
            "targetLanguage": "ja",
        }))
        await ws.recv()

        await ws.send(json.dumps({
            "type": "config",
            "domain": "it",
            "translationTier": "standard",
            "byokEnabled": False,
        }))

        print("\n[3] Bắt đầu truyền 5 đoạn âm thanh bị nhiễu / nói không rõ ràng:")
        results = []

        for i, item in enumerate(NOISY_VOICE_UTTERANCES, 1):
            print(f"\n--- [Tình huống {i}/5]: {item['description']} ---")
            print(f"• Input Text: \"{item['text']}\"")
            print(f"• Giả lập STT Confidence: {item['confidence']*100:.0f}%")

            speech_payload = {
                "text": item["text"],
                "language": item["source"],
                "confidence": item["confidence"],
                "isFinal": True,
            }
            await ws.send(json.dumps(speech_payload))

            while True:
                msg_raw = await ws.recv()
                msg = json.loads(msg_raw)
                if msg.get("type") == "subtitle" and msg.get("data", {}).get("isFinal"):
                    sub_data = msg["data"]
                    if sub_data.get("confidence") == 0.0 and sub_data.get("originalText") == "Xin chào, chúng ta bắt đầu cuộc họp nhé.":
                        continue
                    trans = sub_data.get("translatedText")
                    print(f"• Output Translation (ja): \"{trans}\"")
                    results.append((item["text"], trans, item["confidence"]))
                    break

            await asyncio.sleep(0.5)

        await asyncio.sleep(2.0)
        return results


def verify_admin_telemetry(meeting_id):
    print("\n[4] Kiểm tra phản ứng cảnh báo tại Page Admin (/api/translation-qa/summary)...")
    summary_req = urllib.request.Request(
        f"{AI_API}/api/translation-qa/summary",
        headers={"X-Admin-Key": ADMIN_KEY},
    )
    with urllib.request.urlopen(summary_req) as resp:
        summary = json.loads(resp.read().decode("utf-8"))

    print("\n================ SỐ LIỆU ĐÁNH GIÁ CHẤT LƯỢNG (PAGE ADMIN) ================")
    print(f"• Tổng số phân đoạn: {summary.get('totalSegments')}")
    print(f"• Độ chính xác trung bình (Accuracy): {summary.get('avgAccuracyPct')}%")
    print(f"• Độ tin cậy nhận diện giọng nói (STT Confidence): {summary.get('avgSttConfidencePct')}%")
    print(f"• Cảnh báo chất lượng kém (Flagged Low Confidence): {summary.get('flaggedLowConfidenceCount')}")

    # Lấy thông tin phòng họp test nhiễu
    meeting_stats = next(
        (m for m in summary.get("meetings", []) if m.get("meetingCode") == meeting_id),
        None,
    )
    if meeting_stats:
        print(f"\nThống kê phòng họp nhiễu [{meeting_id}]:")
        print(f"  - Độ chính xác trung bình: {meeting_stats.get('avgAccuracyPct')}%")
        print(f"  - Độ tin cậy STT trung bình: {meeting_stats.get('avgSttConfidencePct')}%")
        print(f"  - Số câu bị gắn cờ cảnh báo chất lượng thấp (<70%): {meeting_stats.get('flaggedLowConfidenceCount')} câu")
        print(f"  - Engine xử lý: {meeting_stats.get('engineBreakdown')}")

    # Lấy danh sách samples bị gắn cờ
    samples_req = urllib.request.Request(
        f"{AI_API}/api/translation-qa/samples?meetingId={meeting_id}",
        headers={"X-Admin-Key": ADMIN_KEY},
    )
    with urllib.request.urlopen(samples_req) as resp:
        samples_data = json.loads(resp.read().decode("utf-8"))
        samples = samples_data.get("samples", [])
        print(f"\nSố lượng mẫu được lưu lại để quản trị viên đối soát/huấn luyện: {len(samples)}")
        for s in samples:
            print(f"  [Điểm: {s.get('accuracyScore')}%] \"{s.get('source')}\" ➔ \"{s.get('machineTranslation')}\"")


if __name__ == "__main__":
    session = create_and_join_meeting()
    asyncio.run(run_noisy_voice_session(session))
    verify_admin_telemetry(session["meetingId"])
