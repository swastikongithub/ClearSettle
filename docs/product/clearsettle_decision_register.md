# ClearSettle — Decision Register

**Document status:** Consolidated for owner review. Authentication (M1) implementation is authorized as of 16 October 2026 (owner authorization, following the M0 spike and the approval of D-SEC-12 to D-SEC-15). On 19 October 2026 the owner approved the frontend design defaults (D-UI-07 to D-UI-13) and authorized the application UI to proceed in the approved build order. Other areas remain in specification; implementation of those is not yet authorized.
**Consolidated:** 15 October 2026; revised 16 October 2026 after independent review; D-PRD-08 (ledger scope), D-PRD-09 (workspace and accounting entity) and D-SEC-11 (authentication architecture) recorded 16 October 2026; D-SEC-12 to D-SEC-15 (identity provider, session policy, MFA, SameSite) recorded 16 October 2026 after the M0 spike, resolving OQ-34, OQ-38, OQ-55 and OQ-57 and authorizing M1 authentication implementation; M1 verification and implementation notes added to D-SEC-11 to D-SEC-15, 17 October 2026 (decision text unchanged); D-SEC-16 to D-SEC-19 (first sign-in after enrolment, sensitive-operation policy, MFA recovery, second factor) recorded 17 October 2026 after the owner approved the four M1 security-policy recommendations; D-UI-07 to D-UI-13 (frontend design defaults) recorded 19 October 2026; implementation notes added to D-SEC-13 and D-UI-13, 20 October 2026 (decision text unchanged); an `amr` timing note added to D-SEC-14, 20 October 2026 (decision text unchanged); back-channel logout notes added to D-SEC-13, D-SEC-18 and D-UI-13, 20 October 2026 (decision text unchanged).
**Primary source:** [`clearsettle_approved_decisions_seed.md`](clearsettle_approved_decisions_seed.md), cited below as "Seed §n, Lxx".
**Related documents:** [Product specification](clearsettle_product_specification.md), [Specification audit](clearsettle_specification_audit.md), [Implementation plan](clearsettle_implementation_plan.md), [Engineering checklist](../engineering/clearsettle_master_engineering_checklist.md), [Pre-consolidation register (archived)](archive/clearsettle_decision_register_pre_consolidation.md).

This register is the authoritative record of what has and has not been decided. The product specification turns these decisions into requirements. When the two disagree, this register governs until the specification is corrected.

## How to read this register

### Status labels

| Label | Meaning |
|---|---|
| APPROVED | Explicitly approved by the owner. The evidence is the seed, an owner instruction in the 15 October 2026 consolidation brief, a later explicit owner decision recorded here with its date (for example D-PRD-08, 16 October 2026), or an entry marked "Confirmed" in the prior register that nothing later contradicts. "APPROVED (engineering rule)" marks a rule that the owner's project instructions (`CLAUDE.md`) make binding through the engineering checklist; the owner may override it. |
| EXISTING | A verified fact about the current repository. |
| RECOMMENDATION | A proposed solution that has not been approved. |
| INFERENCE | A reasonable interpretation of approved decisions that still needs owner confirmation. |
| UNRESOLVED | An open decision. Every unresolved item has an `OQ-` entry in section 3. |
| DEFERRED | Deliberately excluded from the current scope. |
| EXTERNAL REVIEW REQUIRED | Needs validation by a qualified accounting, legal, tax, privacy or security specialist. |

An entry can carry more than one label. For example, "APPROVED; EXTERNAL REVIEW REQUIRED" means the direction is approved but its professional details still need validation.

### Sources and precedence

1. **Owner instructions and decisions** given in the working sessions:
   - the 15 October 2026 product consolidation brief, cited as "Brief §A–G";
   - the Git and GitHub workflow and attribution rules, cited as "Git instruction";
   - the ledger-scope decision of 16 October 2026 (Option C), cited as "Owner decision, 16 October 2026";
   - the workspace and accounting-entity approval of 16 October 2026, cited as "Owner approval, 16 October 2026 (workspace model)";
   - the authentication-architecture approval of 16 October 2026 (A′), cited as "Owner approval, 16 October 2026 (authentication architecture)";
   - the approval of the four M1 security-policy recommendations of 17 October 2026 (first sign-in after enrolment, sensitive actions and freshness, MFA recovery, second factor), cited as "Owner approval, 17 October 2026 (security policy)".
2. **The seed**, which is the primary record of discovery decisions.
3. **Project instructions:** [`CLAUDE.md`](../../CLAUDE.md), [`docs/README.md`](../README.md) and the [engineering checklist](../engineering/clearsettle_master_engineering_checklist.md).
4. **The prior register.** Where it conflicts with the seed, the seed governs. Section 5 records the disposition of every prior entry.

Line references were verified against the files on 15 October 2026.

### Entry format

Each decision records the following fields:
- **Status**
- **Decision**
- **Rationale** (marked *(source)* when stated in a source, *(inferred)* when not)
- **Behaviour** required of the product or system
- **Constraints** on financial integrity, privacy or security
- **Depends on**
- **Tests** (acceptance-test implications)
- **Source**
- **Open** (related `OQ-` questions)

---

## 1. Decision index

| ID | Title | Status |
|---|---|---|
| D-PRD-01 | Payment reconciliation and accounting platform | APPROVED |
| D-PRD-02 | Launch customer: SMB finance and accounting teams | APPROVED |
| D-PRD-03 | India-first, globally extensible | APPROVED |
| D-PRD-04 | Production-oriented product | APPROVED |
| D-PRD-05 | MVP boundary: reconciliation, ledger, core accounting | APPROVED |
| D-PRD-06 | No blanket scope expansion | APPROVED |
| D-PRD-07 | No AI/LLM features by default | APPROVED (engineering rule) |
| D-PRD-08 | Full-ledger vision with staged initial-release scope | APPROVED |
| D-PRD-09 | Workspace represents one accounting entity | APPROVED |
| D-TEC-01 | Java and Spring Boot backend | APPROVED |
| D-TEC-02 | PostgreSQL, shared database | APPROVED |
| D-TEC-03 | Next.js, React and JavaScript frontend | APPROVED |
| D-TEC-04 | Modular monolith with separated frontend over REST/JSON | APPROVED |
| D-TEC-05 | Internal APIs only | APPROVED |
| D-TEC-06 | Private object storage for uploads | APPROVED |
| D-TEC-07 | Useful simplicity over speculative infrastructure | APPROVED |
| D-UI-01 | `frontend-design` skill governs UI work | APPROVED; EXISTING |
| D-UI-02 | Stripe as the polish benchmark | APPROVED |
| D-UI-03 | Authentication visual reference | APPROVED (reference); UNRESOLVED (specification) |
| D-UI-04 | Marketing visual reference | APPROVED (reference); DEFERRED (build) |
| D-UI-05 | No unapproved redesigns | APPROVED |
| D-UI-06 | One Next.js app with three experiences | INFERENCE |
| D-UI-07 | Visual direction: palette, IBM Plex Sans, the settlement chain | APPROVED (19 October 2026) |
| D-UI-08 | Navigation: eight sections, Records, admin tools under Settings | APPROVED (19 October 2026) |
| D-UI-09 | Amount formatting and currency boundaries | APPROVED (19 October 2026) |
| D-UI-10 | Accessibility WCAG 2.2 AA and browser support | APPROVED (19 October 2026) |
| D-UI-11 | Frontend architecture and dependencies, added only when needed | APPROVED (19 October 2026) |
| D-UI-12 | The application's own sign-in experience | APPROVED (19 October 2026) |
| D-UI-13 | Frontend build order | APPROVED (19 October 2026) |
| D-IMP-01 | Four source-data categories | APPROVED |
| D-IMP-02 | CSV and XLSX uploads | APPROVED |
| D-IMP-03 | Guided column mapping and templates | APPROVED |
| D-IMP-04 | Validation and staging before commit | APPROVED |
| D-IMP-05 | Partial import with quarantine | APPROVED |
| D-IMP-06 | Evidence-based duplicate detection | APPROVED |
| D-IMP-07 | Idempotent reruns and retries | APPROVED |
| D-IMP-08 | Reject unsafe or unsupported files | APPROVED |
| D-IMP-09 | Initial import limits (50 MB, 250,000 rows) | APPROVED (initial engineering limits); performance unverified |
| D-IMP-10 | Asynchronous, memory-efficient parsing | APPROVED |
| D-IMP-11 | Explicit report revisions | APPROVED |
| D-IMP-12 | Preserve original source values | APPROVED |
| D-IMP-13 | Traceable uploads, metadata and errors | APPROVED |
| D-REC-01 | Two linked reconciliation stages | APPROVED |
| D-REC-02 | Payment attempts as separate records | APPROVED |
| D-REC-03 | No merging or sum-based aggregation of payments | APPROVED |
| D-REC-04 | Identifier-first matching with safeguards | APPROVED |
| D-REC-05 | Reference with amount mismatch is a discrepancy | APPROVED |
| D-REC-06 | Missing or ambiguous references give suggestions only | APPROVED |
| D-REC-07 | No blanket amount tolerance | APPROVED |
| D-REC-08 | Date windows filter candidates only | APPROVED |
| D-REC-09 | Stage 1 identifier hierarchy | APPROVED |
| D-REC-10 | Stage 2 identifier hierarchy | APPROVED |
| D-REC-11 | Match shapes 1:1, 1:N and N:1 | APPROVED |
| D-REC-12 | Conditions for grouped matches | APPROVED |
| D-REC-13 | Evidence-based manual matching | APPROVED |
| D-REC-14 | Authorized unmatching | APPROVED |
| D-REC-15 | Structured exception management | APPROVED (status list is not exhaustive) |
| D-REC-16 | Risk-based approval of exceptions | APPROVED (policy); UNRESOLVED (thresholds) |
| D-REC-17 | No silent changes; gateway and bank disagreements | APPROVED |
| D-REC-18 | Versioned, comparable reconciliation runs | APPROVED |
| D-REC-19 | Reconciliation kept separate from postings, with links | APPROVED |
| D-FIN-01 | Gross and net are separate concepts | APPROVED |
| D-FIN-02 | Explicit financial components and events | APPROVED |
| D-FIN-03 | Settlement report is the breakdown evidence | APPROVED |
| D-FIN-04 | Separate, linked refund and chargeback events | APPROVED |
| D-FIN-05 | Explicit currency in a multi-currency model | APPROVED |
| D-FIN-06 | No guessed FX; FX reconciliation deferred | APPROVED; DEFERRED (FX) |
| D-FIN-07 | Exact monetary arithmetic | APPROVED (engineering rule) |
| D-ACC-01 | Double-entry accrual ledger | APPROVED |
| D-ACC-02 | Journal drafts from business events | APPROVED; UNRESOLVED (rules) |
| D-ACC-03 | Evidence-based revenue recognition | APPROVED; EXTERNAL REVIEW REQUIRED |
| D-ACC-04 | Draft → review → authorized posting | APPROVED |
| D-ACC-05 | No self-approval of journals | APPROVED |
| D-ACC-06 | Posting blocks | APPROVED |
| D-ACC-07 | Immutable posted entries; corrections by reversal or adjustment | APPROVED |
| D-ACC-08 | Customizable Chart of Accounts | APPROVED; EXTERNAL REVIEW REQUIRED (defaults) |
| D-ACC-09 | Customizable accounting templates | APPROVED; EXTERNAL REVIEW REQUIRED (defaults) |
| D-ACC-10 | Validated, versioned accounting rules | APPROVED |
| D-ACC-11 | Guided opening balances | APPROVED |
| D-ACC-12 | Accounting cutover date | APPROVED |
| D-ACC-13 | Monthly periods with controlled close and reopen | APPROVED |
| D-ACC-14 | Period-close checklist | APPROVED |
| D-ACC-15 | Configurable financial year (default 1 April–31 March) | APPROVED |
| D-ACC-16 | Tax-aware data; GST compliance deferred | APPROVED; DEFERRED (GST); EXTERNAL REVIEW REQUIRED |
| D-RPT-01 | Core accounting reports | APPROVED |
| D-RPT-02 | Operational reports and exports | APPROVED |
| D-RPT-03 | One source of truth; permission-scoped reports | APPROVED |
| D-RPT-04 | Exports never modify records | APPROVED |
| D-SEC-01 | Five predefined roles | APPROVED |
| D-SEC-02 | Multiple roles with separation of duties | APPROVED |
| D-SEC-03 | Backend authorization is mandatory | APPROVED |
| D-SEC-04 | Tenant scope on every access path | APPROVED |
| D-SEC-05 | Least privilege and audited role changes | APPROVED |
| D-SEC-06 | Managed authentication via OIDC | APPROVED; UNRESOLVED (provider) |
| D-SEC-07 | Self-service workspace onboarding | APPROVED |
| D-SEC-08 | MFA for privileged users | APPROVED |
| D-SEC-09 | Session controls | APPROVED; UNRESOLVED (defaults) |
| D-SEC-10 | Layered tenant isolation in shared PostgreSQL | APPROVED |
| D-SEC-11 | Authentication session architecture A′ | APPROVED (architecture); sub-decisions resolved by D-SEC-12 to D-SEC-15 (16 October 2026) |
| D-SEC-12 | Identity provider: Keycloak (OIDC Auth Code + PKCE S256) | APPROVED (16 October 2026); resolves OQ-34 |
| D-SEC-13 | Session policy: 15-min idle, 8-h absolute (not extended by activity) | APPROVED (16 October 2026); resolves OQ-38 |
| D-SEC-14 | MFA: universal at login plus step-up for sensitive actions | APPROVED (16 October 2026); resolves OQ-55 |
| D-SEC-15 | SameSite cookie strategy V3 (Strict session cookie + Lax `__Host-CSLOGIN`) | APPROVED (16 October 2026); resolves OQ-57 |
| D-SEC-16 | The sign-in that enrols TOTP creates no session; the user signs in once more | APPROVED (17 October 2026) |
| D-SEC-17 | Sensitive operations: 5-minute freshness, step-up, single-use confirmation | APPROVED (17 October 2026); completes OQ-38 |
| D-SEC-18 | MFA recovery: administrator-assisted, identity-verified, audited; no self-service reset | APPROVED (policy, 17 October 2026); EXTERNAL REVIEW REQUIRED |
| D-SEC-19 | Initial second factor: TOTP for every user | APPROVED (17 October 2026) |
| D-DAT-01 | Append-only application audit trail | APPROVED |
| D-DAT-02 | Tamper evidence evaluated later; no unproven claims | APPROVED |
| D-DAT-03 | Private encrypted object storage | APPROVED |
| D-DAT-04 | Safe file access and validation | APPROVED |
| D-DAT-05 | Data minimization and masking | APPROVED |
| D-DAT-06 | Controlled workspace offboarding | APPROVED |
| D-DAT-07 | Category retention policies and legal holds | APPROVED |
| D-DAT-08 | Numeric retention periods | UNRESOLVED; EXTERNAL REVIEW REQUIRED |
| D-OPS-01 | Background jobs with tracked status | APPROVED |
| D-OPS-02 | In-app and email notifications | APPROVED |
| D-OPS-03 | Environments and delivery pipeline | APPROVED |
| D-OPS-04 | No secrets in the repository | APPROVED |
| D-OPS-05 | Backup and tested recovery | APPROVED |
| D-OPS-06 | RPO ≤ 1 hour, RTO ≤ 4 hours (engineering targets) | APPROVED (targets); unverified |
| D-OPS-07 | Consistent recovery without duplicate effects | APPROVED |
| D-REL-01 | MVP release gate | APPROVED |
| D-PRC-01 | No implementation until explicitly authorized | APPROVED |
| D-PRC-02 | Engineering standards apply | APPROVED |
| D-PRC-03 | No silent changes to decisions; no invented facts | APPROVED |
| D-PRC-04 | Git and GitHub workflow and attribution | APPROVED |
| D-DEF-01–07 | Deferred scope | DEFERRED |

---

## 2. Decisions

### 2.1 Product and market

#### D-PRD-01 — Payment reconciliation and accounting platform
- **Status:** APPROVED
- **Decision:** ClearSettle is a payment reconciliation and accounting platform for businesses.
- **Rationale (source):** This is the recorded product definition. It replaces the prior register's "reconciliation-focused platform" direction (see D-PRD-05).
- **Behaviour:** The product imports payment-related reports, reconciles them in two linked stages, manages discrepancies and keeps a double-entry ledger with core accounting workflows.
- **Constraints:** Anything beyond the MVP boundary needs owner approval (D-PRD-06).
- **Tests:** Covered by the release-gate end-to-end workflow (D-REL-01).
- **Source:** Seed §1, L20; Brief §A, §D.
- **Open:** None for the ledger's scope direction: OQ-01 was resolved by D-PRD-08 on 16 October 2026. Supported manual-journal purposes remain open (OQ-56).

#### D-PRD-02 — Launch customer: SMB finance and accounting teams
- **Status:** APPROVED
- **Decision:** The first release is optimized for finance and accounting teams at small and medium-sized businesses. Individual merchants and SaaS/online businesses may be supported over time.
- **Rationale (source):** The first release should focus on one customer type.
- **Behaviour:** Defaults, roles and workflows assume small finance teams in which one person may hold several roles (D-SEC-02).
- **Constraints:** Supporting small teams must not weaken separation of duties (D-ACC-05).
- **Tests:** End-to-end scenarios include a small team with combined roles. Those scenarios must still prove no self-approval.
- **Source:** Seed §1, L21, L23; Brief §A.
- **Open:** OQ-18.

#### D-PRD-03 — India-first, globally extensible
- **Status:** APPROVED
- **Decision:** India is the launch market. The architecture stays globally extensible.
- **Rationale (inferred):** Indian defaults lower setup effort for the launch market. Extensibility avoids rebuilding the model later.
- **Behaviour:**
  - Indian defaults where the seed approves them, such as a 1 April–31 March financial year (D-ACC-15).
  - Every amount carries an explicit currency (D-FIN-05).
  - No hardcoded India-only assumptions in the data model.
  - INFERENCE: import parsing will need Indian date formats (DD/MM/YYYY) and Indian digit grouping; this needs confirmation from sample files (OQ-07).
