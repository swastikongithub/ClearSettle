# ClearSettle — Local Development Stack & Integration Validation

This directory contains **local development tooling**, not a production deployment. It brings up the
authentication path on one browser origin (`https://localhost:8443`): PostgreSQL, Keycloak (dev realm
requiring MFA), the Spring Boot backend, and the redacting nginx reverse proxy. Compose project:
`clearsettle-dev` (isolated from other projects); only `127.0.0.1:8443` (proxy) and `127.0.0.1:8081`
(Keycloak) are published.

> **Status:** run end-to-end on 2026-10-16 (M1 integration validation). Results and the defects found and
> fixed are recorded in `docs/product/clearsettle_implementation_status.md`. The backend's unit and
> security-chain tests run without this stack (`cd backend && mvn test`).

## Topology (dev only)

- App origin: `https://localhost:8443` (nginx → frontend static export + `/api`, `/oauth2`,
  `/login/oauth2`, `/logout` → backend).
- Keycloak: `http://host.docker.internal:8081`. `KC_HOSTNAME` uses `host.docker.internal` so the token
  issuer is identical for the backend container (via `host-gateway`) and the host browser. Some hosts
  (e.g. this Windows host) do not resolve `host.docker.internal`; the e2e harness maps it to `127.0.0.1`
  inside the test browsers (Chromium host-resolver rule / Firefox `network.dns.forceResolve` / a local
  forward proxy for WebKit, which has no resolver option).
- nginx resolves the backend per request (Docker DNS), so it starts and reloads while the backend is down
  and follows a recreated backend to its new IP.

## Prerequisites

- Docker + Docker Compose.
- Dev TLS cert/key at `deploy/nginx/certs/server.crt|server.key` (git-ignored). On Git Bash prefix with
  `MSYS_NO_PATHCONV=1` so `/CN=localhost` is not rewritten into a Windows path:
  `MSYS_NO_PATHCONV=1 openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -keyout deploy/nginx/certs/server.key -out deploy/nginx/certs/server.crt -days 30 -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"`
- `cp deploy/.env.example deploy/.env` and fill in strong, local-only, synthetic values (git-ignored).
- Build the frontend once: `cd frontend && npm ci && npm run build` (produces `frontend/out`). After a
  rebuild while the stack runs, `docker compose restart proxy`: `next build` deletes and recreates
  `frontend/out`, and Docker Desktop's bind mount keeps pointing at the deleted directory (every page
  then fails). The e2e preflight `A-01` detects this.

## Run / stop

```bash
cd deploy
docker compose up -d --build   # start (first backend build downloads Maven dependencies)
docker compose stop            # stop everything; data is kept (non-destructive)
docker compose start           # resume after stop
docker compose down            # remove containers + network; the PostgreSQL anonymous volume is left
                               # orphaned (a later `up` starts with a fresh, empty database)
docker compose down -v         # ALSO delete that PostgreSQL volume (destructive; dev data only)
```

PostgreSQL stores its data in an anonymous Docker volume (declared by the official image), which survives
`stop`/`start` and container re-creation by `up`. Keycloak runs `start-dev` with its built-in dev database:
recreating its container re-imports the realm from `keycloak/clearsettle-realm.json` (Keycloak requires
the `<realm>-realm.json` file name) and discards dev users.

## MFA behaviour (D-SEC-14)

- Every user must enrol TOTP on first sign-in (required action; cannot be skipped).
- The **enrolment login itself does not create an application session**: Keycloak reports `acr=mfa` for
  it but `amr` is empty (no previously enrolled factor was verified), and the backend requires
  `acr=mfa` **and** `amr` containing `otp`. The user signs in again and enters a code from the enrolled
  authenticator (Keycloak SSO already covers the password), and the session is created.
- The realm adds the AMR protocol mapper and authentication references (`pwd`, `otp`) so `amr` reflects
  the authenticators that actually ran.

## Automated validation

```bash
cd e2e && npm ci
export PLAYWRIGHT_BROWSERS_PATH=<dir with Playwright 1.64.1 browsers>   # or: npx playwright install chromium firefox webkit
node run.mjs chromium P,B,C,D,E,H,K,G # protocol, login/MFA, cookies, sessions, CSRF, step-up, tossing, log scan
node run.mjs firefox  B,C,D,E,H,K,G
node run.mjs webkit   B,C,D,E,H,K,G   # Playwright WebKit = engine proxy, NOT Safari/iOS
E2E_DEVICE="Pixel 7"   node run.mjs chromium B,C,E,H   # device EMULATION (viewport/UA/touch), not a real device
E2E_DEVICE="iPhone 15" node run.mjs webkit   B,C,E,H
node longrun.mjs chromium             # ~16 min: 15-min idle + 5-min freshness, production values
node engine-samesite-probe.mjs        # which engines enforce SameSite (no stack needed)
bash ../deploy/f1-logging-regression.sh https://localhost:8443 clearsettle-proxy clearsettle-backend --with-upstream-failure
```

Test users are created in the dev realm at runtime with random synthetic passwords; raw results go to
`e2e/results/` (git-ignored). Run suites **one at a time**: tests count per-user sessions and events, and
`B-06` briefly reconfigures the dev client's ACR defaults (restored in a `finally`; if a run is killed
during `B-06`, `P-06` on the next Chromium run shows whether the client's ACR defaults need restoring).
Every run starts with the preflight `A-01`: the proxy serves the app shell, its script runs against the
API, and anonymous visits create no server-side session.

Result statuses: `PASS`, `FAIL`, `ERROR` (the test could not run), `ENGINE-LIMITATION` (a browser-jar
SameSite assertion in an engine shown by the probe not to implement SameSite: Playwright WebKit on
Windows) and `NOT-OBSERVABLE` (the engine exposes no `Set-Cookie` headers to the harness). Only `PASS`
counts as verified.

## F-1 logging regression

`f1-logging-regression.sh` drives a synthetic callback (`code`/`state`/`session_state` markers) through the
proxy and reads **`docker logs`** (the official nginx image symlinks `access.log`/`error.log` to
stdout/stderr — reading the files inside the container sees nothing). A canary on an ordinary route must
be found or the run is INVALID (prevents a vacuous pass). `--with-upstream-failure` briefly stops the
backend to prove the callback route also writes nothing to nginx's **error log**, whose fixed format would
otherwise record the full request line including the code.

The redaction (`auth_redacted` access-log format + `error_log /dev/null` on the callback route) must be
replicated on **every** logging intermediary of a real deployment (CDN/LB/WAF/APM), per F-1.

## Notes

- Secrets come from `deploy/.env` (git-ignored) and, in production, from a secret manager. The realm file
  substitutes the client secret from `CS_CLIENT_SECRET` at import.
- Development only: do not expose it publicly; do not use real data or credentials.
