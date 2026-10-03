#!/usr/bin/env bash
set -Eeuo pipefail

deploy_root="${1:-/opt/ai-translate-meeting}"
deploy_root="$(cd "$deploy_root" && pwd -P)"
env_file="$deploy_root/shared/.env.production"
project_name="ai-translate-meeting-production"

if [[ ! -L "$deploy_root/previous" ]]; then
  echo "No previous release is available." >&2
  exit 2
fi

target_release="$(readlink -f "$deploy_root/previous")"
case "$target_release" in
  "$deploy_root"/releases/*) ;;
  *) echo "Previous release points outside the deployment root." >&2; exit 2 ;;
esac

image_tag="$(tr -d '\r\n' < "$target_release/.image-tag")"
if [[ ! "$image_tag" =~ ^[A-Za-z0-9._-]{7,128}$ ]]; then
  echo "Previous release has an invalid image tag." >&2
  exit 2
fi

compose_file="$target_release/docker-compose.production.yml"
compose() {
  IMAGE_TAG="$image_tag" docker compose \
    --project-name "$project_name" \
    --env-file "$env_file" \
    --file "$compose_file" \
    "$@"
}

compose config -q
compose pull api ai-service laya web
compose up -d postgres redis livekit laya api ai-service web caddy

for _ in $(seq 1 60); do
  if compose exec -T caddy wget -qO- http://api:5000/health/ready >/dev/null 2>&1 \
    && compose exec -T caddy wget -qO- http://ai-service:8000/health/ready >/dev/null 2>&1; then
    old_current=""
    if [[ -L "$deploy_root/current" ]]; then
      old_current="$(readlink -f "$deploy_root/current")"
    fi
    ln -sfn "$target_release" "$deploy_root/current"
    if [[ -n "$old_current" ]]; then
      ln -sfn "$old_current" "$deploy_root/previous"
    fi
    echo "Rollback completed with image tag $image_tag."
    exit 0
  fi
  sleep 5
done

echo "Rollback services did not become ready." >&2
exit 1
