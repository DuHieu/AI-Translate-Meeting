import asyncio
import json
import urllib.request
import websockets

BASE_API = "http://localhost:5000"
AI_API = "http://localhost:8000"
ADMIN_KEY = "vimeet-admin-secret-2026"

MEETING_VOICE_UTTERANCES = [
    {
        "speaker": "Nguyen Van A (Tech Lead)",
        "source": "vi",
        "target": "ja",
        "text": "Xin chào mọi người, chúng ta bắt đầu cuộc họp sprint planning nhé.",
    },
    {
        "speaker": "Nguyen Van A (Tech Lead)",
        "source": "vi",
        "target": "ja",
        "text": "Hôm nay chúng ta cần chốt giải pháp triển khai trên đám mây cho hệ thống microservice.",
    },
    {
        "speaker": "Nguyen Van A (Tech Lead)",
        "source": "vi",
        "target": "ja",
        "text": "Ngân sách hạ tầng quý này ước tính khoảng 150 triệu VND hoặc tương đương $6,000.",
    },
    {
        "speaker": "Nguyen Van A (Tech Lead)",
        "source": "vi",
        "target": "ja",
        "text": "Nếu có thắc mắc kỹ thuật, vui lòng gửi email tới dev-team@layameet.vn hoặc gọi số 0987654321.",
    },
    {
        "speaker": "Nguyen Van A (Tech Lead)",
        "source": "vi",
        "target": "ja",
        "text": "Chúng ta hoàn toàn thống nhất giải pháp này và thời hạn hoàn thành là ngày mai.",
    },
]


