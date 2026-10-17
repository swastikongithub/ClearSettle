# ClearSettle — Implementation Status

**Scope so far:** M1 authentication foundation (D-SEC-11 to D-SEC-15). This document records one row per
relevant requirement, per the implementation plan §6. `Verified` requires recorded test evidence; the
status changes in the same commit as the work it describes.

**Status values:** `Not started`, `In progress`, `Implemented`, `Verified`, `Blocked`, `Deferred`. A row
that is verified only in part says so (`Verified (…) / Implemented (…)`) and names what is not verified.

**Last updated:** 2026-10-17 (M1 live integration validation).

**M1 is not complete.** The live validation verified the authentication path end to end in the browser
engines listed below, but owner decisions, real Safari/mobile browsers and several acceptance-criterion
parts remain outstanding (last section).

## Evidence levels

| Level | Meaning | Where |
|---|---|---|
| Unit / slice | Backend tests that need no stack (`cd backend && mvn test`); the slice test loads the real `SecurityConfig` against H2 | 50 tests, below |
| Integration (live) | The local dev stack (`deploy/`): real Keycloak, PostgreSQL, nginx and backend; assertions on the API, the database, the Keycloak admin API and container logs | `e2e/run.mjs`, `e2e/longrun.mjs`, `deploy/f1-logging-regression.sh` |
| Browser (live) | Playwright browser engines performing the real login (password + TOTP) against that stack | Chromium, Firefox, WebKit as bundled with Playwright 1.64.1 |
| Emulated device | Playwright device descriptors: viewport, user agent and touch only. Not a real device or mobile browser | Pixel 7 (Chromium engine), iPhone 15 (WebKit engine) |
| Unverified | Not tested | listed per row and at the end |

Result statuses: `PASS`, `FAIL`, `ERROR` (could not run), `ENGINE-LIMITATION` (a browser-jar SameSite
assertion in an engine that implements no SameSite) and `NOT-OBSERVABLE` (the engine exposes no
`Set-Cookie` headers to the harness). **Only `PASS` counts as verified.**

## Backend unit and slice tests — 50 tests, all passing

Run with `mvn test` (Maven docker image, offline repository), 2026-10-17, on the code in this commit.

| Class | Tests | Covers |
|---|---|---|
| `FreshAuthEvaluatorTest` | 12 | fail closed on missing, weak or malformed `acr`; missing, malformed, stale or future `auth_time`; missing or empty `amr`; passes with strong `acr`, fresh `auth_time` and `otp` in `amr` |
| `LoginSuccessMfaGateTest` | 11 | login gate: weak `acr`, or `amr` missing or without a second factor, is refused and nothing is provisioned; step-up: absolute anchor carried over and originating session retired; missing originating session fails closed; a different person (both cookie paths) ends the originating session; refusals for insufficient MFA or a disabled user end it; a callback inside the originating session keeps it |
| `SecurityChainSliceTest` | 7 | unauthenticated API refused; authenticated GET; unsafe POST without CSRF token refused by the CSRF layer, without the custom header refused, with both accepted; session store is the JDBC repository; no access/refresh token retained |
| `AuthPropertiesTest` | 5 | approved defaults (8 h absolute, 5-minute freshness); provider-aware `acr`; `amr` any-of requirement fails closed |
| `LoginStateCookieRepositoryTest` | 5 | `__Host-CSLOGIN` V3 attributes; round trip; a tampered cookie is treated as absent; state mismatch; removal expires the cookie |
| `AbsoluteTimeoutFilterTest` | 4 | 8-hour absolute lifetime anchored to authentication, refused despite activity |
| `RequiredHeaderFilterTest` | 4 | `X-CS-Request` required on unsafe methods; GET exempt |
| `CookieSerializerTest` | 1 | session cookie `__Host-`, `Secure`, `HttpOnly`, `SameSite=Strict` |
| `NonRetainingAuthorizedClientRepositoryTest` | 1 | no authorized client (access/refresh token) is ever stored or returned |

## Live integration validation — local dev stack, 2026-10-17

