# ClearSettle — Master Engineering Requirements Checklist

**Version:** 1.0  
**Prepared:** 15 October 2026  
**Purpose:** Combine the 110 engineering concepts and the “Complete Anatomy of a Vibe-Coded Software System” document into one actionable checklist for ClearSettle.

## 1. Project baseline and how to use this checklist

**Current working architecture:** Java + Spring Boot backend, PostgreSQL database, React + JavaScript frontend, structured as a modular monolith. ClearSettle is a payment-reconciliation product: its core job is to ingest payment/settlement data, match records, surface discrepancies, and support traceable resolution. Confirm any expansion beyond reconciliation before adding it to scope.

This is an engineering acceptance checklist, not yet the frontend visual design plan. Frontend information architecture and visual direction remain a separate discussion.

> **Status update (15 October 2026):** Approved product decisions have since changed this baseline. ClearSettle's MVP now includes a double-entry accounting ledger in addition to reconciliation, and the frontend is Next.js + React + JavaScript. See `docs/product/clearsettle_decision_register.md` (D-PRD-05, D-TEC-03, and §4 for checklist items affected). Where this checklist and the decision register differ, the register governs.

### Priority meanings

- **P0 — Foundational:** design and implement before or alongside the feature that depends on it. Required for core correctness or safe development.
- **P1 — Production baseline:** needed before exposing the relevant capability to real users or real financial data.
- **P2 — Conditional / later:** implement only when the product requirement, traffic, deployment model, or measured evidence justifies it.
- **N/A for current scope:** no current use case. Record why, and reassess if scope changes.

A P2 or N/A is **not** permission to ignore the item silently. The decision and its trigger are documented here. “Implemented” also does not mean “verified”: each P0/P1 item needs evidence from tests, configuration review, deployment checks, or an operational exercise as appropriate.

## 2. Non-negotiable rules for AI-assisted development

- [ ] **One source of truth for architecture.** Maintain concise architecture decisions and module boundaries. Agents must read them before making structural changes.
- [ ] **Consistent domain language.** Define canonical terms for merchant, payment, settlement, transaction, reconciliation run, match, exception, adjustment, and audit event. Do not create multiple names for the same entity across APIs, models, and UI.
- [ ] **Inspect before editing.** Locate the existing implementation and call sites first; avoid inventing files, helpers, APIs, or library methods from memory.
- [ ] **Fix root causes.** Do not silence errors with broad `catch` blocks, empty fallbacks, optional chaining, or default values unless that behavior is intentional and observable.
- [ ] **Refactor instead of append-only patching.** Remove superseded code, dead code, temporary debug output, and unused dependencies when safe. Do not keep duplicate `V2` handlers as a substitute for fixing the original design.
- [ ] **Keep modules small and cohesive.** Avoid giant controllers, service classes, repositories, and React components. Separate business rules, transport/API code, persistence, and presentation.
- [ ] **Runtime validation at trust boundaries.** Validate request DTOs, imports, webhook payloads, and external responses. Frontend JavaScript does not guarantee API response shapes; backend validation is authoritative.
- [ ] **No unreviewed dependency sprawl.** Check whether an existing library or platform capability already solves the problem before adding a dependency. Pin/lock versions and review compatibility and vulnerabilities.
- [ ] **Tests must assert behavior, not mocks.** Use real database integration tests for constraints and transactions; mock only genuine external boundaries. Include invalid inputs, failure paths, authorization, retries, and concurrent requests.
- [ ] **No “green UI = working system” assumption.** A feature is complete only when server-side behavior, persistence, security, failure states, and tests are verified—not just when the page renders or a happy path works.
- [ ] **Small, reviewable checkpoints.** Build and test in small increments. Inspect diffs; stage only related files; never commit secrets, generated junk, or untested unrelated changes.
- [ ] **Never weaken controls to make a build pass.** No disabling tests/lint/security checks, suppressing meaningful compiler warnings, bypassing authorization, or replacing real errors with fake success responses as a shortcut.

## 3. Product and financial correctness requirements

These items are particularly important for a reconciliation system and are not all named explicitly in the source document.

- [ ] **Define financial invariants.** Specify what constitutes a valid payment, settlement line, match, partial match, duplicate, fee, refund, reversal, discrepancy, and resolved exception.
- [ ] **Exact monetary arithmetic.** Use Java `BigDecimal` and PostgreSQL `NUMERIC`/`DECIMAL` with documented precision, scale, currency, and rounding rules. Do not use binary floating-point for financial amounts.
- [ ] **Currency is explicit.** Never assume all records use one currency merely because the initial demo does. Validate currency compatibility before matching or aggregating amounts.
- [ ] **Idempotent imports and processing.** Reimporting the same source file or processing the same event twice must not duplicate financial records or postings. Define stable deduplication keys and source provenance.
- [ ] **Atomic database changes.** A reconciliation action and all its related persistence changes must either commit together or roll back together where they form one business operation.
- [ ] **Database-enforced invariants.** Use unique, foreign-key, not-null and check constraints for rules that can be expressed safely in PostgreSQL. Do not rely solely on frontend validation or check-then-act code.
- [ ] **Concurrency-safe matching.** Two workers or users must not independently claim or finalize the same record in incompatible ways. Choose transaction boundaries and row-locking/version checks deliberately.
- [ ] **Explainable matching.** Persist enough information to explain why records matched, which fields/rules were used, and which tolerance or rule version applied.
- [ ] **Traceable exception resolution.** Record who resolved or overrode an exception, when, the reason, and the before/after state. Do not silently overwrite historical decisions.
- [ ] **Audit trail for sensitive changes.** Prefer append-only audit events for important financial and administrative actions. Restrict audit access and avoid logging secrets or unnecessary personal data.
- [ ] **Reconciliation is reproducible.** Preserve source file/import metadata, relevant rule/configuration versions, and run summaries so results can be investigated later.
- [ ] **Ledger scope decision.** If ClearSettle posts financial journal entries, require a balanced double-entry ledger, immutable posted entries, and correction-by-reversal/adjustment. If the product only reconciles external records and does not maintain a ledger, document that boundary instead of inventing one for the MVP.

