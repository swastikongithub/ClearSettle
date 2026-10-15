> **SUPERSEDED — retained for traceability only.** This is the pre-consolidation decision register, preserved verbatim below this notice on 15 October 2026. Do not use it as a source of current decisions. The current register is [`../clearsettle_decision_register.md`](../clearsettle_decision_register.md); its section 5 records what happened to every entry in this version.

# ClearSettle — Product & Engineering Decision Register

**Status:** Discovery and specification  
**Rule:** No application implementation until the owner explicitly approves the specification and authorizes implementation.

This register separates confirmed choices, current working directions, and open decisions. A proposal is not an approved decision merely because it appears in a checklist or an AI-generated review.

## 1. Confirmed choices and current direction

| Area | Current decision / direction | Status |
|---|---|---|
| Core product | Payment reconciliation: import financial records, match them, surface discrepancies, and support traceable resolution. | Confirmed |
| Initial data ingestion | Start with CSV and Excel report uploads rather than direct payment-gateway API integrations. | Confirmed |
| Initial record categories | Merchant orders, payment-gateway transactions, payment-gateway settlement reports, and bank statements. | Agreed; detailed formats remain open |
| Payment-attempt model | Each payment attempt is a separate record linked to its order. Failed/cancelled attempts remain traceable but are not treated as successful payments or settlement candidates; successful captured/paid attempts may proceed to settlement reconciliation according to the provider data. Multiple successful transactions linked to one order must remain distinct and be evaluated, not silently merged. | Agreed; handling of ambiguous or duplicate successful captures remains open |
| Matching policy | Use source-specific exact identifiers as the primary match evidence, validate the relationship-specific amount semantics and currency, and never auto-match on amount/date similarity alone when a reliable identifier is missing or ambiguous. | Approved; exact per-stage keys/rules remain open |
| Audience | Build with individual merchants, finance/accounting teams, and SaaS/online businesses in mind, with room to expand later. Avoid implementing every advanced workflow in the first release. | Confirmed broad ambition; first-release priorities remain open |
| Product type | A reconciliation-focused platform, not a general-purpose fintech suite at the outset. Multi-tenant use is the current direction, but tenant boundaries need explicit definition. | Working direction |
| Backend/data baseline | Java + Spring Boot, PostgreSQL, modular monolith. | Current working architecture; final approval still required |
| Frontend framework | Next.js App Router + React is the selected direction for one frontend application with separate marketing, authentication, and workspace experiences. Marketing landing-page implementation is deferred. | Selected direction; exact versions and dependencies remain open |
| Frontend language | JavaScript is the current choice; do not introduce TypeScript without explicit approval. | Current choice; verify before setup |
| Design reference | Stripe is the benchmark for professional polish, whitespace, typography, clarity, and visual craft. | Confirmed reference, not a request to clone Stripe |
| Authentication visual reference | Clean, restrained form paired with a flowing multicolour animated background, based on the screenshot supplied. | Reference captured; precise specification remains open |
| Marketing visual reference | A polished landing page and a pointer-responsive radial/petal-like visual. ClearSettle's implementation should be original. | Reference captured; precise specification remains open |
| UI governance | No unapproved redesigns. Claude must follow the user-approved UI specification and ask before making visual or interaction changes outside it. | Confirmed rule |
| Engineering approach | Track requirements, justify deferrals, fix root causes, and verify behavior with meaningful tests. | Confirmed process rule |
| AI features | No AI/LLM feature by default unless later requested. | Current direction |
| Implementation timing | Stay in discovery/specification until the owner explicitly authorizes implementation. | Confirmed rule |
| Marketing landing page | Deliberately deferred until the core application is complete. Keep the previously discussed Stripe references and proposed frontend technologies as notes only; do not implement the landing page now. | Confirmed deferral |

## 2. Key product decisions to settle first

### Decision 1 — MVP reconciliation workflow

**Agreed:** Model reconciliation as two linked stages, with a traceable chain across all four record categories rather than one opaque matching operation.

1. **Payment-to-settlement reconciliation:** connect merchant orders to payment-gateway transactions, then connect gateway transactions to gateway settlement records. Account for applicable fees, refunds, adjustments and timing differences.
2. **Settlement-to-bank verification:** connect gateway settlement payout/credit records to bank-statement credits to verify that expected funds reached the merchant's bank account.

The four agreed initial data categories are merchant orders, payment-gateway transactions, payment-gateway settlement reports, and bank statements. The landing page remains deferred until the core application is complete.

