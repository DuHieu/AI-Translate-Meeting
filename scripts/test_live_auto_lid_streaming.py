"""
Test live WebSocket audio streaming with sourceLanguage = 'auto'
Verifies dynamic Language Identification (LID) and translation routing.
"""
import asyncio
import json
import os
import sys
import time
import urllib.request
import websockets

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_API = "http://localhost:5000"
AI_WS = "ws://localhost:8000/ws/transcribe"


def setup_meeting():
    print("[1] Tạo phòng họp kiểm thử Auto-LID...")
    req = urllib.request.Request(
        f"{BASE_API}/api/meetings",
        data=json.dumps({"name": "Auto-LID Dynamic Language Test"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as resp:
        meeting_data = json.loads(resp.read().decode("utf-8"))

    meeting_code = meeting_data["meetingCode"]
    meeting_id = meeting_data["meetingId"]
    host_token = meeting_data["hostToken"]

    print(f"    Phòng: {meeting_code} (ID: {meeting_id})")

    # Join with sourceLanguage = "auto"
    print("[2] Người tham gia vào phòng với sourceLanguage = 'auto'...")
    join_payload = json.dumps({
        "displayName": "Multilingual Speaker",
        "spokenLanguage": "auto",
        "targetLanguage": "ja",
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
            "displayName": "Multilingual Speaker",
            "spokenLanguage": "auto",
            "targetLanguage": "ja",
            "admissionToken": admission_token,
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(final_join_req) as resp:
        final_res = json.loads(resp.read().decode("utf-8"))

    return meeting_id, final_res["participantId"], final_res["subtitleToken"]



async def stream_audio_file(ws, file_path, label, chunk_duration=0.35):
    print(f"\n---> BẮT ĐẦU STREAM AUDIO [{label}]: {os.path.basename(file_path)}")
    with open(file_path, "rb") as f:
        pcm_bytes = f.read()

    chunk_size = int(16000 * 2 * chunk_duration)  # 16kHz 16-bit mono
    n_chunks = (len(pcm_bytes) + chunk_size - 1) // chunk_size
    print(f"     Tổng thời lượng: {len(pcm_bytes)/32000:.2f}s ({n_chunks} chunks)")

    t0 = time.time()
    for i in range(0, len(pcm_bytes), chunk_size):
        chunk = pcm_bytes[i : i + chunk_size]
        await ws.send(chunk)
        await asyncio.sleep(chunk_duration * 0.7)  # Slightly faster than real-time

    # Send silence to trigger VAD finalization
    silence = b"\x00" * int(16000 * 2 * 0.4)
    for _ in range(4):
        await ws.send(silence)
        await asyncio.sleep(0.1)

    print(f"---> HOÀN TẤT STREAM [{label}] trong {time.time() - t0:.2f}s")


async def main():
    meeting_id, participant_id, subtitle_jwt = setup_meeting()
    ws_url = f"{AI_WS}?meetingId={meeting_id}&participantId={participant_id}"

    print(f"\n[3] Kết nối WebSocket AI Service với sourceLanguage=auto: {ws_url}...")
    async with websockets.connect(ws_url) as ws:
        # In-band authentication
        auth_msg = {
            "type": "authenticate",
            "token": subtitle_jwt,
            "participantName": "Multilingual Speaker",
            "sourceLanguage": "auto",
            "targetLanguage": "ja",
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
                        print(f"  [{status}] Ngôn ngữ nhận diện: [{lang.upper()}]")
                        print(f"     Nói: \"{text}\"")
                        print(f"     Dịch: \"{trans}\"")
                        if is_final and text:
                            received_subtitles.append((lang, text, trans))
            except asyncio.CancelledError:
                pass
            except Exception as e:
                pass

            except asyncio.CancelledError:
                pass
            except Exception as e:
                pass

        listener_task = asyncio.create_task(listen_loop())

        # 1. Stream Vietnamese audio:
        vi_clip = "D:/MyProject/AI-Translate-Meeting/vi_clip2_16k.pcm"
        if os.path.exists(vi_clip):
            await stream_audio_file(ws, vi_clip, "TIẾNG VIỆT - AUTO LID")
            await asyncio.sleep(5.0)

        # 2. Stream English audio:
        en_clip = "D:/MyProject/AI-Translate-Meeting/en_sample_16k.pcm"
        if os.path.exists(en_clip):
            await stream_audio_file(ws, en_clip, "TIẾNG ANH - AUTO LID")
            await asyncio.sleep(5.0)

        # 3. Stream Japanese audio:
        ja_clip = "D:/MyProject/AI-Translate-Meeting/ja_sample_16k.pcm"
        if os.path.exists(ja_clip):
            await stream_audio_file(ws, ja_clip, "TIẾNG NHẬT - AUTO LID")
            await asyncio.sleep(5.0)

        # Allow final messages to arrive
        await asyncio.sleep(2.0)
        listener_task.cancel()


    print("\n" + "=" * 65)
    print("KẾT QUẢ ĐỘNG CỦA AUTO-LID TRÊN WEBSOCKET THỰC TẾ:")
    print("=" * 65)
    for i, (detected_lang, text, trans) in enumerate(received_subtitles, 1):
        print(f"Câu {i}: Phát hiện=[{detected_lang.upper()}]")
        print(f"   Gốc: \"{text}\"")
        print(f"   Dịch: \"{trans}\"")


if __name__ == "__main__":
    asyncio.run(main())
