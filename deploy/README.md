# ClearSettle — Local Development Stack & Integration Validation

This directory contains **local development tooling**, not a production deployment. It brings up the full
authentication path on a single browser origin (`https://localhost:8443`): PostgreSQL, Keycloak (dev
realm requiring MFA), the Spring Boot backend, and the redacting nginx reverse proxy.

> **Status:** the stack and the Keycloak dev realm are provided for local, end-to-end validation. They
> have **not** been executed end-to-end in the authoring session; running them (and the integration
> checks below) is the outstanding M1 integration step. The backend's unit and security-chain tests run
> in CI without this stack (`cd backend && mvn test`).

## Prerequisites

- Docker + Docker Compose.
- A TLS cert/key for the proxy at `deploy/nginx/certs/server.crt` and `server.key` (dev self-signed,
  e.g. `openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -keyout server.key -out server.crt -days 30 -subj "/CN=localhost"`).
- `cp deploy/.env.example deploy/.env` and fill in strong local-only values (never commit `deploy/.env`).
- Build the frontend once so the proxy can serve it: `cd frontend && npm ci && npm run build` (produces `frontend/out`).

## Run

```bash
cd deploy
docker compose up -d --build
# open https://localhost:8443
```

The first browser sign-in enrols TOTP (universal MFA, D-SEC-14); subsequent logins require it.

## Integration validation (outstanding — run against this stack)

These mirror the M0 spike's live checks, now against the product. Each must be recorded in
`docs/product/clearsettle_implementation_status.md` with evidence when run.

1. **OIDC login + PKCE (AC-157):** sign in; confirm the authorization request carries
   `code_challenge_method=S256`, `state`, `nonce`, exact `redirect_uri`; `/api/me` returns 200.
2. **Token/claim rejection (AC-157):** with a tampered/expired/wrong-issuer token (mock IdP or Keycloak
   misconfig), confirm login fails closed.
3. **Exact redirect URI (AC-158):** an unregistered `redirect_uri` is refused by Keycloak (no code).
4. **Universal MFA at login (D-SEC-14):** a login that did not satisfy MFA (acr not strong) does NOT
   obtain a session — the backend's `LoginHandlers.Success` gate redirects with `auth_error=mfa_required`.
5. **Step-up (AC-164/165):** a sensitive action without fresh strong auth returns `step_up_required`;
   after step-up the review page does not auto-execute; confirm is single-use and same-user bound.
6. **Idle + absolute expiry (AC-162):** verify idle at 15 min and absolute at 8 h despite activity
   (temporarily shorten `clearsettle.auth.*` for a fast check).
7. **Logout + sign-out-everywhere (AC-162/163):** old cookie refused; both instances' sessions revoked.
8. **CSRF + cookie-tossing (AC-160/161, F-4):** cookie-toss on a JSON and a no-body endpoint rejected by
   the CSRF layer (not by 415); the `__Host-` prefix + custom header both required.
9. **F-1 logging (AC-168):** run `./f1-logging-regression.sh` — the synthetic authorization-code marker
   must NOT appear in the proxy access log while the callback path/status is still logged.
10. **Browser compatibility (F-5):** repeat the cookie/CSRF/OIDC checks on Firefox and Chromium; record
    Safari/WebKit and mobile separately (explicit gap until tested).

## F-1 logging regression

`./f1-logging-regression.sh [BASE_URL] [NGINX_CONTAINER]` drives a synthetic callback through the proxy
and asserts the authorization code is absent from the access log while method/path/status remain. The
redaction is configured in `nginx/nginx.conf` (the `auth_redacted` log format on the callback route) and
must be replicated on **every** logging intermediary in a real deployment (CDN/LB/WAF/APM), per F-1.

## Notes

- Secrets come from `deploy/.env` (git-ignored) and, in production, from a secret manager — never source
  control. The Keycloak dev realm substitutes the client secret from `CS_CLIENT_SECRET`.
- This stack is for development only. Do not expose it publicly; do not use real data or credentials.