**Still open:** detailed matching rules and evidence for each link; settlement batches and partial settlements; the treatment of ambiguous or duplicate successful captures; and the exact conditions that count as a successful match. These must be agreed before implementation.

**Agreed payment-attempt behavior:** each attempt is retained as a separate record linked to its order. Failed or cancelled attempts remain visible for traceability but do not count as successful payments or proceed as successful settlement candidates. Successful captured/paid attempts can be reconciled against settlement details using the source provider's status semantics. If an order has multiple successful transactions, keep them separate; do not automatically merge them. Whether they represent legitimate split payments or a duplicate capture must be determined from evidence and may require an exception.

### Decision 2 — Matching shapes

**Approved MVP scope:**
- **One-to-one:** one record matches one record.
- **Grouped one-to-many / many-to-one:** one record may be reconciled against multiple records on the other side, in either direction. Example: one settlement batch or bank credit covers multiple underlying transaction or settlement records.
- **Many-to-many:** defer from the MVP. Do not implement arbitrary matching groups on both sides until a validated use case and source formats require it.

**Approved matching policy:** use source-specific exact identifiers as the primary evidence for automatic matching. Validate currency and amount using the correct financial meaning for that relationship (for example, gross payment amount versus settlement net amount after fees must not be compared as if they were interchangeable). An exact reference with a valid relationship-specific amount/currency check may be auto-matched. A reference match with an unexpected amount or currency is a discrepancy, not a successful match. If a reliable identifier is missing or ambiguous, amount/date similarity may be used to suggest candidate records for review, but must not by itself trigger an automatic match. Date windows are plausibility/candidate filters, not proof. Persist the match evidence and the version of the rule that produced the outcome.

**Remaining detail:** define the exact source-specific identifier keys, amount semantics, tolerances and date windows separately for each relationship: orders ↔ gateway transactions, gateway transactions ↔ settlement details, and settlement payouts ↔ bank credits.

### Decision 3 — Financial edge cases

For each record type, define the treatment of:
- Fees, taxes on fees, refunds, partial refunds, chargebacks, reversals, and adjustments.
- Partial settlements and settlement delays across statement periods.
- Duplicate records and repeated file imports.
- Missing references, amount differences, date-window matching, and rounding tolerance.
- Currency precision and whether multi-currency is part of the MVP.

No matching rule should silently label a discrepancy as resolved without a recorded, explainable reason.

### Decision 4 — Meaning of reconciliation versus a ledger

**Open:** Is ClearSettle only a reconciliation and audit platform, or will it maintain its own accounting/general ledger and post journal entries?

A reconciliation product does not automatically need a double-entry ledger. Decide this before designing data models or calling the system a ledger.

### Decision 5 — First-release user and tenant model

**Current audience ambition:** merchants, finance/accounting teams, and SaaS/online businesses.

**Open:** What represents a tenant (a business, legal entity, merchant account, or an accounting firm managing clients)? What roles exist, and who may import, match, resolve, approve, administer, and export?

### Decision 6 — Import contracts

**Confirmed direction:** file uploads first.

**Open:**
- CSV and XLSX both at launch, or CSV first with XLSX shortly after?
- Which initial provider/bank templates are in scope?
- Fixed provider templates or saved user-defined column mappings?
- How are invalid rows reported: reject the whole file or quarantine invalid rows with explicit results?
- How are repeated files and duplicate rows detected?
- File size, row count, parsing limits, retention, private storage and deletion requirements.
- Reject or mask sensitive card/bank account values that ClearSettle does not need to retain.

### Decision 7 — Exception lifecycle and audit history

**Open:** Define states and available actions (for example: new, under review, resolved, reopened), mandatory reason codes, manual matching, duplicate marking, write-off/ignore policy, and any approval requirement.

Every resolution should capture actor, timestamp, reason, and before/after state in an append-only audit trail. Decide whether manual matches persist when a reconciliation is rerun or rules change.

### Decision 8 — Output and reporting

**Open:** Which reports are essential for the first release? Candidate outputs include reconciliation summary, matched/unmatched details, fee/refund breakdown, aged exceptions, settlement-to-bank differences, and audit export.

### Decision 9 — Authentication and sessions

**Open:** Choose the authentication model before implementing security controls. Define signup/invitations, password reset, session expiry and revocation, MFA expectations, account recovery, tenant membership, and provider login only if needed.

