# ClearSettle

India-first payment reconciliation and double-entry accounting SaaS.

> **Status:** product specification plus the **M1 authentication foundation** (authorized 2026-10-16).
> See `docs/README.md` for the documentation map and `docs/product/clearsettle_decision_register.md` for
> the authoritative decisions. Implementation of areas beyond authentication is not yet authorized.

## Layout

- `backend/` — Spring Boot service. Owns OIDC authentication (Keycloak, Authorization Code + PKCE),
  server-side sessions (Spring Session, PostgreSQL), CSRF, and step-up (D-SEC-11 to D-SEC-15).
- `frontend/` — Next.js client-rendered app, served same-origin with the backend (no server-side
  session, no tokens in the browser).
- `deploy/` — local development stack (PostgreSQL, Keycloak, backend, redacting reverse proxy) and the
  F-1 logging regression test. Development tooling only.
- `docs/` — product specification, decision register, ADRs (`docs/product/adr/`), engineering checklist,
  and the implementation status (`docs/product/clearsettle_implementation_status.md`).

## Authentication architecture (M1)

See `docs/product/adr/`:

- ADR-0001 — Identity provider: Keycloak (OIDC Auth Code + PKCE S256).
- ADR-0002 — Session policy: 15-minute idle, 8-hour absolute (not extended by activity).
- ADR-0003 — MFA: universal at login plus step-up for sensitive actions.
- ADR-0004 — SameSite cookie strategy V3 (Strict session cookie + Lax `__Host-CSLOGIN`).

## Build and test (backend)

```bash
cd backend
mvn test        # unit + security-chain tests (no external services required)
mvn package     # build the runnable jar
```

Local end-to-end stack and integration validation: see `deploy/README.md`.

## Security & contribution notes

- Secrets never go in source control; `deploy/.env` is git-ignored and `*.env.example` files carry only
  placeholders. Production secrets come from a secret manager.
- CSRF protection is a `__Host-` double-submit cookie **plus** a required custom header (`X-CS-Request`);
  SameSite is defense-in-depth, not the CSRF control.
- The reverse proxy must redact the OAuth callback query from access logs (F-1); see `deploy/nginx`.
