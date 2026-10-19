# ClearSettle — Implementation Status

**Scope so far:** M1 authentication foundation (D-SEC-11 to D-SEC-19). This document records one row per
relevant requirement, per the implementation plan §6. A requirement is marked verified only with recorded
test evidence; the status changes in the same commit as the work it describes.

**Last updated:** 2026-10-17 (owner security-policy decisions D-SEC-16 to D-SEC-19 and the remaining M1
authentication gaps).

**M1 is not complete.** The authentication path is verified end to end in the browser engines listed below,
but real Safari and mobile browsers, MFA-recovery tooling, integration with real sensitive operations,
restored-session invalidation and production logging intermediaries remain (last section). The rest of the
planned M1 scope (workspaces, tenant isolation, audit core, the application shell; implementation plan §5)
has not started.

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
| D-SEC-17 Sensitive operations: 5-minute freshness, step-up, single-use confirmation | Register D-SEC-17; ADR-0002; ADR-0003 decision 2 | `SensitiveOperation`, `SensitiveActions`, `/api/sensitive-actions/{id}` (review, confirm, cancel); configurable window and pending-action lifetime | Verified (unit, PostgreSQL, browser) with fixtures. **Outstanding:** integration with real sensitive operations (none exists yet) |
| D-SEC-18 MFA recovery: administrator-assisted, identity-verified, audited; no self-service reset | Register D-SEC-18; ADR-0003 decision 3 | Keycloak realm: no password or OTP reset by email, no self-service factor removal, admin and user events stored, brute-force detection | Verified (live, browser) for the IdP controls: P-08, R-01, R-02, B-08. **Outstanding:** identity-verification procedure, ClearSettle-side session revocation (or back-channel logout), audit integration and retention, external review |
| D-SEC-19 TOTP for every user | Register D-SEC-19; ADR-0003 decision 4 | Existing Keycloak TOTP policy; enrolment forced even without the required action | Verified (live, browser): P-07, P-08, B-01, B-04, B-07 |

The sensitive-action categories (posting approval, period reopening, role and permission changes,
offboarding steps, template activation and sensitive settings, original-file download) are documented in
D-SEC-17; no route is classified yet because none of those features exists.

## Backend tests — 91, all passing

`mvn test` (Maven 3.9 container, offline repository), 2026-10-17, on the code in this commit: 85 tests on H2
pass; the 6 PostgreSQL tests are skipped there and pass when pointed at a disposable PostgreSQL 17.11
database (`CS_TEST_PG_URL`, see `deploy/README.md`). Each intermediate commit of this round was also built and
tested on its own.

| Class | Tests | Covers |
|---|---|---|
| `OidcCallbackValidationTest` | 18 | The real client registration (from OIDC discovery), filter chain and Spring Session JDBC against a controlled test provider. Positive control (PKCE S256, `state`, `nonce`, exact redirect URI, code redeemed only after client authentication, redirect URI and PKCE verifier matched; session persisted; user provisioned on `(iss, sub)`; no access or refresh token in the session). Refused, with no persisted security context, no provisioned user and one security event each: forged signature, `alg=none`, HS256 signed with the client secret, wrong issuer, wrong audience, expired token, missing `nonce`, mismatched `nonce`, token response without an ID token, wrong `state` (no code redeemed), missing or tampered login-state cookie, a code from another login (PKCE mismatch), a replayed callback, a valid token without a verified second factor (`mfa_not_verified`), a password-only token (`mfa_required`). The redirect URI never depends on the request host |
| `SensitiveActionFlowTest` | 15 | Through the real security chain with a test-only sensitive operation: a fresh request answers `202` and runs nothing; older than 5 minutes, or weak, missing or future-dated evidence answers `401 step_up_required`; the reviewed parameters execute exactly once on confirmation; replay, cancelled, expired, unknown and another user's actions are refused and run nothing; confirmation needs the CSRF token and the custom header; a failed operation rolls back its claim and its effect; an unregistered type never runs; every step is a security event |
| `PendingActionPostgresTest` | 4 | On PostgreSQL 17.11: 12 concurrent confirmations execute the action exactly once; a failed operation rolls back the claim; expiry follows the application clock; another user's claim does not match |
| `StepUpOriginPostgresTest` | 2 | On PostgreSQL 17.11 with the real Spring Session JDBC repository: the library's principal query returns a session without some attributes once several sessions' rows interleave (documents the behaviour); the step-up still finds and retires its originating session and keeps the anchor (fails on the previous lookup with `session_expired`) |
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

