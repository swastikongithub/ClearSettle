# ClearSettle — Approved Decisions Seed

**Purpose:** Transfer the product decisions approved in ChatGPT into the ClearSettle repository so Claude Code can use them without relying on this conversation.

**Document status:** Initial decision seed assembled from the recorded product-discovery discussion. It is not yet the complete product specification. Claude must preserve the distinctions between approved decisions, proposed implementation details, deferred scope, and unresolved questions.

## Instructions for Claude Code

1. Treat the items in **Approved decisions** below as product-owner-approved requirements unless the item explicitly says it is a target, proposal, or needs validation.
2. Do not assume you can access the ChatGPT conversation. This file is the available record of decisions from that discussion.
3. Do not silently change or weaken an approved decision. If two requirements appear to conflict, report the conflict and recommend a resolution.
4. Do not turn recommendations into approved decisions unless this file records approval.
5. Preserve unknowns as unresolved. Do not invent accounting policies, statutory retention periods, financial thresholds, legal conclusions, identity/storage vendors, or production guarantees.
6. During the current consolidation phase, do not implement application features. First validate this seed against the repository, then update the decision register and create a coherent product specification and implementation plan for review.

---

## 1. Product direction and scope

- **Product:** ClearSettle, a payment reconciliation and accounting platform for businesses.
- **Launch customer:** Finance and accounting teams at small and medium-sized businesses (SMBs).
- **Launch market:** India-first, while keeping the architecture globally extensible.
- **Longer-term audience:** Individual merchants/small businesses and SaaS/online businesses may be supported over time, but the first release should optimize for SMB finance/accounting teams.
- **Product ambition:** Build a production-oriented product for potential real businesses, not merely a portfolio demonstrator. This ambition does not itself prove production readiness or legal compliance.
- **MVP product boundary:** Reconciliation plus a double-entry accounting ledger and core accounting workflows.
- **Marketing landing page:** Deferred until the core application works end-to-end. Its design references may be documented, but do not implement it prematurely.
- **Input data for MVP:** CSV and Excel (XLSX) report uploads. Direct payment-gateway integrations are deferred.
- **No blanket scope expansion:** General many-to-many matching, public APIs, full GST compliance, and advanced finance features described below are deferred.

## 2. Technology direction already selected

- Backend: Java with Spring Boot.
- Database: PostgreSQL.
- Frontend: Next.js, React, and JavaScript (TypeScript has not been selected in the recorded decision).
- Application architecture: modular monolith, with frontend and backend separated and communicating through REST/JSON APIs.
- Internal APIs are in scope. A customer-facing public API is deferred.
- Use Anthropic's `frontend-design` skill for frontend design and implementation tasks once implementation is authorized.
- Claude should use strong reasoning, relevant tools/skills, testing, and review proactively, but must respect approved scope and ask before materially changing approved product decisions or UI specifications.
- Prefer useful simplicity to speculative infrastructure or overengineering.

## 3. Data sources and reconciliation stages

Four source-data categories are in scope:

1. Merchant orders.
2. Payment-gateway transactions/payment attempts.
3. Gateway settlement reports.
4. Bank statements.

Two linked reconciliation stages are in scope:

1. **Payment-to-settlement reconciliation.**
2. **Settlement-to-bank verification.**

### Payment attempts

- Each payment attempt is a separate, traceable record linked to an order where supported by evidence.
- Failed and cancelled attempts remain traceable but do not count as successful payments.
- Successful payments move into settlement reconciliation.
- Multiple successful attempts must not be silently merged.
- A set of successful payments must not be automatically aggregated merely because their amounts sum to the order total. Automatic aggregation requires explicit evidence that split payments are valid for that order; otherwise, flag the case for review.

### Matching strategy

- Exact identifiers are the primary matching evidence. Amount and currency are safeguards.
- Matching references plus correct amount/currency may be eligible for automatic matching, subject to the applicable stage-specific rules and there being no contradictory evidence.
- A matching reference with an amount mismatch is a discrepancy, not an automatic match.
- Missing or ambiguous references may produce candidate suggestions, but amount/date similarity alone must not trigger automatic matching.
- No blanket amount tolerance is allowed in the MVP. Small unexplained differences must still be flagged. Legitimate differences must be explained by explicit rules for documented fees, taxes, refunds, rounding, or other adjustments.
- Configurable date windows may help find candidates, but dates alone never authorize a match and cannot override contradictory identifiers, amount, or currency.
- Preserve original source-reported values. Never overwrite one source's value with another source's value to eliminate a mismatch.
- Exact identifiers establish candidate relationships; they do not override contradictory financial evidence.