## 4. Frontend engineering checklist (React + JavaScript)

This is a quality/reliability checklist only. It deliberately does **not** decide the product’s visual style, page layout, colors, or final navigation.

### Design system, responsive behavior, and accessibility

- [ ] Establish reusable design tokens and component conventions before many pages diverge.
- [ ] Test responsive layouts at narrow mobile widths, typical laptop widths, and wide desktop sizes—not only the developer’s primary screen.
- [ ] Use consistent spacing, typography, focus states, z-index layers, modal behavior, and button semantics. Avoid arbitrary one-off CSS values as the default fix for layout bugs.
- [ ] Ensure keyboard navigation, visible focus, semantic buttons/links/forms, accessible labels, and modal focus trapping/return behavior.
- [ ] Verify color contrast and that status is not conveyed by color alone.
- [ ] If dark mode is supported, test every route, modal, popover, table, and empty/error state—not only the main dashboard.
- [ ] Format amounts with explicit currency and locale-aware formatting; handle date/time zones consistently and avoid implying that browser-local time is the canonical event time.

### State, forms, fetching, and rendering

- [ ] Separate server state from local UI state. Use one agreed server-state/cache strategy rather than a different pattern in each module.
- [ ] Avoid `useEffect` chains for state that can be derived. Review dependency arrays; do not suppress warnings as a standard workaround.
- [ ] Clean up event listeners, timers, subscriptions, observers, and chart instances on component unmount.
- [ ] Cancel or ignore stale requests where navigation/search can cause response-order races; use `AbortController` where appropriate.
- [ ] Avoid nested fetch-on-render waterfalls. Fetch related data intentionally and provide meaningful loading, empty, partial, and error states.
- [ ] Debounce/throttle expensive search requests when useful and enforce server-side pagination/filtering regardless of frontend controls.
- [ ] Prevent duplicate form submissions in the UI **and** enforce idempotency/business uniqueness on the backend.
- [ ] Preserve important in-progress work or warn before leaving a destructive/unsaved form; do not persist sensitive data into browser storage by default.
- [ ] Use optimistic UI only for reversible actions with clear rollback behavior. For financial and audit-critical actions, prefer explicit server confirmation.
- [ ] Paginate large transaction/exception histories. Introduce virtualization only if measurements show it is needed.
- [ ] Avoid fetching tens of thousands of rows for browser-side sorting/filtering. Bound API responses and select only needed fields.
- [ ] Lazy-load heavy charts/export tools and split code where it materially reduces initial load cost.
- [ ] Define cache freshness and invalidation behavior after imports, matches, adjustments, and exception resolution; do not display stale totals as current truth.
- [ ] Avoid polling every second as a substitute for real-time updates. Start with ordinary refresh/polling at a sensible interval if adequate; introduce SSE only if live progress materially improves the workflow.
- [ ] Handle unexpected API shapes and HTTP errors without rendering fake financial values or silently treating failed requests as empty results.

## 5. Backend/API and processing checklist

- [ ] Keep Spring Boot as a modular monolith initially, with explicit module/package boundaries and no unnecessary microservices.
- [ ] Keep controllers thin; business rules belong in application/domain services and persistence rules in repositories/database constraints.
- [ ] Use appropriate HTTP methods and status codes. Do not return `200 OK` for failed operations or mutate state through `GET`.
- [ ] Start with a consistent `/api/v1` API prefix and documented request/response/error conventions.
- [ ] Validate incoming DTOs and enforce authorization in backend services/endpoints, not just in React route guards.
- [ ] Apply request-size, upload-size, pagination and execution-time limits.
- [ ] Use explicit connect/read/request timeouts for external services and background operations.
- [ ] Retry only transient failures, with bounded attempts, exponential backoff and jitter. Do not blindly retry non-idempotent operations.
- [ ] Use a circuit breaker only where a failing external dependency could repeatedly tie up resources or cascade failures; configure and test the fallback behavior.
- [ ] For slow imports, reconciliation runs, or large report exports, move work to a background execution model with persisted status and recoverable job state rather than keeping a long HTTP request open.
- [ ] Choose a durable queue only if the workload/reliability requirement calls for it. If one is adopted, define retry policy, bounded concurrency, backpressure, poison-job handling/DLQ, and observability.
- [ ] Ensure scheduled jobs are coordinated so multiple application instances cannot run the same singleton job accidentally. Use a database-backed scheduler/lock or queue strategy appropriate to the deployment when needed.
- [ ] If payment-provider webhooks are in scope: verify cryptographic signatures, reject invalid timestamps where the provider supports that check, deduplicate deliveries, persist event receipt, handle out-of-order events, and process durably. Never trust a webhook merely because it reaches the endpoint.
- [ ] If users can import by URL in the future, implement SSRF protection (scheme/host allowlists, block private/loopback/link-local/metadata addresses, and revalidate redirects). Prefer file upload over arbitrary URL fetching if that satisfies the requirement.
- [ ] Do not introduce WebSockets, Long Polling, gRPC, Pub/Sub, Saga, or distributed transactions without a demonstrated need.

