#!/usr/bin/env bash
set -Eeuo pipefail

# ==============================================================================
# AI-Translate-Meeting: Database Restore Script (Linux Bash)
# Restores a PostgreSQL dump (.sql or .sql.gz) into a target database.
# Requires confirmation or '_restore_test' suffix to prevent accidental production overwrite.
# ==============================================================================

BACKUP_FILE="${1:-}"
TARGET_DATABASE="${2:-}"
CONTAINER_NAME="${3:-}"
USER="${4:-${POSTGRES_USER:-postgres}}"
ALLOW_EXISTING=0

for arg in "$@"; do
  if [[ "$arg" == "--allow-existing" ]]; then
    ALLOW_EXISTING=1
  fi
done

if [[ -z "$BACKUP_FILE" || -z "$TARGET_DATABASE" ]]; then
  echo "Usage: $0 <BACKUP_FILE> <TARGET_DATABASE> [CONTAINER_NAME] [USER] [--allow-existing]" >&2
  exit 1
fi

if [[ ! "$TARGET_DATABASE" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
  echo "Error: Target database must be a valid PostgreSQL identifier." >&2
  exit 1
fi

if [[ ! "$USER" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
  echo "Error: User name must be a valid PostgreSQL identifier." >&2
  exit 1
fi

# Guard against accidental overwrite
if [[ ! "$TARGET_DATABASE" =~ _restore_test$ && "$ALLOW_EXISTING" -eq 0 ]]; then
  echo "Error: Refusing to restore into '$TARGET_DATABASE'. Use an isolated database ending in '_restore_test', or pass --allow-existing for an intentional restore." >&2
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Error: Backup file '$BACKUP_FILE' does not exist." >&2
  exit 1
fi

if [[ ! -s "$BACKUP_FILE" ]]; then
  echo "Error: Backup file '$BACKUP_FILE' is empty (0 bytes)." >&2
  exit 1
fi

# Auto-detect container name if empty
if [[ -z "$CONTAINER_NAME" || "$CONTAINER_NAME" == "--allow-existing" ]]; then
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

echo "==> Starting database restore..."
echo "    Backup File    : $BACKUP_FILE"
echo "    Target Database: $TARGET_DATABASE"
echo "    Container      : $CONTAINER_NAME"
echo "    User           : $USER"

IS_RUNNING="$(docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null || echo "false")"
if [[ "$IS_RUNNING" != "true" ]]; then
  echo "Error: Docker container '$CONTAINER_NAME' is not running." >&2
  exit 1
fi

# Create target database if it does not exist
DB_EXISTS="$(docker exec "$CONTAINER_NAME" psql -U "$USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$TARGET_DATABASE'" 2>/dev/null || echo "0")"
if [[ "$DB_EXISTS" != "1" ]]; then
  echo "==> Target database '$TARGET_DATABASE' does not exist. Creating..."
  docker exec "$CONTAINER_NAME" createdb -U "$USER" "$TARGET_DATABASE"
fi

echo "==> Restoring dump into '$TARGET_DATABASE'..."
if [[ "$BACKUP_FILE" =~ \.gz$ ]]; then
  gzip -dc "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$USER" -d "$TARGET_DATABASE" --quiet
else
  cat "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$USER" -d "$TARGET_DATABASE" --quiet
fi

# Verification query
TABLE_COUNT="$(docker exec "$CONTAINER_NAME" psql -U "$USER" -d "$TARGET_DATABASE" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null || echo "0")"
TABLE_COUNT="$(echo "$TABLE_COUNT" | tr -d ' \r\n')"

if [[ "$TABLE_COUNT" -lt 1 ]]; then
  echo "Error: Restore verification failed: no public tables found in '$TARGET_DATABASE'." >&2
  exit 1
fi

echo "==> Restore completed successfully!"
echo "    Target Database: $TARGET_DATABASE"
echo "    Tables restored: $TABLE_COUNT"
exit 0