### Identifier hierarchy

**Stage 1 — Order/payment:**
- Prioritize merchant order ID and its gateway order reference.
- Use gateway transaction/payment IDs and reliable relationships linking those IDs to the order.
- Other documented references can be supporting evidence, not substitutes for a confirmed relationship.

**Stage 2 — Settlement/bank:**
- Prioritize gateway settlement/payout references linked to bank references such as UTRs when available.
- Use relationships among the settlement report and underlying gateway transactions.
- Amount, currency, dates, fees, and adjustments validate the relationship; they do not independently prove a match.

### Match relationships

- Support one-to-one matching and grouped one-to-many/many-to-one matching in the MVP.
- Defer general many-to-many matching until a concrete requirement is established.
- Grouped matches require a supported relationship, compatible currencies, and amounts that reconcile under explicit rules.
- Do not group transactions just because amounts happen to add up.
- For gross-payment comparisons, amounts must agree under the relevant rule. For net settlements, documented fees, taxes, refunds, and other adjustments may explain the difference.
- Ambiguous groups must be proposed for review rather than automatically confirmed.
- Preserve links to every underlying transaction and the group’s audit history.

### Manual matching and unmatching

- Authorized users can manually match transactions where automatic matching cannot establish a reliable relationship.
- Manual matches require a reason and supporting evidence, enforce amount/currency checks, prevent prohibited/duplicate relationships, and retain a full audit trail.
- Risky cases follow the risk-based approval process.
- Authorized users may undo an incorrect match with a required reason. Preserve the original match and history; do not erase it.
- If a match affected posted accounting, handle resulting accounting changes through the approved correction workflow. Closed-period controls still apply.

### Discrepancies and exceptions

- Use structured exception management with statuses including `Open`, `Investigating`, `Awaiting information`, and `Resolved`.
- Each exception records an owner, reason, comments, supporting evidence, timestamps, changes, and resolution.
- Risk-based controls apply: routine cases can be resolved by authorized finance users; high-risk cases, material adjustments, and cases affecting posted accounting require additional approval where appropriate.
- Risk thresholds/criteria are not yet numerically defined. Do not invent them; recommend defaults for later approval.
- Financial records must not be changed silently to make exceptions disappear.
- When gateway and bank reports disagree, preserve each original amount, show the difference and source, investigate documented adjustments, and leave unexplained differences open until resolved with evidence.

### Reconciliation runs and revised reports

- Reconciliation is versioned. Every run has a unique ID and preserves references to its inputs, rule versions, results, and changes relative to previous runs.
- Users can compare runs. New runs must not silently rewrite posted journal entries, erase manual decisions, or bypass period-close controls.
- Re-uploading a file and rerunning reconciliation are different operations. Reruns do not duplicate records.
- Each file upload is traceable. Duplicate detection uses reliable identifiers and evidence, not amount/date alone.
- Authorized users can explicitly designate a corrected report as a revision/replacement of an earlier report. Preserve prior file/import history, reconcile revised data in a new versioned run, and show what changed.
- Replacing a report must not silently delete financial records or rewrite posted entries. Accounting consequences follow journal-approval and period-close controls.

## 4. Fees, adjustments, refunds, reversals, and currencies

- Reconcile gross payments and net settlements as separate concepts.
- Treat gateway fees, applicable taxes, refunds, chargebacks, reversals, and other adjustments as explicit financial components/events where supported by source data.
- Use gateway settlement reports as primary evidence for the settlement breakdown; do not assume fee rates or invent explanations for differences.
- Preserve the original payment and its history. Record each refund, chargeback, reversal, or adjustment as a separate traceable event linked to the original payment when the evidence supports the link.
- Unlinked, unexpected, or inconsistent events are flagged for review.
- Multi-currency support belongs in the foundational model. Store currency explicitly for relevant orders, payments, settlements, fees, refunds, and bank transactions.
- Only compare amounts under rules that establish compatible currencies. Never convert using guessed/hardcoded rates.
- Foreign-exchange conversion reconciliation and realized/unrealized FX accounting are deferred.