## 6. Database and file ingestion checklist

- [ ] Use version-controlled database migrations; do not use production schema auto-sync or manual GUI edits as the normal change process.
- [ ] Test fresh database creation and upgrade paths from the previous released schema.
- [ ] Use database constraints for uniqueness and referential integrity; design deletion behavior deliberately for audit/financial records.
- [ ] Add indexes based on query patterns: transaction references, merchant/tenant IDs, statuses, dates, import IDs and frequently joined foreign keys. Validate with actual query plans instead of indexing every column.
- [ ] Review list endpoints for N+1 queries, unbounded `SELECT *`, unbounded joins, and sorting/filtering performed after loading all rows.
- [ ] Configure and monitor JDBC connection pooling with realistic maximum connections, pool timeouts and database capacity in mind.
- [ ] Choose transaction isolation and optimistic/pessimistic locking case by case; establish a consistent lock-acquisition order where practical and test deadlock handling.
- [ ] Ensure tenant/merchant filtering is applied consistently to reads, writes, exports, background jobs, and object storage paths.
- [ ] Impose file size, row count, column count, parsing time, encoding and allowed-format limits. Validate CSV headers and each row; show actionable import errors without accepting partial corruption silently.
- [ ] Store uploaded source artifacts privately when retention is required; use opaque identifiers and authorized access or expiring signed downloads. Never expose private files through guessable public URLs.
- [ ] Avoid buffering arbitrarily large files entirely in memory. Stream or process in bounded chunks when limits warrant it.
- [ ] Document retention and deletion rules for imported payment data, exports, audit logs and backups.

## 7. Security and privacy checklist

- [ ] Choose an explicit authentication/session model; keep implementation consistent. OAuth/SSO is optional unless a product requirement needs it.
- [ ] Enforce authorization server-side on every resource/action. Prevent IDOR by scoping queries and mutations to the authenticated tenant/merchant and the user’s permissions.
- [ ] Use least privilege for application/database/cloud credentials. Separate developer, test and production credentials.
- [ ] Store secrets in environment/secret-manager facilities appropriate to hosting; keep them out of source, logs, screenshots, browser bundles and test fixtures.
- [ ] Enforce TLS/HTTPS in production and protect credentials/session cookies. Encrypt database/storage at rest using platform facilities where available and document residual risks.
- [ ] Configure CORS only for intended frontend origins. Apply CSRF defenses when authentication uses cookies and the request model requires them; do not copy a generic wildcard configuration.
- [ ] Use parameterized SQL/JPA queries; do not interpolate untrusted values into SQL. Review dynamic sorting/column names separately because they often need allowlists.
- [ ] Prevent XSS by avoiding unsafe HTML injection; sanitize only where rendering user-authored rich text is an actual requirement.
- [ ] Use allowlisted DTO fields instead of binding arbitrary request JSON to privileged/domain entities (mass-assignment protection).
- [ ] Apply rate limits to login, password reset, import initiation, expensive reports, webhook ingress and other abuse-sensitive endpoints; tune webhooks so legitimate provider retries are not accidentally lost.
- [ ] Avoid logging passwords, tokens, authorization headers, secret keys, full bank/payment payloads, or unnecessary personal data. Use request/correlation IDs and redaction.
- [ ] Add dependency vulnerability checks to CI and periodically update dependencies deliberately.
- [ ] Decide whether a WAF is warranted from hosting/exposure/threat model; it is defense in depth, not a replacement for application security.
- [ ] Define account recovery, session invalidation, secret rotation, privileged action checks, and audit access before real users are onboarded.
- [ ] Do not add AI/LLM functionality by default. If added later, separately review prompt injection, tool permissions, structured output validation, input/token budgets, cost limits and sensitive-data leakage.

> **Status update (16 October 2026):** The authentication and session model is chosen: D-SEC-11 in `docs/product/clearsettle_decision_register.md`. Spring Boot is the OIDC client and keeps server-side sessions in PostgreSQL; the client-rendered frontend is served from the same origin. The controls it requires are specified in product specification §10.1 (NFR-SEC-001 to NFR-SEC-005 and NFR-SEC-020 to NFR-SEC-026). They are planned controls, not implemented or verified, so the items above stay unchecked. Because the session uses a cookie, CSRF defenses apply, and CORS is not one of them (NFR-SEC-022). Still open: the cookie's `SameSite` value (OQ-57), session limits (OQ-38), the identity provider (OQ-34) and MFA scope (OQ-55).

