#!/usr/bin/env python3
"""
AI-Translate-Meeting: Synthetic Audio Load-Testing & Benchmark Tool
Measures concurrent STT and translation throughput, latency (TTFS p50/p95),
session stability, and zero cross-room leakage across multiple concurrent rooms
and multi-participant speaker/listener workloads.
"""

import argparse
import asyncio
import json
import logging
import statistics
import sys
import time
import urllib.request
from pathlib import Path
from typing import Any, Optional

try:
    import websockets
except ImportError:
    print("Error: 'websockets' library is required. Install via 'pip install websockets'", file=sys.stderr)
    sys.exit(1)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("load_test")


def http_post_json(url: str, data: dict, headers: Optional[dict] = None) -> dict:
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers=req_headers,
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


class WorkerResult:
    def __init__(self, room_idx: int, worker_id: int, is_speaker: bool, meeting_id: str):
        self.room_idx = room_idx
        self.worker_id = worker_id
        self.is_speaker = is_speaker
        self.meeting_id = meeting_id
        self.success = False
        self.error_message: Optional[str] = None
        self.chunks_sent = 0
        self.subtitles_received = 0
        self.ttfs_ms: Optional[float] = None
        self.final_received = False
        self.duration_sec = 0.0
        self.leakage_detected = False
        self.leaked_meeting_ids: set[str] = set()


async def run_worker(
    room_idx: int,
    worker_id: int,
    is_speaker: bool,
    api_url: str,
    ws_url: str,
    meeting_code: str,
    meeting_id: str,
    host_token: str,
    pcm_chunks: list[bytes],
    chunk_interval: float,
    source_lang: str,
    target_lang: str,
    room_speaker_started: dict[str, float],
) -> WorkerResult:
    result = WorkerResult(
        room_idx=room_idx,
        worker_id=worker_id,
        is_speaker=is_speaker,
        meeting_id=meeting_id,
    )
    start_total = time.monotonic()

    try:
        # 1. Acquire Admission Token (Host for worker 1, Invites for others)
        if worker_id == 1:
            admission_token = host_token
        else:
            invite_res = await asyncio.to_thread(
                http_post_json,
                f"{api_url}/api/meetings/{meeting_code}/invites",
                {"ttlMinutes": 15},
                {"Authorization": f"Bearer {host_token}"},
            )
            admission_token = invite_res["token"]

        role_label = "Speaker" if is_speaker else "Listener"
        display_name = f"R{room_idx}-{role_label}-{worker_id}"

        # 2. Join meeting to acquire Subtitle JWT
        join_res = await asyncio.to_thread(
            http_post_json,
            f"{api_url}/api/meetings/{meeting_code}/join",
            {
                "displayName": display_name,
                "spokenLanguage": source_lang,
                "targetLanguage": target_lang,
                "admissionToken": admission_token,
            },
        )
        participant_id = join_res["participantId"]
        subtitle_token = join_res["subtitleToken"]

        # 3. Connect to AI WebSocket
        ws_endpoint = f"{ws_url}/ws/transcribe?meetingId={meeting_id}&participantId={participant_id}"
        async with websockets.connect(ws_endpoint, max_size=131072) as ws:
            # 4. Authenticate
            auth_frame = {
                "type": "authenticate",
                "token": subtitle_token,
                "participantName": display_name,
                "sourceLanguage": source_lang,
                "targetLanguage": target_lang,
            }
            await ws.send(json.dumps(auth_frame))
            ack_raw = await ws.recv()
            ack = json.loads(ack_raw)
            if ack.get("type") != "authenticated":
                raise RuntimeError(f"Authentication failed: {ack}")

            # 5. Background receiver for subtitles and cross-room isolation validation
            first_subtitle_time: Optional[float] = None
            first_chunk_sent_time: Optional[float] = None

            async def receive_subtitles():
                nonlocal first_subtitle_time
                try:
                    while True:
                        msg = await ws.recv()
                        if isinstance(msg, str):
                            data = json.loads(msg)
                            msg_type = data.get("type")
                            if msg_type == "subtitle":
                                result.subtitles_received += 1
                                sub_data = data.get("data", {})

                                # Zero cross-room leakage verification
                                msg_meeting_id = sub_data.get("meetingId")
                                if msg_meeting_id and msg_meeting_id != meeting_id:
                                    result.leakage_detected = True
                                    result.leaked_meeting_ids.add(msg_meeting_id)

                                if first_subtitle_time is None:
                                    first_subtitle_time = time.monotonic()
                                    # Reference start time: speaker's first chunk or room's speaker start
                                    ref_time = first_chunk_sent_time or room_speaker_started.get(meeting_id)
                                    if ref_time is not None:
                                        result.ttfs_ms = max(0.0, (first_subtitle_time - ref_time) * 1000)

                                if sub_data.get("isFinal"):
                                    result.final_received = True
                except asyncio.CancelledError:
                    pass
                except websockets.exceptions.ConnectionClosed:
                    pass

            recv_task = asyncio.create_task(receive_subtitles())

            # 6. Stream PCM chunks if Active Speaker
            if is_speaker:
                first_chunk_sent_time = time.monotonic()
                room_speaker_started[meeting_id] = first_chunk_sent_time
                for chunk in pcm_chunks:
                    await ws.send(chunk)
                    result.chunks_sent += 1
                    await asyncio.sleep(chunk_interval)

            # 7. Grace period for STT, translation and fanout to reach listeners
            # Speakers wait for final or partial, listeners wait for broadcast
            for _ in range(40):
                if result.final_received or result.subtitles_received > 0:
                    break
                await asyncio.sleep(0.2)

            recv_task.cancel()
            await asyncio.gather(recv_task, return_exceptions=True)

        result.success = result.subtitles_received > 0 and not result.leakage_detected
        if not result.success:
            if result.leakage_detected:
                result.error_message = f"Cross-room subtitle leakage detected! Leaked IDs: {result.leaked_meeting_ids}"
            else:
                result.error_message = "No subtitles received before timeout."

    except Exception as ex:
        result.success = False
        result.error_message = str(ex)

    result.duration_sec = time.monotonic() - start_total
    return result


