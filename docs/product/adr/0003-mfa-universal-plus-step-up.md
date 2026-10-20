# ADR-0003 — MFA: Universal at Login + Step-Up for Sensitive Actions

- **Status:** Accepted 2026-10-16 (owner approval). Recorded as **D-SEC-14**; resolves **OQ-55**.
  **Amended 2026-10-17** (owner approval of the four M1 security-policy recommendations): first sign-in
  after enrolment (**D-SEC-16**), sensitive-operation policy (**D-SEC-17**, shared with ADR-0002), MFA
  recovery (**D-SEC-18**), initial second factor (**D-SEC-19**).
- **Builds on:** D-SEC-11, D-SEC-08 (MFA minimum).

## Context

ClearSettle handles financial data; authentication strength must be high. OQ-55 asked whether MFA should
be universal or limited. The owner approved **universal MFA at login plus step-up for sensitive actions**.
These are complementary layers; step-up is **not** a substitute for the universal baseline.

## Decision

- **Baseline:** every user must satisfy the configured MFA requirement during initial authentication. An
  application session is established **only** after MFA assurance is confirmed from the identity
  provider's authentication evidence.
- **Step-up:** sensitive actions additionally require fresh strong authentication within a short freshness
  window (ADR-0002), verified fail-closed from the ID-token `acr`/`auth_time` (provider-aware), bound to
  the same `(iss, sub)` user, and consumed via an explicit single-use confirmation.
- **Fail-closed:** missing, invalid, insufficient, contradictory, or untrusted authentication evidence is
  treated as a failed authentication requirement.

## Owner decisions of 17 October 2026 (amendment)

The four items flagged by the M1 integration validation were approved as recommended.

### 1. First sign-in after TOTP enrolment creates no session (D-SEC-16)

A user receives an application session only from an authentication that actually verified the required
second factor. Keycloak reports `acr=mfa` for the sign-in that **enrols** TOTP, but its `amr` does not show
that an enrolled factor was verified, so that sign-in is refused. The user then signs in once more with a
code from the newly enrolled authenticator and receives the session. Fail-closed behaviour is unchanged.

So that this is not mistaken for a fault, the refusal has its own code, `auth_error=mfa_not_verified`
(distinct from `mfa_required`, which means the provider performed no MFA at all), and the application tells
the user to sign in once more with a code from the authenticator app. The same rule applies to re-enrolment
after an MFA reset (D-SEC-18).

### 2. Sensitive actions and authentication freshness (D-SEC-17; see ADR-0002)

- **Freshness window: 5 minutes**, configurable (`clearsettle.auth.step-up-freshness-seconds`, default 300;
  production configuration must not weaken it).
- An operation classified as sensitive runs only when (a) the current authentication is at most 5 minutes
  old **and** carries the configured `acr` **and** `amr` evidence (Keycloak: `acr=mfa`, `amr` contains
  `otp`), otherwise after a step-up re-authentication (`prompt=login`, `max_age=0`, `acr_values=mfa`) bound to
  the same `(iss, sub)`; and (b) the same user explicitly confirms the stored action, once. Completing a
  step-up never executes anything. The 8-hour absolute lifetime is not extended by a step-up.
- Mechanism (reusable, `com.clearsettle.auth`): a feature makes an operation sensitive by implementing
  `SensitiveOperation` and starting it through `SensitiveActions.request`, which stores a pending action
  (user, type, parameters) and answers `202 confirmation_required` or `401 step_up_required`; the operation
  runs only from `POST /api/sensitive-actions/{id}/confirm`, which re-checks the evidence and claims the
  action exactly once in the same transaction as the operation. Another user's, an executed, cancelled or
  expired action is refused. Engineering default: an action must be confirmed within 5 minutes of the
  request (`pending-action-ttl-seconds`).
- What executes is what was reviewed (added 19 October 2026): each operation declares the version of what the
  user reviews (`SensitiveOperation.reviewedVersion`), stored with the pending action. A confirmation is
  refused with `409 action_changed`, and the action withdrawn, when the version has changed; the operation
  checks it again under lock before changing anything. The first real operation must also re-check workspace
  membership and role at confirmation.
- **Categories** that require this policy as their features are built (NFR-SEC-004): posting approval;
  period reopening; role and permission changes; offboarding steps a person starts; activation of templates
  and other changes to sensitive financial settings; original-file download. Recommended in addition: an
  administrator's MFA reset of another user (D-SEC-18). Logout and sign-out everywhere are never sensitive.
  Each feature records its operations' classification when it is designed. **No sensitive operation exists
  yet**; the mechanism is verified with a test fixture and a dev-stack-only no-op operation.

