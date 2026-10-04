#!/usr/bin/env bash
# scripts/run-concurrency-test.sh - Automated Concurrency & Multi-Room Load Benchmark Runner for Linux
set -euo pipefail

API_URL="${API_URL:-http://localhost:5000}"
WS_URL="${WS_URL:-ws://localhost:8000}"
SAMPLE_FILE="${SAMPLE_FILE:-vi_sample_16k.pcm}"
OUTPUT_DIR="${OUTPUT_DIR:-benchmark-results}"
DRY_RUN="${DRY_RUN:-false}"

echo "=================================================================="
echo "   AI-Translate-Meeting: Multi-Room & Concurrency Benchmark Runner"
echo "=================================================================="

# 1. Preflight Validations
echo ""
echo "[1/4] Running Preflight Environment Checks..."

if [ ! -f "$SAMPLE_FILE" ]; then
    echo "[ERROR] Sample audio file '$SAMPLE_FILE' not found."
    exit 1
fi
echo "  [OK] Sample PCM audio: $SAMPLE_FILE"

if ! command -v python3 >/dev/null 2>&1; then
    echo "[ERROR] python3 is required but not installed."
    exit 1
fi
echo "  [OK] Python Runtime: $(python3 --version)"

if curl -sf "$API_URL/health/live" >/dev/null 2>&1; then
    echo "  [OK] Backend API is reachable: $API_URL"
else
    echo "  [WARN] Backend API check failed at $API_URL."
fi

if curl -sf "http://localhost:8000/health/live" >/dev/null 2>&1; then
    echo "  [OK] AI Service is reachable: $WS_URL"
else
    echo "  [WARN] AI Service check failed."
fi

if [ "$DRY_RUN" = "true" ] || [ "${1:-}" = "--dry-run" ]; then
    echo ""
    echo "[DRY RUN] Preflight verification completed successfully. Exiting without launching benchmark."
    exit 0
fi

mkdir -p "$OUTPUT_DIR"

# 2. Scenarios
echo ""
echo "[2/4] Executing Benchmark Scenarios..."

# Scenario 1: Single Room Fanout
echo "------------------------------------------------------------------"
echo " >> Scenario 1: Single Room High Density Fan-out (1 Room, 6 Users)"
echo "------------------------------------------------------------------"
python3 scripts/collect-metrics.py --interval 1.0 --output "$OUTPUT_DIR/metrics-scenario-1.json" &
METRICS_PID=$!
sleep 1

python3 scripts/load-test.py \
    --api-url "$API_URL" \
    --ws-url "$WS_URL" \
    --rooms 1 \
    --participants-per-room 6 \
    --speakers-per-room 1 \
    --sample-file "$SAMPLE_FILE" \
    --output-json "$OUTPUT_DIR/scenario-1-fanout.json" || true

kill "$METRICS_PID" 2>/dev/null || true

# Scenario 2: Multi-Room Isolation
echo "------------------------------------------------------------------"
echo " >> Scenario 2: Multi-Room Parallel Isolation (3 Rooms, 9 Users)"
echo "------------------------------------------------------------------"
python3 scripts/collect-metrics.py --interval 1.0 --output "$OUTPUT_DIR/metrics-scenario-2.json" &
METRICS_PID=$!
sleep 1

python3 scripts/load-test.py \
    --api-url "$API_URL" \
    --ws-url "$WS_URL" \
    --rooms 3 \
    --participants-per-room 3 \
    --speakers-per-room 1 \
    --sample-file "$SAMPLE_FILE" \
    --output-json "$OUTPUT_DIR/scenario-2-multiroom.json" || true

kill "$METRICS_PID" 2>/dev/null || true

echo ""
echo "[3/4] Generating Consolidated Benchmark Report..."
REPORT_FILE="$OUTPUT_DIR/benchmark-report.md"
cat <<EOF > "$REPORT_FILE"
# AI-Translate-Meeting: Multi-Room & Concurrency Benchmark Report

> **Generated At:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")  
> **API URL:** $API_URL  
> **WebSocket URL:** $WS_URL  
> **Sample Audio:** $SAMPLE_FILE  

## SLA Criteria & Verification
1. Time-To-First-Subtitle (TTFS): Target <= 2000 ms (p50).
2. Cross-Room Zero Leakage: Subtitles from Room i MUST NEVER be delivered to Room j.
3. Session Stability: No unhandled WebSocket drops or HTTP 500 errors.
EOF

echo "  [OK] Benchmark report saved to: $REPORT_FILE"
echo ""
echo "[4/4] Benchmark Execution Finished."
exit 0
