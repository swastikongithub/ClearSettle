# ClearSettle — Phased Implementation Plan

**Document status:** Proposal for owner review. **This plan does not authorize implementation.** Application development starts only when the owner explicitly authorizes it (D-PRC-01). After that, each milestone starts only when its entry conditions are met.
**Prepared:** 15 October 2026; revised 16 October 2026 after independent review, and again on 16 October 2026 for the ledger-scope decision D-PRD-08, the workspace-model decision D-PRD-09 and the authentication-architecture decision D-SEC-11
**Inputs:** [Decision register](clearsettle_decision_register.md), [Product specification](clearsettle_product_specification.md), [Specification audit](clearsettle_specification_audit.md), [Engineering checklist](../engineering/clearsettle_master_engineering_checklist.md), [`CLAUDE.md`](../../CLAUDE.md).

## 1. Planning principles

1. **Vertical slices before breadth.** Each milestone delivers something a user can see and a test can verify, cutting through the database, API, background jobs and UI. The first such slice (M3) goes from upload to reconciliation results to exceptions.
2. **Decision gates, not assumptions.** A milestone that depends on an open question (OQ) does not start the dependent work until the owner or specialist has answered it. Safe defaults are already in the specification, but they are not decisions.
3. **The release gate defines "done".** Nothing counts as complete because it compiles, renders or demos well. Every milestone exit needs recorded test evidence (D-REL-01, checklist §12).
4. **No dates or effort estimates.** There is no evidence base for them yet. Sequencing is by dependency only.
5. **High risk first.** Tenant isolation, audit integrity, idempotency and financial invariants are built and tested before the features that rely on them.
6. **Documentation stays authoritative.** Any change to scope or decisions updates the register and specification in the same commit (D-PRC-02).

## 2. Current state (EXISTING, verified 15 October 2026)

- No application code, build files, dependencies or configuration exist. The repository holds documentation, the `frontend-design` skill (`.agents/skills/`) and `skills-lock.json`.
- The local project folder is not yet a Git repository. The GitHub remote has one commit on `main`. See audit AF-09.
- No identity provider, hosting, storage, email or monitoring vendor has been selected (OQ-34, OQ-43).
- No sample gateway or bank reports are available (OQ-07).
- No accounting, legal, tax or security review has taken place.

## 3. Milestone overview

| Milestone | Name | Depends on | Can run alongside |
|---|---|---|---|
| M0 | Decision closure and project setup | Owner review of these documents | External reviews start here and continue |
| M1 | Foundation: architecture, identity, workspaces, tenant security, audit core | M0 and owner authorization | — |
| M2 | File import pipeline (gateway transactions and settlement reports) | M1 | M6 |
| M3 | First end-to-end reconciliation slice (L2 and settlement integrity) | M2 | M6 |
| M4 | Full source coverage: orders (L1), bank statements (L3), grouped matches | M3 | M6 |
| M5 | Exception workflow, manual decisions, revisions and reruns | M4 | M6 |
| M6 | Accounting core: Chart of Accounts, journals, approval, periods, opening balances | M1 | M2 to M5 |
| M7 | Journals drafted from events; reconciliation–ledger linkage | M5, M6, external accounting review | — |
| M8 | Reporting, exports and notifications | M5, M6 (M7 for event-based reports) | Parts of M9 |
| M9 | Data lifecycle, security hardening, operational recovery | M2 (storage), M8 | Parts of M8 |
| M10 | Release verification against the MVP release gate | M1 to M9 | — |
| (later) | Marketing landing page (D-DEF-01) | M10 and separate authorization | — |

**Dependency chain:**
- **Main path:** M0 → M1, then two parallel branches that rejoin at M7:
  - **Reconciliation branch:** M2 → M3 → M4 → M5.
  - **Accounting branch:** M6. The opening-balance template upload in M6 waits for the M2 upload pipeline; the form-based entry does not.
- **After M7:** M7 → M8 → M9 → M10. M8's operational reports can start after M5; its event-based accounting reports need M7.

## 4. Decision gates

Each open question must be answered before the work it gates begins. Answering early lowers risk.

| Gate | Open questions to resolve | Needed by |
|---|---|---|
| G0 — Foundation | Approved: the workspace model, D-PRD-09 (OQ-03 resolved 16 October 2026), and the authentication session architecture A′, D-SEC-11 (OQ-35 resolved 16 October 2026). Neither is a blocker any longer. Also required: the authentication spike report (M0), accepted by the owner. Still to resolve: OQ-05 (operator access principle), OQ-34 (identity provider, decided after the spike), OQ-57 (session cookie `SameSite` value, decided after the spike), OQ-36 (Admin access), OQ-37 (audit and file access), OQ-38 (session defaults), OQ-45 (non-production data), OQ-46 (accessibility target), OQ-47 (UI direction proposal), OQ-48 (versions and tooling), OQ-50 (API conventions), OQ-43 (partial: the secrets approach and the development and CI environments), OQ-55 (MFA for export roles) | M1 |
| G1 — Imports | OQ-07 (first gateways, samples), OQ-08 (schemas from samples), OQ-09 (conflicting observations), OQ-10 (identical file), OQ-39 (card and bank numbers), OQ-49 (job mechanism), OQ-53 (excess precision) | M2 |
| G2 — First reconciliation | OQ-06 (link model), OQ-12 (partial settlements), OQ-13 (expected settlement period), OQ-19 (cross-currency policy: the safe default lets work proceed), OQ-21 (run scope) | M3 |
| G3 — Full coverage | OQ-02 (records outside gateway flows), OQ-11 (split-payment evidence), OQ-20 (narration references), OQ-22 (parameter governance); bank samples (OQ-07) | M4 |
| G4 — Exception controls | OQ-14 (risk criteria), OQ-15 (accepted differences), OQ-16 (statuses), OQ-17 (separation-of-duties scope) | M5 |
| G5 — Accounting core | OQ-56 (supported manual-journal purposes: owner and external accountant; needed before manual journals beyond opening balances and corrections can be posted), OQ-18 (one-person constraint), OQ-19 (functional currency), OQ-26 (closed-period corrections), OQ-27 (default Chart of Accounts: external), OQ-28 (numbering), OQ-29 (financial-year and cutover changes), OQ-31 (template and account governance), OQ-17 (separation-of-duties scope), OQ-51 (unreconciled balances), OQ-52 (year-end close: external) | M6 |
| G6 — Accounting automation | OQ-23 (posting rules: external), OQ-24 (revenue triggers: external), OQ-25 (cutover straddles: external), OQ-33 (tax mapping: external); accountant golden scenarios (AF-91) | M7 |
| G7 — Reporting | OQ-32 (management or statutory: external), OQ-43 (email provider) | M8 |
| G8 — Production readiness | OQ-04 (legal terms), OQ-40 (keys and scanning), OQ-41 (retention: external), OQ-42 (offboarding), OQ-43 (hosting), OQ-44 (performance target), OQ-54 (evidence-file RPO) | M9, M10 |

