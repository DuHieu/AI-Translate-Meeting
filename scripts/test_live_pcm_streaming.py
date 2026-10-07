import asyncio
import json
import sys
import time
import urllib.request
import numpy as np
import websockets

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_API = "http://localhost:5000"
AI_WS = "ws://localhost:8000/ws/transcribe"

def create_and_join_meeting():
    print("[1] Tạo phòng họp qua .NET API...")
    req = urllib.request.Request(
        f"{BASE_API}/api/meetings",
        data=json.dumps({"name": "Real Voice PCM Streaming Test"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as resp:
        meeting_data = json.loads(resp.read().decode("utf-8"))

    meeting_code = meeting_data["meetingCode"]
    meeting_id = meeting_data["meetingId"]
    host_token = meeting_data["hostToken"]
    print(f"    Phòng: Code={meeting_code}, ID={meeting_id}")

    print("[2] Xin vào phòng...")
    join_payload = json.dumps({
        "displayName": "Tester Voice",
        "spokenLanguage": "vi",
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

    print("[3] Duyệt admission...")
    dec_req = urllib.request.Request(
        f"{BASE_API}/api/meetings/{meeting_code}/admissions/{admission_id}/decision",
        data=json.dumps({"decision": "approved"}).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {host_token}",
        },
    )
    with urllib.request.urlopen(dec_req) as resp:
        dec_res = json.loads(resp.read().decode("utf-8"))
        assert dec_res["status"] == "approved"

    print("[4] Lấy Subtitle Token...")
    final_join_req = urllib.request.Request(
        f"{BASE_API}/api/meetings/{meeting_code}/join",
        data=json.dumps({
            "displayName": "Tester Voice",
            "spokenLanguage": "vi",
            "targetLanguage": "ja",
            "admissionToken": admission_token,
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(final_join_req) as resp:
        final_res = json.loads(resp.read().decode("utf-8"))

    return {
        "meetingCode": meeting_code,
        "meetingId": meeting_id,
        "participantId": final_res["participantId"],
        "subtitleToken": final_res["subtitleToken"],
    }

async def stream_audio_file(ws, pcm_file_path: str, chunk_ms: int = 350):
    with open(pcm_file_path, "rb") as f:
        pcm_bytes = f.read()

    sample_rate = 16000
    bytes_per_sample = 2  # 16-bit
    chunk_bytes = int(sample_rate * (chunk_ms / 1000.0) * bytes_per_sample)
    
    num_chunks = len(pcm_bytes) // chunk_bytes
    total_sec = len(pcm_bytes) / (sample_rate * bytes_per_sample)
    print(f"\n---> BẮT ĐẦU STREAM FILE VOICE: {pcm_file_path} ({total_sec:.2f}s, {num_chunks} chunks)")

    # Stream real voice chunks
    t_start = time.time()
    for i in range(0, len(pcm_bytes), chunk_bytes):
        chunk = pcm_bytes[i:i + chunk_bytes]
        if len(chunk) < chunk_bytes:
            # Pad with silence to match exact chunk size
            chunk = chunk + b"\x00" * (chunk_bytes - len(chunk))
        await ws.send(chunk)
        await asyncio.sleep(chunk_ms / 1000.0)

    # Send 3 silence chunks to simulate natural pause and trigger finalization
    silence_chunk = b"\x00" * chunk_bytes
    for _ in range(3):
        await ws.send(silence_chunk)
        await asyncio.sleep(chunk_ms / 1000.0)

    t_end = time.time()
    print(f"---> HOÀN TẤT STREAM VOICE trong {t_end - t_start:.2f}s")

async def receive_subtitles(ws, results: list):
    try:
        while True:
            msg = await asyncio.wait_for(ws.recv(), timeout=12.0)
            data = json.loads(msg)
            msg_type = data.get("type", "subtitle")
            
            if msg_type == "pipeline_status":
                phase = data.get("phase") or "unknown"
                seq = data.get("sequence")
                print(f"  [Pipeline Status] Giai đoạn: {str(phase).upper()} (seq={seq})")
            elif "data" in data:
                sub = data["data"]
                is_final = sub.get("isFinal", False)
                orig = sub.get("originalText", "")
                trans = sub.get("translatedText", "")
                conf = sub.get("confidence", 0.0)
                tags = sub.get("tags", [])
                
                status_icon = "✅ [XÁC NHẬN - FINAL]" if is_final else "⏳ [ĐANG NÓI - INTERIM]"
                tag_str = f" [TAGS: {tags}]" if tags else ""
                print(f"  {status_icon}{tag_str}:")
                print(f"     🗣️ Tiếng Việt: \"{orig}\"")
                print(f"     🇯🇵 Tiếng Nhật: \"{trans}\"")
                print(f"     🎯 Confidence: {conf}")
                
                results.append(sub)
    except asyncio.CancelledError:
        pass
    except asyncio.TimeoutError:
        print("  [Hết thời gian chờ nhận phụ đề]")
    except Exception as e:
        print(f"  [Lỗi nhận tin]: {e}")

async def run_test():
    session = create_and_join_meeting()
    ws_url = (
        f"{AI_WS}?meetingId={session['meetingId']}"
        f"&participantId={session['participantId']}"
    )
    print(f"\n[5] Kết nối WebSocket AI Service: {ws_url}...")
    
    async with websockets.connect(ws_url) as ws:
        # Handshake Auth
        auth_msg = {
            "type": "authenticate",
            "token": session["subtitleToken"],
            "participantName": "Tester Voice",
            "sourceLanguage": "vi",
            "targetLanguage": "ja",
        }
        await ws.send(json.dumps(auth_msg))
        
        # Wait for welcome / initial ack message
        init_ack = await ws.recv()
        print(f"    AI Service Handshake OK: {init_ack[:60]}...")
        
        # Test with Clip 2 and Clip 3
        results = []
        recv_task = asyncio.create_task(receive_subtitles(ws, results))
        
        # 1. Stream Clip 2: "Anh Nam gửi báo cáo dự án trước 17 giờ hôm nay nhé."
        await asyncio.sleep(1.0)
        await stream_audio_file(ws, "vi_clip2_16k.pcm", chunk_ms=350)
        await asyncio.sleep(5.0)
            
        # 2. Stream Clip 3: "chúng ta thống nhất cho giải pháp triển hai trên AWS"
        await asyncio.sleep(1.0)
        await stream_audio_file(ws, "vi_clip3_16k.pcm", chunk_ms=350)
        await asyncio.sleep(6.0)
            
        recv_task.cancel()
        
        print("\n=== KẾT QUẢ TEST STREAMING FILE VOICE THẬT ===")
        finals = [r for r in results if r.get("isFinal") and r.get("originalText") != "Xin chào, chúng ta bắt đầu cuộc họp nhé."]
        print(f"Tổng số bản tin nhận được: {len(results)}, Số câu chốt (Final): {len(finals)}")
        for idx, f in enumerate(finals, 1):
            tags = f.get("tags", [])
            tag_str = f" [AI Tag: {tags}]" if tags else ""
            print(f"  Câu {idx}{tag_str}:")
            print(f"    🗣️ VI: \"{f['originalText']}\"")
            print(f"    🇯🇵 JA: \"{f['translatedText']}\"")

if __name__ == "__main__":
    asyncio.run(run_test())