- **Constraints:** Legal and regulatory questions are assessed for India by qualified advisers (D-DAT-08).
- **Tests:** Import validation covers ambiguous day/month dates and Indian digit grouping. Currency handling is tested with more than one currency.
- **Source:** Seed §1, L22; Brief §A.
- **Open:** OQ-07, OQ-19, OQ-41.

#### D-PRD-04 — Production-oriented product
- **Status:** APPROVED
- **Decision:** ClearSettle is built for potential real businesses, not as a portfolio demonstrator. This ambition does not by itself prove production readiness or legal compliance.
- **Rationale (source):** Recorded ambition.
- **Behaviour:** Checklist P1 "production baseline" items must be met before real customer data is processed. Release follows D-REL-01.
- **Constraints:** No claim of production readiness or compliance without evidence.
- **Tests:** Release-gate evidence (D-REL-01).
- **Source:** Seed §1, L24; Brief §A. Supersedes prior register Decision 10 (open).

#### D-PRD-05 — MVP boundary: reconciliation, ledger and core accounting
- **Status:** APPROVED
- **Decision:** The MVP is reconciliation plus a double-entry accounting ledger and core accounting workflows.
- **Rationale (source):** "This is a larger product commitment than reconciliation-only functionality" (Seed §6, L150).
- **Behaviour:** The MVP includes:
  - imports and two-stage reconciliation;
  - exception management;
  - Chart of Accounts and journals with independent approval;
  - accounting periods, opening balances and cutover;
  - core accounting and operational reports.
- **Constraints:** The ledger rules in checklist §3 apply: balanced double entry, immutable posted entries, and correction by reversal or adjustment. How far the ledger reaches in the initial release, and in the long term, is set by D-PRD-08.
- **Tests:** Accounting invariants (D-ACC-04 to D-ACC-07) and the release gate (D-REL-01).
- **Source:** Seed §1, L25 and §6, L150; Brief §D. Supersedes prior register Decision 4 and its "Product type" row. Answers checklist §13 question 2.
- **Open:** OQ-01 was resolved for product direction by D-PRD-08 (16 October 2026). Supported manual-journal purposes are in OQ-56.

#### D-PRD-06 — No blanket scope expansion
- **Status:** APPROVED
- **Decision:** Deferred items (D-DEF-01 to D-DEF-07) stay out of the MVP. Any proposed addition must state the added scope and its dependencies, and needs owner approval.
- **Source:** Seed §1, L28 and §12; Brief §G.

#### D-PRD-07 — No AI/LLM features by default
- **Status:** APPROVED (engineering rule)
- **Decision:** No AI/LLM functionality unless the owner later requests it. A proposal must come with a separate threat model and acceptance checklist.
- **Source:** Checklist §7, L137 and §11, L350; prior register row "AI features" ("Current direction").

#### D-PRD-08 — Full-ledger vision with staged initial-release scope
- **Status:** APPROVED
- **Decision:** ClearSettle's long-term product direction is a complete business ledger, introduced gradually. The initial release limits posting to approved, evidence-backed payment-related workflows and explicitly supported manual journals, until the relevant accounting policies have been approved.
- **Rationale (source):** It keeps the approved long-term ambition while stopping the first release from overstating its accounting coverage or enabling unreviewed financial rules.
- **Behaviour:**
  - Automated journal generation and posting use only approved, evidence-backed workflows and authorized accounting rules (D-ACC-02, D-ACC-09, D-ACC-10).
  - Manual journal drafts follow the same controls as every other journal: balance validation, review, independent approval, posting, accounting periods, immutability and audit (D-ACC-04 to D-ACC-07, D-ACC-13, D-DAT-01).
  - Only explicitly supported manual-journal purposes and approved accounting treatments count as supported. The initial release does not include dedicated payroll, procurement, accounts-payable, accounts-receivable or expense-management modules.
  - No invented default makes an unsupported or ambiguous accounting case automatically postable.
  - Accounting reports and exports disclose their actual coverage, relevant source-data limitations, and incomplete or unposted activity. A balanced ledger is never presented as proof that the business's whole activity is recorded.
- **Constraints:** Keeps double-entry validation, separation of duties, no self-approval, immutable posted entries, auditable reversals and adjustments, and the existing policy-approval requirements (OQ-23, OQ-24, OQ-27, OQ-32).
- **Depends on:** D-ACC-01 to D-ACC-07, D-RPT-01 to D-RPT-04, D-REL-01, D-PRD-05, D-PRD-06.
- **Tests:** No unapproved event rule produces a postable entry (AC-148). Manual journals are validated and independently approved (AC-149). Reports disclose incomplete coverage without misleading (AC-150). Unsupported activity is never silently treated as accounted for (AC-151). The release gate (D-REL-01) applies unchanged.
- **Source:** Owner decision, 16 October 2026 (Option C: full ledger, introduced gradually), given in the working session; see §7.
- **Does not decide:** accounting policies, which manual-journal purposes are supported (OQ-56), revenue-recognition triggers (OQ-24), event-to-journal rules (OQ-23), whether reports are management or statutory (OQ-32), or how records outside gateway flows are handled (OQ-02). It does not authorize implementation (D-PRC-01).
- **Open:** OQ-56, OQ-23, OQ-24, OQ-32, OQ-02.

#### D-PRD-09 — Workspace represents one accounting entity
- **Status:** APPROVED
- **Decision:** One workspace represents one accounting entity and owns exactly one Chart of Accounts, one ledger and one financial year. A user may belong to several workspaces and must switch between them explicitly. The MVP provides no cross-workspace financial views.
- **Rationale (source):** It sets clear accounting boundaries and supports tenant isolation in a shared PostgreSQL database.
- **Behaviour:**
  - Every workspace-owned financial record belongs to exactly one workspace.
  - The active workspace is explicit, and validated server-side on every relevant request.
  - Membership in one workspace grants no access to another.
  - Switching updates the active context. It must not leak data through caches, queries, reports, exports, files, background jobs or notifications.
  - The Chart of Accounts, ledger, accounting periods, financial year, opening balances and cutover all belong to the workspace's accounting entity.
  - Any later cross-workspace consolidation feature needs a separate approved decision.
- **Constraints:** Keeps backend authorization, deny-by-default access, tenant-scoped queries, layered database isolation, composite tenant constraints, audit history and cross-tenant negative tests (D-SEC-03, D-SEC-04, D-SEC-10). The approved layered isolation design is unchanged.
- **Depends on:** D-SEC-01, D-SEC-03, D-SEC-04, D-SEC-07, D-SEC-10, D-ACC-01, D-ACC-08, D-ACC-12. *(The approval also listed D-PRD-09 among its own dependencies. That self-reference is not recorded as a dependency; the owner should confirm whether another decision was intended.)*
- **Tests:**
  - No access to another workspace's records without membership and permission (AC-070).
  - A tampered active-workspace identifier is rejected (AC-152).
  - Switching does not leak earlier data (AC-153).
  - Jobs, file downloads, reports, exports and notifications stay within their workspace (AC-154, with AC-071, AC-077, AC-079).
  - Two workspaces keep separate Charts of Accounts and financial years (AC-155).
  - No cross-workspace financial views; workspace creation is audited (AC-156).
- **Source:** Owner approval in the ClearSettle product-discovery conversation, 16 October 2026 (workspace model); see §7.
- **Does not decide:** the session and token design (OQ-35, since resolved by D-SEC-11 on 16 October 2026); Admin access to financial data (OQ-36); the functional currency (OQ-19); operator access (OQ-05). It does not authorize implementation (D-PRC-01).
- **Open:** OQ-36, OQ-19.

### 2.2 Technology and architecture

#### D-TEC-01 — Java and Spring Boot backend
- **Status:** APPROVED
- **Decision:** The backend uses Java with Spring Boot.
- **Source:** Seed §2, L32. Supersedes the prior register's "current working architecture; final approval still required".
- **Open:** OQ-48 (versions and build tool).

#### D-TEC-02 — PostgreSQL, shared database
- **Status:** APPROVED
- **Decision:** PostgreSQL. The MVP uses one shared database with layered tenant isolation (D-SEC-10).
- **Constraints:**
  - Monetary columns use exact `NUMERIC` types (D-FIN-07).
  - Schema changes go through versioned migrations (checklist §6, L108).
- **Source:** Seed §2, L33 and §9, L202.
- **Open:** OQ-43 (hosting), OQ-48 (migration tool).

#### D-TEC-03 — Next.js, React and JavaScript frontend
- **Status:** APPROVED
- **Decision:** The frontend uses Next.js, React and JavaScript. TypeScript has not been selected and needs explicit owner approval.
- **Constraints:** Without static types, runtime validation is required at every boundary: API responses, forms and imported data (checklist §11, L336).
- **Source:** Seed §2, L34; prior register rows "Frontend framework" and "Frontend language".
- **Open:** OQ-48. The prior register named the Next.js App Router as the "selected direction"; the seed does not mention it.

#### D-TEC-04 — Modular monolith with a separated frontend over REST/JSON
- **Status:** APPROVED
- **Decision:** The application is a modular monolith. Frontend and backend are separate and communicate through REST/JSON APIs.
- **Behaviour:** One Spring Boot deployable with explicit module boundaries. A separate Next.js frontend. Versioned internal APIs under `/api/v1` (checklist §5, L93).
- **Constraints:** No microservices, gateway, queue or distributed transactions without demonstrated need (checklist §5, L104).
- **Source:** Seed §2, L35.
- **Session design:** D-SEC-11 (OQ-35 resolved 16 October 2026).
- **Open:** OQ-50 (API conventions).

#### D-TEC-05 — Internal APIs only
- **Status:** APPROVED
- **Decision:** Internal APIs are in scope. A public, customer-facing API is deferred (D-DEF-03).
- **Source:** Seed §2, L36.

#### D-TEC-06 — Private object storage for uploads
- **Status:** APPROVED
- **Decision:** Uploaded source reports go to private object storage, and PostgreSQL holds their metadata. Specific vendors are not selected.
- **Source:** Seed §9, L204 and §10, L221.
- **Open:** OQ-43.

#### D-TEC-07 — Useful simplicity over speculative infrastructure
- **Status:** APPROVED
- **Decision:** Prefer the simplest design that meets real requirements. Infrastructure is added only on demonstrated need.
- **Source:** Seed §2, L39; checklist §5, L90 and L104; `CLAUDE.md` L73.

### 2.3 UI and design governance

#### D-UI-01 — `frontend-design` skill governs UI work
- **Status:** APPROVED; EXISTING
- **Decision:** The `frontend-design` skill is used for frontend design and implementation once implementation is authorized. Approved product requirements and UI specifications take precedence over the skill's general recommendations.
- **Existing fact:** The skill file is at `.agents/skills/frontend-design/SKILL.md`. `skills-lock.json` records its source as `anthropics/skills`.
- **Behaviour:** Where no UI direction is approved, a concrete design proposal is presented for approval before any UI is built.
- **Source:** Seed §2, L37; `CLAUDE.md` L21–47.
- **Open:** OQ-47.

#### D-UI-02 — Stripe as the polish benchmark
- **Status:** APPROVED
- **Decision:** Stripe is the benchmark for professional polish, whitespace, typography, clarity and visual craft. ClearSettle must not clone it.
- **Source:** Prior register row "Design reference" ("Confirmed reference"). The seed is silent.

#### D-UI-03 — Authentication visual reference
- **Status:** APPROVED (as a reference); UNRESOLVED (precise specification)
- **Decision:** A clean, restrained authentication form paired with a flowing multicolour animated background, based on a screenshot the owner supplied.
- **Existing fact:** The screenshot is not in the repository (verified 15 October 2026).
- **Source:** Prior register row "Authentication visual reference".
- **Open:** the screenshot is still missing, but on 19 October 2026 the owner directed that it must not block the product UI (D-UI-12). It is needed only for the separate, optional Keycloak login theme.

#### D-UI-04 — Marketing visual reference
- **Status:** APPROVED (as a reference); DEFERRED (implementation, see D-DEF-01)
- **Decision:** A polished landing page with a pointer-responsive radial or petal-like visual. ClearSettle's implementation must be original.
- **Existing fact:** No reference assets are in the repository.
- **Source:** Prior register rows "Marketing visual reference" and "Marketing landing page".

#### D-UI-05 — No unapproved redesigns
- **Status:** APPROVED
- **Decision:** Follow the user-approved UI specification. Ask before making visual or interaction changes outside it.
- **Source:** Prior register row "UI governance"; `CLAUDE.md` L34–39.

#### D-UI-06 — One Next.js app with three experiences
- **Status:** INFERENCE
- **Decision:** One Next.js application hosts separate marketing, authentication and workspace experiences.
- **Rationale:** Listed as the "selected direction" in the prior register. The seed does not restate it.
- **Source:** Prior register row "Frontend framework".
- **Open:** OQ-48.

The seven entries below record the owner's approval, on 19 October 2026, of the defaults in the frontend
design proposal (`docs/design/clearsettle_frontend_design_proposal.md` §10), with the owner's clarifications.

#### D-UI-07 — Visual direction
- **Status:** APPROVED (owner approval, 19 October 2026)
- **Decision:** The proposed palette (ink, paper, sheet, rule, petrol, amber), IBM Plex Sans with its condensed cut for references, and the settlement chain as the one signature element.
- **Behaviour:** Professional, restrained and precise. No unnecessary gradients, decorative animation or generic dashboard-template styling. Amber marks differences and the data gaps behind them only; outcome colours mark outcomes only; status is never shown by colour alone.
- **Depends on:** D-UI-01, D-UI-02, D-UI-05.
- **Source:** Owner approval, 19 October 2026 (design defaults).
- **Open:** none.

#### D-UI-08 — Navigation
- **Status:** APPROVED (owner approval, 19 October 2026)
- **Decision:** Eight sections: Overview, Imports, Reconciliation, Exceptions, Records, Ledger, Reports, Settings. "Records" replaces "Transactions". Administrative tools sit under Settings.
- **Constraints:** No separate Admin section until the admin-access decision (OQ-36) is resolved. Navigation shown by permission is a convenience; the server enforces every permission.
- **Source:** Owner approval, 19 October 2026 (design defaults).
- **Open:** OQ-36.

#### D-UI-09 — Amount formatting and currency boundaries
- **Status:** APPROVED (owner approval, 19 October 2026)
- **Decision:**
  - Indian digit grouping for INR (`1,24,500.00`); international grouping for other currencies.
  - Working amounts are never abbreviated.
  - A minus sign for negative amounts on working screens. Parentheses on profit-and-loss and balance-sheet views only.
  - Exported values stay numeric and machine-readable (plain decimals, currency in its own column).
- **Constraints:**
  - Amounts in different currencies are never added together.
  - A payment's gross amount is never compared with a settlement's net amount as if they were equivalent (FR-FIN-001).
  - Amounts are formatted from the API's exact decimal strings, never through floating-point numbers.
- **Note:** the owner's example wrote the rupee sign (`₹1,24,500.00`). The proposal's convention stands unless the owner says otherwise: the ISO code (`INR`) in tables and wherever currencies can mix, the sign allowed in prose.
- **Source:** Owner approval, 19 October 2026 (design defaults).
- **Open:** none.

#### D-UI-10 — Accessibility and browser support
- **Status:** APPROVED (owner approval, 19 October 2026). Resolves OQ-46.
- **Decision:** WCAG 2.2 AA. The current and previous versions of Chrome, Edge, Firefox and Safari. Review workflows usable on phones.
- **Constraints:** No device-testing service or other paid resource without separate authorization. Until real Safari, iOS and Android testing is available, those results are recorded as outstanding (Playwright WebKit and device emulation are not those browsers).
- **Source:** Owner approval, 19 October 2026 (design defaults).
- **Open:** real-browser and real-device testing (infrastructure, authorization).

#### D-UI-11 — Frontend architecture and dependencies
- **Status:** APPROVED (owner approval, 19 October 2026). Resolves the frontend-library part of OQ-48.
- **Decision:** Keep the Next.js static export and React, with same-origin API access (D-SEC-11). Add libraries incrementally, when a screen needs them:
  - Radix primitives for dialogs and menus;
  - TanStack Query when server-state management becomes necessary;
  - TanStack Table and virtualization for the data-heavy tables.
- **Constraints:** Fonts and icons live in the repository. No CSS framework, all-in-one component kit or animation library without a concrete need and a documented justification.
- **Source:** Owner approval, 19 October 2026 (design defaults).
- **Open:** OQ-48 (backend tooling: migration tool).

#### D-UI-12 — The application's own sign-in experience
- **Status:** APPROVED (owner approval, 19 October 2026)
- **Decision:** The product UI is not blocked on the D-UI-03 screenshot. The application's own sign-in experience follows the approved visual direction (D-UI-07), with a polished, Stripe-inspired fintech aesthetic as high-level inspiration, without copying another product's interface. The Keycloak login theme is a separate, optional design task that can be refined later.
- **Depends on:** D-UI-02, D-UI-03, D-UI-07.
- **Source:** Owner approval, 19 October 2026 (design defaults).
- **Open:** the Keycloak login theme (optional).

#### D-UI-13 — Frontend build order
- **Status:** APPROVED (owner approval, 19 October 2026)
- **Decision:**
  1. The application shell and the session experience, including returning the user to the page they asked for after sign-in and warning before the idle session expires.
  2. The backend session-revocation work (engineering checklist §7), before the workspace-members screen.
  3. The remaining approved screens and workflows in dependency order (proposal §9). No screen is built against fabricated data or APIs.
- **Source:** Owner approval, 19 October 2026 (design defaults).
- **Open:** none.
- **Implementation (20 October 2026):** step 1 is built. It covers the shell, the sign-in states, return to the page asked for, the idle warning, Security and sessions, and the review page for sensitive actions. Sections without a backend show a not-built state. Evidence: `clearsettle_implementation_status.md`, "Application shell". Step 2, the backend session revocation, followed the same day (next item).
- **Implementation (20 October 2026), step 2:** the backend session revocation is built: OIDC back-channel logout and one revocation service shared with sign out everywhere, verified on two instances (`clearsettle_implementation_status.md`, "Backend session revocation"). Removing a member will call the same service. Not built: an audited administrative revocation (needs the administrator role), and sessions that outlive their Keycloak session (LR-05). The workspace-members screen has not started.

### 2.4 Source data and imports

