# ClearSettle — Implementation Status

**Scope so far:** M1 authentication foundation (D-SEC-11 to D-SEC-15). This document records one row per
relevant requirement, per the implementation plan §6. `Verified` requires recorded test evidence; the
status changes in the same commit as the work it describes.

**Status values:** `Not started`, `In progress`, `Implemented`, `Verified`, `Blocked`, `Deferred`.

**Last updated:** 2026-10-16.

## M1 authentication requirements

| Requirement | Milestone | Status | Evidence | Decision deps | Notes (last updated 2026-10-16) |
|---|---|---|---|---|---|
| AC-157 (OIDC/PKCE, state, token validation) | M1 | Not started | — (M0 spike O-01, O-02…O-16, C-PKCE-* demonstrated the design, not product code) | D-SEC-12 | To implement in backend OIDC config + tests |
| AC-158 (exact redirect URI; manipulation rejected) | M1 | Not started | — (M0 C-REDIR-01/02) | D-SEC-12 | Keycloak client config + negative test |
| AC-159 (session+CSRF cookie attributes; no token in storage) | M1 | Not started | — (M0 S-01/S-02) | D-SEC-15 | V3 cookies + storage assertion |
| AC-160 (CSRF missing/forged/cross-session/no-header; safe methods) | M1 | Not started | — (M0 X-01…X-08) | D-SEC-15 | CSRF filter + custom header + tests |
| AC-161 (cross-site form + fetch CSRF) | M1 | Not started | — (M0 X-06/X-07) | D-SEC-15 | Negative tests |
| AC-162 (session id rotation; logout; idle+absolute expiry) | M1 | Not started | — (M0 L-02, T-01, T-02) | D-SEC-13 | Session config + absolute filter + tests |
| AC-163 (sign-out everywhere; removal from workspaces) | M1 | Not started | — (M0 L-03, L-06) | D-SEC-13 | Shared store + global logout |
| AC-164 (step-up; different person; single-use) | M1 | Not started | — (M0 U-01/U-02/U-03) | D-SEC-14 | Step-up flow + tests |
| AC-165 (weak/old/missing claims fail closed) | M1 | Not started | — (M0 U-04) | D-SEC-14 | Fail-closed evidence check |
| AC-166 (same-origin client-rendered frontend; no secrets in bundle) | M1 | Not started | — (M0 N-01/N-02) | D-SEC-11 | Next.js static export + proxy |
| AC-168 (security events w/ correlation id; no secrets in logs) | M1 | Not started | — (M0 G-01/G-02) | D-SEC-11 | Security events + F-1 log redaction |
| NFR-SEC-001 (provider token validation) | M1 | Not started | — | D-SEC-12 | Spring Security OIDC |
| NFR-SEC-020 (same-origin; no tokens in browser) | M1 | Not started | — | D-SEC-11 | |
| NFR-SEC-021 (session lifecycle) | M1 | Not started | — | D-SEC-13 | |
| NFR-SEC-022 (CSRF tokens + custom header; no state change via GET) | M1 | Not started | — | D-SEC-15 | |
| NFR-SEC-024 (fresh-auth evidence) | M1 | Not started | — | D-SEC-14 | |
| NFR-SEC-025 / NFR-SEC-026 (security events; no secrets in logs) | M1 | Not started | — | D-SEC-11 | F-1 mitigation across all intermediaries |

## Finding → control mapping (from the M0 spike)

| Finding | Control in M1 | Status |
|---|---|---|
| F-1 authorization-code log leakage | Query-redacted logging on the callback across every logging intermediary; synthetic-marker regression test | Not started |
| F-2 SameSite × callback | V3: Lax `__Host-CSLOGIN` login-state cookie (ADR-0004) | Not started |
| F-3 ID-token at rest | Examine real Spring Security session contents; avoid access/refresh at rest; minimize claims; document retention | Not started |
| F-4 CSRF / cookie-tossing | `__Host-` CSRF cookie + required custom header + token; negative tests on JSON and no-body endpoints proving the CSRF layer rejects | Not started |
| F-5 cross-browser | Firefox + Chromium tests retained; Safari/WebKit + mobile = explicit gap | Not started |

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