> **Status update (19 October 2026): MFA recovery and session revocation are not done.** Owner decisions
> D-SEC-16 to D-SEC-19 (17 October 2026) are recorded in the decision register and ADR-0003. The M1
> authentication work verifies the IdP-side recovery controls and most session controls; the evidence is in
> `docs/product/clearsettle_implementation_status.md`. The items below remain **open**.
>
> - Each one blocks onboarding real users (the item above on account recovery and session invalidation).
> - None may be treated as complete because its policy is documented.
> - Later product work must not assume them. In particular, removing a member or resetting a factor is not
>   finished until item 1 exists.
>
> 1. **Ending application sessions on MFA reset or IdP logout** (D-SEC-18, NFR-SEC-023, AC-075, AC-163).
>    - Today a reset or logout in Keycloak does not reach ClearSettle; there is no back-channel logout.
>    - Live test R-02 shows the old application session still valid until an operator deletes the user's
>      `spring_session` rows by hand. That is an interim step, not a control.
>    - Required: an audited administrative session revocation in ClearSettle, OIDC back-channel logout, or
>      both.
>    - Tests: across two application instances, like M-03 to M-05.
>    - Recommended timing: with the remaining M1 backend work (workspaces, audit core).
> 2. **Identity verification for an MFA reset** (D-SEC-18): who may reset a factor, what evidence of
>    identity is required, whether a second person approves, and the runbook. The owner decides this.
> 3. **Safeguards around the reset itself:**
>    - step-up for the administrator who performs it;
>    - notifying the user that their factor was reset;
>    - break-glass recovery when an administrator is locked out.
> 4. **Recovery audit trail and retention:**
>    - Keycloak admin and user events carried into ClearSettle's audit trail (D-DAT-07, D-DAT-08).
>    - A retention period for Keycloak's stored events. They contain Keycloak session identifiers,
>      usernames and IP addresses, and today they never expire.
> 5. **Recovery-related settings awaiting review:**
>    - the TOTP brute-force thresholds (Keycloak's defaults today, flagged for the security review);
>    - whether users may add an authenticator from the Keycloak account console (possible today; it cannot
>      remove the existing factor).
> 6. **Invalidating sessions after a database restore** (NFR-SEC-023). No backup or restore tooling exists
>    yet; the restore runbook must delete every stored session.
> 7. **External security review** of MFA enrolment and recovery before production (NFR-SEC-026).
>
> The checklist items above stay unchecked.

> **Status update (19 October 2026): obligations for the first real sensitive operation.** The sensitive-action
> mechanism (D-SEC-17) has been verified only with a no-op development fixture, which is not evidence that financial
> operations are protected. The first real operation (posting approval, M6) must:
>
> - implement `SensitiveOperation.reviewedVersion` so it changes whenever what the user reviewed changes, and
>   check it under lock in `execute`, throwing `ReviewedStateChangedException` (the framework already refuses a
>   changed action with `409 action_changed` and withdraws it);
> - bind the action to its workspace and re-check the user's membership and role at confirmation;
> - come with PostgreSQL tests of both.
>
> Also open: a retention period and purge for finished `pending_action` rows, with the first real operation or the
> audit core (see the implementation status). The no-op fixture now needs the `local-dev` profile and an explicit
> property, and refuses to start on a non-loopback origin.

## 8. Testing and acceptance evidence

- [ ] Unit tests for matching rules, fees/tolerances, rounding, duplicate detection and state transitions.
- [ ] PostgreSQL integration tests for migrations, unique/check/foreign-key constraints, transaction rollback, locking and idempotency. Do not rely only on an in-memory database for PostgreSQL-specific behavior.
- [ ] API tests for valid, malformed, missing, duplicate, unauthorized and cross-tenant requests with correct HTTP semantics.
- [ ] Import tests for malformed CSV, missing/extra columns, duplicate files, duplicate rows, huge inputs, invalid encodings, partial failures and retry/re-run behavior.
- [ ] Concurrency tests for two simultaneous imports/reconciliation runs, competing exception resolutions, and duplicate event deliveries.
- [ ] Failure tests for database unavailability, external timeouts, interrupted jobs, exhausted retries and retry storms.
- [ ] Frontend tests for loading/empty/error states, duplicate clicks, stale search responses, responsive layout, keyboard access, modal focus and currency/date rendering.
- [ ] End-to-end test of the primary workflow from import through matching to exception review and audit history.
- [ ] Security checks for IDOR/tenant isolation, role escalation, mass assignment, injection, XSS, CSRF where applicable, unsafe uploads and rate limits.
- [ ] Build/lint/test checks run automatically in CI; failures block release.
- [ ] Record test evidence for critical controls in the relevant pull request/checkpoint rather than claiming verification from code inspection alone.

## 9. Deployment, observability, and operations

- [ ] Reproducible local setup and a Docker image appropriate for the application. Use a supported pinned base image, multi-stage build where useful, non-root runtime, minimal build context, and no secrets baked into layers.
- [ ] Separate development/test/production configuration and credentials. Do not rely on local files or process memory for production-persistent state.
- [ ] CI/CD builds from committed source, runs checks, publishes immutable artifacts, and provides a documented deployment and rollback path.
- [ ] Use platform-managed reverse proxy/TLS/DNS where appropriate; keep app ports and administrative endpoints from being publicly exposed unnecessarily.
- [ ] Add startup/readiness/health behavior suitable for the host. A health endpoint should distinguish basic process availability from dependencies needed to safely serve requests.
- [ ] Use structured logs with request/correlation IDs. Redact sensitive data and avoid high-cardinality/noisy logs.
- [ ] Track at least request success/error rates, latency, database pool health, import/reconciliation duration and failures, queue/job backlog if present, and unmatched/exception counts as business-operational signals.
- [ ] Configure actionable alerts for downtime, repeated job failures, database connectivity/pool exhaustion, disk/storage problems and abnormal error rates.
- [ ] Set a small initial reliability target and measurable indicators before production; do not invent a 99.99% objective without infrastructure and ownership to support it.
- [ ] Back up production data, protect backup access and retention, and test restoration. A backup that has not been restored successfully is unverified.
- [ ] Document recovery steps, migration/rollback compatibility, secret rotation and what to do if an import/reconciliation run partially fails.
- [ ] Maintain an incident note/runbook for production failures. After real incidents, record root cause and prevention actions without treating “ask the AI to patch it” as the incident process.

## 10. Cross-reference: all 110 engineering concepts

The status below is a decision for the **current ClearSettle scope**, not a claim that every concept is implemented. Change a status only after recording a reason and, where applicable, the trigger for revisiting it.

> **Status update (15 October 2026):** Approved product decisions have triggered several conditional items in this table, including #15, #20, #21, #69, #72, #82, #83, #100 and #109. The table rows are unchanged; the effect of each decision is recorded in `docs/product/clearsettle_decision_register.md` §4.

### Traffic management, containers, CI/CD

| # | Concept | Decision | ClearSettle handling / trigger |
|---:|---|---|---|
| 1 | Rate Limiting | P0 | Protect login, imports, expensive endpoints and public ingress; include tenant/user-aware limits where appropriate. |
| 2 | Caching | P2 | Add only for measured repeated reads/reference data. Never make a cache the source of truth for financial balances or reconciliation state. |
| 3 | Load Balancing | P2 | Rely on hosting defaults initially; introduce/configure deliberately when multiple instances are needed. |
| 4 | Reverse Proxies | P1 | Use a managed ingress/reverse proxy with HTTPS and appropriate request/header limits. |
| 5 | API Gateways | P2 | Not needed for a single modular backend unless platform/security/integration complexity later warrants one. |
| 6 | CI/CD | P0 | Automated build, tests, lint/static checks, dependency/security checks and release gates. |
| 7 | Docker | P0 | Reproducible local and deployment environment; secure non-root, minimal runtime image. |
| 8 | Kubernetes | N/A for current scope | Avoid orchestration overhead for an initial modular monolith; reassess only with demonstrated deployment needs. |
| 9 | Service Discovery | N/A for current scope | One backend and managed dependencies do not need dynamic service discovery. |

### Resilience and messaging architectures

| # | Concept | Decision | ClearSettle handling / trigger |
|---:|---|---|---|
| 10 | Circuit Breakers | P1, conditional | Apply to unstable external services if repeated failures threaten application capacity; test fallback behavior. |
| 11 | Timeouts | P0 | Explicit timeouts for HTTP calls, jobs, database operations where configurable, and import execution. |
| 12 | Retries | P0 | Bounded and context-aware. Never retry non-idempotent work blindly. |
| 13 | Exponential Backoff | P0 when retrying | Use backoff and jitter for transient dependency failures, plus an overall deadline. |
| 14 | Idempotency | P0 | Essential for imports, webhook/event ingestion, job re-runs and repeated user actions. |
| 15 | Message Queues | P1, conditional | Add durable queue/background worker if imports, reconciliation or exports must survive restarts and exceed request limits. |
| 16 | Pub/Sub | P2 | Introduce only when multiple independent consumers need domain events. |
| 17 | Event-Driven Architecture | P2 | Start with explicit in-process module boundaries/transactions; add asynchronous events for demonstrated needs. |
| 18 | Distributed Transactions | N/A for current architecture | Prefer one PostgreSQL transaction for local state. Reassess only across independently committed systems. |
| 19 | Saga Pattern | P2 | Only for a real multi-system workflow that needs compensating actions; unnecessary for ordinary local DB operations. |
| 20 | Dead Letter Queues | P1 if queue adopted | Isolate exhausted/poison jobs, preserve payload/reference securely, alert and support safe replay. |
| 21 | Cron Jobs | P1 when scheduled work exists | Use reliable scheduling and prevent duplicate execution across instances. |

### Real-time communication and databases

| # | Concept | Decision | ClearSettle handling / trigger |
|---:|---|---|---|
| 22 | WebSockets | N/A for current scope | No bidirectional real-time collaboration requirement currently identified. |
| 23 | Long Polling | N/A for current scope | No need unless a specific server-push requirement emerges and better options are unsuitable. |
| 24 | Server-Sent Events | P2 | Consider for live import/reconciliation progress; begin with sensible status refresh if sufficient. |
| 25 | Database Indexing | P0 | Index real query/join/filter patterns and validate plans with representative data. |
| 26 | Query Optimization | P0 | Bound result size; inspect execution plans and avoid loading whole datasets into the app/browser. |
| 27 | N+1 Queries | P0 | Detect with query logging/tests and use appropriate fetch/join/batch strategies. |
| 28 | Connection Pooling | P0 | Configure Spring/JDBC pool capacity and timeouts against PostgreSQL limits. |
| 29 | Read Replicas | P2 | Only when measured read/reporting load or availability needs justify replica complexity and stale-read handling. |
| 30 | Sharding | P2 / likely deferred | No initial need. Reassess only when a measured scale limit cannot be solved more simply. |
| 31 | Partitioning | P2 | Consider for large, time-oriented transaction/audit tables after measurement. |
| 32 | Replication | P1 through managed DB strategy | Use suitable production database redundancy/managed capabilities; document actual recovery guarantees and limitations. |

### Distributed systems and concurrency

| # | Concept | Decision | ClearSettle handling / trigger |
|---:|---|---|---|
| 33 | Leader Election | P2 | Not needed for a single instance. Use a durable scheduler/coordination mechanism if singleton jobs run on multiple instances. |
| 34 | CAP Theorem | P2, conceptual | Understand consistency/availability trade-offs when adding distributed dependencies; no standalone implementation task. |
| 35 | Eventual Consistency | P2, carefully bounded | Acceptable for job progress/derived summaries when explicit; not for silently inconsistent financial decisions or ledger invariants. |
| 36 | Optimistic Locking | P1 where concurrent edits exist | Use version checking for records where conflicting edits should be detected instead of overwritten. |
| 37 | Pessimistic Locking | P0 where critical rows compete | Use transactions/row locks for claim/finalize operations where uniqueness alone is insufficient; keep lock scope short. |
| 38 | Distributed Locks | P2 | Prefer DB constraints/transactions/scheduler coordination first. Adopt distributed locks only for a proven multi-instance requirement. |
| 39 | Race Conditions | P0 | Test duplicate submissions and concurrent processing/resolution; use database-backed correctness controls. |
| 40 | Deadlocks | P1 | Consistent lock ordering, short transactions, bounded retry of safe transactions, and monitoring. |
| 41 | Memory Leaks | P1 baseline | Clean up resources/listeners and bound in-memory work; investigate leaks before increasing instance size. |
| 42 | Garbage Collection | P2 | Use normal JVM defaults initially; inspect profiles/GC logs only when evidence indicates a problem. |
| 43 | Thread Safety | P0 | Keep request-specific data out of unsafe shared mutable state; use appropriate executor/concurrency controls. |
| 44 | Backpressure | P1 for bulk/asynchronous processing | Bound upload size, queue depth, worker concurrency and batch sizes; fail/slow intake safely when overloaded. |

### Scaling, caching, and release strategies

| # | Concept | Decision | ClearSettle handling / trigger |
|---:|---|---|---|
| 45 | Autoscaling | P2 | Configure when usage and hosting support justify it; require stateless app instances and external persistent state. |
| 46 | Horizontal Scaling | P2 | Keep the app reasonably stateless and jobs coordinated, but do not add nodes before there is a need. |
| 47 | Vertical Scaling | P1 operationally | Right-size service/database using measurements before adding architectural complexity. |
| 48 | CDN | P1/platform default | Use CDN/static asset delivery provided by the frontend host where available. Do not cache private financial API responses publicly. |
| 49 | Edge Caching | P2 | Only for safe public/static content; no default edge caching of authenticated transaction data. |
| 50 | Cache Invalidation | P2 if caching adopted | Specify invalidation/freshness rules and test after mutations; bypass cache for correctness-critical reads if needed. |
| 51 | Feature Flags | P2 | Add for risky/gradual releases or tenant-specific rollout when useful; avoid an ungoverned collection of flags. |
| 52 | Blue-Green Deployment | P2 | Use only if deployment platform and uptime requirements justify two environments and compatible migrations. |
| 53 | Canary Releases | P2 | Defer until meaningful traffic and release automation support controlled exposure/measurement. |
| 54 | Rolling Deployments | P2/platform-managed | Use platform-managed rolling releases when multiple replicas exist; ensure readiness and migration compatibility. |
| 55 | Rollbacks | P0/P1 | Keep deploy artifacts/version history and a documented recovery path; design DB migrations for compatible rollout/rollback. |

### Observability and monitoring

| # | Concept | Decision | ClearSettle handling / trigger |
|---:|---|---|---|
| 56 | Health Checks | P0 | Provide health endpoints suitable for hosting and distinguish dependency health as appropriate. |
| 57 | Liveness & Readiness Probes | P1 / platform-dependent | Configure where the host supports them; Kubernetes is not required to benefit from health/readiness checks. |
| 58 | Monitoring | P1 | Track application, database, import and reconciliation health. |
| 59 | Logging | P0 | Structured logs with correlation/request IDs and redaction; no secrets or excessive financial data. |
| 60 | Distributed Tracing | P2 | Add when requests cross queues/services or logs/metrics no longer pinpoint latency/failures. |
| 61 | Metrics | P1 | Track API errors/latency, pool health, job durations/failures and business processing counts. |
| 62 | Alerts | P1 before production | Alert on actionable outages/failures and define a responder path. |
| 63 | SLOs | P1, modest baseline | Set realistic initial availability/latency/processing goals; revise from measured use. |
| 64 | SLIs | P1 | Measure successful user/API operations and reconciliation completion, not just whether the server responds to ping. |
| 65 | Error Budgets | P2 | Formalize if the service develops meaningful reliability targets/release trade-offs. |
| 66 | Observability | P1 baseline | Combine logs, metrics, health, correlation IDs and operational/business signals. |

### Security and access control

| # | Concept | Decision | ClearSettle handling / trigger |
|---:|---|---|---|
| 67 | Secrets Management | P0 | No secrets in Git, frontend bundles, logs or container images; use suitable secret/config management. |
| 68 | IAM | P0 | Least-privilege users/roles for application, database, cloud and deployment. |
| 69 | OAuth | Conditional | Implement standard OAuth/OIDC only if social login, enterprise SSO or a provider integration requires it. |
| 70 | JWT Rotation | Conditional P1 | Depends on chosen token/session model. If JWTs are used, define short access-token lifetime, refresh rotation/revocation and logout/recovery behavior. |
| 71 | TLS | P0 | Enforce HTTPS, secure cookies and valid certificates in production. |
| 72 | Encryption at Rest | P1 before sensitive production data | Use managed DB/object-storage encryption where available; document sensitive columns and key-access policy. |
| 73 | Encryption in Transit | P0 | HTTPS and secure connections to managed dependencies according to their requirements. |
| 74 | WAF | P2 | Evaluate based on public exposure, hosting features and threat model; defense in depth only. |
| 75 | CORS | P0 | Allow only intended browser origins and required methods/headers. |
| 76 | CSRF | P0 where cookie-auth applies | Apply CSRF protection and appropriate cookie flags if the chosen authentication model is susceptible. |
| 77 | SQL Injection | P0 | Parameterized JPA/SQL, validated inputs and allowlisted dynamic query fields. |
| 78 | XSS | P0 | Safe rendering, no unsafe HTML injection by default, and validation/sanitization for any intentional rich-text case. |
| 79 | SSRF | P1 if URL import exists; otherwise P2 | Protect any server-side URL fetch; omit arbitrary URL import unless needed. |

> **Status update (16 October 2026):** For #69, #70, #75 and #76, see D-SEC-11 and §4 of the decision register:
> - OIDC is used through a managed provider (D-SEC-06).
> - JWTs are not the application session.
> - No cross-origin application access is configured.
> - CSRF protection applies.
>
> These are planned controls; none is implemented or verified.

### Reliability, cloud operations, and performance

| # | Concept | Decision | ClearSettle handling / trigger |
|---:|---|---|---|
| 80 | Database Migrations | P0 | Versioned, tested migrations; no uncontrolled production auto-sync. |
| 81 | Schema Versioning | P0 | Coordinate schema/app changes; prefer expand-migrate-contract for changes requiring old/new versions to overlap. |
| 82 | Disaster Recovery | P1 proportional to data value | Write and test a documented recovery procedure; define acceptable data-loss/downtime targets. |
| 83 | Backups | P0 before real data | Automated backups, access restrictions/retention, and documented restoration tests. |
| 84 | Failover | P1 / managed capability | Understand DB/host failover behavior and its data-loss/downtime limits; avoid claiming automatic failover unless configured. |
| 85 | Multi-Region Deployment | P2 | Defer unless recovery/geographic latency requirements justify the cost and consistency complexity. |
| 86 | Chaos Engineering | P2 | Start with targeted failure tests in non-production; formal chaos experiments only when operational maturity warrants them. |
| 87 | Cost Optimization | P0 baseline | Set resource/upload/job limits, watch DB/storage/log costs and avoid unbounded work. |
| 88 | Cold Starts | N/A for always-on backend | Reassess if a serverless execution model is chosen; not a reason to move Spring Boot to serverless. |
| 89 | Serverless Limits | N/A unless serverless adopted | Still apply upload/payload/request limits; revisit platform execution limits if deployment model changes. |
| 90 | Latency | P0 | Establish baseline API and end-to-end workflow timings; remove avoidable sequential work. |
| 91 | Throughput | P1 | Measure realistic import/reconciliation throughput and bound concurrency. |
| 92 | P99 Latency | P2, then scale-up gate | Add percentile dashboards/load tests as traffic and user expectations grow; do not optimize averages alone. |
| 93 | Tail Latency | P2 | Investigate after collecting percentiles and seeing outliers from locks, jobs or dependencies. |
| 94 | Network Partitions | P2, conceptual/conditional | Timeouts, safe retries and explicit dependency failure states from day one; distributed partition recovery is deferred until architecture needs it. |
| 95 | Clock Skew | P0 baseline | Store canonical timestamps in UTC, synchronize host clocks, preserve provider timestamps and avoid timestamp alone as a unique ordering key. |

### Protocols, infrastructure as code, and incident management

| # | Concept | Decision | ClearSettle handling / trigger |
|---:|---|---|---|
| 96 | DNS | P1 for deployment | Document domain records, HTTPS certificate ownership and recovery/migration steps. |
| 97 | TCP vs UDP | N/A for current scope | Ordinary HTTP APIs and database connections suit the product; no custom real-time media transport. |
| 98 | HTTP/2 & HTTP/3 | P2/platform-managed | Prefer host/CDN defaults; no custom protocol tuning until measurements show a need. |
| 99 | gRPC | N/A for current scope | REST/JSON is suitable for the single backend; reconsider only for justified high-volume internal RPC. |
| 100 | Webhooks | Conditional P1 | If a payment/settlement provider integration uses webhooks, verify signatures, persist receipt, deduplicate, and handle out-of-order delivery. If absent, do not add a fake webhook subsystem. |
| 101 | API Versioning | P0 | Begin with `/api/v1` and documented, consistent payload/error conventions. |
| 102 | Semantic Versioning | P1 | Version app releases/dependencies deliberately and document compatibility expectations for API consumers. |
| 103 | Infrastructure as Code | P2 | Adopt when environments/managed resources are numerous enough to justify reproducible provisioning. Keep a clear written inventory before that. |
| 104 | Terraform | P2 | Optional IaC tool, not a product requirement. Select only if IaC is warranted and Terraform fits the team/host. |
| 105 | Helm Charts | N/A while Kubernetes is not used | No Helm charts unless Kubernetes is deliberately adopted. |
| 106 | Build Caching | P2 | Enable CI dependency/build caching where supported and reliable; correctness must not depend on cache state. |
| 107 | Dependency Hell | P0 | Keep dependencies minimal, use lockfiles/version control, resolve incompatibilities intentionally and scan for known vulnerabilities. |
| 108 | Production Incidents | P1 before production | Prepare a concise incident/runbook and avoid ad-hoc destructive edits to production data. |
| 109 | On-Call | P2 / deployment-dependent | A solo portfolio project need not establish a formal rotation, but production alerts need a named responder and contact path. |
| 110 | Postmortems | P2 / after incidents | After meaningful incidents, record impact, root cause and preventive actions; no blame and no patch-only closure. |

## 11. Additional anti-patterns from the supplied document

The source document includes important failure modes beyond the 110 named concepts. Their ClearSettle treatment is:

- [ ] **Inconsistent state-management patterns:** select a standard React approach and document exceptions.
- [ ] **Hallucinated APIs / stale library syntax:** verify installed versions and official local typings/docs before coding; build after integration changes.
- [ ] **Monolithic “god files”:** enforce sensible module/component size and responsibility through review, not arbitrary line-count rules alone.
- [ ] **TypeScript-specific anti-patterns (`any`, `@ts-ignore`, unvalidated interfaces):** TypeScript is not the selected frontend language, so the exact `any`/`@ts-ignore` issue is not applicable. The underlying runtime-boundary validation requirement **is applicable** to React JavaScript and Spring DTO/integration boundaries.
- [ ] **Dependency/version drift:** use lockfiles, pinned compatible toolchains, deliberate upgrades and CI verification.
- [ ] **Tautological or mock-only tests:** require tests that can fail when real logic is wrong.
- [ ] **Hardcoded layout breakpoints, z-index wars and template homogeneity:** avoid unstructured one-off styling; the visual direction remains to be discussed separately.
- [ ] **`useEffect` waterfalls, stale closures, global-state sprawl and prop drilling:** choose intentional state ownership, derive state where possible, and use lint/test checks.
- [ ] **Fetch waterfalls and stale response races:** plan data dependencies; cancel or sequence stale requests.
- [ ] **Unsafe forms / lost drafts / destructive optimistic updates:** define pending, failed, retry, rollback and unsaved-change behavior per workflow.
- [ ] **DOM bloat and client-side bulk processing:** paginate/filter on the server; measure before introducing virtualization.
- [ ] **Unoptimized bundles/assets and bad cache invalidation:** inspect bundle size, lazy-load heavy tools and define safe cache behavior.
- [ ] **Accessibility and locale blindness:** keyboard/screen-reader checks, contrast, explicit currency formatting and timezone-aware timestamps.
- [ ] **Incorrect HTTP semantics and synchronous heavy work:** standardize API behavior and move long-running work to recoverable background processing when required.
- [ ] **In-memory locks/caches as distributed coordination:** do not use process memory as a correctness mechanism across restarts or instances.
- [ ] **Public-by-default storage / memory-buffered uploads:** private access by default and bounded/streamed file processing.
- [ ] **Client-only auth, IDOR, mass assignment and insecure token storage:** server-authoritative authorization, tenant-scoped data access, field allowlists and a deliberate session/token lifecycle.
- [ ] **AI-specific prompt injection/token drain/fragile JSON parsing:** not applicable while ClearSettle has no AI feature; if an AI feature is proposed, create a separate threat model and acceptance checklist first.
- [ ] **Push-to-main deployment without checks and painful rollback:** CI gates, immutable deployment artifacts and a tested recovery path.
- [ ] **Stateful server assumptions / local-only production files:** persist required state in managed durable systems, not instance-local filesystem or process memory.
- [ ] **ClickOps drift:** document infrastructure ownership and settings; introduce IaC when its value outweighs setup overhead.
- [ ] **No runbooks or learning after outages:** define an owner for alerts and record meaningful incident follow-ups.

## 12. Definition of Done for each feature

A feature is not done until the applicable items below are checked:

- [ ] Requirements and failure cases are clear; domain terminology is consistent.
- [ ] Backend validation and server-side authorization are implemented.
- [ ] Database invariants, transaction boundaries, duplicate handling and concurrency behavior are defined.
- [ ] Loading, empty, success, validation-error, server-error and retry states are handled in the UI where applicable.
- [ ] Unit/integration/API tests exercise positive and negative cases; concurrency/failure tests are included when risk warrants them.
- [ ] No secrets, sensitive logs, dead code, unreviewed dependencies or weakened safeguards were introduced.
- [ ] Lint/build/tests pass in the same state that will be committed/released.
- [ ] Relevant migrations/configuration/docs are updated.
- [ ] The change was reviewed in a focused diff and committed as a small checkpoint.
- [ ] For production changes: observability, rollback/recovery and any operator instructions are addressed.

## 13. Decisions to confirm before implementation expands

These are genuine product/architecture questions, not assumptions to silently make:

> **Status update (15 October 2026):** Questions 1–3 are answered by approved decisions and questions 4–6 are partly answered. Their current status and the remaining open questions are tracked in `docs/product/clearsettle_decision_register.md` §3–§4.
>
> **Status update (16 October 2026):** Question 5 is answered for the architecture by D-SEC-11: managed OIDC, with server-side sessions held by Spring Boot. The identity provider, the cookie's `SameSite` value and the session limits remain open in the register.

1. **Data ingestion sources:** uploaded CSVs only initially, or specific payment-provider APIs/webhooks as well?
2. **Ledger boundary:** will ClearSettle create accounting journal entries, or only reconcile imported payment/settlement/bank records?
3. **Tenant model:** is this multi-merchant SaaS from the start, or a single-organization demonstrator? The security design should still prevent accidental cross-tenant access if multi-tenancy is planned.
4. **Background processing:** what import size, run duration and restart recovery guarantee must the initial version support?
5. **Authentication:** password/session, JWT, or enterprise SSO? Choose one intentionally rather than combining several patterns by default.
6. **Deployment target:** which host/database service and what practical uptime/recovery expectations apply to the first release?

These questions should be answered as scope discussions progress. The checklist may guide specification and planning work now; application implementation begins only after the owner's explicit authorization (see `docs/README.md`).