#### D-IMP-01 — Four source-data categories
- **Status:** APPROVED
- **Decision:** The four in-scope source categories are:
  1. merchant orders;
  2. payment-gateway transactions and payment attempts;
  3. gateway settlement reports;
  4. bank statements.
- **Source:** Seed §3, L43–48; prior register row "Initial record categories".
- **Open:** OQ-07, OQ-08.

#### D-IMP-02 — CSV and XLSX uploads
- **Status:** APPROVED
- **Decision:** The MVP accepts CSV and XLSX report uploads. Direct payment-gateway integrations are deferred (D-DEF-02).
- **Constraints:** Only CSV and XLSX are accepted. INFERENCE: legacy `.xls` and macro-enabled workbooks are therefore rejected.
- **Source:** Seed §1, L27 and §5, L135. Supersedes prior register Decision 6 ("CSV first or both?"). Answers checklist §13 question 1.

#### D-IMP-03 — Guided column mapping and reusable templates
- **Status:** APPROVED
- **Decision:**
  - Users preview headers and sample rows, map source columns to ClearSettle fields, and save reusable templates for recurring formats.
  - The system suggests mappings automatically only when confidence is high.
  - Ambiguous or financially important mappings require the user's confirmation.
- **Constraints:** A wrong mapping of an amount, sign, currency or date silently corrupts reconciliation, so these mappings always need explicit confirmation.
- **Tests:** A mapping with an unconfirmed financial field cannot be used. A template applied to a file with mismatched headers is not silently applied.
- **Source:** Seed §5, L136–137. Supersedes prior register Decision 6 ("fixed templates vs user-defined mappings").
- **Open:** OQ-22.

#### D-IMP-04 — Validation and staging before commit
- **Status:** APPROVED
- **Decision:** Before committing records, the system validates date formats, decimal separators, currency, signs, required fields and source-specific structure. Data is staged before the database commit where appropriate.
- **Tests:** Malformed dates, ambiguous separators, missing currency, wrong signs and missing required fields are each detected and reported per row.
- **Source:** Seed §5, L138–139.

#### D-IMP-05 — Partial import with invalid-row quarantine
- **Status:** APPROVED
- **Decision:**
  - Valid rows import. Invalid rows are excluded and quarantined, with specific reasons and an exportable error report.
  - The import shows `Partially imported` and warns that reconciliation may be incomplete.
  - Invalid rows are never silently ignored or treated as reconciled.
- **Constraints:** Partial imports must not produce incomplete settlement groups that are then treated as complete. See audit finding AF-22 and requirement FR-IMP-014.
- **Source:** Seed §5, L140–141. Supersedes prior register Decision 6 ("reject whole file or quarantine?").

#### D-IMP-06 — Evidence-based duplicate detection
- **Status:** APPROVED
- **Decision:**
  - File-level duplicates are detected from a content fingerprint plus relevant metadata.
  - Row-level duplicates are detected from reliable source transaction identifiers and other keys.
  - Identical amounts or dates alone never prove duplication.
- **Source:** Seed §3, L118 and §5, L142.
- **Open:** OQ-09, OQ-10.

#### D-IMP-07 — Idempotent reruns and retries
- **Status:** APPROVED
- **Decision:** Re-uploading a file and rerunning reconciliation are different operations. Neither reruns nor retries create duplicate financial records or postings.
- **Tests:**
  - Retrying an interrupted import leaves exactly one copy of each record.
  - Rerunning reconciliation creates no duplicate matches or journal drafts.
- **Source:** Seed §3, L117 and §5, L143; checklist §3, L46.

#### D-IMP-08 — Reject unsafe or unsupported files
- **Status:** APPROVED
- **Decision:** Unsupported, corrupted, encrypted or unsafe files are rejected with a clear reason.
- **Source:** Seed §5, L144.
- **Open:** OQ-39, OQ-40.

#### D-IMP-09 — Initial import limits
- **Status:** APPROVED as initial engineering limits; performance unverified
- **Decision:** 50 MB per file and 250,000 rows per CSV or XLSX file.
  - The limits are configurable per deployment, and stricter limits can be set per tenant.
  - They are starting limits, not performance guarantees, and must be validated by load tests before production.
- **Constraints:** INFERENCE: XLSX is a compressed format, so a 50 MB file can expand far beyond 50 MB of data. Limits on uncompressed size and cell count are also needed (RECOMMENDATION; see AF-68).
- **Source:** Seed §5, L145; Brief §F.
- **Open:** OQ-44.

#### D-IMP-10 — Asynchronous, memory-efficient parsing
- **Status:** APPROVED
- **Decision:** Substantial imports run asynchronously with memory-efficient parsing.
- **Source:** Seed §5, L146 and §10, L213.
- **Open:** OQ-49.

#### D-IMP-11 — Explicit report revisions
- **Status:** APPROVED
- **Decision:**
  - Authorized users can explicitly designate a corrected report as a revision of an earlier report.
  - Earlier file and import history is preserved.
  - Revised data is reconciled in a new versioned run, and the changes are shown.
  - A replacement never silently deletes financial records or rewrites posted entries. Accounting effects follow journal approval and period-close controls.
- **Source:** Seed §3, L119–120; Brief §B.

#### D-IMP-12 — Preserve original source values
- **Status:** APPROVED
- **Decision:** Original source-reported values are preserved. One source's value never overwrites another's to remove a mismatch.
- **Source:** Seed §3, L71 and L111.

#### D-IMP-13 — Traceable uploads, metadata and errors
- **Status:** APPROVED
- **Decision:** Every upload is traceable, with import metadata, job status, safe retries and clear processing errors.
- **Source:** Seed §3, L118 and §10, L214; Brief §B.

### 2.5 Reconciliation

#### D-REC-01 — Two linked reconciliation stages
- **Status:** APPROVED
- **Decision:** Two linked stages:
  1. Payment-to-settlement reconciliation.
  2. Settlement-to-bank verification.
- **Constraints:** The seed's identifier hierarchy places the payment-to-settlement-line link under "Stage 2". The specification therefore defines three links grouped into the two stages (INFERENCE; see AF-06).
- **Source:** Seed §3, L50–53; prior register Decision 1.
- **Open:** OQ-06.

#### D-REC-02 — Payment attempts as separate records
- **Status:** APPROVED
- **Decision:**
  - Each payment attempt is a separate, traceable record, linked to an order where the evidence supports it.
  - Failed and cancelled attempts stay traceable but do not count as successful payments.
  - Successful payments move into settlement reconciliation.
- **Source:** Seed §3, L57–59; prior register Decision 1.
- **Open:** OQ-08 (provider status semantics).

#### D-REC-03 — No merging or sum-based aggregation of payments
- **Status:** APPROVED
- **Decision:**
  - Multiple successful attempts are never silently merged.
  - Successful payments are never aggregated automatically just because they sum to the order total.
  - Automatic aggregation requires explicit evidence that split payments are valid for that order. Otherwise the case is flagged for review.
- **Tests:** Two successful payments summing to the order total, with no split-payment evidence, produce an exception and not a match.
- **Source:** Seed §3, L60–61.
- **Open:** OQ-11.

#### D-REC-04 — Identifier-first matching with safeguards
- **Status:** APPROVED
- **Decision:**
  - Exact identifiers are the primary matching evidence. Amount and currency are safeguards.
  - A matching reference with the correct amount and currency may be auto-matched, subject to the stage rules and the absence of contradictory evidence.
  - Exact identifiers establish candidate relationships. They never override contradictory financial evidence.
- **Behaviour:** The evidence for every match and the version of the rule that produced it are persisted (D-REC-18).
- **Source:** Seed §3, L65–66 and L72; prior register Decision 2.

#### D-REC-05 — Reference with amount mismatch is a discrepancy
- **Status:** APPROVED
- **Decision:** A matching reference with an amount mismatch is a discrepancy, not an automatic match. The same applies to a currency mismatch (prior register Decision 2).
- **Tests:** Same identifier, amount different by the smallest currency unit, produces a discrepancy.
- **Source:** Seed §3, L67; prior register Decision 2.

#### D-REC-06 — Missing or ambiguous references give suggestions only
- **Status:** APPROVED
- **Decision:** Missing or ambiguous references may produce candidate suggestions for review. Amount or date similarity alone never triggers an automatic match.
- **Tests:** Records with equal amount and date but no shared identifier are never auto-matched.
- **Source:** Seed §3, L68.

#### D-REC-07 — No blanket amount tolerance
- **Status:** APPROVED
- **Decision:**
  - The MVP allows no blanket amount tolerance. Small unexplained differences are still flagged.
  - Legitimate differences are explained only by explicit rules for documented fees, taxes, refunds, rounding or other adjustments.
- **Constraints:** A rounding rule must describe a specific documented computation and record the difference as a rounding component. It must not act as a disguised tolerance (AF-31).
- **Source:** Seed §3, L69. Supersedes the prior register's references to "tolerances" and "rounding tolerance" (Decisions 2 and 3).

#### D-REC-08 — Date windows filter candidates only
- **Status:** APPROVED
- **Decision:** Configurable date windows may help find candidates. Dates alone never authorize a match and cannot override contradictory identifier, amount or currency evidence.
- **Source:** Seed §3, L70.
- **Open:** OQ-13, OQ-22.

#### D-REC-09 — Stage 1 identifier hierarchy
- **Status:** APPROVED
- **Decision:**
  - Priority goes to the merchant order ID and its gateway order reference.
  - Next come gateway transaction or payment IDs and reliable relationships linking those IDs to the order.
  - Other documented references are supporting evidence only, never substitutes for a confirmed relationship.
- **Source:** Seed §3, L76–79.

#### D-REC-10 — Stage 2 identifier hierarchy
- **Status:** APPROVED
- **Decision:**
  - Priority goes to gateway settlement or payout references linked to bank references such as UTRs, when available.
  - Relationships between the settlement report and its underlying gateway transactions are also used.
  - Amount, currency, dates, fees and adjustments validate a relationship. They do not prove a match on their own.
- **Source:** Seed §3, L81–84.
- **Open:** OQ-20.

#### D-REC-11 — Match shapes 1:1, 1:N and N:1
- **Status:** APPROVED
- **Decision:** The MVP supports one-to-one matches and grouped one-to-many or many-to-one matches. General many-to-many matching is deferred (D-DEF-05).
- **Source:** Seed §3, L88–89; prior register Decision 2.

#### D-REC-12 — Conditions for grouped matches
- **Status:** APPROVED
- **Decision:**
  - A grouped match needs a supported relationship, compatible currencies, and amounts that reconcile under explicit rules. Transactions are never grouped just because their amounts add up.
  - Gross-payment amounts must agree. For net settlements, documented fees, taxes, refunds and other adjustments may explain the difference.
  - Ambiguous groups are proposed for review, never confirmed automatically.
  - Links to every underlying transaction and the group's audit history are preserved.
- **Source:** Seed §3, L90–94.
- **Open:** OQ-12, OQ-20.

#### D-REC-13 — Evidence-based manual matching
- **Status:** APPROVED
- **Decision:**
  - Authorized users can match manually where automatic matching cannot establish a reliable relationship.
  - A manual match requires a reason and supporting evidence, and it enforces amount and currency checks.
  - Prohibited or duplicate relationships are blocked, and a full audit trail is kept.
  - Risky cases follow the risk-based approval process.
- **Tests:**
  - A manual match without a reason or evidence is rejected.
  - A record already in a confirmed match on the same link cannot be matched again.
- **Source:** Seed §3, L98–100.
- **Open:** OQ-14, OQ-17.

#### D-REC-14 — Authorized unmatching
- **Status:** APPROVED
- **Decision:**
  - Authorized users may undo an incorrect match with a required reason. The original match and its history are preserved, not erased.
  - Effects on posted accounting go through the approved correction workflow, and closed-period controls still apply.
- **Source:** Seed §3, L101–102.
- **Open:** OQ-26.

#### D-REC-15 — Structured exception management
- **Status:** APPROVED (status list is not exhaustive)
- **Decision:**
  - Exceptions use statuses including `Open`, `Investigating`, `Awaiting information` and `Resolved`.
  - Each exception records an owner, reason, comments, supporting evidence, timestamps, changes and resolution.
- **Source:** Seed §3, L106–107. Supersedes the prior register's Decision 7 example states ("new, under review, resolved, reopened").
- **Open:** OQ-15, OQ-16.

#### D-REC-16 — Risk-based approval of exceptions
- **Status:** APPROVED (policy direction); UNRESOLVED (numeric thresholds and criteria)
- **Decision:** Authorized finance users can resolve routine cases. High-risk cases, material adjustments and cases affecting posted accounting need additional approval where appropriate. Risk thresholds are not defined and must not be invented.
- **Source:** Seed §3, L108–109.
- **Open:** OQ-14.

#### D-REC-17 — No silent changes; gateway and bank disagreements
- **Status:** APPROVED
- **Decision:**
  - Financial records are never changed silently to make exceptions disappear.
  - When gateway and bank reports disagree, each original amount is preserved and the difference and its source are shown.
  - Documented adjustments are investigated. Unexplained differences stay open until resolved with evidence.
- **Source:** Seed §3, L110–111.

#### D-REC-18 — Versioned, comparable reconciliation runs
- **Status:** APPROVED
- **Decision:**
  - Every run has a unique ID and keeps references to its inputs, rule versions, results and changes since the previous run. Users can compare runs.
  - New runs never silently rewrite posted journal entries, erase manual decisions or bypass period-close controls.
  - Match evidence and the producing rule version are persisted.
- **Source:** Seed §3, L115–116; prior register Decision 2.
- **Open:** OQ-21.

#### D-REC-19 — Reconciliation kept separate from postings, with links
- **Status:** APPROVED
- **Decision:** Reconciliation outcomes are kept separate from accounting postings. Traceable links connect source evidence, reconciliation results and journals.
- **Source:** Brief §D. Consistent with Seed §3, L102, L116 and L120.

### 2.6 Financial events, fees and currency

#### D-FIN-01 — Gross and net are separate concepts
- **Status:** APPROVED
- **Decision:** Gross payments and net settlements are reconciled as separate concepts and never compared as if interchangeable.
- **Source:** Seed §4, L124; prior register Decision 2.

#### D-FIN-02 — Explicit financial components and events
- **Status:** APPROVED
- **Decision:** Gateway fees, applicable taxes, refunds, chargebacks, reversals and other adjustments are explicit financial components or events, where the source data supports them.
- **Source:** Seed §4, L125.

#### D-FIN-03 — Settlement report is the breakdown evidence
- **Status:** APPROVED
- **Decision:** The gateway settlement report is the primary evidence for the settlement breakdown. Fee rates are never assumed and explanations for differences are never invented.
- **Source:** Seed §4, L126.

#### D-FIN-04 — Separate, linked refund and chargeback events
- **Status:** APPROVED
- **Decision:**
  - The original payment and its history are preserved.
  - Each refund, chargeback, reversal or adjustment is a separate traceable event, linked to the original payment when the evidence supports the link.
  - Unlinked, unexpected or inconsistent events are flagged for review.
- **Source:** Seed §4, L127–128.

#### D-FIN-05 — Explicit currency in a multi-currency model
- **Status:** APPROVED
- **Decision:** Multi-currency support is part of the foundational model. Currency is stored explicitly on orders, payments, settlements, fees, refunds and bank transactions.
- **Source:** Seed §4, L129; checklist §3, L45.
- **Open:** OQ-19.

#### D-FIN-06 — No guessed FX; FX reconciliation deferred
- **Status:** APPROVED; DEFERRED (FX)
- **Decision:** Amounts are compared only under rules that establish compatible currencies. Conversion with guessed or hardcoded rates is never allowed. FX conversion reconciliation and realized/unrealized FX accounting are deferred (D-DEF-06).
- **Source:** Seed §4, L130–131.
- **Open:** OQ-19.

#### D-FIN-07 — Exact monetary arithmetic
- **Status:** APPROVED (engineering rule)
- **Decision:** Money uses Java `BigDecimal` and PostgreSQL `NUMERIC`, with documented precision, scale, currency and rounding. Binary floating point is never used for amounts.
- **Source:** Checklist §3, L44.

### 2.7 Accounting

#### D-ACC-01 — Double-entry accrual ledger
- **Status:** APPROVED
- **Decision:** The MVP includes a double-entry accounting ledger on an accrual basis. Cash movements and accrual recognition are distinct.
- **Scope:** Full-ledger direction with a staged initial scope (D-PRD-08). OQ-01 was resolved for product direction on 16 October 2026.
- **Source:** Seed §6, L150–151; Brief §D.
- **Open:** OQ-19, OQ-56.

#### D-ACC-02 — Journal drafts from business events
- **Status:** APPROVED (approach); UNRESOLVED (event-to-journal rules)
- **Decision:** Journal drafts are prepared from eligible business events: sales/order events, payments, settlements, fees, refunds and bank movements, as supported by evidence and configured rules.
- **Constraints:** No debits, credits or account treatments are approved yet (Seed §13, L250). They must not be invented.
- **Source:** Seed §6, L152.
- **Open:** OQ-23.

#### D-ACC-03 — Evidence-based revenue recognition
- **Status:** APPROVED (principle); EXTERNAL REVIEW REQUIRED (policy)
- **Decision:** An order alone does not prove revenue has been earned. Recognition uses configurable, evidence-based triggers aligned to the business's own policy. Missing or ambiguous evidence sends the case to review.
- **Source:** Seed §6, L153.
- **Open:** OQ-24.

#### D-ACC-04 — Draft → review → authorized posting
- **Status:** APPROVED
- **Decision:** Journal entries move from draft to review to authorized posting. Automated preparation and validation are allowed, but posting requires an authorized approver.
- **Source:** Seed §6, L154.

#### D-ACC-05 — No self-approval of journals
- **Status:** APPROVED
- **Decision:** A journal preparer cannot approve their own journal entry, even when they also hold the approver role.
- **Tests:** A user holding both Preparer and Approver roles cannot approve an entry they prepared, whether through the UI, the API or a retried request.
- **Source:** Seed §6, L155 and §8, L183, L187.
- **Open:** OQ-17, OQ-18.

#### D-ACC-06 — Posting blocks
- **Status:** APPROVED
- **Decision:** Posting is blocked when an entry:
  - is unbalanced;
  - lacks required information;
  - violates accounting rules; or
  - depends on unresolved financial evidence.

  An unexplained balancing amount is never inserted to make an entry balance.