### 3. MFA recovery (D-SEC-18)

Administrator-assisted, identity-verified and audited recovery. **No self-service MFA reset** in the
initial implementation. Controlling an email address must never be enough to bypass MFA. On recovery the
user's existing sessions are ended, and normal access returns only after a fresh enrolment and a new
sign-in with the new factor (decision 1). See *Recovery: implemented controls and outstanding work* below.
The policy being recorded does **not** make the recovery process production-ready.

### 4. Initial second factor: TOTP (D-SEC-19)

TOTP is the initial and only second factor, mandatory for every user, using the existing Keycloak
configuration (RFC 6238; TOTP, HmacSHA1, 6 digits, 30 seconds, codes not reusable). SMS is not used.
WebAuthn/passkeys are a possible future enhancement; adopting them needs its own decision (enrolment,
recovery, the `amr` values that would count, and step-up evidence).

## Alternatives considered

- Step-up only (no universal MFA) — rejected; ordinary login would be single-factor.
- Universal MFA only (no step-up) — rejected; a long-lived session could perform a sensitive action
  without fresh proof.
- Risk/adaptive MFA — may complement later; depends on provider signals; not the baseline.
- First-login exception (accept the enrolment sign-in) — rejected 17 October 2026: that sign-in verifies no
  enrolled factor.
- Self-service MFA reset by email — rejected 17 October 2026: email control would bypass MFA.

## Evidence

M0 spike (LIVE-TESTED, Keycloak): step-up required and fail-closed (U-01); full step-up then explicit
single-use confirm, no auto-execute (U-02); **same-user binding** — a different person completing the
step-up is rejected as `reauth_user_mismatch` and the action is not performed (U-03); fail-closed on
missing/weak/malformed `acr` or missing/old/future `auth_time` (U-04). Provider difference
(documentation): Keycloak/Cognito use `acr` levels; Auth0 validates `amr` contains `mfa` — so MFA
confirmation must be **provider-appropriate**, not a fixed claim assumption.

**Not proven by the spike:** that a login is *blocked* when MFA is not satisfied. The spike exercised MFA
within the step-up flow, not as a blocking gate on every initial login. Universal-MFA-at-login enforcement
is therefore an **outstanding** implementation-and-test obligation, not an established fact. **Verified in
M1** (see below).

## Consequences and trade-offs

- Higher assurance at the cost of enrolment/recovery UX and support load (lost-device, reset).
- A dependency on IdP capabilities: a misconfigured or plan-limited provider must not weaken enforcement
  — the application still fails closed on the evidence.
- One extra sign-in after enrolment (decision 1), and administrator effort for every lost device
  (decision 3).

## Required implementation controls

- Enforce MFA at login for **all** users (no bypass); deny session establishment without confirmed MFA
  assurance, read from the configured Keycloak flow's authentication evidence.
- Step-up for each enumerated sensitive action: `401 step_up_required` + pending action; re-auth with
  `prompt=login` + `acr_values`/`max_age`; verify `acr`/`amr`/`auth_time` fail-closed and provider-aware;
  bind to the same user; execute only via explicit single-use confirmation; cancellation/expiry/failed/
  unavailable MFA must **not** authorize.
- MFA **enrolment** path for users without a factor; administrator-assisted, identity-verified, audited
  **reset/recovery** (D-SEC-18).
- Non-sensitive error handling (no token/code/session leakage); security events with correlation IDs.

## Outstanding acceptance criteria (mandatory)

- Test that a user **without** satisfied MFA **cannot** obtain an application session (universal
  enforcement). **Verified in M1** (live: B-01, B-04, B-05, B-06, B-07; unit: `LoginSuccessMfaGateTest`;
  through the real OIDC client with a controlled provider: `OidcCallbackValidationTest`).
- Test enrolment (first-factor-less user is guided to enrol and cannot perform sensitive actions until
  enrolled) and the documented recovery behaviour. **Enrolment verified in M1** (B-01, B-07). **Recovery:**
  the IdP controls that exist are verified (P-08, R-01, R-02, B-08); the identity-verification procedure,
  an audited ClearSettle session revocation and the external review are **OUTSTANDING** (below).