## 5. Milestones

### M0 — Decision closure and project setup

- **Objective:** Turn the specification into an implementation-ready baseline and set up the repository workflow, without writing product code. The only code is the authentication spike's throwaway prototype, and only if the owner authorizes the spike.
- **Scope:**
  - Owner review of the register, specification, audit and this plan.
  - Resolve gate G0 and as much of G1 as possible.
  - Start the external reviews early, because they take the longest:
    - an accountant for OQ-23 to OQ-28, OQ-32 and OQ-56;
    - legal counsel for OQ-04, OQ-41 and OQ-42;
    - a security reviewer for OQ-05, OQ-39, OQ-57 and the D-SEC-11 spike evidence.
  - Collect anonymized sample reports (OQ-07).
- **Included requirements:** D-PRC-01 to D-PRC-04; audit AF-09, AF-10, AF-11.
- **Deliverables:**
  - The Git repository initialized and linked to the GitHub remote, with commits under the owner's identity and no AI co-author trailers (D-PRC-04). Branch protection on `main` is recommended.
  - Register updated with the owner's decisions; resolved OQs marked APPROVED with their source.
  - The implementation status document (§6) created.
  - Confirmation that the `frontend-design` skill loads in the tooling used.
  - A decision on the CI provider.
  - **Authentication design spike (D-SEC-11 validation gate).** It needs the owner's authorization before it starts. Its prototype code is throwaway and is not merged into the product (D-PRC-01). It produces a written report with test evidence for:
    - OIDC login and callback with PKCE explicitly enabled (inspect the authorization request), `state` and `nonce` validation, exact redirect URIs, and ID-token validation failures (AC-157, AC-158);
    - login and callback behaviour under `SameSite=Lax` and `SameSite=Strict`, including how in-progress login state is stored, to support the OQ-57 decision;
    - CSRF-token issuance and validation, the required custom header, and rejection of forged and cross-origin state-changing requests (AC-160, AC-161);
    - cookie attributes and cookie behaviour across sign-in, logout, expiry and re-authentication (AC-159, AC-162);
    - sign out everywhere across two instances using Spring Session JDBC (AC-163);
    - fail-closed step-up when authentication-strength or recency claims are missing or insufficient, a same-user check on re-authentication, and no automatic replay (AC-164, AC-165);
    - whether a Next.js static export fits the app's routing (dynamic workspace routes) and other requirements (AF-155).
  - **Identity-provider comparison under OQ-34** (recommendation pending owner confirmation: Amazon Cognito and Auth0, with Keycloak for development, CI and as a fallback). It tests real behaviour:
    - OIDC login and logout;
    - MFA enrollment and account recovery (NFR-SEC-026);
    - the authentication-strength and recency evidence each provider actually issues;
    - fail-closed behaviour;
    - revocation and provider-initiated logout;
    - data residency, privacy and contract terms;
    - operational burden, cost, migration and vendor-specific limits.
    It proposes a provider-to-ClearSettle authentication-strength mapping for approval. It selects no production provider.
  - The owner's written authorization to start M1.
- **User-visible outcome:** None. This milestone is documentation and setup, plus the authorized spike.
- **Database, API, frontend:** None in the product. The spike's prototype is discarded after its report.
- **Tests:** Documentation consistency checks (links, ID resolution, status labels), repeated after each change.
- **Acceptance criteria:**
  - Every G0 open question has a recorded decision or an explicitly accepted default.
  - The authentication spike report is complete, its evidence supports the OQ-34, OQ-38 and OQ-57 decisions, and its gaps are recorded.
  - The register, specification and plan agree.
- **Risks and mitigations:**
  - External reviews arrive late, so M7 stalls. *Mitigation:* start them now; M6 can proceed without them.
  - Samples are unavailable. *Mitigation:* M2 cannot be finalized, but only M2 is blocked; M1 and M6 can proceed.
- **Exit conditions:** The owner explicitly authorizes implementation and G0 is satisfied.

### M1 — Foundation: architecture, identity, workspaces, tenant security, audit core

- **Objective:** A running, deployable skeleton in which a user can:
  - sign in;
  - create a workspace, which is one accounting entity (D-PRD-09);
  - belong to several workspaces and switch between them explicitly;
  - invite teammates and assign roles.

  Tenant isolation, server-side active-workspace validation, authorization and audit are enforced and proven by tests from the very first feature. Resolving OQ-03 does not authorize M1: D-PRC-01 still requires the owner's explicit authorization.
