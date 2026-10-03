#!/usr/bin/env bash
set -Eeuo pipefail

# ==============================================================================
# AI-Translate-Meeting: Safe Production Configuration Generator
# Automatically provisions isolated cryptographic secrets without echoing to stdout.
# Enforces file ownership mode 0600.
# ==============================================================================

APP_DOMAIN=""
LIVEKIT_DOMAIN=""
PROFILE="pilot"
IMAGE_TAG=""
OUTPUT_FILE=""

show_help() {
  cat <<'EOF'
Usage: ./scripts/generate-config.sh [OPTIONS]

Options:
  --app-domain <domain>        Public domain for Web UI & API (e.g. meet.example.com)
  --livekit-domain <domain>    Public domain for LiveKit signaling (e.g. rtc.example.com)
  --profile <pilot|business>   Configuration profile to apply (default: pilot)
  --image-tag <tag>            Immutable image tag / Git commit SHA
  --output <file>              Destination path (default: shared/.env.production or .env.production)
  -h, --help                   Display this help message
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-domain)
      APP_DOMAIN="$2"
      shift 2
      ;;
    --livekit-domain)
      LIVEKIT_DOMAIN="$2"
      shift 2
      ;;
    --profile)
      PROFILE="$2"
      shift 2
      ;;
    --image-tag)
      IMAGE_TAG="$2"
      shift 2
      ;;
    --output)
      OUTPUT_FILE="$2"
      shift 2
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      show_help
      exit 1
      ;;
  esac
done

# Defaults
if [[ -z "$OUTPUT_FILE" ]]; then
  if [[ -d "/opt/ai-translate-meeting/shared" ]]; then
    OUTPUT_FILE="/opt/ai-translate-meeting/shared/.env.production"
  elif [[ -d "shared" ]]; then
    OUTPUT_FILE="shared/.env.production"
  else
    OUTPUT_FILE=".env.production"
  fi
fi

if [[ -z "$APP_DOMAIN" ]]; then
  APP_DOMAIN="meet.example.com"
fi

if [[ -z "$LIVEKIT_DOMAIN" ]]; then
  LIVEKIT_DOMAIN="rtc.example.com"
fi

if [[ -z "$IMAGE_TAG" ]]; then
  IMAGE_TAG="latest"
fi

if [[ "$PROFILE" != "pilot" && "$PROFILE" != "business" ]]; then
  echo "Error: Profile must be either 'pilot' or 'business' (got: $PROFILE)" >&2
  exit 1
fi

# Cryptographically strong secret generator (>= 48 characters)
generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 48 | tr -dc 'A-Za-z0-9_-' | head -c 48
  else
    head -c 64 /dev/urandom | tr -dc 'A-Za-z0-9_-' | head -c 48
  fi
}

generate_api_key() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 12
  else
    head -c 24 /dev/urandom | tr -dc 'a-f0-9' | head -c 24
  fi
}

# Generate 6 strictly distinct secrets
PG_PASS=$(generate_secret)
LK_KEY=$(generate_api_key)
LK_SECRET=$(generate_secret)
SUB_KEY=$(generate_secret)
ADM_KEY=$(generate_secret)
SES_KEY=$(generate_secret)

# Sizing & model variables based on chosen profile
if [[ "$PROFILE" == "pilot" ]]; then
  WHISPER_MODEL="tiny"
  LAYA_ENABLED="false"
  AI_MODEL_START_PERIOD="180s"
  DATABASE_CLEANUP_INTERVAL_HOURS="2"
else
  WHISPER_MODEL="small"
  LAYA_ENABLED="true"
  AI_MODEL_START_PERIOD="300s"
  DATABASE_CLEANUP_INTERVAL_HOURS="1"
fi

# Ensure parent directory exists
out_dir="$(dirname "$OUTPUT_FILE")"
mkdir -p "$out_dir"