### Decision 10 — Real product or portfolio demonstrator

**Open:** Will ClearSettle initially process real business data for actual users, or is the first release a portfolio/demo application using synthetic/sample data? This changes the launch gate, operational controls, data retention expectations and acceptable risk.

## 3. Frontend choices still to settle

| Area | Candidate / question |
|---|---|
| Framework | Next.js + React is the preferred direction; confirm final choice and version when implementation is authorized. |
| Language | Explicitly confirm JavaScript versus TypeScript before scaffolding. |
| Styling | Tailwind CSS plus custom CSS/design tokens is the current proposal. |
| Accessible primitives | Radix UI is a candidate for behavior and accessibility without dictating visuals. |
| Server-state management | TanStack Query is a candidate; choose one consistent approach. |
| Dense transaction tables | TanStack Table is a candidate; server-side pagination/filtering/sorting should be considered. |
| Forms/runtime validation | Choose form handling and runtime validation. TypeScript types alone do not validate API responses or imported files. |
| Motion | Motion for React is a candidate for regular UI motion. |
| Signature marketing graphics | Choose CSS/SVG/Canvas/WebGL only after defining desired behavior and performance requirements. |
| App layout | Still open: information architecture for dashboard, imports, runs, exceptions, match detail, audit and rules/settings. |
| Responsive behavior | Decide desktop/tablet/mobile behavior, especially dense tables and the responsive animation. |
| Accessibility | Set target standard (recommend WCAG 2.2 AA as a proposal, not yet a decision). |
| Theme and locale | Decide dark mode, display timezone, locale-aware amount/date formats, and currency display rules. |

## 4. Architecture and operational choices still to settle

- Java/Spring Boot and PostgreSQL versions; Maven or Gradle; Flyway or Liquibase.
- Module boundaries and how the modular monolith enforces them.
- Database-backed jobs versus a durable queue, based on processing duration and restart guarantees.
- Private object storage versus another file-storage approach; avoid relying on ephemeral local disk for production files.
- REST API error format, identifier format, and cursor versus offset pagination.
- Same-origin versus separate frontend/backend deployment; affects cookies, CORS and CSRF.
- Hosting target, backup and restore objectives, uptime expectations, monitoring and incident response.
- Repository setup and Git workflow.

## 5. Traceability and verification rules

For every requirement, eventually record:
1. Requirement ID and source (original 110-concept list, Gemini anatomy document, product decision, or security/financial requirement).
2. Priority and decision: implement in MVP, later/conditional, or not applicable with a reason.
3. Where it is addressed (module, endpoint, UI workflow, configuration, or operations runbook).
4. How it will be tested or otherwise verified.
5. Evidence/status; do not call an item verified merely because code exists.

## 6. Documentation corrections identified in the initial review

These were identified by reviewing the current starter documents and should be corrected when edits are authorized:
- `CLAUDE.md` and `docs/README.md` refer to `clearsettle-master-engineering-checklist.md`, while the provided file is named `clearsettle_master_engineering_checklist.md`.
- `docs/README.md` refers to `gemini-vibe-coding-anatomy.md`, while the provided source file is named `the_complete_anatomy_of_a_vibe_coded_software_system.md`.
- The checklist wording that suggests careful implementation may proceed conflicts with the README's instruction not to implement until approved. The no-implementation-until-approved rule takes precedence.
- `CLAUDE.md` requests an implementation-status document, but none currently exists. Add one only when its intended fields and update process are agreed.

## 7. Recommended next discussion

**Decision 1 (workflow shape), Decision 2 (MVP matching shapes), and the payment-attempt behavior are agreed at the product-direction level.** The next discussion should define the exact matching evidence and success criteria for each relationship:

1. Orders ↔ payment-gateway transactions: define the reference keys, amount/currency checks, and treatment of ambiguous or duplicate successful captures. Failed/cancelled attempt representation is agreed above.
2. Payment transactions ↔ settlement detail: link gateway transactions to settlement line items, including how fees, refunds, reversals, and adjustments are represented.
3. Settlement payouts ↔ bank statement credits: verify that expected payout amounts appear in the bank, including timing differences and grouped credits.

This is still a proposed workflow, not an approved detailed financial specification. After source-to-source links are defined, settle the remaining financial edge cases and whether ClearSettle maintains a ledger. Those decisions determine the domain glossary, imports, data model, matching engine, exception workflow, tests, and main screens.

**No implementation authorization is implied by this document.**
