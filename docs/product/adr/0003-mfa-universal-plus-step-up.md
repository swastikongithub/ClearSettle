# ADR-0003 — MFA: Universal at Login + Step-Up for Sensitive Actions

- **Status:** Accepted 2026-10-16 (owner approval). Recorded as **D-SEC-14**; resolves **OQ-55**.
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

## Alternatives considered

- Step-up only (no universal MFA) — rejected; ordinary login would be single-factor.
- Universal MFA only (no step-up) — rejected; a long-lived session could perform a sensitive action
  without fresh proof.
- Risk/adaptive MFA — may complement later; depends on provider signals; not the baseline.

## Evidence

M0 spike (LIVE-TESTED, Keycloak): step-up required and fail-closed (U-01); full step-up then explicit
single-use confirm, no auto-execute (U-02); **same-user binding** — a different person completing the
step-up is rejected as `reauth_user_mismatch` and the action is not performed (U-03); fail-closed on
missing/weak/malformed `acr` or missing/old/future `auth_time` (U-04). Provider difference
(documentation): Keycloak/Cognito use `acr` levels; Auth0 validates `amr` contains `mfa` — so MFA
confirmation must be **provider-appropriate**, not a fixed claim assumption.

**Not proven by the spike:** that a login is *blocked* when MFA is not satisfied. The spike exercised MFA
within the step-up flow, not as a blocking gate on every initial login. Universal-MFA-at-login enforcement
is therefore an **outstanding** implementation-and-test obligation, not an established fact.

## Consequences and trade-offs

- Higher assurance at the cost of enrolment/recovery UX and support load (lost-device, reset).
- A dependency on IdP capabilities: a misconfigured or plan-limited provider must not weaken enforcement
  — the application still fails closed on the evidence.

## Required implementation controls

- Enforce MFA at login for **all** users (no bypass); deny session establishment without confirmed MFA
  assurance, read from the configured Keycloak flow's authentication evidence.
- Step-up for each enumerated sensitive action: `401 step_up_required` + pending action; re-auth with
  `prompt=login` + `acr_values`/`max_age`; verify `acr`/`auth_time` fail-closed and provider-aware; bind
  to the same user; execute only via explicit single-use confirmation; cancellation/expiry/failed/
  unavailable MFA must **not** authorize.
- MFA **enrolment** path for users without a factor; identity-proofed, audited **reset/recovery**.
- Non-sensitive error handling (no token/code/session leakage); security events with correlation IDs.

## Outstanding acceptance criteria (mandatory)

- Test that a user **without** satisfied MFA **cannot** obtain an application session (universal
  enforcement). **OUTSTANDING.**
- Test enrolment (first-factor-less user is guided to enrol and cannot perform sensitive actions until
  enrolled) and the documented recovery behaviour. **OUTSTANDING.**
- Re-verify step-up (U-01…U-04 equivalents) in the product against the configured Keycloak flow.

## Assumptions / limitations & flags

- **FLAG (recovery policy):** a fintech-grade, identity-proofed MFA reset/recovery process is not fully
  specified in existing documentation. Proposed safe default: self-service reset is **disabled**; MFA
  reset requires an audited administrative action with identity proofing. **Owner to confirm.**
- **FLAG (second factor):** factor type (TOTP vs WebAuthn/passkeys; SMS discouraged) not yet decided.
- The sensitive-action set and freshness window are shared with ADR-0002.