- **A** preflight, every run: the proxy serves the app shell, its script runs against the API, anonymous
  visits create no server-side session.
- **P** protocol and IdP configuration (Chromium only; browser-independent): authorization request; PKCE
  required; unregistered redirect URI refused; forged callback; issuer consistency; client configuration;
  flow evidence (ACR, AMR mapper); MFA and recovery configuration (P-08).
- **B** login and universal MFA: mandatory enrolment and no session for the enrolment sign-in, with the
  explanation shown (B-01); `(iss, sub)`; persisted ID-token evidence, no access/refresh token; password and
  code on every sign-in; wrong code; password-only token refused (B-06, Chromium only); a user without the
  required action still enrols (B-07); TOTP brute-force lockout (B-08).
- **C** cookies and storage; **D** sessions: PostgreSQL store with only the expected attributes, fixation,
  idle and absolute expiry at controlled time, logout, sign-out-everywhere, disable, cookie clearing (D-08);
  **E** CSRF (E-01…E-10).
- **H** step-up and sensitive actions: the full sequence request → step-up → review → explicit confirmation
  (H-01); confirmation replay (H-06); six concurrent confirmations (H-07); refused confirmations (H-08);
  step-up callback replay (H-02); another user's action (H-03); a different person (H-04); a refused step-up
  (H-05).
- **R** MFA recovery: no self-service reset (R-01); administrator-assisted reset (R-02).
- **M** two application instances on one session store (M-00…M-06).
- **K** sibling-subdomain cookie tossing; **G** secret and log scan plus the AC-168 and sensitive-action
  events.
- **LR** production values on the wall clock: 15-minute idle (LR-01), 5-minute freshness (LR-02), a
  sensitive action after 5 minutes (LR-03), an unconfirmed action expiring (LR-04).

## M1 authentication requirements

