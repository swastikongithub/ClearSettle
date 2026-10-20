# ClearSettle — Local Development Stack & Integration Validation

This directory contains **local development tooling**, not a production deployment. It brings up the
authentication path on one browser origin (`https://localhost:8443`): PostgreSQL, Keycloak (dev realm
requiring MFA), the Spring Boot backend, and the redacting nginx reverse proxy. Compose project:
`clearsettle-dev` (isolated from other projects); only `127.0.0.1:8443` (proxy) and `127.0.0.1:8081`
(Keycloak) are published.

> **Status:** run end-to-end on 2026-10-16/17 (M1 integration validation, then the 17 October security-policy
> work). Results and the defects found and fixed are recorded in
> `docs/product/clearsettle_implementation_status.md`. The backend's unit and security-chain tests run without
> this stack (`cd backend && mvn test`).

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
- Build the frontend once: `cd frontend && npm ci && npm run build` (produces `frontend/out`); its unit
  tests (amount and time formatting, return-to, the session clock, review outcomes) run with `npm test`. After a
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

## MFA behaviour (D-SEC-14, D-SEC-16, D-SEC-19)

- Every user must enrol TOTP (the only second factor) on first sign-in. Enrolment is a default required
  action, and the level-2 flow requires the OTP form, so a user without the required action enrols too.
- **Expected, not a fault: the sign-in that enrols the authenticator does not create an application
  session.** Keycloak reports `acr=mfa` for it but `amr` shows no verified factor, and the backend requires
  `acr=mfa` **and** `amr` containing `otp`. The browser lands on `/?auth_error=mfa_not_verified` with a "sign
  in once more" message; the next sign-in asks for a code from the new authenticator (Keycloak SSO covers the
  password) and creates the session. `auth_error=mfa_required` instead means the IdP performed no MFA.
- The realm adds the AMR protocol mapper and authentication references (`pwd`, `otp`) so `amr` reflects
  the authenticators that actually ran. Keycloak lists a method only while its reference is still valid when
  the token is issued, counted in whole seconds. The references are valid for 60 seconds
  (`default.reference.maxAge`), the realm's authorization-code lifetime (`accessCodeLifespan`), so a code
  exchanged late still carries the factor just verified. With Keycloak's default of 0, the code had to be
  exchanged within the same second as the OTP step: a slower redirect lost `otp` from `amr`, and a correct
  sign-in or step-up was refused (fixed 20 October 2026; B-09, H-09; B-11 and H-10 run with the old value).
- That window only reports methods; it does not make an earlier factor count. Level 2 (the OTP form) has a
  max age of 0 and the client's minimum ACR is `mfa`, so Keycloak asks for a new code on every sign-in, even
  seconds after the last one (B-04, B-10). In B-10, asked only for a code, `amr` also listed the `pwd` of the
  sign-in seconds before; ClearSettle does not rely on `pwd`. Without the OTP form a token's `acr` is not
  `mfa`, and ClearSettle refuses it: with the client's ACR requirement removed, a code issued from the
  Keycloak session alone had `acr=pwd` and was refused; its `amr` listed `pwd` only, not the `otp` completed
  seconds before (B-12). Step-up adds `prompt=login`, `max_age=0` and the backend's 5-minute `auth_time`
  limit. P-10 checks this configuration.

On a stack whose Keycloak container was created before 20 October 2026 (the realm is imported only then), set
the window once (kcadm inside the container, as the admin):

```bash
kcadm.sh get authentication/flows/clearsettle-loa1/executions -r clearsettle   # password form: authenticationConfig
kcadm.sh get authentication/flows/clearsettle-loa2/executions -r clearsettle   # OTP form: authenticationConfig
kcadm.sh update authentication/config/<config-id> -r clearsettle -s 'config."default.reference.maxAge"=60'   # each
kcadm.sh update realms/clearsettle -s accessCodeLifespan=60                     # Keycloak's default, now explicit
```

## MFA recovery controls (D-SEC-18)

No self-service MFA reset. The realm file is the reference configuration:

- password reset off, and its flow (`clearsettle-reset-credentials`) has no *Reset OTP* step;
- the `delete_credential` required action is disabled (the account console cannot remove a factor);
- user events and admin events are stored (admin representation bodies off), so an administrator's factor
  removal is recorded with the administrator's identity;
- brute-force detection with Keycloak's default thresholds (temporary lockout).