# Write configuration atomically with restricted permissions
tmp_file="${OUTPUT_FILE}.tmp.$$"
# Set umask so file is created as 0600 from the start
(
  umask 077
  cat > "$tmp_file" <<EOF
# ==============================================================================
# AI-Translate-Meeting: Self-Hosted Production Configuration
# Profile: ${PROFILE} (Generated on $(date -u +'%Y-%m-%dT%H:%M:%SZ'))
# Owner-only read/write (0600). Do NOT commit this file to Git.
# ==============================================================================

# Public DNS hostnames
APP_DOMAIN=${APP_DOMAIN}
LIVEKIT_DOMAIN=${LIVEKIT_DOMAIN}

# Container Images
API_IMAGE=ghcr.io/owner/ai-translate-meeting-api
AI_SERVICE_IMAGE=ghcr.io/owner/ai-translate-meeting-ai-service
LAYA_IMAGE=ghcr.io/owner/ai-translate-meeting-laya
WEB_IMAGE=ghcr.io/owner/ai-translate-meeting-web
IMAGE_TAG=${IMAGE_TAG}

# PostgreSQL Database
POSTGRES_DB=ai_translate_meeting
POSTGRES_USER=ai_translate
POSTGRES_PASSWORD=${PG_PASS}

# LiveKit Media Server
LIVEKIT_API_KEY=${LK_KEY}
LIVEKIT_API_SECRET=${LK_SECRET}
LIVEKIT_TOKEN_TTL_MINUTES=60

# Security Tokens (Each strictly isolated with unique cryptographically random secret)
SUBTITLE_TOKEN_SIGNING_KEY=${SUB_KEY}
SUBTITLE_TOKEN_TTL_MINUTES=10
ADMISSION_TOKEN_SIGNING_KEY=${ADM_KEY}
ADMISSION_HOST_TOKEN_TTL_MINUTES=240
ADMISSION_INVITE_TOKEN_TTL_MINUTES=15
ADMISSION_REQUEST_TOKEN_TTL_MINUTES=15
SESSION_TOKEN_SIGNING_KEY=${SES_KEY}
SESSION_TOKEN_TTL_MINUTES=60

# AI Speech Recognition & Translation (${PROFILE} profile)
WHISPER_MODEL=${WHISPER_MODEL}
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
AI_MODEL_START_PERIOD=${AI_MODEL_START_PERIOD}
LAYA_ENABLED=${LAYA_ENABLED}
WS_MAX_AUDIO_FRAME_BYTES=131072
WS_MAX_TEXT_FRAME_BYTES=16384

# Translation Provider & Cache
CONTEXTUAL_TRANSLATION_ENABLED=true
TRANSLATION_PROVIDER=contextual
TRANSLATION_MODEL=meeting-v1
TRANSLATION_TIMEOUT_MS=1000
TRANSLATION_FALLBACK_PROVIDER=local
TRANSLATION_CACHE_ENABLED=true
TRANSLATION_CACHE_TTL_SECONDS=86400
TRANSLATION_DATASET_COLLECTION_ENABLED=false

# Retention Cleanup
DATABASE_CLEANUP_ENABLED=true
DATABASE_CLEANUP_INTERVAL_HOURS=${DATABASE_CLEANUP_INTERVAL_HOURS}
DATABASE_CLEANUP_RETENTION_HOURS=24
EOF
)

# Apply chmod 600
if [[ "$(uname -s)" != "CYGWIN"* && "$(uname -s)" != "MINGW"* && "$(uname -s)" != "MSYS"* ]]; then
  chmod 600 "$tmp_file"
fi

mv -f "$tmp_file" "$OUTPUT_FILE"

# Zero out variables from shell memory
unset PG_PASS LK_KEY LK_SECRET SUB_KEY ADM_KEY SES_KEY

echo "[OK] Configuration successfully generated for profile '${PROFILE}' at: ${OUTPUT_FILE}"
echo "[OK] Permissions set to 0600 (owner-only). Secrets were securely written without echoing."
echo "[INFO] Run './scripts/preflight.sh' next to verify system readiness."
