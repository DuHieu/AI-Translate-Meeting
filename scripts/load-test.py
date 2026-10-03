#!/usr/bin/env python3
"""
AI-Translate-Meeting: Synthetic Audio Load-Testing & Benchmark Tool
Measures concurrent STT and translation throughput, latency (TTFS p50/p95),
and session stability under simulated speaker workloads.
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
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


class WorkerResult:
    def __init__(self, worker_id: int):
        self.worker_id = worker_id
        self.success = False
        self.error_message: Optional[str] = None
        self.chunks_sent = 0
        self.subtitles_received = 0
        self.ttfs_ms: Optional[float] = None
        self.final_received = False
        self.duration_sec = 0.0


async def run_worker(
    worker_id: int,
    api_url: str,
    ws_url: str,
    meeting_code: str,
    meeting_id: str,
    host_token: str,
    pcm_chunks: list[bytes],
    chunk_interval: float,
    source_lang: str,
    target_lang: str,
) -> WorkerResult:
    result = WorkerResult(worker_id)
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

        # 2. Join meeting to acquire Subtitle JWT
        join_res = await asyncio.to_thread(
            http_post_json,
            f"{api_url}/api/meetings/{meeting_code}/join",
            {
                "displayName": f"LoadSpeaker-{worker_id}",
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
                "participantName": f"LoadSpeaker-{worker_id}",
                "sourceLanguage": source_lang,
                "targetLanguage": target_lang,
            }
            await ws.send(json.dumps(auth_frame))
            ack_raw = await ws.recv()
            ack = json.loads(ack_raw)
            if ack.get("type") != "authenticated":
                raise RuntimeError(f"Authentication failed: {ack}")

            # 5. Background receiver for subtitles
            first_chunk_sent_time: Optional[float] = None
            first_subtitle_time: Optional[float] = None

            async def receive_subtitles():
                nonlocal first_subtitle_time
                try:
                    while True:
                        msg = await ws.recv()
                        if isinstance(msg, str):
                            data = json.loads(msg)
                            if data.get("type") == "subtitle":
                                result.subtitles_received += 1
                                if first_subtitle_time is None and first_chunk_sent_time is not None:
                                    first_subtitle_time = time.monotonic()
                                    result.ttfs_ms = (first_subtitle_time - first_chunk_sent_time) * 1000
                                if data.get("data", {}).get("isFinal"):
                                    result.final_received = True
                except asyncio.CancelledError:
                    pass
                except websockets.exceptions.ConnectionClosed:
                    pass

            recv_task = asyncio.create_task(receive_subtitles())

            # 6. Stream PCM chunks
            first_chunk_sent_time = time.monotonic()
            for chunk in pcm_chunks:
                await ws.send(chunk)
                result.chunks_sent += 1
                await asyncio.sleep(chunk_interval)

            # 7. Grace period to allow STT & translation to complete
            for _ in range(30):
                if result.final_received or result.subtitles_received > 0:
                    break
                await asyncio.sleep(0.2)

            recv_task.cancel()
            await asyncio.gather(recv_task, return_exceptions=True)

        result.success = result.subtitles_received > 0
        if not result.success:
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

    logger.info("Loaded %d bytes (%d chunks of %d bytes, ~%.2fs audio)",
                len(pcm_data), len(chunks), chunk_size, len(chunks) * args.chunk_interval)
    logger.info("Benchmarking target: API=%s, WS=%s, Concurrency=%d",
                args.api_url, args.ws_url, args.concurrency)

    logger.info("Initializing benchmark meeting workspace...")
    create_res = await asyncio.to_thread(
        http_post_json,
        f"{args.api_url}/api/meetings",
        {"name": f"Benchmark-Room-{int(time.time())}"},
    )
    meeting_code = create_res["meetingCode"]
    meeting_id = create_res["meetingId"]
    host_token = create_res["hostToken"]
    logger.info("Meeting initialized: code=%s", meeting_code)

    start_bench = time.monotonic()
    tasks = [
        run_worker(
            worker_id=i + 1,
            api_url=args.api_url,
            ws_url=args.ws_url,
            meeting_code=meeting_code,
            meeting_id=meeting_id,
            host_token=host_token,
            pcm_chunks=chunks,
            chunk_interval=args.chunk_interval,
            source_lang=args.source_lang,
            target_lang=args.target_lang,
        )
        for i in range(args.concurrency)
    ]

    results: list[WorkerResult] = await asyncio.gather(*tasks)
    total_time = time.monotonic() - start_bench

    # Aggregate Analysis
    successful = [r for r in results if r.success]
    failed = [r for r in results if not r.success]
    ttfs_values = [r.ttfs_ms for r in successful if r.ttfs_ms is not None]

    print("\n" + "=" * 65)
    print("        AI-TRANSLATE-MEETING LOAD BENCHMARK RESULTS")
    print("=" * 65)
    print(f"Total Concurrent Workers:     {args.concurrency}")
    print(f"Successful Sessions:          {len(successful)} / {args.concurrency} ({len(successful) / args.concurrency * 100:.1f}%)")
    print(f"Failed Sessions:              {len(failed)}")
    print(f"Total Audio Chunks Streamed:  {sum(r.chunks_sent for r in results)}")
    print(f"Total Subtitles Received:     {sum(r.subtitles_received for r in results)}")
    print(f"Total Benchmark Wall Time:    {total_time:.2f} s")

    if ttfs_values:
        ttfs_p50 = statistics.median(ttfs_values)
        ttfs_min = min(ttfs_values)
        ttfs_max = max(ttfs_values)
        ttfs_p95 = statistics.quantiles(ttfs_values, n=20)[-1] if len(ttfs_values) >= 20 else ttfs_max
        print("-" * 65)
        print(f"Time-To-First-Subtitle (TTFS):")
        print(f"  Min:                       {ttfs_min:.1f} ms")
        print(f"  Median (p50):              {ttfs_p50:.1f} ms")
        print(f"  95th Percentile (p95):     {ttfs_p95:.1f} ms")
        print(f"  Max:                       {ttfs_max:.1f} ms")
        print("-" * 65)

        sla_p50_target = 2000.0
        if ttfs_p50 <= sla_p50_target and len(failed) == 0:
            print(f"[RESULT] SLA PASSED: TTFS p50 ({ttfs_p50:.1f}ms) <= {sla_p50_target:.0f}ms.")
        else:
            print(f"[RESULT] SLA WARNING: TTFS p50 exceeded or sessions failed.")
    else:
        print("[RESULT] FAILED: No TTFS measurements recorded.")

    if failed:
        print("\nFailures:")
        for r in failed:
            print(f"  Worker #{r.worker_id}: {r.error_message}")
        return 1

    return 0


def main():
    parser = argparse.ArgumentParser(description="Synthetic Audio Load-Testing Tool for AI-Translate-Meeting")
    parser.add_argument("--api-url", default="http://localhost:5000", help="Backend API base URL")
    parser.add_argument("--ws-url", default="ws://localhost:8000", help="AI Service WebSocket base URL")
    parser.add_argument("--concurrency", type=int, default=1, help="Concurrent speaker sessions")
    parser.add_argument("--sample-file", default="vi_sample_16k.pcm", help="Path to 16kHz 16-bit mono PCM file")
    parser.add_argument("--chunk-size-bytes", type=int, default=11200, help="PCM frame chunk size in bytes (350ms)")
    parser.add_argument("--chunk-interval", type=float, default=0.35, help="Interval between audio frames in seconds")
    parser.add_argument("--source-lang", default="vi", help="Source language")
    parser.add_argument("--target-lang", default="en", help="Target language")

    args = parser.parse_args()
    exit_code = asyncio.run(main_async(args))
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
