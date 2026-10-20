# ClearSettle — Implementation Status

**Scope so far:** M1 authentication foundation (D-SEC-11 to D-SEC-19), the first frontend increment, the
application shell (D-UI-07 to D-UI-13), and the backend session revocation (OIDC back-channel logout, step 2
of D-UI-13). This document records one row per
relevant requirement, per the implementation plan §6. A requirement is marked verified only with recorded
test evidence; the status changes in the same commit as the work it describes.

**Last updated:** 2026-10-20 (backend session revocation: OIDC back-channel logout, verified on two
instances against PostgreSQL and live against Keycloak; P-09, R-02, M-07, M-08 and the wall-clock LR-05; and a
realm correction: `amr` keeps `otp` when the code is exchanged after the OTP step, defect 14; then the results
per browser engine on the final code). Earlier the same
day: the application shell (sign-in states, return to the page asked for,
the idle warning, Security and sessions, the review page; browser group U). Previously, 2026-10-19: owner approval of
the frontend design defaults, the PostgreSQL user-provisioning fix, reviewed-version binding for sensitive
actions, dev-fixture gating.

**M1 is not complete.** The authentication path is verified end to end in the browser engines listed below,
but real Safari and mobile browsers, MFA-recovery tooling (the identity-verification procedure, and ending
the sessions back-channel logout cannot reach), integration with real sensitive operations,
restored-session invalidation and production logging intermediaries remain (last section). The application
shell is built (below), but most of its sections wait for backends that don't exist. The rest of the planned
M1 scope (workspaces, tenant isolation, audit core; implementation plan §5) has not started.

## Status values

| Status | Meaning |
|---|---|
| Verified (unit) | Backend tests without the stack: unit tests, the real security filter chain on H2, the real OIDC client against a controlled test provider |
| Verified (PostgreSQL) | Backend tests against a disposable PostgreSQL 17.11 database (the production engine) |
| Verified (live) | The local dev stack: real Keycloak, PostgreSQL, nginx and backend; assertions on the API, the database, the Keycloak admin API and container logs |
| Verified (browser) | Playwright browser engines performing the real sign-in (password + TOTP) against that stack |
| Implemented, not fully verified | Built; part of the behaviour has no test evidence (named in the row) |
| Outstanding | Not built, or not tested |
| Blocked (infrastructure) | Needs infrastructure this environment does not have (named in the row) |

Emulated devices (Playwright device descriptors: viewport, user agent, touch) are reported separately; they
are not real devices or mobile browsers. Result statuses in the live runs: `PASS`, `FAIL`, `ERROR` (could not
run), `ENGINE-LIMITATION` (a browser-jar SameSite assertion in an engine that implements no SameSite) and
`NOT-OBSERVABLE` (the engine exposes no `Set-Cookie` headers). **Only `PASS` counts as verified.**

## Owner decisions of 17 October 2026

| Decision | Recorded in | Implementation | Status |
|---|---|---|---|
| D-SEC-16 The sign-in that enrols TOTP creates no session; the user signs in once more | Register D-SEC-16; ADR-0003 decision 1 | Refusal code `mfa_not_verified` (distinct from `mfa_required`) and an explanation on the landing page | Verified (unit, browser): `LoginSuccessMfaGateTest`, `OidcCallbackValidationTest`; B-01, B-07, R-02. The designed screen is part of the frontend milestone |
| D-SEC-17 Sensitive operations: 5-minute freshness, step-up, single-use confirmation | Register D-SEC-17; ADR-0002; ADR-0003 decision 2 | `SensitiveOperation`, `SensitiveActions`, `/api/sensitive-actions/{id}` (review, confirm, cancel); configurable window and pending-action lifetime; since 19 October, every operation declares the version of what the user reviews, and a confirmation is refused (`409 action_changed`) and the action withdrawn if it changed | Verified (unit, PostgreSQL, browser) with fixtures. **Outstanding:** integration with real sensitive operations (none exists yet); the first one (posting approval) must implement the version check under lock and re-check workspace permission at confirmation. The no-op fixture is not evidence that financial operations are protected |
| D-SEC-18 MFA recovery: administrator-assisted, identity-verified, audited; no self-service reset | Register D-SEC-18; ADR-0003 decision 3 | Keycloak realm: no password or OTP reset by email, no self-service factor removal, admin and user events stored, brute-force detection. Since 20 October, OIDC back-channel logout (`BackChannelLogout`): the administrator's sign-out of the user at Keycloak ends the user's ClearSettle sessions | Verified (live, browser) for the IdP controls: P-08, R-01, R-02, B-08; the end of the user's sessions on reset: R-02, M-07, `BackChannelLogoutPostgresTest`. **Outstanding:** identity-verification procedure; sessions back-channel logout cannot reach (a ClearSettle session that outlived its Keycloak session, LR-05) need an audited ClearSettle-side revocation; audit integration and retention; external review |
| D-SEC-19 TOTP for every user | Register D-SEC-19; ADR-0003 decision 4 | Existing Keycloak TOTP policy; enrolment forced even without the required action | Verified (live, browser): P-07, P-08, B-01, B-04, B-07 |

The sensitive-action categories (posting approval, period reopening, role and permission changes,
offboarding steps, template activation and sensitive settings, original-file download) are documented in
D-SEC-17; no route is classified yet because none of those features exists.

## Backend tests — 121, all passing

`mvn test` (Maven 3.9 container, offline repository), 2026-10-20, with `CS_TEST_PG_URL` pointing at a
disposable PostgreSQL 17.11 database: 119 tests pass and 2 are skipped. The 95 H2 tests also run without a
database; the 24 PostgreSQL tests are skipped there. The 2 skipped tests are the diagnostic reproduction of
the Spring Session JDBC behaviour behind defect 12: planner-dependent, outside the standard suite, run on
request with `CS_TEST_PG_DIAGNOSTICS=true` (both pass, 2026-10-19).

