#!/usr/bin/env bash
set -Eeuo pipefail

image_tag="${1:-}"
deploy_root="${2:-/opt/ai-translate-meeting}"
release_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
env_file="$deploy_root/shared/.env.production"
compose_file="$release_dir/docker-compose.production.yml"
project_name="ai-translate-meeting-production"

if [[ ! "$image_tag" =~ ^[A-Za-z0-9._-]{7,128}$ ]]; then
  echo "Invalid immutable image tag." >&2
  exit 2
fi

deploy_root="$(cd "$deploy_root" && pwd -P)"
case "$release_dir" in
  "$deploy_root"/releases/*) ;;
  *) echo "Release directory must be below $deploy_root/releases." >&2; exit 2 ;;
esac

if [[ ! -f "$env_file" ]]; then
  echo "Missing production environment file: $env_file" >&2
  exit 2
fi

read_env_value() {
  local name="$1"
  sed -n "s/^${name}=//p" "$env_file" | tail -n 1 | tr -d '\r'
}

app_domain="$(read_env_value APP_DOMAIN)"
livekit_domain="$(read_env_value LIVEKIT_DOMAIN)"
if [[ ! "$app_domain" =~ ^[A-Za-z0-9.-]+$ || ! "$livekit_domain" =~ ^[A-Za-z0-9.-]+$ ]]; then
  echo "APP_DOMAIN and LIVEKIT_DOMAIN must be plain DNS hostnames." >&2
  exit 2
fi

compose() {
  IMAGE_TAG="$image_tag" docker compose \
    --project-name "$project_name" \
    --env-file "$env_file" \
    --file "$compose_file" \
    "$@"
}

rollback_on_error() {
  local exit_code=$?
  trap - ERR
  echo "Deployment failed; attempting automatic rollback." >&2
  if [[ -L "$deploy_root/previous" ]]; then
    bash "$release_dir/scripts/rollback-production.sh" "$deploy_root" || true
  else
    echo "No previous release is available; services were left for diagnosis." >&2
  fi
  exit "$exit_code"
}

compose config -q
if [[ -L "$deploy_root/current" ]]; then
  current_target="$(readlink -f "$deploy_root/current")"
  ln -sfn "$current_target" "$deploy_root/previous"
fi
trap rollback_on_error ERR

compose pull postgres redis livekit api ai-service laya web caddy

mkdir -p "$deploy_root/shared/backups"
if compose ps --status running postgres --quiet | grep -q .; then
  backup_file="$deploy_root/shared/backups/predeploy-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
  # Variables are intentionally expanded inside the PostgreSQL container.
  # shellcheck disable=SC2016
  compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip -9 > "$backup_file"
  test -s "$backup_file"
fi

compose up -d postgres redis livekit laya
compose --profile tools run --rm migrate
compose up -d api ai-service web caddy

wait_for_command() {
  local label="$1"
  shift
  for _ in $(seq 1 60); do
    if "$@" >/dev/null 2>&1; then
      echo "$label is ready."
      return 0
    fi
    sleep 5
  done
  echo "$label did not become ready." >&2
  return 1
}

wait_for_command "API" compose exec -T caddy wget -qO- http://api:5000/health/ready
wait_for_command "AI service" compose exec -T caddy wget -qO- http://ai-service:8000/health/ready
wait_for_command "Web HTTPS" curl --fail --silent --show-error "https://$app_domain/"
wait_for_command "LiveKit HTTPS" curl --fail --silent --show-error "https://$livekit_domain/"

printf '%s\n' "$image_tag" > "$release_dir/.image-tag"
ln -sfn "$release_dir" "$deploy_root/current"

trap - ERR
echo "Deployment completed with image tag $image_tag."
