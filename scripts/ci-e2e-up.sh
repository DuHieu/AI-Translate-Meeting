#!/usr/bin/env bash
# Bring up the full stack for production E2E on CI.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.ci}"
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.e2e.yml --env-file "$ENV_FILE")

echo "[ci-e2e] Using env: $ENV_FILE"
"${COMPOSE[@]}" down -v --remove-orphans || true
"${COMPOSE[@]}" up -d --build postgres redis livekit api ai-service web

echo "[ci-e2e] Waiting for API ready..."
for i in $(seq 1 90); do
  if curl -fsS "http://127.0.0.1:5000/health/ready" >/dev/null 2>&1; then
    echo "[ci-e2e] API ready (${i}s)"
    break
  fi
  if [[ "$i" -eq 90 ]]; then
    echo "[ci-e2e] API failed to become ready" >&2
    "${COMPOSE[@]}" logs --no-color --tail=200 api || true
    exit 1
  fi
  sleep 2
done

echo "[ci-e2e] Waiting for AI ready (Whisper preload may take several minutes)..."
for i in $(seq 1 150); do
  if curl -fsS "http://127.0.0.1:8000/health/ready" >/dev/null 2>&1; then
    echo "[ci-e2e] AI ready (${i}s)"
    break
  fi
  if [[ "$i" -eq 150 ]]; then
    echo "[ci-e2e] AI failed to become ready" >&2
    "${COMPOSE[@]}" logs --no-color --tail=200 ai-service || true
    exit 1
  fi
  sleep 2
done

echo "[ci-e2e] Waiting for Web..."
for i in $(seq 1 60); do
  code="$(curl -sS -o /dev/null -w "%{http_code}" "http://127.0.0.1:3000/" || true)"
  if [[ "$code" == "200" ]]; then
    echo "[ci-e2e] Web ready (${i}s)"
    break
  fi
  if [[ "$i" -eq 60 ]]; then
    echo "[ci-e2e] Web failed to become ready (HTTP $code)" >&2
    "${COMPOSE[@]}" logs --no-color --tail=200 web || true
    exit 1
  fi
  sleep 2
done

echo "[ci-e2e] Stack is up."
"${COMPOSE[@]}" ps
