# ClearSettle — Decision Register

**Document status:** Consolidated for owner review. The project is still in specification; no application implementation is authorized.
**Consolidated:** 15 October 2026
**Primary source:** [`clearsettle_approved_decisions_seed.md`](clearsettle_approved_decisions_seed.md), cited below as "Seed §n, Lxx".
**Related documents:** [Product specification](clearsettle_product_specification.md), [Specification audit](clearsettle_specification_audit.md), [Implementation plan](clearsettle_implementation_plan.md), [Engineering checklist](../engineering/clearsettle_master_engineering_checklist.md), [Pre-consolidation register (archived)](archive/clearsettle_decision_register_pre_consolidation.md).

This register is the authoritative record of what has and has not been decided. The product specification turns these decisions into requirements. When the two disagree, this register governs until the specification is corrected.

## How to read this register

### Status labels

| Label | Meaning |
|---|---|
| APPROVED | Explicitly approved during product discovery. The evidence is the seed, an owner instruction in the 15 October 2026 consolidation brief, or an entry marked "Confirmed" in the prior register that nothing later contradicts. |
| EXISTING | A verified fact about the current repository. |
| RECOMMENDATION | A proposed solution that has not been approved. |
| INFERENCE | A reasonable interpretation of approved decisions that still needs owner confirmation. |
| UNRESOLVED | An open decision. Every unresolved item has an `OQ-` entry in section 3. |
| DEFERRED | Deliberately excluded from the current scope. |
| EXTERNAL REVIEW REQUIRED | Needs validation by a qualified accounting, legal, tax, privacy or security specialist. |

An entry can carry more than one label. For example, "APPROVED; EXTERNAL REVIEW REQUIRED" means the direction is approved but its professional details still need validation.

### Sources and precedence

1. **Owner instructions** given during consolidation on 15 October 2026. These are cited as "Brief §A–G" (product consolidation brief) and "Git instruction" (Git and GitHub workflow and attribution rules).
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
| D-PRD-07 | No AI/LLM features by default | APPROVED |
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
| D-IMP-01 | Four source-data categories | APPROVED |
| D-IMP-02 | CSV and XLSX uploads | APPROVED |
| D-IMP-03 | Guided column mapping and templates | APPROVED |
| D-IMP-04 | Validation and staging before commit | APPROVED |
| D-IMP-05 | Partial import with quarantine | APPROVED |
| D-IMP-06 | Evidence-based duplicate detection | APPROVED |
| D-IMP-07 | Idempotent reruns and retries | APPROVED |
| D-IMP-08 | Reject unsafe or unsupported files | APPROVED |
| D-IMP-09 | Initial import limits (50 MB, 250,000 rows) | APPROVED (targets); unverified |
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
| D-REC-15 | Structured exception management | APPROVED |
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
- **Open:** OQ-01.

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
- **Constraints:** The ledger rules in checklist §3 apply: balanced double entry, immutable posted entries, and correction by reversal or adjustment.
- **Tests:** Accounting invariants (D-ACC-04 to D-ACC-07) and the release gate (D-REL-01).
- **Source:** Seed §1, L25 and §6, L150; Brief §D. Supersedes prior register Decision 4 and its "Product type" row. Answers checklist §13 question 2.
- **Open:** OQ-01.

#### D-PRD-06 — No blanket scope expansion
- **Status:** APPROVED
- **Decision:** Deferred items (D-DEF-01 to D-DEF-07) stay out of the MVP. Any proposed addition must state the added scope and its dependencies, and needs owner approval.
- **Source:** Seed §1, L28 and §12; Brief §G.

