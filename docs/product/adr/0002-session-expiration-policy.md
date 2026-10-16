# ADR-0002 — Session Expiration Policy

- **Status:** Accepted 2026-10-16 (owner approval). Recorded as **D-SEC-13**; resolves **OQ-38** (session
  lifetime values; the fresh-authentication action list remains partly open — see below).
- **Builds on:** D-SEC-11, D-SEC-09 (configurable session controls).

## Context

ClearSettle uses server-side sessions (Spring Session, PostgreSQL-backed) owned by the Spring Boot
backend (D-SEC-11). OQ-38 required default idle/absolute lifetimes and a fresh-authentication policy for
sensitive actions. The M0 spike used short **test** values (90 s idle / 240 s absolute); those were never
policy.

## Decision

- **Idle timeout = 15 minutes.** A session with no qualifying activity for 15 minutes is invalidated.
- **Absolute session lifetime = 8 hours**, anchored to the successful authentication time and **never
  extended by session activity, renewal, or refresh**. At 8 hours the session is refused even if the user
  is active, forcing full re-authentication.
- **Sensitive actions require fresh authentication** (and step-up where applicable, per ADR-0003),
  enforced fail-closed against `auth_time`/`acr`.

## Alternatives considered

- Idle-only (no absolute cap) — rejected for a fintech product.
- Sliding/activity-extended absolute lifetime — rejected; it defeats a maximum session age.
- Other windows (e.g. 30-min idle / 12-h absolute, the earlier unapproved candidates) — acceptable
  variants; 15-min/8-h was approved as the balance of security and a typical workday.

## Evidence

M0 spike (LIVE-TESTED, **at test values, not the policy values**): idle enforced by Spring Session
(T-01, 200→401 after the idle window); absolute cap enforced by a **custom filter** and **not extended by
activity** (T-02: requests at 60/120/180 s all 200, still refused at the limit with `session_expired`).
Spring Session does **not** enforce an absolute lifetime by itself — this is custom code. Invalidation
paths verified: logout (L-02), sign-out-everywhere across instances (L-03), disabled user (L-05),
membership removal (L-06).

## Consequences and trade-offs

- Bounded idle + hard absolute cap limit stolen-session windows and guarantee periodic full re-auth.
- 15-min idle is a common SaaS value; 8-h absolute means at most one forced re-login per working day.
- The absolute cap is custom code (filter) with a correctness surface (clock source, filter order) that
  must be covered by deterministic/controlled tests rather than fragile long timers.

## Required implementation controls

- Idle via `spring.session.timeout` (server-side store authoritative).
- Custom absolute-lifetime control anchored to the authentication timestamp, applied before business
  logic, returning a clear "session expired" response; not resettable by activity.
- Session-ID rotation at the authentication boundary (anti-fixation).
- Invalidation on logout, sign-out-everywhere, disable, and authorization change, enforced on the next
  request on **any** instance (shared store).
- All windows in configuration; local/dev config must not weaken production defaults.

## Outstanding acceptance criteria (mandatory)

- Verify idle expiry at **15 min** and absolute expiry at **8 h despite activity** with deterministic or
  controlled integration tests in the product (mechanisms proven only at spike test values).
- Enumerate the exact **sensitive/high-risk action set** and the **freshness window** (shared with
  ADR-0003). **FLAG:** proposed safe default freshness window = **5 minutes** (consistent with the earlier
  OQ-38 candidate), to be confirmed by the owner.

## Assumptions / limitations

- "Remember me" / long-lived sessions are out of scope and would conflict with the 8-h absolute cap.