## 5. Imports and file mapping

- Support CSV and XLSX uploads in the MVP.
- Use guided column mapping: preview headers/sample rows, map source columns to ClearSettle fields, and allow reusable templates for recurring report formats.
- Suggest mappings automatically only where confidence is high; ambiguous or financially important mappings require confirmation.
- Validate date formats, decimal separators, currency, signs, required fields, and source-specific structure before committing records.
- Validate/stage before database commit where appropriate.
- Use partial import with invalid-row quarantine: valid rows can import; invalid rows are excluded/quarantined with specific reasons and an exportable error report.
- Show `Partially imported` when appropriate and warn that reconciliation may be incomplete. Invalid rows must never be silently ignored or treated as reconciled.
- Detect file-level duplicates with a content fingerprint and relevant metadata; detect row-level duplicates using reliable source transaction identifiers and other keys. Identical amounts/dates alone do not prove duplication.
- Reruns/retries must be safe and must not create duplicate financial records or postings.
- Reject unsupported, corrupted, encrypted, or unsafe files with a clear reason.
- **Initial proposed limits approved for the MVP:** 50 MB per file and 250,000 rows per file for supported CSV/XLSX files. These are starting engineering limits, not performance guarantees; validate them with load tests before production. Make limits configurable by deployment, with stricter tenant limits possible.
- Use asynchronous processing for substantial imports and memory-efficient parsing where appropriate.

## 6. Accounting ledger and controls

- Include a double-entry accounting ledger in MVP scope. This is a larger product commitment than reconciliation-only functionality.
- Use accrual accounting as the supported MVP basis. Cash movements and accrual recognition are distinct.
- Use business-event-driven journal drafts for eligible sales/order events, payments, settlements, fees, refunds, and bank movements as supported by evidence and configured rules.
- An order alone does not automatically prove that revenue has been earned. Revenue recognition uses configurable, evidence-based triggers aligned to the business's policy. Missing evidence or ambiguity sends the case for review.
- Journal entries follow **draft → review → authorized posting**. Automated preparation/validation is allowed; posting requires an authorized approver.
- A journal preparer must not approve their own journal entry.
- Block posting when an entry is unbalanced, lacks required information, violates accounting rules, or depends on unresolved financial evidence. Do not insert an unexplained balancing amount to make it balance.
- Corrections to drafts/posted entries must preserve history. Correct posted entries through auditable reversing or adjusting entries, not silent edits/deletions.
- Provide a customizable Chart of Accounts (CoA) with sensible defaults. Authorized users may create, rename, organize, and map accounts within safeguards. Protect system-required accounts and accounts referenced by posted entries as appropriate.
- Provide business-customizable accounting templates for eligible sales, payments, gateway fees, settlements, refunds, and bank movements. Templates are starting points, not a claim that every business follows the same policy.
- Validate accounting rules, version changes, and preserve rule history. Journal drafts must balance; ambiguous or unsupported treatments require review.
- Support guided opening balances via form or supported template upload. Validate account mapping and debits=credits; require authorized review before posting a dedicated opening journal entry. Do not invent missing balances.
- Support an accounting cutover date per business. Opening balances represent the ledger position at the cutover date. Historical imports may be used for reconciliation/investigation without automatically generating duplicate accounting entries. Historical ledger migration requires a separate authorized process and audit trail.
- Support monthly accounting periods with controlled close/reopen. Closed periods block new posting by default. Reopening requires authorization, reason, and audit event.
- Period closing uses a checklist for unposted drafts, unreconciled balances, unresolved high-risk discrepancies, and other required tasks. Critical issues block closure; permitted exceptions require authorized approval and documented rationale.
- Financial year is configurable per workspace, defaulting to April 1–March 31 for Indian businesses. Changes that affect periods or posted entries require safeguards and authorization.
- Tax-aware reconciliation/accounting is in scope: preserve tax amounts/fields from reliable source data and support tax-related ledger accounts.
- Full GST calculation, return preparation, filing, and tax-compliance advice are deferred.
- Generate core accounting reports from posted entries: trial balance, Profit and Loss, Balance Sheet, general ledger, and journal-entry reports. Distinguish drafts from finalized reports and do not imply incomplete/unreconciled information is fully verified.
- Cash-flow statements, budgeting, forecasting, and advanced financial analytics are deferred.