#### D-PRD-07 — No AI/LLM features by default
- **Status:** APPROVED (engineering rule)
- **Decision:** No AI/LLM functionality unless the owner later requests it. A proposal must come with a separate threat model and acceptance checklist.
- **Source:** Checklist §7, L137 and §11, L350; prior register row "AI features" ("Current direction").

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
- **Open:** OQ-35 (session and backend-for-frontend design), OQ-50 (API conventions).

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
- **Open:** OQ-47.

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
- **Source:** Seed §6, L150–151; Brief §D.
- **Open:** OQ-01, OQ-19.

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
- **Source:** Seed §6, L168; Brief §D.
- **Open:** OQ-01, OQ-32.

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
- **Open:** OQ-34, OQ-35.

#### D-SEC-07 — Self-service workspace onboarding
- **Status:** APPROVED
- **Decision:** A verified user can create a business workspace and becomes its first administrator, then invites teammates. Onboarding never exposes existing tenants.
- **Source:** Seed §8, L193.
- **Open:** OQ-03, OQ-36.

#### D-SEC-08 — MFA for privileged users
- **Status:** APPROVED
- **Decision:**
  - MFA is required for privileged users and for anyone who can approve postings, reopen periods or change sensitive financial settings. Other users may enable it.
  - High-risk actions may require fresh authentication.
  - The identity provider's MFA capability and vendor are not selected.
- **Source:** Seed §8, L194.
- **Open:** OQ-34, OQ-38.

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
| OQ-01 | Is ClearSettle's ledger meant to be the business's complete general ledger, recording all activity including expenses, payroll and other income through manual journals? Or are its statements limited to payment-flow activity? | A profit and loss or balance sheet built only from payment events would be economically incomplete and could mislead (AF-40). | Keep the approved full double-entry ledger. Support general manual journal drafts (prepared and approved like any other journal). Show statement completeness and coverage indicators. Make no claim that ClearSettle replaces full bookkeeping until that scope is approved. | (a)(d) | Owner; accountant | M6 |
| OQ-02 | How are records outside gateway flows handled: orders paid by cash on delivery or direct bank transfer, and bank transactions unrelated to gateway payouts? | Without a rule they either flood the exception queue or vanish unexplained (AF-25). | Mark them "Outside gateway reconciliation" through a template rule or a user classification with a reason. They are not exceptions and not "reconciled". Bank movements become journal drafts only through explicit templates or manual drafts. | (a) | Owner | M4 |
| OQ-03 | Does one workspace equal one accounting entity (one Chart of Accounts, one ledger, one financial year)? Can a user belong to several workspaces, and how do they switch? | The tenant boundary, ledger boundary and session design all depend on this (AF-69). | One workspace = one accounting entity. A user may belong to several workspaces and switches explicitly; the active workspace is carried in every request and checked server-side. No cross-workspace views in the MVP. | (a) | Owner | M1 |
| OQ-04 | Are billing and subscriptions, terms of service, privacy policy and data-processing terms in scope before onboarding real customers? | A production SaaS needs them, but none is mentioned in the approved decisions (AF-70). | Keep billing out of the MVP build. Treat legal terms as a release prerequisite prepared by qualified counsel. | (a)(d) | Owner; legal | M10 |
| OQ-05 | How may ClearSettle staff (platform operators) access tenant data for support or incidents? | Uncontrolled operator access defeats tenant isolation (AF-60). | No standing access. A time-bound break-glass procedure requiring customer consent (except in a documented emergency), MFA, reason capture and audit events visible to the workspace. | (a)(d) | Owner; security | M1 (design), M10 |

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
| OQ-14 | What numeric thresholds and criteria make a case high-risk, and what is the approval policy? | Seed L109 forbids inventing thresholds. | Until thresholds are approved, treat all of the following as high-risk: manual matches with a non-zero difference or without identifier evidence; accepted differences; resolutions affecting posted accounting; grouped manual matches; cross-currency handling. | (a)(d) | Owner; accountant | M5 |
| OQ-15 | How is a difference resolved when it genuinely cannot be explained (write-off or accepted difference)? | Without a path, exceptions stay open forever or receive invented explanations (AF-29). | Allow "Resolved – accepted difference" only through high-risk approval by a different user, with investigation evidence and an approved adjusting journal to a designated account. Never label it "explained". | (a)(d) | Owner; accountant | M5 |
| OQ-16 | Should exceptions also have `Pending approval` and a reopen transition? | High-risk approvals and unmatching need states (AF-29). | Add `Pending approval`. Allow `Resolved` → `Open` with a reason and an audit event. | (a) | Owner | M5 |
| OQ-17 | How far does separation of duties reach? | Self-approval could otherwise be bypassed (AF-44). | No user may approve an item they created, submitted or edited. This covers journals, high-risk exception resolutions, opening balances, template activation and period-close exceptions. The person who submits a system-generated draft becomes its preparer. | (a) | Owner | M5, M6 |
| OQ-18 | No self-approval means a single-user workspace can never post a journal or approve a high-risk item. Is that accepted? | It is a direct consequence of D-ACC-05 for very small businesses (AF-44). | Accept it as a documented product constraint and explain it during onboarding. Any relaxation needs explicit owner approval. | (a) | Owner | M6 |
| OQ-19 | How are cross-currency items handled (for example a USD payment settled in INR), and what is each workspace's functional currency? | FX is deferred and manual matches enforce currency checks, so these items can never reconcile (AF-23). | One functional currency per workspace; INR is the proposed default for India, pending owner confirmation. MVP journals use only the functional currency. Cross-currency links are never auto-matched. A manual link is allowed only when the settlement report itself states both amounts and the conversion, with high-risk approval. No journal drafts for such items until FX accounting is approved. | (a)(d) | Owner; accountant | M3, M7 |
| OQ-20 | Can a UTR or reference extracted from a bank narration count as exact-identifier evidence? | Bank references often exist only in free-text narration (AF-27). | Yes, but only when a template-defined pattern extracts exactly one reference. The extracted reference is stored separately from the raw narration. Otherwise the record is a candidate only. | (a)(b) | Owner | M4 |
| OQ-21 | What is a run's scope and trigger, and what happens to manual decisions when the evidence behind them changes? | Needed for reproducibility and comparison (D-REC-18). | Users trigger runs per stage over a selected period. Results are immutable snapshots. Manual decisions carry forward unless an underlying record version changed, in which case they are flagged "Needs re-review". | (b) | Owner (confirm) | M3 |
| OQ-22 | Who may change mapping templates, date windows and other matching parameters? Do changes need approval? | These are sensitive settings that shape matching outcomes. | Analysts edit mapping templates and candidate windows, with an audit trail. Parameters that affect auto-match eligibility or split-payment acceptance need approval from a Controller who did not make the change. | (a) | Owner | M4 |