| Requirement | Status | Evidence | Not verified | Decisions |
|---|---|---|---|---|
| AC-157 OIDC request; tampered callbacks; events | Verified (unit, live) | Unit: `OidcCallbackValidationTest` (every AC-157 case, see above). Live: P-01, P-02, P-04, P-05, H-02; failures recorded as `login_failure` events (G-01) | Tampered ID tokens are shown against the controlled provider, not Keycloak (Keycloak cannot be made to sign a wrong token); a live code-injection test against Keycloak was not run (Keycloak's PKCE enforcement itself is P-02) | D-SEC-12 |
| AC-158 exact redirect URI | Verified (unit, live) | P-03, P-06; the provider-side check and host independence in `OidcCallbackValidationTest` | — | D-SEC-12 |
| AC-159 cookies; no token in storage | Verified (browser) in Chromium and Firefox | `CookieSerializerTest`, `LoginStateCookieRepositoryTest`; C-01, C-02, C-05; C-03 in all three engines | SameSite in Playwright WebKit's jar (engine limitation); real Safari and mobile browsers (Blocked: no macOS/iOS/Android devices) | D-SEC-15 |
| AC-160 CSRF | Verified (unit, browser) | `SecurityChainSliceTest`, `RequiredHeaderFilterTest`, `SensitiveActionFlowTest`; E-01…E-10 and H-08 (confirmation without a token) in all three engines | GET inventory by code inspection: `/api/me`, `/api/session`, `/api/csrf`, `/api/sensitive-actions/{id}` change no state | D-SEC-15 |
| AC-161 cross-site form POST and fetch | Verified (browser) | E-08, E-09 in all three engines | — | D-SEC-15 |
| AC-162 rotation, logout, idle, absolute, cookie cleared | Verified (unit, live, browser) / Outstanding (expiry warning) | `AbsoluteTimeoutFilterTest`; D-02, D-05, D-08 (session cookie expired by the server and removed from the jar on logout and sign-out-everywhere), D-03, LR-01, D-04, M-06 | Pre-expiry warning not built (needs the remaining idle time from the backend) | D-SEC-13 |
| AC-163 sign-out everywhere; removal; two instances | Verified (live, browser) / Outstanding (workspace removal) | D-06, D-07; across two instances: M-03 (sign-out-everywhere on instance 2 refuses both browsers on both), M-04 (logout), M-05 (disable) | Removal from every workspace (workspaces not built) | D-SEC-13 |
| AC-164 step-up; different person; review, no replay | Verified (unit, PostgreSQL, browser) with fixtures / Outstanding (real operations) | `SensitiveActionFlowTest`, `PendingActionPostgresTest`, `LoginSuccessMfaGateTest`; H-01, H-06, H-07, H-08, H-04, M-02, LR-03 | No real sensitive operation exists; each feature's integration is part of its own acceptance | D-SEC-14, D-SEC-17 |
| AC-165 weak, old or missing claims fail closed | Verified (unit, live) | `FreshAuthEvaluatorTest`, `SensitiveActionFlowTest` (acr, amr, auth_time cases at a sensitive operation), `OidcCallbackValidationTest`; B-06, B-01, LR-02, LR-03 | — | D-SEC-14 |
| AC-166 same-origin static frontend; no secrets | Verified (live) | Static export routes `/`, `/_not-found`, `/review`; A-01 in all engines; bundle scan (see AC-166 note below) | — | D-SEC-11 |
| AC-168 events with correlation ids; no secrets in logs | Verified (live) | G-01 in all three engines (proxy, backend, second instance in M runs, Keycloak and PostgreSQL logs, `security_event`); F-1 script PASS | Production logging intermediaries (CDN/LB/WAF/APM) | D-SEC-11 |
| NFR-SEC-022 CSRF token + custom header; no state via GET | Verified (unit, browser) | as AC-160, AC-161, E-07, K-01 | — | D-SEC-15 |
| NFR-SEC-023 session lifecycle | Verified (live, browser) / Outstanding (restore invalidation, privileged-role trigger) | as AC-162, AC-163; two instances M-01…M-06 | Invalidation of restored sessions after a database restore (no backup/restore tooling yet; the restore runbook must delete all `spring_session` rows before service resumes); workspace and role triggers | D-SEC-13 |
| NFR-SEC-024 fresh authentication, same user, no automatic replay | Verified (unit, PostgreSQL, browser) with fixtures | as AC-164, AC-165 | Real sensitive operations | D-SEC-17 |
| NFR-SEC-026 MFA enrolment and recovery | Verified (browser: enrolment; IdP recovery controls) / Outstanding (recovery procedure and tooling) | B-01, B-07, P-08, R-01, R-02, B-08 | Identity-verification procedure; ClearSettle session revocation on reset; audit integration and retention of Keycloak events; external security review | D-SEC-18 |
| D-SEC-14/19 universal MFA with TOTP | Verified (unit, live, browser) | `LoginSuccessMfaGateTest`, `OidcCallbackValidationTest`; B-01, B-03, B-04, B-05, B-06, B-07, B-08, P-07, P-08 | — | D-SEC-14, D-SEC-19 |
| D-SEC-11 sessions in PostgreSQL | Verified (unit, live) | `sessionStoreIsTheJdbcRepository`; D-01 (row, 15-minute idle, and only `SPRING_SECURITY_CONTEXT`, `cs.authenticatedAt` and the principal index stored); M-01 | — | D-SEC-11 |

AC-166 note: the rebuilt bundle was scanned again on 2026-10-17 after this round's scaffold changes: 28 files,
no `.env` value, no JWT, no private key, no client-secret string.

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

## Outstanding

Owner input or decisions:

- Recovery procedure (D-SEC-18): who may reset a factor, what identity evidence is required, whether a
  second person approves; break-glass recovery for administrators.
- Brute-force thresholds (Keycloak defaults today) and the retention period of Keycloak events.
- Whether users may add a second authenticator from the Keycloak account console (possible today; it cannot
  remove the existing factor).
- The frontend design proposal (`docs/design/`).

Not yet built or not yet verified (the MFA-recovery and session-revocation items are also held open in
the engineering checklist §7, so later product work cannot assume them):

- Integration of the sensitive-action policy with real operations (posting approval first, M6).
- Ending ClearSettle sessions on an IdP-side reset or logout: an audited administrative revocation or OIDC
  back-channel logout (today an interim operator step).
- Real Safari (macOS) and iOS/Android browsers: **Blocked (infrastructure)**: no such devices here. Playwright
  WebKit is an engine proxy and device emulation changes only viewport, user agent and touch.
- External-deep-link re-entry UX under `SameSite=Strict` (ADR-0004) and the pre-expiry warning (AC-162):
  part of the application shell.
- Restored-session invalidation after a database restore (NFR-SEC-023): no backup/restore tooling yet.
- F-1 redaction on every logging intermediary of a real deployment (CDN, load balancer, WAF, APM).
- Live Cognito/Auth0 validation: not performed, not authorized (billable).
- External security review of MFA enrolment and recovery (NFR-SEC-026).
- The rest of M1 per the implementation plan: workspaces and memberships, tenant isolation (row-level
  security), audit core, the application shell.