- **Source:** Seed §6, L156.

#### D-ACC-07 — Immutable posted entries
- **Status:** APPROVED
- **Decision:** Corrections preserve history. Posted entries are corrected through auditable reversing or adjusting entries, never by silent edits or deletions.
- **Source:** Seed §6, L157; checklist §3, L54.

#### D-ACC-08 — Customizable Chart of Accounts
- **Status:** APPROVED; EXTERNAL REVIEW REQUIRED (default content)
- **Decision:** A customizable Chart of Accounts with sensible defaults. Authorized users may create, rename, organize and map accounts within safeguards. System-required accounts, and accounts referenced by posted entries, are protected as appropriate.
- **Source:** Seed §6, L158.
- **Open:** OQ-27.

#### D-ACC-09 — Customizable accounting templates
- **Status:** APPROVED; EXTERNAL REVIEW REQUIRED (default content)
- **Decision:** The business can customize accounting templates for sales, payments, gateway fees, settlements, refunds and bank movements. Templates are starting points, not a claim that every business follows the same policy.
- **Source:** Seed §6, L159.
- **Open:** OQ-23, OQ-31.

#### D-ACC-10 — Validated, versioned accounting rules
- **Status:** APPROVED
- **Decision:** Accounting rules are validated, every change is versioned, and rule history is preserved. Journal drafts must balance. Ambiguous or unsupported treatments go to review.
- **Source:** Seed §6, L160.

#### D-ACC-11 — Guided opening balances
- **Status:** APPROVED
- **Decision:**
  - Opening balances are entered through a guided form or a supported template upload.
  - Account mapping and debits = credits are validated.
  - Authorized review is required before posting a dedicated opening journal entry.
  - Missing balances are never invented.
- **Source:** Seed §6, L161.

#### D-ACC-12 — Accounting cutover date
- **Status:** APPROVED
- **Decision:**
  - Each business has an accounting cutover date, and opening balances represent the ledger position at that date.
  - Historical imports may be used for reconciliation or investigation without automatically creating duplicate accounting entries.
  - Migrating a historical ledger needs a separate authorized, audited process.
- **Source:** Seed §6, L162.
- **Open:** OQ-25.

#### D-ACC-13 — Monthly periods with controlled close and reopen
- **Status:** APPROVED
- **Decision:** Accounting periods are monthly. Closed periods block new posting by default. Reopening requires authorization, a reason and an audit event.
- **Source:** Seed §6, L163.
- **Open:** OQ-26.

#### D-ACC-14 — Period-close checklist
- **Status:** APPROVED
- **Decision:** Closing a period uses a checklist covering unposted drafts, unreconciled balances, unresolved high-risk discrepancies and other required tasks. Critical issues block closure. Permitted exceptions need authorized approval and a documented rationale.
- **Source:** Seed §6, L164.
- **Open:** OQ-17.

#### D-ACC-15 — Configurable financial year
- **Status:** APPROVED
- **Decision:** The financial year is configurable per workspace and defaults to 1 April–31 March for Indian businesses. Changes affecting periods or posted entries require safeguards and authorization.
- **Source:** Seed §6, L165.
- **Open:** OQ-29.

#### D-ACC-16 — Tax-aware data; GST compliance deferred
- **Status:** APPROVED; DEFERRED (GST compliance); EXTERNAL REVIEW REQUIRED (tax treatment)
- **Decision:** Tax amounts and fields from reliable source data are preserved, and tax-related ledger accounts are supported. Full GST calculation, return preparation, filing and tax-compliance advice are deferred (D-DEF-04).
- **Source:** Seed §6, L166–167; Brief §D.
- **Open:** OQ-33.

### 2.8 Reporting and exports

#### D-RPT-01 — Core accounting reports
- **Status:** APPROVED
- **Decision:**
  - The trial balance, profit and loss, balance sheet, general ledger and journal-entry reports are generated from posted entries.
  - Drafts are distinguished from finalized reports.
  - Reports never imply that incomplete or unreconciled information has been fully verified.
  - Under D-PRD-08, accounting reports and exports also disclose what activity they cover and what they do not. A balanced ledger is never presented as the business's whole activity.
- **Source:** Seed §6, L168; Brief §D; owner decision, 16 October 2026 (coverage disclosure, D-PRD-08).
- **Open:** OQ-32 (management or statutory), OQ-56 (supported manual-journal purposes).

#### D-RPT-02 — Operational reports and exports
- **Status:** APPROVED
- **Decision:** The MVP provides:
  - CSV and XLSX exports;
  - reconciliation summaries;
  - unmatched-transaction reports;
  - exception reports;
  - settlement-fee breakdowns;
  - journal-entry reports;
  - audit-history exports.
- **Source:** Seed §7, L173. Supersedes prior register Decision 8.

#### D-RPT-03 — One source of truth; permission-scoped reports
- **Status:** APPROVED
- **Decision:** Reports come from the same records and reconciliation results as the application, and they respect workspace permissions and filters.
- **Source:** Seed §7, L174.

#### D-RPT-04 — Exports never modify records
- **Status:** APPROVED
- **Decision:** Exporting data never modifies financial records.
- **Source:** Seed §7, L175.

### 2.9 Identity, roles, authorization and tenancy

#### D-SEC-01 — Five predefined roles
- **Status:** APPROVED
- **Decision:**
  1. **Workspace Owner/Admin:** manages the workspace, users, role assignments and administrative settings. Cannot bypass accounting safeguards.
  2. **Reconciliation Analyst:** imports and maps reports, runs reconciliation, investigates discrepancies, and performs authorized manual matching and unmatching.
  3. **Accountant/Journal Preparer:** handles permitted Chart of Accounts tasks, prepares journal drafts and opening balances, and views accounting reports. Cannot approve their own entries.
  4. **Finance Controller/Approver:** approves eligible entries prepared by others, handles high-risk approvals, and closes and reopens periods.
  5. **Auditor/Viewer:** has read-only access to permitted reports, reconciliation results, supporting evidence and audit history.
- **Source:** Seed §8, L179–185; Brief §E. Supersedes prior register Decision 5 (roles question).
- **Open:** OQ-36, OQ-37 (permission details the seed does not define).

#### D-SEC-02 — Multiple roles with separation of duties
- **Status:** APPROVED
- **Decision:** Users may hold several roles so small teams can work. Separation-of-duties controls still apply, especially no self-approval.
- **Source:** Seed §8, L187.
- **Open:** OQ-17, OQ-18.

#### D-SEC-03 — Backend authorization is mandatory
- **Status:** APPROVED
- **Decision:** Every action is authorized by the backend. Hiding a frontend button is not authorization.
- **Tests:** Every mutating API endpoint is tested with an authorized role, an unauthorized role, a non-member and a member of another workspace.
- **Source:** Seed §8, L188; checklist §7, L124.

#### D-SEC-04 — Tenant scope on every access path
- **Status:** APPROVED
- **Decision:** Tenant scope is enforced on every query, file action, background job, API endpoint, export, report and notification.
- **Source:** Seed §8, L189; Brief §E (adds reports and notifications); checklist §6, L115.

#### D-SEC-05 — Least privilege and audited role changes
- **Status:** APPROVED
- **Decision:** Least privilege applies throughout. Role and permission changes are audited. Creating a workspace never grants access to another tenant.
- **Source:** Seed §8, L190; Brief §E.

#### D-SEC-06 — Managed authentication via OIDC
- **Status:** APPROVED (approach); UNRESOLVED (provider)
- **Decision:**
  - Authentication is managed through a replaceable standard protocol such as OpenID Connect (OIDC).
  - The identity provider handles sign-in, credentials, email verification and recovery as supported.
  - The ClearSettle backend keeps responsibility for business roles, tenant authorization and financial permissions.
  - No identity provider has been selected.
- **Source:** Seed §8, L191–192. Supersedes prior register Decision 9. Triggers checklist concept #69 (OAuth).
- **Session architecture:** D-SEC-11 (OQ-35 resolved 16 October 2026).
- **Open:** OQ-34.

#### D-SEC-07 — Self-service workspace onboarding
- **Status:** APPROVED
- **Decision:** A verified user can create a business workspace and becomes its first administrator, then invites teammates. Onboarding never exposes existing tenants.
- **Workspace model:** Each workspace is one accounting entity, and users may belong to several (D-PRD-09; OQ-03 resolved 16 October 2026).
- **Source:** Seed §8, L193.
- **Open:** OQ-36.

#### D-SEC-08 — MFA for privileged users
- **Status:** APPROVED
- **Decision:**
  - MFA is required for privileged users and for anyone who can approve postings, reopen periods or change sensitive financial settings. Other users may enable it.
  - High-risk actions may require fresh authentication.
  - The identity provider's MFA capability and vendor are not selected.
- **Source:** Seed §8, L194.
- **Open:** OQ-34, OQ-38, OQ-55.

#### D-SEC-09 — Session controls
- **Status:** APPROVED; UNRESOLVED (default values)
- **Decision:**
  - Idle session timeouts are configurable, with risk-based reauthentication.
  - Users are warned before expiry where practical and can sign out of all sessions.
  - These controls are enforced on backend operations.
- **Source:** Seed §8, L195.
- **Open:** OQ-38.

#### D-SEC-10 — Layered tenant isolation in shared PostgreSQL
- **Status:** APPROVED
- **Decision:**
  - The MVP uses a shared PostgreSQL database, and every tenant-owned record is tied to its business.
  - Isolation is enforced through backend authorization, database constraints, and PostgreSQL Row-Level Security where appropriately designed.
  - Hostile cross-tenant access is tested explicitly.
- **Source:** Seed §9, L202–203. Answers checklist §13 question 3.

#### D-SEC-11 — Authentication session architecture A′
- **Status:** APPROVED (architectural choice); UNRESOLVED (the cookie `SameSite` value, OQ-57; session lifetime values and the fresh-authentication policy, OQ-38; the identity provider, OQ-34; MFA scope, OQ-55)
- **Decision:** ClearSettle's MVP authentication and session architecture is A′:
  - Spring Boot integrates with the managed OpenID Connect (OIDC) identity provider as the application's OIDC client, and owns the application authentication session.
  - Sessions are stored server-side in PostgreSQL through Spring Session (JDBC).
  - The logged-in Next.js frontend is client-rendered. A static export is preferred if it fits the application's actual requirements; the authentication spike confirms this.
  - Frontend and API are served from the same origin. A reverse proxy routes the API, OIDC login and callback, and logout paths to Spring Boot, and serves the frontend assets separately.
  - Next.js is not a second authenticated application server and holds no separate session.
  - Browser-held access and refresh tokens are not the application-session mechanism.
  - The session cookie is `HttpOnly`, `Secure`, host-only (no `Domain` attribute) and `Path=/`, and uses a `__Host-` name prefix where the deployment allows it. Its `SameSite` value is not yet decided (OQ-57).
  - Workspace-scoped API routes carry the workspace identifier in the URL, for example `/api/v1/workspaces/{workspaceId}/...`. The identifier names the target of the request; it is not proof of authorization.
  - Spring Boot authorizes every request against authoritative backend data, including current workspace membership and permissions. Client-side checks never replace server-side authorization.
  - The existing isolation decisions stay in force: row-level security, composite-key constraints and cross-tenant tests (D-SEC-03, D-SEC-04, D-SEC-10, D-PRD-09).
- **Rationale (source and analysis):**
  - The owner approved A′ on 16 October 2026, after the authentication architecture review held in the working session. That review was not independent, and no security professional has reviewed the decision.
  - Tokens stay out of the browser, and the session lives in the one backend that already enforces authorization and tenant isolation. That is the backend-for-frontend pattern, which RFC 10017 ranks most secure for browser-based applications.
  - It keeps revocation and fresh-authentication checks in the same place as authorization.
  - This choice reduces specific risks. It does not make ClearSettle secure on its own: security depends on the controls below being implemented and tested.
- **Security constraints** (mandatory, planned, not yet implemented or verified):
  - **OIDC:** Authorization Code flow with PKCE explicitly enabled in configuration and verified by test; state and nonce validated; exact redirect URIs registered; full ID-token validation; accounts keyed on issuer plus subject identifier, never on email (NFR-SEC-001).
  - **CSRF:** a complete defense for state-changing requests, combining framework CSRF tokens, a required custom header, and no state change through GET (NFR-SEC-022).
    - Same-origin deployment, `SameSite`, the `__Host-` prefix and the custom header each help, but none replaces the others.
    - CORS controls whether a script can read a response. It does not stop requests from reaching the server and is not a CSRF control.
    - No cross-origin application access unless an approved use case is documented (NFR-SEC-020).
  - **Sessions:** idle and absolute limits (values under OQ-38); session-ID rotation at authentication; local logout; sign out everywhere; invalidation after relevant membership or role changes; invalidation of restored sessions after database recovery (NFR-SEC-023, AF-118).
  - **Fresh authentication fails closed:** sensitive operations are rejected when the required evidence is missing, invalid, too old or insufficient. The re-authenticated person must be the same user. A pending financial mutation is never replayed automatically (NFR-SEC-024).
  - **Logging and audit:** no session IDs, tokens or secrets in logs; authentication events are audited (NFR-SEC-012, NFR-SEC-025).
  - **Background work:** jobs and exports keep their actor and workspace context, and permissions are re-checked when a job runs and when its output is accessed (NFR-SEC-027).
- **Depends on:** D-SEC-03, D-SEC-04, D-SEC-06, D-SEC-08, D-SEC-09, D-SEC-10, D-PRD-09, D-TEC-03, D-TEC-04.
- **Validation gate:** An authentication design spike (implementation plan M0) must produce test evidence before M1 authentication work starts. It covers:
  - login and callback under the candidate cookie policy;
  - CSRF-token issuance and validation, and custom-header enforcement;
  - rejection of forged and unauthorized cross-origin state-changing requests;
  - cookie behaviour across sign-in, logout, expiry and re-authentication;
  - the presence of PKCE;
  - fail-closed checks on authentication claims;
  - the further items listed under implementation plan M0.

  The spike itself needs the owner's authorization (D-PRC-01).
- **Tests:** AC-131, AC-132, AC-152, AC-157 to AC-168.
- **Source:** Owner approval, 16 October 2026 (authentication architecture), given in the working session; see §7. Supporting sources, verified 16 October 2026, are listed in specification §10.6.
- **Does not decide:**
  - the identity provider (OQ-34);
  - the `SameSite` value (OQ-57);
  - session lifetime values, and the fresh-authentication action list and window (OQ-38);
  - MFA for every user (OQ-55);
  - whether provider-initiated logout is required, and provider data residency and account-recovery requirements (all evaluated under OQ-34).

  It does not authorize implementation (D-PRC-01).