| Class | Tests | Covers |
|---|---|---|
| `OidcCallbackValidationTest` | 18 | The real client registration (from OIDC discovery), filter chain and Spring Session JDBC against a controlled test provider. Positive control (PKCE S256, `state`, `nonce`, exact redirect URI, code redeemed only after client authentication, redirect URI and PKCE verifier matched; session persisted; user provisioned on `(iss, sub)`; no access or refresh token in the session). Refused, with no persisted security context, no provisioned user and one security event each: forged signature, `alg=none`, HS256 signed with the client secret, wrong issuer, wrong audience, expired token, missing `nonce`, mismatched `nonce`, token response without an ID token, wrong `state` (no code redeemed), missing or tampered login-state cookie, a code from another login (PKCE mismatch), a replayed callback, a valid token without a verified second factor (`mfa_not_verified`), a password-only token (`mfa_required`). The redirect URI never depends on the request host |
| `SensitiveActionFlowTest` | 18 | Through the real security chain with a test-only sensitive operation: a fresh request answers `202` and runs nothing; older than 5 minutes, or weak, missing or future-dated evidence answers `401 step_up_required`; the reviewed parameters execute exactly once on confirmation; replay, cancelled, expired, unknown and another user's actions are refused and run nothing; confirmation needs the CSRF token and the custom header; a failed operation rolls back its claim and its effect; an unregistered type never runs; every step is a security event. What executes is what was reviewed: a change after the review, or one the operation detects under lock, is refused with `409 action_changed`, runs nothing and withdraws the action; an action without a reviewed version never runs |
| `PendingActionPostgresTest` | 4 | On PostgreSQL 17.11: 12 concurrent confirmations execute the action exactly once; a failed operation rolls back the claim; expiry follows the application clock; another user's claim does not match |
| `AppUserServicePostgresTest` | 5 | On PostgreSQL 17.11, the production provisioning statement: first sign-in creates the user and later ones return it unchanged; identity is `(iss, sub)`, not email; 10 rounds of 16 simultaneous first sign-ins of one identity, each inside a caller transaction that keeps working afterwards, create exactly one user and abort no transaction; the conflict path returns the existing row with `disabled` and email unchanged; simultaneous sign-ins of different identities do not interfere. Run against the previous implementation, two of these fail with `25P02 current transaction is aborted` and `user provisioning failed` |
| `BackChannelLogoutPostgresTest` | 13 | On PostgreSQL 17.11, two application instances (separate Spring contexts) on one session store, signing in through the real filter chain: OIDC back-channel logout ends only the named sessions, on both instances, and nothing of another user's; the old cookie cannot restore a session, and a request in flight cannot save it back; replays (also 8 simultaneous copies of one token) act once; forged, invalid, stale and malformed tokens end nothing and are recorded; the handler never needs two database connections at once; sign out everywhere still ends every session. See "Backend session revocation" |
| `BackChannelLogoutHandlerTest` | 2 | A failed revocation releases the logout token, so the provider can deliver it again; the recorded registration is sanitised and short |
| `StepUpOriginPostgresTest` | 2 | On PostgreSQL 17.11 with the real Spring Session JDBC store, deterministically: when the principal index returns sessions without their attributes (the worst case of defect 12), the step-up still finds and retires its originating session and keeps its anchor; a nonce no stored session carries fails closed and touches nothing |
| `SpringSessionPrincipalQueryDiagnosticTest` | 2 (diagnostic) | Not in the standard suite (`CS_TEST_PG_DIAGNOSTICS=true`): reproduces the library's split sessions on PostgreSQL once statistics are current, and the step-up working through the library's own index. Planner-dependent by nature; use it to check a Spring Session upgrade |
| `DevFixtureGatingTest` | 5 | The no-op dev operation is absent by default, absent with only the property or only the `local-dev` profile, present with both on a loopback origin, and stops the application on any other origin |
| `FreshAuthEvaluatorTest` | 12 | Fail closed on missing, weak or malformed `acr`; missing, malformed, stale or future `auth_time`; missing or empty `amr`; passes with strong `acr`, fresh `auth_time` and `otp` in `amr` |
| `LoginSuccessMfaGateTest` | 12 | Login gate (`mfa_required` for weak `acr`; `mfa_not_verified` for a strong `acr` without a second-factor `amr`; nothing provisioned); step-up: anchor carried over, originating session retired (also when the principal index returns partial sessions), missing origin fails closed, a different person or a refused step-up ends the originating session, a callback inside the originating session keeps it |
| `SecurityChainSliceTest` | 8 | Unauthenticated API refused; authenticated GET; unsafe POST without CSRF token refused by the CSRF layer, without the custom header refused, with both accepted; session store is the JDBC repository; no access/refresh token retained; the dev fixture is not registered unless enabled |
| `AuthPropertiesTest` | 5 | Approved defaults (8 h absolute, 5-minute freshness); provider-aware `acr`; `amr` any-of requirement fails closed |
| `LoginStateCookieRepositoryTest` | 5 | `__Host-CSLOGIN` V3 attributes; round trip; a tampered cookie is treated as absent; state mismatch; removal expires the cookie |
| `AbsoluteTimeoutFilterTest` | 4 | 8-hour absolute lifetime anchored to authentication, refused despite activity |
| `RequiredHeaderFilterTest` | 4 | `X-CS-Request` required on unsafe methods; GET exempt |
| `CookieSerializerTest` | 1 | Session cookie `__Host-`, `Secure`, `HttpOnly`, `SameSite=Strict` |
| `NonRetainingAuthorizedClientRepositoryTest` | 1 | No authorized client (access/refresh token) is ever stored or returned |

## Live integration and browser validation — local dev stack, 2026-10-17

Stack (`deploy/`, compose project `clearsettle-dev`): PostgreSQL 17.11, Keycloak 26.8.1 (dev realm, MFA
browser flow, TOTP, the recovery hardening of D-SEC-18), Spring Boot 4.1.1 backend with the dev-only no-op
sensitive operation, nginx 1.30.6 proxy, frontend static export (Next.js 16.4.1). Synthetic users are
created at run time with random passwords. Raw results are in `e2e/results/` (git-ignored). All runs were
sequential. The full suites below ran on the backend as of `c9585b3`, before defect 12's fix (`602a24d`); that
fix changes only how the step-up callback finds the originating session, so the groups that exercise it
(H, G and the wall-clock run) were run again on the final build (second table).

| Run | Groups | PASS | ENGINE-LIMITATION | NOT-OBSERVABLE | FAIL | ERROR |
|---|---|---|---|---|---|---|
| Chromium (browser) | A, P, B, C, D, E, H, R, K, G | 52 | 0 | 0 | 0 | 0 |
| Firefox (browser) | A, B, C, D, E, H, R, K, G | 43 | 0 | 0 | 0 | 0 |
| WebKit (browser; engine proxy, not Safari) | A, B, C, D, E, H, R, K, G | 40 | 2 (C-01, C-02) | 1 (C-05) | 0 | 0 |
| Pixel 7 (emulated, Chromium) | A, B, C, E, H | 32 | 0 | 0 | 0 | 0 |
| iPhone 15 (emulated, WebKit) | A, B, C, E, H | 28 | 2 (C-01, C-02) | 1 (C-05) | 0 | 0 |
| Two application instances (Chromium) | A, M, G | 9 | — | — | 0 | 0 |
| Wall clock, Chromium (`longrun.mjs`) | LR-01…LR-04 | 3 | — | — | 1 (LR-03: defect 12) | 0 |

- **WebKit C-01/C-02 (`ENGINE-LIMITATION`):** Playwright's WebKit build on Windows implements no SameSite;
  it stores the server's `Strict` cookies as `None` (`e2e/engine-samesite-probe.mjs`). The server's
  attributes are the same for every engine (C-05 PASS in Chromium and Firefox), and every CSRF test passed
  in that engine with the victim's cookies attached.
- **WebKit C-05 (`NOT-OBSERVABLE`):** Playwright's WebKit exposes no `Set-Cookie` response headers. D-08
  therefore relies on the cookie jar in that engine (the session cookie is gone after logout).
- **B-08:** Keycloak's quick-login check locked the account after 2 wrong codes submitted within a second;
  during the lockout the correct password is refused before any code is asked for.
- **R-02:** the pre-reset application session stayed valid after the IdP-side reset (`200`) and was refused
  after the interim operator step (`401`). This is the documented gap, not a pass of that behaviour.
  (Superseded on 20 October: R-02 now signs the user out at Keycloak, and back-channel logout ends the
  session; see "Backend session revocation".)
- A first Chromium run on this build had 2 failures, both harness errors (see the findings below); the run
  above is on the corrected harness. The second instance was started for the M run and removed afterwards.

Final build (`602a24d`, defect 12 fixed), the groups that exercise the changed code:

| Run | Groups | PASS | FAIL | ERROR |
|---|---|---|---|---|
| Chromium (browser) | A, H, G | 10 | 0 | 0 |
| Firefox (browser) | A, H, G | 10 | 0 | 0 |
| WebKit (browser; engine proxy, not Safari) | A, H, G | 10 | 0 | 0 |
| Wall clock, Chromium (`longrun.mjs`) | LR-01…LR-04 | 4 | 0 | 0 |
| F-1 logging regression (`--with-upstream-failure`) | 1 | 1 | 0 | 0 |

LR-03 on the final build: a sensitive action requested 5.5 minutes after sign-in, by a user with three
sessions, answered `401 step_up_required`; its confirmation was refused the same way; after the step-up
(password and code) the review page showed it with nothing run, and only the explicit Confirm executed it,
once; the replay was refused and the absolute anchor was unchanged.

Test groups (titles and requirement links in `e2e/run.mjs`, `e2e/longrun.mjs`):

- **A** preflight, every run: the proxy serves the app shell, its script runs against the API and shows the
  sign-in screen, anonymous visits create no server-side session.
- **P** protocol and IdP configuration (Chromium only; browser-independent): authorization request; PKCE
  required; unregistered redirect URI refused; forged callback; issuer consistency; client configuration;
  flow evidence (ACR, AMR mapper); MFA and recovery configuration (P-08); the authentication-reference window
  and the fresh-MFA settings (P-10); back-channel logout configuration and the endpoint's absence from the
  public origin (P-09).
- **B** login and universal MFA: mandatory enrolment and no session for the enrolment sign-in, with the
  explanation shown (B-01); `(iss, sub)`; persisted ID-token evidence, no access/refresh token; password and
  code on every sign-in; wrong code; password-only token refused (B-06, Chromium only); a user without the
  required action still enrols (B-07); TOTP brute-force lockout (B-08); a code exchanged 3 s after the OTP
  step (B-09); a new code on every sign-in, even seconds after the last (B-10); with the old reference value,
  that late sign-in refused (B-11, Chromium only); a factor from an earlier authentication not counted when
  the ACR requirement is removed (B-12, Chromium only).
- **C** cookies and storage; **D** sessions: PostgreSQL store with only the expected attributes, fixation,
  idle and absolute expiry at controlled time, logout, sign-out-everywhere, disable, cookie clearing (D-08);
  **E** CSRF (E-01…E-10).
- **H** step-up and sensitive actions: the full sequence request → step-up → review → explicit confirmation
  (H-01); confirmation replay (H-06); six concurrent confirmations (H-07); refused confirmations (H-08);
  step-up callback replay (H-02); another user's action (H-03); a different person (H-04); a refused step-up
  (H-05); a step-up whose code is exchanged 3 s after the OTP step (H-09), and refused with the old reference
  value (H-10, Chromium only).
- **U** the application shell: the review page's states and cancellation (U-01); a double press of Confirm
  (U-02); return to the page asked for after sign-in (U-03); the idle warning on an advanced browser clock
  (U-04); an external deep link under `SameSite=Strict` (U-06); sign out everywhere from the Security page
  (U-05).
- **R** MFA recovery: no self-service reset (R-01); administrator-assisted reset, whose sign-out at Keycloak
  ends the ClearSettle session by back-channel logout (R-02).
- **M** two application instances on one session store (M-00…M-06); back-channel logout across instances
  (M-07) and a forged logout token (M-08).
- **K** sibling-subdomain cookie tossing; **G** secret and log scan plus the AC-168 and sensitive-action
  events.
- **LR** production values on the wall clock: 15-minute idle (LR-01), 5-minute freshness (LR-02), a
  sensitive action after 5 minutes (LR-03), an unconfirmed action expiring (LR-04); and, in
  `longrun-provider.mjs`, a ClearSettle session outliving its Keycloak session (LR-05, about 35 minutes).

## M1 authentication requirements

