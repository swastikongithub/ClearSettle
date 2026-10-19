# ADR-0002 — Session Expiration Policy

- **Status:** Accepted 2026-10-16 (owner approval). Recorded as **D-SEC-13**; resolves **OQ-38** (session
  lifetime values). **Amended 2026-10-17:** the 5-minute freshness window and the sensitive-operation policy
  were approved (**D-SEC-17**, shared with ADR-0003).
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
  enforced fail-closed against `auth_time`/`acr`/`amr`.
- **Freshness window = 5 minutes** (approved 17 October 2026, D-SEC-17), configurable through
  `clearsettle.auth.step-up-freshness-seconds`. A sensitive operation also needs the user's explicit,
  single-use confirmation, and a step-up does not extend the 8-hour absolute lifetime. The categories and
  the mechanism are recorded in ADR-0003 (decision 2).

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
  controlled integration tests in the product (mechanisms proven only at spike test values). **Verified in
  M1:** idle at 15 minutes on the wall clock (LR-01) and at controlled time (D-03); absolute at 8 hours
  despite activity at controlled time (D-04); both on a second application instance (M-06).
- Enumerate the exact **sensitive/high-risk action set** and the **freshness window** (shared with
  ADR-0003). **Resolved 17 October 2026 (D-SEC-17):** 5 minutes; the categories of NFR-SEC-004, each wired
  when its feature is built. Verified with a fixture operation: 5 minutes on the wall clock (LR-02, LR-03,
  LR-04) and at controlled time (`SensitiveActionFlowTest`). Integration with real sensitive operations is
  **OUTSTANDING** (none exists yet).
- Invalidate restored sessions after a database restore (NFR-SEC-023). **OUTSTANDING:** no backup/restore
  tooling exists yet; the restore runbook must delete all `spring_session` rows before service resumes.

## Assumptions / limitations

- "Remember me" / long-lived sessions are out of scope and would conflict with the 8-h absolute cap.