### 3.3 Accounting

| ID | Question | Why it matters | Recommended default | Type | Approval | Blocks |
|---|---|---|---|---|---|---|
| OQ-23 | Which event-to-journal rules and default templates apply to sales, payments, gateway fees, tax on fees, refunds, chargebacks, settlements and bank receipts? Which clearing or in-transit accounts are used? | No posting logic is approved (Seed §13, L250). Inventing it would be wrong. | Build the template mechanism first. A qualified accountant designs and reviews the default templates. No default template is active until approved. | (d)(a) | Accountant; owner | M7 |
| OQ-24 | Which revenue-recognition triggers are offered, and which order fields count as evidence (for example a fulfilment status or date)? | The four sources may not contain fulfilment evidence (AF-42). | Configurable per business: fulfilment evidence in order data, successful payment, or manual. No trigger is active until it is chosen during setup with accountant guidance. | (d)(a) | Accountant; owner | M7 |
| OQ-25 | How are transactions that straddle the cutover date treated (for example captured before cutover, settled after)? | Risk of duplicate or missing accounting (AF-43). | No drafts for events dated before cutover. Post-cutover events linked to pre-cutover events are flagged "Cutover review", and the preparer confirms the treatment against the opening balances. | (d)(a) | Accountant; owner | M7 |
| OQ-26 | Do corrections affecting a closed period post in the current open period, or require reopening? | Affects unmatching, revisions and late evidence (AF-45). | Post in the earliest open period, referencing the original entry. Reopening is a separate, explicit Controller decision. | (d)(a) | Accountant; owner | M6 |
| OQ-27 | What does the default Chart of Accounts contain, and which accounts are system-required? | D-ACC-08 promises "sensible defaults". | Prepared and reviewed by a qualified accountant. The system-required list follows the approved templates. | (d) | Accountant | M6 |
| OQ-28 | Are gap-free sequential journal numbers required? | Common expectation; affects the posting design. | A gap-free posting number per workspace and financial year, assigned at posting time. Drafts have separate identifiers. | (d)(b) | Accountant | M6 |
| OQ-29 | Can the financial-year start change after entries are posted? | Changing it re-maps periods (D-ACC-15). | Allow changes only before the first posted entry. Any later change is deferred. | (a) | Owner | M6 |
| OQ-31 | Who may change accounting templates and the Chart of Accounts structure, and what approval does activation need? | Template changes alter future postings; these are sensitive financial settings that require MFA (D-SEC-08). | Preparers draft template versions. A different Controller activates them. Accounts referenced by posted entries cannot be deleted, only deactivated. | (a) | Owner | M6 |
| OQ-32 | Are the generated financial statements management reports or statutory financial statements? | Statutory presentation and compliance claims would need specialist review. | Label them as management reports. Make no claim of statutory format or compliance. | (d) | Accountant; legal | M8 |
| OQ-33 | Which tax fields are preserved from each source, and how do they map to tax ledger accounts? | D-ACC-16 is approved but its treatment is not defined. | Preserve every tax field the source reports. Map them to accounts through accountant-reviewed templates. | (d) | Tax adviser | M7 |

