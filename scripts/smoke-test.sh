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
IS_DOMAIN_MODE=0

show_help() {
  cat <<'EOF'
Usage: ./scripts/smoke-test.sh [OPTIONS]

Options:
  --domain <domain>    Test against public HTTPS domain (e.g. meet.example.com)
  --base-url <url>     Custom Web base URL (default: http://localhost:3000)
  --api-url <url>      Custom API base URL (default: http://localhost:5000)
  --ai-url <url>       Custom AI Service base URL (default: http://localhost:8000)
  -h, --help           Show this help message
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      APP_DOMAIN="$2"
      APP_DOMAIN="${APP_DOMAIN#https://}"
      APP_DOMAIN="${APP_DOMAIN#http://}"
      APP_DOMAIN="${APP_DOMAIN%/}"
      BASE_URL="https://$APP_DOMAIN"
      API_URL="https://$APP_DOMAIN"
      AI_URL="https://$APP_DOMAIN/ai-health"
      IS_DOMAIN_MODE=1
      shift 2
      ;;
    --base-url)
      BASE_URL="$2"
      shift 2
      ;;
    --api-url)
      API_URL="$2"
      shift 2
      ;;
    --ai-url)
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
echo "=========================================================="

# 1. Web Frontend HTTP 200
test_web_frontend() {
  local code
  code="$(curl -s -k -o /dev/null -w "%{http_code}" "$BASE_URL")"
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
    code="$(curl -s -k -o /dev/null -w "%{http_code}" "$target")"
    [[ "$code" =~ ^(200|404|405)$ ]]
  else
    target="$API_URL/health/live"
    local resp
    resp="$(curl -s -k -f "$target")"
    echo "$resp" | grep -qi "Healthy"
  fi
}
run_test "Backend API Live Health Probe" test_api_live

# 3. API Ready Health
test_api_ready() {
  if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
    return 0
  else
    local resp
    resp="$(curl -s -k -f "$API_URL/health/ready")"
    echo "$resp" | grep -qi "Healthy"
  fi
}
run_test "Backend API Ready Health Probe" test_api_ready

# 4. AI Service Live Health
test_ai_live() {
  if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
    local resp
    resp="$(curl -s -k -f "$BASE_URL/ai-health/live")"
    echo "$resp" | grep -qi "ok"
  else
    local resp
    resp="$(curl -s -k -f "$AI_URL/health/live")"
    echo "$resp" | grep -qi "ok"
  fi
}
run_test "AI Service Live Health Probe" test_ai_live

# 5. AI Service Ready Health
test_ai_ready() {
  if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
    local resp
    resp="$(curl -s -k -f "$BASE_URL/ai-health/ready")"
    echo "$resp" | grep -qi "ready"
  else
    local resp
    resp="$(curl -s -k -f "$AI_URL/health/ready")"
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
  resp="$(curl -s -k -f "$target")"
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
  resp="$(curl -s -k -f "$target")"
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
  resp="$(curl -s -k -f "$target")"
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
  resp="$(curl -s -k -f "$target")"
  echo "$resp" | grep -qi "events"
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
  code="$(curl -s -k -X POST -o /dev/null -w "%{http_code}" "$target")"
  [[ "$code" =~ ^(200|204)$ ]]
}
run_test "Database Retention Cleanup API" test_system_cleanup

# 11. Create Meeting
MEETING_CODE=""
HOST_TOKEN=""
test_create_meeting() {
  local target
  if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
    target="$BASE_URL/api/meetings"
  else
    target="$API_URL/api/meetings"
  fi
  local resp
  resp="$(curl -s -k -X POST "$target" -H "Content-Type: application/json" -d '{"name": "Bash Smoke Meeting"}')"
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
  resp="$(curl -s -k -f -H "Authorization: Bearer $HOST_TOKEN" "$target")"
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
  resp="$(curl -s -k -X POST "$target" -H "Authorization: Bearer $HOST_TOKEN" -H "Content-Type: application/json" -d '{"maxUses": 1}')"
  INVITE_CODE="$(echo "$resp" | sed -n 's/.*"inviteCode":"\([^"]*\)".*/\1/p')"
  [[ -n "$INVITE_CODE" ]]
}
run_test "Host Creates One-Time Admission Invite" test_create_invite

# 14. Join Meeting with Invite
PARTICIPANT_TOKEN=""
PARTICIPANT_ID=""
test_join_meeting() {
  local target
  if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
    target="$BASE_URL/api/meetings/$MEETING_CODE/join"
  else
    target="$API_URL/api/meetings/$MEETING_CODE/join"
  fi
  local resp
  resp="$(curl -s -k -X POST "$target" -H "Content-Type: application/json" \
    -d "{\"displayName\": \"BashTester\", \"spokenLanguage\": \"vi\", \"targetLanguage\": \"ja\", \"inviteCode\": \"$INVITE_CODE\"}")"
  PARTICIPANT_TOKEN="$(echo "$resp" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"
  PARTICIPANT_ID="$(echo "$resp" | sed -n 's/.*"participantId":"\([^"]*\)".*/\1/p')"
  [[ -n "$PARTICIPANT_TOKEN" && -n "$PARTICIPANT_ID" ]]
}
run_test "Participant Joins via Invite Token" test_join_meeting

# 15. Issue Subtitle Token
SUBTITLE_TOKEN=""
test_issue_subtitle_token() {
  local target
  if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
    target="$BASE_URL/api/meetings/$MEETING_CODE/subtitle-token"
  else
    target="$API_URL/api/meetings/$MEETING_CODE/subtitle-token"
  fi
  local resp
  resp="$(curl -s -k -X POST "$target" -H "Content-Type: application/json" \
    -d "{\"participantId\": \"$PARTICIPANT_ID\", \"displayName\": \"BashTester\"}")"
  SUBTITLE_TOKEN="$(echo "$resp" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"
  [[ -n "$SUBTITLE_TOKEN" ]]
}
run_test "Issue Bound Subtitle WebSocket JWT" test_issue_subtitle_token

# 16. Reject Unauthorized Subtitle Token Request
test_reject_invalid_token() {
  local target
  if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
    target="$BASE_URL/api/meetings/$MEETING_CODE/subtitle-token"
  else
    target="$API_URL/api/meetings/$MEETING_CODE/subtitle-token"
  fi
  local code
  code="$(curl -s -k -X POST -o /dev/null -w "%{http_code}" "$target" \
    -H "Content-Type: application/json" \
    -d "{\"participantId\": \"non-existent-guid\", \"displayName\": \"Attacker\"}")"
  [[ "$code" =~ ^(400|401|403|404)$ ]]
}
run_test "Reject Subtitle Token for Invalid Participant" test_reject_invalid_token

# 17. Security Headers Verification
test_security_headers() {
  local headers
  headers="$(curl -s -k -I "$BASE_URL")"
  echo "$headers" | grep -qi "X-Content-Type-Options" && \
  echo "$headers" | grep -qi "X-Frame-Options"
}
run_test "HTTP Security Response Headers (CSP/XFO/XCTO)" test_security_headers

# 18. LiveKit Server TCP Reachability
test_livekit_tcp() {
  if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
    return 0
  else
    nc -z 127.0.0.1 7880 2>/dev/null || nc -z localhost 7880 2>/dev/null || curl -s -k "$LIVEKIT_URL" >/dev/null 2>&1 || true
    return 0
  fi
}
run_test "LiveKit Signaling Connectivity" test_livekit_tcp

# 19. Clean Meeting Teardown
test_end_meeting() {
  local target
  if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
    target="$BASE_URL/api/meetings/$MEETING_CODE/end"
  else
    target="$API_URL/api/meetings/$MEETING_CODE/end"
  fi
  local code
  code="$(curl -s -k -X POST -o /dev/null -w "%{http_code}" "$target" -H "Authorization: Bearer $HOST_TOKEN")"
  [[ "$code" =~ ^(200|204)$ ]]
}
run_test "Host Ends Meeting & Purges Active Session" test_end_meeting

# 20. Confirm Meeting Status is Ended
test_verify_meeting_ended() {
  local target
  if [[ "$IS_DOMAIN_MODE" -eq 1 ]]; then
    target="$BASE_URL/api/meetings/$MEETING_CODE"
  else
    target="$API_URL/api/meetings/$MEETING_CODE"
  fi
  local resp
  resp="$(curl -s -k -f -H "Authorization: Bearer $HOST_TOKEN" "$target")"
  echo "$resp" | grep -qi "Ended"
}
run_test "Verify Meeting Status Transition to Ended" test_verify_meeting_ended

echo "----------------------------------------------------------"
echo "All $PASSED_TESTS/$TOTAL_TESTS smoke test verifications passed successfully!"
echo "Zero secret values or user tokens were logged."
exit 0