- **Open:** none remaining — the four sub-decisions are resolved by D-SEC-12 (OQ-34), D-SEC-13 (OQ-38), D-SEC-14 (OQ-55) and D-SEC-15 (OQ-57), approved by the owner on 16 October 2026 after the M0 authentication spike and its security follow-up.
- **M1 verification (local dev stack, 16–17 October 2026):** the proxy serves the static-export frontend and the API on one origin, and anonymous visits create no server-side session (A-01); sessions are stored in PostgreSQL through Spring Session JDBC (D-01 — an earlier build silently kept them in memory; fixed); the backend retains no access or refresh token (B-03 and a slice test — Spring's default in-memory authorized-client store had retained them; fixed, F-3). Per-requirement evidence: `clearsettle_implementation_status.md`. Not yet shown: behaviour across several backend instances; restored-session invalidation after database recovery; workspace-scoped authorization (no workspace routes exist yet).

#### D-SEC-12 — Identity provider: Keycloak
- **Status:** APPROVED (owner approval, 16 October 2026). Resolves OQ-34. See [ADR-0001](adr/0001-identity-provider-keycloak.md).
- **Decision:** Keycloak is the identity provider for the current implementation, using OIDC Authorization Code Flow with PKCE (`S256`) and a confidential client. Amazon Cognito and Auth0 remain viable alternatives, reconsidered later only with live validation.
- **Rationale:** *(source: owner approval; M0 spike)* Keycloak is the only candidate whose end-to-end behaviour was tested live in the spike; it gives full flow/claim control with no per-MAU cost or feature-plan gating.
- **Behaviour:** validate issuer, signature, audience, expiry, `nonce` and required claims via Spring Security OIDC; exact redirect-URI registration; identity keyed on `(iss, sub)`, never email alone; fail closed on any invalid token, claim, issuer, state or callback.
- **Constraints:** confidential client with PKCE forced in code (no Spring Boot property); client secret from secrets management, never logged or committed; provider-aware, fail-closed `acr`/`auth_time` checks; RP-initiated logout.
- **Depends on:** D-SEC-11, D-SEC-06.
- **Tests:** AC-157, AC-158 (PKCE, redirect-URI, token validation). Outstanding: live validation of any managed provider; backchannel logout; enrolment/recovery (D-SEC-14).
- **M1 verification (Keycloak 26.8.1, local dev stack, 16–17 October 2026):** the authorization request carries `code`, PKCE `S256`, `state`, `nonce` and the exact redirect URI (P-01); Keycloak rejects a request without `code_challenge` (P-02) and an unregistered redirect URI (P-03); a forged callback creates no session (P-04); a replayed callback is rejected (H-02); the user is keyed on the validated `(iss, sub)` (B-02); the client's PKCE, redirect-URI and ACR configuration is asserted (P-06). Not yet tested by ClearSettle: callbacks carrying ID tokens with a wrong issuer or audience, an expired `exp`, an invalid signature or a mismatched `nonce`, or a code whose PKCE verifier does not match (Spring Security validates these; a test IdP or token-tampering harness is needed to show it, AC-157).
- **Source:** Owner approval, 16 October 2026; M0 spike evidence (`scratchpad/m0-auth-spike/evidence/`, LIVE-TESTED Keycloak; Cognito/Auth0 documentation-verified, report §6).
- **Open:** live managed-provider validation remains OUTSTANDING and must not be shown as complete; no billable external tests authorized.

#### D-SEC-13 — Session policy: 15-minute idle, 8-hour absolute
- **Status:** APPROVED (owner approval, 16 October 2026). Resolves OQ-38 (lifetime values). See [ADR-0002](adr/0002-session-expiration-policy.md).
- **Decision:** idle timeout 15 minutes; absolute session lifetime 8 hours, anchored to the authentication time and never extended by activity, renewal or refresh; sensitive actions require fresh authentication (and step-up where applicable, D-SEC-14).
- **Rationale:** *(source: owner approval)* balances security and a typical workday; a hard absolute cap guarantees periodic full re-authentication. The spike's 90 s/240 s were test values, never policy.
- **Behaviour:** idle enforced by Spring Session; absolute lifetime enforced by a custom filter anchored to the authentication timestamp; session-ID rotation at the authentication boundary; invalidation on logout, sign-out-everywhere, disable and authorization change, enforced on the next request on any instance.
- **Constraints:** absolute lifetime must not be resettable by activity; all windows in configuration; local/dev config must not weaken production defaults.
- **Depends on:** D-SEC-11, D-SEC-09.
- **Tests:** idle expiry at 15 min; absolute expiry at 8 h despite activity (mechanisms proven in the spike at test values — T-01, T-02); invalidation paths (L-02, L-03, L-05, L-06).
- **Source:** Owner approval, 16 October 2026; M0 spike (T-01/T-02, LIVE-TESTED at test values).
- **Open:** none — the freshness window (5 minutes) and the sensitive-operation policy were approved on 17 October 2026 (D-SEC-17).
- **M1 verification (local dev stack, 16–17 October 2026):** idle expiry at the production 15 minutes on the wall clock, with an active session kept (LR-01); absolute expiry at 8 hours despite activity, at controlled time (D-04: refused at 8 h, allowed at 8 h − 2 min); the 5-minute freshness default on the wall clock (LR-02); session-ID rotation and fixation resistance (D-02); logout (D-05); sign-out-everywhere across two browsers (D-06); disabling the user enforced on the next request (D-07). One backend instance only: the cross-instance effect (AC-163) is not yet shown. The pre-expiry warning (AC-162, "where practical") is not built.
- **Update (20 October 2026):** the pre-expiry warning is built in the application shell: two minutes before the idle limit, and ten minutes before the 8-hour limit, which cannot be extended. The browser counts idle time from the last request the server answered, so no new endpoint was needed. Evidence: `sessionClock.test.mjs` and U-04 (the idle warning on an advanced browser clock); the 8-hour notice is unit-tested only. The cross-instance effect was shown on 17 October (M-01…M-06).
- **Update (20 October 2026), revocation:** OIDC back-channel logout. When a Keycloak session ends, Keycloak's signed logout token ends that session's ClearSettle sessions in the shared store, so every instance refuses them on the next request. Tokens are accepted once and for 2 minutes. Sign out everywhere uses the same revocation service. Evidence: `BackChannelLogoutPostgresTest` (two instances on PostgreSQL), live P-09, R-02, M-07, M-08. Limit: a ClearSettle session that outlives its Keycloak session is not reached (LR-05); see D-SEC-18.

#### D-SEC-14 — MFA: universal at login plus step-up
- **Status:** APPROVED (owner approval, 16 October 2026). Resolves OQ-55. See [ADR-0003](adr/0003-mfa-universal-plus-step-up.md).
- **Decision:** every user must satisfy the configured MFA requirement at initial authentication; sensitive actions additionally require step-up (fresh, strong, same-user, single-use). Step-up is not a substitute for the universal baseline.
- **Rationale:** *(source: owner approval)* a fintech product needs a high authentication floor plus fresh proof at the moment of a sensitive action.
- **Behaviour:** establish a session only after MFA assurance is confirmed from the provider's authentication evidence (provider-appropriate — `acr` level for Keycloak, not a fixed claim); step-up issues `step_up_required`, re-authenticates with `prompt=login`/`acr_values`/`max_age`, binds to the same `(iss, sub)`, executes only on explicit single-use confirmation; cancellation, expiry, failed or unavailable MFA must not authorize.
- **Constraints:** treat missing, invalid, insufficient, contradictory or untrusted evidence as a failed authentication requirement (fail closed); provide MFA enrolment and an identity-proofed, audited reset/recovery.
- **Depends on:** D-SEC-11, D-SEC-08, D-SEC-12.
- **Tests:** step-up required/success, same-user binding, freshness, single-use (spike U-01…U-04, LIVE-TESTED). M1 (local dev stack, 16–17 October 2026): **a login without satisfied MFA is blocked** — mandatory TOTP enrolment, and the enrolment login itself gets no session (B-01); password and OTP on every login (B-04); a wrong OTP gives no session (B-05); a password-only token from a misconfigured IdP is refused (B-06); unit tests `LoginSuccessMfaGateTest`, `FreshAuthEvaluatorTest`. Step-up in the product: `prompt=login`, `max_age=0`, `acr_values=mfa`, landing on the review page with nothing executed (H-01); replay rejected (H-02); another user's pending action not honoured (H-03); a different person rejected, the originating session ended (H-04); a refused step-up ends the originating session (H-05). **OUTSTANDING:** recovery; the `step_up_required` response and single-use confirmation of a real sensitive action (no sensitive action exists yet — it depends on the sensitive-action set).
- **Source:** Owner approval, 16 October 2026; M0 spike (U-01…U-04).
- **Open:** none — resolved on 17 October 2026 by D-SEC-16 (the enrolment sign-in creates no session), D-SEC-18 (recovery) and D-SEC-19 (TOTP). The obligations those entries leave open (recovery procedure and tooling, external review) are recorded there.
- **M1 implementation notes (16–17 October 2026)** (the decision text above is unchanged):
  - **MFA evidence with Keycloak is `acr=mfa` and `amr` containing `otp`.** Live inspection showed Keycloak reports `acr=mfa` with an empty `amr` on the enrolment login (no previously enrolled factor verified). Requiring a second-factor `amr` value is the fail-closed reading of "insufficient or contradictory evidence" (Constraints); missing, empty or malformed `amr` fails. It applies to the login gate and to step-up.
  - **FLAG (owner review): the enrolment login creates no application session.** The user signs in once more with the enrolled code (Keycloak SSO covers the password). This is the strict reading; it can be revisited if first-login experience matters more. **Approved 17 October 2026 (D-SEC-16).**
  - **A refused step-up ends the originating session** (different person, insufficient MFA evidence, or account disabled meanwhile), as well as the callback session; the user signs in again. ADR-0003 and ADR-0004 record the details.
  - **`amr` timing, 20 October 2026.** Keycloak listed `otp` in `amr` only if the code was exchanged within the same second as the OTP step: the realm's authentication references had no max age, and Keycloak's default is 0. Some correct sign-ins and step-ups were therefore refused. This failed closed and was found by the WebKit regression run (B-04). The references are now valid for the 60-second authorization-code lifetime. Fresh MFA is unchanged: level 2 has max age 0 and the minimum ACR is `mfa`, so a code is asked for on every sign-in and step-up; ClearSettle's `acr` and `amr` checks are unchanged. Evidence: B-09 to B-12, H-09, H-10, P-10. Details in ADR-0003.

#### D-SEC-15 — SameSite cookie strategy V3
- **Status:** APPROVED (owner approval, 16 October 2026). Resolves OQ-57. See [ADR-0004](adr/0004-samesite-cookie-strategy-v3.md).
- **Decision:** main session cookie `SameSite=Strict`, `__Host-` prefixed, `Secure`, `HttpOnly`, host-only, `Path=/`; a separate `__Host-CSLOGIN` login-state cookie `SameSite=Lax`, `Secure`, `HttpOnly`, host-only, short-lived, encrypted, holding only the in-progress authorization request. The full CSRF defense is retained and is independent of SameSite.
- **Rationale:** *(source: owner approval; M0 spike)* a Strict session cookie is withheld on the cross-site OIDC callback; the Lax login-state cookie carries login state across the callback so the session cookie can stay Strict (spike V3). SameSite is defense-in-depth, not the CSRF control.
- **Behaviour:** login completes under Strict via the Lax `__Host-CSLOGIN` cookie; CSRF enforced by a `__Host-` double-submit cookie plus a required custom header (`X-CS-Request`) plus the token; unsafe requests missing any mandatory control are rejected, including same-site cookie-tossing on JSON and no-body endpoints.
- **Constraints:** `__Host-` requires HTTPS + host-only + `Path=/`; local/dev config must not weaken these in production; SameSite alone is never sufficient CSRF protection (NFR-SEC-022).
- **Depends on:** D-SEC-11, NFR-SEC-022.
- **Tests:** V3 attributes and callback completion, CSRF incl. cookie-tossing (spike S-01, V-LOGIN, X-01…X-09, F-4, Firefox+Chromium). M1 (local dev stack, 16–17 October 2026): server `Set-Cookie` attributes (C-05) and browser-stored attributes (C-01, C-02) in Chromium and Firefox; login completes under Strict through `__Host-CSLOGIN` in every engine tested; CSRF — missing, forged and cross-session tokens, missing header, cross-site form POST and fetch, cookie tossing on a no-body endpoint (E-01…E-10) — in Chromium, Firefox and Playwright WebKit; `__Host-` rules (C-04) and sibling-subdomain tossing (K-01). **OUTSTANDING:** real Safari (macOS) and iOS/Android browsers — Playwright WebKit is an engine proxy, and device emulation changes only viewport, user agent and touch; external-deep-link UX under Strict (not built).
- **Source:** Owner approval, 16 October 2026; M0 spike (V2 negative control, V3, F-4).
- **Open:** Safari/WebKit + mobile compatibility (real browsers unverified until tested).
- **M1 implementation notes (16–17 October 2026)** (the decision text above is unchanged): the step-up callback is also cross-site, so under Strict it runs in a new session; a nonce in the originating session and in `__Host-CSLOGIN` lets the callback find, carry over and retire the originating session (absolute anchor kept). Playwright's WebKit build on Windows implements no SameSite (stores `Strict` as `None` and sends it cross-site; reproducible with `e2e/engine-samesite-probe.mjs`): the browser-jar SameSite assertions there are an engine limitation, and CSRF still held in that engine with the victim's cookies attached — live evidence that SameSite is defense-in-depth here, not the CSRF control. Two step-up defects that only appear when the session cookie *is* sent cross-site were found there and fixed (ADR-0004).

#### D-SEC-16 — The sign-in that enrols TOTP creates no session
- **Status:** APPROVED (owner approval, 17 October 2026). Resolves the D-SEC-14 enrolment-login FLAG. See [ADR-0003](adr/0003-mfa-universal-plus-step-up.md), decision 1.
- **Decision:** a user receives an application session only from an authentication that actually verified the required second factor. Keycloak reports `acr=mfa` for the sign-in that enrols TOTP while its `amr` shows no verified enrolled factor, so that sign-in is refused; the user signs in once more with a code from the new authenticator and then receives the session. There is no first-login exception.
- **Rationale:** *(source: owner approval)* fail closed on insufficient or contradictory evidence (D-SEC-14 constraints); the cost is one extra sign-in.
- **Behaviour:** the refusal uses its own code, `auth_error=mfa_not_verified` (distinct from `mfa_required`, which means the provider performed no MFA), and is recorded as `login_refused_mfa_required` with reason `amr_insufficient`; the application tells the user to sign in once more with a code from the authenticator app, so the step is not mistaken for a fault. The same applies to re-enrolment after an MFA reset (D-SEC-18).
- **Constraints:** no session, no provisioning side effect beyond the identity record, from an authentication without verified second-factor evidence.
- **Depends on:** D-SEC-14, D-SEC-12.
- **Tests:** live B-01, B-07, R-02; `LoginSuccessMfaGateTest`; `OidcCallbackValidationTest` (a valid token without a verified factor gets no session).
- **Source:** Owner approval, 17 October 2026 (security policy).
- **Open:** the designed screen and its wording belong to the frontend milestone (the current page is a scaffold).

#### D-SEC-17 — Sensitive operations: 5-minute freshness, step-up, single-use confirmation
- **Status:** APPROVED (owner approval, 17 October 2026). Completes OQ-38 (the freshness window and the sensitive-action policy). See [ADR-0002](adr/0002-session-expiration-policy.md) and [ADR-0003](adr/0003-mfa-universal-plus-step-up.md), decision 2.
- **Decision:**
  - The freshness window is **5 minutes**, configurable (`clearsettle.auth.step-up-freshness-seconds`, default 300); production configuration must not weaken it.
  - An operation classified as sensitive runs only when the current authentication is at most 5 minutes old and carries the configured `acr` and `amr` evidence (Keycloak: `acr=mfa`, `amr` contains `otp`) — otherwise after a step-up re-authentication bound to the same `(iss, sub)` — **and** the same user explicitly confirms the stored action, once.
  - Completing a step-up never executes anything. Missing, weak, stale, future-dated or contradictory evidence fails closed. A step-up does not extend the 8-hour absolute session lifetime.
  - **Categories** (NFR-SEC-004), wired as their features are built, each feature recording the classification of its operations when it is designed: posting approval; period reopening; role and permission changes; offboarding steps a person starts; activation of templates and other changes to sensitive financial settings; original-file download. RECOMMENDATION: also an administrator's MFA reset of another user (D-SEC-18). Logout and sign out everywhere are never sensitive.
- **Rationale:** *(source: owner approval)* fresh proof at the moment of a sensitive action, without replaying a financial mutation automatically (NFR-SEC-024).
- **Behaviour:** a feature implements `SensitiveOperation` and starts it with `SensitiveActions.request`, which stores a pending action (user, type, parameters) and answers `202 confirmation_required` or `401 step_up_required` with the step-up URL; the operation runs only from `POST /api/sensitive-actions/{id}/confirm` (CSRF token and custom header required), which re-checks the evidence and claims the action exactly once in the same transaction as the operation (a failed operation rolls the claim back). Refusals: another user's or an unknown action `404`, executed or cancelled `409`, expired `410`, unregistered type `422`, stale or weak evidence `401 step_up_required`. Engineering default (not owner-set): an action must be confirmed within 5 minutes of the request (`clearsettle.auth.pending-action-ttl-seconds`). Every step is a security event.
- **Constraints:** a pending action records who asked and what was asked; it is not a grant of authority — the operation re-checks the user's current authorization when it executes. What executes is what was reviewed: every operation declares the version of what the user reviews, captured at the request; a confirmation is refused (`409 action_changed`) and the action withdrawn if it has changed, and the operation checks it again under lock (engineering default, 19 October 2026).
- **Depends on:** D-SEC-13, D-SEC-14, NFR-SEC-022.
- **Tests:** `SensitiveActionFlowTest` (18, H2), `PendingActionPostgresTest` (4, PostgreSQL 17.11, concurrent confirmations), `FreshAuthEvaluatorTest`; live H-01, H-06, H-07, H-08, M-02, LR-02, LR-03, LR-04.
- **Source:** Owner approval, 17 October 2026 (security policy).
- **Open:** no sensitive business operation exists yet; the mechanism is verified with a test fixture and a no-op operation registered only in the local dev stack. Integration with each real operation is outstanding and is part of that feature's acceptance.

#### D-SEC-18 — MFA recovery: administrator-assisted, identity-verified, audited
- **Status:** APPROVED (policy; owner approval, 17 October 2026); EXTERNAL REVIEW REQUIRED (NFR-SEC-026). The procedure and the ClearSettle-side controls are NOT BUILT. Resolves the D-SEC-14 recovery FLAG. See [ADR-0003](adr/0003-mfa-universal-plus-step-up.md), decision 3.
- **Decision:** no self-service MFA reset in the initial implementation. An administrator performs recovery after an identity-verification procedure; every recovery and factor reset is audited; controlling an email address is never enough to bypass MFA; the user's existing sessions and authentication state are ended; normal access returns only after a fresh enrolment and a new sign-in with the new factor (D-SEC-16).
- **Rationale:** *(source: owner approval)* a weak recovery path bypasses MFA entirely (NFR-SEC-026).
- **Behaviour (implemented in the Keycloak realm, the reference configuration):** password reset off and a reset flow without *Reset OTP*; the `delete_credential` required action disabled (no self-service factor removal; the account console offers none and its API refuses it); administrator factor removal recorded as a Keycloak admin event naming the administrator (admin events on without representation bodies; user events on); brute-force detection on (temporary lockout, Keycloak default thresholds — values for the security review); after a reset the user must re-enrol and the old code is refused.
- **Constraints:** recovery must not be presented as production-ready on the strength of this policy.
- **Depends on:** D-SEC-14, D-SEC-16, D-SEC-05 (audited privileged actions), D-DAT-01.
- **Tests:** live P-08, R-01, R-02, B-08.
- **Source:** Owner approval, 17 October 2026 (security policy).
- **Update (20 October 2026):** OIDC back-channel logout is built. Removing the factor notifies nothing, but the administrator's sign-out of the user at Keycloak then ends the user's ClearSettle sessions, with no operator step (R-02). It does not reach a ClearSettle session whose Keycloak session has already expired (kept active past Keycloak's SSO idle timeout, LR-05); for those, the interim operator step remains until an audited administrative revocation exists.
- **Open (to be built):** the identity-verification procedure and runbook (RECOMMENDATION: a second person approves); ending the sessions back-channel logout cannot reach — an audited administrative revocation in ClearSettle (the revocation service exists; it needs the administrator role, step-up and audit), or a Keycloak event listener that reports factor removals; carrying Keycloak admin and user events into ClearSettle's audit trail and retention (the stored user events contain Keycloak session identifiers, usernames and IP addresses; no retention period is set yet); step-up for the administrator performing a reset (D-SEC-17); notifying the user; break-glass recovery for administrators; the external security review.

#### D-SEC-19 — Initial second factor: TOTP for every user
- **Status:** APPROVED (owner approval, 17 October 2026). Resolves the D-SEC-14 second-factor FLAG. See [ADR-0003](adr/0003-mfa-universal-plus-step-up.md), decision 4.
- **Decision:** TOTP is the initial and only second factor and is mandatory for every user, using the existing Keycloak configuration (RFC 6238; TOTP, HmacSHA1, 6 digits, 30 seconds, codes not reusable). SMS is not used. WebAuthn/passkeys are a possible future enhancement that needs its own decision (enrolment, recovery, the `amr` values that count, step-up evidence).
- **Rationale:** *(source: owner approval)* already configured and verified end to end; no SMS weaknesses; passkeys deferred.
- **Behaviour:** TOTP enrolment is a default required action and the level-2 flow requires the OTP form, so even a user without the required action enrols before getting a session; the application requires `amr` to contain `otp`; WebAuthn and recovery codes are not registered.
- **Constraints:** step-up and sensitive-action confirmation use the same `acr` + `amr` evidence; a weaker factor must never satisfy them.
- **Depends on:** D-SEC-14, D-SEC-12.
- **Tests:** live P-07, P-08, B-01, B-04, B-07, B-08.
- **Source:** Owner approval, 17 October 2026 (security policy).
- **Open:** none for this milestone.

### 2.10 Audit, privacy, storage, retention and offboarding

#### D-DAT-01 — Append-only application audit trail
- **Status:** APPROVED
- **Decision:**
  - A protected, append-only audit trail records important financial and administrative events, with actor, timestamp, affected records, action and the required reason.
  - Corrections create new events.
  - Ordinary application roles cannot edit or delete audit entries.
  - Audit access is restricted and audit records are backed up.
- **Source:** Seed §9, L199–200; Brief §E.
- **Open:** OQ-37.

#### D-DAT-02 — Tamper evidence evaluated later; no unproven claims
- **Status:** APPROVED
- **Decision:** Stronger tamper evidence, integrity verification and protected external log storage are evaluated during production hardening. No "immutable" or "tamper-proof" claim is made without an implementation that proves it.
- **Source:** Seed §9, L201.

#### D-DAT-03 — Private encrypted object storage
- **Status:** APPROVED
- **Decision:** Uploaded source reports are stored in private, encrypted object storage. PostgreSQL stores metadata, tenant ownership, fingerprints, import status and references.
- **Source:** Seed §9, L204.
- **Open:** OQ-40, OQ-43.

#### D-DAT-04 — Safe file access and validation
- **Status:** APPROVED
- **Decision:** Files are accessed through short-lived links with access restrictions. Files are validated, and scanned for malware where supported.
- **Source:** Seed §9, L205.
- **Open:** OQ-40.

#### D-DAT-05 — Data minimization and masking
- **Status:** APPROVED
- **Decision:** Only what reconciliation and accounting need is collected and stored. Sensitive account and card identifiers are masked where appropriate. Access to original reports is restricted.
- **Source:** Seed §9, L206.
- **Open:** OQ-37, OQ-39.

#### D-DAT-06 — Controlled workspace offboarding
- **Status:** APPROVED
- **Decision:**
  - Offboarding is a controlled process, never an immediate destructive deletion.
  - Access is disabled and authorized export of eligible data is allowed.
  - Records required under applicable policy or law are retained, and eligible data is securely deleted when allowed.
  - The process accounts for running jobs, files, backups, dependencies and audit history.
- **Source:** Seed §9, L207.
- **Open:** OQ-42.

#### D-DAT-07 — Category retention policies and legal holds
- **Status:** APPROVED
- **Decision:**
  - Each data category has its own retention policy: original uploads, temporary processing artifacts, imported financial records, posted journals, reconciliation history and audit logs.
  - Legal holds suspend deletion where required.
  - Workspace admins cannot bypass mandatory retention.
- **Source:** Seed §9, L208.

#### D-DAT-08 — Numeric retention periods
- **Status:** UNRESOLVED; EXTERNAL REVIEW REQUIRED
- **Decision:** Numeric retention periods and jurisdiction-specific defaults are not decided. They must be validated with qualified Indian legal and accounting advice before production. No statutory period may be invented, and no compliance claim may be made merely because a policy exists.
- **Source:** Seed §9, L209.
- **Open:** OQ-41.

### 2.11 Jobs, notifications, reliability and operations

#### D-OPS-01 — Background jobs with tracked status
- **Status:** APPROVED
- **Decision:**
  - Background processing with job tracking covers substantial imports, validation, duplicate detection, reconciliation runs and report generation.
  - Job statuses include `Queued`, `Processing`, `Partially completed`, `Completed` and `Failed`, with actionable failure details and safe retries.
- **Source:** Seed §10, L213–214.
- **Open:** OQ-49.

#### D-OPS-02 — In-app and email notifications
- **Status:** APPROVED
- **Decision:**
  - In-app and email notifications cover useful events such as completed or partial imports, failed reconciliation runs and completed exports.
  - Notifications are user-configurable where appropriate.
  - Emails never contain sensitive financial details and direct users to sign in.
- **Source:** Seed §10, L215; Brief §F.
- **Open:** OQ-43 (email provider).

#### D-OPS-03 — Environments and delivery pipeline
- **Status:** APPROVED
- **Decision:** The delivery setup includes:
  - separate development, staging and production environments;
  - automated CI checks;
  - controlled database migrations;
  - managed secrets;
  - health checks;
  - centralized error logging;
  - monitoring and alerts;
  - documented rollback and incident-response procedures.
- **Source:** Seed §10, L216; Brief §F.
- **Open:** OQ-43, OQ-45.

#### D-OPS-04 — No secrets in the repository
- **Status:** APPROVED
- **Decision:** Secrets are never committed to the repository.
- **Source:** Seed §10, L217; checklist #67; Git instruction.

#### D-OPS-05 — Backup and tested recovery
- **Status:** APPROVED
- **Decision:**
  - Database backups are automated, with point-in-time recovery where supported.
  - Backup access is protected and restoration procedures are documented.
  - Restores are tested regularly.
  - Uploaded reports and required evidence are covered too.
- **Source:** Seed §10, L218.

#### D-OPS-06 — Recovery targets: RPO ≤ 1 hour, RTO ≤ 4 hours
- **Status:** APPROVED as engineering targets; not customer guarantees; unverified
- **Decision:** At most one hour of data loss (RPO) and recovery within four hours (RTO). The selected services and restore drills must be shown to meet these targets.
- **Source:** Seed §10, L219; Brief §F.
- **Open:** OQ-43.

#### D-OPS-07 — Consistent recovery without duplicate effects
- **Status:** APPROVED
- **Decision:** Recovery restores consistent financial data and causes no duplicate effects from retried jobs.
- **Source:** Seed §10, L220.

### 2.12 Release gate and process

#### D-REL-01 — MVP release gate
- **Status:** APPROVED
- **Decision:** The MVP is not complete because it compiles, starts or looks polished. Release requires demonstrated evidence of:
  1. **The end-to-end workflow:** import → validate → payment-to-settlement reconciliation → settlement-to-bank verification → exception resolution → journal preparation → independent approval and posting → ledger and report verification.
  2. **Financial correctness:** no silent unexplained differences; balanced postings; no duplicate records or postings from repeated uploads or retries; preserved history.
  3. **Tested security controls:** tenant isolation, backend authorization, the MFA policy for privileged users, no self-approval and protected audit behaviour.
  4. **Automated tests** (unit, integration, API, reconciliation, accounting and end-to-end) covering normal paths, edge cases, failures and recovery, with critical security and financial-integrity tests passing.
  5. **Verified operations:** deployment, migrations, backup restoration, monitoring, error reporting, rollback and recovery targets.
  6. **No known critical defects** in security or financial integrity, no fake implementations presented as complete, no unverified claims, and documented known limitations.
  7. **External verification** for any legal or compliance claim and for production suitability.
- **Source:** Seed §11, L225–233; Brief §F.

#### D-PRC-01 — No implementation until explicitly authorized
- **Status:** APPROVED
- **Decision:** This phase is documentation, requirements, architecture planning and gap analysis only. Application development starts only after the owner's explicit authorization.
- **Source:** `docs/README.md` L5; Seed L271; Brief.

#### D-PRC-02 — Engineering standards apply
- **Status:** APPROVED
- **Decision:**
  - Evaluate the relevant checklist items before implementing.
  - Justify every conditional or deferred item.
  - Write meaningful tests, including negative, failure, authorization and concurrency cases.
  - Fix root causes.
  - Verify work before calling it complete.
- **Source:** `CLAUDE.md` L1–20; checklist §2 and §12.

#### D-PRC-03 — No silent changes to decisions; no invented facts
- **Status:** APPROVED
- **Decision:**
  - Approved decisions are never changed or weakened silently. Conflicts are reported with a recommended resolution.
  - Unknowns stay unresolved.
  - Accounting policies, statutory periods, thresholds, vendors and guarantees are never invented.
- **Source:** Seed L9–14; Brief (accuracy rules).

#### D-PRC-04 — Git and GitHub workflow and attribution
- **Status:** APPROVED
- **Decision:**
  - Work happens in small, verified, focused commits that are pushed regularly to `https://github.com/swastikongithub/ClearSettle`.
  - No force-push and no history rewrites.
  - Only documentation is committed during this phase.
  - Commits use the owner's existing Git identity. No AI-tool co-author trailers or authorship credits appear in commits or repository content.
- **Existing fact:** On 15 October 2026 the remote's `main` branch had one commit ("Initial commit", containing a root `README.md`), and the local project folder was not yet a Git repository.
- **Source:** Git instruction (15 October 2026).

### 2.13 Deferred scope

| ID | Deferred item | Re-entry condition | Source |
|---|---|---|---|
| D-DEF-01 | Marketing landing page | The core application works end-to-end; owner authorizes. Visual references (D-UI-04) may be documented now. | Seed §1, L26, §12, L237; `CLAUDE.md` L46–47; Brief §G |
| D-DEF-02 | Direct payment-gateway integrations | Owner approval; webhook requirements in checklist #100 then apply. | Seed §1, L27, §12, L238 |
| D-DEF-03 | Public customer-facing API | Owner approval; internal REST APIs remain in scope. | Seed §2, L36, §12, L239 |
| D-DEF-04 | Full GST calculation, returns, filing and tax-compliance advice | Owner approval and specialist tax review. | Seed §6, L167, §12, L240 |
| D-DEF-05 | General many-to-many matching | A concrete, validated requirement and supporting source formats. | Seed §3, L89, §12, L241 |
| D-DEF-06 | FX conversion reconciliation; realized/unrealized FX accounting | Owner approval and accounting policy. | Seed §4, L131, §12, L242 |
| D-DEF-07 | Cash-flow statements, budgeting, forecasting, advanced analytics | Owner approval. | Seed §6, L169, §12, L243 |

---

## 3. Open decisions

**Type** follows Seed §13 (L259):
- (a) product-owner decision;
- (b) technical design recommendation;
- (c) implementation or testing task;
- (d) qualified legal or accounting review.

**Approval** names who must agree before the blocked work starts.

**Blocks** names the earliest implementation-plan milestone that cannot finish without an answer.

Every "Recommended default" is a RECOMMENDATION, not a decision.

### 3.1 Product scope

| ID | Question | Why it matters | Recommended default | Type | Approval | Blocks |
|---|---|---|---|---|---|---|
| OQ-02 | How are records outside gateway flows handled: orders paid by cash on delivery or direct bank transfer, and bank transactions unrelated to gateway payouts? D-PRD-08 does not settle this. | Without a rule they either flood the exception queue or vanish unexplained (AF-25). | Mark them "Outside gateway reconciliation" through a template rule or a user classification with a reason. They are not exceptions and not "reconciled". Bank movements become journal drafts only through approved templates, or through manual drafts for a supported purpose (OQ-56). Reports list them as not covered until they are recorded (FR-RPT-015). | (a) | Owner | M4 |
| OQ-04 | Are billing and subscriptions, terms of service, privacy policy and data-processing terms in scope before onboarding real customers? | A production SaaS needs them, but none is mentioned in the approved decisions (AF-70). | Keep billing out of the MVP build. Treat legal terms as a release prerequisite prepared by qualified counsel. | (a)(d) | Owner; legal | M10 |
| OQ-05 | How may ClearSettle staff (platform operators) access tenant data for support or incidents? | Uncontrolled operator access defeats tenant isolation (AF-60). | No standing access. A time-bound break-glass procedure requiring customer consent (except in a documented emergency), MFA, reason capture and audit events visible to the workspace. | (a)(d) | Owner; security | M1 (design), M10 |

OQ-01 (ledger completeness) was resolved for product direction on 16 October 2026 by D-PRD-08. It is kept in §3.5 for traceability and is no longer counted as open.

OQ-03 (workspace and accounting entity) was resolved on 16 October 2026 by D-PRD-09. It is kept in §3.5 for traceability and is no longer counted as open or listed as a blocker.

### 3.2 Imports and reconciliation

| ID | Question | Why it matters | Recommended default | Type | Approval | Blocks |
|---|---|---|---|---|---|---|
| OQ-06 | Confirm the three links and their grouping into two stages: L1 order ↔ payment attempt and L2 payment ↔ settlement line form Stage 1; L3 settlement payout ↔ bank transaction forms Stage 2. | The seed's stage names and identifier hierarchy are labelled inconsistently (AF-06). | Adopt the three-link model as written in the specification. | (a) | Owner | M3 |
| OQ-07 | Which gateways and banks are supported first? Can anonymized sample reports be provided? | Field schemas, identifiers and test data cannot be validated against invented formats (AF-90). | Owner names one or two gateways and one or two banks and supplies anonymized samples. Templates and test fixtures are built from those samples. | (a) | Owner | M2 |
| OQ-08 | What are the exact field schemas, identity keys and provider status meanings for each source? | Needed for mapping, deduplication and the definition of "successful" (Seed §13, L249). | Derive them from the OQ-07 samples. The specification lists the minimum fields (§4.3). | (a)(b) | Owner | M2 |
| OQ-09 | The same source identifier can arrive later with different values, such as a status change, a correction without a declared revision, or overlapping exports. What happens? | Risks silent overwrites or duplicate records (AF-21). | Keep every observation. Accept a status change only if it follows a provider status order defined in the template. Any other difference raises a "Conflicting source data" exception. Never overwrite. | (a) | Owner | M2 |
| OQ-10 | What happens when a byte-identical file is uploaded again? | Repeated uploads must not duplicate records. | Block the upload and link to the earlier import. Create no records. No override in the MVP. | (a) | Owner | M2 |
| OQ-11 | What counts as explicit evidence that split payments are valid for an order? | Without a definition, D-REC-03 can never auto-aggregate, or might do so wrongly. | Only an explicit split-payment indicator mapped from the order data, or a manual confirmation with high-risk approval. | (a) | Owner | M4 |
| OQ-12 | How are partial settlements and payout batching handled? | Listed as unresolved in Seed §13, L249. | Support settlement lines → payout through the payout reference. One payment settled across several payouts raises an exception and needs manual handling. | (a)(b) | Owner | M3 |
| OQ-13 | When does an unsettled successful payment become an exception? What are the default candidate date windows? | Timing differences are normal. Without an expected settlement period every pending item looks missing, or nothing does (AF-24). | An expected settlement period per gateway template, with values from the owner's gateway agreements. Until it is set, unsettled payments appear as open "Awaiting settlement" items with their age and never as resolved. | (a) | Owner | M3 |
| OQ-14 | What numeric thresholds and criteria make a case high-risk, and what is the approval policy? | Seed L109 forbids inventing thresholds. | Until thresholds are approved, treat all of the following as high-risk: manual matches with a non-zero difference or without identifier evidence; accepted differences; resolutions affecting posted accounting; grouped manual matches; cross-currency handling; "Duplicate confirmed" and "Outside reconciliation scope" resolutions; any resolution of an exception with a non-zero difference; report revisions that withdraw records or change financial values (AF-101, AF-123). | (a)(d) | Owner; accountant | M5 |
| OQ-15 | How is a difference resolved when it genuinely cannot be explained (write-off or accepted difference)? | Without a path, exceptions stay open forever or receive invented explanations (AF-29). | Allow "Resolved – accepted difference" only through high-risk approval by a different user, with investigation evidence and an approved adjusting journal to a designated account. Never label it "explained". | (a)(d) | Owner; accountant | M5 |
| OQ-16 | Should exceptions also have `Pending approval` and a reopen transition? | High-risk approvals and unmatching need states (AF-29). | Add `Pending approval`. Allow `Resolved` → `Open` with a reason and an audit event. | (a) | Owner | M5 |
| OQ-17 | How far does separation of duties reach? | Self-approval could otherwise be bypassed (AF-44). | No user may approve an item they created, submitted or edited. This covers journals, high-risk exception resolutions, opening balances, template activation and period-close exceptions. The person who submits a system-generated draft becomes its preparer. | (a) | Owner | M5, M6 |
| OQ-18 | No self-approval means a single-user workspace can never post a journal or approve a high-risk item. Is that accepted? | It is a direct consequence of D-ACC-05 for very small businesses (AF-44). | Accept it as a documented product constraint and explain it during onboarding. Any relaxation needs explicit owner approval. | (a) | Owner | M6 |
| OQ-19 | How are cross-currency items handled (for example a USD payment settled in INR), and what is each workspace's functional currency? | FX is deferred and manual matches enforce currency checks, so these items can never reconcile (AF-23). | One functional currency per workspace; INR is the proposed default for India, pending owner confirmation. MVP journals use only the functional currency. Cross-currency links are never auto-matched, and by default cannot be linked manually either: they stay open as "Cross-currency – unsupported". Linking them using a conversion reported by the source would be FX conversion reconciliation (deferred, D-DEF-06), so it needs explicit approval as a scope addition (D-PRD-06). No journal drafts for such items until FX accounting is approved. Whether journal lines may use other currencies (for example foreign-currency bank accounts) is part of this question (AF-141). | (a)(d) | Owner; accountant | M3, M7 |
| OQ-20 | Can a UTR or reference extracted from a bank narration count as exact-identifier evidence? | Bank references often exist only in free-text narration (AF-27). | Yes, but only when a template-defined pattern extracts exactly one reference. The extracted reference is stored separately from the raw narration. Otherwise the record is a candidate only. | (a)(b) | Owner | M4 |
| OQ-21 | What is a run's scope and trigger, and what happens to manual decisions when the evidence behind them changes? | Needed for reproducibility and comparison (D-REC-18). | Users trigger runs per stage over a selected period. Confirmed matches are persistent relationships with run or user provenance, and each run snapshots its results for comparison (FR-REC-069, AF-106). Candidate search may extend beyond the period by the configured window. Manual decisions carry forward unless an underlying record version changed, in which case they are flagged "Needs re-review". | (b) | Owner (confirm) | M3 |
| OQ-22 | Who may change mapping templates, date windows and other matching parameters? Do changes need approval? | These are sensitive settings that shape matching outcomes. | Analysts edit mapping templates and candidate windows, with an audit trail. These need approval from a Controller who did not make the change: parameters that affect auto-match eligibility or split-payment acceptance; identity-key definitions (AF-104); rounding rules (AF-139); changes to the financial-field mappings of a template already in use (AF-123). | (a) | Owner | M4 |

### 3.3 Accounting

| ID | Question | Why it matters | Recommended default | Type | Approval | Blocks |
|---|---|---|---|---|---|---|
| OQ-23 | Which event-to-journal rules and default templates apply to sales, payments, gateway fees, tax on fees, refunds, chargebacks, settlements and bank receipts? Which clearing or in-transit accounts are used? | No posting logic is approved (Seed §13, L250). Inventing it would be wrong. | Build the template mechanism first. A qualified accountant designs and reviews the default templates. No default template is active until approved. The policy must also say which source date (order, capture, settlement or bank value date) sets an event draft's accounting date (AF-109). | (d)(a) | External accountant; owner | M7 |
| OQ-24 | Which revenue-recognition triggers are offered, and which order fields count as evidence (for example a fulfilment status or date)? | The four sources may not contain fulfilment evidence (AF-42). | Configurable per business: fulfilment evidence in order data, or manual confirmation. A cash event (payment, settlement or bank receipt) may be used as the trigger only under an approved policy that explains why, because the approved basis is accrual (D-ACC-01, FR-ACC-032, AF-111). No trigger is active until it is chosen during setup with accountant guidance. | (d)(a) | Accountant; owner | M7 |
| OQ-25 | How are transactions that straddle the cutover date treated (for example captured before cutover, settled after)? | Risk of duplicate or missing accounting (AF-43). | No drafts for events dated before cutover. Post-cutover events linked to pre-cutover events are flagged "Cutover review", and the preparer confirms the treatment against the opening balances. The policy must also define: which event date decides the side of the cutover, and whether the cutover date itself is inside or outside the opening balances; how posted opening balances are corrected; and whether a historical ledger migration process (FR-ACC-033) is needed (AF-100, AF-110, AF-116). | (d)(a) | Accountant; owner | M7 |
| OQ-26 | Do corrections affecting a closed period post in the current open period, or require reopening? | Affects unmatching, revisions and late evidence (AF-45). | Post in the earliest open period, referencing the original entry. Reopening is a separate, explicit Controller decision. The same question applies to new events that arrive late and are dated in a closed period (AF-109). | (d)(a) | Accountant; owner | M6 |
| OQ-27 | What does the default Chart of Accounts contain, and which accounts are system-required? | D-ACC-08 promises "sensible defaults". | Prepared and reviewed by a qualified accountant. The system-required list follows the approved templates. | (d) | Accountant | M6 |
| OQ-28 | Are gap-free sequential journal numbers required? | Common expectation; affects the posting design. | A gap-free posting number per workspace and financial year, assigned at posting time. Drafts have separate identifiers. | (d)(b) | Accountant | M6 |
| OQ-29 | Can the financial-year start or the cutover date change after entries are posted? | Changing the financial year re-maps periods (D-ACC-15). Moving the cutover can duplicate amounts already in the opening balances (AF-100). | Allow both changes only before the first posted entry. A Controller confirms both with MFA before the first posting. Any later change is a separately approved process. | (a) | Owner | M6 |
| OQ-31 | Who may change accounting templates and the Chart of Accounts structure, and what approval does activation need? | Template changes alter future postings; these are sensitive financial settings that require MFA (D-SEC-08). | Preparers draft template versions. A different Controller activates them. Accounts referenced by posted entries cannot be deleted, only deactivated. | (a) | Owner | M6 |
| OQ-32 | Are the generated financial statements management reports or statutory financial statements? | Statutory presentation and compliance claims would need specialist review. | Label them as management reports. Make no claim of statutory format or compliance. | (d) | Accountant; legal | M8 |
| OQ-33 | Which tax fields are preserved from each source, and how do they map to tax ledger accounts? | D-ACC-16 is approved but its treatment is not defined. | Preserve every tax field the source reports. Map them to accounts through accountant-reviewed templates. | (d) | Tax adviser | M7 |
| OQ-56 | Which manual-journal purposes does the initial release support, and which accounts and accounting treatment are approved for each? | D-PRD-08 allows posting only for explicitly supported manual-journal purposes, and none has been approved. Opening balances (D-ACC-11) and corrections of posted entries (D-ACC-07) are approved workflows in their own right; treating them as supported without OQ-56 is an INFERENCE that needs confirming. | No purpose list is proposed here; it must not be invented. The owner and a qualified accountant approve an explicit list, each purpose with its permitted accounts and treatment. Until then, a manual draft for any other purpose can be prepared and validated but stays `Blocked` from posting with the reason "purpose not supported" (FR-ACC-034). | (a)(d) | Owner; external accountant | M6 (posting manual journals beyond opening balances and corrections) |

### 3.4 Security, data and operations

| ID | Question | Why it matters | Recommended default | Type | Approval | Blocks |
|---|---|---|---|---|---|---|
| OQ-34 | Which identity provider? It needs standard OIDC, MFA, MFA assertions, forced reauthentication, session revocation and suitable data residency. | MFA must be verified server-side (AF-62). | **RESOLVED 16 October 2026 — Keycloak selected (D-SEC-12, ADR-0001); OIDC Authorization Code + PKCE S256; development and the current implementation use Keycloak. Live Cognito/Auth0 validation remains outstanding.** Original guidance (retained for history): Choose against these criteria. Development may use a standards-compliant local OIDC provider. Users are identified by the provider's issuer and subject identifier pair, never by email, and replacing the provider needs a designed relinking process (AF-125). Recommendation (unapproved; from the 16 October 2026 architecture review): a time-boxed spike comparing Amazon Cognito and Auth0, with Keycloak for development, CI and as a fallback. The spike tests real behaviour, not advertised features:<br>• OIDC login and logout;<br>• MFA enrollment and account recovery;<br>• authentication strength and recency evidence (`acr`, `amr`, `auth_time` as each provider issues them);<br>• fail-closed behaviour when claims are missing;<br>• revocation and sign-out, including provider-initiated logout;<br>• data residency, privacy and contract terms;<br>• operational burden, cost, migration and vendor-specific limits.<br>Pricing and regional availability must be re-verified from current official sources at decision time. No provider is selected. | (a)(b) | Owner; security | M1 |
| OQ-36 | Does the Admin role include financial-data access? How are the last admin and ownership transfer handled? | Least privilege versus usability for small teams (AF-64). | Admin is administrative only; financial access comes from additional roles. The creator can assign themselves roles, which is audited and notified. Every workspace always has at least one Admin. | (a) | Owner | M1 |
| OQ-37 | Who can read the audit history, and who can download original reports? | D-DAT-01 and D-DAT-05 restrict access, but D-SEC-01 gives Auditors "supporting evidence". | Auditors and Controllers see the full audit history. Admins see administrative events in full, with financial values redacted unless they also hold a financial role (AF-124). Others see the timelines of records they can access. Original-file download is limited to Analysts, Controllers and Auditors. | (a) | Owner | M1, M2 |
| OQ-38 | What are the default idle timeout, absolute session lifetime and fresh-authentication window, and which actions need fresh authentication? | D-SEC-09 makes them configurable but sets no defaults. | **RESOLVED 16 October 2026 — session lifetimes approved as 15 minutes idle and 8 hours absolute, the absolute lifetime anchored to authentication time and not extended by activity (D-SEC-13, ADR-0002). The fresh-authentication window (5 minutes) and the sensitive-operation policy were approved on 17 October 2026 (D-SEC-17).** Original candidate values (retained for history): Defaults for approval: 30 minutes idle, 12 hours absolute, and fresh authentication within 5 minutes for posting approval, period reopening, role changes, offboarding steps a person starts, activation of templates and changes to other sensitive settings, and original-file download. Signed download links, if used, last a few minutes at most (AF-132). These values are unapproved candidates; D-SEC-11 does not set them. They will apply to the Spring Boot server-side sessions. | (a)(b) | Owner; security | M1 |
| OQ-39 | Uploads may contain full card numbers or bank account numbers. Reject or mask them? | Stored original files would retain them. Card numbers could raise PCI DSS questions (AF-67). | Detect likely card numbers before the file reaches evidence storage. Use length, checksum, issuer-prefix and column context, because the checksum alone gives frequent false positives (AF-129). Hold the file for user confirmation, and reject outright only in high-confidence cases. Show bank account numbers masked to the last four digits, and tell accounts apart through configured source accounts (FR-IMP-034). Seek specialist review. | (a)(d) | Owner; security | M2 |
| OQ-40 | What are the encryption key-management design and the malware-scanning provider? | Listed as unresolved in Seed §13, L255. | Use platform-managed encryption keys first and record the residual risks. Choose the scanner together with the hosting platform. | (b)(d) | Security | M9 |
| OQ-41 | What are the numeric retention periods for each category, and what is the legal-hold process? | D-DAT-08 forbids inventing them. | None set. Implement the retention mechanism with periods left empty until a qualified adviser validates them, and block automatic deletion until the periods are approved. The adviser should also confirm: dependency-aware retention (evidence cited by retained records is kept or reduced to a tombstone); the categories for exports, error reports, quarantined rows, attachments and logs; and the event that starts each retention clock (AF-127). | (d) | Legal; accountant | M9 |
| OQ-42 | What sequence, export window and backup behaviour apply to offboarding? | Deletion interacts with jobs, legal holds and backups (AF-81, AF-85). | Request (Admin with MFA and fresh authentication) → access disabled → export window → retention hold → eligible deletion; backups age out under their own retention. Disclose that backup copies are not selectively deleted. The Admin requests the offboarding export, a Controller approves it, and only Controllers or Auditors can download it (AF-124). | (a)(d) | Owner; legal | M9 |
| OQ-43 | Which providers host the database, object storage, email, deployment, secrets manager and monitoring? | Needed for the RPO/RTO evidence and the operations runbook (Seed §13, L253). | Select providers that support point-in-time recovery, object versioning and an India region if required. The secrets approach and development and CI environments are needed for M1; the email provider for M8; production hosting for M9. | (a) | Owner | M1 (partial), M8, M9 |
| OQ-44 | What processing time is acceptable for a 250,000-row import, and what defines load-test success? | Without a target the limits cannot be "validated" (AF-84). | Owner sets a target after a baseline measurement in M2. | (a)(c) | Owner | M9 |
| OQ-45 | Is real customer data ever allowed outside production? | Non-production environments are weaker (AF-86). | No. Use synthetic or anonymized data only. | (a) | Owner | M1 |
| OQ-46 | What accessibility target and browser and device support apply? | No acceptance criteria are possible otherwise (Seed §13, L256). | **RESOLVED 19 October 2026 by D-UI-10.** WCAG 2.2 AA (carried from the prior register as a proposal); current evergreen browsers; desktop-first, with responsive behaviour for tablet and mobile review flows. | (a) | Owner | M1 |
| OQ-47 | What are the information architecture and visual direction, and can the missing reference screenshots be added? | `CLAUDE.md` requires a design proposal before UI work. The reference images are missing (AF-08). | **RESOLVED 19 October 2026 by D-UI-07, D-UI-08 and D-UI-12** (the screenshot no longer blocks; it is needed only for the optional Keycloak theme). Produce a design proposal with the `frontend-design` skill once implementation is authorized. Owner adds the reference images to the repository. | (a) | Owner | M1 |
| OQ-48 | Which versions and tooling? Java LTS, Spring Boot, Maven or Gradle, Flyway or Liquibase, Next.js version and router, frontend libraries. | Needed before scaffolding. | **Frontend libraries resolved 19 October 2026 by D-UI-11; the migration tool remains open.** Choose from current official documentation at M0. The prior register candidates (Tailwind, Radix, TanStack Query and Table, Motion) remain proposals. | (b) | Owner (confirm) | M1 |
| OQ-49 | How are jobs executed: database-backed jobs or a durable queue? | Restart recovery and backpressure depend on it. | PostgreSQL-backed jobs with leases, attempt limits and idempotency keys. Reassess after load tests. | (b) | Owner (confirm) | M2 |
| OQ-50 | What are the API conventions for errors, identifiers and pagination? | Consistency (checklist §5). | RFC 9457 problem details, opaque UUID identifiers, cursor pagination for large lists. | (b) | Owner (confirm) | M1 |
| OQ-51 | What does "unreconciled balances" mean in the period-close checklist (D-ACC-14)? | The item is approved but undefined. There is currently no ledger-to-bank tie-out (AF-102). | At period end, compare each bank account's ledger balance with the statement closing balance, and each clearing or in-transit account's balance with its open reconciliation items. Check statement continuity on import (FR-IMP-031). | (a)(d) | Owner; external accountant | M6, M7 |
| OQ-52 | What happens at year-end close (moving income and expense to retained earnings or current-year profit)? Must periods close in order? | Balance-sheet equity is undefined without a year-end policy (AF-108). | External accountant defines the year-end treatment. Periods close in order (FR-ACC-031). | (d) | External accountant | M6 |
| OQ-53 | A value has more decimal places than its currency allows: quarantine the row, or keep it exactly and flag it? | Both readings are consistent with D-FIN-07, and quarantine can make a settlement group incomplete (FR-IMP-014). | Quarantine, with an error report. | (a) | Owner | M2 |
| OQ-54 | Does the RPO target (≤ 1 hour) also cover uploaded evidence files and exports? | D-OPS-05 requires evidence to be covered by backups, but D-OPS-06 does not say whether its target applies to files (AF-122). | Yes, for evidence files; exports can be regenerated. | (a) | Owner | M9 |
| OQ-55 | Should MFA also be required for roles that can bulk-export data or download original files (Analysts, Auditors)? | D-SEC-08 sets the minimum; these roles can take data out in bulk (AF-135). | **RESOLVED 16 October 2026 — universal MFA for every user approved, plus step-up for sensitive actions (D-SEC-14, ADR-0003). Step-up is not a substitute for the universal baseline. Universal-MFA-at-login enforcement and enrolment/recovery remain to be implemented and tested. The enrolment sign-in, the recovery policy and TOTP as the factor were approved on 17 October 2026 (D-SEC-16, D-SEC-18, D-SEC-19).** Original (retained for history): Yes. The 16 October 2026 architecture review also proposed MFA for every user. That broader proposal is unapproved and recorded here only as a candidate. | (a) | Owner; security | M1 |
| OQ-57 | Which `SameSite` value should the session cookie use (`Lax` or `Strict`)? If `Strict`, how is in-progress login state stored? | Spring Security stores the in-progress authorization request in the HTTP session by default (`HttpSessionOAuth2AuthorizationRequestRepository`). The identity provider's redirect back is a cross-site navigation, so a `Strict` session cookie may not be sent and login may fail unless that state is stored differently. This is analysis, to be confirmed by the spike. RFC 10017 says the cookie SHOULD be `Strict` (AF-146). | **RESOLVED 16 October 2026 — V3 strategy approved (D-SEC-15, ADR-0004): the session cookie is `SameSite=Strict` (`__Host-`), and a separate `__Host-CSLOGIN` login-state cookie is `SameSite=Lax` so the OIDC callback completes. The full CSRF defense is retained; SameSite alone is not sufficient. Safari/WebKit and mobile remain unverified.** Original (retained for history): `Lax` as the initial candidate. Evaluate `Strict` in the authentication spike, with a separate store for login state, and decide on the spike evidence. Neither value replaces the CSRF defense (NFR-SEC-022). | (b)(a) | Owner; security | M1 |

OQ-30 was merged into OQ-17 during consolidation. The number is retired so existing references stay stable.

OQ-35 (where OIDC tokens and sessions live) was resolved for the architectural choice on 16 October 2026 by D-SEC-11. It is kept in §3.5 for traceability and is no longer counted as open or listed as a blocker. OQ-57 was added for the session cookie's `SameSite` value.

OQ-34, OQ-38, OQ-55 and OQ-57 were resolved on 16 October 2026 by D-SEC-12 to D-SEC-15 respectively, after the M0 authentication spike and its security follow-up. Their rows above are annotated as RESOLVED and retained for history; the resolutions and what remains open are recorded in §3.5 and in the decision entries. These approvals authorize M1 authentication implementation (the D-PRC-01 bar on implementation is lifted for this work by the owner's M1 authorization).

### 3.5 Resolved open questions

Kept for traceability. Resolved questions are not counted as open.

| ID | Original question | Resolution | Date and source | What remains open |
|---|---|---|---|---|
| OQ-01 | Is ClearSettle's ledger meant to be the business's complete general ledger, recording all activity including expenses, payroll and other income through manual journals? Or are its statements limited to payment-flow activity? *(Originally recommended: keep the full ledger, support general manual journals, show coverage indicators, and make no claim of replacing full bookkeeping until that scope is approved. Type (a)(d); approval owner and accountant; blocked M6.)* | Product direction resolved by D-PRD-08: a complete business ledger is the long-term direction, introduced gradually. The initial release posts only approved, evidence-backed payment-related workflows and explicitly supported manual journals. Reports disclose their coverage. | 16 October 2026; owner decision (Option C) | Supported manual-journal purposes (OQ-56); event-to-journal rules (OQ-23); revenue-recognition triggers (OQ-24); management or statutory classification of reports (OQ-32); records outside gateway flows (OQ-02). The resolution does not settle any accounting policy. |
| OQ-03 | Does one workspace equal one accounting entity (one Chart of Accounts, one ledger, one financial year)? Can a user belong to several workspaces, and how do they switch? *(Originally recommended: one workspace = one accounting entity; a user may belong to several workspaces and switches explicitly; the active workspace is carried in every request and checked server-side; no cross-workspace views in the MVP. Type (a); approval owner; blocked M1.)* | Resolved by D-PRD-09. One workspace is one accounting entity with its own Chart of Accounts, ledger and financial year. Users may belong to several workspaces and switch explicitly. The active workspace is validated server-side on every relevant request. The MVP has no cross-workspace financial views. | 16 October 2026; owner approval (workspace model) | Session and token design (OQ-35, since resolved by D-SEC-11 on 16 October 2026); Admin financial-data access (OQ-36); functional currency (OQ-19). Any future cross-workspace consolidation needs a separate approved decision. |
| OQ-35 | Where do OIDC tokens and sessions live in a Next.js plus Spring Boot architecture? *(Originally recommended: Spring Boot acts as the confidential OIDC client and holds server-side sessions with `HttpOnly`, `Secure`, `SameSite` cookies; deploy on the same site; use CSRF tokens; keep no tokens in browser storage; keep financial data fetching out of Next.js server code. Type (b); approval owner and security; blocked M1.)* | Resolved for the architectural choice by D-SEC-11 (A′):<br>• Spring Boot owns the OIDC integration and the server-side sessions, stored in PostgreSQL.<br>• The Next.js frontend is client-rendered and served from the same origin.<br>• Browser-held tokens are not the session mechanism.<br>• Workspace-scoped routes carry the workspace ID in the URL, with server-side authorization.<br>• The security constraints and the spike gate are recorded in D-SEC-11. | 16 October 2026; owner approval (authentication architecture) | The `SameSite` value (OQ-57); session limits and the fresh-authentication policy (OQ-38); the identity provider (OQ-34); MFA scope (OQ-55); spike evidence before M1. |
| OQ-34 | Which identity provider? | **Keycloak** (D-SEC-12, ADR-0001): OIDC Authorization Code + PKCE S256, confidential client; the only candidate tested live in the M0 spike. Cognito/Auth0 retained as alternatives. | 16 October 2026; owner approval after the M0 spike | Live Cognito/Auth0 validation (billable, not performed); backchannel logout; enrolment/recovery (OQ-55 scope). |
| OQ-38 | Idle/absolute lifetimes and fresh-authentication policy? | **15-minute idle; 8-hour absolute** anchored to authentication time and not extended by activity (D-SEC-13, ADR-0002). Mechanisms proven in the spike at test values (T-01/T-02). | 16 October 2026; owner approval after the M0 spike | Freshness window and sensitive-operation policy approved 17 October 2026 (D-SEC-17); production values verified in M1 (LR-01 to LR-04); integration with each real sensitive operation as it is built. |
| OQ-55 | Should MFA be broader than privileged roles? | **Universal MFA for every user at login, plus step-up for sensitive actions** (D-SEC-14, ADR-0003); step-up is not a substitute for the baseline. | 16 October 2026; owner approval after the M0 spike | Universal-MFA-at-login enforcement verified in M1; enrolment sign-in (D-SEC-16), recovery policy (D-SEC-18) and factor type (D-SEC-19) approved 17 October 2026; the recovery procedure, ClearSettle-side session revocation and the external review are outstanding. |
| OQ-46 | Accessibility target and browser and device support? | **WCAG 2.2 AA**; current and previous Chrome, Edge, Firefox and Safari; review flows usable on phones (D-UI-10). | 19 October 2026; owner approval of the design defaults | Real Safari, iOS and Android testing (needs infrastructure and authorization). |
| OQ-47 | Information architecture, visual direction, missing screenshots? | Visual direction D-UI-07; navigation D-UI-08; the application's own sign-in D-UI-12, not blocked on the screenshot. | 19 October 2026; owner approval of the design defaults | The D-UI-03 screenshot, for the optional Keycloak login theme only. |
| OQ-57 | `SameSite` value and login-state storage? | **V3** (D-SEC-15, ADR-0004): session cookie `SameSite=Strict` (`__Host-`), separate `__Host-CSLOGIN` login cookie `SameSite=Lax`; full CSRF defense retained. | 16 October 2026; owner approval after the M0 spike | Safari/WebKit and mobile compatibility (unverified); external-deep-link UX under Strict. |

---

## 4. Engineering checklist items affected by approved decisions

The checklist's 110-concept table (§10) is unchanged. These approved decisions trigger or answer its conditional items:

| Checklist item | Previous checklist status | Effect of approved decisions |
|---|---|---|
| §1 baseline ("React + JavaScript"; "confirm expansion beyond reconciliation") | Working baseline | Frontend is Next.js + React + JavaScript (D-TEC-03). Scope expanded to include a ledger (D-PRD-05). |
| §3 "Ledger scope decision" | Open | Ledger in scope: balanced double entry, immutable posted entries, correction by reversal or adjustment are now mandatory (D-ACC-01, D-ACC-07). |
| §13 Q1 Data ingestion | Open | CSV/XLSX uploads; gateway APIs and webhooks deferred (D-IMP-02, D-DEF-02). |
| §13 Q2 Ledger boundary | Open | Answered by D-PRD-05. The scope direction is a full ledger with a staged initial scope (D-PRD-08; OQ-01 resolved 16 October 2026). Supported manual-journal purposes are in OQ-56. |
| §13 Q3 Tenant model | Open | Multi-tenant SaaS, shared PostgreSQL with layered isolation (D-SEC-10). Entity model approved: one workspace is one accounting entity (D-PRD-09; OQ-03 resolved 16 October 2026). |
| §13 Q4 Background processing | Open | Limits approved as targets (D-IMP-09); mechanism OQ-49; performance target OQ-44. |
| §13 Q5 Authentication | Resolved | Managed OIDC (D-SEC-06); provider Keycloak (D-SEC-12). Session architecture D-SEC-11; session policy 15-min idle / 8-h absolute (D-SEC-13); universal MFA + step-up (D-SEC-14); cookie `SameSite` V3 — Strict session cookie + Lax `__Host-CSLOGIN` (D-SEC-15). All approved 16 October 2026. First sign-in after enrolment (D-SEC-16), sensitive operations with a 5-minute freshness window (D-SEC-17), administrator-assisted MFA recovery (D-SEC-18) and TOTP (D-SEC-19) approved 17 October 2026. |
| §13 Q6 Deployment target | Open | Recovery targets approved (D-OPS-06); providers OQ-43. |
| #15 Message queues / background processing | P1, conditional | Background jobs with tracked status and safe retries are required (D-OPS-01); mechanism OQ-49. |
| #20 Dead-letter queues | P1 if queue adopted | An equivalent isolation of permanently failed jobs is required whichever mechanism is chosen (spec NFR-REL-003). |
| #21 Cron jobs | P1 when scheduled work exists | Scheduled work will exist (expiry of access links, retention processing, job lease recovery). Singleton coordination required. |
| #69 OAuth | Conditional | Triggered: OIDC is approved (D-SEC-06). |
| #70 JWT rotation | Conditional P1 | Not used for the application session: D-SEC-11 keeps sessions server-side, with no tokens in the browser. Validation of the provider's tokens is covered by NFR-SEC-001. |
| #72 Encryption at rest | P1 before sensitive data | Approved for object storage (D-DAT-03); key management OQ-40. |
| #75 CORS | P0 | Same-origin deployment, with no cross-origin application access unless an approved use case is documented (D-SEC-11, NFR-SEC-020). CORS is not a CSRF control. |
| #76 CSRF | P0 where cookie auth applies | Applies, because the session uses a cookie (D-SEC-11): CSRF tokens, a required custom header and no state change via GET (NFR-SEC-022). The `SameSite` value is Strict for the session cookie, with a separate Lax `__Host-CSLOGIN` login-state cookie (D-SEC-15); SameSite is defense-in-depth, not the CSRF control. |
| #82 Disaster recovery / #83 Backups | P1 / P0 before real data | Targets and restore testing approved (D-OPS-05, D-OPS-06). |
| #100 Webhooks | Conditional P1 | Gateway webhooks stay out of scope because gateway integrations are deferred (D-DEF-02). Re-assess if an identity or email provider requires inbound webhooks. |
| #109 On-call | P2 / deployment-dependent | The product is production-oriented (D-PRD-04): a named responder and contact path are required before production. |

---

## 5. Prior register entries — disposition

The prior register is preserved verbatim at [`archive/clearsettle_decision_register_pre_consolidation.md`](archive/clearsettle_decision_register_pre_consolidation.md).

| Prior entry | Prior status | Disposition |
|---|---|---|
| §1 Core product (reconciliation) | Confirmed | Expanded by D-PRD-01 and D-PRD-05 (adds the accounting ledger). |
| §1 Initial data ingestion | Confirmed | Carried forward as D-IMP-02. |
| §1 Initial record categories | Agreed | Carried forward as D-IMP-01; formats in OQ-07 and OQ-08. |
| §1 Payment-attempt model | Agreed | Carried forward as D-REC-02 and D-REC-03; duplicate captures in OQ-09 and OQ-11. |
| §1 Matching policy | Approved | Carried forward as D-REC-04 to D-REC-08. |
| §1 Audience | Confirmed broad ambition | Narrowed by D-PRD-02 (SMB finance teams first). |
| §1 Product type ("reconciliation-focused, not a suite") | Working direction | Superseded by D-PRD-05; multi-tenancy confirmed by D-SEC-10. |
| §1 Backend/data baseline | Working architecture | Approved as D-TEC-01, D-TEC-02, D-TEC-04. |
| §1 Frontend framework (Next.js App Router) | Selected direction | Next.js approved (D-TEC-03); App Router and the single-app structure in D-UI-06 and OQ-48. |
| §1 Frontend language (JavaScript) | Current choice | Approved as D-TEC-03. |
| §1 Design reference (Stripe) | Confirmed | Carried forward as D-UI-02. |
| §1 Authentication visual reference | Reference captured | Carried forward as D-UI-03; missing screenshot recorded in OQ-47. |
| §1 Marketing visual reference | Reference captured | Carried forward as D-UI-04. |
| §1 UI governance | Confirmed rule | Carried forward as D-UI-05. |
| §1 Engineering approach | Confirmed process rule | Carried forward as D-PRC-02. |
| §1 AI features | Current direction | Carried forward as D-PRD-07. |
| §1 Implementation timing | Confirmed rule | Carried forward as D-PRC-01. |
| §1 Marketing landing page | Confirmed deferral | Carried forward as D-DEF-01. |
| §2 Decision 1 (workflow shape) | Agreed | Carried forward as D-REC-01 and D-REC-02; link terminology in OQ-06. |
| §2 Decision 2 (matching shapes and policy) | Approved | Carried forward as D-REC-04 to D-REC-12. "Tolerances" superseded by D-REC-07. |
| §2 Decision 3 (financial edge cases) | Open | Partly answered by D-FIN-01 to D-FIN-06 and D-REC-07; remainder in OQ-12, OQ-19, OQ-23. |
| §2 Decision 4 (reconciliation vs ledger) | Open | Answered by D-PRD-05 and D-ACC-01. The completeness question (OQ-01) was resolved for product direction by D-PRD-08 on 16 October 2026. |
| §2 Decision 5 (users and tenants) | Open | Answered by D-PRD-02, D-SEC-01, D-SEC-07, D-SEC-10. The entity model (OQ-03) was resolved by D-PRD-09 on 16 October 2026. |
| §2 Decision 6 (import contracts) | Open | Answered by D-IMP-02 to D-IMP-09 and D-DAT-05; remainder in OQ-07 to OQ-10, OQ-39, OQ-41. |
| §2 Decision 7 (exception lifecycle) | Open | Answered by D-REC-13 to D-REC-16; remainder in OQ-14 to OQ-17, OQ-21. |
| §2 Decision 8 (reports) | Open | Answered by D-RPT-01 to D-RPT-04. |
| §2 Decision 9 (authentication) | Open | Answered by D-SEC-06, D-SEC-08, D-SEC-09 and D-SEC-11 (OQ-35 resolved 16 October 2026). The remainder is in OQ-34, OQ-38 and OQ-57. |
| §2 Decision 10 (real product vs demonstrator) | Open | Answered by D-PRD-04. |
| §3 Frontend choices (libraries, layout, responsiveness, accessibility, theme, locale) | Candidates | Remain proposals; recorded in OQ-46, OQ-47, OQ-48. |
| §4 Architecture and operational choices | Open | OQ-35 resolved by D-SEC-11 (16 October 2026); OQ-43 and OQ-48 to OQ-50 still open; storage approach approved (D-TEC-06); Git workflow in D-PRC-04. |
| §5 Traceability and verification rules | Rule | Carried into the product specification §12 and the implementation plan. |
| §6 Documentation corrections | Pending | Applied on 15 October 2026: links corrected in `CLAUDE.md` and `docs/README.md`; checklist wording reconciled. Implementation-status document defined in the implementation plan, to be created when implementation is authorized. |
| §7 Recommended next discussion | Proposal | Replaced by OQ-06 to OQ-13 and the implementation plan's decision gates. |

---

## 6. Change log

| Date | Change |
|---|---|
| 15 October 2026 | Register rebuilt from the seed and the owner's consolidation brief. Prior register archived verbatim. Prior entries mapped in §5. Open questions consolidated into OQ-01 to OQ-50. |
| 16 October 2026 | Independent-review changes: label definition clarified for engineering rules; index statuses aligned with entries; OQ-14, OQ-19, OQ-21 to OQ-26, OQ-29, OQ-34, OQ-37 to OQ-39 and OQ-41 to OQ-43 extended; OQ-51 to OQ-55 added; §7 lists decisions that depend on owner instructions not stored in the repository. |
| 16 October 2026 | Owner decision recorded as D-PRD-08 (Option C: full ledger, introduced gradually). OQ-01 resolved for product direction and moved to §3.5. OQ-56 added (supported manual-journal purposes). D-PRD-01, D-PRD-05, D-ACC-01, D-RPT-01, OQ-02, §4 and §5 updated to match. No other approved decision changed. |
| 16 October 2026 | Owner approval recorded as D-PRD-09 (one workspace is one accounting entity; multi-workspace membership with explicit switching; no cross-workspace financial views in the MVP). OQ-03 resolved and moved to §3.5. D-SEC-07, §4 and §5 updated to match. No other approved decision changed. |
| 16 October 2026 | Owner approval recorded as D-SEC-11 (authentication session architecture A′). OQ-35 resolved for the architectural choice and moved to §3.5. OQ-57 added for the session cookie's `SameSite` value. OQ-34, OQ-38 and OQ-55 stay open: OQ-34 gained a spike proposal, OQ-38 its values labelled as unapproved candidates, and OQ-55 the MFA-for-everyone proposal labelled as unapproved. References to OQ-35 in D-PRD-09, D-TEC-04, D-SEC-06 and the OQ-03 resolution updated; D-SEC-08, §4 and §5 updated. No other approved decision changed. |
| 16 October 2026 | After the owner-authorized M0 authentication spike and its security follow-up, the owner approved the four remaining D-SEC-11 sub-decisions and authorized M1 authentication implementation. Recorded as D-SEC-12 (identity provider: Keycloak; resolves OQ-34), D-SEC-13 (session policy 15-min idle / 8-h absolute; resolves OQ-38), D-SEC-14 (universal MFA + step-up; resolves OQ-55) and D-SEC-15 (SameSite V3; resolves OQ-57), each with a matching ADR in `adr/`. OQ-34, OQ-38, OQ-55 and OQ-57 annotated RESOLVED and added to §3.5. D-SEC-11 index status and "Open" line, §4 (§13 Q5, #76 CSRF) updated. Approval dates and outstanding acceptance criteria (live managed-provider validation; universal-MFA-at-login enforcement; enrolment/recovery; Safari/mobile; F-1 product logging integration; F-3 retention) recorded as still mandatory. No other approved decision changed. |
| 17 October 2026 | The owner approved the four security-policy recommendations from the M1 integration validation. Recorded as D-SEC-16 (the sign-in that enrols TOTP creates no session), D-SEC-17 (sensitive operations: 5-minute freshness, step-up, single-use confirmation; categories from NFR-SEC-004), D-SEC-18 (MFA recovery: administrator-assisted, identity-verified, audited; no self-service reset; procedure and ClearSettle-side controls not built) and D-SEC-19 (TOTP for every user). D-SEC-13 and D-SEC-14 "Open" lines, OQ-38 and OQ-55 (§3.4, §3.5), §4 (§13 Q5) and §7 updated; ADR-0002 and ADR-0003 amended. No other approved decision changed. |

| 19 October 2026 | The owner approved the seven defaults of the frontend design proposal, with clarifications. Recorded as D-UI-07 (visual direction), D-UI-08 (navigation), D-UI-09 (amount formatting and currency boundaries), D-UI-10 (accessibility and browser support; resolves OQ-46), D-UI-11 (frontend architecture and dependencies; resolves the frontend-library part of OQ-48), D-UI-12 (the application's own sign-in experience, not blocked on the D-UI-03 screenshot; with D-UI-07 and D-UI-08 resolves OQ-47) and D-UI-13 (build order). |
---

## 7. Decisions whose only source is an owner instruction outside the repository

The owner gave the 15 October 2026 consolidation brief, the Git and GitHub workflow instruction, and the 16 October 2026 ledger-scope decision, workspace-model approval and authentication-architecture approval during working sessions. They are not stored in the repository, because the owner's repository rules exclude prompts and tool-specific files. The decisions below rest only on those instructions, so they cannot be verified from repository files alone (AF-143). Once the owner confirms them during review, the confirmation becomes their recorded source.

| Decision | What depends only on the owner instruction | Owner confirmation |
|---|---|---|
| D-REC-19 | Reconciliation outcomes kept separate from accounting postings, with traceable links (Brief §D). The seed is consistent with this (L102, L116, L120) but does not state it directly. | Pending |
| D-SEC-04 | Extending tenant scope to reports and notifications (Brief §E). The seed lists queries, file actions, jobs, endpoints and exports (L189). | Pending |
| D-PRC-04 | The Git and GitHub workflow and the no-AI-attribution rule (Git instruction). | Pending |
| D-PRD-08 | Full-ledger direction with staged initial scope (owner decision, 16 October 2026, Option C). | Given explicitly by the owner on 16 October 2026; this entry is its record. |
| D-PRD-09 | Workspace represents one accounting entity (owner approval, 16 October 2026, workspace model). | Given explicitly by the owner on 16 October 2026; this entry is its record. |
| D-SEC-11 | Authentication session architecture A′ (owner approval, 16 October 2026, authentication architecture). | Given explicitly by the owner on 16 October 2026; this entry is its record. |
| D-SEC-16 to D-SEC-19 | The four M1 security-policy approvals (owner approval, 17 October 2026, security policy). | Given explicitly by the owner on 17 October 2026; these entries are their record. |
| D-UI-07 to D-UI-13 | The seven frontend design approvals (owner approval, 19 October 2026, design defaults). | Given explicitly by the owner on 19 October 2026; these entries are their record. |
