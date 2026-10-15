# ClearSettle — Product Specification

**Document status:** Draft for owner review. Specification phase only. This document does not authorize implementation (D-PRC-01).
**Prepared:** 15 October 2026; revised 16 October 2026 after independent review, and again on 16 October 2026 for the ledger-scope decision D-PRD-08, the workspace-model decision D-PRD-09 and the authentication-architecture decision D-SEC-11
**Decision source:** [Decision register](clearsettle_decision_register.md). Decision IDs (`D-…`) and open questions (`OQ-…`) refer to it. Audit findings (`AF-…`) refer to the [specification audit](clearsettle_specification_audit.md).
**Engineering baseline:** [Master engineering checklist](../engineering/clearsettle_master_engineering_checklist.md).

## How to use this specification

This is the primary product-level reference for engineering, UX, testing and review. It does not settle open questions. Anything that depends on an open question is labelled and linked to it.

### Requirement labels

| Label | Meaning |
|---|---|
| **Mandatory** | Required by an approved decision. "Mandatory (derived)" marks a requirement that follows directly from an approved decision even though the decision does not state it word for word; the derivation is cited. The owner may challenge a derivation. |
| **Conditional** | Required only when a stated condition holds. |
| **Deferred** | Out of the current scope (D-DEF-…). |
| **Recommended** | Proposed design or behaviour. Not binding until the owner approves it. |
| **Unresolved** | Depends on an open question. The recommended default is shown but is not binding. |

Requirement IDs are stable. An ID is never reused after deletion; it is marked "withdrawn" instead.

In source citations, "Lnn" means line nn of the cited file. L1, L2 and L3 written without a file name are the reconciliation links defined in §5.1.

### Requirement ID prefixes

| Prefix | Area | Prefix | Area |
|---|---|---|---|
| FR-WSP | Workspace, membership, roles | FR-RPT | Reports and exports |
| FR-IMP | Imports and source data | FR-NTF | Notifications |
| FR-REC | Reconciliation and matching | NFR-SEC | Security, authentication, authorization, tenancy |
| FR-EXC | Exceptions and discrepancies | NFR-DAT | Audit, privacy, retention, offboarding |
| FR-FIN | Financial events and traceability | NFR-REL | Reliability, jobs, recovery |
| FR-ACC | Accounting | NFR-OPS | Environments, delivery, observability |
| AC | Acceptance criteria | NFR-PERF / NFR-UX | Performance; usability and accessibility |

---

## 1. Product vision, target customers, personas and MVP boundaries

### 1.1 Vision

ClearSettle helps finance and accounting teams prove that the money their customers paid actually arrived. It also turns that evidence into correct, approved accounting entries.

The chain it makes traceable is:
1. a merchant order;
2. each payment attempt on that order;
3. the gateway's settlement of the successful payment, net of fees, taxes, refunds and adjustments;
4. the bank credit for that settlement;
5. the double-entry journal entries that record it.

Every difference is either explained by explicit, evidenced rules or remains visibly open (D-PRD-01, D-PRD-05, D-REC-07, D-REC-17).

In the long term ClearSettle is meant to become a complete business ledger, introduced gradually (D-PRD-08). The initial release records only what its approved workflows and explicitly supported manual journals cover, and its reports say so.

The product is production-oriented (D-PRD-04). Its value depends on being trustworthy, which leads to three principles:
- original source values are never overwritten (D-IMP-12);
- nothing is matched on coincidence (D-REC-06);
- no unexplained difference is ever treated as resolved (D-REC-17).

### 1.2 Target customers

| Aspect | Specification | Status |
|---|---|---|
| Launch customer | Finance and accounting teams at small and medium-sized businesses that accept payments through payment gateways. | Mandatory (D-PRD-02) |
| Launch market | India first. Indian defaults where approved (financial year 1 April–31 March, D-ACC-15). Explicit currency everywhere so other markets need no remodelling (D-PRD-03, D-FIN-05). | Mandatory |
| Later audiences | Individual merchants and small businesses; SaaS and online businesses. Not optimized for in the first release. | Mandatory (D-PRD-02) |
| Team size | Small teams in which one person may hold several roles (D-SEC-02). Separation of duties still applies, so posting needs at least two people (OQ-18). | Mandatory; Unresolved (OQ-18) |

### 1.3 Personas

These personas are an **INFERENCE** derived from the five approved roles (D-SEC-01). They are not research findings and should be validated with prospective customers.

| Persona | Typical role(s) | Primary goals | Key worries |
|---|---|---|---|
| Finance lead at an online SMB | Workspace Owner/Admin and Finance Controller/Approver | A month-end close the company can trust; a team that cannot post unreviewed entries. | Silent errors in the books; unexplained gateway deductions. |
| Reconciliation analyst | Reconciliation Analyst | Import gateway and bank reports quickly; clear the exception queue with evidence. | Re-keying data; ambiguous references; reports that change after import. |
| Accountant | Accountant/Journal Preparer | Correct journals for sales, fees, refunds and settlements without retyping; clean opening balances. | Duplicate entries; wrong accounts; reversals that obscure history. |
| External auditor or reviewer | Auditor/Viewer | Follow any ledger amount back to its source evidence and approvals. | Missing evidence; edited history. |

### 1.4 Core use cases

| ID | Use case | Primary decisions |
|---|---|---|
| UC-01 | Set up a workspace, invite the team and assign roles. | D-SEC-01, D-SEC-07 |
| UC-02 | Import order, gateway transaction, settlement and bank reports through guided mapping. | D-IMP-01 to D-IMP-13 |
| UC-03 | Reconcile successful payments with settlement lines, including fees, taxes, refunds and adjustments. | D-REC-01 to D-REC-12, D-FIN-01 to D-FIN-04 |
| UC-04 | Verify that settlement payouts reached the bank. | D-REC-10, D-REC-17 |
| UC-05 | Investigate and resolve discrepancies with evidence, including risk-based approval. | D-REC-13 to D-REC-17 |
| UC-06 | Correct a gateway report through an explicit revision and rerun reconciliation. | D-IMP-11, D-REC-18 |
| UC-07 | Prepare journal drafts from events and templates; have a different person approve and post them. | D-ACC-02 to D-ACC-07 |
| UC-08 | Enter opening balances at the cutover date. | D-ACC-11, D-ACC-12 |
| UC-09 | Close and, when justified, reopen a monthly accounting period. | D-ACC-13, D-ACC-14 |
| UC-10 | Produce accounting and operational reports and exports. | D-RPT-01 to D-RPT-04 |
| UC-11 | Offboard a workspace safely. | D-DAT-06, D-DAT-07 |

### 1.5 MVP boundaries

| In the MVP (approved) | Deferred (D-DEF) | Not addressed by any approved decision; needs a decision |
|---|---|---|
| CSV and XLSX uploads for the four source categories | Direct payment-gateway integrations (D-DEF-02) | Billing and subscriptions (OQ-04) |
| Guided mapping, templates, validation, quarantine, revisions | Public customer-facing API (D-DEF-03) | Platform operator and support access (OQ-05) |
| Two-stage reconciliation with 1:1, 1:N and N:1 matches | General many-to-many matching (D-DEF-05) | Which manual-journal purposes the initial release supports (OQ-56) |
| Exceptions, manual match and unmatch, risk-based approval | FX conversion reconciliation and FX accounting (D-DEF-06) | Records outside gateway flows (OQ-02) |
| The accounting foundation: double-entry accrual ledger, Chart of Accounts, templates, journals with independent approval, periods, opening balances, cutover. Posting is limited to approved, evidence-backed payment-related workflows and explicitly supported manual-journal purposes (D-PRD-08). | Full GST calculation, returns and filing (D-DEF-04) | Integration with external accounting software (none approved; treat as out of scope unless approved) |
| Core accounting and operational reports with coverage disclosures; CSV and XLSX exports | Cash-flow statements, budgeting, forecasting, analytics (D-DEF-07) | — |
| Five roles, managed OIDC with server-side sessions on one origin (D-SEC-11), MFA for privileged users, tenant isolation, audit trail | Marketing landing page until the core application works end-to-end (D-DEF-01) | — |
| Background jobs, in-app and email notifications, backups, monitoring, three environments | — | — |

AI/LLM features are excluded by the engineering rule D-PRD-07. They are not one of the seed's deferred items.

**Staged ledger scope (D-PRD-08, owner decision of 16 October 2026).**
- The long-term direction is a complete business ledger. That direction does not mean the initial release supports every category of business transaction.
- The initial release includes the approved accounting foundation and only explicitly supported posting purposes (FR-ACC-034).
- It has no dedicated payroll, procurement, accounts-payable, accounts-receivable or expense-management modules, and no new source-ingestion modules beyond the four approved source categories (D-IMP-01). Adding any of them needs a separate approved decision (D-PRD-06).
- The decision does not settle how cash-on-delivery orders, direct transfers or bank movements unrelated to gateways are imported, classified or reconciled; OQ-02 stays open.
- Accounting reports disclose what they cover (FR-RPT-015).

---

## 2. Terminology, domain concepts, roles, permissions and workspace lifecycle

### 2.1 Canonical terms

These terms are binding for APIs, data models, UI copy and tests (checklist §2, L27). Use one name per concept.