- **Included requirements:**
  - Workspace: FR-WSP-001 to FR-WSP-008, FR-WSP-010 (framework), FR-WSP-014, FR-WSP-016 to FR-WSP-018, and FR-WSP-015 for the workspace-owned settings and the ownership pattern.
    - FR-WSP-015's Chart of Accounts, ledger and period tables are built in M6, using the ownership pattern set here.
    - The functional-currency setting in FR-WSP-007 waits for OQ-19 and is delivered in M6.
    - The notification part of FR-WSP-005 waits for the notification work in M5 and M8. Its audit part is in M1.
  - Security: NFR-SEC-001 to NFR-SEC-012, NFR-SEC-014, NFR-SEC-016, NFR-SEC-018, NFR-SEC-019 (if OQ-55 is approved), and NFR-SEC-020 to NFR-SEC-026 (authentication session architecture, D-SEC-11). NFR-SEC-027 arrives with background jobs in M2.
    - Object-storage parts of NFR-SEC-008 are delivered in M2.
  - Audit: NFR-DAT-001 to NFR-DAT-005.
  - Reliability: NFR-REL-005, NFR-REL-008, NFR-REL-009.
  - Operations: NFR-OPS-001 (development and CI environments; staging and production separation completed in M9), NFR-OPS-003, NFR-OPS-004 (baseline), NFR-OPS-005.
  - UX: NFR-UX-002 to NFR-UX-006.
- **Dependencies:** M0; gate G0.
- **Deliverables:**
  - **Spring Boot modular monolith** with explicit module boundaries: identity and workspace, imports, reconciliation, exceptions, accounting, reporting, audit, jobs, notifications. Boundaries are enforced by a build-time architecture test (Recommended).
  - **PostgreSQL** with versioned migrations (tool per OQ-48).
  - **Next.js application shell** with sign-in and workspace screens.
  - **Docker-based local environment,** including a same-origin reverse proxy and a local OIDC provider for development and CI (D-SEC-11).
  - **Server-side sessions** in PostgreSQL through Spring Session JDBC, with the OIDC client configuration validated in the spike (NFR-SEC-001, NFR-SEC-002, NFR-SEC-021 to NFR-SEC-024).
  - **CI** running build, lint, unit tests, integration tests against real PostgreSQL, a dependency vulnerability scan and the permission-matrix test harness.
  - **Health endpoints, structured logging and correlation IDs.**
- **Database:**
  - Workspace, membership, role assignment and invitation tables. One user can hold memberships in several workspaces.
  - Workspace-owned accounting settings (financial-year start, cutover date) stored on the workspace, the accounting entity (D-PRD-09).
  - An append-only audit table: the application role can only insert and read it, and a guard trigger blocks updates and deletes.
  - A non-null workspace ID on every tenant table, plus composite keys that stop records in different workspaces from referencing each other. Every workspace-owned record is tied to its workspace at both the database and the service layer; this is the pattern later milestones follow (FR-WSP-015).
  - Forced row-level security with a fail-closed tenant context. The application database role neither owns the tables nor can bypass row-level security.
- **API:**
  - The `/api/v1` conventions (OQ-50).
  - Authentication and session endpoints per D-SEC-11: OIDC login and callback, logout, sign out everywhere, and a step-up response for sensitive operations. Workspace-scoped routes follow `/api/v1/workspaces/{workspaceId}/...` (FR-WSP-016).
  - Workspace creation, invitation, membership and role endpoints.
  - An explicit active-workspace context on every relevant request. The service layer validates membership, permission and record ownership for that workspace on each request (FR-WSP-016).
  - An endpoint listing the user's own memberships for the workspace switcher. It is the only cross-workspace response (FR-WSP-018).
  - Deny-by-default authorization middleware in the service layer.
- **Frontend:**
  - Before any screen is built, a design proposal produced with the `frontend-design` skill: information architecture, a token system for colour, type and layout, and design principles. It takes the approved references into account (D-UI-02, D-UI-03) and the owner must approve it (D-UI-05, NFR-UX-003).
  - Then the sign-in handoff, workspace creation, explicit workspace switching that clears the previous workspace's client state (D-PRD-09, FR-WSP-017), and member and role management screens.
- **Tests:**
  - Unit tests: the permission evaluator and the separation-of-duties checker.
  - Integration tests against real PostgreSQL: cross-workspace constraints, row-level security failing closed (AC-072), audit append-only behaviour (AC-081), audit written atomically with its change (AC-080), migrations on both a fresh and an upgraded database.
  - API tests: the permission matrix generated from specification §2.3 as approved, with allowed and denied cases per endpoint and role (AF-65); cross-tenant attempts (AC-070, AC-076).
  - Security tests:
    - MFA enforcement for privileged actions (AC-074);
    - session revocation and role removal (AC-075);
    - identity keyed by issuer and subject (AC-131);
    - log redaction scan (AC-132);
    - cache, search and log scoping (AC-133);
    - unique keys that include the workspace (AC-136);
    - rate limits on workspace creation and invitations (AC-145);
    - CSRF and CORS behaviour;
    - mass-assignment attempts.
  - Workspace-model tests (D-PRD-09):
    - a tampered active-workspace identifier is rejected (AC-152);
    - switching does not leak the previous workspace's data (AC-153);
    - no cross-workspace financial views, and workspace creation is audited (AC-156).
  - Audit tests: role-change audit (AC-129) and audit coverage per action type for the actions that exist in M1 (AC-130, extended in later milestones).
  - Database role tests: each role in NFR-SEC-018 can perform only its listed operations.
  - Authentication and session tests (D-SEC-11): AC-157 to AC-166 and AC-168, run against a real local OIDC provider, not protocol mocks.
  - End-to-end tests: J1 onboarding.
