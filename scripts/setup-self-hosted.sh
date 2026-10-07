#!/usr/bin/env bash
set -Eeuo pipefail

# ==============================================================================
# AI-Translate-Meeting: Turnkey Self-Hosted Setup & Installation Tool
# Automates preflight, secret generation, deployment, migrations, and readiness checks
# for Ubuntu 24.04 / Debian on VPS or on-premise hardware.
# NEVER outputs secret values or credentials to the terminal or logs.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"

APP_DOMAIN=""
LIVEKIT_DOMAIN=""
PRIMARY_DOMAIN=""
PROFILE="pilot"
IMAGE_TAG="latest"
IMAGE_NAMESPACE="${VIMEET_IMAGE_NAMESPACE:-duhieu}"
INSTALL_DIR="/opt/ai-translate-meeting"
HOST_KEY=""
LICENSE_KEY=""
SSL_MODE="letsencrypt"
ACME_EMAIL=""
NON_INTERACTIVE=0
SKIP_DOCKER_INSTALL=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

if [[ ! -t 1 ]]; then
  RED=''
  GREEN=''
  YELLOW=''
  BLUE=''
  CYAN=''
  NC=''
fi

log_info() { printf "%b[INFO]%b %s\n" "$BLUE" "$NC" "$1"; }
log_ok() { printf "%b[OK]%b %s\n" "$GREEN" "$NC" "$1"; }
log_warn() { printf "%b[WARN]%b %s\n" "$YELLOW" "$NC" "$1"; }
log_fail() { printf "%b[FAIL]%b %s\n" "$RED" "$NC" "$1" >&2; }

show_help() {
  cat <<'EOF'
Usage: ./scripts/setup-self-hosted.sh [OPTIONS]

Turnkey self-hosted installer for AI-Translate-Meeting on Ubuntu 24.04 / Debian.

Options:
  --domain <domain>             Public Web domain; derives LiveKit as rtc.<domain>
  --app-domain <domain>         Public domain for Web UI & API (e.g. meet.example.com)
  --livekit-domain <domain>     Public domain for LiveKit signaling (e.g. rtc.example.com)
  --ssl-mode <mode>             TLS mode: letsencrypt or self-signed (default: letsencrypt)
  --email <email>               Optional ACME contact email for Let's Encrypt
  --profile <pilot|business>    Deployment profile (pilot: 4 vCPU/8 GB RAM, business: 8 vCPU/16 GB RAM)
  --image-tag <tag>             Immutable container image tag or commit SHA (default: latest)
  --image-namespace <owner>     GHCR owner/namespace (default: duhieu)
  --install-dir <path>          Destination directory (default: /opt/ai-translate-meeting)
  --host-key <key>              Optional enterprise host authorization key
  --license-key <key>           Optional commercial enterprise license key
  --skip-docker-install         Do not attempt to auto-install Docker if missing
  --non-interactive             Run without interactive prompts (uses CLI arguments)
  -h, --help                    Show this help message
EOF
}

require_value() {
  local option="$1"
  local value="${2:-}"
  if [[ -z "$value" || "$value" == --* ]]; then
    log_fail "$option requires a value."
    exit 1
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      require_value "$1" "${2:-}"
      PRIMARY_DOMAIN="$2"
      shift 2
      ;;
    --app-domain)
      require_value "$1" "${2:-}"
      APP_DOMAIN="$2"
      shift 2
      ;;
    --livekit-domain)
      require_value "$1" "${2:-}"
      LIVEKIT_DOMAIN="$2"
      shift 2
      ;;
    --ssl-mode)
      require_value "$1" "${2:-}"
      SSL_MODE="$2"
      shift 2
      ;;
    --email)
      require_value "$1" "${2:-}"
      ACME_EMAIL="$2"
      shift 2
      ;;
    --profile)
      require_value "$1" "${2:-}"
      PROFILE="$2"
      shift 2
      ;;
    --image-tag)
      require_value "$1" "${2:-}"
      IMAGE_TAG="$2"
      shift 2
      ;;
    --image-namespace)
      require_value "$1" "${2:-}"
      IMAGE_NAMESPACE="${2,,}"
      shift 2
      ;;
    --install-dir)
      require_value "$1" "${2:-}"
      INSTALL_DIR="$2"
      shift 2
      ;;
    --host-key)
      require_value "$1" "${2:-}"
      HOST_KEY="$2"
      shift 2
      ;;
    --license-key)
      require_value "$1" "${2:-}"
      LICENSE_KEY="$2"
      shift 2
      ;;
    --skip-docker-install)
      SKIP_DOCKER_INSTALL=1
      shift
      ;;
    --non-interactive)
      NON_INTERACTIVE=1
      shift
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

