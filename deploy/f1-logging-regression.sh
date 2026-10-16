#!/usr/bin/env bash
# F-1 regression test (M1-E): prove the reverse proxy does NOT log the OAuth authorization code, state or
# session_state from the OIDC callback, while still logging method/path/status. SYNTHETIC markers only.
#
# The official nginx image symlinks /var/log/nginx/access.log -> /dev/stdout and error.log -> /dev/stderr,
# so the logs are read from `docker logs` (both streams). A CANARY marker is sent on an ordinary route
# whose query IS logged; if the canary is not found the scan is invalid (it would otherwise pass
# vacuously), and the test fails.
#
# Usage: deploy/f1-logging-regression.sh [BASE_URL] [PROXY_CONTAINER] [BACKEND_CONTAINER] [--with-upstream-failure]
#   --with-upstream-failure briefly stops/starts the backend container (local dev stack only).
set -u
BASE="${1:-https://localhost:8443}"
PROXY="${2:-clearsettle-proxy}"
BACKEND="${3:-clearsettle-backend}"
STAMP="$(date +%s)$RANDOM"
MARK="SYNTHF1MARK${STAMP}"
CANARY="SYNTHF1CANARY${STAMP}"

echo "1) synthetic callback through the proxy (markers are not real codes)"
curl -sk -o /dev/null -w "   callback status=%{http_code}\n" \
  "$BASE/login/oauth2/code/keycloak?code=${MARK}CODE&state=${MARK}STATE&session_state=${MARK}SESS"
echo "2) canary on an ordinary route (its query is logged by design, proving the scan reads real logs)"
curl -sk -o /dev/null -w "   canary status=%{http_code}\n" "$BASE/?canary=${CANARY}"
sleep 1

PROXY_LOGS="$(docker logs "$PROXY" 2>&1)"
BACKEND_LOGS="$(docker logs "$BACKEND" 2>&1)"
canary=$(printf '%s' "$PROXY_LOGS" | grep -c "$CANARY")
mark_proxy=$(printf '%s' "$PROXY_LOGS" | grep -c "$MARK")
mark_backend=$(printf '%s' "$BACKEND_LOGS" | grep -c "$MARK")
path_logged=$(printf '%s' "$PROXY_LOGS" | grep -c '"GET /login/oauth2/code/keycloak HTTP/[0-9.]*" [0-9]\{3\} .*redacted_query')

echo "canary_found_in_proxy_logs=$canary (must be >=1)"
echo "marker_in_proxy_logs=$mark_proxy (must be 0)"
echo "marker_in_backend_logs=$mark_backend (must be 0)"
echo "redacted_callback_lines_with_status=$path_logged (must be >=1)"

if [ "$canary" -lt 1 ]; then
  echo "RESULT: INVALID — canary not found; the scan is not reading the real proxy logs."; exit 2
fi
fail=0
if [ "$mark_proxy" -ne 0 ] || [ "$mark_backend" -ne 0 ] || [ "$path_logged" -lt 1 ]; then fail=1; fi

# Optional: nginx's ERROR log records the full request line on upstream failures. With
# --with-upstream-failure the backend is stopped briefly to prove the callback route writes nothing there.
if [ "${4:-}" = "--with-upstream-failure" ]; then
  echo "3) upstream-failure check: stopping $BACKEND briefly"
  docker stop "$BACKEND" >/dev/null
  MARK2="SYNTHF1UPSTREAM${STAMP}"
  curl -sk -o /dev/null -w "   callback status with backend down=%{http_code}\n" \
    "$BASE/login/oauth2/code/keycloak?code=${MARK2}CODE&state=${MARK2}STATE&session_state=${MARK2}SESS"
  curl -sk -o /dev/null -w "   control (/api, error log live) status=%{http_code}\n" "$BASE/api/me?probe=${MARK2}CONTROL"
  sleep 1
  docker start "$BACKEND" >/dev/null
  LOGS2="$(docker logs "$PROXY" 2>&1)"
  leak=$(printf '%s' "$LOGS2" | grep -c "${MARK2}CODE")
  control=$(printf '%s' "$LOGS2" | grep -c "${MARK2}CONTROL")
  echo "upstream_failure_callback_marker_in_proxy_logs=$leak (must be 0)"
  echo "upstream_failure_control_marker_in_proxy_logs=$control (must be >=1, proves the error log is live)"
  if [ "$control" -lt 1 ]; then echo "RESULT: INVALID — error-log control not found"; exit 2; fi
  if [ "$leak" -ne 0 ]; then fail=1; fi
  echo "   backend restarted (sessions persist in PostgreSQL)"
fi

if [ "$fail" -eq 0 ]; then
  echo "RESULT: PASS — callback code/state/session_state absent from proxy and backend logs; path+status logged."
  exit 0
fi
echo "RESULT: FAIL — a synthetic callback secret reached a log, or the redacted callback line is missing."
exit 1