- **Acceptance criteria:** AC-070 (except its export and download-link parts, which move to M2 and M8), AC-072 to AC-076, AC-080, AC-081, AC-129 to AC-133, AC-136, AC-145, AC-152, AC-153, AC-156, AC-157 to AC-166 and AC-168 pass in CI. J1 works end-to-end on synthetic users, including a user who belongs to two workspaces and switches between them.
- **Risks and mitigations:**
  - The identity provider cannot assert MFA. *Mitigation:* make MFA assertion a selection criterion; refuse privileged actions if it cannot be asserted (NFR-SEC-003).
  - Row-level security is misconfigured. *Mitigation:* fail-closed tests and a non-owner database role.
  - Design scope creep. *Mitigation:* build only the screens the owner approved.
- **Entry conditions:** G0 is satisfied, and the owner has explicitly authorized implementation (D-PRC-01). The workspace model (D-PRD-09) and the authentication session architecture (D-SEC-11) are already approved. Authentication work starts only after the spike report is accepted and OQ-34, OQ-38 and OQ-57 are decided.
- **Exit conditions:**
  - All M1 tests pass, including the workspace-model criteria AC-152, AC-153 and AC-156, and the authentication criteria AC-157 to AC-166 and AC-168.
  - The implementation status document records the evidence.
  - The owner has reviewed the running skeleton and the approved design proposal.

### M2 — File import pipeline (gateway transactions and settlement reports)

- **Objective:** An analyst can upload real-format gateway transaction and settlement reports, map and validate them, commit the valid rows, quarantine the invalid ones with an exportable error report, and follow the job's progress safely.
- **Included requirements:**
  - Imports: FR-IMP-001 to FR-IMP-018, FR-IMP-021 to FR-IMP-028, FR-IMP-030, and FR-IMP-032 to FR-IMP-034 (gateway source accounts; bank accounts come in M4). Revision requirements FR-IMP-019, FR-IMP-020 and FR-IMP-029 come in M5.
  - Reliability: NFR-REL-001 to NFR-REL-004.
  - Storage and data: NFR-SEC-008, NFR-SEC-017 (source-report uploads), NFR-DAT-010 (mechanism).
  - Background-work authorization: NFR-SEC-027.
  - Performance: NFR-PERF-002, NFR-PERF-003.
- **Dependencies:** M1; gate G1, including at least one gateway's sample files.
- **Deliverables:**
  - Private object-storage integration, with a local emulator in development.
  - A quarantine-area upload flow: file-type, encryption, size and XLSX expansion checks; a sensitive-data screen; fingerprinting.
  - A background job framework (mechanism per OQ-49) with leases, idempotency keys, bounded retries and isolation of permanently failed jobs.
  - A mapping editor with versioned templates and explicit parsing settings.
  - Validation in staging, an idempotent batched commit, the quarantine and error-report export, and import outcomes and warnings.
  - Duplicate and conflicting-observation handling.
  - Settlement group completeness checks.
- **Database:** Source report, import, template and template-version, staging and quarantine tables; source records with observations and identity-key uniqueness constraints per workspace; job tables.
- **API:** Upload, mapping preview, template CRUD, import commit, import status, error-report export, job status.
- **Frontend:**
  - Built with the `frontend-design` skill under the approved design system.
  - Upload, mapping (preview and confirmation of financial fields), validation summary, commit confirmation, import detail, quarantined rows, and job progress.
- **Tests:**
  - Unit tests: parsers for dates, Indian digit grouping, signs and precision; identity-key derivation.
  - Integration tests: idempotent commit under a killed process (AC-009); identity uniqueness constraints.
  - Fixture tests built from the samples: malformed files, wrong encodings, password-protected XLSX, an XLSX expansion bomb, overlapping exports (AC-010), conflicting values (AC-011), incomplete groups (AC-012), card-number detection (AC-014).
  - API and negative tests: AC-001 to AC-008.
  - Mapping and parsing tests:
    - header-signature mismatch (AC-100);
    - amount units (AC-102);
    - XLSX numeric cells, date systems and formulas (AC-103);
    - identifiers kept as exact text (AC-104);
    - overlapping exports across template versions (AC-105);
    - source-account scoping (AC-106);
    - template versioning (AC-108);
    - read-only previews and exports (AC-109);
    - no automatic action on possible duplicates (AC-110).
  - Security tests for files:
    - download-time permission re-check (AC-137);
    - upload controls (AC-135, source reports);
    - error-report formula neutralization (AC-143, error-report part);
    - XML external entities (AC-144).
  - Reliability tests: lease fencing with a stalled worker (AC-138); temporary-artifact cleanup that keeps quarantined rows (AC-141).
  - Job tenant-isolation test: a job given another workspace's record IDs fails without reading or writing them (AC-071).
  - Job re-authorization: a job aborts when its actor loses membership or permission before it runs (AC-167).
  - Cross-tenant export and download-link attempts (the M2 part of AC-070); expired and cross-workspace links (AC-077).
  - Workspace boundaries for jobs and file downloads (the job and file parts of AC-154).
  - A memory-bound test at the row limit (NFR-PERF-002), and baseline throughput measurements on a synthetic 250,000-row file. These results are recorded, not treated as targets.
