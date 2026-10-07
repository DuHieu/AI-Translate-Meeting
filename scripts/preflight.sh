#!/usr/bin/env bash
set -Eeuo pipefail

# ==============================================================================
# AI-Translate-Meeting: Self-Hosted Production Preflight & Diagnostic Tool
# Verifies system readiness, network, ports, configuration, and secret safety.
# NEVER outputs secret values to the terminal or logs.
# ==============================================================================

DEPLOY_ROOT="${1:-/opt/ai-translate-meeting}"
ENV_FILE="${2:-$DEPLOY_ROOT/shared/.env.production}"
COMPOSE_FILE="${3:-docker-compose.production.yml}"

# Color output helpers (when connected to terminal)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [[ ! -t 1 ]]; then
  RED=''
  GREEN=''
  YELLOW=''
  BLUE=''
  NC=''
fi

log_info() { printf "%b[INFO]%b %s\n" "$BLUE" "$NC" "$1"; }
log_ok() { printf "%b[OK]%b %s\n" "$GREEN" "$NC" "$1"; }
log_warn() { printf "%b[WARN]%b %s\n" "$YELLOW" "$NC" "$1"; }
log_fail() { printf "%b[FAIL]%b %s\n" "$RED" "$NC" "$1" >&2; }

show_help() {
  cat <<'EOF'
Usage: ./scripts/preflight.sh [DEPLOY_ROOT] [ENV_FILE] [COMPOSE_FILE]

Performs pre-deployment verification for self-hosted AI-Translate-Meeting.
Exit codes:
  0 - All preflight checks passed.
  2 - Configuration or secret isolation validation failed.
  3 - System resource, network, or port conflict failed.
  1 - General error or missing dependencies.
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  show_help
  exit 0
fi

FAILED=0
WARN_COUNT=0

record_fail() {
  log_fail "$1"
  FAILED=1
}

# ------------------------------------------------------------------------------
# 1. Operating System & Hardware Resources
# ------------------------------------------------------------------------------
log_info "1/7 Checking Operating System & Hardware Resources..."

if [[ -f /etc/os-release ]]; then
  # shellcheck source=/dev/null
  source /etc/os-release
  log_ok "OS detected: ${PRETTY_NAME:-$ID}"
  if [[ "${ID:-}" != "ubuntu" && "${ID_LIKE:-}" != *"ubuntu"* && "${ID_LIKE:-}" != *"debian"* ]]; then
    log_warn "Target OS is recommended to be Ubuntu 24.04 LTS; detected $ID."
    ((WARN_COUNT++)) || true
  fi
else
  log_warn "Unable to detect OS distribution from /etc/os-release."
  ((WARN_COUNT++)) || true
fi

# CPU Cores
CPU_CORES=$(nproc 2>/dev/null || grep -c ^processor /proc/cpuinfo 2>/dev/null || echo 1)
if (( CPU_CORES < 2 )); then
  record_fail "Minimum 2 CPU cores required for pilot (Whisper tiny). Detected: $CPU_CORES cores."
elif (( CPU_CORES < 4 )); then
  log_warn "Detected $CPU_CORES CPU cores. Meets minimum entry for lightweight pilot (2 vCPU), but 4+ vCPU recommended."
  ((WARN_COUNT++)) || true
elif (( CPU_CORES < 8 )); then
  log_warn "Detected $CPU_CORES CPU cores. Sufficient for 'pilot' profile (4 vCPU), but 8+ vCPU recommended for 'business' profile."
  ((WARN_COUNT++)) || true
else
  log_ok "CPU Cores: $CPU_CORES"
fi

# Total RAM (in MB)
if [[ -f /proc/meminfo ]]; then
  TOTAL_MEM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
  TOTAL_MEM_MB=$(( TOTAL_MEM_KB / 1024 ))
  if (( TOTAL_MEM_MB < 7000 )); then
    record_fail "Minimum 8 GB RAM required. Detected: ${TOTAL_MEM_MB} MB."
  elif (( TOTAL_MEM_MB < 15000 )); then
    log_warn "RAM: ${TOTAL_MEM_MB} MB. Meets 'pilot' profile requirement (8 GB), but 16 GB recommended for 'business' profile."
    ((WARN_COUNT++)) || true
  else
    log_ok "Total Memory: ${TOTAL_MEM_MB} MB"
  fi
fi

# Available Disk Space in deployment root or current directory
CHECK_DIR="$DEPLOY_ROOT"
if [[ ! -d "$CHECK_DIR" ]]; then
  CHECK_DIR="$(pwd -P)"
fi
FREE_DISK_MB=$(df -m "$CHECK_DIR" 2>/dev/null | awk 'NR==2 {print $4}' || echo 0)
if (( FREE_DISK_MB < 15000 )); then
  record_fail "Minimum 15 GB free disk space required for Docker images and AI cache. Available: ${FREE_DISK_MB} MB."
else
  log_ok "Free Disk Space: ${FREE_DISK_MB} MB on $CHECK_DIR"
fi

# ------------------------------------------------------------------------------
# 2. Container Runtime Engine & Compose
# ------------------------------------------------------------------------------
log_info "2/7 Checking Container Runtime Engine..."

if ! command -v docker >/dev/null 2>&1; then
  record_fail "Docker Engine is not installed or not in PATH."
else
  DOCKER_VER=$(docker --version 2>/dev/null || true)
  log_ok "Docker Engine found: $DOCKER_VER"
fi

if ! docker compose version >/dev/null 2>&1; then
  record_fail "Docker Compose v2 plugin ('docker compose') is not installed."
else
  COMPOSE_VER=$(docker compose version 2>/dev/null || true)
  log_ok "Docker Compose found: $COMPOSE_VER"
fi

# ------------------------------------------------------------------------------
# 3. Environment & Configuration Integrity
# ------------------------------------------------------------------------------
log_info "3/7 Checking Configuration File & Integrity..."

if [[ ! -f "$ENV_FILE" ]]; then
  log_fail "Environment file not found at: $ENV_FILE"
  log_fail "Run './scripts/generate-config.sh' or copy '.env.production.example' to generate it."
  exit 2
fi

# Check permissions: owner-only read/write recommended (0600)
if [[ "$(uname -s)" != "CYGWIN"* && "$(uname -s)" != "MINGW"* && "$(uname -s)" != "MSYS"* ]]; then
  ENV_PERMS=$(stat -c "%a" "$ENV_FILE" 2>/dev/null || stat -f "%Lp" "$ENV_FILE" 2>/dev/null || echo "")
  if [[ -n "$ENV_PERMS" && "$ENV_PERMS" != "600" && "$ENV_PERMS" != "400" ]]; then
    log_warn "File $ENV_FILE permissions are $ENV_PERMS. Recommended: 600 (chmod 600 $ENV_FILE)."
    ((WARN_COUNT++)) || true
  fi
fi

# Helper to read environment variables without exposing them in commands
read_env() {
  local var_name="$1"
  sed -n "s/^${var_name}=//p" "$ENV_FILE" | tail -n 1 | tr -d '\r'
}

# ------------------------------------------------------------------------------
# 4. Mandatory Environment Variables & Secret Validation (Zero Echo)
# ------------------------------------------------------------------------------
log_info "4/7 Validating Mandatory Variables & Secret Strength..."

CONFIG_ERROR=0

REQUIRED_VARS=(
  "APP_DOMAIN"
  "LIVEKIT_DOMAIN"
  "POSTGRES_DB"
  "POSTGRES_USER"
  "POSTGRES_PASSWORD"
  "LIVEKIT_API_KEY"
  "LIVEKIT_API_SECRET"
  "SUBTITLE_TOKEN_SIGNING_KEY"
  "ADMISSION_TOKEN_SIGNING_KEY"
  "SESSION_TOKEN_SIGNING_KEY"
)

for v in "${REQUIRED_VARS[@]}"; do
  val=$(read_env "$v")
  if [[ -z "$val" ]]; then
    log_fail "Missing mandatory environment variable: $v"
    CONFIG_ERROR=1
  fi
done

APP_DOMAIN_VAL=$(read_env APP_DOMAIN)
LIVEKIT_DOMAIN_VAL=$(read_env LIVEKIT_DOMAIN)

if [[ -n "$APP_DOMAIN_VAL" && ! "$APP_DOMAIN_VAL" =~ ^[A-Za-z0-9.-]+$ ]]; then
  log_fail "APP_DOMAIN is invalid: must be a plain DNS hostname."
  CONFIG_ERROR=1
fi

if [[ -n "$LIVEKIT_DOMAIN_VAL" && ! "$LIVEKIT_DOMAIN_VAL" =~ ^[A-Za-z0-9.-]+$ ]]; then
  log_fail "LIVEKIT_DOMAIN is invalid: must be a plain DNS hostname."
  CONFIG_ERROR=1
fi

# Secret Length Checks (NEVER output secret values!)
check_min_length() {
  local var_name="$1"
  local min_len="$2"
  local val
  val=$(read_env "$var_name")
  local len=${#val}
  if (( len < min_len )); then
    log_fail "Secret $var_name is too short (length: $len, minimum required: $min_len)."
    CONFIG_ERROR=1
  else
    log_ok "$var_name meets minimum length requirement ($min_len chars)."
  fi
}

check_min_length "POSTGRES_PASSWORD" 16
check_min_length "LIVEKIT_API_KEY" 16
check_min_length "LIVEKIT_API_SECRET" 32
check_min_length "SUBTITLE_TOKEN_SIGNING_KEY" 32
check_min_length "ADMISSION_TOKEN_SIGNING_KEY" 32
check_min_length "SESSION_TOKEN_SIGNING_KEY" 32

# Secret Isolation Checks (Keys must NOT be reused across security domains)
check_not_equal() {
  local name1="$1"
  local name2="$2"
  local val1
  local val2
  val1=$(read_env "$name1")
  val2=$(read_env "$name2")
  if [[ -n "$val1" && -n "$val2" && "$val1" == "$val2" ]]; then
    log_fail "Security isolation violation: $name1 and $name2 must NOT have identical values!"
    CONFIG_ERROR=1
  fi
}

check_not_equal "SUBTITLE_TOKEN_SIGNING_KEY" "ADMISSION_TOKEN_SIGNING_KEY"
check_not_equal "SUBTITLE_TOKEN_SIGNING_KEY" "SESSION_TOKEN_SIGNING_KEY"
check_not_equal "ADMISSION_TOKEN_SIGNING_KEY" "SESSION_TOKEN_SIGNING_KEY"
check_not_equal "LIVEKIT_API_SECRET" "SUBTITLE_TOKEN_SIGNING_KEY"
check_not_equal "POSTGRES_PASSWORD" "LIVEKIT_API_SECRET"

if (( CONFIG_ERROR != 0 )); then
  log_fail "Configuration and secret validation failed."
  exit 2
fi

log_ok "All secrets satisfy length and domain isolation constraints."

# ------------------------------------------------------------------------------
# 5. Network, DNS & Port Accessibility
# ------------------------------------------------------------------------------
log_info "5/7 Checking Network, DNS & Port Conflicts..."

# Check DNS resolution
resolve_host() {
  local hostname="$1"
  if command -v getent >/dev/null 2>&1; then
    getent hosts "$hostname" >/dev/null 2>&1
  elif command -v nslookup >/dev/null 2>&1; then
    nslookup "$hostname" >/dev/null 2>&1
  elif command -v ping >/dev/null 2>&1; then
    ping -c 1 -W 2 "$hostname" >/dev/null 2>&1
  else
    # Fallback to python
    python3 -c "import socket; socket.gethostbyname('$hostname')" >/dev/null 2>&1 || true
  fi
}

if [[ -n "$APP_DOMAIN_VAL" ]]; then
  if resolve_host "$APP_DOMAIN_VAL"; then
    log_ok "DNS resolved: $APP_DOMAIN_VAL"
  else
    log_warn "DNS lookup failed for APP_DOMAIN ($APP_DOMAIN_VAL). Ensure DNS A/AAAA records point to this server."
    ((WARN_COUNT++)) || true
  fi
fi

if [[ -n "$LIVEKIT_DOMAIN_VAL" ]]; then
  if resolve_host "$LIVEKIT_DOMAIN_VAL"; then
    log_ok "DNS resolved: $LIVEKIT_DOMAIN_VAL"
  else
    log_warn "DNS lookup failed for LIVEKIT_DOMAIN ($LIVEKIT_DOMAIN_VAL). Ensure DNS A/AAAA records point to this server."
    ((WARN_COUNT++)) || true
  fi
fi

# Check required ports (80, 443, 7881, 7882)
check_port_free() {
  local port="$1"
  local proto="${2:-tcp}"
  local in_use=0
  if command -v ss >/dev/null 2>&1; then
    if ss -lntu | grep -q ":${port} "; then
      in_use=1
    fi
  elif command -v netstat >/dev/null 2>&1; then
    if netstat -lntu 2>/dev/null | grep -q ":${port} "; then
      in_use=1
    fi
  fi

  if (( in_use == 1 )); then
    if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Ports}}' 2>/dev/null | grep -q ":${port}->"; then
      log_warn "Port $port/$proto is currently bound by an existing Docker container (previous deployment)."
      ((WARN_COUNT++)) || true
      return 0
    fi
    record_fail "Port $port/$proto is already in use by another host process."
    return 1
  fi
  log_ok "Port $port/$proto appears available."
  return 0
}