### 3.4 Security, data and operations

| ID | Question | Why it matters | Recommended default | Type | Approval | Blocks |
|---|---|---|---|---|---|---|
| OQ-34 | Which identity provider? It needs standard OIDC, MFA, MFA assertions, forced reauthentication, session revocation and suitable data residency. | MFA must be verified server-side (AF-62). | Choose against these criteria. Development may use a standards-compliant local OIDC provider. | (a)(b) | Owner; security | M1 |
| OQ-35 | Where do OIDC tokens and sessions live in a Next.js plus Spring Boot architecture? | Determines exposure to XSS token theft, CSRF and CORS (AF-61). | Spring Boot acts as the confidential OIDC client and holds server-side sessions with `HttpOnly`, `Secure`, `SameSite` cookies. Deploy on the same site, use CSRF tokens, keep no tokens in browser storage, and keep financial data fetching out of Next.js server code. | (b) | Owner; security | M1 |
| OQ-36 | Does the Admin role include financial-data access? How are the last admin and ownership transfer handled? | Least privilege versus usability for small teams (AF-64). | Admin is administrative only; financial access comes from additional roles. The creator can assign themselves roles, which is audited and notified. Every workspace always has at least one Admin. | (a) | Owner | M1 |
| OQ-37 | Who can read the audit history, and who can download original reports? | D-DAT-01 and D-DAT-05 restrict access, but D-SEC-01 gives Auditors "supporting evidence". | Auditors, Controllers and Admins see the full audit history; others see the timelines of records they can access. Original-file download is limited to Analysts, Controllers and Auditors. | (a) | Owner | M1, M2 |
| OQ-38 | What are the default idle timeout, absolute session lifetime and fresh-authentication window, and which actions need fresh authentication? | D-SEC-09 makes them configurable but sets no defaults. | Defaults for approval: 30 minutes idle, 12 hours absolute, fresh authentication within 5 minutes for posting approval, period reopening, role changes, offboarding and sensitive settings. | (a)(b) | Owner; security | M1 |
| OQ-39 | Uploads may contain full card numbers or bank account numbers. Reject or mask them? | Stored original files would retain them. Card numbers could raise PCI DSS questions (AF-67). | Detect likely card numbers before the file reaches evidence storage and reject the file with guidance. Mask bank account numbers to the last four digits in imported records. Seek specialist review. | (a)(d) | Owner; security | M2 |
| OQ-40 | What are the encryption key-management design and the malware-scanning provider? | Listed as unresolved in Seed §13, L255. | Use platform-managed encryption keys first and record the residual risks. Choose the scanner together with the hosting platform. | (b)(d) | Security | M9 |
| OQ-41 | What are the numeric retention periods for each category, and what is the legal-hold process? | D-DAT-08 forbids inventing them. | None set. Implement the retention mechanism with periods left empty until a qualified adviser validates them. Block automatic deletion until the periods are approved. | (d) | Legal; accountant | M9 |
| OQ-42 | What sequence, export window and backup behaviour apply to offboarding? | Deletion interacts with jobs, legal holds and backups (AF-81, AF-85). | Request (Admin with MFA and fresh authentication) → access disabled → export window → retention hold → eligible deletion; backups age out under their own retention. Disclose that backup copies are not selectively deleted. | (a)(d) | Owner; legal | M9 |
| OQ-43 | Which providers host the database, object storage, email, deployment, secrets manager and monitoring? | Needed for the RPO/RTO evidence and the operations runbook (Seed §13, L253). | Select providers that support point-in-time recovery, object versioning and an India region if required. Decide in M0/M9. | (a) | Owner | M9 |
| OQ-44 | What processing time is acceptable for a 250,000-row import, and what defines load-test success? | Without a target the limits cannot be "validated" (AF-84). | Owner sets a target after a baseline measurement in M2. | (a)(c) | Owner | M9 |
| OQ-45 | Is real customer data ever allowed outside production? | Non-production environments are weaker (AF-86). | No. Use synthetic or anonymized data only. | (a) | Owner | M1 |
| OQ-46 | What accessibility target and browser and device support apply? | No acceptance criteria are possible otherwise (Seed §13, L256). | WCAG 2.2 AA (carried from the prior register as a proposal); current evergreen browsers; desktop-first, with responsive behaviour for tablet and mobile review flows. | (a) | Owner | M1 |
| OQ-47 | What are the information architecture and visual direction, and can the missing reference screenshots be added? | `CLAUDE.md` requires a design proposal before UI work. The reference images are missing (AF-08). | Produce a design proposal with the `frontend-design` skill once implementation is authorized. Owner adds the reference images to the repository. | (a) | Owner | M1 |
| OQ-48 | Which versions and tooling? Java LTS, Spring Boot, Maven or Gradle, Flyway or Liquibase, Next.js version and router, frontend libraries. | Needed before scaffolding. | Choose from current official documentation at M0. The prior register candidates (Tailwind, Radix, TanStack Query and Table, Motion) remain proposals. | (b) | Owner (confirm) | M1 |
| OQ-49 | How are jobs executed: database-backed jobs or a durable queue? | Restart recovery and backpressure depend on it. | PostgreSQL-backed jobs with leases, attempt limits and idempotency keys. Reassess after load tests. | (b) | Owner (confirm) | M2 |
| OQ-50 | What are the API conventions for errors, identifiers and pagination? | Consistency (checklist §5). | RFC 9457 problem details, opaque UUID identifiers, cursor pagination for large lists. | (b) | Owner (confirm) | M1 |

