# ClearSettle — Implementation Status

**Scope so far:** M1 authentication foundation (D-SEC-11 to D-SEC-15). This document records one row per
relevant requirement, per the implementation plan §6. `Verified` requires recorded test evidence; the
status changes in the same commit as the work it describes.

**Status values:** `Not started`, `In progress`, `Implemented`, `Verified`, `Blocked`, `Deferred`.

**Last updated:** 2026-10-16.

## Backend test suite (executed 2026-10-16 — 34 tests, all passing)

Run in the Maven docker image (`mvn test`): `AuthPropertiesTest` (4), `FreshAuthEvaluatorTest` (9),
`CookieSerializerTest` (1), `AbsoluteTimeoutFilterTest` (4), `RequiredHeaderFilterTest` (4),
`LoginStateCookieRepositoryTest` (5), `LoginSuccessMfaGateTest` (2), `SecurityChainSliceTest` (5). The
slice test loads the real `SecurityConfig` against H2 (no Keycloak/PostgreSQL needed).

## M1 authentication requirements

Status values per the plan §6. `Verified` = recorded automated test evidence here; `Implemented` = code
present, verification requires the live stack (integration, see `deploy/`); `Outstanding` = not yet built.

| Requirement | Milestone | Status | Evidence | Decision deps | Notes (2026-10-16) |
|---|---|---|---|---|---|
| AC-157 (OIDC/PKCE, state, token validation) | M1 | Implemented | code: `ClientRegistrationConfig` (PKCE requireProofKey), Spring Security OIDC validation | D-SEC-12 | End-to-end verification against live Keycloak is Outstanding (deploy/ step 1–2) |
| AC-158 (exact redirect URI) | M1 | Implemented | code: fixed exact `redirectUri` in `ClientRegistrationConfig`; dev realm exact `redirectUris` | D-SEC-12 | Live rejection test Outstanding (deploy/ step 3) |
| AC-159 (cookie attributes; no token in storage) | M1 | **Verified** (cookie attrs) / Implemented (storage) | `CookieSerializerTest`, `LoginStateCookieRepositoryTest`; frontend `lib/api.js` reads no token | D-SEC-15 | Runtime no-secrets-in-storage check Outstanding |
| AC-160 (CSRF missing/forged/no-header; safe methods) | M1 | **Verified** | `SecurityChainSliceTest`, `RequiredHeaderFilterTest` (missing token → CSRF-layer reject; token+no-header → 403 custom_header_missing; GET safe) | D-SEC-15 | Forged/cross-session token variants via integration Outstanding |
| AC-161 (cross-site form + fetch CSRF) | M1 | Implemented | CSRF controls in place | D-SEC-15 | Browser-level verification Outstanding (deploy/ step 8) |
| AC-162 (session rotation; logout; idle+absolute) | M1 | **Verified** (absolute) / Implemented | `AbsoluteTimeoutFilterTest` (absolute, not extended by activity); `changeSessionId`, logout handler in `SecurityConfig` | D-SEC-13 | Idle at 15 min + logout e2e Outstanding (deploy/ step 6–7) |
| AC-163 (sign-out everywhere; removal) | M1 | Implemented | `AuthController.logoutEverywhere`, `CurrentUserFilter` (per-request DB re-check) | D-SEC-13 | Cross-instance + removal e2e Outstanding |
| AC-164 (step-up; different person; single-use) | M1 | Implemented | `StepUpService` (single-use claim), resolver, `LoginHandlers.Success` same-user binding | D-SEC-14 | e2e against Keycloak Outstanding (deploy/ step 5) |
| AC-165 (weak/old/missing claims fail closed) | M1 | **Verified** (logic) | `FreshAuthEvaluatorTest` (9 cases) | D-SEC-14 | e2e with mock/real IdP Outstanding |
| AC-166 (same-origin client-rendered frontend; no secrets) | M1 | Implemented | `frontend/` static export (`output: export`); `deploy/nginx` single origin | D-SEC-11 | Build + bundle secret-scan Outstanding |
| AC-168 (security events; no secrets in logs; F-1) | M1 | Implemented | `SecurityEvents` + correlation-id filter; `deploy/nginx` callback redaction | D-SEC-11 | F-1 regression run Outstanding (deploy/ step 9) |
| NFR-SEC-022 (CSRF token + custom header; no state via GET) | M1 | **Verified** | `SecurityChainSliceTest`, `RequiredHeaderFilterTest` | D-SEC-15 | |
| D-SEC-14 universal MFA gate at login | M1 | **Verified** (gate) | `LoginSuccessMfaGateTest` (non-MFA login refused, no provisioning; MFA login proceeds), `AuthPropertiesTest` | D-SEC-14 | e2e with MFA-requiring Keycloak Outstanding |

## Finding → control mapping (from the M0 spike)

| Finding | Control in M1 | Status |
|---|---|---|
| F-1 authorization-code log leakage | Callback query-redacted logging (`deploy/nginx/nginx.conf` `auth_redacted`); regression script `deploy/f1-logging-regression.sh` | Implemented; regression run Outstanding (needs stack) |
| F-2 SameSite × callback | V3 Lax `__Host-CSLOGIN` login cookie (`LoginStateCookieRepository`) | **Verified** (cookie round-trip/attrs: `LoginStateCookieRepositoryTest`); Strict-callback e2e Outstanding |
| F-3 ID-token at rest | No access/refresh token requested; only the ID token is in the principal; retention bounded by idle+absolute | Implemented; real session-store inspection Outstanding |
| F-4 CSRF / cookie-tossing | `__Host-` CSRF cookie + required custom header + token (both mandatory) | **Verified** (CSRF-layer rejection, not content-type: `SecurityChainSliceTest`); same-site cookie-toss e2e Outstanding |
| F-5 cross-browser | Server-side controls do not depend on SameSite | Firefox+Chromium + Safari/mobile e2e Outstanding |

## Decision formalization (increment 1)

| Item | Status | Evidence |
|---|---|---|
| ADR-0001…0004 created; decision register updated (D-SEC-12…15; OQ-34/38/55/57 resolved) | Implemented | `docs/product/adr/`, `docs/product/clearsettle_decision_register.md` |

## Outstanding / flagged for owner

- Live Cognito/Auth0 validation (billable) — not performed, not authorized.
- Universal-MFA-at-login enforcement — must be implemented and tested (not proven by M0 step-up tests).
- MFA enrolment and reset/recovery policy — FLAG (proposed: no self-service reset; admin, identity-proofed, audited).
- Sensitive-action set and freshness window — FLAG (proposed default 5 minutes).
- Safari/WebKit + mobile browser compatibility — explicit gap.
- Second-factor type (TOTP vs WebAuthn; SMS discouraged) — FLAG.
