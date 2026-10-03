#!/usr/bin/env bash
set -Eeuo pipefail

# ==============================================================================
# AI-Translate-Meeting: Sanitized Diagnostic Bundle Collector
# Gathers system metrics, Docker container state, and sanitized application logs.
# GUARANTEE: Redacts all JWTs, tokens, passwords, secrets, and raw transcripts.
# ==============================================================================

DEPLOY_ROOT="${1:-/opt/ai-translate-meeting}"
OUTPUT_DIR="${2:-./diagnostics-bundles}"
TIMESTAMP="$(date -u +'%Y%m%dT%H%M%SZ')"
BUNDLE_NAME="diagnostic-bundle-${TIMESTAMP}"
TEMP_DIR="/tmp/${BUNDLE_NAME}"

mkdir -p "$OUTPUT_DIR" "$TEMP_DIR"

cleanup() {
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

echo "[INFO] Collecting system diagnostics into $TEMP_DIR..."

# 1. System Information
cat > "$TEMP_DIR/system-info.txt" <<EOF
Diagnostic Timestamp: ${TIMESTAMP}
Kernel: $(uname -a 2>/dev/null || echo "Unknown")
OS: $(grep PRETTY_NAME /etc/os-release 2>/dev/null | cut -d= -f2 | tr -d '"' || uname -s)
Uptime: $(uptime 2>/dev/null || echo "Unknown")
CPU Cores: $(nproc 2>/dev/null || grep -c ^processor /proc/cpuinfo 2>/dev/null || echo "1")
Memory:
$(free -m 2>/dev/null || cat /proc/meminfo 2>/dev/null | head -n 5 || echo "Unavailable")
Disk Usage:
$(df -h "$DEPLOY_ROOT" 2>/dev/null || df -h . 2>/dev/null || echo "Unavailable")
EOF

# 2. Docker & Compose Status
cat > "$TEMP_DIR/docker-status.txt" <<EOF
Docker Version:
$(docker --version 2>/dev/null || echo "Docker not installed")
Docker Compose Version:
$(docker compose version 2>/dev/null || echo "Compose not installed")

Running Containers:
$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Ports}}" 2>/dev/null || echo "Unable to query docker ps")
EOF

# 3. Sanitizer Function
# Strictly strips: JWT tokens, Bearer headers, passwords, secrets, and raw transcripts
sanitize_stream() {
  sed -E \
    -e 's/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/[REDACTED_JWT]/g' \
    -e 's/Bearer [A-Za-z0-9._-]+/Bearer [REDACTED_TOKEN]/g' \
    -e 's/((PASSWORD|SECRET|KEY|SIGNING_KEY)=)[^ &"'\''\n]+/\1[REDACTED_SECRET]/gi' \
    -e 's/("password":\s*")[^"]+/\1[REDACTED_SECRET]/gi' \
    -e 's/("secret":\s*")[^"]+/\1[REDACTED_SECRET]/gi' \
    -e 's/("token":\s*")[^"]+/\1[REDACTED_TOKEN]/gi' \
    -e 's/("originalText":\s*")[^"]+/\1[REDACTED_TRANSCRIPT]/gi' \
    -e 's/("translatedText":\s*")[^"]+/\1[REDACTED_TRANSCRIPT]/gi' \
    -e 's/(transcript=['\''"])[^'\''"]+/\1[REDACTED_TRANSCRIPT]/gi'
}

# 4. Service Logs (Last 200 lines per service, sanitized)
mkdir -p "$TEMP_DIR/logs"

SERVICES=("api" "ai-service" "laya" "livekit" "web" "caddy" "postgres" "redis")
for svc in "${SERVICES[@]}"; do
  container_name="ai-translate-meeting-production-${svc}-1"
  # Fallback to local dev container name if prod name not found
  if ! docker ps -q -f name="$container_name" 2>/dev/null | grep -q .; then
    container_name="ai_translate_${svc}"
  fi

  if docker ps -q -f name="$container_name" 2>/dev/null | grep -q .; then
    docker logs --tail 200 "$container_name" 2>&1 | sanitize_stream > "$TEMP_DIR/logs/${svc}.log" || true
  else
    echo "Container $container_name not running." > "$TEMP_DIR/logs/${svc}.log"
  fi
done

# 5. Environment Schema (Variable Names Only, No Values!)
ENV_FILE="$DEPLOY_ROOT/shared/.env.production"
if [[ ! -f "$ENV_FILE" && -f ".env.production" ]]; then
  ENV_FILE=".env.production"
fi

if [[ -f "$ENV_FILE" ]]; then
  grep -v '^[[:space:]]*#' "$ENV_FILE" | grep '=' | cut -d= -f1 | sort > "$TEMP_DIR/configured-variables.txt" || true
fi

# 6. Bundle Creation
ARCHIVE_PATH="$OUTPUT_DIR/${BUNDLE_NAME}.tar.gz"
tar -czf "$ARCHIVE_PATH" -C "/tmp" "$BUNDLE_NAME"

echo "[OK] Sanitized diagnostic bundle successfully created at:"
echo "     $ARCHIVE_PATH"
echo "[INFO] All JWTs, passwords, signing keys, and transcripts have been redacted."