- Re-verify step-up (U-01…U-04 equivalents) in the product against the configured Keycloak flow.
  **Verified in M1** (H-01…H-08, LR-03, LR-04, M-02), including the `step_up_required` response and the
  single-use confirmation, **with a fixture operation**: integration with real sensitive operations is
  **OUTSTANDING** until those features exist.

## Recovery: implemented controls and outstanding work (D-SEC-18)

Implemented in the Keycloak realm (`deploy/keycloak/clearsettle-realm.json`, the reference configuration;
verified on Keycloak 26.8.1):

- Password reset is off (`resetPasswordAllowed: false`), and the realm's reset flow
  (`clearsettle-reset-credentials`) has no *Reset OTP* step, so enabling password reset later cannot turn
  email control into an MFA reset.
- No self-service factor removal: the `delete_credential` required action is disabled; the account
  console offers no removal and its API refuses the deletion (R-01). Users can still **add** an authenticator
  from the account console after a full MFA sign-in; that is not a reset (the existing factor stays), but
  whether to allow it is worth revisiting when the account console's exposure in production is decided.
- An administrator can remove a user's factor and require re-enrolment; Keycloak records it as an admin
  event naming the administrator (admin events on, representation bodies off; user events on, including
  credential and lockout events).
- Brute-force detection protects the TOTP factor (temporary lockout, Keycloak's default thresholds:
  30 failures, 60 s wait increments up to 15 minutes, quick-login check). The thresholds are a FLAG for the
  security review, not an approved value.
- After a reset the user must enrol again, that sign-in gets no session, and the next one with the new code
  does, on the same `(iss, sub)` account; the old code is refused (R-02).

Outstanding (not built; must not be presented as done):

- The identity-verification procedure (who may reset, what evidence is required, recommended second-person
  approval) and its runbook.
- Ending the user's **application** sessions on reset. Keycloak's logout does not reach ClearSettle (no
  back-channel logout): R-02 shows the pre-reset application session still valid after the IdP-side reset.
  The interim operator step (deleting the user's `spring_session` rows) ends it; the production control is
  an audited ClearSettle administrative revocation or OIDC back-channel logout.
- Carrying Keycloak admin and user events into ClearSettle's audit trail and retention (D-DAT-07/08).
  Keycloak's stored user events hold Keycloak session identifiers, usernames and IP addresses by design
  (inspected 17 October 2026; admin events store no request bodies). They are IdP-internal and readable only
  by Keycloak administrators, but they are personal data: no retention period (event expiration) is set
  yet.
- Step-up for the administrator performing a reset; notifying the user of the reset; recovery when the
  administrator is locked out (break-glass).
- External security review before production (NFR-SEC-026).

## Implementation notes from M1 integration testing (2026-10-16/17)

- **`acr` alone is not sufficient MFA evidence with Keycloak.** Live inspection of the issued ID tokens
  showed that Keycloak reports `acr=mfa` on the **enrolment** login (password + first-time TOTP setup)
  with an empty `amr`, because no previously enrolled factor was verified; a normal login reports
  `acr=mfa` with `amr=["otp"]`. The implementation therefore requires `acr=mfa` **and** an `amr` value from
  a configured second-factor set (Keycloak: `otp`; realm has the AMR mapper and authentication references).
  Missing, empty or malformed `amr` fails closed. This applies to the login gate, to step-up and to the
  confirmation of a sensitive action.
- **Consequence:** the enrolment login does not create an application session; the user signs in once more
  with the enrolled code (SSO covers the password). **Approved 17 October 2026 (D-SEC-16).**
- A password-only token (simulated IdP misconfiguration, `acr=pwd`) is refused live.
- **Refused step-up ends the originating session.** When a step-up callback is refused (different person,
  insufficient MFA evidence, account disabled meanwhile) the originating session is ended as well as the
  callback session; the user signs in again. Under `SameSite=Strict` the refusal response already clears
  the browser's session cookie, so this removes an orphaned server-side session rather than changing what
  the user sees. Verified live (H-04, H-05) and by unit tests.
- A user created **without** the TOTP required action must still enrol: the level-2 flow requires the OTP
  form, and Keycloak adds the enrolment itself (B-07).

## Assumptions / limitations

- Recovery is policy plus IdP configuration today; the procedure and ClearSettle-side controls above are
  outstanding, and NFR-SEC-026 requires an external security review before production.
- The sensitive-action categories are shared with ADR-0002.