- **Acceptance criteria:** AC-001 to AC-012, AC-014, AC-071, AC-077, AC-100, AC-102 to AC-106, AC-108 to AC-110, AC-137, AC-138, AC-141, AC-144 and AC-167 pass, plus the M2 parts of AC-070, AC-135, AC-143 and AC-154. J2 works end-to-end.
- **Risks and mitigations:**
  - Real formats differ from the minimum fields in the specification. *Mitigation:* derive fields from the samples and update the specification first.
  - XLSX memory exhaustion. *Mitigation:* streaming parsing and expansion limits.
  - Partial-commit inconsistency. *Mitigation:* the job status is updated in the same transaction as each batch.
- **Exit conditions:** Tests pass, the baseline measurements are recorded, and the owner has reviewed a demonstration using anonymized samples.

### M3 — First end-to-end reconciliation slice (L2 and settlement integrity)

- **Objective:** The first complete vertical slice. An analyst imports gateway transactions and a settlement report, runs Stage 1 L2 reconciliation, and sees matches with their evidence, discrepancies with both values, missing or awaiting settlement items, and settlement-arithmetic exceptions.
- **Included requirements:**
  - Reconciliation: FR-REC-001 to FR-REC-008, FR-REC-020 to FR-REC-026, FR-REC-053 (safe default), FR-REC-060 to FR-REC-062, FR-REC-065 to FR-REC-069.
  - Financial events: FR-FIN-001 to FR-FIN-009.
  - Exceptions: FR-EXC-001 (creation and read), FR-EXC-003, FR-EXC-007, FR-EXC-009.
  - Reports: FR-RPT-005, FR-RPT-014.
- **Dependencies:** M2; gate G2.
- **Deliverables:**
  - A reconciliation run model: versioned scope, an input snapshot, a rule-set version, a lock so only one run per stage is active, and persisted results.
  - An auto-match decision engine implementing FR-REC-003, with persisted evidence.
  - Settlement line and payout arithmetic checks.
  - Event linking and the refund invariant.
  - Exception creation with its exception types.
  - Run results screens.
- **Database:** Runs, rule-set versions, matches and match evidence (unique per record and link while confirmed), exceptions, and links between events.
- **API:** Run trigger and status, run results, match detail with evidence, exception list and detail (read-only plus comments).
- **Frontend:** Run launcher, run summary by outcome and currency, match evidence view, exception list and detail. The traceable chain from file to row to record is visible.
- **Tests:**
  - Unit tests: the auto-match decision table, covering every combination of identifier, amount, currency and contradiction; the arithmetic checks.
  - Scenario tests: AC-020 to AC-024, AC-027, AC-028 (detection), AC-039.
  - Reproducibility and idempotency tests: AC-031, AC-111.
  - Scenario and invariant tests: AC-113, AC-114, AC-116, AC-118, AC-119 (refund part).
  - Traceability test: AC-120, as far as source records and matches (completed in M7).
  - Concurrency test: AC-033.
  - Negative test: cross-currency records are never matched automatically (AC-022).
- **Acceptance criteria:** AC-020 to AC-024, AC-027, AC-028 (detection), AC-031, AC-033, AC-039, AC-111, AC-113, AC-114, AC-116, AC-118, the refund part of AC-119 and the reconciliation part of AC-120 pass. J3 works for L2 on sample-derived data.
- **Risks and mitigations:**
  - Hidden tolerance or rounding shortcuts. *Mitigation:* exact decimal arithmetic tests and code review against FR-REC-007.
  - Runs slow down on large inputs. *Mitigation:* set-based processing in the database, measured against the M2 baseline.
- **Exit conditions:** The owner reviews the slice. The engine's rules are confirmed against real samples before M4 extends them.

### M4 — Full source coverage: orders (L1), bank statements (L3), grouped matches

- **Objective:** All four sources and both stages work, including candidates and the supported grouped relationships.
- **Included requirements:** FR-REC-010 to FR-REC-012, FR-REC-030 to FR-REC-033, FR-REC-040, FR-REC-041 and FR-REC-043 (FR-REC-042 is deferred), FR-REC-005 (candidates); order and bank templates (FR-IMP-006 to FR-IMP-008, FR-IMP-027); bank statement continuity (FR-IMP-031); bank source accounts (FR-IMP-034).
- **Dependencies:** M3; gate G3, including bank samples.
- **Deliverables:**
  - Order and bank mapping templates.
  - L1 linking, covering failed attempts and multiple successful payments.
  - L3 matching with UTR columns or approved narration extraction.
  - The grouped-match allowlist (GR1–GR4).
  - Candidate generation with configurable date windows.
  - Expected settlement periods.
  - The outside-gateway classification (OQ-02).
  - Stage 2 runs and summaries.
- **Database:** Match groups and their members, candidate records, extracted references stored separately from narration, and per-template parameter versions.
- **API and frontend:** Stage 2 run and results, candidate review, and the group detail view.
- **Tests:**
  - AC-023, AC-025, AC-026, AC-029, AC-030.
  - Bank sign conventions (AC-101) and statement continuity (AC-107).
  - Date-window changes leaving confirmed matches intact (AC-112).
  - Group confirmation rules (AC-117).
  - Extraction tests on bank samples.
  - Group ambiguity tests (FR-REC-043).
- **Acceptance criteria:** J3 and J4 work end-to-end across all four sources on sample-derived data.
- **Risks and mitigations:**
  - Narration parsing is unreliable. *Mitigation:* extraction that yields exactly one reference, with candidate-only fallback.
  - Groups confirmed on coincidence. *Mitigation:* the allowlist plus ambiguity tests.
- **Exit conditions:** Tests pass and the owner reviews the work.

### M5 — Exception workflow, manual decisions, revisions and reruns

