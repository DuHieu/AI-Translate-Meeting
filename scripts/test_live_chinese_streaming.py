"""
End-to-end Live Streaming Verification for Chinese (Mandarin - zh)
Streams real FLEURS Chinese audio over WebSocket, verifies:
1. Whisper STT transcription with Simplified Chinese (OpenCC + Prompt conditioning)
2. Live Translation from Chinese (zh) to Vietnamese (vi)
3. Subtitle broadcast protocol conformance
"""
import asyncio
import json
import os
import sys
import time
import urllib.request
import websockets
import difflib

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_API = "http://localhost:5000"
AI_WS = "ws://localhost:8000/ws/transcribe"
SAMPLE_PCM = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "zh_sample_16k.pcm")
REF_TEXT = "因此，很可能这个符号只是作为一个标签添加的。"


def setup_meeting():
    print("[1] Tạo phòng họp test Tiếng Trung (zh)...")
    req = urllib.request.Request(
        f"{BASE_API}/api/meetings",
        data=json.dumps({"name": "Chinese Mandarin Real-time Test"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as resp:
        meeting_data = json.loads(resp.read().decode("utf-8"))

    meeting_code = meeting_data["meetingCode"]
    meeting_id = meeting_data["meetingId"]
    host_token = meeting_data["hostToken"]
    print(f"    Phòng: {meeting_code} (ID: {meeting_id})")

    # Join as Chinese speaker with targetLanguage = "vi"
    print("[2] Người nói tiếng Trung vào phòng (spoken: zh -> target: vi)...")
    join_payload = json.dumps({
        "displayName": "Chinese Speaker (北京)",
        "spokenLanguage": "zh",
        "targetLanguage": "vi",
    }).encode("utf-8")
    join_req = urllib.request.Request(
        f"{BASE_API}/api/meetings/{meeting_code}/join",
        data=join_payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(join_req) as resp:
        join_res = json.loads(resp.read().decode("utf-8"))

    admission_id = join_res["admissionId"]
    admission_token = join_res["admissionToken"]

    # Approve
    dec_req = urllib.request.Request(
        f"{BASE_API}/api/meetings/{meeting_code}/admissions/{admission_id}/decision",
        data=json.dumps({"decision": "approved"}).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {host_token}",
        },
    )
    with urllib.request.urlopen(dec_req) as resp:
        pass

    # Final join to get Subtitle JWT
    final_join_req = urllib.request.Request(
        f"{BASE_API}/api/meetings/{meeting_code}/join",
        data=json.dumps({
            "displayName": "Chinese Speaker (北京)",
            "spokenLanguage": "zh",
            "targetLanguage": "vi",
            "admissionToken": admission_token,
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(final_join_req) as resp:
        final_res = json.loads(resp.read().decode("utf-8"))

    return meeting_id, final_res["participantId"], final_res["subtitleToken"]


async def main():
    if not os.path.exists(SAMPLE_PCM):
        print(f"ERROR: File {SAMPLE_PCM} không tồn tại!")
        return 1

    meeting_id, participant_id, subtitle_jwt = setup_meeting()
    ws_url = f"{AI_WS}?meetingId={meeting_id}&participantId={participant_id}"

    print(f"\n[3] Kết nối WebSocket: {ws_url}...")
    async with websockets.connect(ws_url) as ws:
        # Authenticate
        auth_msg = {
            "type": "authenticate",
            "token": subtitle_jwt,
            "participantName": "Chinese Speaker (北京)",
            "sourceLanguage": "zh",
            "targetLanguage": "vi",
        }
        await ws.send(json.dumps(auth_msg))
        init_ack = await ws.recv()
        print(f"    AI Service Handshake OK: {init_ack[:60]}...")

        received_subtitles = []

        async def listen_loop():
            try:
                while True:
                    raw = await ws.recv()
                    data = json.loads(raw)
                    msg_type = data.get("type")
                    if msg_type == "subtitle" and "data" in data:
                        sub = data["data"]
                        is_final = sub.get("isFinal", False)
                        text = sub.get("originalText") or sub.get("text", "")
                        trans = sub.get("translatedText") or sub.get("translation", "")
                        lang = sub.get("sourceLanguage") or sub.get("language", "")
                        status = "FINAL" if is_final else "INTERIM"
                        print(f"  [{status}] ({lang}): {text} -> {trans}")
                        received_subtitles.append(sub)
            except asyncio.CancelledError:
                pass
            except Exception as e:
                print(f"  Listen loop error: {e}")

        listen_task = asyncio.create_task(listen_loop())

        # Stream audio chunks
        print(f"\n[4] Streaming file âm thanh tiếng Trung FLEURS: {os.path.basename(SAMPLE_PCM)}...")
        with open(SAMPLE_PCM, "rb") as f:
            pcm_bytes = f.read()

        chunk_size = int(16000 * 2 * 0.35)  # 350ms chunk
        t_start = time.perf_counter()

        for i in range(0, len(pcm_bytes), chunk_size):
            chunk = pcm_bytes[i : i + chunk_size]
            await ws.send(chunk)
            await asyncio.sleep(0.35 * 0.7)

        # Send silence to finalize
        silence = b"\x00" * int(16000 * 2 * 0.4)
        for _ in range(4):
            await ws.send(silence)
            await asyncio.sleep(0.1)

        await asyncio.sleep(2.0)
        listen_task.cancel()
        t_total = (time.perf_counter() - t_start) * 1000

        print("\n" + "=" * 65)
        print("TỔNG KẾT KẾT QUẢ STREAMING TIẾNG TRUNG TRÊN WEBSOCKET:")
        print("=" * 65)
        print(f"Câu gốc tham chiếu (FLEURS zh_cn): {REF_TEXT}")

        finals = [
            s for s in received_subtitles
            if s.get("isFinal") and "Xin chào" not in (s.get("originalText") or "")
        ]
        if finals:
            latest_final = finals[-1]
            rec_text = latest_final.get("originalText") or latest_final.get("text", "")
            rec_trans = latest_final.get("translatedText") or latest_final.get("translation", "")
            rec_lang = latest_final.get("sourceLanguage") or latest_final.get("language", "")

            import re
            ref_c = re.sub(r"[^\w\s]", "", REF_TEXT).replace(" ", "")
            rec_c = re.sub(r"[^\w\s]", "", rec_text).replace(" ", "")
            sim = difflib.SequenceMatcher(None, ref_c, rec_c).ratio() * 100

            print(f"Nhận dạng thực tế (STT):          {rec_text}")
            print(f"Ngôn ngữ phát hiện:               {rec_lang}")
            print(f"Bản dịch Tiếng Việt:              {rec_trans}")
            print(f"Độ tương đồng ký tự:              {sim:.2f}%")
            print(f"Tổng thời gian xử lý:             {t_total:.1f}ms")
            print(f"Số lượng interim subtitles:       {len(received_subtitles) - len(finals)}")
            print(f"Số lượng final subtitles:         {len(finals)}")

            # Assertions
            assert sim >= 80.0, f"Độ tương đồng tiếng Trung quá thấp: {sim}%"
            assert rec_trans, "Không nhận được bản dịch tiếng Việt!"
            assert rec_lang == "zh", f"Ngôn ngữ không phải zh: {rec_lang}"
            print("\n>>> TẤT CẢ TIÊU CHÍ TIẾNG TRUNG ĐẠT 100% THÀNH CÔNG! <<<")
            return 0
        else:
            print("ERROR: Không nhận được subtitle final nào!")
            return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code or 0)