| Term | Definition | Status |
|---|---|---|
| **Workspace** | The tenant, and exactly one accounting entity. It holds its members, data and settings, and owns one Chart of Accounts, one ledger and one financial year, with that entity's accounting periods, opening balances and cutover. Code uses "workspace", not "tenant", "merchant" or "account". | Mandatory (D-SEC-07, D-SEC-10, D-PRD-09) |
| **Active workspace** | The single workspace a user is working in at a time. The user chooses it explicitly; every relevant request carries it, and the server validates it against the user's membership and permissions. | Mandatory (D-PRD-09) |
| **Application session** | The authenticated session that Spring Boot holds server-side in PostgreSQL and identifies with an `HttpOnly` cookie. It is the only session mechanism in the MVP; browser-held tokens and Next.js sessions are not used (D-SEC-11). | Mandatory (D-SEC-11) |
| **Business** | The organization that owns a workspace. In gateway terminology this is the "merchant". | Mandatory |
| **User** | A person authenticated by the managed identity provider. | Mandatory (D-SEC-06) |
| **Member** | A user's membership in a workspace, with one or more roles. | Mandatory |
| **Role** | One of the five predefined roles (§2.3). Short names used in this document: **Admin** = Workspace Owner/Admin; **Analyst** = Reconciliation Analyst; **Preparer** = Accountant/Journal Preparer; **Controller** = Finance Controller/Approver; **Auditor** = Auditor/Viewer. | Mandatory (D-SEC-01) |
| **Exception owner (assignee)** | The member assigned to an exception (the seed's "owner"). UI copy calls this person the *assignee*, to avoid confusion with the Workspace Owner/Admin role and with the product owner. | Mandatory (D-REC-15) |
| **Source account** | A workspace-configured gateway account or bank account that an uploaded report belongs to. Identity keys and identifier evidence are scoped to it (FR-IMP-034). | Recommended (AF-105) |
| **Upload holding area** | Temporary private storage where an uploaded file waits until its file checks pass. Not to be confused with *quarantined rows*, which are retained evidence. | Recommended |
| **Source category** | One of: Merchant orders, Gateway transactions, Settlement reports, Bank statements. | Mandatory (D-IMP-01) |
| **Source report** | An uploaded CSV or XLSX file of one source category. Every upload is a distinct, immutable file version. | Mandatory (D-IMP-13) |
| **Import** | The processing of one source report into source records, including validation, quarantine and commit. | Mandatory |
| **Report revision** | An upload explicitly designated as replacing an earlier import of the same category. | Mandatory (D-IMP-11) |
| **Mapping template** | A saved, versioned mapping from a recurring report format to canonical fields, plus its parsing settings. | Mandatory (D-IMP-03) |
| **Source record** | A canonical record created from one valid source row. It keeps its original values and its provenance (file, row, template version). Types: order, payment attempt, settlement line, settlement payout, bank transaction. | Mandatory |
| **Observation** | One occurrence of a source record's identity key in a source report. Later observations of the same record are kept, never overwritten. | Recommended (OQ-09) |
| **Quarantined row** | A row that failed validation. It is excluded from records, kept with its reasons, and exportable. | Mandatory (D-IMP-05) |
| **Payment attempt** | A gateway transaction record of one attempt to pay. Its status is mapped to *successful*, *failed*, *cancelled* or *other/unmapped*. | Mandatory (D-REC-02); status semantics Unresolved (OQ-08) |
| **Financial event** | A payment, refund, chargeback, chargeback reversal, reversal, fee, tax amount, adjustment, settlement payout or bank movement, each recorded separately (§7). | Mandatory (D-FIN-02, D-FIN-04) |
| **Settlement line** | One line of a gateway settlement report: a payment, refund, chargeback, fee, tax or adjustment component. | Mandatory (D-FIN-03) |
| **Settlement payout** | The amount a gateway paid out for a settlement batch, identified by a payout or settlement reference. | Mandatory (D-REC-10) |
| **Link** | A reconciliation relationship type. L1 order ↔ payment attempt; L2 payment ↔ settlement line; L3 settlement payout ↔ bank transaction. | Recommended (OQ-06) |
| **Stage** | Stage 1 (payment-to-settlement) covers L1 and L2. Stage 2 (settlement-to-bank) covers L3. | Mandatory (D-REC-01); link mapping Recommended (OQ-06) |
| **Match** | A confirmed relationship between records on one link. Shape 1:1, 1:N or N:1. It records the evidence, the rule version and the actor (system or user). | Mandatory (D-REC-04, D-REC-11, D-REC-18) |
| **Match group** | A grouped (1:N or N:1) match with its own audit history and links to every member record. | Mandatory (D-REC-12) |
| **Candidate** | A system-suggested possible match awaiting human review. Never confirmed automatically. | Mandatory (D-REC-06) |
| **Discrepancy** | A detected disagreement between sources or within one source: amount, currency, arithmetic, missing counterpart, ambiguity or conflict. | Mandatory (D-REC-05, D-REC-17) |
| **Exception** | The workflow record used to investigate and resolve one or more discrepancies or unmatched items. | Mandatory (D-REC-15) |
| **Reconciliation run** | A versioned execution of one stage over a defined scope. It holds its inputs, rule versions and results. | Mandatory (D-REC-18) |
| **Rule set version** | The versioned matching parameters and mapping-template versions a run used. | Mandatory (D-REC-18) |
| **Adjustment** | Context-dependent: a *source adjustment* (a gateway-reported component) or an *adjusting journal entry* (an accounting correction). Always qualify the word. | Mandatory (checklist §2, L27) |
| **Journal entry** | A balanced double-entry record with a header and two or more lines. States are in §8.5. | Mandatory (D-ACC-04) |
| **Accounting template** | A versioned rule that turns an eligible event into journal draft lines. | Mandatory (D-ACC-09) |
| **Manual journal** | A journal draft written by a Preparer rather than generated from an event. It goes through the same validation, review, independent approval, posting, period, immutability and audit controls as every other journal. | Mandatory (D-PRD-08) |
| **Journal purpose** | What a journal records: an event-generated purpose tied to an accounting template, a manual-journal purpose, the opening entry, or a correction. Every draft states its purpose. | Mandatory (D-PRD-08) |
| **Supported posting purpose** | A journal purpose that may be posted: an event purpose whose template is active under an approved policy, or a manual-journal purpose on the approved list (OQ-56). Nothing else is postable. | Mandatory (D-PRD-08); the lists are Unresolved (OQ-23, OQ-24, OQ-56) |
| **Coverage disclosure** | The part of an accounting report or export that states which period, sources and activity it covers, and which it does not. | Mandatory (D-PRD-08) |
| **Accounting period** | A calendar month within the financial year, either Open or Closed. | Mandatory (D-ACC-13) |
| **Cutover date** | The date the workspace's ledger starts. Opening balances represent the position at this date. | Mandatory (D-ACC-12) |
| **Functional currency** | The single currency in which the workspace's ledger is kept. | Unresolved (OQ-19) |
| **Audit event** | An append-only record of an important financial or administrative action. | Mandatory (D-DAT-01) |
| **Job** | A tracked background task. Statuses are `Queued`, `Processing`, `Partially completed`, `Completed` and `Failed`. | Mandatory (D-OPS-01) |
| **Legal hold** | A flag that suspends deletion of covered data. | Mandatory (D-DAT-07) |

The word "transaction" alone is ambiguous in this domain. Use the specific record type: payment attempt, settlement line or bank transaction.

### 2.2 Domain overview (conceptual, not a schema)

```
Workspace (one accounting entity: one Chart of Accounts, ledger, financial year — D-PRD-09)
├── Members (user × roles)                          D-SEC-01/02
├── Source reports (immutable file versions)        D-IMP-13
│   └── Imports (job, template version, outcome)
│       ├── Source records + observations           D-IMP-06/12, OQ-09
│       └── Quarantined rows                        D-IMP-05
├── Financial events (payment attempt, refund, chargeback, reversal,
│   fee, tax, source adjustment, settlement payout, bank transaction)   D-FIN-02/04
├── Reconciliation runs (stage, scope, inputs, rule set version)       D-REC-18
│   ├── Matches / match groups (L1, L2, L3)          D-REC-04/11/12
│   ├── Candidates                                   D-REC-06
│   └── Exceptions (discrepancies, unmatched items)  D-REC-15
├── Ledger
│   ├── Chart of Accounts                            D-ACC-08
│   ├── Accounting templates (versions)              D-ACC-09/10
│   ├── Journal entries + lines (draft…posted)       D-ACC-04/07
│   └── Accounting periods, financial year, cutover  D-ACC-12/13/15
├── Jobs, notifications                              D-OPS-01/02
└── Audit events, retention policies, legal holds   D-DAT-01/07
```

The traceability chain is **file → row → source record → match or exception → financial event → journal line**. It must be navigable in both directions (FR-FIN-007).

### 2.3 Roles and permissions

**Legend:**
- **A**: permission stated in the approved role descriptions (Seed §8, L181–185).
- **I**: INFERENCE from the role description; needs confirmation.
- **R**: recommendation.
- **—**: not permitted.

The backend enforces every cell (D-SEC-03). A user holding several roles has the union of those permissions, minus the separation-of-duties restrictions in §2.4.

| Action | Owner/Admin | Recon Analyst | Journal Preparer | Controller/Approver | Auditor/Viewer |
|---|---|---|---|---|---|
| Manage workspace profile and non-financial settings | A | — | — | — | — |
| Invite or remove members; assign roles | A | — | — | — | — |
| Configure session and MFA policy (never below the D-SEC-08 minimum) | I | — | — | — | — |
| Start workspace offboarding | I (OQ-42) | — | — | — | — |
| Upload reports, map columns, commit imports | — | A | — | — | — |
| Create and edit mapping templates | — | I | — | — | — |
| Designate a report revision | — | I | — | — | — |
| Download original uploaded files | — | R (OQ-37) | — | R (OQ-37) | R (OQ-37) |
| Run reconciliation; compare runs | — | A | — | I | — |
| Investigate and comment on exceptions | — | A | I | I | — |
| Manual match and unmatch | — | A | — | — | — |
| Resolve routine exceptions | — | I | — | I | — |
| Approve high-risk resolutions and matches | — | — | — | A | — |
| Change candidate date windows and expected settlement periods | — | R (OQ-22) | — | R | — |
| Change auto-match or split-payment parameters | — | R: propose (OQ-22) | — | R: approve | — |
| Manage Chart of Accounts (permitted tasks) | — | — | A | I | — |
| Draft accounting template versions | — | — | R (OQ-31) | — | — |
| Activate accounting template versions | — | — | — | R (OQ-31) | — |
| Prepare journal drafts and opening balances | — | — | A | — | — |
| Submit a draft for review | — | — | A | — | — |
| Approve and post journals prepared by others | — | — | — | A | — |
| Return or reject a submitted journal | — | — | — | I | — |
| Close and reopen periods | — | — | — | A | — |
| Set financial year and cutover date | — | — | — | R (OQ-29) | — |
| View accounting reports | — | — | A | I | A (permitted) |
| View reconciliation results and evidence | — | I | I | I | A |
| Export data the user can view | — | I | I | I | I |
| Read the full audit history | R (OQ-37) | — | — | R (OQ-37) | A |
| Read the history of records the user can access | — | R | R | R | A |

**Admin access to financial data** is unresolved (OQ-36). The recommendation is that the Admin role grants no financial-data access by itself, and an Admin who needs it assigns themselves another role. That assignment is audited and notified (FR-WSP-005).

### 2.4 Separation of duties

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-WSP-010 | The backend rejects journal approval when the approver is the draft's preparer. This holds even if the approver also holds the Controller role, and whether the request comes through the UI, the API or a retry. | Mandatory | D-ACC-05, D-SEC-02 |
| FR-WSP-011 | The approver must also differ from the submitter of a system-generated draft and from any user who edited the version being approved. | Unresolved; recommended default | OQ-17 |
| FR-WSP-012 | The same separation applies to high-risk exception resolutions and matches, opening balances, accounting-template activation and period-close exceptions. | Unresolved; recommended default | OQ-17 |
| FR-WSP-013 | A workspace with no second eligible approver cannot post journals. The UI explains why and how to add an approver; it never offers a bypass. | Mandatory (derived from D-ACC-05); acceptance OQ-18 | D-ACC-05, OQ-18 |
| FR-WSP-014 | Role changes take effect on the user's next request. Permissions are never served from stale caches. | Mandatory (derived from D-SEC-03) | D-SEC-03 |

### 2.5 Workspace lifecycle and membership

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-WSP-001 | A user whose email the identity provider has verified can create a workspace and becomes its Workspace Owner/Admin. Creating a workspace creates a new accounting entity (FR-WSP-015), and the creation is recorded as an audit event (NFR-DAT-004). | Mandatory | D-SEC-07, D-PRD-09 |
| FR-WSP-002 | Creating a workspace never grants access to, reveals the existence of, or returns data from any other workspace. | Mandatory | D-SEC-05, D-SEC-07 |
| FR-WSP-003 | An Admin can invite teammates by email and choose their initial roles. | Mandatory | D-SEC-07 |
| FR-WSP-004 | Invitations are single-use and expire. Accepting one requires an authenticated user whose verified email matches the invitation. | Recommended | D-SEC-05 |
| FR-WSP-005 | Every role or membership change is recorded as an audit event with actor, target user, before and after roles, and timestamp. Current Admins and the affected user are notified. | Mandatory (audit); Recommended (notification) | D-SEC-05, D-DAT-01 |
| FR-WSP-006 | A workspace always has at least one Admin. Removing or demoting the last Admin is rejected. | Recommended | OQ-36 |
| FR-WSP-007 | Workspace settings include name, financial-year start (default 1 April), cutover date, functional currency and time zone (default Asia/Kolkata, R). Changes to the financial year, cutover date or functional currency are sensitive financial settings and follow D-SEC-08. | Mandatory (financial year, cutover); Unresolved (functional currency OQ-19); Recommended (time zone) | D-ACC-12, D-ACC-15, D-SEC-08 |
| FR-WSP-008 | A user may belong to several workspaces and switches between them explicitly; there is no implicit or automatic switch. Every request is evaluated against one active workspace. Membership and roles in one workspace grant no access to any other. | Mandatory | D-PRD-09, D-SEC-05 |
| FR-WSP-015 | **Accounting-entity ownership.** Each workspace is exactly one accounting entity and owns exactly one Chart of Accounts, one ledger and one financial year, with that entity's accounting periods, opening balances and cutover date. Every workspace-owned financial record (source records, matches, exceptions, journals and lines, accounts, periods, reports and exports) belongs to exactly one workspace, carries its identifier, and can never refer to another workspace's records (NFR-SEC-007). | Mandatory | D-PRD-09, D-ACC-01, D-ACC-08, D-ACC-12, D-ACC-15, D-SEC-10 |
| FR-WSP-016 | **Server-side active-workspace validation.** On every relevant request, the backend checks that the user is a current member of the stated active workspace with the needed permission, and that every referenced record belongs to that workspace. A missing, tampered or mismatched workspace identifier is rejected without revealing whether that workspace or its records exist. The client's view of the active workspace is never trusted on its own. Workspace-scoped API routes carry the identifier in the URL path, for example `/api/v1/workspaces/{workspaceId}/...` (D-SEC-11). The identifier names the request's target and is never proof of authorization. A role or active-workspace value stored in the session is never relied on alone. | Mandatory | D-PRD-09, D-SEC-03, D-SEC-04, D-SEC-11 |
| FR-WSP-017 | **Switch isolation.** Switching workspaces changes the active context everywhere. Data loaded for the previous workspace is cleared from client caches and UI state, and is never shown in the new workspace's screens, search, reports, exports, downloads or notifications. Requests still in flight for the previous workspace keep being authorized against that workspace, and their results are not shown in the new one. Server-side caches, queries, jobs, files and notifications stay scoped to one workspace (NFR-SEC-007, NFR-SEC-008, NFR-SEC-016, FR-NTF-004). | Mandatory (no leakage, D-PRD-09); Recommended (client mechanism) | D-PRD-09, D-SEC-04 |
| FR-WSP-018 | **No cross-workspace financial views in the MVP.** No screen, report, export or API response combines financial data from more than one workspace. Listing the user's own workspaces for switching is the only cross-workspace display. Any later consolidation or cross-workspace feature needs a separate approved decision. | Mandatory (exclusion for the MVP) | D-PRD-09, D-PRD-06 |

**Workspace lifecycle states** (Recommended; OQ-42):
1. `Active`
2. `Offboarding requested`: the Admin's request, after MFA and fresh authentication.
3. `Access disabled`: members can no longer use the workspace. Only an authorized export is possible, within a defined window.
4. `Retention hold`: records with mandatory retention are kept; legal holds may extend this.
5. `Closed`: eligible data has been securely deleted.

Mandatory retention and legal holds override every transition (D-DAT-06, D-DAT-07).

---

## 3. End-to-end user journeys

Each journey names the requirements that govern it. The release-gate workflow (D-REL-01, item 1) is J2 → J3 → J4 → J5 → J7 → J8 → J10.

### J1 — Onboard a workspace (UC-01)
1. The user signs in with the managed identity provider (NFR-SEC-001).
2. They create a workspace, which is a new accounting entity, and become its Admin (FR-WSP-001, FR-WSP-015). A user who belongs to several workspaces switches between them explicitly (FR-WSP-008).
3. They set the workspace profile and time zone. A Controller confirms the financial year, cutover date and functional currency with MFA before the first posting (FR-WSP-007, FR-ACC-022, FR-ACC-028; Recommended, OQ-29).
4. They review the default Chart of Accounts (FR-ACC-002; content per OQ-27).
5. They invite teammates and assign roles (FR-WSP-003). Privileged users must enrol in MFA before using privileged actions (NFR-SEC-003).

### J2 — Import a report (UC-02)
1. The analyst uploads a CSV or XLSX file and selects its source category (FR-IMP-001).
2. File checks run: type, size, encryption, sensitive data, duplicate fingerprint (FR-IMP-002 to FR-IMP-005, FR-IMP-022).
3. The analyst picks a matching template or maps columns with a preview (FR-IMP-006 to FR-IMP-008).
4. Validation runs in staging as a background job (FR-IMP-009, FR-IMP-010, FR-IMP-021).
5. The analyst reviews the summary: valid rows, quarantined rows, repeat occurrences, conflicts, incomplete settlement groups (FR-IMP-014 to FR-IMP-017).
6. They confirm the commit. The import ends as `Imported` or `Partially imported` with a warning (FR-IMP-011 to FR-IMP-013).
7. They download the error report if needed (FR-IMP-012, FR-IMP-025).

### J3 — Run Stage 1 reconciliation (UC-03)
1. The analyst starts a Stage 1 run for a period (FR-REC-060, FR-REC-066).
2. The system links orders and payment attempts (L1) and successful payments and settlement lines (L2). It applies the auto-match conditions (FR-REC-003), creates discrepancies and candidates, and checks settlement arithmetic (FR-REC-021, FR-REC-022).
3. The analyst reviews matched, candidate, discrepancy and unmatched counts (FR-RPT-005).

### J4 — Run Stage 2 verification (UC-04)
1. The analyst starts a Stage 2 run.
2. The system links settlement payouts and bank transactions (L3) through payout references or UTRs (FR-REC-030 to FR-REC-032).
3. Differences are shown with both original amounts (FR-EXC-009).

### J5 — Investigate and resolve exceptions (UC-05)
1. The analyst opens the exception queue (FR-EXC-001, FR-EXC-008).
2. They investigate, comment, attach evidence and set the status (FR-EXC-002).
3. They resolve the exception (FR-EXC-004), match manually (FR-REC-050) or unmatch (FR-REC-052).
4. High-risk cases move to approval by a different authorized user (FR-EXC-006, FR-REC-051).

### J6 — Correct a source report (UC-06)
1. The analyst uploads a corrected file and designates it as a revision of a named earlier import (FR-IMP-019).
2. They review the diff and commit.
3. Affected matches, exceptions and journals are flagged (FR-IMP-020, FR-ACC-024).
4. They run a new reconciliation and compare it with the previous run (FR-REC-064).

### J7 — Prepare journals (UC-07)
1. Eligible events with active, approved templates produce journal drafts (FR-ACC-004, FR-ACC-007).
2. Drafts that depend on unresolved evidence are `Blocked` (FR-ACC-008).
3. The preparer reviews drafts, edits them if needed, and submits them for review (FR-ACC-010).
4. The preparer can also write manual journal drafts, stating each draft's purpose (FR-ACC-009). Only drafts whose purpose is supported can be submitted for posting (FR-ACC-034).

### J8 — Approve and post (UC-07)
1. A Controller who is not the preparer reviews each submitted draft alongside its source evidence (FR-ACC-025).
2. Their identity has met the MFA policy and any fresh-authentication requirement (NFR-SEC-003, NFR-SEC-004).
3. They approve and post, or return the draft with a reason (FR-ACC-010, FR-ACC-011).

### J9 — Enter opening balances (UC-08)
1. The preparer enters opening balances at the cutover date through a form or a template upload (FR-ACC-016).
2. A different authorized approver posts the dedicated opening entry.

### J10 — Verify the ledger and reports; close the period (UC-09, UC-10)
1. The Controller reviews the trial balance, P&L, balance sheet and general ledger. Each report shows its provisional or closed status and a coverage disclosure (FR-RPT-001 to FR-RPT-003, FR-RPT-015).
2. They run the close checklist (FR-ACC-019) and close the period (FR-ACC-020).
3. A justified reopen requires a reason, MFA and an audit event.

### J11 — Export and audit (UC-10)
1. Users export the reports they are permitted to view (FR-RPT-010).
2. Auditors trace any journal line back to its source rows and approvals (FR-FIN-007, NFR-DAT-001).

### J12 — Offboard (UC-11)
1. The Admin requests offboarding (NFR-DAT-009).
2. Access is disabled and an export window opens.
3. Retention and legal holds apply, and only eligible data is deleted.

---

## 4. Source reports, imports, column mapping, validation, deduplication, corrections and job tracking

### 4.1 Source categories

| Category | What it represents | Stage use |
|---|---|---|
| Merchant orders | The business's own record of orders. It is the evidence for revenue triggers where configured (OQ-24). | L1 |
| Gateway transactions | Payment attempts and their statuses, as reported by the gateway. | L1, L2 |
| Settlement reports | Gateway settlement lines (payments, refunds, chargebacks, fees, taxes, adjustments) and their payouts. | L2, L3 |
| Bank statements | Bank account transactions, including payout credits. | L3 |

Which gateways and banks are supported first is unresolved (OQ-07). No provider-specific format may be assumed until samples are provided.

### 4.2 Upload and file handling

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-IMP-001 | Users upload a CSV or XLSX file for exactly one source category. Any other file type is rejected with a reason that names the supported types. | Mandatory | D-IMP-01, D-IMP-02, D-IMP-08 |
| FR-IMP-002 | Before parsing, the system checks the file type from its content (not only the extension) and its size against the limit. It rejects password-protected or encrypted files, corrupted files, macro-enabled workbooks and legacy `.xls` files, each with a specific reason. | Mandatory (rejecting unsafe or unsupported files); INFERENCE (`.xls` and macro rejection) | D-IMP-02, D-IMP-08 |
| FR-IMP-003 | Default limits are 50 MB per file and 250,000 data rows per file. Limits are configurable per deployment, and stricter limits can be set per workspace. A file over a limit is rejected before any record is created. | Mandatory (values are unverified targets) | D-IMP-09 |
| FR-IMP-030 | XLSX files also have limits on uncompressed size, cell count, column count, cell length and parse time, so a compressed file cannot exhaust memory. The workbook's XML is parsed with document type declarations and entity expansion disabled, so external entities are never resolved. External links, embedded objects and macros are ignored, never executed. | Recommended | D-IMP-09, AF-68, AF-131 |
| FR-IMP-004 | Uploads first land in a temporary upload holding area. They move to private, encrypted evidence storage only after passing file checks, the sensitive-data screen and malware scanning where supported. Files that fail are deleted from the holding area after a short period (value OQ-41). | Recommended | D-DAT-03, D-DAT-04, OQ-39, OQ-40 |
| FR-IMP-034 | Every upload belongs to a workspace-configured source account: a gateway account for orders, transactions and settlements, or a bank account for statements. The account is chosen or confirmed at upload. Identity keys and identifier evidence are scoped to it, so a reference from one gateway or bank account is never treated as exact evidence for another. Bank accounts are told apart by this configuration, or by a non-reversible token, and never by storing full account numbers. | Mandatory (derived from D-REC-04 and D-IMP-06: an identifier is exact evidence only within the namespace that issued it); Recommended (mechanism) | D-REC-04, D-IMP-06, AF-105 |
| FR-IMP-031 | When a bank statement reports opening and closing balances, the import checks continuity: the opening balance equals the previous statement's closing balance for the same account, and the transactions reconcile the opening balance to the closing balance. Date gaps are flagged. A failure raises an exception; nothing is adjusted. | Recommended (supports OQ-51) | OQ-51, AF-102 |
| FR-IMP-005 | Each upload records a content fingerprint (a cryptographic hash) plus metadata. A byte-identical file already imported into the same workspace is blocked, with a link to the earlier import, and creates no records. | Mandatory (fingerprint); Unresolved (blocking behaviour, OQ-10) | D-IMP-06 |
| FR-IMP-022 | Before storage, the system screens uploads for likely full card numbers. A value counts as likely only when it has 13–19 digits, passes the standard card-number checksum, matches a known card-issuer prefix range, and appears in a column whose context suggests card data. The checksum alone is not enough: roughly one random digit string in ten passes it. Recommended default: hold the file and ask the user to confirm or remove the column; reject without review only in high-confidence cases. Bank account numbers are shown masked to the last four digits in imported records; accounts are still told apart through FR-IMP-034. | Mandatory (masking where appropriate, D-DAT-05); Unresolved (specific behaviour, OQ-39) | D-DAT-05, OQ-39, AF-129 |
| FR-IMP-023 | Each import records the uploader, upload time, original file name, size, fingerprint, category, template version, row counts by outcome, job ID and workspace. | Mandatory | D-IMP-13 |

### 4.3 Minimum conceptual fields

These are the minimum canonical fields that the approved matching rules need (D-REC-09, D-REC-10, D-FIN-01 to D-FIN-05). They are an **INFERENCE**. Exact schemas, identity keys and provider status values are **Unresolved** (OQ-08) and must come from real sample files (OQ-07).

| Record type | Required identifiers | Required financial fields | Other fields |
|---|---|---|---|
| Order | Merchant order ID | Order amount, currency, order date | Gateway order reference (if any), payment method (OQ-02), fulfilment status and date (OQ-24), tax amounts if reported |
| Payment attempt | Gateway payment or transaction ID; at least one of merchant order ID or gateway order reference | Amount (gross), currency, status (raw value plus mapped value), attempt timestamp | Payment method (masked), fee and tax if reported |
| Settlement line | Settlement or payout reference; line type; gateway payment ID for payment-linked lines; refund, chargeback or adjustment ID where reported | Gross, fee, tax on fee, other reported components, net, currency | Settlement date |
| Settlement payout | Payout or settlement reference | Payout amount, currency, payout date | Bank reference or UTR where reported |
| Bank transaction | Bank-side reference where available (a dedicated column, or extracted per OQ-20) | Amount, direction (credit or debit) or signed amount, currency, transaction date | Value date, narration (raw text), masked account identifier, running balance |

### 4.4 Column mapping and templates

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-IMP-006 | The mapping screen previews the headers and a bounded number of sample rows. Users map source columns to canonical fields and can save the mapping as a reusable template. A template is applied automatically only when the file's header signature matches it exactly. Otherwise the user must re-map. | Mandatory (mapping, preview, templates); Recommended (header-signature rule) | D-IMP-03 |
| FR-IMP-007 | Mappings are suggested only when confidence is high. Financially important fields need explicit user confirmation even when suggested: amount, sign or direction, currency, date and its format, identifiers and status. | Mandatory | D-IMP-03 |
| FR-IMP-008 | Each template sets its parsing explicitly:<br>• date format (for example DD/MM/YYYY);<br>• decimal separator and digit grouping (including Indian grouping such as 1,00,000);<br>• sign convention (signed amount or separate debit and credit columns);<br>• amount unit for each amount column (major units, or minor units such as paise), confirmed by the user;<br>• currency source (a column, or a fixed value confirmed per file);<br>• text encoding;<br>• worksheet (XLSX) and header row. | Mandatory (derived from D-IMP-03 and D-IMP-04) | D-IMP-03, D-IMP-04, AF-114 |
| FR-IMP-024 | Mapping templates are versioned. Every import records the exact template version it used. Editing a template creates a new version and never changes the interpretation of past imports. | Mandatory (derived from D-IMP-13 and D-REC-18) | D-IMP-13, D-REC-18 |
| FR-IMP-027 | A template may define a provider status mapping (raw status → successful, failed, cancelled, pending or other) and, if approved, a status order (OQ-09). An unmapped status makes the record ineligible for settlement reconciliation and raises an "Unmapped status" exception. | Mandatory (status mapping, derived from D-REC-02); Unresolved (status order) | D-REC-02, OQ-08, OQ-09 |

### 4.5 Validation and staging

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-IMP-009 | Each row is validated for required fields, dates that parse under the configured format, exact decimal amounts within the currency's precision, a valid ISO 4217 currency code, a consistent sign or direction, and the identifiers its category requires. Each failure records the row number, field, original value and reason. | Mandatory | D-IMP-04 |
| FR-IMP-010 | Parsed rows are validated in staging. Nothing becomes a source record until commit. The user sees a validation summary (valid, quarantined, repeat occurrences, conflicting observations, incomplete settlement groups) and confirms the commit. | Mandatory (staging); Recommended (explicit confirmation step) | D-IMP-04 |
| FR-IMP-011 | The commit is idempotent. Retrying an interrupted commit leaves exactly one source record per identity key and never duplicates financial records. | Mandatory | D-IMP-07 |
| FR-IMP-028 | A value with more decimal places than its currency allows is never silently rounded. Recommended default: quarantine the row. Alternative: preserve the value exactly as reported and raise an exception. | Mandatory (no silent rounding, derived from D-FIN-07 and D-REC-17); Unresolved (quarantine or flag, OQ-53) | D-FIN-07, OQ-53 |
| FR-IMP-032 | Identifier columns are read as exact text, with no numeric conversion: leading zeros, length and all digits are kept. An identifier that arrives as a spreadsheet number that has lost precision, or in scientific notation, quarantines its row. | Mandatory (derived from D-REC-04: exact identifiers must stay exact) | D-REC-04, AF-115 |
| FR-IMP-033 | XLSX cell handling:<br>• numeric cells are converted to the shortest decimal that round-trips the stored number, never to the full binary expansion;<br>• date cells are interpreted under the workbook's declared date system (1900 or 1904);<br>• a financial or identifier field whose cell holds a formula quarantines its row by default, because the cached value may be stale. | Mandatory (date system, derived from D-IMP-04); Recommended (numeric conversion and formula rule) | D-IMP-04, AF-114 |

### 4.6 Partial import and quarantine

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-IMP-012 | Invalid rows are quarantined with their original values and reasons. They never become source records or enter reconciliation. Users can view them and export them as CSV or XLSX. | Mandatory | D-IMP-05 |
| FR-IMP-013 | An import ends in one of these outcomes: `Imported`, `Partially imported` (some rows quarantined), `Rejected` (file-level failure, nothing committed) or `Superseded` (replaced by a revision). `Partially imported` shows a persistent warning that reconciliation may be incomplete, on the import and on every run and report that uses it. | Mandatory (`Partially imported` and its warning); Recommended (the other outcome names) | D-IMP-05, AF-07 |
| FR-IMP-014 | If any row of a settlement payout group is quarantined or missing, or the group's lines do not reconcile with its payout total (FR-REC-022), the group is marked incomplete. Incomplete groups are not eligible for automatic matching or journal drafting until resolved. | Mandatory (derived from D-IMP-05, D-REC-07 and D-ACC-06) | AF-22 |
| FR-IMP-025 | Error reports and exports neutralize spreadsheet-formula injection in text cells, keep numbers as numeric cells in XLSX, and are restricted to the workspace and permitted roles. | Recommended (formula neutralization); Mandatory (scoping, D-SEC-04) | D-SEC-04, AF-66 |
| FR-IMP-026 | Previewing, validating or exporting import results never modifies source records. | Mandatory | D-RPT-04 |

### 4.7 Duplicates and conflicting observations

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-IMP-015 | Each source category and provider has an identity key built from reliable source identifiers and scoped to the source account (FR-IMP-034). Examples: gateway payment ID; refund ID; payout reference plus line type plus line identifier. The key is defined per category and provider profile, not freely per template. Changing a key definition needs approval by a Controller other than the person who proposed the change, and then a duplicate check across all template versions. A row whose identity key already exists with identical canonical values creates no new record; it is recorded as a repeat occurrence. | Mandatory (no duplicates); Recommended (key governance, repeat-occurrence recording); Unresolved (approval, OQ-22) | D-IMP-06, D-IMP-07, AF-104 |
| FR-IMP-016 | A row whose identity key already exists with *different* values never overwrites the existing record. The recommended default stores it as a new observation. A status change that follows a template-defined status order updates the record's current status and keeps its history. Any other difference raises a "Conflicting source data" exception, and the record cannot be auto-matched until that is resolved. | Mandatory (no overwrite, D-IMP-12); Unresolved (handling, OQ-09) | D-IMP-12, OQ-09, AF-21 |
| FR-IMP-017 | Two rows in the same file with the same identity key but different values are both quarantined with the reason "Conflicting duplicate within file". | Recommended | D-IMP-06 |
| FR-IMP-018 | Rows that share only amount or date are never treated as duplicates automatically. They may be shown as "Possible duplicate" for review. | Mandatory (no automatic treatment); Recommended (surfacing) | D-IMP-06 |

### 4.8 Report revisions

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-IMP-019 | An authorized user can designate a new upload as a revision of a specific earlier import in the same category. Recommended: a revision that withdraws records or changes financial values is high-risk and takes effect only after approval by a different user (OQ-14). Before commit, the system shows the differences by identity key: added, removed and changed records. On commit:<br>• the earlier import becomes `Superseded`;<br>• records missing from the revision become `Withdrawn by revision` (they are not deleted);<br>• changed records get new versions;<br>• all earlier files and history are kept. | Mandatory (designation, preservation, change display); Recommended (diff mechanics) | D-IMP-11 |
| FR-IMP-020 | Matches, exceptions, journal drafts and posted journals that refer to changed or withdrawn records are flagged "Needs re-review". Posted journals are never changed; any correction follows FR-ACC-024. | Mandatory | D-IMP-11, D-REC-18, D-ACC-07 |
| FR-IMP-029 | Uploading an identical or overlapping report without designating it as a revision never modifies existing records. FR-IMP-005 and FR-IMP-015 to FR-IMP-016 apply. | Mandatory (derived from D-IMP-11 and D-IMP-12) | D-IMP-11 |

### 4.9 Import jobs

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-IMP-021 | File checks, parsing, validation, duplicate detection and commit run as background jobs (NFR-REL-001). Users can leave the page. The import detail shows job status and actionable error messages. A failed job can be retried safely without duplicating records. | Mandatory | D-IMP-10, D-OPS-01 |

Job status (`Queued` … `Failed`) describes processing. Import outcome (FR-IMP-013) describes the result. The two are deliberately separate (AF-07).

---

## 5. Payment-to-settlement and settlement-to-bank reconciliation

### 5.1 Links and stages

The seed names two stages (D-REC-01), but its identifier hierarchy files the payment-to-settlement-line relationship under "Stage 2" (Seed §3, L81–84; AF-06). This specification therefore defines three links. The mapping is **Recommended** pending OQ-06.

| Link | Relationship | Stage | Primary identifier evidence (approved hierarchy) |
|---|---|---|---|
| L1 | Merchant order ↔ payment attempt(s) | Stage 1, payment-to-settlement | Merchant order ID and its gateway order reference; gateway payment IDs with a reliable link to the order (D-REC-09) |
| L2 | Successful payment (and its refunds, chargebacks, reversals and source adjustments) ↔ settlement line(s) | Stage 1, payment-to-settlement | Gateway payment ID on the settlement line; refund, chargeback or adjustment IDs where reported (D-REC-10, D-FIN-04) |
| L3 | Settlement payout ↔ bank transaction(s) | Stage 2, settlement-to-bank | Payout or settlement reference linked to a bank reference such as a UTR (D-REC-10) |

Settlement lines belong to a payout through the settlement report's own payout reference. This internal structure is used in both stages and is checked arithmetically (FR-REC-021, FR-REC-022).

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-REC-001 | Reconciliation is organized as links L1, L2 and L3, grouped into Stage 1 (L1, L2) and Stage 2 (L3). Each stage can be run and reported separately. Results stay linked so one order can be traced to its bank credit. | Recommended (link model, OQ-06); Mandatory (two linked stages) | D-REC-01, OQ-06 |
| FR-REC-002 | Only payment attempts mapped to *successful* are eligible for L2. Failed and cancelled attempts stay linked to their orders under L1 for traceability and do not count as payments. Pending attempts are ineligible for L2 until a later observation changes their status. Attempts with an unmapped status are ineligible and raise an exception (FR-IMP-027). If a settlement line or other source evidence shows money moving for a failed, cancelled or pending attempt, a "Settlement for non-successful attempt" exception is raised; the evidence is never ignored. | Mandatory (successful vs failed/cancelled, D-REC-02); Mandatory (derived: surfacing contrary evidence, from D-REC-17 and D-FIN-04); Recommended (pending and unmapped handling) | D-REC-02, D-REC-17, AF-112 |

### 5.2 Automatic matching conditions

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-REC-003 | An automatic match is created only when **all** of these hold:<br>(a) exact identifier evidence exists under the link's hierarchy, within the same source-account scope (FR-IMP-034);<br>(b) the currencies are identical;<br>(c) for gross comparisons the amounts agree exactly; for net comparisons any difference is fully explained by components the source reports (FR-REC-007);<br>(d) there is no contradictory evidence: no other record claims the same identifier, no conflicting observation, no incomplete settlement group, no ineligible status, no withdrawn record;<br>(e) none of the records is already in a confirmed match on the same link. | Mandatory | D-REC-04, D-REC-05, D-REC-06, D-REC-07 |
| FR-REC-004 | When identifiers agree but amount or currency disagrees, the system creates a discrepancy exception and no match. Both original values, the difference and each value's source are shown. | Mandatory | D-REC-05, D-REC-17 |
| FR-REC-005 | When an identifier is missing or ambiguous, the system may propose candidates using amount, currency and a configurable date window. Candidates are never confirmed automatically. Each shows its evidence and which identifier evidence is absent. | Mandatory | D-REC-06, D-REC-08 |
| FR-REC-006 | When identifier evidence points to more than one possible counterpart, no automatic match is made and an "Ambiguous reference" exception is created. | Mandatory (derived from D-REC-06 and D-REC-04) | D-REC-04, D-REC-06 |
| FR-REC-007 | There is no blanket amount tolerance. Gross comparisons must agree exactly. In a net comparison, any non-zero difference not fully explained by explicit components in the source data (fees, taxes, refunds, reported adjustments) or by a documented rounding rule becomes a discrepancy. A rounding rule names its computation, applies only where the source documents that computation, and records the rounding amount as its own component. Recommended: adding or changing a rounding rule needs Controller approval (OQ-22). | Mandatory | D-REC-07, D-REC-12, AF-139 |
| FR-REC-008 | Candidate date windows are configurable per link. They affect only candidate search. Changing them never changes confirmed matches, exceptions or eligibility for automatic matching. | Mandatory | D-REC-08 |

**Relationship-specific amount semantics.** The rule that gross amounts must agree exactly is **Mandatory** (D-REC-12, Seed L92). Which fields each link compares is a **Recommended** default that needs confirmation against real report formats (OQ-08):
- **L1:** order amount equals the gross amount of the single successful payment. Several payments only qualify with split-payment evidence (FR-REC-011).
- **L2:** the successful payment's gross amount equals the settlement line's gross amount. The line's net amount is checked by FR-REC-021.
- **L3:** the payout amount equals the bank credit amount, as a credit, in the same currency.

### 5.3 L1 — Orders and payment attempts

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-REC-010 | L1 evidence is either a merchant order ID on the payment attempt, or a gateway order reference that the source data links reliably to the merchant order. Other references (for example customer email or phone) are supporting evidence only. | Mandatory | D-REC-09 |
| FR-REC-011 | Two or more successful payments for one order are never merged and never aggregated automatically, even when they sum to the order amount. Without explicit split-payment evidence (OQ-11), a "Multiple successful payments" exception is raised. | Mandatory; Unresolved (what counts as evidence) | D-REC-03, OQ-11 |
| FR-REC-012 | A successful payment with no order raises a "Payment without order" exception. An order with no successful gateway payment is either an open unmatched item or classified "Outside gateway reconciliation" (OQ-02). | Mandatory (traceability); Unresolved (classification, OQ-02) | D-REC-02, OQ-02 |

### 5.4 L2 — Payments and settlement lines

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-REC-020 | L2 evidence is the gateway payment ID on the settlement line. Refund, chargeback, reversal and adjustment lines link to the original payment through the payment ID together with the event's own ID where reported. | Mandatory | D-REC-10, D-FIN-04 |
| FR-REC-021 | Where a settlement line reports gross, component (fee, tax on fee, other) and net amounts, the reported components must reconcile exactly with gross and net. If they do not, the line raises a "Settlement line inconsistency" exception and its values are kept as reported. | Mandatory (derived from D-REC-07 and D-FIN-03) | AF-20 |
| FR-REC-022 | The sum of a payout's line net amounts, plus any payout-level components the report itself shows, must equal the reported payout amount. If not, the payout raises a "Payout breakdown inconsistency" exception. The payout's group becomes incomplete (FR-IMP-014). Until the exception is resolved, the payout can be matched to a bank credit (L3) only manually, with high-risk approval, and journal drafting from its breakdown is blocked (FR-ACC-008). | Mandatory (detection; no automatic L3 match, from FR-IMP-014); Recommended (manual path) | D-REC-07, D-FIN-03, AF-20, AF-140 |
| FR-REC-023 | Fees and taxes are taken only from the settlement report. They are never calculated from assumed rates. | Mandatory | D-FIN-03 |
| FR-REC-024 | A successful payment with no settlement line is an open "Awaiting settlement" item, showing its age. It becomes a "Missing settlement" exception after the gateway template's expected settlement period. That period has no default value until the owner sets one. Neither state ever counts as reconciled. | Unresolved (period, OQ-13); Mandatory (never treated as reconciled) | D-REC-17, OQ-13, AF-24 |
| FR-REC-025 | A settlement line with no corresponding payment record raises a "Settlement without payment" exception. | Mandatory (derived from D-FIN-04) | D-FIN-04 |
| FR-REC-026 | A payment settled across more than one payout raises a "Partial settlement" exception for manual handling, unless an approved rule defines the relationship. | Unresolved (OQ-12); recommended default | OQ-12 |

### 5.5 L3 — Settlement payouts and bank transactions

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-REC-030 | L3 evidence is the payout reference or UTR from the settlement report matching a bank reference. The bank reference comes either from a dedicated column or, if approved, from a template-defined extraction rule that yields exactly one reference from the narration (OQ-20). The extracted value is stored separately from the raw narration. | Mandatory (identifier evidence); Unresolved (narration extraction, OQ-20) | D-REC-10, OQ-20, AF-27 |
| FR-REC-031 | The payout amount must equal the bank credit amount, as a credit, in the same currency. Any difference is a discrepancy that shows both amounts and their sources and stays open until explained with evidence. | Mandatory | D-REC-05, D-REC-17 |
| FR-REC-032 | Several payouts can match one bank credit (or one payout several credits) only through a supported grouped relationship (FR-REC-040). Otherwise the group is only proposed as a candidate. | Mandatory | D-REC-12 |
| FR-REC-033 | Bank transactions unrelated to gateway payouts are handled as decided in OQ-02. They never appear as reconciled. | Unresolved | OQ-02, AF-25 |

---

## 6. Matching safeguards, grouped relationships, manual decisions, discrepancies and reruns

### 6.1 Grouped relationships

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-REC-040 | Only these grouped relationships can be confirmed:<br>**GR1:** settlement lines → their payout, through the payout reference;<br>**GR2:** several successful payments → one order, with explicit split-payment evidence (OQ-11);<br>**GR3:** several payouts → one bank credit, with explicit combined-reference evidence;<br>**GR4:** one payout → several bank credits, with explicit reference evidence.<br>Any other grouping can only be proposed. | Recommended (allowlist); Mandatory (supported relationship required) | D-REC-12 |
| FR-REC-041 | Confirming a group requires compatible currencies and amounts that reconcile under explicit rules. A gross group must agree exactly. A net group may differ only by documented components. The group keeps links to every member and its own audit history. | Mandatory | D-REC-12 |
| FR-REC-042 | Groups with several records on both sides (many-to-many) are not supported. | Deferred | D-DEF-05 |
| FR-REC-043 | A group that is ambiguous (several plausible member sets, or a member also claimed elsewhere) is proposed for review, never confirmed automatically. | Mandatory | D-REC-12 |

### 6.2 Manual matching and unmatching

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-REC-050 | A manual match requires a written reason and supporting evidence (an attached document or a reference to records). The amount and currency comparison is shown. A non-zero difference must be explained by explicit components or go through the accepted-difference process (OQ-15). The system rejects a manual match if any record is already in a confirmed match on the same link, or if the relationship is not allowed for that link. | Mandatory | D-REC-13 |
| FR-REC-051 | A high-risk manual match is created in `Pending approval` and takes effect only after approval by a different authorized user. | Mandatory (risk-based approval, D-REC-16); Unresolved (criteria OQ-14; separation OQ-17) | D-REC-13, D-REC-16 |
| FR-REC-052 | Unmatching requires a reason. The original match is kept with status `Undone`, its full history and who undid it. The records become unmatched again. Any journal draft or posted journal that depended on the match is flagged "Correction required" (FR-ACC-024). | Mandatory | D-REC-14 |
| FR-REC-053 | Cross-currency records are never matched automatically. Recommended default: they also cannot be linked manually, and stay open exceptions labelled "Cross-currency – unsupported". Linking them using a conversion the source reports would be FX conversion reconciliation, which is deferred (D-DEF-06); it would need explicit approval as a scope addition (D-PRD-06). | Mandatory (never auto-matched); Unresolved (OQ-19) | D-FIN-06, D-DEF-06, OQ-19, AF-23, AF-141 |
| FR-REC-054 | Two users trying to match, unmatch or resolve the same record at once cannot both succeed in incompatible ways. The second receives a conflict response showing the current state. | Mandatory (derived from checklist §3, L49) | D-REC-13 |

### 6.3 Exceptions and discrepancy management

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-EXC-001 | An exception records its type, linked records, owner (the assignee), reason, comments, evidence attachments, timestamps, full status history and resolution (type, rationale, resolver, approver if any). | Mandatory | D-REC-15 |
| FR-EXC-002 | Statuses are `Open`, `Investigating`, `Awaiting information` and `Resolved`. Recommended additions: `Pending approval`, and a reopen transition `Resolved` → `Open` with a required reason. | Mandatory (four statuses); Unresolved (additions, OQ-16) | D-REC-15, OQ-16 |
| FR-EXC-003 | Exception types (recommended catalogue):<br>• Amount mismatch<br>• Currency mismatch<br>• Missing settlement<br>• Settlement without payment<br>• Payment without order<br>• Multiple successful payments<br>• Ambiguous reference<br>• Conflicting source data<br>• Unmapped status<br>• Settlement for non-successful attempt<br>• Bank statement continuity break<br>• Settlement line inconsistency<br>• Payout breakdown inconsistency<br>• Refunds exceed payment<br>• Unlinked financial event<br>• Partial settlement<br>• Cross-currency – unsupported<br>• Bank credit without payout<br>• Payout without bank credit<br>• Cutover review<br>• Needs re-review after revision | Recommended | D-REC-15 |
| FR-EXC-004 | Every resolution requires a reason and evidence and records its type. Types:<br>• *Explained by evidence* (cites the components or documents);<br>• *Matched manually*;<br>• *Duplicate confirmed*: the duplicate record is flagged `Excluded as duplicate`, which removes it from matching and journal eligibility while its original values stay unchanged;<br>• *Outside reconciliation scope* (OQ-02);<br>• *Accepted difference* (OQ-15).<br>Recommended: *Duplicate confirmed*, *Outside reconciliation scope*, and any resolution of an exception with a non-zero difference count as high-risk (OQ-14). | Mandatory (reason and evidence); Recommended (exclusion flag, high-risk classes); Unresolved (the last two types) | D-REC-15, D-REC-17, AF-101 |
| FR-EXC-010 | When a resolution explains a difference that has a financial effect not yet in the ledger (for example bank charges, or a credit short of the payout), the system creates an accounting-review item linked to the exception: a journal draft or a "Correction required" item. The reconciliation and the ledger therefore never diverge silently. | Recommended (supports D-REC-19 and D-ACC-02; treatment per OQ-23) | D-REC-19, OQ-23, AF-101 |
| FR-EXC-005 | An exception with an unexplained difference cannot be set to `Resolved` except through an approved accepted-difference process, if one is approved under OQ-15. | Mandatory | D-REC-17, OQ-15 |
| FR-EXC-006 | Each exception is classified routine or high-risk. Until criteria are approved, the high-risk defaults in OQ-14 apply. High-risk resolutions need approval by a different authorized user. | Mandatory (approval); Unresolved (criteria) | D-REC-16, OQ-14 |
| FR-EXC-007 | Resolving an exception never modifies source records or their original values. | Mandatory | D-REC-17, D-IMP-12 |
| FR-EXC-008 | Exceptions have an owner (assignee) and show their age. The queue can be filtered by type, status, owner, risk, link, currency and age. | Mandatory (owner); Recommended (filters, age) | D-REC-15 |
| FR-EXC-009 | When gateway and bank amounts disagree, the system shows each original amount, its source report and row, and the difference. It never presents a single "corrected" amount. | Mandatory | D-REC-17 |

### 6.4 Runs, reruns and comparison

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-REC-060 | Each run records a unique ID, stage, scope (period or date range), input snapshot (the import versions active at start), rule-set version (matching parameters and mapping-template versions), start and finish times, actor, status, counts and results. | Mandatory | D-REC-18 |
| FR-REC-069 | **Match ownership model.**<br>• Confirmed matches are persistent relationships, recorded with provenance: the run or user that created them, and any later run or user that changed them.<br>• Each run snapshots its results so runs can be compared.<br>• A run evaluates the records in its scope that are not yet matched, and re-validates the existing automatic matches in scope against current evidence. It never re-creates them.<br>• Candidate search may look beyond the run's date range by the configured window, so a payment and its settlement in adjacent periods are not reported as missing on either side. | Recommended (resolves AF-106; pending OQ-21) | D-REC-18, OQ-21, AF-106 |
| FR-REC-061 | At most one run per stage is active per workspace. A concurrent request is rejected with the active run's ID, or queued. | Recommended | Checklist §3, L49 |
| FR-REC-062 | Reproducibility:<br>• replaying a run from its input snapshot and rule-set version, against a clean reconciliation state, gives identical automatic results;<br>• rerunning against the current state when no inputs, rules or decisions have changed creates no new or changed matches, exceptions or drafts. | Mandatory (derived from checklist §3, L53, reproducibility) | D-REC-18 |
| FR-REC-063 | Manual decisions (matches, unmatches, resolutions) are never erased by a run. If a record behind a manual decision has a new version, the decision is flagged "Needs re-review" rather than silently kept or dropped. | Mandatory (persistence); Unresolved (re-review rule, OQ-21) | D-REC-18, OQ-21 |
| FR-REC-064 | Users can compare two runs of the same stage and see added, removed and changed matches and exceptions. | Mandatory | D-REC-18 |
| FR-REC-065 | Runs never change posted journals and never bypass period-close controls. | Mandatory | D-REC-18 |
| FR-REC-066 | Users trigger runs. Imports never trigger them automatically. | Recommended (OQ-21) | OQ-21 |
| FR-REC-067 | Any run that uses a `Partially imported` input carries that warning in its results and reports. | Mandatory (derived from D-IMP-05) | D-IMP-05 |
| FR-REC-068 | Re-uploading a file is not a rerun. A rerun creates no records, duplicate matches or duplicate journal drafts. | Mandatory | D-IMP-07 |

---

## 7. Financial-event modelling and traceability

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-FIN-001 | Each of these is a separate record with its own identifiers, currency, amount and provenance: payment attempt, refund, chargeback, chargeback reversal, reversal, fee, tax amount, source adjustment, settlement payout and bank transaction. Gross and net amounts are separate fields and are never compared as if interchangeable. | Mandatory | D-FIN-01, D-FIN-02, D-FIN-04 |
| FR-FIN-002 | A refund, chargeback, reversal or source adjustment is linked to an original payment only when shared identifiers support the link. Otherwise an "Unlinked financial event" exception is raised. | Mandatory | D-FIN-04 |
| FR-FIN-003 | For each payment, refunds plus chargebacks net of reversals may not exceed the captured amount in the same currency. If they do, a "Refunds exceed payment" exception is raised. | Mandatory (derived from D-FIN-04, "inconsistent events are flagged") | D-FIN-04, AF-26 |
| FR-FIN-004 | Later events never modify the original payment. A payment's net position is derived from its linked events. | Mandatory | D-FIN-04, D-IMP-12 |
| FR-FIN-005 | Every amount carries an explicit currency. Amounts are compared or added up only within one currency. No conversion uses a guessed or hardcoded rate. | Mandatory | D-FIN-05, D-FIN-06 |
| FR-FIN-006 | Amounts are stored and computed as exact decimals (`BigDecimal` and `NUMERIC`). Values are validated against each currency's minor-unit precision (ISO 4217) and are never rounded silently. | Mandatory | D-FIN-07 |
| FR-FIN-007 | Traceability works in both directions:<br>• a journal line → its source events, the match or exception, the template version, the run, and the source record and row → the file version and import;<br>• a source row → every match, exception and journal that uses it. | Mandatory | D-REC-19, D-IMP-13, D-REC-18 |
| FR-FIN-008 | Source timestamps are kept exactly as reported (with their offset, if given). Canonical timestamps are stored in UTC. Accounting dates are calendar dates in the workspace's time zone. | Mandatory (UTC and preserved provider timestamps, checklist #95); Recommended (workspace time zone) | Checklist #95 |
| FR-FIN-009 | Cross-currency gateway settlements (a payment in one currency settled in another) are recorded with the amounts each source reports. They are never converted by ClearSettle and are handled under OQ-19. | Mandatory (no conversion); Unresolved (policy) | D-FIN-06, OQ-19 |

---

## 8. Double-entry accounting

No posting rules are approved. This section specifies the mechanism and its controls only. It does **not** specify which accounts are debited or credited for any business event. Those rules need an approved accounting policy and qualified review (D-ACC-02, OQ-23, EXTERNAL REVIEW REQUIRED).

**Staged scope (D-PRD-08).** The long-term direction is a complete business ledger, introduced gradually. In the initial release, only these may be posted:
- event-generated journals under approved, evidence-backed templates;
- explicitly supported manual journals;
- the approved opening-balance and correction workflows (FR-ACC-034).

Having manual journal entry does not make an unresolved accounting treatment supported or postable.

### 8.1 Ledger entity and currency

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-ACC-001 | Each workspace has exactly one ledger (D-PRD-09). That ledger has one functional currency, set at setup, and MVP journal lines use only the functional currency. | Mandatory (one ledger per workspace, D-PRD-09); Unresolved (functional currency, OQ-19); recommended default | D-ACC-01, D-PRD-09, OQ-19 |
| FR-ACC-026 | Events in a currency other than the functional currency produce no journal drafts until the OQ-19 policy is approved. They appear in the close checklist as unaccounted items. | Unresolved; recommended default | D-FIN-06, OQ-19 |

### 8.2 Chart of Accounts

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-ACC-002 | Each workspace has its own Chart of Accounts (D-PRD-09); accounts are never shared across workspaces. New workspaces start with a default Chart of Accounts. Each account has a code, name, type, parent grouping, active flag and system-required flag. Permitted roles can create, rename, organize and map accounts. The default content needs accountant review (OQ-27). Recommended account types: asset, liability, equity, income, expense. | Mandatory (customizable Chart of Accounts with defaults; one per workspace); EXTERNAL REVIEW REQUIRED (content) | D-ACC-08, D-PRD-09 |
| FR-ACC-003 | System-required accounts cannot be deleted and cannot change type. Accounts referenced by posted entries cannot be deleted or change type; they can only be deactivated. Every change is versioned and audited. | Mandatory ("protect … as appropriate"); Recommended (exact protections) | D-ACC-08 |

### 8.3 Accounting templates and rules

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-ACC-004 | An accounting template maps one eligible event type to journal-line patterns (account, debit or credit side, amount source field, description). Templates are versioned, and activation is recorded. Each draft references the template version that produced it. No template is active until its content is approved (OQ-23). The long-term full-ledger direction (D-PRD-08) does not relax this: an event type with no active, approved template produces no postable draft. | Mandatory (mechanism); Unresolved (content) | D-ACC-09, D-ACC-10, D-PRD-08, OQ-23 |
| FR-ACC-005 | Activating a template fails unless validation shows that it produces balanced lines for every valid event of its type and uses only active, postable accounts. Events that are ambiguous or not covered by an active template go to review. | Mandatory | D-ACC-10 |
| FR-ACC-027 | Drafting, activating and retiring templates are treated as sensitive financial settings, so MFA is required; approval follows OQ-31. | INFERENCE (templates are "sensitive financial settings" under D-SEC-08); Unresolved (approval, OQ-31) | D-SEC-08, OQ-31 |

### 8.4 Revenue recognition

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-ACC-006 | Revenue is recognized only on a configured, evidence-based trigger chosen to fit the business's policy. An order alone never triggers recognition. Missing, ambiguous or contradictory evidence sends the case to a review queue and never to an automatic posting. Trigger options and evidence fields are pending OQ-24. | Mandatory (principle); Unresolved (triggers); EXTERNAL REVIEW REQUIRED | D-ACC-03, OQ-24 |

### 8.5 Journal lifecycle and approval

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-ACC-007 | Drafting from events is idempotent: each event has at most one active draft per template purpose. Regeneration replaces only drafts that are still in `Draft` state and that no person has edited; their history is kept. A submitted or edited draft is never replaced; it is flagged "Needs re-review" instead. | Mandatory (idempotency, derived from D-IMP-07); Recommended (regeneration rule) | D-IMP-07, D-ACC-02, D-REC-18, AF-113 |
| FR-ACC-008 | A draft is `Blocked` if it depends on an open exception, an incomplete settlement group, a conflicting observation, a `Pending approval` item or a cross-currency item, or if its purpose is not supported (FR-ACC-034). It cannot be submitted or posted until the dependency clears. | Mandatory | D-ACC-06, D-PRD-08 |
| FR-ACC-009 | **Manual journals.** Preparers can create manual journal drafts that are not generated from events, and must state each draft's purpose. Manual drafts go through the same controls as every other journal: balance validation (FR-ACC-011, FR-ACC-012), review and independent approval (FR-ACC-010, FR-WSP-010), atomic posting (FR-ACC-014), accounting periods (FR-ACC-018), immutability and correction (FR-ACC-013), and audit (NFR-DAT-004). A manual draft can be posted only when its purpose is supported (FR-ACC-034). Having manual journal entry never makes an unresolved accounting treatment supported or postable. | Mandatory (D-PRD-08); Unresolved (supported purposes, OQ-56) | D-PRD-08, D-ACC-04 to D-ACC-07, D-SEC-01, OQ-56 |
| FR-ACC-034 | **Supported posting purposes.** A draft can be submitted for posting only when its purpose is one of:<br>(a) an event-generated purpose whose template version is active under an approved policy (FR-ACC-004; OQ-23, OQ-24);<br>(b) a manual-journal purpose on the approved list (OQ-56);<br>(c) the approved opening-balance workflow (FR-ACC-016) or a correction of a posted entry (FR-ACC-013). Counting (c) as supported is an INFERENCE pending OQ-56.<br>No default or catch-all purpose (such as "other" or a suspense purpose) makes an unsupported or ambiguous case postable. A draft with an unsupported purpose stays `Blocked`, shows the reason "purpose not supported", and is listed as unaccounted activity (FR-ACC-030, FR-RPT-015). | Mandatory (D-PRD-08); INFERENCE (item c); Unresolved (lists, OQ-23, OQ-24, OQ-56) | D-PRD-08, D-ACC-06, D-ACC-10, OQ-56 |
| FR-ACC-010 | Journal states:<br>• `Draft` → `Submitted` (in review) → `Posted`;<br>• `Submitted` → `Draft` (returned with a reason);<br>• `Draft` → `Discarded` (kept for history, never posted);<br>• `Blocked` overlays `Draft`.<br>Recommended: approving and posting happen in one atomic action. Recommended: discarding a draft generated from an event requires a reason and approval by a different user, because discarding removes that event from the ledger. | Mandatory (draft → review → authorized posting); Recommended (state names, atomic approve-and-post, discard control) | D-ACC-04, AF-103 |
| FR-ACC-030 | Ledger completeness: the close checklist lists every eligible event in the period that has neither a posted journal nor an approved exclusion, and treats such events as a critical item. | Recommended (supports D-ACC-14 and D-REL-01 item 2) | D-ACC-14, AF-103 |
| FR-ACC-011 | Posting succeeds only if **all** of these hold:<br>• total debits equal total credits exactly;<br>• there are at least two lines;<br>• each line has one positive amount on exactly one side;<br>• every line records its currency; whether all lines must use the functional currency is Unresolved (OQ-19, FR-ACC-001);<br>• all accounts are active and postable;<br>• the accounting date is in an open period;<br>• the date, description and supporting links are present;<br>• the entry is not `Blocked`;<br>• the entry's purpose is supported (FR-ACC-034);<br>• the approver holds Controller/Approver, is not the preparer (FR-WSP-010) and meets MFA and freshness requirements (NFR-SEC-003, NFR-SEC-004). | Mandatory | D-ACC-05, D-ACC-06, D-SEC-08, D-PRD-08 |
| FR-ACC-012 | The system never adds a balancing or suspense line automatically to make an entry balance. | Mandatory | D-ACC-06 |
| FR-ACC-014 | Posting is atomic and idempotent. Repeated or concurrent approval requests post an entry exactly once. | Mandatory (derived from D-IMP-07 and checklist §3, L47) | D-IMP-07 |
| FR-ACC-015 | Posted entries receive a sequence number per workspace and financial year. Whether it must be gap-free is pending OQ-28. | Unresolved | OQ-28 |
| FR-ACC-025 | The approval screen shows the draft next to its source evidence, the template version, the computed amounts and any related exceptions. A database constraint stops the same event being posted twice for the same purpose. | Mandatory (uniqueness, derived from D-REL-01 item 2); Recommended (review display) | D-REL-01, AF-46 |

### 8.6 Corrections

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-ACC-013 | Posted entries cannot be updated or deleted by any application role; the database enforces this. A correction is a reversing entry (an exact mirror that references the original), an adjusting entry, or both. Each goes through the same approval and the links are kept in both directions. A database constraint allows at most one full reversal of any original entry. | Mandatory (immutability and correction by reversal); Mandatory (derived: single full reversal, from D-REL-01 item 2) | D-ACC-07, AF-110 |
| FR-ACC-021 | A correction affecting a closed period is posted in the earliest open period with a reference to the original, unless a Controller reopens the period. The same question arises for new events that arrive late and are dated in a closed period (OQ-26). Which source date sets an event draft's accounting date is part of OQ-23. | Unresolved (OQ-23, OQ-26); recommended default; EXTERNAL REVIEW REQUIRED | OQ-23, OQ-26, AF-109 |
| FR-ACC-024 | When an unmatch, a report revision or a changed exception resolution affects evidence behind a posted journal, the system creates a "Correction required" item linked to that journal and puts it on the close checklist. It never reverses the journal automatically. A reconciliation-to-ledger consistency report lists every posted journal whose supporting evidence has changed. | Mandatory (correction workflow, D-REC-14); Recommended (consistency report) | D-REC-14, D-IMP-11, AF-45 |

### 8.7 Opening balances and cutover

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-ACC-016 | Opening balances are entered through a guided form or a supported template upload. The system validates account mapping and that debits equal credits. A missing balance blocks posting and is never filled in. A preparer prepares the entry; a different authorized approver posts it as one dedicated opening journal dated at the cutover date. A database constraint allows at most one opening entry per workspace. Recommended: corrections to posted opening balances are approved adjusting entries that reference the opening entry, with the treatment reviewed by an external accountant (OQ-25). The template upload uses the same file controls as every other upload (NFR-SEC-017). | Mandatory; Mandatory (derived: single opening entry, from D-ACC-11 "a dedicated opening journal entry"); Recommended (corrections) | D-ACC-11, D-ACC-05, AF-110 |
| FR-ACC-017 | Events dated before the cutover date never produce journal drafts; they remain available for reconciliation. Post-cutover events linked to pre-cutover events (for example a payment captured before cutover and settled after) raise a "Cutover review" exception before any draft can be submitted. Which event date decides pre- or post-cutover, and whether events on the cutover date itself fall inside or outside the opening balances, is Unresolved (OQ-25). | Mandatory (no duplicates); Unresolved (straddle treatment and boundary, OQ-25) | D-ACC-12, OQ-25, AF-43 |
| FR-ACC-028 | No entry may be posted with an accounting date before the cutover date, except the opening entry, which is dated at cutover. Recommended: the cutover date is locked once the first entry is posted, and any later change becomes a controlled, approved re-cutover process (OQ-29). | Mandatory (derived from D-ACC-12: opening balances represent the position at cutover); Recommended (lock); Unresolved (OQ-29) | D-ACC-12, AF-100 |
| FR-ACC-033 | If historical ledger migration is offered, it runs as a separate authorized process with its own audit trail, never through self-service onboarding or event drafting. It is not scheduled in the M0–M10 plan; offering it needs owner approval (OQ-25). | Conditional | D-ACC-12, AF-116 |

### 8.8 Periods, close and reopen

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-ACC-018 | Accounting periods are calendar months within the financial year, each `Open` or `Closed`. Posting requires an accounting date in an `Open` period. | Mandatory | D-ACC-13 |
| FR-ACC-031 | Period integrity (all Recommended):<br>• the posting transaction checks the period's state under a lock, so a close and a posting cannot interleave;<br>• periods close in order;<br>• posting into future periods beyond the current open period is blocked;<br>• reopening an earlier period flags the reports of later closed periods as "Affected by reopened period" until they are reviewed. | Recommended | D-ACC-13, AF-108, AF-136 |
| FR-ACC-032 | Cash events (payments, settlements, bank movements) and revenue-recognition events are recorded and modelled separately. A cash event can serve as recognition evidence only under an approved policy that says why (OQ-24). | Mandatory (derived from D-ACC-01, "cash movements and accrual recognition are distinct"); Unresolved (policy) | D-ACC-01, OQ-24, AF-111 |
| FR-ACC-019 | The close checklist covers:<br>• unposted, submitted or blocked drafts dated in the period;<br>• unreconciled balances;<br>• unresolved high-risk discrepancies;<br>• "Correction required" items;<br>• unaccounted cross-currency items;<br>• other required tasks.<br>Critical items block closure. Permitted exceptions need authorized approval and a documented rationale. Recommended critical items:<br>• unposted, submitted or blocked drafts dated in the period;<br>• unresolved high-risk discrepancies;<br>• "Correction required" items;<br>• unaccounted cross-currency items;<br>• eligible events without a posted journal (FR-ACC-030).<br>Recommended: every non-critical item open at close needs a recorded acknowledgement with a rationale. | Mandatory (checklist and blocking); Unresolved (which items are critical; approval separation, OQ-17) | D-ACC-14, OQ-17, AF-107 |
| FR-ACC-029 | The meaning of "unreconciled balances" in the close checklist is defined under OQ-51. Recommended default: (i) at period end, the ledger balance of each bank account is compared with the bank statement's closing balance; (ii) each clearing or in-transit account's balance is compared with the total of its open reconciliation items. Differences are listed and block the close until explained. | Mandatory (the checklist item exists, D-ACC-14); Unresolved (definition, OQ-51) | D-ACC-14, OQ-51, AF-102 |
| FR-ACC-020 | Only a Controller/Approver can close or reopen a period. Reopening needs a reason and MFA, and produces an audit event. Recommended: fresh authentication (OQ-38) and a notification to Controllers and Admins. | Mandatory (Controller only, reason, MFA, audit: D-ACC-13, D-SEC-08); Unresolved (fresh authentication, OQ-38); Recommended (notification) | D-ACC-13, D-SEC-08, OQ-38 |

### 8.9 Financial year and tax

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-ACC-022 | The financial year is configurable per workspace and defaults to 1 April–31 March. Changing it is a sensitive setting (MFA). Recommended: changes allowed only before the first posted entry. | Mandatory; Unresolved (rule after posting, OQ-29) | D-ACC-15, OQ-29 |
| FR-ACC-023 | Tax fields reported by sources are preserved and tax ledger accounts can be configured. ClearSettle does not calculate GST, prepare returns, file or give tax advice. | Mandatory; Deferred (GST compliance); EXTERNAL REVIEW REQUIRED (treatment, OQ-33) | D-ACC-16, D-DEF-04 |

### 8.10 Accounting scenarios that need an approved policy

Each scenario below needs an explicit accounting policy before templates can be activated. These are **EXTERNAL REVIEW REQUIRED** and **Unresolved**. Nothing here states a treatment.

| Scenario | Questions the policy must answer | OQ |
|---|---|---|
| Sale or revenue recognition | Which evidence triggers recognition? How are orders with no fulfilment data treated? | OQ-24 |
| Successful payment capture | Is there a receivable or clearing account between capture and settlement? | OQ-23 |
| Gateway fee and tax on fee | Which expense and tax accounts? How is recoverable tax treated? | OQ-23, OQ-33 |
| Settlement payout and bank receipt | Is there an in-transit account between payout and bank credit? | OQ-23 |
| Refund (before or after settlement), partial refund | Contra-revenue or reversal treatment? What is the effect on the receivable? | OQ-23 |
| Chargeback, chargeback reversal, dispute outcome | Which accounts while the dispute is open, won or lost? | OQ-23 |
| Reserves or holds reported by gateways (if present in samples) | Recognition and release | OQ-07, OQ-23 |
| Accepted differences (write-offs) | Which account, and what approval? | OQ-15 |
| Bank movements unrelated to gateways | Whether and how they are imported, classified and recorded. Any manual-journal purpose for them needs approval. | OQ-02, OQ-56 |
| Manual-journal purposes in the initial release | Which purposes are supported, with which permitted accounts and treatment? | OQ-56 |
| Transactions straddling the cutover | Treatment against opening balances | OQ-25 |
| Cross-currency settlements | Treatment until FX accounting is approved | OQ-19 |
| Corrections to closed periods; late events dated in closed periods | Prior-period or current-period treatment | OQ-26 |
| Accounting date of event drafts | Which source date (order, capture, settlement, bank value date) sets the accounting date? | OQ-23 |
| Corrections to posted opening balances | Adjusting-entry treatment and approval | OQ-25 |
| Year-end close | Closing income and expense to retained earnings or current-year profit; sequential close rules | OQ-52 |
| Unreconciled balances at close | Ledger-to-bank-statement and clearing-account-to-open-items tie-outs | OQ-51 |

---

## 9. Financial statements, operational reports and exports

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-RPT-001 | The trial balance (as of a date) is computed from posted entries only and shows that total debits equal total credits. | Mandatory | D-RPT-01 |
| FR-RPT-002 | The profit and loss (for a period), balance sheet (as of a date), general ledger (by account and period) and journal-entry report (filterable, with links to evidence) are computed from posted entries only. | Mandatory | D-RPT-01 |
| FR-RPT-003 | Every accounting report shows the status of the periods it covers (`Open` or `Closed`), the number of unposted drafts and open high-risk exceptions in range, and any `Partially imported` inputs. A report that covers an open period, or that has open critical close items, is labelled "Provisional" and never presented as final or verified. A closed period's reports also show any "Correction required" item raised against that period after it closed, and any reopening of an earlier period (FR-ACC-031). Every accounting statement carries the coverage disclosure in FR-RPT-015. A statement is never presented as complete for the business's whole activity just because the ledger balances. | Mandatory (distinguish draft from final; no implied verification; coverage disclosure, D-PRD-08); Recommended (wording, post-close flags) | D-RPT-01, D-PRD-08, AF-107 |
| FR-RPT-004 | Financial statements are labelled as management reports, with no claim of statutory format or compliance. | Unresolved (OQ-32); recommended default | OQ-32 |
| FR-RPT-005 | The reconciliation summary for each run and stage shows counts and amounts per outcome (matched, candidate, discrepancy, awaiting settlement, unmatched, outside scope). Amounts are kept separate by currency. | Mandatory | D-RPT-02, D-FIN-05 |
| FR-RPT-006 | The unmatched-transaction report can be filtered by link, age, amount and currency. | Mandatory | D-RPT-02 |
| FR-RPT-007 | The exception report can be filtered by type, status, owner, risk and age. | Mandatory | D-RPT-02 |
| FR-RPT-008 | The settlement-fee breakdown shows fees, taxes on fees and other reported components per payout, period and gateway, exactly as reported. | Mandatory | D-RPT-02, D-FIN-03 |
| FR-RPT-009 | The audit-history export can be filtered by date, actor, action and record. Only permitted roles can run it (OQ-37). | Mandatory | D-RPT-02, D-DAT-01 |
| FR-RPT-010 | Exports come in CSV and XLSX, use the same filters, permissions and underlying data as the on-screen report, and run as background jobs when large. Export files are stored privately, downloaded through short-lived links and expire. Exporting financial data is audited (Recommended). | Mandatory (formats, permissions, same data); Recommended (audit, expiry) | D-RPT-02, D-RPT-03, D-SEC-04 |
| FR-RPT-011 | Generating a report or export never modifies any record. | Mandatory | D-RPT-04 |
| FR-RPT-012 | In CSV and XLSX exports and error reports, every text field that starts with `=`, `+`, `-`, `@`, a tab or a carriage return is neutralized so a spreadsheet cannot run it as a formula. Amount fields are typed as amounts in the export schema and written from their exact decimal value, without a prefix: in XLSX as numeric cells, in CSV as plain decimal text such as `-250.00`. | Recommended (security control; promotion to Mandatory recommended) | AF-66, AF-130 |
| FR-RPT-013 | Every report and export header states the workspace, parameters, generation time (UTC and workspace time zone), data cut-off, relevant run IDs and warnings about incomplete data. Exports of accounting statements and ledger reports also carry the FR-RPT-015 coverage disclosure, so it travels with the data. In CSV it is a clearly marked header block; in XLSX, a header block or a dedicated sheet. | Mandatory (coverage disclosure on accounting exports, D-PRD-08); Recommended (other header fields, derived from reproducibility, checklist §3, L53; export layout) | D-PRD-08, D-RPT-01, checklist §3 |
| FR-RPT-015 | **Coverage disclosure.** Every accounting statement (trial balance, profit and loss, balance sheet, general ledger, journal-entry report) and its export states, as applicable:<br>• the covered period or as-of date;<br>• which source categories and source accounts have data in that range, which have none, and the data cut-off for each;<br>• any `Partially imported` inputs;<br>• which posting purposes were supported in the period (FR-ACC-034);<br>• known exclusions, meaning activity not recorded under a supported purpose: events awaiting an approved rule, drafts blocked as "purpose not supported", records classified outside gateway reconciliation (OQ-02), cross-currency items without journals;<br>• counts of unposted, submitted and blocked drafts in range;<br>• open critical close items, high-risk exceptions and "Correction required" items.<br>A statement is described as complete for the business's whole activity only when that activity has been captured, recorded under approved policies and validated. The criteria for that are not yet defined (OQ-56, OQ-32), so the initial release makes no such claim. Whether the statements count as management or statutory reports stays unresolved (OQ-32) and still needs professional review. | Mandatory (D-PRD-08); Mandatory (derived: no completeness claim in the initial release); Unresolved (OQ-32, OQ-56) | D-PRD-08, D-RPT-01, OQ-02, OQ-32, OQ-56 |
| FR-RPT-014 | No total adds amounts in different currencies. | Mandatory (derived from D-FIN-05 and D-FIN-06) | D-FIN-05, D-FIN-06 |

---

## 10. Security, authentication, authorization, tenancy, audit history, retention and offboarding

### 10.1 Authentication, sessions and MFA

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| NFR-SEC-001 | **OIDC login and identity.** Users authenticate through a managed OIDC provider, with Spring Boot as the OIDC client (D-SEC-11). Requirements:<br>• the Authorization Code flow only; implicit and hybrid flows are disabled at the provider;<br>• PKCE (`S256`) explicitly enabled in the client configuration and verified by a test that inspects the authorization request. Spring Security applies PKCE automatically only to public clients, or when `requireProofKey` is `true` on the client registration, so the setting is required, not assumed;<br>• `state` and `nonce` generated per request and validated on the callback;<br>• exact redirect URIs registered with the provider, with no wildcards;<br>• full ID-token validation: signature, `iss`, `aud`, `exp`, `nonce`, and `azp` where present (OpenID Connect Core §3.1.3.7);<br>• accounts keyed on the issuer and subject identifier pair (`iss` + `sub`), the only claims OIDC defines as a stable identifier (§5.7). Email is never the account-matching key; it is used only to deliver invitations and to check them at acceptance.<br>ClearSettle never stores passwords. Replacing the provider needs a designed relinking process (OQ-34). | Mandatory (D-SEC-06, D-SEC-11); Unresolved (provider, OQ-34) | D-SEC-06, D-SEC-11, AF-125, AF-148 |
| NFR-SEC-002 | **Session architecture A′.** Spring Boot owns the application session, stored server-side in PostgreSQL through Spring Session JDBC. Browser-held access and refresh tokens are not the session mechanism, and no tokens are kept in browser storage. Next.js serves the client-rendered frontend and holds no session (NFR-SEC-020). The cookie policy is in NFR-SEC-021, and its `SameSite` value is unresolved (OQ-57). | Mandatory (D-SEC-11); Unresolved (`SameSite`, OQ-57) | D-SEC-11, AF-61 |
| NFR-SEC-003 | The backend enforces MFA for Admins, Controllers and anyone performing approval, period reopening or sensitive-setting actions. It verifies the provider's authentication assertions and never relies on the UI. If the provider cannot assert MFA, privileged actions are refused. Which claims carry this evidence differs by provider (for example `acr`, `amr` and `auth_time`). A provider returning `amr` containing `mfa` is not assumed to be sufficient for every allowed authentication method. The provider-to-ClearSettle authentication-strength mapping is defined only after provider-specific evidence and tests (OQ-34), and needs approval. | Mandatory (MFA for privileged users); Recommended (assertion-based mechanism); Unresolved (strength mapping, OQ-34) | D-SEC-08, D-SEC-11, AF-62, AF-150 |
| NFR-SEC-004 | High-risk actions may require recent authentication. The seed says "may require", so whether and where it applies is decided under OQ-38. Recommended actions: posting approval, period reopening, role changes, offboarding steps a person starts, activation of templates and changes to other sensitive settings, and original-file download. Once the policy is approved, it is enforced as NFR-SEC-024 describes. | Unresolved (OQ-38); recommended default | D-SEC-08, OQ-38 |
| NFR-SEC-005 | The idle timeout is configurable, users are warned before expiry, and they can sign out of all sessions. A revoked or expired session is refused on its next backend request. Sign out everywhere deletes the user's server-side sessions (NFR-SEC-023); its effect on every instance must be shown by test (AC-163). | Mandatory | D-SEC-09, D-SEC-11 |
| NFR-SEC-020 | **Same origin and frontend rendering.** The frontend and the API are served from one origin. A reverse proxy routes the API, OIDC login and callback, and logout paths to Spring Boot, and serves the frontend assets separately. The logged-in Next.js frontend is client-rendered. A static export is preferred if the spike confirms it fits the application's routing and other requirements (AF-155). Next.js does not render authenticated data on a server, holds no session, and puts no secrets in client bundles. No cross-origin application access is configured unless an approved use case is documented. CORS only controls whether a browser script may read a response: a cross-site request can still reach the server, so CORS is not a CSRF control (NFR-SEC-022). | Mandatory (D-SEC-11); Recommended (static export, pending the spike) | D-SEC-11, D-TEC-03, AF-147, AF-155 |
| NFR-SEC-021 | **Session cookie.** The cookie is `HttpOnly`, `Secure`, host-only (no `Domain` attribute) and `Path=/`, and uses a `__Host-` name prefix where the deployment allows it. Its `SameSite` value is decided under OQ-57 from spike evidence, with `Lax` as the initial candidate. No cookie attribute replaces the CSRF defense (NFR-SEC-022). | Mandatory (D-SEC-11); Unresolved (`SameSite`, OQ-57) | D-SEC-11, OQ-57, AF-146 |
| NFR-SEC-022 | **CSRF defense.** Every state-changing request must carry:<br>• a valid framework CSRF token. Spring Security protects unsafe HTTP methods by default, and its `csrf.spa()` configuration is the starting point for the single-page frontend;<br>• a required custom request header.<br>GET, HEAD and OPTIONS requests never change state. Missing, forged or mismatched tokens are rejected. Same-origin deployment, the `SameSite` attribute, the `__Host-` prefix and the custom header each reduce risk, but none is a complete defense alone, so all are kept. Recommended: rejections are logged as security events (NFR-SEC-025). | Mandatory (D-SEC-11); Recommended (logging) | D-SEC-11, checklist #76, AF-147 |
| NFR-SEC-023 | **Session lifecycle.**<br>• **Limits:** sessions have an idle limit and an absolute limit; the values are unresolved (OQ-38).<br>• **ID rotation:** the session ID changes at authentication. Spring Security's default session-fixation protection does this, and the configured behaviour must be verified by test.<br>• **Logout:** local logout invalidates the server-side session and clears the cookie.<br>• **Sign out everywhere:** deletes all of the user's sessions.<br>• **Membership and role changes:** sessions are invalidated at least when a user is removed from every workspace or their account is disabled. Recommended: also when a privileged role is removed. Authorization is re-checked on every request regardless (FR-WSP-014).<br>• **After a database restore:** restored sessions are invalidated before service resumes (NFR-REL-007, AF-118).<br>Recommended: the session table is excluded from tenant row-level security and is accessible only to the application and lifecycle roles (NFR-SEC-018). That deletion takes effect immediately on every instance is not assumed; tests must show it. | Mandatory (D-SEC-09, D-SEC-11); Unresolved (values, OQ-38); Recommended (privileged-role trigger, session-table access) | D-SEC-09, D-SEC-11, OQ-38, AF-118, AF-151 |
| NFR-SEC-024 | **Fresh authentication and re-authentication.** Each sensitive operation has an explicitly defined fresh-authentication requirement once OQ-38 is approved.<br>• The backend rejects the operation with a step-up response when the required authentication evidence is missing, invalid, too old or insufficient.<br>• During re-authentication, ClearSettle requests the needed recency and strength from the provider, for example with `max_age`, `prompt=login` or `acr_values` as the chosen provider supports. It validates the evidence returned (for example `auth_time`, `acr` and `amr`) under the approved mapping (NFR-SEC-003).<br>• The re-authenticated identity must match the session's issuer and subject identifier; otherwise the session ends.<br>• A pending financial mutation is never replayed automatically after a login or step-up redirect; the user reviews and confirms it again.<br>The authentication spike must demonstrate this fail-closed behaviour. | Mandatory (D-SEC-11: fail-closed and same-user rules, no replay); Unresolved (operations and windows, OQ-38; strength mapping, OQ-34) | D-SEC-08, D-SEC-11, AF-149, AF-150 |
| NFR-SEC-025 | **Authentication events.** Sign-in success and failure, step-up, logout, sign out everywhere, session revocation and CSRF rejections are recorded as security events with correlation IDs, and monitored for abnormal rates. Session IDs, tokens, authorization codes, client secrets and other credentials are never logged (NFR-SEC-012). | Mandatory (D-SEC-11, D-DAT-01); Recommended (monitoring thresholds) | D-SEC-11, D-DAT-01, AF-153 |
| NFR-SEC-026 | **MFA enrollment and recovery.** MFA enrollment, account recovery, MFA reset and administrative recovery are security-sensitive processes, because a weak recovery path can bypass MFA entirely. They are evaluated for the chosen provider in the OQ-34 spike and reviewed by a security specialist before production. | Unresolved (OQ-34); EXTERNAL REVIEW REQUIRED | D-SEC-06, D-SEC-08, AF-154 |

### 10.2 Authorization

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| NFR-SEC-006 | Every API endpoint and background operation checks permissions (§2.3) and tenant scope in the backend service layer, denying by default. A missing check counts as a defect. Automated tests cover every endpoint against an allowed role, a denied role, a non-member and a member of another workspace. | Mandatory | D-SEC-03, D-SEC-04 |
| NFR-SEC-009 | Inputs are validated at every trust boundary. Request bodies bind only allowlisted fields (no mass assignment). Queries are parameterized. Dynamic sort and filter fields are checked against allowlists. | Mandatory | Checklist §7 |
| NFR-SEC-010 | No cross-origin application access is configured unless an approved use case is documented (NFR-SEC-020). CSRF defense follows NFR-SEC-022. Security headers are set. Rate limits apply to authentication-related endpoints, uploads, run triggers, exports, workspace creation and invitations. | Mandatory | Checklist #1, #75, #76, AF-137, D-SEC-11 |
| NFR-SEC-013 | Platform-operator access to tenant data follows OQ-05. Until it is decided, no operator access path exists other than infrastructure administration under least privilege. | Unresolved; recommended default | OQ-05, AF-60 |
| NFR-SEC-027 | **Authorization context for background work.** A queued job or export records its actor, its workspace and the authorization context at request time in its audit trail. When the job runs, the backend re-checks the actor's current membership and permission for that workspace. If they no longer hold, the job aborts and an audit event is recorded. Access to the job's output is re-checked at download (NFR-SEC-008). The workspace identifier in a job payload is a target, not proof of authorization (FR-WSP-016). | Mandatory (derived from D-SEC-03, D-SEC-04 and D-SEC-11) | D-SEC-03, D-SEC-04, D-SEC-11, AF-152 |

### 10.3 Tenant isolation

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| NFR-SEC-007 | Isolation is enforced in layers:<br>(a) every tenant-owned row carries a non-null workspace ID;<br>(b) database constraints stop any relationship (match, exception link, journal-line source link, journal line to account, journal to accounting period) from joining records of different workspaces, for example through composite keys that include the workspace ID;<br>(c) PostgreSQL row-level security applies to tenant tables as defence in depth, with forced RLS, an application role that neither owns the tables nor bypasses RLS, and a per-transaction tenant context that fails closed when absent;<br>(d) background jobs set their tenant context from the job's stored workspace and re-check that every referenced record belongs to it;<br>(e) every unique and foreign key on a tenant table includes the workspace ID, because PostgreSQL integrity checks bypass row-level security and a key spanning workspaces could reveal another tenant's data;<br>(f) views over tenant data run with the querying user's permissions (`security_invoker`); materialized views, which row-level security cannot protect, and functions that run with their owner's privileges (`SECURITY DEFINER`) are reviewed before use on tenant data. | Mandatory (layered isolation); Recommended (mechanics a–f) | D-SEC-10, AF-63, AF-120 |
| NFR-SEC-018 | Each database role has a defined, minimal scope, with every cross-tenant operation listed, audited and tested. Recommended roles:<br>• **application**: tenant context required, row-level security forced;<br>• **job dispatcher**: job metadata only;<br>• **lifecycle**: retention, offboarding and restore checks, audited;<br>• **migration**: schema changes only;<br>• **metrics reader**: aggregates without financial detail.<br>No role is granted the ability to bypass row-level security ad hoc. | Recommended | D-SEC-10, AF-121 |
| NFR-SEC-008 | Stored objects use opaque, workspace-namespaced keys, and buckets are never public. Every download passes an authorization check that is repeated at download time, including for exports generated in the background. Recommended: stream downloads through the backend. If signed links are used instead, they have a short maximum lifetime (value under OQ-38), are single-use where the storage supports it, and their issuance is audited. Responses carry `Content-Disposition: attachment` and `Cache-Control: no-store`. | Mandatory (private storage, authorization, short-lived access, D-DAT-03 and D-DAT-04); Recommended (mechanism) | D-DAT-03, D-DAT-04, AF-132 |
| NFR-SEC-017 | Every upload path gets the D-DAT-04 controls, not only source reports. That includes exception evidence attachments and opening-balance template uploads. The controls are: an allowlist of file types, size limits, malware scanning where supported, and private storage. Uploaded files are served only as downloads, with the correct content type and `nosniff`, and are never rendered inline on the application's origin. | Mandatory (derived from D-DAT-04); Recommended (mechanism) | D-DAT-04, AF-119 |
| NFR-SEC-019 | Roles that can bulk-export data or download original files must also use MFA, not only the privileged roles named in D-SEC-08. | Unresolved (OQ-55); recommended | D-SEC-08, OQ-55, AF-135 |
| NFR-SEC-016 | Caches, search indexes and logs are scoped by workspace, or contain no tenant financial data. | Mandatory (derived from D-SEC-04) | D-SEC-04 |

### 10.4 Audit history

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| NFR-DAT-001 | Each audit event records: event ID; workspace ID; actor (user, or system job together with the user who started it); action; target type and IDs; UTC timestamp; reason where required; before and after values or a diff; correlation ID. | Mandatory (actor, timestamp, records, action, reason); Recommended (other fields) | D-DAT-01 |
| NFR-DAT-002 | An audit event is written in the same database transaction as the change it records, so neither can exist without the other. | Recommended (strongly; supports D-DAT-01) | D-DAT-01 |
| NFR-DAT-003 | The application role can only insert and read audit events. Database privileges and a guard trigger refuse updates, deletes and truncation. Only the migration role can disable triggers. Corrections are new events. Audit events are deleted only by the lifecycle role (NFR-SEC-018), under approved retention or offboarding, and each such deletion is recorded in a platform-level deletion log kept outside the workspace. | Mandatory (append-only); Recommended (mechanism, lifecycle deletion) | D-DAT-01, D-DAT-07, AF-126 |
| NFR-DAT-004 | Audited actions include:<br>• workspace creation (D-PRD-09);<br>• membership and role changes;<br>• workspace switching, recorded as a security event in the user's session history rather than as a financial event (Recommended);<br>• workspace and security settings;<br>• uploads, commits and revisions;<br>• runs;<br>• manual matches and unmatches;<br>• exception transitions and resolutions;<br>• approvals, returns and rejections;<br>• postings and reversals;<br>• period close and reopen;<br>• Chart of Accounts and template changes;<br>• exports and original-file downloads (Recommended);<br>• offboarding steps and legal holds;<br>• failed attempts at privileged actions (Recommended). | Mandatory (important financial and administrative events, including workspace creation); Recommended (marked items) | D-DAT-01, D-SEC-05, D-PRD-09 |
| NFR-DAT-005 | Who can read the audit history follows OQ-37. | Unresolved | OQ-37 |
| NFR-DAT-012 | No claim of tamper-proof or immutable storage is made. Tamper evidence (for example hash chaining or external log storage) is evaluated during hardening (M9). | Mandatory (no unproven claims); Recommended (evaluation) | D-DAT-02 |

### 10.5 Data protection, retention and offboarding

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| NFR-DAT-006 | Retention is configured per category: original uploads, temporary processing artifacts, imported financial records, posted journals, reconciliation history and audit logs. Legal holds (workspace-wide, per category or per record) suspend deletion. Workspace Admins cannot shorten retention below the platform's mandatory minimum. Recommended (OQ-41):<br>• retention is dependency-aware: evidence cited by a retained record (for example an original upload behind a posted journal) is never deleted, or is reduced to a tombstone that keeps the trace;<br>• export files, error reports, quarantined rows, exception attachments and application logs get explicit categories;<br>• the event that starts each category's retention clock is defined. | Mandatory (mechanism); Unresolved (values and recommended additions, OQ-41) | D-DAT-07, D-DAT-08, AF-127 |
| NFR-DAT-007 | Automatic deletion of financial records, journals, reconciliation history and audit logs stays disabled until retention periods are approved after qualified review. | Mandatory (derived from D-DAT-07, "mandatory retention cannot be bypassed", and D-DAT-08, "periods unresolved") | D-DAT-07, D-DAT-08, AF-80 |
| NFR-DAT-008 | Data is minimized and identifiers are masked as described in FR-IMP-022. Only permitted roles can access original reports (OQ-37). | Mandatory; Unresolved (details) | D-DAT-05 |
| NFR-DAT-009 | Offboarding follows the lifecycle in §2.5:<br>• in-progress jobs are cancelled safely or finish without starting new work;<br>• pending approvals are frozen;<br>• the export runs within its window;<br>• deletion respects retention and legal holds;<br>• every step is audited;<br>• a step started by a person requires that person's MFA (D-SEC-08) and, per OQ-38, fresh authentication; steps the system runs are audited but need no MFA.<br>Who performs the offboarding export, and who may download it, is unresolved (OQ-42). | Mandatory (controlled process, D-DAT-06; audit); Unresolved (sequence, windows, export roles, fresh authentication: OQ-38, OQ-42) | D-DAT-06, AF-85, AF-124 |
| NFR-DAT-010 | Temporary processing artifacts (staging rows and files in the upload holding area) are deleted after a short, configurable period. Quarantined rows are not temporary artifacts: they follow the retention rules for imported financial records. | Mandatory (category); Unresolved (value) | D-DAT-07 |
| NFR-DAT-011 | Backup copies age out under their own retention and are not deleted record by record. This behaviour is disclosed in the offboarding documentation. | Recommended; EXTERNAL REVIEW REQUIRED | D-DAT-06, AF-81 |

### 10.6 Sources for the authentication requirements

These sources were checked on 16 October 2026. Each supports only the claims listed against it. Framework support for a control does not mean the control is enabled, so every control in §10.1 is also a test.

| Claim | Source |
|---|---|
| The backend-for-frontend pattern is ranked most secure for browser applications. Its cookies MUST be `Secure` and `HttpOnly` and SHOULD be `SameSite=Strict`. It MUST implement a CSRF defense. | RFC 10017, *OAuth 2.0 for Browser-Based Applications* (BCP 212, August 2026): https://www.rfc-editor.org/rfc/rfc10017.html |
| PKCE is recommended for confidential clients; authorization servers must match redirect URIs exactly; a client that uses more than one authorization server must defend against mix-up attacks. | RFC 9700 (January 2025), §2.1: https://www.rfc-editor.org/rfc/rfc9700.html |
| ID-token validation steps. `max_age` requires `auth_time`. `prompt=login`. Checking `acr`. `iss` + `sub` are the only stable identifier, and email must not be used as a unique identifier. | OpenID Connect Core 1.0, §3.1.2.1, §3.1.3.7, §5.5.1.1 and §5.7: https://openid.net/specs/openid-connect-core-1_0.html |
| PKCE is applied automatically only to public clients, or when `requireProofKey` is `true`. The in-progress authorization request is stored in the HTTP session by default. The authorization request can be customized. | Spring Security 7.1.1, OAuth 2.0 authorization grants: https://docs.spring.io/spring-security/reference/servlet/oauth2/client/authorization-grants.html |
| Default ID-token signature validation; the callback endpoint `/login/oauth2/code/*`. | Spring Security 7.1.1, OAuth 2.0 login (advanced): https://docs.spring.io/spring-security/reference/servlet/oauth2/login/advanced.html |
| CSRF protection is on by default for unsafe methods; `csrf.spa()` exists for single-page apps. | Spring Security 7.1.1, CSRF: https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html |
| The session ID is changed at login by default (`changeSessionId`). Clearing cookies on logout may not work in every servlet container. | Spring Security 7.1.1, session management: https://docs.spring.io/spring-security/reference/servlet/authentication/session-management.html |
| Provider sign-out (RP-initiated) and back-channel logout by `sid` or `sub`; the OIDC session registry is in-memory by default. | Spring Security 7.1.1, OIDC logout: https://docs.spring.io/spring-security/reference/servlet/oauth2/login/logout.html |
| Factor authorities record an issue time and support a `validDuration`. | Spring Security 7.1.1, multi-factor authentication: https://docs.spring.io/spring-security/reference/servlet/authentication/mfa.html |
| JDBC session store with a PostgreSQL schema and an expired-session cleanup job; finding sessions by principal name. | Spring Session 4.1.1, JDBC configuration and API: https://docs.spring.io/spring-session/reference/configuration/jdbc.html and https://docs.spring.io/spring-session/reference/api.html |
| Features a static export does not support, including Proxy, Server Actions, cookies, and dynamic routes without `generateStaticParams`. | Next.js static exports guide: https://nextjs.org/docs/app/guides/static-exports |
| SameSite is defense in depth; sibling subdomains are a risk; custom headers trigger a preflight. | OWASP CSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html |
| Simple requests are sent without a preflight; CORS controls whether the response is shared with the calling script. | MDN, CORS guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS |

Provider capabilities and pricing are not listed here. They are evaluated under OQ-34 and must be re-verified when the provider is chosen.

---

## 11. Reliability, background jobs, recovery, monitoring, deployment and operations

### 11.1 Background jobs

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| NFR-REL-001 | Every job stores: workspace, type, status (`Queued`, `Processing`, `Partially completed`, `Completed`, `Failed`), attempt count, lease and heartbeat, idempotency key, progress, and actionable failure detail. Only transient failures are retried, a bounded number of times with backoff. Each step is idempotent. Every batch commit and status write checks a lease version that only ever increases (a fencing token), so a worker that stalls past its lease cannot write after another worker has taken over. | Mandatory (status, safe retries); Recommended (mechanism, OQ-49) | D-OPS-01, AF-133 |
| NFR-REL-002 | A job interrupted by a restart or crash resumes or retries safely, without duplicate records, matches, drafts or postings. Notifications follow FR-NTF-005: delivery is at least once, so an occasional duplicate notification is possible. | Mandatory | D-OPS-07, D-IMP-07, AF-128 |
| NFR-REL-003 | A job that fails permanently stops retrying. It is isolated with its input reference kept, raises an alert, and can be re-run manually and safely once the cause is fixed. | Mandatory (derived from D-OPS-01 "safe retries" and checklist #12 "bounded"); Recommended (isolation mechanism, by analogy with checklist #20) | D-OPS-01, checklist #12 |
| NFR-REL-004 | Concurrency per workspace and queue depth are bounded, so one tenant's large imports cannot starve others. | Recommended | Checklist #44 |
| NFR-REL-005 | Every call to an external dependency (identity provider, object storage, email, malware scanner) has explicit timeouts. | Mandatory | Checklist #11 |

### 11.2 Notifications

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| FR-NTF-001 | In-app notifications cover completed, partial and failed imports; failed reconciliation runs; and completed exports. Recommended additions: approval requested, exception assigned, period reopened, role changed. | Mandatory (seed events); Recommended (additions) | D-OPS-02 |
| FR-NTF-002 | Emails never contain amounts, account or card identifiers, counterparty names or file contents. They give a generic description and direct the user to sign in. | Mandatory | D-OPS-02 |
| FR-NTF-003 | Users can configure their notification preferences. Security notices (role changes, MFA changes, sign-ins to new sessions where available) cannot be switched off. | Mandatory (configurable where appropriate); Recommended (security notices) | D-OPS-02 |
| FR-NTF-004 | Recipients are worked out when the notification is sent: current members of the workspace who are permitted to see its subject. | Mandatory (derived from D-SEC-04) | D-SEC-04 |
| FR-NTF-005 | Notifications are emitted only after the triggering transaction commits (an outbox pattern), and delivery is at least once. Duplicates are reduced with provider idempotency keys where the email provider supports them, and with a send log kept outside the restore scope. Exactly-once delivery through an external email provider is not claimed. | Recommended (supports D-OPS-07) | D-OPS-07, AF-82, AF-128 |

### 11.3 Backup, recovery and data consistency

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| NFR-REL-006 | Database backups are automated, with point-in-time recovery where the host supports it. Evidence files are protected against loss and overwrite, for example by object versioning or soft deletion (Recommended). Backup access is restricted. A documented restore procedure is rehearsed regularly. Each drill measures the data-loss window and the restore time against RPO ≤ 1 hour and RTO ≤ 4 hours. Recommended:<br>• drills restore *production* backups into an isolated recovery environment run under production controls, not staging (NFR-OPS-002);<br>• RTO is measured from incident declaration, or drill start, to service ready after the NFR-REL-007 checks;<br>• whether the RPO target also covers evidence files is decided under OQ-54. | Mandatory (backups, restore tests, measurement); Recommended (drill environment, measurement points); Unresolved (file RPO, OQ-54) | D-OPS-05, D-OPS-06, AF-122 |
| NFR-REL-007 | After any restore, these consistency checks run before service resumes:<br>• every file reference resolves to a stored object;<br>• all posted entries balance and the trial balance totals agree;<br>• audit history is continuous;<br>• jobs left mid-flight are recovered or failed safely;<br>• every session is invalidated;<br>• revocations, legal holds and deletions recorded after the restore point are re-applied from a log kept outside the restore scope, so removed users do not regain access and deleted data does not quietly reappear (Recommended);<br>• notifications whose sends after the restore point are recorded in a send log kept outside the restore scope are not re-sent; any duplicates that remain are a documented limitation (Recommended). | Mandatory (consistent financial data); Recommended (check list) | D-OPS-07, AF-82, AF-118, AF-128 |
| NFR-REL-008 | Health endpoints distinguish whether the process is alive from whether it is ready: database and storage reachable, migrations applied. | Mandatory | Checklist #56 |
| NFR-REL-009 | Migrations are versioned, reviewed and backward compatible with the running version (expand, migrate, contract). They are tested both on a fresh database and as an upgrade from the previous release. | Mandatory | Checklist #80, #81 |

### 11.4 Environments, delivery and observability

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| NFR-OPS-001 | Development, staging and production are separate. Each has its own credentials, data, identity-provider clients, storage and secrets. | Mandatory | D-OPS-03 |
| NFR-OPS-002 | No real customer data exists outside production. Non-production environments use synthetic or anonymized datasets. | Unresolved; recommended default | OQ-45, AF-86 |
| NFR-OPS-003 | CI builds from committed source and runs linting, unit tests, integration tests against real PostgreSQL, API tests, end-to-end tests and dependency vulnerability checks. Any failure blocks merging or release. | Mandatory | D-OPS-03, checklist §8 |
| NFR-OPS-004 | Logs are structured and carry correlation IDs. Errors are logged centrally. Metrics cover API error rate and latency, database pool health, job duration, failures and backlog, import and run duration, and exception counts. Alerts fire on outages, repeated job failures, pool exhaustion and storage problems, and go to a named responder. | Mandatory | D-OPS-03, checklist §9 |
| NFR-OPS-005 | Deployment artifacts are immutable, rollback is documented and tested, and migrations stay compatible across a rollback. | Mandatory | D-OPS-03 |
| NFR-OPS-006 | The incident-response runbook covers partial import or run failures, restores, credential rotation, suspected cross-tenant exposure and recovery from bad deployments. | Mandatory | D-OPS-03 |
| NFR-OPS-007 | Deployment topology: the frontend and API are hosted on the same origin (D-SEC-11, NFR-SEC-020). Hosting providers follow OQ-43. | Mandatory (topology, D-SEC-11); Unresolved (providers, OQ-43) | D-SEC-11, OQ-43 |
| NFR-SEC-011 | Secrets are kept in a managed secrets facility. None appear in the repository, images, logs or test fixtures. | Mandatory | D-OPS-04 |
| NFR-SEC-012 | Logs never contain session IDs, tokens, authorization codes, secrets, file contents or full financial payloads. Identifiers are redacted where appropriate. | Mandatory | Checklist §7 |
| NFR-SEC-014 | CI checks dependencies for known vulnerabilities. Upgrades are deliberate. | Mandatory | Checklist #107 |

---

## 12. Acceptance criteria, negative cases and nonfunctional requirements

### 12.1 Representative acceptance criteria

Each criterion describes observable results and includes failure cases. "Rejected" means the API returns an error with the right HTTP semantics, nothing changes, and the UI shows a specific, actionable message. Criteria marked (U) test a recommended default for an open question and must be revised if the owner decides otherwise.

**Imports**

| ID | Given / when | Then | Covers |
|---|---|---|---|
| AC-001 | An Analyst uploads a PDF as a settlement report. | It is rejected with a reason naming CSV and XLSX; no source records are created. | FR-IMP-001 |
| AC-002 | A file exceeds the configured size or row limit. | Over the size limit: rejected before parsing. Over the row limit: rejected during a streaming pre-scan, before any staging or commit. Either way, record counts are unchanged. | FR-IMP-003 |
| AC-003 | A password-protected XLSX is uploaded. | It is rejected with "encrypted or password-protected file". | FR-IMP-002 |
| AC-004 | A byte-identical copy of an imported file is uploaded. (U) | It is blocked with a link to the earlier import; no records are created. | FR-IMP-005 |
| AC-005 | A 10-row file where row 4 has date 31/02/2026 and row 7 has no currency is committed. | 8 records exist. 2 rows are quarantined with row number, field and reason. The outcome is `Partially imported` with a visible warning. The error-report export contains exactly those 2 rows. | FR-IMP-009, FR-IMP-012, FR-IMP-013 |
| AC-006 | A mapping's date column is ambiguous (for example 01/02/2026) and the format is unconfirmed. | The mapping cannot be saved or used until a date format is explicitly confirmed. | FR-IMP-007, FR-IMP-008 |
| AC-007 | Indian digit grouping is configured and an amount reads "1,00,000.50". | It is stored as exactly 100000.50. | FR-IMP-008 |
| AC-008 | An INR amount has three decimal places. (U: OQ-53) | The row is quarantined with a precision error and is not rounded. | FR-IMP-028, FR-FIN-006 |
| AC-009 | A commit job is killed midway and then retried. | Each identity key exists exactly once; job status and import outcome are consistent. | FR-IMP-011, NFR-REL-002 |
| AC-010 | A second export overlaps the first: 50 rows are identical to existing records and 10 are new. | 10 new records are created; 50 repeat occurrences are recorded; there are no duplicates. | FR-IMP-015 |
| AC-011 | A later file without revision status has the same payment ID with a different amount. (U) | The existing record is unchanged; a new observation is stored; a "Conflicting source data" exception exists; the record is not eligible for automatic matching. | FR-IMP-016 |
| AC-012 | One line of payout P is quarantined. | P is marked incomplete; P and its lines are not matched automatically; no journal drafts derive from P. | FR-IMP-014 |
| AC-013 | A corrected settlement file is designated as a revision of import I. (U: outcome names and revision approval) | The diff is shown before commit. Afterwards I is `Superseded`; removed records are `Withdrawn by revision` and still visible; posted journals are unchanged; affected matches show "Needs re-review". | FR-IMP-019, FR-IMP-020 |
| AC-014 | A file has a column of 16-digit values that pass the card-number checksum and match card-issuer prefixes. A second file has 16-digit bank references that pass the checksum but match no issuer prefix and sit in a reference column. (U) | The first file is held for confirmation, or rejected, before it reaches evidence storage, and its temporary copy is removed. The second file imports normally. | FR-IMP-022 |

**Reconciliation and exceptions**

| ID | Given / when | Then | Covers |
|---|---|---|---|
| AC-020 | Payment X (INR 1,000.00, successful) and a settlement line referencing X with gross INR 1,000.00. | Matched automatically. The match records the run ID, rule-set version and identifier evidence. | FR-REC-003, FR-REC-020 |
| AC-021 | As AC-020, but the settlement gross is INR 999.99. | No match. An "Amount mismatch" exception shows both values and their source rows; a 0.01 difference is not absorbed by any tolerance. | FR-REC-004, FR-REC-007 |
| AC-022 | Same identifier, but currencies USD and INR. | No match. A "Currency mismatch" exception is raised; nothing is converted. | FR-REC-004, FR-FIN-005, FR-REC-053 |
| AC-023 | A payment and a settlement line with equal amount and date but no shared identifier. | Never matched automatically; may appear as a candidate with "no identifier evidence" shown. | FR-REC-005 |
| AC-024 | Two settlement payment lines both reference payment X. | An "Ambiguous reference" exception; no automatic match. | FR-REC-006 |
| AC-025 | Order O totals 2,000.00, with two successful payments of 1,000.00 each and no split evidence. | A "Multiple successful payments" exception; nothing is aggregated. | FR-REC-011 |
| AC-026 | A failed attempt exists for order O. | It is linked to O under L1, excluded from L2, and never counted as a payment. | FR-REC-002 |
| AC-027 | A settlement line has gross 1,000.00, fee 20.00, tax on fee 3.60 and net 976.40. These are illustrative reported values; no fee or tax rate is implied or computed. | It passes. If net were 976.00 instead, a "Settlement line inconsistency" exception would be raised and the values kept as reported. | FR-REC-021 |
| AC-028 | Payout amount ≠ sum of its lines' net amounts. | A "Payout breakdown inconsistency" exception; journal drafts from that breakdown are `Blocked`. | FR-REC-022, FR-ACC-008 |
| AC-029 | A payout with UTR U, and a bank credit with UTR U for the same amount. | L3 match. If the amounts differ by 1.00 instead, an open discrepancy shows both amounts. | FR-REC-030, FR-REC-031 |
| AC-030 | Two payouts sum exactly to one bank credit with no combined-reference evidence. (U: GR1–GR4 allowlist) | Proposal only; nothing is confirmed. | FR-REC-032, FR-REC-040 |
| AC-031 | A rerun uses identical inputs and rule-set version. | Run comparison shows zero changes to automatic results. | FR-REC-062, FR-REC-064 |
| AC-032 | A manual match's settlement line receives a new version through a revision, and then a rerun happens. (U: OQ-21) | The manual match is kept and flagged "Needs re-review"; it is neither silently kept as valid nor dropped. | FR-REC-063 |
| AC-033 | Two Stage 1 runs are requested at the same time. (U: FR-REC-061) | One proceeds; the other is rejected with the active run's ID, or queued. | FR-REC-061 |
| AC-034 | Two Analysts manually match the same settlement line to different payments at the same time. | Exactly one succeeds; the other receives a conflict with the current state. | FR-REC-054 |
| AC-035 | A manual match is submitted without a reason or evidence, or a record is already matched on that link. | Rejected; nothing changes. | FR-REC-050 |
| AC-036 | An amount-mismatch exception is set to `Resolved` as "Explained" without citing components or evidence. | Rejected; the status is unchanged. | FR-EXC-004, FR-EXC-005 |
| AC-037 | Analyst A, who also holds the Controller role, submits a high-risk resolution. (U) | It goes to `Pending approval`. Approval by A is rejected; approval by Controller B succeeds. Both events are audited. | FR-EXC-006, FR-WSP-012 |
| AC-038 | A match supporting a posted journal is unmatched with a reason. | The match becomes `Undone` with its history kept; the journal is unchanged and flagged "Correction required"; the close checklist lists it. | FR-REC-052, FR-ACC-024 |
| AC-039 | Refunds linked to a payment exceed its captured amount. | A "Refunds exceed payment" exception. | FR-FIN-003 |

**Accounting**

| ID | Given / when | Then | Covers |
|---|---|---|---|
| AC-050 | A draft has debits of 100.00 and credits of 99.99. | It cannot be submitted or posted; the error states the imbalance; no balancing line is added. | FR-ACC-011, FR-ACC-012 |
| AC-051 | Preparer P holds both Preparer and Controller roles and tries to approve their own draft three ways: through the UI, directly through the API, and by replaying an earlier approval request. | All three are rejected (forbidden) and the draft stays `Submitted`. Recommended: each attempt is logged (NFR-DAT-004). | FR-WSP-010 |
| AC-052 | Controller C (not P) approves twice, or two approval requests arrive at once. | Exactly one posted entry with one sequence number. | FR-ACC-014 |
| AC-053 | Something tries to update or delete a posted entry, through the API or as the application database role. | Rejected at both layers. | FR-ACC-013 |
| AC-054 | A posted entry is reversed. | A mirrored entry references the original; both are visible; their combined effect in the trial balance is zero. | FR-ACC-013 |
| AC-055 | Posting is attempted into a `Closed` period. | Rejected, naming the period. | FR-ACC-018 |
| AC-056 | A Controller reopens a period: (a) without a reason; (b) with a reason but stale authentication; (c) with both. | (a) and (b) are rejected or require step-up authentication. (c) reopens the period, writes an audit event and sends notifications. | FR-ACC-020, NFR-SEC-004 |
| AC-057 | Closing a period that has a submitted, unposted draft. (U: which items are critical) | Blocked, listing the draft. A permitted-exception path needs an approver and a rationale. | FR-ACC-019 |
| AC-058 | A draft depends on an open exception. | It is `Blocked` and cannot be submitted. | FR-ACC-008 |
| AC-059 | Opening balances that do not balance. | They cannot be submitted. Once balanced, they need an approver who is not the preparer, and post dated at the cutover date. | FR-ACC-016 |
| AC-060 | An event dated before cutover; and a settlement after cutover of a payment captured before it. (U: OQ-25 for the second case) | No draft for the first. A "Cutover review" exception for the second before any draft can be submitted. | FR-ACC-017 |
| AC-061 | Drafts are regenerated for the same event, and someone tries to post the same event twice for the same purpose. | No second active draft. The second posting is rejected by a database constraint. | FR-ACC-007, FR-ACC-025 |
| AC-062 | A template version whose lines are unbalanced is activated. | Activation is rejected with a validation report. | FR-ACC-005 |
| AC-063 | Someone deletes an account referenced by a posted entry. | Rejected; deactivating it is allowed. | FR-ACC-003 |

**Security, tenancy, audit and data**

| ID | Given / when | Then | Covers |
|---|---|---|---|
| AC-070 | A member of workspace A reads, updates, deletes, exports or requests a download link for a resource of workspace B by ID. | Every attempt fails with a response that does not reveal whether the resource exists, and nothing leaks. The matching allowed operations inside A succeed. Recommended: a security event is logged. Export and download-link parts run once those features exist (M2, M8). | NFR-SEC-006, NFR-SEC-007, NFR-SEC-008, FR-WSP-008 |
| AC-071 | A job for workspace A is given a payload containing workspace B's record IDs. | It fails without reading or writing B's data. | NFR-SEC-007 |
| AC-072 | A database query runs on a tenant table without a tenant context. (Recommended mechanism) | It returns no rows and cannot write (fails closed). | NFR-SEC-007 |
| AC-073 | An Auditor calls any mutating endpoint, and a role whose UI button is hidden calls the API directly. | Both are rejected. | NFR-SEC-006, D-SEC-01 |
| AC-074 | A user without a valid MFA assertion attempts a privileged action. | Rejected, with a step-up requirement. | NFR-SEC-003 |
| AC-075 | A user signs out of all sessions, or a member's role is removed. | Other sessions are refused on their next request; the removed permission no longer works on the next request. | NFR-SEC-005, FR-WSP-014 |
| AC-076 | A new user creates a workspace. | They see only that workspace and cannot list or reach others. | FR-WSP-002 |
| AC-077 | A signed file link is used after it expires, or a member of workspace B asks for a link to workspace A's file. | Both fail. | NFR-SEC-008 |
| AC-078 | An import-completed email is sent. | It contains no amounts, account identifiers, counterparty names or file contents. | FR-NTF-002 |
| AC-079 | A user is removed from workspace A before a notification about A is sent. | They do not receive it. | FR-NTF-004 |
| AC-080 | An audited action commits, and another rolls back. (U: NFR-DAT-002) | The committed action has exactly one audit event with the required fields; the rolled-back action has none. | NFR-DAT-001, NFR-DAT-002 |
| AC-081 | The application role attempts UPDATE or DELETE on audit events. | Rejected. | NFR-DAT-003 |
| AC-082 | A legal hold covers a workspace when a deletion job runs. | Covered data is not deleted, and the job reports why. | NFR-DAT-006 |
| AC-083 | An Admin sets retention below the mandatory minimum. | Rejected. | NFR-DAT-006 |

**Reliability and reports**

| ID | Given / when | Then | Covers |
|---|---|---|---|
| AC-090 | The application is killed during a reconciliation run. | After restart the run resumes, or is marked `Failed` with recoverable state; there are no duplicate matches or drafts. | NFR-REL-002 |
| AC-091 | A job fails permanently. | After the bounded attempts it is `Failed`, isolated and alerted, never retried in a loop, and can be re-run safely. | NFR-REL-003 |
| AC-092 | A restore drill restores production backups to time T in an isolated recovery environment run under production controls. (U: drill environment) | The NFR-REL-007 checks pass. The data-loss window and the restore time (incident declaration to service ready) are measured and recorded against the targets. An unmet target is reported as unmet. | NFR-REL-006, NFR-REL-007 |
| AC-093 | A trial balance is generated. | Debits equal credits across posted entries; drafts are excluded; period status is shown. | FR-RPT-001, FR-RPT-003 |
| AC-094 | A report is generated over a period with open high-risk exceptions. | It is labelled "Provisional" and shows their count. | FR-RPT-003 |
| AC-095 | Data in two currencies is exported. | Totals are separate per currency. Record counts and checksums are unchanged after export. | FR-RPT-010, FR-RPT-011, FR-RPT-014 |
| AC-096 | An exported text cell starts with "=" and an amount is −250.00. | The text is neutralized; the amount stays a numeric cell. | FR-RPT-012 |

**Additional criteria added after independent review (16 October 2026)**

These cover high-risk requirements that previously had no acceptance criterion (AF-117).

*Imports*

| ID | Given / when | Then | Covers |
|---|---|---|---|
| AC-100 | A saved template is applied to a file whose headers differ from the template's header signature. | The template is not applied automatically; the user must re-map. | FR-IMP-006 |
| AC-101 | A bank file uses separate debit and credit columns, and the sign convention is unconfirmed; a row has both columns filled in. | The mapping cannot be used until the convention is confirmed. The row with both columns filled in is quarantined with a sign error. | FR-IMP-008, FR-IMP-009 |
| AC-102 | An amount column holds minor units (for example 100050 meaning 1,000.50), and the unit is unconfirmed or then confirmed. | Unconfirmed: the mapping cannot be used. Confirmed as minor units: the value is stored as exactly 1000.50. | FR-IMP-008 |
| AC-103 | An XLSX file has a numeric amount cell holding 1000.1, uses the 1904 date system, and has a formula in an amount cell. (U: formula rule) | The amount is stored as exactly 1000.1. Dates match the source dates. The row containing the formula is quarantined. | FR-IMP-033 |
| AC-104 | The identifier "001234567890123456789" arrives as CSV text; another identifier arrives as an XLSX number shown in scientific notation. | The first is stored exactly. The second's row is quarantined. | FR-IMP-032 |
| AC-105 | The same transactions arrive in overlapping exports imported under two different template versions. | One record exists per transaction; the overlap is recorded as repeat occurrences. | FR-IMP-015, FR-IMP-024 |
| AC-106 | The same merchant order ID appears in reports from two different gateway accounts in one workspace. | The records are not linked or matched across the two accounts. | FR-IMP-034, FR-REC-003 |
| AC-107 | A bank statement's opening balance differs from the previous statement's closing balance for the same account. (U) | A "Bank statement continuity break" exception is raised; no balance is adjusted. | FR-IMP-031 |
| AC-108 | A template is edited after an import has used it. | A new template version is created; the earlier import still shows, and was interpreted under, the old version. | FR-IMP-024 |
| AC-109 | Users preview, validate and export import results. | Record counts and checksums of source records are unchanged. | FR-IMP-026 |
| AC-110 | Two rows share amount and date but have different identifiers. | Neither is merged or excluded automatically; at most they are shown as "Possible duplicate". | FR-IMP-018 |
| AC-147 | An Analyst commits a revision that withdraws records. (U: OQ-14) | The revision takes effect only after approval by a different authorized user. | FR-IMP-019 |

*Reconciliation, exceptions and financial events*

| ID | Given / when | Then | Covers |
|---|---|---|---|
| AC-111 | A rerun happens with no change to inputs, rules or decisions. | No new or changed matches, exceptions or journal drafts; counts are unchanged. | FR-REC-068, FR-REC-062 |
| AC-112 | A candidate date window is changed. | Confirmed matches, exceptions and eligibility for automatic matching are unchanged. | FR-REC-008 |
| AC-113 | A run uses a `Partially imported` input. | The run results and every report built on them show the incomplete-data warning. | FR-REC-067 |
| AC-114 | A settlement report omits the fee column for a line. | The fee is recorded as "not reported", never calculated; any resulting difference becomes a discrepancy. | FR-REC-023 |
| AC-115 | A run completes over a period that has posted journals. | The posted journals' content and checksums are unchanged. | FR-REC-065 |
| AC-116 | A successful payment has no settlement line yet. | It shows as "Awaiting settlement" with its age and is never counted as reconciled in summaries. | FR-REC-024 |
| AC-117 | A group is confirmed whose members have mixed currencies, or whose gross amounts do not agree. | Confirmation is rejected. | FR-REC-041 |
| AC-118 | A settlement line references a payment attempt mapped as failed. | A "Settlement for non-successful attempt" exception is raised. | FR-REC-002 |
| AC-119 | A refund is linked to a payment, and a related exception is resolved. | The payment's stored source values are unchanged in both cases. | FR-FIN-004, FR-EXC-007 |
| AC-120 | Starting from a posted journal line, and then from a source row. | From the journal line, users reach its source rows, file version, import, match or exception, run and template version. From the source row, users reach every match, exception and journal that uses it. | FR-FIN-007 |
| AC-121 | A high-risk manual match awaits approval. (U: criteria) | It has no effect on reports, eligibility or drafts until a different authorized user approves it. | FR-REC-051 |
| AC-122 | An exception carrying a difference is resolved as "Outside reconciliation scope" or "Duplicate confirmed"; another is resolved as explained bank charges. (U) | The first needs approval by a different user. The second creates a linked accounting-review item. | FR-EXC-004, FR-EXC-006, FR-EXC-010 |

*Accounting*

| ID | Given / when | Then | Covers |
|---|---|---|---|
| AC-123 | An order is imported with no recognition evidence. | No revenue draft is generated; the order appears in the review queue when a trigger is configured. | FR-ACC-006, FR-ACC-032 |
| AC-124 | A draft generated from an event is discarded without a reason or approval; then the period is closed. (U) | The discard is rejected. The close checklist lists the event as having no posted journal. | FR-ACC-010, FR-ACC-030 |
| AC-125 | A second full reversal of the same entry is submitted, and so is a second opening entry. | Both are rejected by database constraints. | FR-ACC-013, FR-ACC-016 |
| AC-126 | The cutover date is changed after the first posting; an entry dated before cutover is submitted. (U for the first case) | The change is rejected. The pre-cutover posting is rejected. | FR-ACC-028 |
| AC-127 | A period close and a posting into that period run at the same moment. (U) | Either the posting commits before the close, or it is rejected. An entry is never posted into a closed period. | FR-ACC-031, FR-ACC-018 |
| AC-128 | A workspace has one user, who holds every role. | Posting is impossible; the UI explains why and offers no bypass. | FR-WSP-013 |
| AC-146 | A template version is activated by the user who drafted it, or without MFA. (U: OQ-31) | Activation is rejected. | FR-ACC-027 |

*Security, audit and data lifecycle*

| ID | Given / when | Then | Covers |
|---|---|---|---|
| AC-129 | A role is changed. | An audit event records actor, target, before and after roles, and time. Recommended: current Admins and the affected user are notified once notifications exist (M5/M8). | FR-WSP-005 |
| AC-130 | Each action type listed in NFR-DAT-004 is performed once. | Each produces exactly one audit event with the required fields. | NFR-DAT-004 |
| AC-131 | A user's email changes at the identity provider; separately, a new provider account reuses an old email address. | The first user keeps the same ClearSettle account. The new account gains no access to the old account. | NFR-SEC-001 |
| AC-132 | Logs are scanned after a test run that seeded known secrets, tokens, session IDs and file contents. | None of the seeded values appear in any log. | NFR-SEC-012 |
| AC-133 | A workspace B user searches, or requests cached responses, for data belonging to workspace A. | Nothing from A is returned. | NFR-SEC-016 |
| AC-134 | A non-permitted role, and then a permitted role, run the audit-history export. | The first is rejected. The second receives only its own workspace's events. | FR-RPT-009 |
| AC-135 | An evidence attachment of a disallowed type is uploaded; an allowed HTML or SVG attachment is downloaded. | The disallowed upload is rejected. The allowed file is served only as a download, with attachment disposition and `nosniff`, never rendered inline. | NFR-SEC-017 |
| AC-136 | Workspace B creates a record whose identifier already exists in workspace A. | Creation succeeds, and the response reveals nothing about workspace A. | NFR-SEC-007 |
| AC-137 | A member's download permission is revoked after a download was prepared for them. (U: mechanism) | The download is refused. Link issuance and the refusal are audited. | NFR-SEC-008 |
| AC-138 | A worker stalls past its lease while another worker takes over the job. | The stalled worker's later batch commit and status write are rejected by the lease-version check. | NFR-REL-001 |
| AC-139 | The database is restored to time T after a member was removed, a legal hold was set and data was deleted later than T. (U) | Before service resumes, all sessions are invalidated, the removal and the hold are re-applied, and the deletion is re-applied. | NFR-REL-007 |
| AC-140 | An Admin starts offboarding. (U: sequence) | MFA is required. Access is disabled. Running jobs start no new work. The export window opens. Legal holds block deletion. Every step is audited. | NFR-DAT-009 |
| AC-141 | The temporary-artifact cleanup runs. | Holding-area files and staging rows older than the configured period are deleted; quarantined rows are kept. | NFR-DAT-010 |
| AC-142 | The transaction that would trigger a notification rolls back. | No notification is sent. | FR-NTF-005 |
| AC-143 | A CSV export contains the text "-1+cmd", a text value starting with a tab, and the amount -250.00. | Both text values are neutralized; the amount is written as `-250.00`, unchanged. | FR-RPT-012, FR-IMP-025 |
| AC-144 | An XLSX file contains a document type declaration with an external entity. | The file is rejected or parsed without resolving the entity; nothing is fetched. | FR-IMP-030 |
| AC-145 | A user exceeds the rate limit for workspace creation, or for sending invitations. | Requests over the limit are rejected. | NFR-SEC-010 |

*Staged ledger scope (D-PRD-08, added 16 October 2026)*

| ID | Given / when | Then | Covers |
|---|---|---|---|
| AC-148 | Eligible settlement events arrive for an event type with no active, approved template version. Separately, a user tries to submit or post a draft for that event type. | No postable draft is generated. The events appear in the completeness list as awaiting an approved rule. Any draft for that event type is `Blocked` with reason "purpose not supported", and submitting or posting it is rejected for every role, Controllers included. | FR-ACC-004, FR-ACC-034, FR-ACC-030 |
| AC-149 | A Preparer writes a manual journal draft. (U: OQ-56 for which purposes are supported) | Unbalanced: it cannot be submitted. Purpose not on the supported list: it stays `Blocked` and cannot be posted by anyone. Supported purpose and balanced: the Preparer cannot approve it through the UI, the API or a replayed request; a different Controller who meets the MFA requirement approves it and it posts exactly once into an open period. After posting it cannot be edited, only reversed through the approved correction workflow, and each step appears in the audit history. | FR-ACC-009, FR-ACC-034, FR-ACC-011, FR-WSP-010, FR-ACC-013 |
| AC-150 | For one period, gateway transactions and settlement reports are imported but no bank statement; one import is `Partially imported`; two manual drafts are unposted; no manual-journal purpose beyond corrections is supported. The trial balance, profit and loss and balance sheet are generated and exported to CSV and XLSX. | Each report and each export shows: the covered period; the source categories and accounts present and absent, with data cut-offs; the partial import; the supported posting purposes; the count of unposted drafts; the known exclusions; open critical items. No report or export states or implies that it covers the business's whole activity. | FR-RPT-003, FR-RPT-013, FR-RPT-015 |
| AC-151 | A period contains bank transactions classified outside gateway reconciliation, drafts blocked as "purpose not supported" and cross-currency items without journals. The period-close checklist and accounting reports are produced. (U: OQ-02 classification; criticality per FR-ACC-019) | These items are listed as not accounted for, with counts and amounts per currency. None is shown as reconciled or recorded. Closing the period requires them to be cleared or acknowledged with a rationale. | FR-ACC-030, FR-ACC-034, FR-ACC-019, FR-RPT-015 |

*Workspace and accounting-entity model (D-PRD-09, added 16 October 2026)*

The first required negative test (no access to another workspace's financial records without membership and permission) is AC-070, together with AC-073 for missing permission inside a workspace. The other four required tests are below.

| ID | Given / when | Then | Covers |
|---|---|---|---|
| AC-152 | User U belongs to workspace A only. U sends requests with the active-workspace identifier changed to workspace B in every place a client can supply it, for records of B and for records of A. | Every request is rejected. The response does not reveal whether B or its records exist. Nothing in B is read or written, and A's records are not returned under B's identifier. Recommended: the attempt is logged as a security event. | FR-WSP-016, NFR-SEC-006 |
| AC-153 | User U belongs to workspaces A and B, views A's ledger, journals and exceptions, then switches explicitly to B, including while one of A's requests is still in flight. | After the switch, no A data appears in B's screens, client caches, UI state, search, suggestions, downloads or notifications. The late A response is not shown in B's context. Returning to A requires another explicit switch. | FR-WSP-017, FR-WSP-008, NFR-SEC-016 |
| AC-154 | With A active, a user: runs a report whose parameters name B's accounts, periods or runs; starts an export; requests a download of B's file; queues a job that references B's records; triggers a notification about A. | The report and export contain only A's data, and parameters naming B are rejected. The download is refused. The job fails without reading or writing B (as in AC-071). The notification reaches only current, permitted members of A (as in AC-079). File links follow AC-077. | FR-WSP-017, NFR-SEC-007, NFR-SEC-008, FR-RPT-010, FR-NTF-004 |
| AC-155 | Workspace A has a financial year of 1 April–31 March and its own Chart of Accounts. Workspace B has 1 January–31 December and a different Chart of Accounts. The same user is Preparer in both. With A active, a journal line is created that references B's account, or a journal is dated into a period defined only by B. | Both are rejected by the service check and by the composite database constraints. Each workspace's periods follow its own financial year. Opening balances, cutover and trial balances are computed per workspace, and no record in A refers to a record in B. | FR-WSP-015, FR-ACC-001, FR-ACC-002, FR-ACC-022, NFR-SEC-007 |
| AC-156 | A user belongs to two workspaces, creates a third, and switches between them. | The workspace switcher lists only the user's own memberships. No screen, report, export or API response combines financial data from two workspaces. Creating the workspace produces an audit event; each switch is recorded as a security event (Recommended). | FR-WSP-018, FR-WSP-001, NFR-DAT-004 |

*Authentication session architecture (D-SEC-11, added 16 October 2026)*

Criteria marked (U) test a value or policy that is still open; they are revised when the open question is decided.

| ID | Given / when | Then | Covers |
|---|---|---|---|
| AC-157 | The authorization request is inspected. Callbacks are then sent with a wrong `state`, with an authorization code from a different login attempt (so the PKCE verifier does not match), with a mismatched `nonce`, and with ID tokens that have a wrong issuer, wrong audience, expired `exp` or invalid signature. | The authorization request carries `response_type=code`, a `code_challenge` using `S256`, `state` and `nonce`. Every tampered callback is rejected, no session is created, and each failure is recorded as a security event. | NFR-SEC-001, NFR-SEC-025 |
| AC-158 | The provider's client registration is reviewed, and a login is attempted with an unregistered or altered redirect URI. | Only exact redirect URIs are registered. The provider refuses the altered URI and delivers no authorization code to it. | NFR-SEC-001 |
| AC-159 | After sign-in, the browser's cookies and storage are inspected. (U: `SameSite` value, OQ-57) | The session cookie is `HttpOnly` and `Secure`, has no `Domain` attribute, has `Path=/`, uses the `__Host-` prefix where the deployment allows it, and carries the `SameSite` value chosen under OQ-57. Page scripts cannot read it. No access, refresh or ID token is present in `localStorage`, `sessionStorage`, IndexedDB or any script-readable cookie. | NFR-SEC-021, NFR-SEC-002 |
| AC-160 | State-changing requests are sent with no CSRF token, a forged token, another session's token, and without the required custom header. Separately, every GET, HEAD and OPTIONS endpoint is inventoried. | All four requests are rejected and nothing changes. No GET, HEAD or OPTIONS endpoint changes state. | NFR-SEC-022 |
| AC-161 | A page on another site submits a form POST (a request that needs no CORS preflight) and a credentialed script `fetch` to a state-changing ClearSettle endpoint. | The form POST reaches the server and is rejected by the CSRF defense, not by CORS. The script request is either blocked at the CORS preflight or rejected by the CSRF defense; either way nothing changes and the other site cannot read the response. No `Access-Control-Allow-Origin` grant exists for other origins. | NFR-SEC-020, NFR-SEC-022 |
| AC-162 | A user signs in, works and signs out. Separately, sessions are left idle past the idle limit and active past the absolute limit. (U: limits, OQ-38) | The session ID changes at sign-in. After sign-out the old cookie is refused and the cookie is cleared. Idle and absolute expiry are enforced at the configured values, and the user is warned before expiry where practical. | NFR-SEC-023, NFR-SEC-005 |
| AC-163 | A user with sessions in two browsers, served by two application instances, chooses "sign out everywhere". Separately, a user is removed from every workspace. | Both sessions are refused on their next request, on any instance. The removed user's sessions are invalidated, and authorization fails on the next request regardless. | NFR-SEC-023, NFR-SEC-005, FR-WSP-014 |
| AC-164 | A Controller attempts a sensitive operation whose required authentication evidence is missing or too old. During the step-up, a different person signs in at the provider. Separately, the step-up succeeds for the right person. (U: operations and windows, OQ-38) | The first attempt is rejected with a step-up response. The different-person sign-in ends the session and performs nothing. After a successful step-up, the pending operation is not executed until the user reviews and confirms it again. | NFR-SEC-024, NFR-SEC-004 |
| AC-165 | A test identity provider issues tokens with the expected strength or recency claims missing, or with insufficient values. | Sensitive and privileged operations are refused (fail closed). | NFR-SEC-003, NFR-SEC-024 |
| AC-166 | The production frontend build and its deployment are inspected. | The frontend and the API are served from one origin. The logged-in frontend is served as client-rendered assets. No Next.js server holds a session or renders authenticated financial data. The client bundle contains no secrets. | NFR-SEC-020, NFR-OPS-007 |
| AC-167 | A member queues an export, then is removed from the workspace before the job runs. Separately, the job's output is requested after the member's download permission is removed. | When the job runs it re-checks membership and permission, aborts, and records an audit event. The download is refused (as in AC-137). | NFR-SEC-027 |
| AC-168 | A test run covers sign-in, a failed sign-in, step-up, logout, sign out everywhere and a CSRF rejection. Logs are then scanned for seeded session IDs, tokens and authorization codes. | Each event appears as a security event with a correlation ID. No session ID, token, authorization code or secret appears in any log. | NFR-SEC-025, NFR-SEC-012 |

### 12.2 Nonfunctional requirements without a section above

| ID | Requirement | Label | Decisions |
|---|---|---|---|
| NFR-PERF-001 | The default import limits (FR-IMP-003) must be validated by load tests on production-like infrastructure before production, against a processing-time target the owner approves. | Mandatory (validation); Unresolved (target, OQ-44) | D-IMP-09 |
| NFR-PERF-002 | Parsing streams the file in bounded batches. A test proves that peak memory for a file at the row limit stays within the configured heap budget. | Recommended | D-IMP-10 |
| NFR-PERF-003 | Every list endpoint is paginated on the server with a bounded page size. The browser never sorts or filters full datasets. | Mandatory | Checklist §4, §6 |
| NFR-PERF-004 | Baseline latencies for key API and workflow operations are measured before production. No latency targets are approved yet. | Mandatory (measurement); Unresolved (targets) | Checklist #90 |
| NFR-UX-001 | Accessibility target, browser support and device support follow OQ-46. Recommended: WCAG 2.2 AA. | Unresolved | OQ-46 |
| NFR-UX-002 | Amounts always show their currency and use locale-aware formatting. Debit, credit and negative values are unambiguous. Status is never shown by colour alone. | Mandatory | Checklist §4 |
| NFR-UX-003 | UI is designed and built with the `frontend-design` skill, only after implementation is authorized and the design proposal is approved. No UI work happens in the current phase. | Mandatory | D-UI-01, D-UI-05, D-PRC-01 |
| NFR-UX-004 | Times are shown with time-zone context, and the canonical event time is never confused with browser-local time. | Mandatory | Checklist §4 |
| NFR-UX-005 | Every data view handles loading, empty, partial, error and retry states. A failed request is never shown as zero or as an empty result. | Mandatory | Checklist §4 |
| NFR-UX-006 | Financial actions are never applied optimistically in the UI. Duplicate submission is prevented in the UI and enforced idempotently in the backend. | Mandatory | Checklist §4 |

### 12.3 Test strategy and coverage expectations

| Level | Must cover | Notes |
|---|---|---|
| Unit | Parsing and validation rules; the auto-match decision table (FR-REC-003); settlement arithmetic; event linking; journal validation; state machines (imports, exceptions, journals, periods, jobs) | Tests must be able to fail when the logic is wrong (checklist §2, L34). |
| Integration (real PostgreSQL) | Migrations (fresh and upgrade); constraints (uniqueness, cross-workspace keys, posting uniqueness); RLS fail-closed behaviour; transaction rollback; row locking; idempotency keys; audit append-only privileges | Never use an in-memory substitute for PostgreSQL-specific behaviour. |
| API | The full §2.3 permission matrix: every endpoint against an allowed role, a denied role, a non-member and another workspace. HTTP semantics. Validation errors. Mass-assignment attempts. | The matrix test is generated from the permission table so no endpoint is skipped. |
| Import fixtures | Fixtures built from owner-supplied anonymized samples (OQ-07): malformed files, encodings, Indian formats, overlapping exports, revisions, limits | Test fixtures must not contain real customer data. |
| Reconciliation scenarios | A curated dataset with expected outcomes for every exception type in FR-EXC-003 and every AC-020 to AC-039 case | Kept as regression fixtures. |
| Accounting golden scenarios | Expected journal outcomes for each §8.10 scenario, written and reviewed by a qualified accountant once policies are approved | A balanced journal can still be economically wrong; only reviewed expectations catch that (AF-91). |
| Concurrency | Simultaneous runs, manual matches, approvals, imports of the same file, and duplicate submissions; a period close racing a posting or draft generation; a revision commit or period reopen racing an active run; stalled workers whose lease has expired | Run repeatedly to expose race conditions. |
| Failure and recovery | Database unavailability, storage timeouts, killed jobs, exhausted retries, restore drills | Operational exercises produce recorded evidence. |
| End-to-end (browser) | J1–J12, especially the release-gate path J2 → J10 | Uses synthetic data. |
| Security | Tenant isolation, role escalation, IDOR, CSRF, XSS, upload abuse (zip bombs, formula injection), rate limits, session revocation | Independent review before production (§13.3). |
| Authentication and sessions | The authentication spike's evidence (M0), plus AC-131, AC-152 and AC-157 to AC-168:<br>• login and callback negative tests;<br>• cookie attributes and the absence of browser-held tokens;<br>• CSRF and cross-site requests;<br>• the session lifecycle and sign out everywhere across instances;<br>• fail-closed step-up, same-user re-authentication and no replay;<br>• job re-authorization and authentication-event logging. | Run against a real OIDC provider (a local provider in development and CI), not mocks of the protocol. |
| Performance | The import-limit load tests (NFR-PERF-001), memory bounds, list endpoint latency baselines | Results recorded, not assumed. |
| Accessibility | Keyboard navigation, focus, contrast and screen-reader checks against the OQ-46 target | — |

**Traceability rule:** every Mandatory requirement maps to at least one acceptance criterion or test, and every test names the requirement it covers.

**Coverage status (16 October 2026, after D-PRD-08, D-PRD-09 and D-SEC-11):** 140 of the 192 requirements with a Mandatory part are named by at least one acceptance criterion in §12.1. The other 52 are mostly operational, UX, structural and reporting requirements: environments, CI, migrations, health checks, observability, formatting and UI states, report contents, and exception record fields. Each of them must be mapped to a named test, configuration review or operational exercise in the implementation status document before its milestone exits. The list is in audit finding AF-117. The implementation status document (implementation plan §6) records the evidence for each one. A requirement is "verified" only with recorded test or exercise evidence, never because code exists (checklist §1, L22).

---

## 13. Deferred features, unresolved questions, professional review and excluded guarantees

### 13.1 Deferred features

As listed in register §2.13:
- D-DEF-01: marketing landing page;
- D-DEF-02: direct gateway integrations;
- D-DEF-03: public API;
- D-DEF-04: full GST compliance;
- D-DEF-05: general many-to-many matching;
- D-DEF-06: FX reconciliation and FX accounting;
- D-DEF-07: cash-flow statements, budgeting, forecasting and analytics.

No requirement in this specification implements any of them. Adding one needs the owner's approval with its scope and dependencies stated (D-PRD-06).

### 13.2 Unresolved questions

All open questions are in [register §3](clearsettle_decision_register.md#3-open-decisions): 53 are open (OQ-02, OQ-04 to OQ-34 and OQ-36 to OQ-57; OQ-30 is retired). Three were resolved on 16 October 2026 and are kept in register §3.5 for traceability:

- OQ-01 (ledger completeness), resolved for product direction by D-PRD-08;
- OQ-03 (workspace and accounting-entity model), resolved by D-PRD-09;
- OQ-35 (session architecture), resolved for the architectural choice by D-SEC-11.

These open questions most change what gets built:

| OQ | Topic | Needed before |
|---|---|---|
| OQ-56 | Which manual-journal purposes the initial release supports, and their approved treatment | Posting manual journals beyond opening balances and corrections (M6) |
| OQ-05 | Platform operator access | Foundation design (M1) |
| OQ-07, OQ-08 | First gateways and banks; sample files; schemas | Imports (M2) |
| OQ-09 | Same identifier with different values | Imports (M2) |
| OQ-14, OQ-15, OQ-17 | Risk criteria; accepted differences; scope of separation of duties | Exception workflow (M5), journals (M6) |
| OQ-19 | Cross-currency items and functional currency | Reconciliation (M3) and accounting automation (M7) |
| OQ-23, OQ-24, OQ-25 | Posting rules, revenue triggers, cutover straddles | Accounting automation (M7) |
| OQ-34, OQ-57 | Identity provider; session cookie `SameSite` value (both decided after the authentication spike) | Foundation (M1) |
| OQ-41 | Retention periods | Lifecycle hardening (M9) and production |
| OQ-51, OQ-52 | "Unreconciled balances" at close; year-end close | Accounting core (M6) |

### 13.3 Professional review required

| Area | What needs review | Reviewer |
|---|---|---|
| Accounting policy | Default Chart of Accounts; event-to-journal templates; revenue-recognition triggers; supported manual-journal purposes and their treatment; cutover, opening-balance and closed-period correction treatment; write-off policy; numbering; whether statements are management or statutory reports (OQ-15, OQ-23 to OQ-28, OQ-32, OQ-56) | Qualified accountant familiar with the reporting framework the target businesses use in India |
| Tax | Preserving tax fields; tax ledger accounts; treatment of tax on gateway fees (OQ-33). GST compliance itself is deferred. | Qualified tax adviser |
| Legal and privacy | Retention periods per category and jurisdiction; legal holds; offboarding and deletion, including backups; applicable data-protection law (for example India's Digital Personal Data Protection Act, 2023) and its rules; customer terms, privacy policy and data-processing terms; data-residency expectations; whether any payment-sector regulation applies to a reporting-only product (OQ-04, OQ-41, OQ-42) | Qualified Indian legal counsel |
| Security | The approved session architecture (D-SEC-11) and its spike evidence; the cookie `SameSite` value (OQ-57); MFA enforcement and the provider strength mapping; MFA enrollment and recovery (NFR-SEC-026); tenant isolation design; operator access; handling of card numbers if uploaded (PCI DSS questions); key management; penetration test before production (OQ-05, OQ-34, OQ-39, OQ-40, OQ-55, OQ-57) | Independent security reviewer |

This specification does not provide professional advice and makes no compliance determination.

### 13.4 Explicitly excluded guarantees

This specification and the documents behind it do **not** establish or claim that:
1. ClearSettle complies with any law, regulation, accounting standard, tax rule or security standard;
2. its financial statements are statutory financial statements (OQ-32), or are complete for a business's whole activity. The full-ledger direction is staged (D-PRD-08), and in the initial release the statements disclose their coverage (FR-RPT-015) rather than claim completeness;
3. a 50 MB or 250,000-row file will be processed within any particular time, or at all, on a particular deployment, before load testing (D-IMP-09);
4. recovery within RPO ≤ 1 hour and RTO ≤ 4 hours is guaranteed to customers; these are internal engineering targets (D-OPS-06);
5. the audit trail is tamper-proof or immutable beyond the application-level controls described (D-DAT-02);
6. reconciliation is complete or correct where source reports are incomplete, wrong or missing; ClearSettle surfaces gaps but cannot invent missing evidence;
7. the system is secure, production-ready or financially correct because these controls are written down; only the evidence required by D-REL-01 can support such statements;
8. the approved authentication architecture (D-SEC-11) is secure on its own. It reduces specific risks, and only implemented and tested controls can support a security claim.
