#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ENV_FILE="${ENV_FILE:-.env.ci}"
docker compose -f docker-compose.yml -f docker-compose.e2e.yml --env-file "$ENV_FILE" down -v --remove-orphans || true