## 7. Reporting and exports

- Include CSV/XLSX exports, reconciliation summaries, unmatched-transaction reports, exception reports, settlement-fee breakdowns, journal-entry reports, and audit-history exports.
- Generate reports from the same underlying financial records and reconciliation results as the application. Respect workspace permissions and applicable filters.
- Exporting data must not modify financial records.

## 8. Roles, authentication, and authorization

### Five predefined roles

1. **Workspace Owner/Admin:** manages workspace, users, role assignments, and administrative settings; cannot bypass accounting safeguards.
2. **Reconciliation Analyst:** imports/maps reports, runs reconciliation, investigates discrepancies, and performs authorized manual matching/unmatching.
3. **Accountant/Journal Preparer:** manages permitted CoA tasks, prepares journal drafts/opening balances, and views accounting reports; cannot approve their own entries.
4. **Finance Controller/Approver:** approves eligible entries prepared by others, handles high-risk approvals, and performs authorized period closing/reopening.
5. **Auditor/Viewer:** read-only access to permitted reports, reconciliation results, supporting evidence, and audit history.

- Users may hold multiple roles to accommodate small teams; separation-of-duties controls still apply, especially no self-approval.
- Backend authorization is mandatory. Hiding a frontend button is not authorization.
- Every query, file action, background job, API endpoint, and export must respect tenant scope.
- Use least privilege, audit role/permission changes, and prevent workspace creation from granting access to another tenant.
- Use managed authentication via a replaceable standard protocol such as OpenID Connect (OIDC); the exact identity provider is not yet selected.
- Managed provider handles sign-in/credentials/email verification/recovery as supported; ClearSettle backend retains responsibility for business roles, tenant authorization, and financial permissions.
- Self-service onboarding: verified user can create a business workspace and becomes its initial administrator, then invites teammates. This must not expose existing tenants.
- Require MFA for privileged users and users who can approve postings, reopen periods, or change sensitive financial settings. Other users can enable MFA. High-risk actions may require fresh authentication. Identity-provider MFA capability/vendor is not yet selected.
- Use configurable idle session timeouts and risk-based reauthentication; warn before expiry where practical, allow sign-out of all sessions, and enforce relevant controls on backend operations.

## 9. Audit, tenant isolation, privacy, and offboarding

- Use a protected, append-only audit trail at the application level for important financial/administrative events. Ordinary application roles cannot edit/delete historical audit entries.
- Capture actor, timestamp, affected records, action, and required reason. Corrections create new events. Restrict audit access and back up audit records.
- Evaluate stronger tamper-evidence/integrity verification and protected external log storage during production hardening; do not claim immutable/tamper-proof storage without an implementation that proves it.
- Use a shared PostgreSQL database with layered tenant isolation for the MVP. Every tenant-owned record must be associated with its business.
- Enforce tenant isolation through backend authorization, database constraints, and PostgreSQL Row-Level Security (RLS) where appropriately designed. Test hostile cross-tenant access explicitly.
- Private encrypted object storage for uploaded source reports. PostgreSQL stores metadata, tenant ownership, fingerprints, import status, and references.
- Use appropriate short-lived access links, file validation, malware scanning where supported, and access restrictions.
- Apply data minimization: collect/store only what reconciliation/accounting needs; mask sensitive account/card identifiers where appropriate; restrict access to original reports.
- Workspace offboarding is controlled, not immediate destructive deletion: disable access, permit authorized export of eligible data, retain records required under applicable policy/law, and securely delete eligible data when allowed. Account for running jobs, files, backups, dependencies, and audit history.
- Use separate retention policies by category: original uploads, temporary processing artifacts, imported financial records, posted journals, reconciliation history, and audit logs. Legal holds suspend deletion where required. Mandatory retention cannot be bypassed by workspace admins.
- Actual numeric retention periods and jurisdiction-specific defaults are unresolved and must be validated with qualified Indian legal/accounting advice before production. Do not invent statutory periods or claim compliance merely because a policy exists.

## 10. Jobs, notifications, reliability, and operations

