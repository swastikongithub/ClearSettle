#!/usr/bin/env bash
# F-1 regression test (M1-E): prove the reverse proxy does NOT log the OAuth authorization code (or other
# sensitive callback query parameters) while still logging method/path/status. Uses a SYNTHETIC marker,
# never a real code. Run against the dev stack (deploy/docker-compose.yml) once it is up.
#
# Usage: deploy/f1-logging-regression.sh [BASE_URL] [NGINX_CONTAINER]
#   BASE_URL default https://localhost:8443 ; NGINX_CONTAINER default clearsettle-proxy
set -u
BASE="${1:-https://localhost:8443}"
NGINX="${2:-clearsettle-proxy}"
ACCESS_LOG="/var/log/nginx/access.log"
MARK="SYNTHF1$(date +%s)$RANDOM"
CB="$BASE/login/oauth2/code/keycloak?code=${MARK}CODE&state=${MARK}STATE&session_state=${MARK}SESS"

echo "Driving a synthetic callback through the proxy (marker not a real code)..."
curl -sk -o /dev/null "$CB" || true
sleep 1

echo "Scanning the nginx access log for the synthetic marker..."
HITS=$(docker exec "$NGINX" sh -c "grep -c '$MARK' $ACCESS_LOG || true" 2>/dev/null | tr -dc '0-9')
PATH_LOGGED=$(docker exec "$NGINX" sh -c "grep -c 'login/oauth2/code/keycloak' $ACCESS_LOG || true" 2>/dev/null | tr -dc '0-9')

echo "marker_occurrences_in_access_log=${HITS:-?}"
echo "callback_path_logged=${PATH_LOGGED:-?}"

if [ "${HITS:-1}" = "0" ] && [ "${PATH_LOGGED:-0}" -ge 1 ]; then
  echo "RESULT: PASS — authorization code redacted from the access log; path/status still logged."
  exit 0
else
  echo "RESULT: FAIL — the callback query (code) appears in the access log, or the path was not logged."
  exit 1
fi
