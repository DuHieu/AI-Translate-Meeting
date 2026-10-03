#!/usr/bin/env bash
set -Eeuo pipefail

# ==============================================================================
# AI-Translate-Meeting: Database Backup Script (Linux Bash)
# Creates a compressed PostgreSQL dump (.sql.gz) with owner-only (0600) permissions.
# Zero password or secret values are echoed to stdout or logs.
# ==============================================================================

CONTAINER_NAME="${1:-}"
DATABASE="${2:-${POSTGRES_DB:-ai_translate_meeting}}"
USER="${3:-${POSTGRES_USER:-postgres}}"
BACKUP_DIR="${4:-}"
OUTPUT_FILE="${5:-}"

# Auto-detect container name if not provided
if [[ -z "$CONTAINER_NAME" ]]; then
  if docker ps --format '{{.Names}}' | grep -q 'ai-translate-meeting-production-postgres-1'; then
    CONTAINER_NAME="ai-translate-meeting-production-postgres-1"
  elif docker ps --format '{{.Names}}' | grep -q 'ai_translate_postgres'; then
    CONTAINER_NAME="ai_translate_postgres"
  elif docker ps --format '{{.Names}}' | grep -q 'postgres'; then
    CONTAINER_NAME="$(docker ps --format '{{.Names}}' | grep 'postgres' | head -n 1)"
  else
    CONTAINER_NAME="ai_translate_postgres"
  fi
fi

# Validate identifiers
if [[ ! "$DATABASE" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
  echo "Error: Database name must be a valid PostgreSQL identifier." >&2
  exit 1
fi

if [[ ! "$USER" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
  echo "Error: User name must be a valid PostgreSQL identifier." >&2
  exit 1
fi

# Determine backup directory
if [[ -z "$BACKUP_DIR" ]]; then
  if [[ -d "/opt/ai-translate-meeting/shared/backups" ]]; then
    BACKUP_DIR="/opt/ai-translate-meeting/shared/backups"
  elif [[ -d "shared/backups" ]]; then
    BACKUP_DIR="shared/backups"
  elif [[ -d "backups" ]]; then
    BACKUP_DIR="backups"
  else
    BACKUP_DIR="./backups"
  fi
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
if [[ -z "$OUTPUT_FILE" ]]; then
  OUTPUT_FILE="${BACKUP_DIR}/${DATABASE}_backup_${TIMESTAMP}.sql.gz"
fi

echo "==> Starting database backup..."
echo "    Container : $CONTAINER_NAME"
echo "    Database  : $DATABASE"
echo "    User      : $USER"
echo "    Output    : $OUTPUT_FILE"

# Check if container is running
IS_RUNNING="$(docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null || echo "false")"
if [[ "$IS_RUNNING" != "true" ]]; then
  echo "Error: Docker container '$CONTAINER_NAME' is not running." >&2
  exit 1
fi

cleanup_on_error() {
  local exit_code=$?
  if [[ -f "$OUTPUT_FILE" ]]; then
    rm -f "$OUTPUT_FILE"
  fi
  echo "Database backup failed. Cleaned up partial files." >&2
  exit "$exit_code"
}
trap cleanup_on_error ERR

# Execute pg_dump and compress
# Variables are expanded inside container or passed safely
docker exec "$CONTAINER_NAME" pg_dump -U "$USER" -d "$DATABASE" --clean --if-exists | gzip -9 > "$OUTPUT_FILE"

# Verify non-empty
if [[ ! -s "$OUTPUT_FILE" ]]; then
  rm -f "$OUTPUT_FILE"
  echo "Error: Backup file is empty (0 bytes). Check database connection or permissions." >&2
  exit 1
fi

# Lock down permissions (0600)
chmod 600 "$OUTPUT_FILE"

FILE_SIZE_KB="$(du -k "$OUTPUT_FILE" | cut -f1)"
echo "==> Backup completed successfully!"
echo "    File size: ${FILE_SIZE_KB} KB"
echo "    Path     : $OUTPUT_FILE"

trap - ERR
exit 0
