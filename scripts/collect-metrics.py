#!/usr/bin/env python3
"""
Telemetry Collector for AI-Translate-Meeting
Samples container CPU, RAM and I/O metrics in real-time during load & concurrency testing.
Zero external dependencies (uses standard library and docker CLI).
"""

import argparse
import json
import logging
import re
import signal
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Optional

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [METRICS] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("telemetry")


def parse_memory_mb(mem_str: str) -> float:
    """Parses Docker memory strings like '145.7MiB / 7.686GiB' into MB float."""
    match = re.match(r"^([\d.]+)\s*([A-Za-z]+)", mem_str.strip())
    if not match:
        return 0.0
    value, unit = float(match.group(1)), match.group(2).lower()
    if "k" in unit:
        return value / 1024.0
    elif "m" in unit:
        return value
    elif "g" in unit:
        return value * 1024.0
    elif "t" in unit:
        return value * 1024.0 * 1024.0
    elif "b" in unit:
        return value / (1024.0 * 1024.0)
    return value


def parse_cpu_perc(cpu_str: str) -> float:
    """Parses '3.07%' into 3.07 float."""
    try:
        return float(cpu_str.strip().rstrip("%"))
    except ValueError:
        return 0.0


def query_docker_stats(filter_prefix: str = "ai_translate_") -> list[dict[str, Any]]:
    """Runs docker stats once without streaming and returns container metric records."""
    try:
        proc = subprocess.run(
            ["docker", "stats", "--no-stream", "--format", "{{json .}}"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if proc.returncode != 0:
            return []
    except Exception as ex:
        logger.debug("Failed to query docker stats: %s", ex)
        return []

    containers = []
    for line in proc.stdout.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            data = json.loads(line)
            name = data.get("Name", "")
            if filter_prefix and filter_prefix not in name:
                continue

            cpu_val = parse_cpu_perc(data.get("CPUPerc", "0%"))
            mem_usage_str = data.get("MemUsage", "0B / 0B").split("/")[0].strip()
            mem_val_mb = parse_memory_mb(mem_usage_str)
            mem_perc_val = parse_cpu_perc(data.get("MemPerc", "0%"))

            containers.append({
                "name": name,
                "cpu_perc": cpu_val,
                "mem_mb": mem_val_mb,
                "mem_perc": mem_perc_val,
                "pids": data.get("PIDs", "0"),
                "net_io": data.get("NetIO", ""),
            })
        except Exception:
            continue
    return containers


def run_collector(
    interval: float,
    duration: float,
    output_path: Path,
    filter_prefix: str,
    stop_file: Optional[Path] = None,
) -> int:
    samples: list[dict[str, Any]] = []
    stop_requested = False

    def handle_signal(sig, frame):
        nonlocal stop_requested
        stop_requested = True

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    start_time = time.time()
    logger.info("Telemetry collector started (Interval=%.1fs, MaxDuration=%.1fs, Output=%s)",
                interval, duration, output_path)

    while not stop_requested:
        now = time.time()
        elapsed = now - start_time
        if duration > 0 and elapsed >= duration:
            break
        if stop_file and not stop_file.exists():
            logger.info("Stop file removed, ending collection.")
            break

        container_records = query_docker_stats(filter_prefix)
        if container_records:
            samples.append({
                "timestamp": now,
                "elapsed_sec": round(elapsed, 2),
                "containers": container_records,
            })

        time.sleep(interval)

    total_elapsed = time.time() - start_time
    logger.info("Collection completed in %.2fs (%d samples recorded)", total_elapsed, len(samples))

    # Aggregate summaries per container
    summary: dict[str, dict[str, Any]] = {}
    for sample in samples:
        for c in sample["containers"]:
            cname = c["name"]
            if cname not in summary:
                summary[cname] = {
                    "cpu_samples": [],
                    "mem_samples": [],
                }
            summary[cname]["cpu_samples"].append(c["cpu_perc"])
            summary[cname]["mem_samples"].append(c["mem_mb"])

    aggregated = {}
    print("\n" + "=" * 68)
    print("           CONTAINER RESOURCE UTILIZATION SUMMARY")
    print("=" * 68)
    print(f"{'Container Name':<28} {'Avg CPU %':<12} {'Peak CPU %':<12} {'Peak RAM (MB)':<12}")
    print("-" * 68)

    for cname, data in summary.items():
        cpus = data["cpu_samples"]
        mems = data["mem_samples"]
        avg_cpu = sum(cpus) / len(cpus) if cpus else 0.0
        peak_cpu = max(cpus) if cpus else 0.0
        peak_mem = max(mems) if mems else 0.0
        avg_mem = sum(mems) / len(mems) if mems else 0.0

        aggregated[cname] = {
            "avg_cpu_perc": round(avg_cpu, 2),
            "peak_cpu_perc": round(peak_cpu, 2),
            "avg_mem_mb": round(avg_mem, 2),
            "peak_mem_mb": round(peak_mem, 2),
        }
        print(f"{cname:<28} {avg_cpu:>9.2f}% {peak_cpu:>10.2f}% {peak_mem:>11.1f} MB")
    print("=" * 68 + "\n")

    final_report = {
        "start_time": start_time,
        "total_elapsed_sec": round(total_elapsed, 2),
        "total_samples": len(samples),
        "summary": aggregated,
        "timeline": samples,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(final_report, indent=2), encoding="utf-8")
    logger.info("Saved telemetry report to %s", output_path)
    return 0


def main():
    parser = argparse.ArgumentParser(description="Docker Resource Telemetry Collector for AI-Translate-Meeting")
    parser.add_argument("--interval", type=float, default=1.0, help="Sampling interval in seconds")
    parser.add_argument("--duration", type=float, default=0.0, help="Total monitoring duration in seconds (0 = until stopped)")
    parser.add_argument("--output", default="benchmark-results/metrics.json", help="Output path for JSON report")
    parser.add_argument("--filter", default="ai_translate_", help="Container name filter substring")
    parser.add_argument("--stop-file", default="", help="Optional stop indicator file (stops when deleted)")

    args = parser.parse_args()
    stop_file_path = Path(args.stop_file) if args.stop_file else None
    exit_code = run_collector(
        interval=args.interval,
        duration=args.duration,
        output_path=Path(args.output),
        filter_prefix=args.filter,
        stop_file=stop_file_path,
    )
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