check_port_free 80 "tcp" || true
check_port_free 443 "tcp" || true
check_port_free 7881 "tcp" || true
check_port_free 7882 "udp" || true

# ------------------------------------------------------------------------------
# 6. Docker Compose Configuration Syntax Validation
# ------------------------------------------------------------------------------
log_info "6/7 Validating Production Docker Compose Syntax..."

if [[ ! -f "$COMPOSE_FILE" ]]; then
  if [[ -f "$DEPLOY_ROOT/$COMPOSE_FILE" ]]; then
    COMPOSE_FILE="$DEPLOY_ROOT/$COMPOSE_FILE"
  fi
fi

if [[ -f "$COMPOSE_FILE" ]]; then
  # Run validation
  if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config -q 2>/dev/null; then
    log_ok "Production Docker Compose file is valid."
  else
    record_fail "docker compose config validation failed for $COMPOSE_FILE with $ENV_FILE"
  fi
else
  log_warn "Compose file not found at $COMPOSE_FILE; skipping compose validation."
  ((WARN_COUNT++)) || true
fi

# ------------------------------------------------------------------------------
# 7. Backup Directory & Storage Write Checks
# ------------------------------------------------------------------------------
log_info "7/7 Checking Backup Directory & Storage Permissions..."

BACKUP_DIR="$DEPLOY_ROOT/shared/backups"
if mkdir -p "$BACKUP_DIR" 2>/dev/null; then
  TEST_FILE="$BACKUP_DIR/.preflight_test_$$"
  if touch "$TEST_FILE" 2>/dev/null && rm -f "$TEST_FILE" 2>/dev/null; then
    log_ok "Backup directory is writable: $BACKUP_DIR"
  else
    record_fail "Backup directory is not writable: $BACKUP_DIR"
  fi
else
  record_fail "Cannot create backup directory at: $BACKUP_DIR"
fi

# ------------------------------------------------------------------------------
# Summary & Exit
# ------------------------------------------------------------------------------
echo "============================================================"
if (( FAILED != 0 )); then
  log_fail "Preflight check failed. Please resolve the errors above before deploying."
  exit 3
fi

log_ok "Preflight verification PASSED with $WARN_COUNT warnings."
log_info "The environment is ready for self-hosted deployment."
exit 0