if [[ -n "$PRIMARY_DOMAIN" ]]; then
  if [[ -n "$APP_DOMAIN" && "$APP_DOMAIN" != "$PRIMARY_DOMAIN" ]]; then
    log_fail "--domain and --app-domain cannot specify different hostnames."
    exit 1
  fi
  APP_DOMAIN="$PRIMARY_DOMAIN"
  LIVEKIT_DOMAIN="${LIVEKIT_DOMAIN:-rtc.$PRIMARY_DOMAIN}"
fi

echo -e "${CYAN}"
cat <<'BANNER'
==============================================================================
    _    ___     _____                    _       _         __  __           _   _             
   / \  |_ _|   |_   _| __ __ _ _ __  ___| | __ _| |_ ___  |  \/  | ___  ___| |_(_)_ __   __ _ 
  / _ \  | | _____| || '__/ _` | '_ \/ __| |/ _` | __/ _ \ | |\/| |/ _ \/ _ \ __| | '_ \ / _` |
 / ___ \ | ||_____| || | | (_| | | | \__ \ | (_| | ||  __/ | |  | |  __/  __/ |_| | | | | (_| |
/_/   \_\___|     |_||_|  \__,_|_| |_|___/_|\__,_|\__\___| |_|  |_|\___|\___|\__|_|_| |_|\__, |
                                                                                          |___/ 
             Private Bilingual AI Meeting Workspace - Self-Hosted Setup
==============================================================================
BANNER
echo -e "${NC}"

# 1. Privileges check
if [[ $EUID -ne 0 ]] && ! command -v sudo >/dev/null 2>&1; then
  log_fail "This installation script requires root privileges or sudo."
  exit 1
fi

SUDO=""
if [[ $EUID -ne 0 ]]; then
  SUDO="sudo"
fi

# 2. Interactive Prompts (if interactive mode)
if [[ "$NON_INTERACTIVE" -eq 0 ]]; then
  if [[ -z "$APP_DOMAIN" ]]; then
    read -r -p "Enter public App Domain (e.g., meet.example.com): " APP_DOMAIN
  fi
  if [[ -z "$LIVEKIT_DOMAIN" ]]; then
    read -r -p "Enter public LiveKit Domain (e.g., rtc.example.com): " LIVEKIT_DOMAIN
  fi
  if [[ -z "$PROFILE" ]]; then
    read -r -p "Select Deployment Profile [pilot / business] (default: pilot): " PROFILE
    PROFILE="${PROFILE:-pilot}"
  fi
fi

if [[ -z "$APP_DOMAIN" || -z "$LIVEKIT_DOMAIN" ]]; then
  log_fail "APP_DOMAIN and LIVEKIT_DOMAIN are mandatory."
  exit 1
fi

validate_domain() {
  local domain="$1"
  local label
  [[ ${#domain} -le 253 && "$domain" != *".."* ]] || return 1
  IFS='.' read -r -a labels <<< "$domain"
  (( ${#labels[@]} >= 2 )) || return 1
  for label in "${labels[@]}"; do
    [[ ${#label} -ge 1 && ${#label} -le 63 ]] || return 1
    [[ "$label" =~ ^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$ ]] || return 1
  done
}

if ! validate_domain "$APP_DOMAIN"; then
  log_fail "Invalid app domain: use a plain DNS hostname without scheme, port, or path."
  exit 1
fi

if ! validate_domain "$LIVEKIT_DOMAIN"; then
  log_fail "Invalid LiveKit domain: use a plain DNS hostname without scheme, port, or path."
  exit 1
fi

if [[ "$APP_DOMAIN" == "$LIVEKIT_DOMAIN" ]]; then
  log_fail "App and LiveKit domains must be different hostnames."
  exit 1
fi

if [[ "$PROFILE" != "pilot" && "$PROFILE" != "business" ]]; then
  log_fail "Profile must be 'pilot' or 'business' (got: $PROFILE)"
  exit 1
fi

if [[ "$SSL_MODE" != "letsencrypt" && "$SSL_MODE" != "self-signed" ]]; then
  log_fail "SSL mode must be 'letsencrypt' or 'self-signed' (got: $SSL_MODE)"
  exit 1
fi

if [[ ! "$IMAGE_NAMESPACE" =~ ^[a-z0-9][a-z0-9._-]*$ ]]; then
  log_fail "Invalid GHCR image namespace: $IMAGE_NAMESPACE"
  exit 1
fi

if [[ -n "$ACME_EMAIL" && ! "$ACME_EMAIL" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
  log_fail "Invalid ACME contact email."
  exit 1
fi

for required_command in curl awk sed; do
  if ! command -v "$required_command" >/dev/null 2>&1; then
    log_fail "Required command is missing: $required_command"
    exit 1
  fi
done

if [[ "$SSL_MODE" == "self-signed" ]]; then
  log_warn "Using Caddy's internal CA. Browsers will warn until its root certificate is trusted."
fi

# 3. Docker runtime verification & auto-installation
log_info "Step 1/8: Checking Docker runtime environment..."
if ! command -v docker >/dev/null 2>&1; then
  if [[ "$SKIP_DOCKER_INSTALL" -eq 1 ]]; then
    log_fail "Docker is not installed and --skip-docker-install was specified."
    exit 1
  fi
  log_warn "Docker not detected. Installing Docker CE via official installation script..."
  curl -fsSL https://get.docker.com | $SUDO sh
  $SUDO systemctl enable --now docker
  log_ok "Docker installed successfully."
else
  log_ok "Docker Engine found: $(docker --version)"
fi

if ! docker compose version >/dev/null 2>&1; then
  log_fail "Docker Compose v2 plugin is missing. Please install docker-compose-plugin."
  exit 1
fi
log_ok "Docker Compose found: $(docker compose version)"

# 4. Directory Structure
log_info "Step 2/8: Setting up directories at $INSTALL_DIR..."
$SUDO mkdir -p "$INSTALL_DIR"/{releases,shared,shared/backups}
$SUDO chmod 755 "$INSTALL_DIR"
$SUDO chmod 700 "$INSTALL_DIR/shared"

# 5. Configuration Generation with Cryptographic Secrets
log_info "Step 3/8: Generating cryptographically secure configuration ($PROFILE profile)..."
ENV_FILE="$INSTALL_DIR/shared/.env.production"

if [[ ! -f "$ENV_FILE" ]]; then
  bash "$REPO_ROOT/scripts/generate-config.sh" \
    --app-domain "$APP_DOMAIN" \
    --livekit-domain "$LIVEKIT_DOMAIN" \
    --profile "$PROFILE" \
    --image-tag "$IMAGE_TAG" \
    --output "$ENV_FILE"

  $SUDO sed -i \
    -e "s|^API_IMAGE=.*|API_IMAGE=ghcr.io/$IMAGE_NAMESPACE/ai-translate-meeting-api|" \
    -e "s|^AI_SERVICE_IMAGE=.*|AI_SERVICE_IMAGE=ghcr.io/$IMAGE_NAMESPACE/ai-translate-meeting-ai-service|" \
    -e "s|^LAYA_IMAGE=.*|LAYA_IMAGE=ghcr.io/$IMAGE_NAMESPACE/ai-translate-meeting-laya|" \
    -e "s|^WEB_IMAGE=.*|WEB_IMAGE=ghcr.io/$IMAGE_NAMESPACE/ai-translate-meeting-web|" \
    "$ENV_FILE"

  if [[ -n "$HOST_KEY" ]]; then
    printf "HOST_SECURITY_KEY=%s\n" "$HOST_KEY" >> "$ENV_FILE"
  fi

  if [[ -n "$LICENSE_KEY" ]]; then
    printf "LICENSE_KEY=%s\n" "$LICENSE_KEY" >> "$ENV_FILE"
  fi

  $SUDO chmod 600 "$ENV_FILE"
  log_ok "Configuration generated at $ENV_FILE (permissions: 0600)."
else
  log_ok "Existing configuration preserved at $ENV_FILE."
fi

# 6. Copy Release Manifests
log_info "Step 4/8: Packaging release manifests..."
RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)"
RELEASE_DIR="$INSTALL_DIR/releases/$RELEASE_ID"
$SUDO mkdir -p "$RELEASE_DIR"

$SUDO cp "$REPO_ROOT/docker-compose.production.yml" "$RELEASE_DIR/"
$SUDO sed -i 's/pull_policy: always/pull_policy: if_not_present/g' "$RELEASE_DIR/docker-compose.production.yml"
$SUDO cp -r "$REPO_ROOT/infra" "$RELEASE_DIR/"
$SUDO cp -r "$REPO_ROOT/scripts" "$RELEASE_DIR/"
$SUDO cp -r "$REPO_ROOT/config" "$RELEASE_DIR/"
printf "%s\n" "$IMAGE_TAG" | $SUDO tee "$RELEASE_DIR/.image-tag" >/dev/null

CADDYFILE="$RELEASE_DIR/infra/caddy/Caddyfile"
CADDYFILE_TMP="$RELEASE_DIR/infra/caddy/Caddyfile.tmp"
if [[ "$SSL_MODE" == "self-signed" ]]; then
  awk '
    /^\{\$APP_DOMAIN\} \{/ || /^\{\$LIVEKIT_DOMAIN\} \{/ {
      print
      print "\ttls internal"
      next
    }
    { print }
  ' "$CADDYFILE" | $SUDO tee "$CADDYFILE_TMP" >/dev/null
  $SUDO mv "$CADDYFILE_TMP" "$CADDYFILE"
  log_ok "Configured staging TLS with Caddy internal self-signed certificates."
else
  {
    printf "{\n\tacme_ca https://acme-v02.api.letsencrypt.org/directory\n"
    if [[ -n "$ACME_EMAIL" ]]; then
      printf "\temail %s\n" "$ACME_EMAIL"
    fi
    printf "}\n\n"
    $SUDO cat "$CADDYFILE"
  } | $SUDO tee "$CADDYFILE_TMP" >/dev/null
  $SUDO mv "$CADDYFILE_TMP" "$CADDYFILE"
  log_ok "Configured automatic Let's Encrypt certificates through Caddy."
fi

$SUDO ln -sfn "$RELEASE_DIR" "$INSTALL_DIR/current"
log_ok "Release packaged at $RELEASE_DIR and linked to $INSTALL_DIR/current."

# 7. Preflight Execution
log_info "Step 5/8: Running comprehensive preflight checks..."
bash "$RELEASE_DIR/scripts/preflight.sh" \
  "$INSTALL_DIR" \
  "$ENV_FILE" \
  "$RELEASE_DIR/docker-compose.production.yml"

log_ok "Preflight verification passed."

# 8. Pull Images, Backup if existing, Run Migrations & Launch
log_info "Step 6/8: Pulling immutable containers & running migrations..."

COMPOSE_CMD="docker compose --project-name ai-translate-meeting-production --env-file $ENV_FILE --file $RELEASE_DIR/docker-compose.production.yml"

# Safety backup if postgres is already running
if $COMPOSE_CMD ps --status running postgres --quiet 2>/dev/null | grep -q .; then
  log_info "Existing database detected; performing pre-upgrade backup..."
  bash "$RELEASE_DIR/scripts/backup-database.sh" "" "" "" "$INSTALL_DIR/shared/backups" || true
fi

# Pull core services
$COMPOSE_CMD pull postgres redis livekit caddy || true

# Run one-shot database migration
log_info "Running one-shot database schema migration..."
$COMPOSE_CMD up -d postgres redis livekit laya
$COMPOSE_CMD --profile tools run --rm migrate
log_ok "Database schema migration applied successfully."

# Start all remaining services
log_info "Starting application services..."
$COMPOSE_CMD up -d api ai-service web caddy

# 9. Wait for Health / Readiness
log_info "Step 7/8: Probing service readiness gates..."
MAX_WAIT=200
READY=0
for i in $(seq 1 $MAX_WAIT); do
  if $COMPOSE_CMD exec -T caddy wget -qO- http://api:5000/health/ready >/dev/null 2>&1 && \
     $COMPOSE_CMD exec -T caddy wget -qO- http://ai-service:8000/health/ready >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 3
done

if [[ "$READY" -eq 1 ]]; then
  log_ok "All backend APIs and AI services are healthy and ready."
  log_info "Running post-deployment smoke test..."
  SMOKE_ARGS=(--domain "$APP_DOMAIN" --livekit-domain "$LIVEKIT_DOMAIN")
  if [[ "$SSL_MODE" == "self-signed" ]]; then
    SMOKE_ARGS+=(--insecure)
  fi
  if ! bash "$RELEASE_DIR/scripts/smoke-test.sh" "${SMOKE_ARGS[@]}"; then
    log_fail "Post-deployment smoke test failed; deployment is not ready for traffic."
    exit 1
  fi
else
  log_fail "Services did not pass readiness within $((MAX_WAIT * 3)) seconds. Check with: $COMPOSE_CMD logs -f"
  exit 1
fi

# 10. Systemd Service Unit Installation
log_info "Step 8/8: Enabling automatic startup on reboot via systemd..."
if [[ -f "$REPO_ROOT/infra/systemd/ai-translate-meeting.service" ]]; then
  $SUDO cp "$REPO_ROOT/infra/systemd/ai-translate-meeting.service" /etc/systemd/system/
  $SUDO systemctl daemon-reload
  $SUDO systemctl enable ai-translate-meeting.service || true
  log_ok "Systemd service 'ai-translate-meeting.service' installed and enabled."
fi

# Run admin bootstrap report
log_info "Generating initial cluster status report..."
bash "$RELEASE_DIR/scripts/bootstrap-admin.sh" "$ENV_FILE" || true


# 11. Final Bootstrap Admin Summary
echo "============================================================"
log_ok "AI-Translate-Meeting deployment completed successfully!"
echo "============================================================"
echo "Public Web Application : https://$APP_DOMAIN"
echo "Public LiveKit Media   : wss://$LIVEKIT_DOMAIN"
echo "TLS Mode               : $SSL_MODE"
echo "Profile Applied        : $PROFILE"
echo "Installation Directory : $INSTALL_DIR"
echo ""
echo "Operational Commands:"
echo "  Check Status   : bash $INSTALL_DIR/current/scripts/bootstrap-admin.sh"
echo "  Backup Database: bash $INSTALL_DIR/current/scripts/backup-database.sh"
echo "  Diagnostics    : bash $INSTALL_DIR/current/scripts/diagnostics.sh"
echo "  View Logs      : docker compose -p ai-translate-meeting-production --env-file $ENV_FILE -f $INSTALL_DIR/current/docker-compose.production.yml logs -f"
echo "  Rollback       : bash $INSTALL_DIR/current/scripts/rollback-production.sh $INSTALL_DIR"
echo "============================================================"

exit 0
