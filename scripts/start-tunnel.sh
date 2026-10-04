#!/usr/bin/env bash
set -Eeuo pipefail

PORT="${PORT:-3000}"

usage() {
  cat <<'EOF'
Usage: PORT=3000 bash scripts/start-tunnel.sh
       bash scripts/start-tunnel.sh [--port <1-65535>]
EOF
}

die() {
  printf '[ViMeet] ERROR: %s\n' "$1" >&2
  exit 1
}

while (($# > 0)); do
  case "$1" in
    --port|--Port|-Port)
      (($# >= 2)) || die "Missing value for $1."
      PORT="$2"
      shift 2
      ;;
    --port=*|--Port=*)
      PORT="${1#*=}"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

[[ "$PORT" =~ ^[0-9]+$ ]] || die "Port must be a number between 1 and 65535."
PORT=$((10#$PORT))
((PORT >= 1 && PORT <= 65535)) || die "Port must be between 1 and 65535."

LOCAL_URL="http://localhost:${PORT}"

command -v curl >/dev/null 2>&1 || die "curl is required to check ViMeet and download cloudflared."

printf '[ViMeet] Checking local service: %s\n' "$LOCAL_URL"
if ! curl --silent --show-error --output /dev/null --connect-timeout 3 --max-time 5 "$LOCAL_URL"; then
  die "No local service is available at ${LOCAL_URL}. Start ViMeet first, then run this script again."
fi

if CLOUDFLARED_PATH="$(command -v cloudflared 2>/dev/null)"; then
  :
else
  case "$(uname -s):$(uname -m)" in
    Linux:x86_64|Linux:amd64)
      asset="cloudflared-linux-amd64"
      archive="false"
      ;;
    Linux:aarch64|Linux:arm64)
      asset="cloudflared-linux-arm64"
      archive="false"
      ;;
    Linux:armv7l|Linux:armv6l)
      asset="cloudflared-linux-arm"
      archive="false"
      ;;
    Linux:i386|Linux:i686)
      asset="cloudflared-linux-386"
      archive="false"
      ;;
    Darwin:x86_64)
      asset="cloudflared-darwin-amd64.tgz"
      archive="true"
      ;;
    Darwin:arm64)
      asset="cloudflared-darwin-arm64.tgz"
      archive="true"
      ;;
    *)
      die "Unsupported platform $(uname -s)/$(uname -m). Install cloudflared manually and add it to PATH."
      ;;
  esac

  install_directory="${XDG_BIN_HOME:-${HOME}/.local/bin}"
  CLOUDFLARED_PATH="${install_directory}/cloudflared"
  mkdir -p "$install_directory"

  if [[ ! -x "$CLOUDFLARED_PATH" ]]; then
    download_url="https://github.com/cloudflare/cloudflared/releases/latest/download/${asset}"
    download_file="$(mktemp "${TMPDIR:-/tmp}/vimeet-cloudflared.XXXXXX")"
    trap 'rm -f -- "$download_file"' EXIT

    printf '[ViMeet] cloudflared was not found. Downloading the official binary...\n'
    curl --fail --location --show-error --silent "$download_url" --output "$download_file"
    [[ -s "$download_file" ]] || die "Downloaded cloudflared file is empty."

    if [[ "$archive" == "true" ]]; then
      command -v tar >/dev/null 2>&1 || die "tar is required to install cloudflared on macOS."
      tar -xzf "$download_file" -C "$install_directory" cloudflared
    else
      mv "$download_file" "$CLOUDFLARED_PATH"
    fi

    chmod +x "$CLOUDFLARED_PATH"
  fi
fi

cat <<EOF

============================================================
 ViMeet Cloudflare Quick Tunnel
============================================================
 Local service : ${LOCAL_URL}
 Public URL    : cloudflared will print an https://*.trycloudflare.com URL below.
 Share         : send that public URL to meeting participants.
 Stop          : keep this terminal open; press Ctrl+C to close the tunnel.
 Note          : the URL is temporary and changes every time.
============================================================

EOF

exec "$CLOUDFLARED_PATH" tunnel --url "http://localhost:${PORT}"