Stack (`deploy/`, compose project `clearsettle-dev`): PostgreSQL 17.11, Keycloak 26.8.1 (dev realm, MFA
browser flow, TOTP), Spring Boot 4.1.1 backend, nginx 1.30.6 proxy, frontend static export (Next.js
16.4.1). Synthetic users are created at run time with random passwords. Raw results are written to
`e2e/results/` (git-ignored). All runs were sequential, against the final backend code.

| Run | Tests | PASS | ENGINE-LIMITATION | NOT-OBSERVABLE | FAIL | ERROR |
|---|---|---|---|---|---|---|
| Chromium (browser) | A, P, B, C, D, E, H, K, G | 43 | 0 | 0 | 0 | 0 |
| Firefox (browser) | A, B, C, D, E, H, K, G | 35 | 0 | 0 | 0 | 0 |
| WebKit (browser; engine proxy, not Safari) | A, B, C, D, E, H, K, G | 32 | 2 (C-01, C-02) | 1 (C-05) | 0 | 0 |
| Pixel 7 (emulated, Chromium) | A, B, C, E, H | 27 | 0 | 0 | 0 | 0 |
| iPhone 15 (emulated, WebKit) | A, B, C, E, H | 23 | 2 (C-01, C-02) | 1 (C-05) | 0 | 0 |
| Wall clock, Chromium (`longrun.mjs`) | LR-01, LR-02 | 2 | — | — | 0 | 0 |
| F-1 logging regression (`--with-upstream-failure`) | 1 | 1 | — | — | 0 | 0 |

- **WebKit C-01/C-02 (`ENGINE-LIMITATION`):** Playwright's WebKit build on Windows implements no SameSite.
  It stores the server's `SameSite=Strict` cookies as `None` and sends them on cross-site link, 302,
  POST→302 and form-POST navigations. Chromium and Firefox store `Strict` and send it on none of them
  (`e2e/engine-samesite-probe.mjs`, no stack needed). The server's attributes are the same for every
  engine (C-05 PASS in Chromium and Firefox).
- **WebKit C-05 (`NOT-OBSERVABLE`):** Playwright's WebKit exposes no `Set-Cookie` response headers to the
  harness.
- In that engine every CSRF test (E-01…E-10) still passed with the victim's cookies attached: the CSRF
  defense does not depend on SameSite.

Test groups (titles and requirement links in `e2e/run.mjs`):

- **A** preflight, every run: the proxy serves the app shell, its script runs against the API, and
  anonymous visits create no server-side session.
- **P** protocol (Chromium only; browser-independent): authorization request (code, PKCE S256, state,
  nonce, exact redirect URI, login-state cookie); PKCE required; unregistered redirect URI refused; forged
  callback; issuer consistency; client and realm configuration (ACR, AMR mapper).
- **B** login and universal MFA: mandatory enrolment, then no session for the enrolment login itself;
  `(iss, sub)` identity; persisted ID-token evidence and no access/refresh token; password + OTP on every
  login; wrong OTP; password-only token from a misconfigured IdP refused (B-06, Chromium only: it
  reconfigures the IdP).
- **C** cookies and storage; **D** sessions (PostgreSQL store, fixation, idle and absolute expiry at
  controlled time, logout, sign-out-everywhere, disable); **E** CSRF (E-01…E-10); **H** step-up (H-01…H-05);
  **K** sibling-subdomain cookie tossing; **G** secret and log scan plus AC-168 events.
- **LR** production values on the wall clock: 15-minute idle, 5-minute freshness.

## M1 authentication requirements