async def main_async(args: argparse.Namespace) -> int:
    pcm_path = Path(args.sample_file)
    if not pcm_path.exists():
        logger.error("Sample audio file not found: %s", pcm_path)
        return 1

    pcm_data = pcm_path.read_bytes()
    chunk_size = args.chunk_size_bytes
    chunks = [pcm_data[i:i + chunk_size] for i in range(0, len(pcm_data), chunk_size)]
    if not chunks:
        logger.error("Sample file is empty: %s", pcm_path)
        return 1

    rooms_count = max(1, args.rooms)
    participants_per_room = args.participants_per_room or args.concurrency
    speakers_per_room = min(max(1, args.speakers_per_room), participants_per_room)
    listeners_per_room = participants_per_room - speakers_per_room

    total_participants = rooms_count * participants_per_room
    total_speakers = rooms_count * speakers_per_room
    total_listeners = rooms_count * listeners_per_room

    logger.info("Loaded sample audio: %d bytes (%d chunks of %d bytes, ~%.2fs audio)",
                len(pcm_data), len(chunks), chunk_size, len(chunks) * args.chunk_interval)
    logger.info("Benchmark Plan: %d Rooms | %d Participants/Room (%d Speakers, %d Listeners) | Total: %d Participants",
                rooms_count, participants_per_room, speakers_per_room, listeners_per_room, total_participants)
    logger.info("Target Endpoints: API=%s, WS=%s", args.api_url, args.ws_url)

    # 1. Initialize Rooms concurrently
    logger.info("Provisioning %d meeting rooms concurrently...", rooms_count)
    rooms_data = []
    timestamp = int(time.time())

    async def create_room(r_idx: int):
        room_name = f"{args.room_prefix}{r_idx}-{timestamp}"
        create_res = await asyncio.to_thread(
            http_post_json,
            f"{args.api_url}/api/meetings",
            {"name": room_name},
        )
        return {
            "room_idx": r_idx,
            "meeting_code": create_res["meetingCode"],
            "meeting_id": create_res["meetingId"],
            "host_token": create_res["hostToken"],
        }

    try:
        room_creation_tasks = [create_room(i + 1) for i in range(rooms_count)]
        rooms_data = await asyncio.gather(*room_creation_tasks)
        logger.info("Successfully provisioned %d rooms: %s",
                    len(rooms_data), [r["meeting_code"] for r in rooms_data])
    except Exception as ex:
        logger.error("Failed to provision rooms: %s", ex)
        return 1

    # 2. Spawn workers across all rooms
    room_speaker_started: dict[str, float] = {}
    worker_tasks = []

    start_bench = time.monotonic()

    for room in rooms_data:
        r_idx = room["room_idx"]
        m_code = room["meeting_code"]
        m_id = room["meeting_id"]
        h_tok = room["host_token"]

        for p_idx in range(1, participants_per_room + 1):
            is_speaker = p_idx <= speakers_per_room
            worker_tasks.append(
                run_worker(
                    room_idx=r_idx,
                    worker_id=p_idx,
                    is_speaker=is_speaker,
                    api_url=args.api_url,
                    ws_url=args.ws_url,
                    meeting_code=m_code,
                    meeting_id=m_id,
                    host_token=h_tok,
                    pcm_chunks=chunks,
                    chunk_interval=args.chunk_interval,
                    source_lang=args.source_lang,
                    target_lang=args.target_lang,
                    room_speaker_started=room_speaker_started,
                )
            )

    logger.info("Launching %d workers across %d rooms...", len(worker_tasks), rooms_count)
    results: list[WorkerResult] = await asyncio.gather(*worker_tasks)
    total_time = time.monotonic() - start_bench

    # 3. Analyze Results
    successful = [r for r in results if r.success]
    failed = [r for r in results if not r.success]
    leaked = [r for r in results if r.leakage_detected]

    speaker_results = [r for r in results if r.is_speaker]
    listener_results = [r for r in results if not r.is_speaker]

    ttfs_values = [r.ttfs_ms for r in successful if r.ttfs_ms is not None]
    speaker_ttfs = [r.ttfs_ms for r in speaker_results if r.ttfs_ms is not None]
    listener_ttfs = [r.ttfs_ms for r in listener_results if r.ttfs_ms is not None]

    print("\n" + "=" * 70)
    print("      AI-TRANSLATE-MEETING CONCURRENCY & MULTI-ROOM BENCHMARK")
    print("=" * 70)
    print(f"Total Rooms Provisioned:       {rooms_count}")
    print(f"Total Participants Tested:     {total_participants} ({total_speakers} Speakers, {total_listeners} Listeners)")
    print(f"Successful Sessions:           {len(successful)} / {total_participants} ({len(successful) / total_participants * 100:.1f}%)")
    print(f"Failed Sessions:               {len(failed)}")
    print(f"Cross-Room Leakage Violations: {len(leaked)} (Zero Leakage {'PASSED' if len(leaked) == 0 else 'FAILED'})")
    print(f"Total Audio Chunks Streamed:   {sum(r.chunks_sent for r in results)}")
    print(f"Total Subtitles Received:      {sum(r.subtitles_received for r in results)}")
    print(f"Total Benchmark Wall Time:     {total_time:.2f} s")

    if ttfs_values:
        ttfs_p50 = statistics.median(ttfs_values)
        ttfs_min = min(ttfs_values)
        ttfs_max = max(ttfs_values)
        ttfs_p95 = statistics.quantiles(ttfs_values, n=20)[-1] if len(ttfs_values) >= 20 else ttfs_max

        print("-" * 70)
        print("Latency Analysis (Time-To-First-Subtitle - TTFS):")
        print(f"  Overall Min:                 {ttfs_min:.1f} ms")
        print(f"  Overall Median (p50):        {ttfs_p50:.1f} ms")
        print(f"  Overall 95th (p95):          {ttfs_p95:.1f} ms")
        print(f"  Overall Max:                 {ttfs_max:.1f} ms")

        if speaker_ttfs:
            print(f"  Speaker p50:                 {statistics.median(speaker_ttfs):.1f} ms")
        if listener_ttfs:
            print(f"  Listener Broadcast p50:      {statistics.median(listener_ttfs):.1f} ms")
        print("-" * 70)

        sla_p50_target = 2000.0
        sla_pass = ttfs_p50 <= sla_p50_target and len(failed) == 0 and len(leaked) == 0
        if sla_pass:
            print(f"[RESULT] SLA PASSED: TTFS p50 ({ttfs_p50:.1f}ms) <= {sla_p50_target:.0f}ms & Zero Cross-Room Leakage.")
        else:
            print(f"[RESULT] SLA WARNING: TTFS p50 exceeded, sessions failed, or cross-room leakage detected.")
    else:
        print("[RESULT] FAILED: No subtitle measurements recorded.")

    # Export structured metrics if requested
    if args.output_json:
        report_data = {
            "timestamp": int(time.time()),
            "rooms": rooms_count,
            "participants_per_room": participants_per_room,
            "total_participants": total_participants,
            "successful_sessions": len(successful),
            "failed_sessions": len(failed),
            "cross_room_leakage_count": len(leaked),
            "total_wall_time_sec": total_time,
            "ttfs_p50_ms": statistics.median(ttfs_values) if ttfs_values else None,
            "ttfs_p95_ms": (statistics.quantiles(ttfs_values, n=20)[-1] if len(ttfs_values) >= 20 else max(ttfs_values)) if ttfs_values else None,
        }
        out_path = Path(args.output_json)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(report_data, indent=2), encoding="utf-8")
        logger.info("Saved benchmark report to %s", out_path)

    if failed:
        print("\nFailures Detail:")
        for r in failed:
            role = "Speaker" if r.is_speaker else "Listener"
            print(f"  Room {r.room_idx} | {role} #{r.worker_id}: {r.error_message}")
        return 1

    return 0


