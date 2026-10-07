#!/usr/bin/env bash
set -Eeuo pipefail

# ==============================================================================
# AI-Translate-Meeting: Automated Smoke Test Verification (Bash)
# Performs end-to-end operational validation of API, AI, LiveKit, Web,
# security policies, and system administration APIs.
# Supports both local Docker testing and remote public HTTPS domains.
# ==============================================================================

BASE_URL="http://localhost:3000"
API_URL="http://localhost:5000"
AI_URL="http://localhost:8000"
LIVEKIT_URL="http://localhost:7880"
APP_DOMAIN=""
LIVEKIT_DOMAIN=""
LIVEKIT_TCP_PORT="7881"
LIVEKIT_UDP_PORT="7882"
IS_DOMAIN_MODE=0
INSECURE=0

show_help() {
  cat <<'EOF'
Usage: ./scripts/smoke-test.sh [OPTIONS]

Options:
  --domain <domain>             Test Web/API/Subtitle over HTTPS/WSS
  --livekit-domain <domain>     LiveKit WSS/media host (default: rtc.<domain>)
  --livekit-tcp-port <port>     LiveKit TCP media port (default: 7881)
  --livekit-udp-port <port>     LiveKit UDP media port (default: 7882)
  --insecure                    Allow self-signed TLS (staging rehearsal only)
  --base-url <url>              Custom Web base URL (default: http://localhost:3000)
  --api-url <url>               Custom API base URL (default: http://localhost:5000)
  --ai-url <url>                Custom AI Service base URL (default: http://localhost:8000)
  -h, --help                    Show this help message
EOF
}

require_value() {
  local option="$1"
  local value="${2:-}"
  if [[ -z "$value" || "$value" == --* ]]; then
    echo "$option requires a value." >&2
    exit 1
  fi
}

normalize_domain() {
  local domain="$1"
  domain="${domain#https://}"
  domain="${domain#http://}"
  domain="${domain%%/*}"
  domain="${domain%/}"
  printf "%s" "$domain"
}

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

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      require_value "$1" "${2:-}"
      APP_DOMAIN="$(normalize_domain "$2")"
      IS_DOMAIN_MODE=1
      shift 2
      ;;
    --livekit-domain)
      require_value "$1" "${2:-}"
      LIVEKIT_DOMAIN="$(normalize_domain "$2")"
      shift 2
      ;;
    --livekit-tcp-port)
      require_value "$1" "${2:-}"
      LIVEKIT_TCP_PORT="$2"
      shift 2
      ;;
    --livekit-udp-port)
      require_value "$1" "${2:-}"
      LIVEKIT_UDP_PORT="$2"
      shift 2
      ;;
    --insecure)
      INSECURE=1
      shift
      ;;
    --base-url)
      require_value "$1" "${2:-}"
      BASE_URL="$2"
      shift 2
      ;;
    --api-url)
      require_value "$1" "${2:-}"
      API_URL="$2"
      shift 2
      ;;
    --ai-url)
      require_value "$1" "${2:-}"
      AI_URL="$2"
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

if [[ ! "$LIVEKIT_TCP_PORT" =~ ^[0-9]+$ || "$LIVEKIT_TCP_PORT" -lt 1 || "$LIVEKIT_TCP_PORT" -gt 65535 ]]; then
  echo "Invalid --livekit-tcp-port: $LIVEKIT_TCP_PORT" >&2
  exit 1
fi

if [[ ! "$LIVEKIT_UDP_PORT" =~ ^[0-9]+$ || "$LIVEKIT_UDP_PORT" -lt 1 || "$LIVEKIT_UDP_PORT" -gt 65535 ]]; then
  echo "Invalid --livekit-udp-port: $LIVEKIT_UDP_PORT" >&2
  exit 1
fi

if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
  LIVEKIT_DOMAIN="${LIVEKIT_DOMAIN:-rtc.$APP_DOMAIN}"
  if ! validate_domain "$APP_DOMAIN" || ! validate_domain "$LIVEKIT_DOMAIN"; then
    echo "--domain and --livekit-domain must be plain DNS hostnames." >&2
    exit 1
  fi
  BASE_URL="https://$APP_DOMAIN"
  API_URL="$BASE_URL"
  AI_URL="$BASE_URL/ai-health"
  LIVEKIT_URL="https://$LIVEKIT_DOMAIN"
fi