- **Objective:** Analysts and controllers can investigate, resolve, match, unmatch and approve with evidence. Corrected reports flow through revisions and reruns without losing history.
- **Included requirements:** FR-EXC-001 to FR-EXC-010 (FR-EXC-010's accounting-review item is completed in M7); FR-REC-050 to FR-REC-052, FR-REC-054; FR-REC-063, FR-REC-064; FR-IMP-019, FR-IMP-020, FR-IMP-029; FR-WSP-011, FR-WSP-012; FR-RPT-006, FR-RPT-007; NFR-SEC-017 (evidence attachments); in-app parts of FR-NTF-001; the notification part of FR-WSP-005.
- **Dependencies:** M4; gate G4.
- **Deliverables:**
  - The exception lifecycle and assignment, with evidence attachments stored in private storage.
  - Resolution types, risk classification and approval routing (`Pending approval`), with separation of duties.
  - Manual match and unmatch with optimistic locking.
  - Revision designation, a diff view, and supersede and withdraw handling.
  - "Needs re-review" propagation.
  - Run comparison.
  - The exception and unmatched reports.
- **Tests:**
  - AC-013, AC-032, AC-034 to AC-037, AC-038 (exception side; the journal side is completed in M7).
  - AC-121, AC-122 (approval side), AC-147.
  - Attachment upload controls (AC-135).
  - Concurrency tests for competing resolutions, and for a revision commit racing an active run.
  - Audit coverage of every transition (AC-130).
- **Acceptance criteria:** J5 and J6 work end-to-end, and no exception can be resolved without the required reason and evidence.
- **Risks and mitigations:**
  - Analysts record vague explanations to clear queues. *Mitigation:* structured resolution types that require evidence, plus high-risk approval.
  - A revision cascades unexpectedly. *Mitigation:* the diff is shown before commit and no automatic changes are made to posted data.
- **Exit conditions:** Tests pass and the owner reviews the work.

### M6 — Accounting core: Chart of Accounts, journals, approval, periods, opening balances

Can start after M1, in parallel with M2 to M5.

- **Objective:** The initial double-entry ledger foundation (D-PRD-08): Chart of Accounts foundation, opening balances, accounting periods, the manual-journal lifecycle, independent approval and correction controls. Only explicitly defined journal purposes and approved accounting treatments are supported.
- **Scope limits (D-PRD-08):**
  - No account mappings, posting rules or broad business-transaction workflows are invented to make the ledger look complete.
  - Manual journals can be drafted, validated and approved for any purpose, but are postable only for purposes on the OQ-56 approved list. The approved opening-balance and correction workflows are postable now; counting them as supported is an INFERENCE pending OQ-56.
  - Every other manual-journal purpose needs owner and external-accountant approval under OQ-56 before it is treated as supported. Until then, those drafts stay `Blocked` with "purpose not supported" (FR-ACC-034).
- **Included requirements:** FR-WSP-015 (workspace-scoped Chart of Accounts, ledger, periods, opening balances and cutover, D-PRD-09); FR-ACC-034 (manual-journal purposes and the opening-balance and correction workflows); FR-ACC-001 to FR-ACC-003, FR-ACC-009 to FR-ACC-016, FR-ACC-018 to FR-ACC-022, FR-ACC-028, FR-ACC-029 (as defined under OQ-51), FR-ACC-031; FR-WSP-007 (functional currency, per OQ-19); FR-WSP-010, FR-WSP-013; NFR-SEC-003 and NFR-SEC-004 for approvals; FR-RPT-001 and FR-RPT-002 (trial balance, general ledger, journal report at a basic level). FR-ACC-033 (historical ledger migration) is conditional and not scheduled.
- **Dependencies:** M1; gate G5. OQ-01 no longer blocks M6: the product direction was resolved by D-PRD-08 on 16 October 2026. Posting manual journals beyond opening balances and corrections depends on OQ-56. The form-based opening-balance workflow is separate from the opening-balance *template upload*: only the upload depends on the M2 upload pipeline and its file controls (NFR-SEC-017). The default Chart of Accounts content waits for OQ-27. Until it is approved, accounts are created manually, and no unreviewed default is presented as recommended.
- **Deliverables:**
  - The Chart of Accounts with protected accounts.
  - Financial year and monthly periods.
  - Manual journal drafts with a required purpose; the draft → submit → post lifecycle; posting validation, including the supported-purpose check (FR-ACC-034); atomic, idempotent posting.
  - A list of the manual-journal purposes that still need owner and accountant approval under OQ-56, kept in the implementation status document.
  - Sequence numbering (OQ-28).
  - Reversing and adjusting entries.
  - Opening balances (form and template upload) and the cutover setting.
  - Period close (with the checklist items available at this stage) and reopen.
- **Database:**
  - Journal and journal-line tables. Posted rows are immutable through database privileges and a guard trigger.
  - A uniqueness constraint so the same event cannot be posted twice for the same purpose (used fully in M7).
  - Period state, and links between corrections and the entries they correct.
- **API and frontend:** Chart of Accounts management, the journal editor, the approval queue with step-up authentication, the opening-balance wizard, the period close screen, and trial balance and general ledger views.
- **Tests:**
  - AC-050 to AC-057, AC-059, AC-063, AC-093.
  - Single reversal and single opening entry (AC-125).
  - Cutover lock and pre-cutover postings (AC-126).
  - Close racing a posting (AC-127).
  - One-person workspace (AC-128).
  - Manual-journal validation, supported-purpose blocking and independent approval (AC-149).
  - Two workspaces with different Charts of Accounts and financial years that never cross-reference (AC-155; FR-WSP-015 accounting tables).
  - Concurrency tests on approvals (AC-052).
  - Database immutability (AC-053).
  - Separation-of-duties matrix tests.
- **Acceptance criteria:** J8 to J10 work for manual journals with supported purposes; drafts with unsupported purposes cannot be posted (AC-149); posted entries can never be changed.
- **Risks and mitigations:**
  - Separation of duties is bypassed through role combinations. *Mitigation:* separation is enforced against identities, not roles, and tested for every combination.
  - A balancing line is added "helpfully". *Mitigation:* an explicit test (AC-050) and code review.
- **Exit conditions:** Tests pass and the owner reviews the work.

### M7 — Journals drafted from events; reconciliation–ledger linkage

- **Objective:** Reconciled events produce correct journal drafts under approved templates. Changes in reconciliation surface as controlled corrections.
- **Included requirements:** FR-ACC-004 to FR-ACC-008, FR-ACC-017, FR-ACC-023 to FR-ACC-027, FR-ACC-030, FR-ACC-032; FR-ACC-034 (event-generated purposes); the remaining parts of FR-ACC-019; FR-REC-052 (journal side); FR-EXC-010 (accounting-review item).
- **Dependencies:** M5, M6 and gate G6. **External review must have approved the default templates and revenue triggers.** Without that approval, only the template mechanism may be built, and no default template may be activated (AF-41). Event-to-journal templates and revenue-recognition triggers are activated only after a qualified accountant has approved the applicable policies. The long-term full-ledger direction (D-PRD-08) does not override this gate.
- **Deliverables:**
  - The template engine with versioning, validation and activation approval (OQ-31).
  - Idempotent draft generation and the dependency-based `Blocked` state.
  - The revenue-trigger review queue.
  - Cutover handling, including "Cutover review" exceptions.
  - "Correction required" items and the reconciliation-to-ledger consistency report.
  - The close checklist integrated with exceptions, corrections and cross-currency items.
  - Mapping of tax fields to accounts.
- **Tests:**
  - Accountant-reviewed golden scenarios for every specification §8.10 scenario that has an approved policy (AF-91).
  - AC-028 (journal side), AC-038, AC-058, AC-060 to AC-062.
  - No revenue from an order alone (AC-123).
  - Controlled discards and the completeness check (AC-124).
  - Runs leave posted journals unchanged (AC-115).
  - Full traceability from journal line to source row (AC-120).
  - Accounting-review items from explained differences (AC-122, accounting side).
  - Template activation separation and MFA (AC-146).
  - No postable entries from event types without an approved, active template (AC-148).
  - Unsupported activity listed in the close checklist, never treated as accounted for (AC-151, close-checklist part).
- **Acceptance criteria:** The release-gate path from J2 to J10 works end-to-end on sample-derived data and produces the expected journals from the golden scenarios.
- **Risks and mitigations:**
  - Policy approvals are delayed. *Mitigation:* M8 and M9 work not tied to accounting continues; the release gate cannot pass without M7.
- **Exit conditions:** Tests pass, the accountant signs off the golden scenarios, and the owner reviews the work.

### M8 — Reporting, exports and notifications

- **Objective:** A complete, reproducible, permission-scoped set of reports and exports, plus notifications.
- **Included requirements:** FR-RPT-001 to FR-RPT-015; FR-NTF-001 to FR-NTF-005.
- **Dependencies:** M5, M6, M7 (for reports based on events); gate G7.
- **Deliverables:**
  - Profit and loss and balance sheet, labelled per OQ-32, with "Provisional" status.
  - Coverage disclosures (FR-RPT-015) on every accounting statement and its CSV and XLSX exports, covering:
    - the covered period;
    - source categories present and absent, with data cut-offs;
    - partial imports;
    - supported posting purposes;
    - unposted, submitted and blocked journals;
    - known exclusions and unsupported categories;
    - other incomplete-data warnings.
  - The full general ledger and a journal report with links to evidence.
  - The settlement-fee breakdown and the audit-history export.
  - CSV and XLSX export jobs: private, expiring, with formulas neutralized.
  - Email notifications with content rules and user preferences, sent through an outbox.
- **Tests:**
  - AC-078, AC-079, AC-093 to AC-096.
  - Audit-history export permissions (AC-134).
  - No notification after a rollback (AC-142).
  - CSV and XLSX formula neutralization in exports (AC-143).
  - Coverage disclosures on reports and exports, with partial data, unsupported categories and unposted journals (AC-150).
  - Unsupported activity shown as not accounted for in reports (AC-151, reporting part).
  - Reports, exports and notifications stay inside their workspace (the report, export and notification parts of AC-154).
  - The export part of AC-070 and other export permission and tenant tests.
  - Email content inspection tests.
- **Acceptance criteria:** Every report reconciles to its underlying records; exports change nothing (AC-095).
- **Risks and mitigations:**
  - Reports imply verification or whole-business completeness. *Mitigation:* status labelling (FR-RPT-003) and coverage disclosures (FR-RPT-015) are tested (AC-094, AC-150).
  - Sensitive details leak into email. *Mitigation:* emails are built from content templates that cannot include financial fields.
- **Exit conditions:** Tests pass and the owner reviews the work.

### M9 — Data lifecycle, security hardening and operational recovery

- **Objective:** Prove the system can be operated, recovered and retired safely.
- **Included requirements:** NFR-DAT-006 to NFR-DAT-012; NFR-REL-006, NFR-REL-007; NFR-OPS-002, NFR-OPS-004 to NFR-OPS-007; NFR-SEC-013; NFR-PERF-001, NFR-PERF-004; NFR-UX-001.
- **Dependencies:** M2 (storage), M8; gate G8.
- **Deliverables:**
  - The retention mechanism with legal holds. Automatic deletion stays disabled until periods are approved (NFR-DAT-007).
  - The offboarding workflow.
  - Malware scanning and key management on the selected providers.
  - An evaluation of tamper evidence (D-DAT-02).
  - The operator break-glass procedure (OQ-05).
  - Staging on the selected providers, with point-in-time recovery and object versioning.
  - Monitoring and alerts routed to a named responder.
  - Runbooks for incidents, rollback, restore, credential rotation and suspected cross-tenant exposure.
- **Tests and exercises:**
  - A restore drill measuring RPO and RTO against the targets (AC-092), and a rollback rehearsal.
  - An alert-delivery test, simulated identity-provider and storage outages, and a credential-rotation exercise.
  - Load tests at the import limits against the OQ-44 target.
  - AC-082, AC-083, AC-090, AC-091.
  - Restore safety: sessions invalidated; revocations, holds and deletions re-applied (AC-139).
  - Offboarding sequence (AC-140).
  - Restore drills run from production backups in an isolated recovery environment under production controls (AC-092, NFR-REL-006).
  - An independent security review or penetration test, and an accessibility audit against OQ-46.
- **Acceptance criteria:** Every exercise has recorded evidence. Any target that is not met is reported as not met, with a remediation plan or an owner decision.
- **Risks and mitigations:**
  - Recovery targets are not met on the chosen providers. *Mitigation:* change providers or configuration, or have the owner revise the targets explicitly.
- **Exit conditions:** Evidence is recorded and the security findings are resolved or explicitly accepted by the owner.

### M10 — Release verification against the MVP release gate

- **Objective:** Demonstrate every D-REL-01 criterion with evidence.
- **Scope:**
  - A full end-to-end run on staging with production-like configuration and synthetic or anonymized data.
  - An evidence pack mapping each release-gate item to tests, exercises and reviews.
  - A known-limitations document listing open questions accepted with defaults, deferred scope and unmet targets.
  - Legal terms (OQ-04).
  - A production readiness review.
- **Acceptance criteria:**
  - All seven D-REL-01 items are evidenced.
  - No open Critical or High defects in security or financial integrity.
  - The external verification that D-REL-01 item 7 requires for production suitability is complete. It cannot be waived inside this plan. Not making legal or compliance claims is a separate obligation, not a substitute. Changing this would be an explicit owner change to D-REL-01, recorded in the register (AF-138).
- **Exit conditions:** The owner's go or no-go decision.

## 6. Implementation status document

`CLAUDE.md` asks for an implementation status record, but none exists yet (AF-10). **Recommendation:** create `docs/product/clearsettle_implementation_status.md` at M0, with one row per requirement and these fields:

| Field | Content |
|---|---|
| Requirement ID | FR-…, NFR-… or AC-… from the specification |
| Milestone | M1 to M10 |
| Status | `Not started`, `In progress`, `Implemented`, `Verified`, `Blocked`, `Deferred` |
| Evidence | Test names and CI run reference, exercise record, or review record. Required for `Verified`. |
| Decision dependencies | OQ IDs that still affect it |
| Notes and last updated | Free text and date |

Update rule: the status record changes in the same commit as the work it describes. `Verified` requires evidence (checklist §1, L22).

## 7. Work that can proceed independently

| Workstream | Can proceed once | Notes |
|---|---|---|
| External accounting review (OQ-23 to OQ-28, OQ-32, OQ-33, OQ-56) | Now (documentation only) | The longest-lead dependency for M7; OQ-56 also governs which manual journals M6 can post |
| Legal review (OQ-04, OQ-41, OQ-42) and security review (OQ-05, OQ-39, OQ-57, and the D-SEC-11 spike evidence) | Now | Needed for M9 and M10, and partly for M1 |
| Sample report collection (OQ-07) | Now | Gates M2 |
| UI design proposal (OQ-47) | After implementation is authorized | `CLAUDE.md` requires the proposal before UI is built. No UI work in the current phase. |
| M6 accounting core | After M1 | Independent of the imports and reconciliation modules except for shared audit, auth and jobs |
| Operational setup (staging, backups, monitoring) | After providers are chosen (OQ-43) | Can overlap M3 to M8 |

## 8. Frontend design governance

These rules preserve `CLAUDE.md` L21–47:
- **Skill use:** every UI task uses the `frontend-design` skill.
- **Approval first:** a concrete design proposal is presented and approved before the first screens are built (M1).
- **Approved specifications win:** approved UI specifications override the skill's general recommendations, and visual changes need approval (D-UI-05).
- **Validation:** completed UI is checked for usability, responsiveness, accessibility (target per OQ-46) and every workflow state (NFR-UX-005).
- **Landing page:** it is not built before the core application works end-to-end and the owner gives separate authorization (D-DEF-01).

## 9. Repository workflow

Per D-PRC-04 and the owner's Git instruction:
- **Commits:** small and verified, using the owner's existing Git identity, with no AI co-author trailers or tool attribution.
- **Before committing:** review the staged diff.
- **Pushing:** push after each meaningful commit; never force-push or rewrite history.
- **Branches:** work happens on feature branches, merged after review.
- **Never committed:** secrets, generated artifacts or scratch files.

## 10. What this plan does not do

- It does not authorize implementation, scaffolding, dependency installation or UI work. None of the decisions D-PRD-08 (ledger scope), D-PRD-09 (workspace model) or D-SEC-11 (authentication architecture), all of 16 October 2026, changes this; D-PRC-01 still applies. The authentication spike also needs the owner's authorization.
- It does not estimate dates or effort.
- It does not resolve any open question. Every recommended default stays a recommendation until the owner approves it.
- It does not claim that following it will make ClearSettle secure, compliant or financially correct. Only the evidence required at M10 can support such statements.