OQ-30 was merged into OQ-17 during consolidation. The number is retired so existing references stay stable.

---

## 4. Engineering checklist items affected by approved decisions

The checklist's 110-concept table (§10) is unchanged. These approved decisions trigger or answer its conditional items:

| Checklist item | Previous checklist status | Effect of approved decisions |
|---|---|---|
| §1 baseline ("React + JavaScript"; "confirm expansion beyond reconciliation") | Working baseline | Frontend is Next.js + React + JavaScript (D-TEC-03). Scope expanded to include a ledger (D-PRD-05). |
| §3 "Ledger scope decision" | Open | Ledger in scope: balanced double entry, immutable posted entries, correction by reversal or adjustment are now mandatory (D-ACC-01, D-ACC-07). |
| §13 Q1 Data ingestion | Open | CSV/XLSX uploads; gateway APIs and webhooks deferred (D-IMP-02, D-DEF-02). |
| §13 Q2 Ledger boundary | Open | Answered by D-PRD-05; completeness still open (OQ-01). |
| §13 Q3 Tenant model | Open | Multi-tenant SaaS, shared PostgreSQL with layered isolation (D-SEC-10); entity model OQ-03. |
| §13 Q4 Background processing | Open | Limits approved as targets (D-IMP-09); mechanism OQ-49; performance target OQ-44. |
| §13 Q5 Authentication | Open | Managed OIDC (D-SEC-06); provider OQ-34; session design OQ-35. |
| §13 Q6 Deployment target | Open | Recovery targets approved (D-OPS-06); providers OQ-43. |
| #15 Message queues / background processing | P1, conditional | Background jobs with tracked status and safe retries are required (D-OPS-01); mechanism OQ-49. |
| #20 Dead-letter queues | P1 if queue adopted | An equivalent isolation of permanently failed jobs is required whichever mechanism is chosen (spec NFR-REL-003). |
| #21 Cron jobs | P1 when scheduled work exists | Scheduled work will exist (expiry of access links, retention processing, job lease recovery). Singleton coordination required. |
| #69 OAuth | Conditional | Triggered: OIDC is approved (D-SEC-06). |
| #70 JWT rotation | Conditional P1 | Depends on OQ-35. |
| #72 Encryption at rest | P1 before sensitive data | Approved for object storage (D-DAT-03); key management OQ-40. |
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
| §2 Decision 4 (reconciliation vs ledger) | Open | Answered by D-PRD-05 and D-ACC-01; completeness in OQ-01. |
| §2 Decision 5 (users and tenants) | Open | Answered by D-PRD-02, D-SEC-01, D-SEC-07, D-SEC-10; entity model in OQ-03. |
| §2 Decision 6 (import contracts) | Open | Answered by D-IMP-02 to D-IMP-09 and D-DAT-05; remainder in OQ-07 to OQ-10, OQ-39, OQ-41. |
| §2 Decision 7 (exception lifecycle) | Open | Answered by D-REC-13 to D-REC-16; remainder in OQ-14 to OQ-17, OQ-21. |
| §2 Decision 8 (reports) | Open | Answered by D-RPT-01 to D-RPT-04. |
| §2 Decision 9 (authentication) | Open | Answered by D-SEC-06, D-SEC-08, D-SEC-09; remainder in OQ-34, OQ-35, OQ-38. |
| §2 Decision 10 (real product vs demonstrator) | Open | Answered by D-PRD-04. |
| §3 Frontend choices (libraries, layout, responsiveness, accessibility, theme, locale) | Candidates | Remain proposals; recorded in OQ-46, OQ-47, OQ-48. |
| §4 Architecture and operational choices | Open | OQ-35, OQ-43, OQ-48 to OQ-50; storage approach approved (D-TEC-06); Git workflow in D-PRC-04. |
| §5 Traceability and verification rules | Rule | Carried into the product specification §12 and the implementation plan. |
| §6 Documentation corrections | Pending | Applied on 15 October 2026: links corrected in `CLAUDE.md` and `docs/README.md`; checklist wording reconciled. Implementation-status document defined in the implementation plan, to be created when implementation is authorized. |
| §7 Recommended next discussion | Proposal | Replaced by OQ-06 to OQ-13 and the implementation plan's decision gates. |

---

## 6. Change log

| Date | Change |
|---|---|
| 15 October 2026 | Register rebuilt from the seed and the owner's consolidation brief. Prior register archived verbatim. Prior entries mapped in §5. Open questions consolidated into OQ-01 to OQ-50. |