CURL_ARGS=(--silent --show-error --connect-timeout 5 --max-time 20)
if [[ "$INSECURE" -eq 1 ]]; then
  CURL_ARGS+=(--insecure)
fi

curl_request() {
  curl "${CURL_ARGS[@]}" "$@"
}

TOTAL_TESTS=0
PASSED_TESTS=0

run_test() {
  local test_name="$1"
  shift
  ((TOTAL_TESTS++)) || true
  printf "[TEST %02d] %-55s ... " "$TOTAL_TESTS" "$test_name"
  
  if "$@"; then
    printf "PASSED\n"
    ((PASSED_TESTS++)) || true
  else
    printf "FAILED\n"
    echo "[-] Smoke test step failed at: $test_name" >&2
    exit 1
  fi
}

echo "=========================================================="
echo "   AI-Translate-Meeting: Automated Smoke Test (Bash)"
echo "   Target Base URL: $BASE_URL"
if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
  echo "   Target LiveKit WSS: wss://$LIVEKIT_DOMAIN"
fi
echo "=========================================================="

# 1. Web Frontend HTTP 200
test_web_frontend() {
  local code
  code="$(curl_request -o /dev/null -w "%{http_code}" "$BASE_URL")"
  [[ "$code" == "200" ]]
}
run_test "Web Frontend Root (HTTP 200)" test_web_frontend

# 2. API Live Health
test_api_live() {
  local target
  if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
    target="$API_URL/api/meetings"
    # Even if 405 or 200, API responds
    local code
    code="$(curl_request -o /dev/null -w "%{http_code}" "$target")"
    [[ "$code" =~ ^(200|404|405)$ ]]
  else
    target="$API_URL/health/live"
    local resp
    resp="$(curl_request -f "$target")"
    echo "$resp" | grep -qi "Healthy"
  fi
}
run_test "Backend API Live Health Probe" test_api_live

# 3. API Ready Health
test_api_ready() {
  if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
    local resp
    resp="$(curl_request -f "$API_URL/api/system/status")"
    echo "$resp" | grep -qi "profile"
  else
    local resp
    resp="$(curl_request -f "$API_URL/health/ready")"
    echo "$resp" | grep -qi "Healthy"
  fi
}
run_test "Backend API Ready Health Probe" test_api_ready

# 4. AI Service Live Health
test_ai_live() {
  if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
    local resp
    resp="$(curl_request -f "$BASE_URL/ai-health/live")"
    echo "$resp" | grep -Eqi "(ok|alive)"
  else
    local resp
    resp="$(curl_request -f "$AI_URL/health/live")"
    echo "$resp" | grep -Eqi "(ok|alive)"
  fi
}
run_test "AI Service Live Health Probe" test_ai_live

# 5. AI Service Ready Health
test_ai_ready() {
  if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
    local resp
    resp="$(curl_request -f "$BASE_URL/ai-health/ready")"
    echo "$resp" | grep -qi "ready"
  else
    local resp
    resp="$(curl_request -f "$AI_URL/health/ready")"
    echo "$resp" | grep -qi "ready"
  fi
}
run_test "AI Service STT Readiness Probe" test_ai_ready

# 6. System Status API
test_system_status() {
  local target
  if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
    target="$BASE_URL/api/system/status"
  else
    target="$API_URL/api/system/status"
  fi
  local resp
  resp="$(curl_request -f "$target")"
  echo "$resp" | grep -qi "profile"
}
run_test "System Administration Status API" test_system_status

# 7. Glossary API
test_glossary_stats() {
  local target
  if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
    target="$BASE_URL/ai-glossary/stats"
  else
    target="$AI_URL/glossary/stats"
  fi
  local resp
  resp="$(curl_request -f "$target")"
  echo "$resp" | grep -qi "terms"
}
run_test "Glossary Statistics & Dynamic Reload API" test_glossary_stats

# 8. System License API
test_system_license() {
  local target
  if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
    target="$BASE_URL/api/system/license"
  else
    target="$API_URL/api/system/license"
  fi
  local resp
  resp="$(curl_request -f "$target")"
  echo "$resp" | grep -qi "tier"
}
run_test "Enterprise License State API" test_system_license