- Use background processing with job tracking for substantial imports, validation, duplicate detection, reconciliation runs, and report generation where appropriate.
- Provide statuses such as `Queued`, `Processing`, `Partially completed`, `Completed`, and `Failed`, with actionable failure details and safe retries.
- Provide in-app and email notifications for useful events such as completed/partial imports, failed reconciliation runs, and completed exports. Notifications should be user-configurable where appropriate; email must not expose sensitive financial details and should direct users to sign in.
- Production-oriented deployment pipeline: separate development/staging/production environments; automated CI checks; controlled database migrations; managed secrets; health checks; centralized error logging; monitoring/alerts; documented rollback and incident-response procedures.
- Secrets must never be committed to the repository.
- Production-grade backup/recovery: automated DB backups, point-in-time recovery where supported, protected backup access, documented restoration procedures, and regular restore tests. Uploaded reports and required evidence must be covered too.
- **Recovery targets approved as engineering targets, not customer guarantees:** RPO ≤ 1 hour and RTO ≤ 4 hours. Validate that selected services and drills can meet these targets.
- Recovery must restore consistent financial data and avoid duplicate effects from retried jobs.
- Shared PostgreSQL and private object storage are architecture decisions; specific vendors/hosting providers have not been selected.

## 11. MVP release gate

Do not consider the MVP complete because it compiles, starts, or looks polished. Release readiness requires demonstrated evidence for:

1. A working end-to-end workflow: import reports → validate/import → payment-to-settlement reconciliation → settlement-to-bank verification → investigate/resolve exceptions → prepare journal → independent approval/post → verify ledger/reports.
2. Financial correctness: no silent unexplained amount differences; posted entries balance; duplicate uploads/retries do not duplicate financial records/postings; history is preserved.
3. Security: tenant isolation, backend authorization, privileged MFA policy, no self-approval, and protected audit behaviour are tested.
4. Automated unit, integration, API, reconciliation, accounting, and end-to-end tests cover normal paths, edge cases, failures, and recovery. Critical security/financial-integrity tests must pass.
5. Deployment, migrations, backup restoration, monitoring, error reporting, rollback, and recovery targets are verified.
6. No known critical security/financial-integrity defects, fake implementations represented as complete, or unverified claims. Known limitations are documented.
7. Legal/compliance claims and production suitability require the relevant external and deployment-specific verification; documentation and passing tests alone do not certify them.

## 12. Deferred scope

- Marketing landing page until the core application works end-to-end.
- Direct payment-gateway integrations.
- Public customer-facing API (internal REST APIs are in scope).
- Full GST calculation, return filing, and tax-compliance functionality.
- General many-to-many reconciliation matching absent a concrete requirement.
- Foreign-exchange conversion reconciliation and realized/unrealized FX accounting.
- Cash-flow statements, budgeting, forecasting, and advanced financial analytics.

## 13. Known unresolved matters — preserve, do not invent

These need technical design, additional requirements, testing, or owner/legal/accounting approval; their absence does not authorize assumptions:

- Exact field schemas and match rules per source/report/provider, including treatment of partial settlements, payout batching, and provider-specific statuses.
- Detailed event-to-journal rules and accounting-policy semantics, including accounting for chargebacks, refunds, gateway fees/tax, receivables, and revenue-recognition edge cases.
- Numeric risk/materiality thresholds and exception-approval policy.
- Exact import limits' performance validation and load-test results.
- Exact managed identity provider, object-storage/database host, email provider, deployment platform, secrets manager, and monitoring tools.
- Numeric retention durations, applicable legal interpretations, and contract-specific retention policies.
- Specific encryption/key-management design, malware-scanning provider, incident-response contacts, and tested production deployment configuration.
- Detailed acceptance-test datasets, performance targets, accessibility requirements, and deployment-specific release procedures.
- Any other contradiction or gap found while reviewing the repository and this seed.

When reporting these, classify each as: (a) product-owner decision required, (b) technical design recommendation, (c) implementation/testing task, or (d) qualified legal/accounting review required. Resolve routine technical choices autonomously within approved architecture; escalate material product, financial-policy, legal, or security trade-offs.

---

## Next authorized activity

Use this seed to:
1. Inspect the repository's existing instructions and docs.
2. Update/create `docs/product/clearsettle_decision_register.md` accurately from this seed.
3. Create `docs/product/clearsettle_product_specification.md` and `docs/product/clearsettle_implementation_plan.md`.
4. Perform contradiction/gap analysis and report findings.

This authorizes documentation and planning only. Wait for explicit approval before application implementation.