| Requirement | Status | Unit / slice | Live integration / browser | Not verified | Decision deps |
|---|---|---|---|---|---|
| AC-157 OIDC request, tampered callbacks, events | Verified (request, forged and replayed callbacks) / Implemented (token tampering) | — (Spring Security OIDC validation) | P-01, P-02, P-04 (forged callback: no session), H-02 (replay), P-05; rejected callbacks recorded as `login_failure` events (G-01) | Callbacks with a code from another login (PKCE verifier mismatch), a mismatched `nonce`, or ID tokens with a wrong issuer or audience, an expired `exp` or an invalid signature: needs a test IdP or token-tampering harness | D-SEC-12 |
| AC-158 exact redirect URI | Verified | — | P-03 (Keycloak refuses an unregistered redirect URI; no code), P-06 (exact URIs registered) | — | D-SEC-12 |
| AC-159 cookies; no token in storage | Verified (Chromium, Firefox) | `CookieSerializerTest`, `LoginStateCookieRepositoryTest` | C-01, C-02, C-05 (attributes); C-03 (no OIDC token in cookies, `localStorage` or `sessionStorage`; session cookie not script-readable) in all three engines | SameSite in the browser jar of WebKit (engine limitation); IndexedDB not inspected (the frontend uses none); real Safari/mobile | D-SEC-15 |
| AC-160 CSRF: missing, forged, cross-session token, no header; safe methods | Verified | `SecurityChainSliceTest`, `RequiredHeaderFilterTest` | E-01, E-02, E-06, E-03 (all rejected, nothing changed), E-04/E-05 (CSRF layer before routing), E-10 (positive control); all three engines and both emulations | GET inventory is by code inspection: `GET /api/me`, `/api/session`, `/api/csrf` (issues the CSRF cookie only) change no state; logout and sign-out-everywhere are POST | D-SEC-15 |
| AC-161 cross-site form POST and fetch | Verified | — | E-08 (form POST reaches the server, rejected by CSRF), E-09 (credentialed fetch blocked, response unreadable, nothing changed); all three engines | — | D-SEC-15 |
| AC-162 rotation, logout, idle, absolute | Verified (rotation, logout, idle, absolute) / Not started (expiry warning) | `AbsoluteTimeoutFilterTest` | D-02 (rotation; pre-login id refused), D-05 (logout: session row deleted, old cookie refused), D-03 and LR-01 (idle: controlled time and 15 min on the wall clock), D-04 (8 h despite activity, controlled time), D-01 (900 s idle in the store) | Cookie clearing on logout is not asserted; pre-expiry warning not built | D-SEC-13 |
| AC-163 sign-out everywhere; removal | Verified (one instance) / Not started (workspace removal) | — | D-06 (two browsers: both refused, 0 rows), D-07 (disabled user refused on the next request, 0 rows), H-05 | Two application instances; removal from every workspace (workspaces are not built yet) | D-SEC-13 |
| AC-164 step-up; different person; review, no replay | Verified (step-up flow) / Implemented, not wired (single-use confirmation) | `LoginSuccessMfaGateTest` (step-up cases) | H-01 (`prompt=login`, `max_age=0`, `acr_values=mfa`; review page rendered; action still PENDING; anchor unchanged), H-02, H-03, H-04 (different person: refused, originating session ended, action not executed), H-05 | The `step_up_required` response of a sensitive operation and the explicit single-use confirmation: no sensitive operation exists yet; `StepUpService.claim` has no caller and no test (needs a PostgreSQL test with concurrent confirms when wired) | D-SEC-14 |
| AC-165 weak, old or missing claims fail closed | Verified (logic; live subset) | `FreshAuthEvaluatorTest` (12), `AuthPropertiesTest`, `LoginSuccessMfaGateTest` | B-06 (password-only token refused at login), B-01 (`amr`-less enrolment login refused), LR-02 (stale after 5 min while the session is valid) | A test IdP issuing tokens without claims at a sensitive operation (none exists yet) | D-SEC-14 |
| AC-166 same-origin static frontend; no secrets | Verified | — | Build: static export, routes `/`, `/_not-found`, `/review`, no Next.js server; A-01 (served by the proxy on the API's origin) in all engines; bundle scan (2026-10-17): 28 files, 0 `.env` values, no JWT, private key or client-secret string | — | D-SEC-11 |
| AC-168 events with correlation ids; no secrets in logs | Verified | — | G-01 in all three engines: no observed password, TOTP secret, authorization code, `state`, `session_state`, ID token, session or CSRF cookie value, session id, CSRF token or `.env` value in the proxy, backend, Keycloak or PostgreSQL logs or the `security_event` table; every event has a correlation id; `login_success`, `login_failure`, `step_up_success`, `logout`, `logout_everywhere` and `csrf_rejected` recorded. F-1 script PASS | Production logging intermediaries (CDN/LB/WAF/APM) | D-SEC-11 |
| NFR-SEC-022 CSRF token + custom header; no state via GET | Verified | as AC-160 | as AC-160, AC-161, E-07, K-01 | — | D-SEC-15 |
| NFR-SEC-023 session lifecycle | Verified (limits, rotation, logout, sign-out-everywhere, disable) / Not started (restore invalidation, privileged-role trigger) | as AC-162 | as AC-162, AC-163 | Invalidation of restored sessions after a database restore; workspace/role triggers | D-SEC-13 |
| NFR-SEC-026 MFA enrolment and recovery | Verified (enrolment) / Not started (recovery) | — | B-01 (enrolment mandatory; no session until an enrolled factor is verified) | Recovery and MFA reset (policy FLAG); external security review required | D-SEC-14 |
| D-SEC-14 universal MFA gate at login | Verified | `LoginSuccessMfaGateTest`, `AuthPropertiesTest` | B-01, B-04, B-05, B-06; B-03 (`acr=mfa` backed by `amr` containing `otp`) | — | D-SEC-14 |
| D-SEC-11 sessions in PostgreSQL (Spring Session JDBC) | Verified | `SecurityChainSliceTest` (`sessionStoreIsTheJdbcRepository`) | D-01; session counts read from `spring_session` throughout | Several backend instances | D-SEC-11 |

## Finding → control mapping (from the M0 spike)

| Finding | Control in M1 | Status |
|---|---|---|
| F-1 authorization-code log leakage | nginx `auth_redacted` access-log format and `error_log /dev/null` on the callback route; `deploy/f1-logging-regression.sh` reads `docker logs`, requires a canary and checks the upstream-failure path | **Verified** (F-1 script PASS; G-01: no callback line logged with its query). Must be replicated on every logging intermediary of a real deployment |
| F-2 SameSite × callback | V3: Lax `__Host-CSLOGIN` (`LoginStateCookieRepository`); step-up nonce for the cross-site step-up callback | **Verified** (every login and step-up in every engine; C-05 shows `SameSite=Lax`, `Max-Age=300`) |
| F-3 tokens at rest | Only the ID token is kept, in the session; `NonRetainingAuthorizedClientRepository` keeps no access or refresh token (Spring's default kept them in memory, uncleared by logout); retention bounded by idle and absolute limits | **Verified** (B-03; slice and unit tests) |
| F-4 CSRF / cookie tossing | `__Host-` CSRF cookie + required custom header + token, all mandatory | **Verified** (E-07 same-site tossing on a no-body endpoint, K-01 sibling-subdomain `__Host-` tossing, C-04 `__Host-` prefix rules; E-01…E-10 in all three engines) |
| F-5 cross-browser | Server-side controls do not depend on SameSite | **Verified** in Chromium, Firefox and Playwright WebKit (engines); emulated Pixel 7 / iPhone 15. Real Safari, iOS and Android browsers **unverified** |

## Defects found by the live validation and fixed

Each fix has a regression test; commit hashes are on branch `m1/auth-foundation`.

| # | Defect | Fix | Regression evidence | Commit |
|---|---|---|---|---|
| 1 | Keycloak 26 refused to import the realm (`comment` field) | field removed | stack start; P-06, P-07 | 7cd3389 |
| 2 | The realm file name was not `<realm>-realm.json`, so Keycloak ignored it | renamed `clearsettle-realm.json` | stack start; P-06 | 7cd3389 |
| 3 | Sessions were not stored in PostgreSQL: Spring Boot 4 needs `spring-boot-starter-session-jdbc`, and a test stub had masked it | starter added; test uses the real JDBC repository | `sessionStoreIsTheJdbcRepository`; D-01 | c8035db |
| 4 | The F-1 script could never detect a leak: it read log files that the nginx image symlinks to stdout | reads `docker logs`; canary makes a vacuous pass impossible | F-1 script | db0fa76 |
| 5 | With the backend down, nginx's error log recorded the full callback request line (code, state) | `error_log /dev/null` on the callback route | F-1 `--with-upstream-failure` | db0fa76 |
| 6 | nginx failed to start without the backend and kept a stale backend IP | Docker DNS resolver with a per-request upstream | F-1 (backend stop/start) | db0fa76 |
| 7 | F-3: Spring's default authorized-client store kept every user's access and refresh tokens in memory | `NonRetainingAuthorizedClientRepository` | unit + `noAccessOrRefreshTokensAreRetained`; B-03 | 71b01a9 |
| 8 | `acr=mfa` alone admitted the enrolment login, which verified no enrolled factor (`amr` empty) | MFA requires `acr=mfa` and `amr` containing `otp` | `FreshAuthEvaluatorTest`, `LoginSuccessMfaGateTest`; B-01 | 57a4eb4 |
| 9 | Step-up under Strict ran in a new session: the absolute anchor reset, the originating session lingered, and a different-person mismatch did not end the victim's session | nonce in the originating session and `__Host-CSLOGIN`; the callback finds, carries over and retires the originating session | unit step-up tests; H-01, H-04 | 57a4eb4 |
| 10 | In an engine without SameSite the step-up callback runs inside the originating session, and an id-based guard deleted the live session | address the originating session by the id it was found under | `stepUpCallbackInsideTheOriginatingSessionKeepsItAndItsAnchor`; H-01 (WebKit) | 57a4eb4 |
| 11 | A refused step-up left the stored originating session alive (rotated id), and in the Strict path MFA-failure or disabled-user refusals orphaned it | every step-up refusal ends the originating session by its stored id | three unit tests; H-04, H-05 | 57a4eb4 |

Test-harness and environment issues found and fixed (not product defects): result redaction, a `kcadm`
configuration race between concurrent runs, a header-read race in C-05, a vacuous H-04 precondition, and a
stale frontend bind mount after a rebuild (now caught by A-01; see `deploy/README.md`).

## Decision formalization (increment 1)

| Item | Status | Evidence |
|---|---|---|
| ADR-0001…0004 created; decision register updated (D-SEC-12…15; OQ-34/38/55/57 resolved) | Implemented | `docs/product/adr/`, `docs/product/clearsettle_decision_register.md` |
| M1 verification and implementation notes (D-SEC-11…15, ADR-0003, ADR-0004) | Implemented | decision text unchanged |

## Outstanding / flagged for owner

Owner decisions (FLAG):

- **Enrolment login creates no session** (strict reading of the MFA evidence; the user signs in once more
  with the enrolled code). Confirm, or accept a first-login exception.
- **Sensitive-action set and freshness window** (proposed default 5 minutes). Until decided there is no
  sensitive operation, so the `step_up_required` response and the single-use confirmation are not wired.
- **MFA recovery / reset policy** (proposed: no self-service reset; administrative, identity-proofed,
  audited). NFR-SEC-026 also requires an external security review before production.
- **Second-factor type** (TOTP vs WebAuthn/passkeys; SMS discouraged).

Not yet verified or not yet built:

- Real Safari (macOS) and iOS/Android browsers: **unverified**. Playwright WebKit is an engine proxy and
  device emulation changes only viewport, user agent and touch.
- External-deep-link re-entry UX under `SameSite=Strict` (ADR-0004): not built.
- AC-157 token-tampering cases (PKCE verifier mismatch, `nonce`, issuer, audience, expiry, signature): need
  a test IdP or tampering harness.
- AC-163 across two application instances; removal from every workspace (workspaces arrive later).
- AC-162 cookie clearing on logout (not asserted) and the pre-expiry warning (not built).
- `StepUpService.claim` (single-use confirmation): no caller and no test yet.
- Restored-session invalidation after a database restore (NFR-SEC-023).
- F-1 redaction on every logging intermediary of a real deployment.
- Live Cognito/Auth0 validation: not performed, not authorized (billable).
- The designed authentication UI (frontend-design task): the current pages are integration scaffolds.