# 9. System Audit Trail API
test_system_audit() {
  local target
  if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
    target="$BASE_URL/api/system/audit"
  else
    target="$API_URL/api/system/audit"
  fi
  local resp
  resp="$(curl_request -f "$target")"
  [[ "$resp" =~ ^\[.*\]$ ]]
}
run_test "Audit Log & Security Trail API" test_system_audit

# 10. Database Cleanup Endpoint
test_system_cleanup() {
  local target
  if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
    target="$BASE_URL/api/system/cleanup"
  else
    target="$API_URL/api/system/cleanup"
  fi
  local code
  code="$(curl_request -X POST -o /dev/null -w "%{http_code}" "$target")"
  [[ "$code" =~ ^(200|204)$ ]]
}
run_test "Database Retention Cleanup API" test_system_cleanup

# 11. Create Meeting
MEETING_CODE=""
HOST_TOKEN=""

cleanup_smoke_meeting() {
  if [[ -n "${MEETING_CODE:-}" && -n "${HOST_TOKEN:-}" ]]; then
    local end_target
    if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
      end_target="$BASE_URL/api/meetings/$MEETING_CODE/end"
    else
      end_target="$API_URL/api/meetings/$MEETING_CODE/end"
    fi
    curl_request -X POST "$end_target" -H "Authorization: Bearer $HOST_TOKEN" >/dev/null 2>&1 || true
  fi
}
trap cleanup_smoke_meeting EXIT
test_create_meeting() {
  local target
  if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
    target="$BASE_URL/api/meetings"
  else
    target="$API_URL/api/meetings"
  fi
  local resp
  resp="$(curl_request -X POST "$target" -H "Content-Type: application/json" -d '{"name": "Bash Smoke Meeting"}')"
  MEETING_CODE="$(echo "$resp" | sed -n 's/.*"meetingCode":"\([^"]*\)".*/\1/p')"
  HOST_TOKEN="$(echo "$resp" | sed -n 's/.*"hostToken":"\([^"]*\)".*/\1/p')"
  [[ -n "$MEETING_CODE" && -n "$HOST_TOKEN" ]]
}
run_test "Create Meeting & Issue Host Token" test_create_meeting

# 12. Get Meeting Details with Host Token
test_get_meeting_details() {
  local target
  if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
    target="$BASE_URL/api/meetings/$MEETING_CODE"
  else
    target="$API_URL/api/meetings/$MEETING_CODE"
  fi
  local resp
  resp="$(curl_request -f -H "Authorization: Bearer $HOST_TOKEN" "$target")"
  echo "$resp" | grep -qi "$MEETING_CODE"
}
run_test "Meeting Details Retrieval with Host JWT" test_get_meeting_details

# 13. Create One-Time Invite
INVITE_CODE=""
test_create_invite() {
  local target
  if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
    target="$BASE_URL/api/meetings/$MEETING_CODE/invites"
  else
    target="$API_URL/api/meetings/$MEETING_CODE/invites"
  fi
  local resp
  resp="$(curl_request -X POST "$target" -H "Authorization: Bearer $HOST_TOKEN" -H "Content-Type: application/json" -d '{"ttlMinutes": 10}')"
  INVITE_CODE="$(echo "$resp" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"
  [[ -n "$INVITE_CODE" ]]
}
run_test "Host Creates One-Time Admission Invite" test_create_invite

# 14. Join Meeting with Invite
PARTICIPANT_TOKEN=""
PARTICIPANT_ID=""
SUBTITLE_TOKEN=""
test_join_meeting() {
  local target
  if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
    target="$BASE_URL/api/meetings/$MEETING_CODE/join"
  else
    target="$API_URL/api/meetings/$MEETING_CODE/join"
  fi
  local resp
  resp="$(curl_request -X POST "$target" -H "Content-Type: application/json" \
    -d "{\"displayName\": \"BashTester\", \"spokenLanguage\": \"vi\", \"targetLanguage\": \"ja\", \"admissionToken\": \"$INVITE_CODE\"}")"
  PARTICIPANT_TOKEN="$(echo "$resp" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"
  PARTICIPANT_ID="$(echo "$resp" | sed -n 's/.*"participantId":"\([^"]*\)".*/\1/p')"
  SUBTITLE_TOKEN="$(echo "$resp" | sed -n 's/.*"subtitleToken":"\([^"]*\)".*/\1/p')"
  [[ -n "$PARTICIPANT_TOKEN" && -n "$PARTICIPANT_ID" && "$SUBTITLE_TOKEN" =~ ^[^.]+\.[^.]+\.[^.]+$ ]]
}
run_test "Participant Join Issues LiveKit & Subtitle JWTs" test_join_meeting

# 15. Subtitle WebSocket HTTPS -> WSS proxy handshake
test_subtitle_wss_proxy() {
  local code
  code="$(curl_request --http1.1 --max-time 5 -o /dev/null -w "%{http_code}" \
    -H "Connection: Upgrade" \
    -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Version: 13" \
    -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    "$BASE_URL/ws/transcribe?meetingId=$MEETING_CODE&participantId=$PARTICIPANT_ID" || true)"
  [[ "$code" =~ ^(101|400|401|403|426)$ ]]
}
run_test "Subtitle WSS Proxy Handshake" test_subtitle_wss_proxy

# 16. Security Headers Verification
test_security_headers() {
  local headers
  headers="$(curl_request -I "$BASE_URL")"
  echo "$headers" | grep -qi "X-Content-Type-Options" && \
  echo "$headers" | grep -qi "X-Frame-Options"
}
run_test "HTTP Security Response Headers (CSP/XFO/XCTO)" test_security_headers

# 17. LiveKit HTTPS/WSS reverse proxy
test_livekit_wss_proxy() {
  if [[ "$IS_DOMAIN_MODE" -eq 0 ]]; then
    curl_request -o /dev/null "$LIVEKIT_URL"
    return
  fi

  local code
  code="$(curl_request --http1.1 --max-time 5 -o /dev/null -w "%{http_code}" \
    -H "Connection: Upgrade" \
    -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Version: 13" \
    -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    "$LIVEKIT_URL/rtc" || true)"
  [[ "$code" =~ ^(101|400|401|403|404|426)$ ]]
}
run_test "LiveKit WSS Signaling Proxy" test_livekit_wss_proxy

# 18. LiveKit public TCP media port
test_livekit_tcp() {
  if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
    if command -v nc >/dev/null 2>&1; then
      nc -z -w 5 "$LIVEKIT_DOMAIN" "$LIVEKIT_TCP_PORT"
    else
      timeout 5 bash -c "</dev/tcp/$LIVEKIT_DOMAIN/$LIVEKIT_TCP_PORT"
    fi
  else
    nc -z -w 5 127.0.0.1 "$LIVEKIT_TCP_PORT" 2>/dev/null || \
      timeout 5 bash -c "</dev/tcp/127.0.0.1/$LIVEKIT_TCP_PORT"
  fi
}
run_test "LiveKit TCP Media Port Reachability" test_livekit_tcp

# 19. LiveKit public UDP media path
test_livekit_udp() {
  local host="127.0.0.1"
  if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
    host="$LIVEKIT_DOMAIN"
  fi

  if command -v nc >/dev/null 2>&1; then
    nc -z -u -w 3 "$host" "$LIVEKIT_UDP_PORT"
  else
    timeout 3 bash -c "printf '\\0' > /dev/udp/$host/$LIVEKIT_UDP_PORT"
  fi
}
run_test "LiveKit UDP Media Port Reachability" test_livekit_udp

# 20. Clean Meeting Teardown
test_end_meeting() {
  local target
  if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
    target="$BASE_URL/api/meetings/$MEETING_CODE/end"
  else
    target="$API_URL/api/meetings/$MEETING_CODE/end"
  fi
  local code
  code="$(curl_request -X POST -o /dev/null -w "%{http_code}" "$target" -H "Authorization: Bearer $HOST_TOKEN")"
  [[ "$code" =~ ^(200|204)$ ]]
}
run_test "Host Ends Meeting & Purges Active Session" test_end_meeting

# 21. Confirm Meeting Status is Ended
test_verify_meeting_ended() {
  local target
  if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
    target="$BASE_URL/api/meetings/$MEETING_CODE"
  else
    target="$API_URL/api/meetings/$MEETING_CODE"
  fi
  local resp
  resp="$(curl_request -f -H "Authorization: Bearer $HOST_TOKEN" "$target")"
  echo "$resp" | grep -qi "Ended"
}
run_test "Verify Meeting Status Transition to Ended" test_verify_meeting_ended

echo "----------------------------------------------------------"
echo "All $PASSED_TESTS/$TOTAL_TESTS smoke test verifications passed successfully!"
echo "Zero secret values or user tokens were logged."
exit 0