| Requirement | Status | Evidence | Not verified | Decisions |
|---|---|---|---|---|
| AC-157 OIDC request; tampered callbacks; events | Verified (unit, live) | Unit: `OidcCallbackValidationTest` (every AC-157 case, see above). Live: P-01, P-02, P-04, P-05, H-02; failures recorded as `login_failure` events (G-01) | Tampered ID tokens are shown against the controlled provider, not Keycloak (Keycloak cannot be made to sign a wrong token); a live code-injection test against Keycloak was not run (Keycloak's PKCE enforcement itself is P-02) | D-SEC-12 |
| AC-158 exact redirect URI | Verified (unit, live) | P-03, P-06; the provider-side check and host independence in `OidcCallbackValidationTest` | — | D-SEC-12 |
| AC-159 cookies; no token in storage | Verified (browser) in Chromium and Firefox | `CookieSerializerTest`, `LoginStateCookieRepositoryTest`; C-01, C-02, C-05; C-03 in all three engines | SameSite in Playwright WebKit's jar (engine limitation); real Safari and mobile browsers (Blocked: no macOS/iOS/Android devices) | D-SEC-15 |
| AC-160 CSRF | Verified (unit, browser) | `SecurityChainSliceTest`, `RequiredHeaderFilterTest`, `SensitiveActionFlowTest`; E-01…E-10 and H-08 (confirmation without a token) in all three engines | GET inventory by code inspection: `/api/me`, `/api/session`, `/api/csrf`, `/api/sensitive-actions/{id}` change no state | D-SEC-15 |
| AC-161 cross-site form POST and fetch | Verified (browser) | E-08, E-09 in all three engines | — | D-SEC-15 |
| AC-162 rotation, logout, idle, absolute, cookie cleared; warning before expiry | Verified (unit, live, browser) | `AbsoluteTimeoutFilterTest`; D-02, D-05, D-08 (session cookie expired by the server and removed from the jar on logout and sign-out-everywhere), D-03, LR-01, D-04, M-06; the warning: `sessionClock.test.mjs`, U-04 | The 8-hour notice is unit-tested only; the idle warning in the browser runs on an advanced browser clock (U-04), not wall-clock time | D-SEC-13, D-UI-13 |
| AC-163 sign-out everywhere; removal; two instances | Verified (live, browser) / Outstanding (workspace removal) | D-06, D-07; across two instances: M-03 (sign-out-everywhere on instance 2 refuses both browsers on both), M-04 (logout), M-05 (disable); sign out everywhere and back-channel logout through one revocation service: `BackChannelLogoutPostgresTest`, M-07 | Removal from every workspace (workspaces not built) | D-SEC-13 |
| AC-164 step-up; different person; review, no replay | Verified (unit, PostgreSQL, browser) with fixtures / Outstanding (real operations) | `SensitiveActionFlowTest`, `PendingActionPostgresTest`, `LoginSuccessMfaGateTest`; H-01, H-06, H-07, H-08, H-04, M-02, LR-03 | No real sensitive operation exists; each feature's integration is part of its own acceptance | D-SEC-14, D-SEC-17 |
| AC-165 weak, old or missing claims fail closed | Verified (unit, live) | `FreshAuthEvaluatorTest`, `SensitiveActionFlowTest` (acr, amr, auth_time cases at a sensitive operation), `OidcCallbackValidationTest`; B-06, B-01, LR-02, LR-03; live refusals of `amr` without `otp` at sign-in and step-up (B-11, H-10) and of `acr` below `mfa` for a code issued from the Keycloak session alone (B-12) | — | D-SEC-14 |
| AC-166 same-origin static frontend; no secrets | Verified (live) | Static export routes `/`, `/_not-found`, `/review`, `/imports`, `/reconciliation`, `/exceptions`, `/records`, `/ledger`, `/reports`, `/settings`, `/settings/security`; A-01 in all engines; bundle scan (see AC-166 note below) | — | D-SEC-11 |
| AC-168 events with correlation ids; no secrets in logs | Verified (live) | G-01 in all three engines (proxy, backend, second instance in M runs, Keycloak and PostgreSQL logs, `security_event`); F-1 script PASS; back-channel logout events carry no token, `sid` or `jti` (`BackChannelLogoutPostgresTest`), and the forged logout token of M-08 appears in no log (G-01 after M, Chromium, 20 October) | Production logging intermediaries (CDN/LB/WAF/APM) | D-SEC-11 |
| NFR-SEC-022 CSRF token + custom header; no state via GET | Verified (unit, browser) | as AC-160, AC-161, E-07, K-01 | — | D-SEC-15 |
| NFR-SEC-023 session lifecycle | Verified (live, browser) / Outstanding (restore invalidation, privileged-role trigger, sessions that outlive their Keycloak session) | as AC-162, AC-163; two instances M-01…M-06; the end of a Keycloak session ends its ClearSettle sessions on every instance: `BackChannelLogoutPostgresTest`, P-09, R-02, M-07, M-08 | A ClearSettle session that outlived its Keycloak session is not reached by back-channel logout (LR-05). Invalidation of restored sessions after a database restore (no backup/restore tooling yet; the restore runbook must delete all `spring_session` rows before service resumes); workspace and role triggers | D-SEC-13 |
| NFR-SEC-024 fresh authentication, same user, no automatic replay | Verified (unit, PostgreSQL, browser) with fixtures | as AC-164, AC-165 | Real sensitive operations | D-SEC-17 |
| NFR-SEC-026 MFA enrolment and recovery | Verified (browser: enrolment; IdP recovery controls; the end of the user's sessions on reset, by back-channel logout) / Outstanding (recovery procedure and tooling) | B-01, B-07, P-08, R-01, R-02, B-08 | Identity-verification procedure; sessions back-channel logout cannot reach on reset (LR-05: an audited ClearSettle-side revocation is needed); audit integration and retention of Keycloak events; external security review | D-SEC-18 |
| D-SEC-14/19 universal MFA with TOTP | Verified (unit, live, browser) | `LoginSuccessMfaGateTest`, `OidcCallbackValidationTest`; B-01, B-03, B-04, B-05, B-06, B-07, B-08, B-09, B-10, B-11, B-12, H-09, H-10, P-07, P-08, P-10 | — | D-SEC-14, D-SEC-19 |
| D-SEC-11 sessions in PostgreSQL | Verified (unit, live) | `sessionStoreIsTheJdbcRepository`; D-01 (row, 15-minute idle, and only `SPRING_SECURITY_CONTEXT`, `cs.authenticatedAt` and the principal index stored); M-01 | — | D-SEC-11 |

AC-166 note: the rebuilt bundle was scanned again on 2026-10-17 after this round's scaffold changes: 28 files,
no `.env` value, no JWT, no private key, no client-secret string.

## Application shell — first frontend increment, 2026-10-20

Step 1 of the approved build order (D-UI-13; design proposal §9). It uses only the existing APIs: no new
endpoint, no fabricated data. Sections whose backend does not exist say so plainly and show no figures.
**This is not the full product UI**: of the eight sections, only Settings → Security and sessions and the
sensitive-action review page do real work today.

| Part | What it does | API | Status and evidence |
|---|---|---|---|
| Sign-in screen | Starts sign-in, remembering the page asked for. Explains why a session ended (idle, the 8-hour limit, signed out, signed out everywhere) and each refusal from the backend (`mfa_not_verified`, `mfa_required`, `account_disabled`, `reauth_user_mismatch`, `session_expired`; other provider codes only as a reference). A separate state when the server can't be reached | `GET /api/me`, `/oauth2/authorization/keycloak` | Verified (browser): A-01, B-01, U-03, U-04, U-05 |
| Return to the page asked for (`lib/returnTo.mjs`) | Only same-origin section paths; valid 10 minutes; used once; applied only on the landing page after sign-in, so a step-up return to a review page is never redirected | — | Verified (unit, browser): `returnTo.test.mjs`; U-03 |
| Session clock and idle warning (`lib/sessionClock.mjs`, `IdleWarning`) | Counts idle time from the last request the server answered, shared between tabs, never polling. Warns 2 minutes before the 15-minute limit; "Stay signed in" makes one request. Announces the 8-hour limit 10 minutes ahead (it cannot be extended). Ends the page's session at either limit with the reason | `GET /api/session` | Verified (unit, browser): `sessionClock.test.mjs`; U-04 (browser clock advanced). The 8-hour notice: unit tests only |
| Navigation shell (`AppShell`, `UserMenu`) | The eight approved sections with the current one marked; skip link; account menu (Radix) with security, sign out and sign out everywhere; below 960 px a scrolling strip that keeps the current section in view | — | Verified (browser): U-03; accessibility audit below |
| Security and sessions (`/settings/security/`) | Who is signed in, when, with which factors, and when the session ends; sign out; sign out everywhere behind a confirmation; whether a sensitive action would need a fresh verification right now; what to do about a lost authenticator, with the two gaps stated: an authenticator reset may not end a session kept in use for long (updated 20 October, after back-channel logout), and there is no per-device session list | `GET /api/me`, `GET /api/session`, `POST /logout`, `POST /api/session/logout-everywhere` | Verified (browser): U-05 |
| Review and confirm (`/review/`) | One sensitive action: its summary, reference and expiry (counted by the server's clock). Confirm and Cancel; a step-up link when the sign-in is too old. Every server answer has its own message: ran, cancelled, verify first, already settled, changed since review (withdrawn), expired, unsupported, failed and rolled back, refused, and unknown when no clear answer came back. It then shows the state the server holds, never one assumed. One request per press | `GET /api/sensitive-actions/{id}`, `POST …/confirm`, `POST …/cancel` | Verified (unit, browser): `reviewState.test.mjs`; H-01, U-01, U-02. The changed, failed and unknown outcomes are unit-tested only, because the dev fixture cannot produce them |
| Sections without a backend: Overview (the settlement chain, without figures), Imports, Reconciliation, Exceptions, Records, Ledger, Reports; Settings → workspace rows | A plain not-built state saying what each section will do and what it waits for | none | Built; no data. U-03 lands on one |
| Amount and time formatting (`lib/format.mjs`) | Indian grouping for INR (`₹1,24,500.00`), international grouping otherwise, never abbreviated; a true minus sign on working screens and parentheses on statements; refuses excess decimals and unknown currencies; times in IST | — | Verified (unit): `format.test.mjs`. No screen shows an amount yet |

- Frontend unit tests: `cd frontend && npm test`: 24, all passing (formatting, return-to, session clock,
  review outcomes).
- Dependencies added (D-UI-11): `@radix-ui/react-alert-dialog` 1.1.23 and `@radix-ui/react-dropdown-menu`
  2.1.24, exact versions, for the dialogs and the account menu (focus trapping, keyboard handling and ARIA
  roles). TanStack Query, Table and Virtual are not added yet: no screen lists or caches data so far.
- Fonts: IBM Plex Sans (400, 500, 600) and IBM Plex Sans Condensed (500), latin and latin-ext subsets, served
  from the app's own origin, with the OFL licence files in `frontend/public/fonts/`. `₹` renders in Plex: the
  latin-ext subset loads on demand (checked in Chromium).
- The confirmation is a page rather than a dialog, because the step-up returns the user to it. An
  in-place dialog for an operation that needs no step-up arrives with the first real sensitive operation (M6).

Browser runs against the local stack (backend at `a07e3a2`, frontend at `c182809`; synthetic users; raw
results in `e2e/results/`, git-ignored):

| Run | Groups | PASS | FAIL | ERROR |
|---|---|---|---|---|
| Chromium, full suite, on an earlier build of this increment (before the final review-page, copy and mobile-navigation refinements) | A, P, B, C, D, E, H, U, R, K, G | 58 | 0 | 0 |
| Chromium, final build | A, H, U, G | 16 | 0 | 0 |
| Firefox, final build | A, H, U, G | 16 | 0 | 0 |
| WebKit, final build (engine proxy, not Safari), run alone | A, H, U, G | 15 | 1 (U-06, a test defect: see below) | 0 |
| WebKit, group U after correcting U-06 | A, U | 6, and U-06 `NOT-OBSERVABLE` | 0 | 0 |
| Chromium, wall clock at the production limits (`longrun.mjs`; LR-03 now reads the review page's outcome attributes), final build | LR-01 to LR-04 | 4 | 0 | 0 |

- WebKit U-06: Playwright WebKit omits the `Cookie` header from the requests it reports, so the test saw no
  session cookie even on the API request, although the API answered as signed in. U-06 now reports
  `NOT-OBSERVABLE` in that case, as C-05 does, instead of `FAIL`.
- A first WebKit attempt, run straight after the Firefox run, errored from its first fixture sign-in
  onwards: 4 PASS, 2 FAIL, 10 ERROR, because the harness's two-step sign-in got no session for its users.
  The same groups run alone passed as above, and the same sign-in, traced on its own in WebKit, got its
  session. The cause of the first attempt was not established.

- U-06 shows the deep-link answer to ADR-0004. The page request that follows a link from another site
  carries no session cookie (`SameSite=Strict`), but the shell's own API requests do, so the user lands
  on the section still signed in, with no new sign-in. This is shown in Chromium and Firefox; Playwright
  WebKit on Windows implements no SameSite, so it cannot show the first half.
- Not rerun in this round: the emulated devices and two instances (group M). The backend is unchanged
  since those runs.

Accessibility (WCAG 2.2 AA is the target, D-UI-10):

- Automated: axe-core 4.10.3 (WCAG 2.0, 2.1 and 2.2 A and AA rules, run from outside the repository) found
  **no violations** in 18 states at 1440 and 390 px. The states were: sign-in and a refused sign-in;
  Overview; Settings; Security and sessions; a not-built section; the review page, ready and cancelled; the
  account menu; the sign-out-everywhere dialog. Left for manual review (axe "incomplete"): colour contrast
  of the sideways-scrolled navigation strip at 390 px, and two Radix-managed ARIA attributes (the menu's
  `aria-controls`, `aria-hidden` outside the dialog).
- Keyboard (Chromium):
  - the tab order is skip link, brand, navigation, account menu, then the page's controls;
  - the account menu opens from the keyboard, and Escape returns focus to its trigger;
  - the sign-out-everywhere dialog opens with focus on Cancel, and Escape closes it without signing out.
- Not done: screen-reader testing (NVDA, VoiceOver), a manual WCAG 2.2 AA review, and real Safari, iOS and
  Android (Blocked: infrastructure).

## Backend session revocation — OIDC back-channel logout, 2026-10-20

Step 2 of the approved build order (D-UI-13): server-side revocation before the workspace-members screen.

What was already in place:

- sign out everywhere deleted the user's sessions in the shared PostgreSQL store (verified on two instances,
  M-03);
- a disabled user was refused on the next request (M-05).

What was missing: nothing reached ClearSettle when a session ended at Keycloak, so an MFA reset left the user's
sessions valid until an operator deleted them by hand (R-02 before this round).

How Keycloak tells ClearSettle, and why it can be trusted:

- Keycloak 26.8.1 supports OpenID Connect Back-Channel Logout 1.0. When a user session ends at Keycloak (the
  user signs out there, an administrator signs the user out, or an administrator ends one session), Keycloak
  posts a logout token, signed with the realm's key, to each client's back-channel logout URL. The realm
  reference file now sets that URL for `clearsettle-web` on the internal network
  (`http://backend:8080/logout/connect/back-channel/keycloak`), with the session id (`sid`) required.
- Spring Security 7.1.1 receives the token (`oidcLogout().backChannel()`) and verifies it before ClearSettle's
  code runs:
  - the signature, against the realm's published keys;
  - the issuer and audience of the client registration;
  - the back-channel logout event;
  - `iat` and `jti` present, `sub` or `sid` present, no `nonce`, and `exp` when present.
- ClearSettle then (`BackChannelLogout`):
  - refuses a token issued more than 2 minutes ago (plus the 30-second clock-skew allowance), or in the future;
  - refuses a token without `sub` (users are keyed by `(iss, sub)`; a `sid`-only token would mean searching
    every stored session);
  - accepts each `jti` once per issuer, on every instance. Table `oidc_logout_token_seen` keeps only the
    issuer, the `jti` and when it was seen, and purges rows once their tokens are past the acceptance window.
    The marker is written before the sessions are deleted, so a concurrent copy of the same token is refused
    at once. It is removed again if the deletion fails, so the revocation can be retried. No database
    transaction is held while sessions are deleted (see the finding below);
  - with `sid`, ends only the ClearSettle sessions whose ID token carries that `sid`; without `sid`, ends all
    of the user's sessions. A session that cannot be linked to a Keycloak session (no `sid` in its ID token) is
    ended too. Another user's sessions are never looked at;
  - answers 200 when the token names a user or session ClearSettle doesn't have, and ends nothing.
- Sessions are deleted in the Spring Session JDBC store through the same `SessionRevocation` service that sign
  out everywhere now uses. The effect is immediate on every instance: the browser's old cookie no longer
  resolves to a session. Spring Session JDBC does not recreate a deleted session when a request that loaded it
  earlier saves it afterwards, so a request in flight cannot bring it back.
- Nothing extra is stored to make this work: no access or refresh token, and no in-memory registry of Keycloak
  sessions. Spring Security's default registry is replaced by `NonRetainingOidcSessionRegistry`, because the
  default would be local to one instance, never cleared, and would hold ID tokens and CSRF tokens. The link to
  Keycloak's session is the `sid` already inside the ID token stored with each session.
- The endpoint takes no session, CSRF token or custom header, because Keycloak cannot send them. Only a token
  signed by the realm can end a session. The public origin does not serve it: the proxy answers 404 for
  `/logout/connect/` (P-09).
- Security events. None records a token, `sid` or `jti`.
  - `backchannel_logout`: the user, the scope (`provider_session` or `all_sessions`), and the number of
    sessions ended (`revoked`). This counts the sessions this request found and deleted, so concurrent
    logouts of the same sessions can each count them.
  - `backchannel_logout_rejected`: the reason, one of `too_old`, `issued_in_future`, `no_subject`,
    `replayed`, `invalid_request` with the status (a token Spring Security refused), or `processing_error`.

What it does not cover:

- **A ClearSettle session that outlives its Keycloak session.** ClearSettle never contacts Keycloak while the
  user works, so a ClearSettle session kept in use past Keycloak's SSO idle timeout (30 minutes, the realm
  default) outlives its Keycloak session. Keycloak then has nothing to report. LR-05 shows this on the wall
  clock:
  - the ClearSettle session stayed valid for 30 minutes of activity;
  - Keycloak's session expired between 1,571 and 1,823 seconds;
  - the administrator's sign-out at Keycloak then sent no logout token, and the ClearSettle session stayed
    valid.

  The MFA-reset procedure therefore ends with the interim operator step for such sessions (deploy/README).
  Options to close this, for decision:
  - an audited administrative revocation in ClearSettle. `SessionRevocation` exists; it needs the
    administrator role, step-up and audit (D-SEC-17);
  - a Keycloak event listener that reports factor removals;
  - Keycloak SSO lifetimes at least as long as ClearSettle's. This is partial, and it lengthens Keycloak's
    own sessions.
- **Removing a factor alone.** Keycloak notifies no client of it; the administrator must also sign the user
  out (R-02).
- Spring Security 7.1.1 throws an exception for some malformed tokens instead of answering 400, as the
  specification asks. The tests show it for a token without `iss`, `events` or `jti`, and for an ID token
  presented as a logout token. Nothing is ended, and the attempt is recorded (`processing_error`). The tests
  stop at the exception; the error status a live server then returns to Keycloak was not checked. Not
  reported upstream.
- Spring Security builds a new JWKS client for each back-channel request, so each request with a well-formed
  signed token makes the backend fetch the realm's keys. Keeping the endpoint off the public origin limits
  who can trigger that.

Finding, made in review before commit and not observed live:

- **The problem.** The first version of the handler held a database transaction, the one holding the replay
  marker, while it ended the sessions. Spring Session JDBC runs each of its operations in a new transaction on
  another connection, so every logout needed two connections at once. As many simultaneous logouts as the pool
  has connections (10 by default) would have stalled the instance's whole connection pool until the
  connection timeout.
- **The fix.** The marker is now written first, in its own statement, and removed if the revocation fails.
- **The evidence.** `theHandlerNeverNeedsTwoDatabaseConnectionsAtOnce` uses an instance with a one-connection
  pool. On the first version it failed: the logout ended in a connection timeout after the configured 1 second,
  recorded as `processing_error`.

Tests on PostgreSQL 17.11 (`BackChannelLogoutPostgresTest`, 13 tests). Two application instances: two separate
Spring contexts sharing one disposable database, signing in through the real security filter chain against
the controlled test provider.

| Case | Result |
|---|---|
| A token for one Keycloak session, delivered to instance 1 | That session refused on both instances; the user's other Keycloak session kept on both; another user with the same `sid` value kept; the kept session's 8-hour limit unchanged; the old cookie does not recreate a row; one event, without the `sid` |
| A token without `sid`, delivered to instance 2 | All of the user's sessions refused on both instances; another user kept |
| A session whose ID token has no `sid` | Ended by any logout of its user; a session linked to another Keycloak session kept |
| A token for an unknown user, or an unknown `sid` | 200, nothing ended, recorded as such |
| A request on instance 2 that loaded the session before the revocation and saves it afterwards | Not recreated; refused on both instances |
| A replay, on the other instance and on the same one | 400 `replayed`; a session signed in after the first logout is kept |
| 8 simultaneous deliveries of one token to both instances | Exactly one 200 and seven 400 `replayed`; one `backchannel_logout` event |
| 6 simultaneous distinct tokens for one user (3 sessions) | All 200; every session ended; no error |
| An instance whose connection pool holds one connection | A logout, its replay refused, and 4 simultaneous logouts all handled: the handler never needs two connections at once |
| Refused with 400, ending nothing, each recorded. The cases: another key under the realm's key id, `alg=none`, HS256 with the client secret, another issuer, another audience, another event, a `nonce`, neither `sub` nor `sid`, typed `at+jwt`, expired, issued 10 minutes ago, issued in the future, `sid` without `sub`, not a JWT, no `logout_token`, an unknown registration | As expected; afterwards the genuine token still works |
| Refused by Spring Security with an exception, ending nothing, recorded. The cases: an ID token as a logout token, no `events`, no `jti`, no `iss` | As expected |
| GET on the endpoint | 401 (not a back-channel logout) |
| Replay markers | Purged once past the acceptance window; only `iss`, `jti`, `seen_at` stored |
| Sign out everywhere, now through `SessionRevocation` | Both sessions refused on both instances |

`BackChannelLogoutHandlerTest` (H2, 2 tests) covers two things:

- a revocation that fails releases the token, so the same token delivered again succeeds, and a replay after
  that is refused without touching a session;
- the registration taken from the path is recorded sanitised and cut to 64 characters.

Mutation check (20 October 2026): each of eight deliberate defects was applied one at a time, on the final code,
and each made at least one of these tests fail. The defects:

- ignoring `sid`;
- no replay marker;
- no age check;
- ending every session regardless of `sid`;
- keeping unlinked sessions;
- not releasing the marker after a failed revocation;
- no length cap on the recorded registration;
- not recording Spring Security's refusals.

Live, on the local stack (real Keycloak 26.8.1 tokens, two backend containers):

- **P-09:** the client's back-channel URL and `sid` requirement are set; there is no front-channel logout; the
  public origin answers 404.
- **R-02 (MFA reset):**
  - after the administrator removes the factor, the user's ClearSettle session is still valid: Keycloak
    notifies no client of a factor removal;
  - after the administrator signs the user out at Keycloak, Keycloak's logout token ends the session
    (`scope=provider_session`, 1 session), with no operator step.
- **M-07:** Keycloak ends one of the user's two Keycloak sessions and posts to instance 1. That browser's
  session is refused on instance 2 and on instance 1; the other browser's session is kept on both.
- **M-08:** a forged token is posted straight to instance 2 and refused with 400, the attempt is recorded,
  and the session is kept on both instances. The token used Keycloak's issuer, audience and key id and a live
  session's `sid`, but was signed with another key. G-01 then finds the forged token in no log.
- **LR-05 (`longrun-provider.mjs`, wall clock):** as described under "What it does not cover". PASS here means
  that the limitation was observed as documented.

Browser runs on the final code (20 October 2026, after the `amr` correction), counted per engine:

| Engine | Groups | PASS | FAIL | ENGINE-LIMITATION | NOT-OBSERVABLE |
|---|---|---|---|---|---|
| Chromium | A, P, B, C, D, E, H, U, R, K, M, G | 75 | 0 | 0 | 0 |
| Firefox | A, B, C, D, E, H, U, R, K, G | 52 | 0 | 0 | 0 |
| WebKit (engine proxy, not Safari) | A, B, C, D, E, H, U, R, K, G | 48 | 0 | 2 | 2 |

- All three engines cover back-channel logout on an MFA reset (R-02), step-up (H, including the delayed
  H-09), CSRF (E) and the session timeouts (D). P-09 and group M (two instances, including M-07 and M-08) run
  in Chromium only, as the deploy README lists them. B-06, B-11, B-12 and H-10 change the realm while they
  run, so they are Chromium-only too.
- WebKit's four results other than PASS are cookie checks that its Windows build cannot show. Chromium and
  Firefox assert all four.
  - C-01 and C-02 (ENGINE-LIMITATION): the build stores every cookie as `SameSite=None`
    (`engine-samesite-probe.mjs`). The cookies' other attributes matched.
  - C-05 and U-06 (NOT-OBSERVABLE): the build shows the harness neither `Set-Cookie` response headers nor
    `Cookie` request headers. In U-06 the shell came up signed in on the linked section, so its API calls
    carried the session cookie; whether the page request did cannot be seen.
- The WebKit run first stopped at B-09, before any assertion. Playwright cannot fulfil an intercepted request
  with a redirect status in WebKit, so the held redirect to the callback could not be handed back.
  - In WebKit the held redirect is now handed over as a Keycloak-origin page with one link to the same
    callback URL. Chromium and Firefox still get the redirect.
  - The code still reaches ClearSettle at least 3 s after the OTP step (WebKit: B-09 held 3009 ms, H-09
    3013 ms). The table counts the WebKit run after that change.
- The Chromium and Firefox rows are their runs before that change. The change touches only the hold, used in
  groups B and H, and a branch of the sign-in helper reached only from the page the hold serves in WebKit.
  B and H then re-ran on the changed harness: Chromium 23 PASS, Firefox 19 PASS, no other result.
- LR-05 ran once, on 20 October, on the same revocation code but before the `amr` correction. It was not
  re-run on the final code.
- An earlier WebKit run, before the correction, failed B-04: it found defect 14, and its results are not
  counted here.

## Keycloak `amr` timing correction (defect 14), 2026-10-20

Found by the final WebKit run of the back-channel logout work: B-04, an ordinary password-and-code sign-in,
got no session.

- **Cause.** Keycloak lists a method in `amr` only while its authentication reference is still valid when the
  token is issued: completed + `default.reference.maxAge` ≥ now, counted in whole seconds (Keycloak 26.8.1,
  `AmrUtils`, read from its bytecode). The realm's references (`cs-ref-pwd`, `cs-ref-otp`) set no max age, so
  Keycloak's default of 0 applied. `otp` therefore stayed in `amr` only if ClearSettle exchanged the code within
  the same wall-clock second as the OTP step.
  - In the failed B-04, Keycloak recorded the sign-in at 09:30:30.742 UTC. ClearSettle refused the token
    0.3 s later, in the next second, with `amr=[]` (`amr_insufficient`).
  - Step-up reads `amr` the same way.
  - The defect failed closed, but users on slow connections would have hit it often.
- **Reproduced before the fix.** A sign-in whose redirect to the callback was held for 1.5 s was refused
  3 times out of 3. The same sign-in without the hold succeeded 3 times out of 3.
- **Fix: the realm only.** Both references are valid for 60 s (`default.reference.maxAge`). That is the
  authorization-code lifetime (`accessCodeLifespan`, Keycloak's default, now explicit). The fix was applied
  to the running dev Keycloak with kcadm (deploy/README).
- **Why 60 s.** A code can be redeemed only within its lifetime, so 60 s is the shortest window that keeps the
  methods of every code still redeemable.
  - A shorter window would still refuse correct sign-ins on slow connections.
  - A longer one would report methods for longer than any code can use them.
  - Keycloak checks both limits in whole seconds, so a code redeemed in its last second can still lose its
    references. That case fails closed.
- **What keeps MFA fresh is unchanged.**
  - Level 2 (the OTP form) has max age 0 and the client's minimum ACR is `mfa`, so Keycloak runs the OTP form
    on every authentication.
  - A token that did not reach level 2 carries an `acr` other than `mfa`.
  - Step-up adds `prompt=login`, `max_age=0` and the backend's 5-minute `auth_time` limit.
  - ClearSettle's checks (`acr=mfa`, and `amr` containing `otp`, failing closed) did not change. No backend
    code changed.
- **The e2e helper could hide the defect.** `loginReady` retried any refused first sign-in. It now retries
  only after the sign-in that enrols the authenticator, which gets no session by design, and fails the test
  otherwise. The long-run scripts use the same rule (`signInReady` in `e2e/lib.mjs`).

Regression tests. Each hold lasts at least 3 s, so the exchange always falls in a later second than the OTP
step, whatever the clock.

| Test | What it shows | With the old value (Chromium, before the fix) | Final code |
|---|---|---|---|
| P-10 | The configuration: level 2 max age 0, minimum ACR `mfa`, both references valid for the code lifetime | FAIL (no max age) | PASS (reads the configuration, so it does not depend on the engine) |
| B-09 | The redirect to the callback is held 3 s after the OTP step. The sign-in gets a session; `acr=mfa`; `amr` includes `pwd` and `otp` | FAIL (refused, `mfa_not_verified`) | PASS: Chromium, Firefox, WebKit (each held 3.0 s; `amr` `pwd`, `otp`) |
| B-10 | A sign-in seconds after another, in the same Keycloak session, is asked for a code; nothing reaches the callback before it | PASS | PASS: Chromium, Firefox, WebKit. `amr` also listed the earlier `pwd` |
| B-11 | With the old value (0), the same held sign-in is refused: `amr_insufficient`, `amr` without `otp` | PASS | PASS: Chromium |
| B-12 | With the client's ACR requirement removed, a code issued from the Keycloak session alone is refused on `acr`; its `amr` listed `pwd` only, not the earlier `otp` | (added after that run) | PASS: Chromium (`acr=pwd`, `acr_insufficient`) |
| H-09 | A step-up with the callback held 3 s reaches the review page with fresh evidence (`acr=mfa`, `amr` with `otp`, the step-up's own `auth_time`), and the action is confirmed once | FAIL (refused; its originating session ended, so H-04 failed too) | PASS: Chromium, Firefox, WebKit (each held 3.0 s; `amr` `pwd`, `otp`) |
| H-10 | With the old value, the held step-up is refused, its originating session ends, and the action stays pending, not run | PASS | PASS: Chromium |

Final-code runs on 20 October: B-09, B-10 and H-09 passed in all three engines, and no engine had a FAIL or
ERROR in any group. WebKit reported four cookie checks it cannot show as ENGINE-LIMITATION or NOT-OBSERVABLE;
the counts and reasons are under "Backend session revocation". B-11, B-12 and H-10 change the realm while they
run, so they are Chromium-only.

## Gap closure in this round (owner request of 17 October 2026)

| Area | What was missing | What closed it | Evidence |
|---|---|---|---|
| A. OIDC and token validation | Token tampering, `nonce`, PKCE mismatch, redirect URI, MFA claim cases | A controlled test provider driving the real client (no change to cryptographic validation) | `OidcCallbackValidationTest` (18) |
| B. MFA and step-up lifecycle | `StepUpService.claim` had no caller and no test; no `step_up_required` response; no confirmation | `SensitiveActions` policy and endpoints; atomic claim + execution in one transaction; configurable 5-minute window and pending-action lifetime | `SensitiveActionFlowTest`, `PendingActionPostgresTest`; H-01, H-06…H-08, M-02, LR-03, LR-04 |
| C. Session lifecycle | Cookie clearing not asserted; one instance only | D-08; a second instance (compose profile) and the M group | D-08, M-00…M-06 |
| D. CSRF and cookies | — (already verified); the new unsafe endpoints | Confirmation and cancellation go through the same CSRF layer | `SensitiveActionFlowTest`, H-08 |
| E. Logging and retention | Session-store contents not pinned; new event types | D-01 allow-list of session attributes; G-01 extended (sensitive-action events, second instance) | D-01, G-01, F-1 |
| F. Browsers | — | All suites rerun on the final code | Run table above |
| Recovery and factor (D-SEC-18/19) | Reset flow contained *Reset OTP*; no brute-force protection; IdP events not stored | Realm hardening (see D-SEC-18) | P-08, R-01, R-02, B-08 |

Findings of this round:

- **Defect 12** (in the step-up code of 16 October, found by the wall-clock run LR-03 and fixed in
  `602a24d`): see the defect table below.

- The realm's reset-credentials flow contained Keycloak's *Reset OTP* step. It was unreachable because
  password reset is off, but enabling password reset later would have turned email control into an MFA
  reset. The realm now binds a reset flow without it.
- Keycloak brute-force detection was off, so one-time codes could be guessed without limit once a password
  was known. It is now on with Keycloak's default thresholds (a FLAG for the security review).
- Keycloak stored no events, so an administrator's factor removal left no audit record. User and admin
  events are now stored (admin bodies off). The stored user events contain Keycloak session identifiers,
  usernames and IP addresses; no retention period is set yet.
- An IdP-side MFA reset or logout does not end ClearSettle sessions (no back-channel logout); R-02 shows the
  pre-reset session still valid until the interim operator step. Recorded as outstanding (D-SEC-18).
  **Update (20 October 2026):** back-channel logout now ends them when the administrator signs the user out
  at Keycloak, except a session that outlived its Keycloak session (LR-05); see "Backend session revocation".
- User provisioning used PostgreSQL's `ON CONFLICT`, which the H2 test database cannot parse; the positive
  OIDC test needed it, so provisioning is now portable (look up, insert, tolerate a concurrent duplicate)
  with the same behaviour.

Test-harness issues found and fixed: B-07 first assumed Keycloak would leave a new user without the default
required action and expected a password prompt on the second sign-in (SSO covers it); R-02 first looked
for a `DELETE` admin event where Keycloak records an `ACTION` on the credential's path; a shared list in
the test provider made one unit assertion depend on test order.

## Finding → control mapping (from the M0 spike)

| Finding | Control in M1 | Status |
|---|---|---|
| F-1 authorization-code log leakage | nginx `auth_redacted` access-log format and `error_log /dev/null` on the callback route; `deploy/f1-logging-regression.sh` | **Verified** (F-1 script PASS on the final build; G-01). Must be replicated on every logging intermediary of a real deployment |
| F-2 SameSite × callback | V3: Lax `__Host-CSLOGIN`; step-up nonce for the cross-site step-up callback | **Verified** (every login and step-up in every engine) |
| F-3 tokens at rest | Only the ID token is kept, in the session; no access or refresh token | **Verified** (B-03, D-01, slice and unit tests, `OidcCallbackValidationTest`) |
| F-4 CSRF / cookie tossing | `__Host-` CSRF cookie + required custom header + token | **Verified** (E-01…E-10, E-07, K-01, C-04) |
| F-5 cross-browser | Server-side controls do not depend on SameSite | **Verified** in Chromium, Firefox and Playwright WebKit (engines); emulated Pixel 7 / iPhone 15. Real Safari, iOS and Android **Blocked (infrastructure)** |

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
| 12 | (found 17 October by LR-03) A step-up by a user with several sessions, minutes after sign-in, was refused as `session_expired` and signed the browser out: Spring Session JDBC's principal query has no `ORDER BY` and its extractor assumes adjacent rows, so on PostgreSQL a session came back without its step-up nonce | the originating session is read by id; only ids come from the principal index | `stepUpFindsTheOriginatingSessionWhenThePrincipalIndexReturnsPartialSessions`; `StepUpOriginPostgresTest` (fails on the previous code); LR-03 | 602a24d |
| 13 | (found 19 October by review, not observed live) User provisioning, changed in `0e5cbdd` to suit the H2 test database, caught a uniqueness violation and re-read. On PostgreSQL that violation aborts a surrounding transaction, so a concurrent first sign-in inside a transaction would fail | one atomic PostgreSQL upsert on the `(iss, sub)` constraint (`ON CONFLICT … RETURNING`); the H2 tests use a test-only stand-in, and the production statement is tested on PostgreSQL | `AppUserServicePostgresTest` (fails on the previous code with `25P02`) | 4b75c85 |
| 14 | (found 20 October by the WebKit run, B-04) A correct password-and-code sign-in or step-up was refused when ClearSettle exchanged the code in a later second than the OTP step: the realm's authentication references had no max age, so Keycloak (default 0) left `otp` out of `amr` | references valid for the 60-second authorization-code lifetime; the e2e sign-in helpers no longer retry a refused sign-in except after enrolment | B-09, H-09 (fail with the old value, shown by B-11 and H-10); P-10 | cd3ac06 |

## Outstanding

Owner input or decisions:

- Recovery procedure (D-SEC-18): who may reset a factor, what identity evidence is required, whether a
  second person approves; break-glass recovery for administrators.
- Brute-force thresholds (Keycloak defaults today) and the retention period of Keycloak events.
- Whether users may add a second authenticator from the Keycloak account console (possible today; it cannot
  remove the existing factor).

Not yet built or not yet verified (the MFA-recovery and session-revocation items are also held open in
the engineering checklist §7, so later product work cannot assume them):

- Retention of finished pending actions. Executed, cancelled and expired `pending_action` rows are never
  deleted. A purge period is a retention decision (D-DAT-07/08), and the rows are the only record of an
  action's reviewed parameters until the audit core exists, so the purge is deferred: it belongs with the
  first real sensitive operation (M6) or the audit core, whichever comes first. Proposed: delete finished
  rows after 30 days once the audit trail holds the durable record.

- Integration of the sensitive-action policy with real operations (posting approval first, M6).
- Sessions back-channel logout cannot reach. A ClearSettle session kept in use past Keycloak's SSO idle
  timeout outlives its Keycloak session, and the administrator's sign-out at Keycloak then reaches nothing
  (LR-05). Until an audited ClearSettle-side administrative revocation exists, the MFA-reset procedure ends with
  the interim operator step for such sessions (deploy/README). That revocation needs the administrator role,
  step-up and audit (D-SEC-17); `SessionRevocation` is built. Alternatives, for decision: a Keycloak event
  listener that reports factor removals; Keycloak SSO lifetimes at least as long as ClearSettle's.
- Back-channel logout in a real deployment:
  - only the identity provider may reach the endpoint (the local proxy already refuses it);
  - Spring Security 7.1.1 throws an exception for some malformed tokens instead of answering 400;
  - it fetches the realm's keys on every request.

  An upstream report of the exception would need the owner's approval.
- Real Safari (macOS) and iOS/Android browsers: **Blocked (infrastructure)**: no such devices here. Playwright
  WebKit is an engine proxy and device emulation changes only viewport, user agent and touch.
- Accessibility beyond the automated audit and the keyboard checks: screen-reader testing (NVDA, VoiceOver)
  and a manual WCAG 2.2 AA review.
- The next steps of the approved build order (D-UI-13): the workspace-members screen, then the workspace
  screens, with the workspace backend. Their revocation dependency is built: removing a member will call
  `SessionRevocation`.
- Restored-session invalidation after a database restore (NFR-SEC-023): no backup/restore tooling yet.
- F-1 redaction on every logging intermediary of a real deployment (CDN, load balancer, WAF, APM).
- Live Cognito/Auth0 validation: not performed, not authorized (billable).
- External security review of MFA enrolment and recovery (NFR-SEC-026).
- The rest of M1 per the implementation plan: workspaces and memberships, tenant isolation (row-level
  security), audit core.