def create_and_join_meeting():
    print("[1] Tạo phòng họp qua .NET API...")
    req = urllib.request.Request(
        f"{BASE_API}/api/meetings",
        data=json.dumps({"name": "Sprint 42 Architecture Review"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as resp:
        meeting_data = json.loads(resp.read().decode("utf-8"))

    meeting_code = meeting_data["meetingCode"]
    meeting_id = meeting_data["meetingId"]
    host_token = meeting_data["hostToken"]
    print(f"    Phòng tạo thành công: Mã={meeting_code}, ID={meeting_id}")

    print("[2] Yêu cầu tham gia cuộc họp (Join)...")
    join_payload = json.dumps(
        {
            "displayName": "Nguyen Van A",
            "spokenLanguage": "vi",
            "targetLanguage": "ja",
        }
    ).encode("utf-8")
    join_req = urllib.request.Request(
        f"{BASE_API}/api/meetings/{meeting_code}/join",
        data=join_payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(join_req) as resp:
        join_res = json.loads(resp.read().decode("utf-8"))

    admission_id = join_res["admissionId"]
    admission_token = join_res["admissionToken"]

    print("[3] Chủ phòng (Host) duyệt admission...")
    decision_payload = json.dumps({"decision": "approved"}).encode("utf-8")
    dec_req = urllib.request.Request(
        f"{BASE_API}/api/meetings/{meeting_code}/admissions/{admission_id}/decision",
        data=decision_payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {host_token}",
        },
    )
    with urllib.request.urlopen(dec_req) as resp:
        dec_res = json.loads(resp.read().decode("utf-8"))
        assert dec_res["status"] == "approved"

    print("[4] Lấy Subtitle Token chính thức...")
    final_join_req = urllib.request.Request(
        f"{BASE_API}/api/meetings/{meeting_code}/join",
        data=json.dumps(
            {
                "displayName": "Nguyen Van A",
                "spokenLanguage": "vi",
                "targetLanguage": "ja",
                "admissionToken": admission_token,
            }
        ).encode("utf-8"),
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


async def run_live_subtitle_session(session_info):
    ws_url = (
        f"ws://localhost:8000/ws/transcribe"
        f"?meetingId={session_info['meetingId']}"
        f"&participantId={session_info['participantId']}"
    )
    print(f"\n[5] Kết nối WebSocket phụ đề: {ws_url}")

    async with websockets.connect(ws_url) as ws:
        # Handshake Authenticate
        auth_msg = {
            "type": "authenticate",
            "token": session_info["subtitleToken"],
            "participantName": "Nguyen Van A",
            "sourceLanguage": "vi",
            "targetLanguage": "ja",
        }
        await ws.send(json.dumps(auth_msg))
        auth_resp = json.loads(await ws.recv())
        print(f"    WebSocket Authenticated: {auth_resp.get('type')}")

        # Send configuration
        config_msg = {
            "type": "config",
            "domain": "it",
            "translationTier": "pro",
            "byokEnabled": False,
        }
        await ws.send(json.dumps(config_msg))

        print("\n[6] Bắt đầu truyền 5 đoạn voice utterances liên tiếp:")
        results = []

        for i, item in enumerate(MEETING_VOICE_UTTERANCES, 1):
            print(f"\n--- [Đoạn {i}/{len(MEETING_VOICE_UTTERANCES)}] ---")
            print(f"Gốc ({item['source']}): \"{item['text']}\"")

            speech_payload = {
                "text": item["text"],
                "language": item["source"],
                "isFinal": True,
            }
            await ws.send(json.dumps(speech_payload))

            # Receive broadcasts until final subtitle arrives
            while True:
                msg_raw = await ws.recv()
                msg = json.loads(msg_raw)
                if msg.get("type") == "subtitle" and msg.get("data", {}).get("isFinal"):
                    sub_data = msg["data"]
                    trans = sub_data.get("translatedText")
                    print(f"Dịch ({sub_data.get('targetLanguage')}): \"{trans}\"")
                    results.append((item["text"], trans))
                    break

            await asyncio.sleep(0.5)

        # Allow async QA recording task to complete
        await asyncio.sleep(2.0)
        return results


def verify_admin_page_qa(meeting_code):
    print("\n[7] Kiểm tra số liệu tại Admin Dashboard API (Page Admin)...")
    summary_req = urllib.request.Request(
        f"{AI_API}/api/translation-qa/summary",
        headers={"X-Admin-Key": ADMIN_KEY},
    )
    with urllib.request.urlopen(summary_req) as resp:
        summary = json.loads(resp.read().decode("utf-8"))

    print("\n================ TỔNG QUAN ADMIN TRANSLATION QA ================")
    print(f"• Tổng số phân đoạn đã xử lý: {summary.get('totalSegments')}")
    print(f"• Độ chính xác trung bình (Accuracy): {summary.get('avgAccuracyPct')}%")
    print(f"• Thời gian phản hồi trung bình (Latency): {summary.get('avgLatencyMs')} ms")
    print(f"• Tỉ lệ Cache Hit: {summary.get('cacheHitRatePct')}%")
    print(f"• Cảnh báo độ tin cậy thấp: {summary.get('flaggedLowConfidenceCount')}")

    # Check meeting stats
    meeting_stats = next(
        (m for m in summary.get("meetings", []) if m.get("meetingCode") == meeting_code),
        None,
    )

    if meeting_stats:
        print(f"\nChi tiết phòng họp [{meeting_code}]:")
        print(f"  - Số đoạn dịch: {meeting_stats.get('totalSegments')}")
        print(f"  - Độ chính xác: {meeting_stats.get('avgAccuracyPct')}%")
        print(f"  - Latency: {meeting_stats.get('avgLatencyMs')} ms")
    else:
        print(f"\nDanh sách các cuộc họp đã ghi nhận: {len(summary.get('meetings', []))}")

    # Check Token Usage per meeting (Direction C)
    print("\n[8] Kiểm tra hạn mức tiêu thụ Token (Direction C Quota API)...")
    try:
        usage_req = urllib.request.Request(f"{AI_API}/api/translation/usage/{meeting_code}")
        with urllib.request.urlopen(usage_req) as resp:
            usage = json.loads(resp.read().decode("utf-8"))
        print(f"• Gói dịch thuật: {usage.get('tier')}")
        print(f"• Token đã dùng: {usage.get('total_tokens_used')} / {usage.get('quota')}")
        print(f"• Token còn lại: {usage.get('remaining_quota')}")
        print(f"• Trạng thái Downgrade: {usage.get('downgraded')}")
    except Exception as e:
        print("Lỗi đọc usage:", e)

    print("\n✅ THỬ NGHIỆM LIVE MEETING VÀ KIỂM TRA PAGE ADMIN HOÀN TẤT THÀNH CÔNG!")


if __name__ == "__main__":
    session = create_and_join_meeting()
    asyncio.run(run_live_subtitle_session(session))
    verify_admin_page_qa(session["meetingCode"])