def main():
    parser = argparse.ArgumentParser(description="Synthetic Audio Load-Testing & Multi-Room Benchmark Tool for AI-Translate-Meeting")
    parser.add_argument("--api-url", default="http://localhost:5000", help="Backend API base URL")
    parser.add_argument("--ws-url", default="ws://localhost:8000", help="AI Service WebSocket base URL")
    parser.add_argument("--concurrency", type=int, default=1, help="Concurrent speaker sessions (legacy compatibility)")
    parser.add_argument("--rooms", type=int, default=1, help="Number of concurrent meeting rooms to open")
    parser.add_argument("--participants-per-room", type=int, default=None, help="Number of participants in each room")
    parser.add_argument("--speakers-per-room", type=int, default=1, help="Number of active audio streaming speakers per room")
    parser.add_argument("--room-prefix", default="Load-Room-", help="Prefix for benchmark room names")
    parser.add_argument("--sample-file", default="vi_sample_16k.pcm", help="Path to 16kHz 16-bit mono PCM file")
    parser.add_argument("--chunk-size-bytes", type=int, default=11200, help="PCM frame chunk size in bytes (350ms)")
    parser.add_argument("--chunk-interval", type=float, default=0.35, help="Interval between audio frames in seconds")
    parser.add_argument("--source-lang", default="vi", help="Source language")
    parser.add_argument("--target-lang", default="en", help="Target language")
    parser.add_argument("--output-json", default="", help="Optional JSON file path to save benchmark telemetry")

    args = parser.parse_args()
    exit_code = asyncio.run(main_async(args))
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