Administrator-assisted reset in the dev stack (after verifying the person's identity out of band):

```bash
# as the Keycloak admin (kcadm inside the container)
kcadm.sh delete users/<user-id>/credentials/<otp-credential-id> -r clearsettle
kcadm.sh update users/<user-id> -r clearsettle -s 'requiredActions=["CONFIGURE_TOTP"]'
kcadm.sh create users/<user-id>/logout -r clearsettle
# interim, until ClearSettle has an audited session revocation or back-channel logout:
psql -c "delete from spring_session where principal_name = '<app_user id>'"
```

Keycloak's logout does not end ClearSettle sessions; without the last step the user's existing application
session stays valid (R-02 shows this). The identity-verification procedure, the ClearSettle-side revocation
and the external review are not built; this is not a production recovery process.

## Sensitive actions (D-SEC-17) and the dev fixture

No sensitive business operation exists yet. The stack activates the Spring profile `local-dev` and sets
`CLEARSETTLE_DEVFIXTURES_ENABLED=true`; only the two together register one **no-op** sensitive operation (`dev.fixture.noop`, endpoint
`POST /api/dev-fixture/sensitive-actions`) so the policy can be exercised in a browser: the request answers
`202 confirmation_required` (sign-in under 5 minutes old) or `401 step_up_required`; the step-up lands on
`/review?action=<id>`; only **Confirm** (`POST /api/sensitive-actions/<id>/confirm`) runs it, once. Executing
it changes nothing and records a `dev_fixture_operation_executed` security event. The backend logs a warning
at startup when it is enabled, and refuses to start if it is enabled while `CLEARSETTLE_OIDC_APPBASEURL` is
not a loopback origin; never enable it outside this stack.

Every sensitive action records the version of what the user reviews; a confirmation is refused with
`409 action_changed` if it has changed. The column was added on 19 October 2026: on a database created
before then, re-apply the (idempotent) schema once:

```bash
docker exec clearsettle-db psql -v ON_ERROR_STOP=1 -U postgres -d clearsettle -f /schema/schema.sql
```

(From Git Bash on Windows, prefix it with `MSYS_NO_PATHCONV=1`.)

## Second application instance (cross-instance tests)

```bash
docker compose --profile multi-instance up -d backend-2   # same image, same PostgreSQL session store
docker compose --profile multi-instance stop backend-2
```

The proxy keeps routing to `backend`; `backend-2` is reached directly on `127.0.0.1:8082` (plain HTTP,
loopback only). Build the image first with `docker compose up -d --build backend`.

## Automated validation

```bash
cd e2e && npm ci
export PLAYWRIGHT_BROWSERS_PATH=<dir with Playwright 1.64.1 browsers>   # or: npx playwright install chromium firefox webkit
node run.mjs chromium P,B,C,D,E,H,U,R,K,G # protocol/IdP config, login/MFA, cookies, sessions, CSRF, step-up and
                                          # confirmation, the application shell, MFA recovery, tossing, log scan
node run.mjs firefox  B,C,D,E,H,U,R,K,G
node run.mjs webkit   B,C,D,E,H,U,R,K,G   # Playwright WebKit = engine proxy, NOT Safari/iOS
E2E_DEVICE="Pixel 7"   node run.mjs chromium B,C,E,H   # device EMULATION (viewport/UA/touch), not a real device
E2E_DEVICE="iPhone 15" node run.mjs webkit   B,C,E,H
node run.mjs chromium M,G              # two instances (start backend-2 first, see above)
node longrun.mjs chromium              # ~17 min: 15-min idle, 5-min freshness, step-up and expiry of
                                       # sensitive actions, production values
node engine-samesite-probe.mjs        # which engines enforce SameSite (no stack needed)
bash ../deploy/f1-logging-regression.sh https://localhost:8443 clearsettle-proxy clearsettle-backend --with-upstream-failure
```

Test users are created in the dev realm at runtime with random synthetic passwords; raw results go to
`e2e/results/` (git-ignored). Run suites **one at a time**: tests count per-user sessions and events, and
four Chromium-only tests briefly reconfigure the dev realm. `B-06` and `B-12` remove the client's ACR
defaults, and `B-11` and `H-10` set the authentication references' max age to 0. Each restores the setting in
a `finally`. If a run is killed during one, `P-06` (ACR defaults) or `P-10` (max age) on the next Chromium run
shows whether a restore is needed. A sign-in helper retries only after the sign-in that enrols the
authenticator, which gets no session by design; any other refused sign-in fails the test.
Every run starts with the preflight `A-01`: the proxy serves the app shell, its script runs against the
API and shows the sign-in screen, and anonymous visits create no server-side session. Group `U` drives the
application shell itself: the review page, return to the page asked for after sign-in, the idle warning (the
browser clock is advanced, so it takes seconds), an external deep link under `SameSite=Strict`, and sign out
everywhere from the Security page. `B-08` locks a dedicated test user at the IdP and
clears the lockout afterwards.

The backend's PostgreSQL tests (user provisioning under concurrent first sign-ins; single-use confirmation
under concurrency; the step-up's session lookup on the real Spring Session repository) run only against a
disposable database named by `CS_TEST_PG_URL`, `CS_TEST_PG_USER` and `CS_TEST_PG_PASSWORD` (the production
schema is applied to it); without them `mvn test` reports them as skipped. Never point them at this stack's
database. `CS_TEST_PG_DIAGNOSTICS=true` additionally runs a diagnostic reproduction of the Spring Session JDBC
behaviour behind defect 12; it depends on PostgreSQL's query plan, so it is not part of the standard suite.

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
