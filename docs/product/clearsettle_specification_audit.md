# ClearSettle — Specification Audit: Contradictions and Gaps

**Document status:** Audit for owner review.
**Audit date:** 15 October 2026
**Scope:** Every file present in the repository on 15 October 2026, namely:
- `CLAUDE.md`
- `docs/README.md`
- `docs/product/clearsettle_approved_decisions_seed.md`
- the prior `docs/product/clearsettle_decision_register.md` (now archived)
- `docs/engineering/clearsettle_master_engineering_checklist.md`
- `docs/engineering/the_complete_anatomy_of_a_vibe_coded_software_system.md`
- `.agents/skills/frontend-design/SKILL.md`
- `skills-lock.json`

The audit also covers the documents produced from those files:
- the [decision register](clearsettle_decision_register.md);
- the [product specification](clearsettle_product_specification.md);
- the [implementation plan](clearsettle_implementation_plan.md).

## Method and limitations

- Each approved decision was checked against the others, against the engineering checklist and against the earlier register.
- The resulting specification was then reviewed as if by a separate team preparing to build it. That review looked for ways the product could silently misstate money, leak data across tenants, lose evidence or pass its tests while still being wrong.
- Two independent reviews, each with no access to the drafting conversation, were started on these documents. When this version was written, their results had not yet been incorporated. They will be added under "Independent review results" at the end of this document.
- **Limitations:**
  - No real gateway or bank report formats were available (AF-90). Matching and import findings are therefore based on reasoning, not on sample data.
  - No accounting, legal, tax or security professional has reviewed these documents.
  - No code exists, so no finding is backed by test evidence.

## Severity and classification

| Severity | Meaning |
|---|---|
| Critical | Built as written, the product would silently misstate money, expose another tenant's data or destroy evidence. Blocks the affected work. |
| High | Material financial, security or legal risk. Must be resolved before the affected milestone starts. |
| Medium | Must be resolved before release. A safe interim behaviour exists. |
| Low | Quality, consistency or documentation issue. |

**Type:**
- Confirmed contradiction: two sources disagree.
- Documentation defect.
- Missing requirement.
- Potential risk.
- Unanswered question.

**Disposition:**
- Fixed in documentation.
- Specified: a derived requirement was added, and the owner may challenge it.
- Recommendation pending approval.
- Logged as an open question (OQ).
- External review required.
- Accepted constraint: pending owner confirmation.

**Approval required?** "Yes" means the owner, or the named specialist, must decide before the affected milestone.

## Summary

| Severity | Count | IDs |
|---|---|---|
| Critical | 0 | No finding is Critical once the specification's interim safe defaults apply. Several High findings would become Critical if built without those defaults (see each finding). |
| High | 17 | AF-04, AF-20, AF-21, AF-22, AF-23, AF-29, AF-40, AF-41, AF-42, AF-43, AF-44, AF-60, AF-61, AF-67, AF-80, AF-90, AF-91 |
| Medium | 39 | AF-01, AF-03, AF-05, AF-06, AF-09, AF-24 to AF-28, AF-30 to AF-33, AF-45 to AF-48, AF-50, AF-52, AF-62 to AF-66, AF-68 to AF-70, AF-81 to AF-87, AF-89, AF-92 to AF-94 |
| Low | 13 | AF-02, AF-07, AF-08, AF-10 to AF-12, AF-49, AF-51, AF-71, AF-72, AF-88, AF-95, AF-96 |

Of these:
- **Confirmed contradictions:** AF-03, AF-04, AF-06, AF-72.
- **Documentation defects:** AF-01, AF-02, AF-05, AF-07, AF-08, AF-10.

The rest are missing requirements, potential risks or unanswered questions.

---

## A. Documentation and repository

### AF-01 — Engineering checklist path is broken
- **Severity:** Medium
- **Type:** Documentation defect (confirmed)
- **Evidence:** Before correction, `CLAUDE.md` L4 and `docs/README.md` L9 referred to `clearsettle-master-engineering-checklist.md`. The file is actually named `clearsettle_master_engineering_checklist.md`.
- **Consequence:** Agents told to "consult the checklist" cannot find it.
- **Resolution:** Correct both references.
- **Disposition:** Fixed in documentation (15 October 2026).
- **Approval required?** No.

### AF-02 — Anatomy document reference is broken
- **Severity:** Low
- **Type:** Documentation defect (confirmed)
- **Evidence:** Before correction, `docs/README.md` L10 referred to `engineering/gemini-vibe-coding-anatomy.md`, which does not exist. The file is actually `the_complete_anatomy_of_a_vibe_coded_software_system.md`.
- **Resolution:** Correct the reference.
- **Disposition:** Fixed in documentation.
- **Approval required?** No.

### AF-03 — Checklist implies implementation may start
- **Severity:** Medium
- **Type:** Confirmed contradiction
- **Evidence:** Before correction, checklist L378 (now L384) said the open questions "do not block using the checklist to guide careful implementation now". `docs/README.md` L5, Seed L271 and the owner's brief all forbid implementation without explicit authorization.
- **Consequence:** An agent could start coding.
- **Resolution:** Reword the checklist line and state that the README rule takes precedence.
- **Disposition:** Fixed in documentation (checklist §13).
- **Approval required?** No.

### AF-04 — Prior register conflicted with the approved seed
- **Severity:** High
- **Type:** Confirmed contradiction
- **Evidence:** The prior register (now archived) listed these as open:
  - ledger scope (Decision 4);
  - real product or demonstrator (Decision 10);
  - CSV versus XLSX, tenancy, roles and authentication (Decisions 5, 6 and 9).

  It also described the product as "reconciliation-focused, not a suite" and allowed "tolerances". The seed approves:
  - a double-entry ledger (L150);
  - a production-oriented product (L24);
  - CSV and XLSX (L135);
  - five roles (L179–185);
  - managed OIDC (L191);
  - no blanket tolerance (L69).
- **Consequence:** Implementation guided by the old register would contradict approved scope.
- **Resolution:** Rebuild the register from the seed. Archive the old version verbatim and map every old entry to its disposition (register §5).
- **Disposition:** Fixed in documentation.
- **Approval required?** No. The owner should confirm the mapping during review.

### AF-05 — Checklist baseline and conditional items are stale
- **Severity:** Medium
- **Type:** Documentation defect (stale)
- **Evidence:**
  - Checklist §1 L9 says "React + JavaScript" and "confirm any expansion beyond reconciliation".
  - §13 L377–382 lists six questions, most of them now answered.
  - Conditional items #15, #21, #69, #72, #82 and #109 have been triggered by approved decisions.
- **Resolution:** Add dated status notes to checklist §1, §10 and §13 that point to register §4. The 110-row table is left unchanged.
- **Disposition:** Fixed in documentation (notes added). The owner may approve rewriting the affected table rows.
- **Approval required?** Only if the table itself is to be rewritten.

### AF-06 — Stage names and identifier hierarchy disagree in the seed
- **Severity:** Medium
- **Type:** Confirmed contradiction (internal to the seed)
- **Evidence:** Seed L50–53 defines Stage 1 as "payment-to-settlement". Seed L76–84 labels the identifier hierarchy "Stage 1 — order/payment" and "Stage 2 — settlement/bank", and places "relationships among the settlement report and underlying gateway transactions" under Stage 2.
- **Consequence:** Engineers might put the payment ↔ settlement-line link in the wrong stage, or leave it out.
- **Resolution:** Use three links: L1 order ↔ payment, L2 payment ↔ settlement line, L3 payout ↔ bank. Stage 1 covers L1 and L2; Stage 2 covers L3. This keeps both seed passages true.
- **Disposition:** Recommendation pending approval (OQ-06). Used in specification §5.1.
- **Approval required?** Yes (low effort).

### AF-07 — Two status vocabularies for imports
- **Severity:** Low
- **Type:** Documentation defect
- **Evidence:** Seed L141 uses the import status `Partially imported`. Seed L214 uses the job status `Partially completed`.
- **Resolution:** Keep the job lifecycle and the import outcome as separate status sets.
- **Disposition:** Specified (FR-IMP-013, specification §4.9).
- **Approval required?** No.

### AF-08 — UI reference assets are missing
- **Severity:** Low
- **Type:** Documentation defect
- **Evidence:** The prior register cites "the screenshot supplied" for the authentication reference, and a marketing visual reference. Neither image is in the repository.
- **Consequence:** Future design work cannot check against the references.
- **Resolution:** The owner adds the images to the repository, for example under `docs/design/references/`.
- **Disposition:** Logged as OQ-47.
- **Approval required?** Owner action.

### AF-09 — Git workflow cannot be followed yet
- **Severity:** Medium
- **Type:** Existing fact
- **Evidence:** On 15 October 2026:
  - the local project folder had no `.git` directory;
  - the remote `main` branch (`https://github.com/swastikongithub/ClearSettle`) had one commit, "Initial commit", containing a root `README.md` with `# ClearSettle`;
  - initializing the local repository was blocked in the drafting session by the tool's permission controls.
- **Consequence:** The required small commits and pushes (D-PRC-04) could not be made, and these documents exist only in the working folder.
- **Resolution:** The owner initializes the repository or authorizes the steps (see the final report). Commits must use the owner's identity with no AI co-author trailers.
- **Disposition:** Blocker reported.
- **Approval required?** Yes (owner action).

### AF-10 — "Implementation status" document is referenced but missing
- **Severity:** Low
- **Type:** Documentation defect
- **Evidence:** `CLAUDE.md` L20 says to "update the checklist or implementation status", but no such document exists.
- **Resolution:** Implementation plan §6 defines its fields. Create it when implementation is authorized.
- **Disposition:** Recommendation pending approval.
- **Approval required?** Yes, as part of plan approval.

### AF-11 — Skill discovery path is unverified
- **Severity:** Low
- **Type:** Potential risk
- **Evidence:** The `frontend-design` skill is stored at `.agents/skills/frontend-design/SKILL.md`, and `skills-lock.json` records its source. Whether every tool used on this project loads skills from `.agents/skills/` has not been verified.
- **Resolution:** Verify the skill loads before the first UI task (plan M0).
- **Disposition:** Recommendation.
- **Approval required?** No.

### AF-12 — Frontend tooling candidates are unconfirmed
- **Severity:** Low
- **Type:** Unanswered question
- **Evidence:** The prior register lists the Next.js App Router, Tailwind, Radix, TanStack Query and Table, and Motion as candidates. The seed confirms only Next.js, React and JavaScript.
- **Resolution:** Confirm at M0 against current official documentation.
- **Disposition:** Logged as OQ-48.
- **Approval required?** Confirm.

## B. Financial integrity

### AF-20 — Settlement breakdowns could disagree with payouts silently
- **Severity:** High
- **Type:** Missing requirement
- **Evidence:** The approved decisions treat the settlement report as primary evidence (D-FIN-03) and forbid unexplained differences (D-REC-07). They never require a settlement report to be internally consistent: line gross minus components equal to net, and line nets summing to the payout.
- **Consequence:** A payout could match a bank credit while its own breakdown was wrong, and journals built from that breakdown would misstate fees or revenue. This would be **Critical** if built without the check.
- **Resolution:** Require exact arithmetic checks on lines and payouts. Treat failures as exceptions that block journal drafting.
- **Disposition:** Specified (derived): FR-REC-021, FR-REC-022, FR-ACC-008, AC-027, AC-028.
- **Approval required?** No (derived). The owner may challenge it.

### AF-21 — Same identifier arriving with different values
- **Severity:** High
- **Type:** Unanswered question
- **Evidence:** D-IMP-06 defines how duplicates are detected but not what happens when the identifier matches and the values differ. Overlapping exports and status progressions (for example pending to successful, or a later refund) are normal in gateway data. D-IMP-12 forbids overwriting.
- **Consequence:** Without a rule, the import would either overwrite (forbidden), create duplicates (forbidden) or reject legitimate updates.
- **Resolution:** Keep every observation. Accept only status changes that follow a template-defined order; anything else raises a "Conflicting source data" exception and blocks automatic matching.
- **Disposition:** Logged as OQ-09. Safe default specified in FR-IMP-016 and AC-011.
- **Approval required?** Yes.

### AF-22 — Partial imports can produce incomplete settlement groups
- **Severity:** High
- **Type:** Potential risk
- **Evidence:** D-IMP-05 allows partial import with quarantine. Nothing stops a payout whose lines are partly quarantined from matching a bank credit or producing journals.
- **Consequence:** Fees and revenue would be understated with no visible difference. This would be Critical if built without the safeguard.
- **Resolution:** Mark the group incomplete and make it ineligible for automatic matching and journal drafting.
- **Disposition:** Specified (derived): FR-IMP-014, AC-012.
- **Approval required?** No (derived).

### AF-23 — Cross-currency items can never be resolved
- **Severity:** High
- **Type:** Unanswered question, created by combining approved decisions
- **Evidence:**
  - D-FIN-06 defers FX reconciliation and FX accounting.
  - D-REC-13 says manual matches "enforce amount/currency checks".
  - Indian gateways may settle foreign-currency payments in INR. This is an inference; check it against OQ-07 samples.
  - No functional ledger currency is defined.
- **Consequence:** Such payments stay open exceptions forever and block the period-close checklist. Journal drafts in mixed currencies would be undefined.
- **Resolution:**
  - One functional currency per workspace.
  - No automatic cross-currency matches.
  - Manual links only with gateway-reported amounts on both sides, plus high-risk approval.
  - No journal drafts for such items until an FX policy is approved.
- **Disposition:** Logged as OQ-19. Safe defaults in FR-REC-053, FR-FIN-009, FR-ACC-001 and FR-ACC-026.
- **Approval required?** Yes (owner and accountant).

### AF-24 — Timing differences are undefined
- **Severity:** Medium
- **Type:** Missing requirement
- **Evidence:** Seed L70 allows date windows for finding candidates. No expected settlement period is defined.
- **Consequence:** Either every payment not yet settled becomes an exception, or genuinely missing settlements are never flagged.
- **Resolution:** An expected settlement period per gateway, supplied by the owner. Until it is set, items show as "Awaiting settlement" and never as reconciled.
- **Disposition:** Logged as OQ-13; FR-REC-024.
- **Approval required?** Yes.

### AF-25 — Records outside gateway flows are undefined
- **Severity:** Medium
- **Type:** Missing requirement
- **Evidence:**
  - Orders paid by cash on delivery or bank transfer have no gateway payment.
  - Bank statements contain many transactions unrelated to payouts.
  - The approved decisions do not address either.
- **Consequence:** Floods of false exceptions, or items silently ignored.
- **Resolution:** Allow an "Outside gateway reconciliation" classification with a reason.
- **Disposition:** Logged as OQ-02; FR-REC-012, FR-REC-033.
- **Approval required?** Yes.

### AF-26 — Refund and chargeback consistency is undefined
- **Severity:** Medium
- **Type:** Missing requirement
- **Evidence:** D-FIN-04 says inconsistent events are flagged, but defines no invariant. The chargeback lifecycle (open, won, lost, reversed) is also undefined.
- **Resolution:** Refunds plus chargebacks net of reversals may not exceed the captured amount. Accounting for the chargeback lifecycle is pending OQ-23.
- **Disposition:** Specified (derived): FR-FIN-003, AC-039. Accounting part logged as OQ-23.
- **Approval required?** No for the invariant; yes for the accounting.

### AF-27 — Bank references may exist only in narration text
- **Severity:** Medium
- **Type:** Unanswered question
- **Evidence:** D-REC-10 relies on UTRs, but bank statements often embed references in free text.
- **Consequence:** Without extraction, L3 matching is mostly manual. With loose extraction, references could be mis-parsed and produce false "exact" matches.
- **Resolution:** Allow only template-defined patterns that extract exactly one value, stored separately from the raw text. Anything else is a candidate only.
- **Disposition:** Logged as OQ-20; FR-REC-030.
- **Approval required?** Yes.

### AF-28 — Supported grouped relationships are not listed
- **Severity:** Medium
- **Type:** Missing requirement
- **Evidence:** D-REC-12 requires a "supported relationship" for groups but never lists which relationships are supported.
- **Resolution:** An allowlist (G1–G4). Anything else is a proposal only.
- **Disposition:** Recommendation pending approval (FR-REC-040).
- **Approval required?** Yes (confirm).

### AF-29 — No resolution path for genuinely unexplainable differences
- **Severity:** High
- **Type:** Unanswered question
- **Evidence:**
  - D-REC-17 says unexplained differences "stay open until resolved with evidence".
  - D-ACC-14 blocks closing a period while critical discrepancies are open.
  - There is no write-off or accepted-difference path.
  - There is no `Pending approval` status (D-REC-15) for the approvals D-REC-16 requires.
- **Consequence:** Small unexplained gateway differences block period close permanently, or users record invented explanations, which is worse.
- **Resolution:** An "Accepted difference" resolution that needs high-risk approval by a different user, investigation evidence and an approved adjusting journal. Add `Pending approval` and a reopen transition.
- **Disposition:** Logged as OQ-15 and OQ-16; FR-EXC-002, FR-EXC-004, FR-EXC-005.
- **Approval required?** Yes (owner and accountant).

### AF-30 — Risk thresholds are undefined
- **Severity:** Medium
- **Type:** Unanswered question
- **Evidence:** Seed L109.
- **Resolution:** Until approved, treat these as high-risk: any manual match with a difference or without identifier evidence, accepted differences, anything affecting posted accounting, grouped manual matches, and cross-currency handling. This is the safest default.
- **Disposition:** Logged as OQ-14; FR-EXC-006.
- **Approval required?** Yes.

### AF-31 — A rounding rule could become a hidden tolerance
- **Severity:** Medium
- **Type:** Potential risk
- **Evidence:** Seed L69 allows explicit rounding rules but forbids blanket tolerance. A generic "differences under ₹1 are rounding" rule would breach the intent.
- **Resolution:** A rounding rule must name its computation and record the rounding amount as a separate component.
- **Disposition:** Specified: D-REC-07 constraint, FR-REC-007.
- **Approval required?** No.

### AF-32 — One identifier claimed by several records
- **Severity:** Medium
- **Type:** Missing requirement
- **Evidence:** D-REC-04 and D-REC-06 cover missing or ambiguous references. They do not explicitly cover two records on the same side carrying the same identifier, for example two gross settlement lines for one payment.
- **Resolution:** No automatic match. Raise an "Ambiguous reference" exception.
- **Disposition:** Specified (derived): FR-REC-006, AC-024.
- **Approval required?** No.

### AF-33 — Excess decimal precision at import
- **Severity:** Medium
- **Type:** Missing requirement
- **Evidence:** D-FIN-07 requires exact arithmetic, but what happens to a value with more decimals than the currency allows is unspecified.
- **Consequence:** Silent rounding would produce unexplained differences.
- **Resolution:** Treat it as a validation error and never round.
- **Disposition:** Specified (derived): FR-IMP-028, AC-008.
- **Approval required?** No.

## C. Accounting integrity

### AF-40 — Is the ledger a complete general ledger?
- **Severity:** High
- **Type:** Unanswered question
- **Evidence:** The seed approves a double-entry ledger with a profit and loss and balance sheet (L150, L168). Its event-driven drafts cover only sales, payments, settlements, fees, refunds and bank movements (L152). Nothing says whether expenses, payroll, purchases and other activity are recorded in ClearSettle.
- **Consequence:** A profit and loss and balance sheet built only from payment flows would be economically incomplete and could mislead users and auditors.
- **Resolution:**
  - Keep the approved ledger and support general manual journals.
  - Label statements with their coverage and provisional status.
  - Do not claim to replace full bookkeeping unless that scope is approved.
- **Disposition:** Logged as OQ-01; FR-ACC-009, FR-RPT-003, FR-RPT-004. External review required.
- **Approval required?** Yes (owner and accountant).

### AF-41 — No approved posting rules
- **Severity:** High
- **Type:** Unanswered question
- **Evidence:** Seed L250 leaves event-to-journal rules unresolved. Release-gate item 1 (Seed L227) requires preparing journals from the reconciled workflow.
- **Consequence:** Journal automation cannot be built correctly yet. Inventing debits and credits is forbidden.
- **Resolution:**
  1. Build the template mechanism and manual journals first.
  2. Commission accountant-reviewed default templates.
  3. Activate templates only after approval.
- **Disposition:** Logged as OQ-23. The plan places M7 after an external-review gate. External review required.
- **Approval required?** Yes (accountant and owner).

### AF-42 — Revenue-recognition evidence may not exist in the sources
- **Severity:** High
- **Type:** Unanswered question
- **Evidence:** D-ACC-03 requires evidence-based triggers, but the four source categories (D-IMP-01) contain no fulfilment or delivery data unless the order export includes it.
- **Consequence:** Revenue would be recognized on payment by default (a policy choice nobody approved) or not at all.
- **Resolution:** Map fulfilment evidence from order data where it exists. No trigger is active until one is chosen with accountant guidance.
- **Disposition:** Logged as OQ-24; FR-ACC-006. External review required.
- **Approval required?** Yes.

### AF-43 — Transactions straddling the cutover
- **Severity:** High
- **Type:** Unanswered question
- **Evidence:** D-ACC-12 defines the cutover and opening balances. A payment captured before cutover and settled after it is not addressed.
- **Consequence:** A settlement draft could duplicate an amount already in the opening balances, or leave a receivable that never clears.
- **Resolution:** No drafts for events before cutover. Linked events after cutover raise a "Cutover review" exception, and treatment is confirmed against the opening balances.
- **Disposition:** Logged as OQ-25; FR-ACC-017, AC-060. External review required.
- **Approval required?** Yes.

### AF-44 — Independent approval could be bypassed
- **Severity:** High
- **Type:** Potential risk and unanswered question
- **Evidence:** D-ACC-05 forbids a preparer approving their own journal, and D-SEC-02 says "especially no self-approval". These cases are not covered:
  - Who is the "preparer" of a system-generated draft?
  - An approver could edit a draft and then approve it.
  - A Controller holding the Analyst role could approve their own high-risk match or resolution.
  - Approval of period-close exceptions, opening balances and template activation.
  - An Admin can create a second identity they control and give it the Approver role (sock-puppet risk).
  - A one-person workspace can never post.
- **Consequence:** Independent approval could be bypassed in practice.
- **Resolution:**
  - No approval of anything you created, submitted or edited.
  - The person who submits a system draft becomes its preparer.
  - Role changes are audited and notified to all Admins and Controllers, and require MFA and fresh authentication.
  - Accept and document the residual sock-puppet risk: software cannot prove two accounts belong to different people.
  - Accept the one-person limitation as a constraint.
- **Disposition:** Logged as OQ-17 and OQ-18; FR-WSP-010 to FR-WSP-013, FR-WSP-005, AC-037, AC-051. The one-person case is an accepted constraint pending owner confirmation.
- **Approval required?** Yes.

### AF-45 — Unmatches and revisions after posting
- **Severity:** Medium
- **Type:** Potential risk
- **Evidence:** D-REC-14 and D-IMP-11 send accounting effects through the "correction workflow", which is not defined. Correction treatment for closed periods is not decided either.
- **Consequence:** Until a correction is posted, the reconciliation state and the ledger disagree with no visible signal.
- **Resolution:**
  - Create "Correction required" items linked to the affected journals.
  - Put them on the close checklist.
  - Provide a reconciliation-to-ledger consistency report.
  - Never reverse journals automatically.
  - Treatment for closed periods is pending OQ-26.
- **Disposition:** Specified: FR-ACC-024, FR-ACC-021, AC-038. Logged as OQ-26.
- **Approval required?** Yes for OQ-26.

### AF-46 — A balanced journal can still be economically wrong
- **Severity:** Medium
- **Type:** Potential risk
- **Evidence:** D-ACC-06 checks balance and completeness. A balanced entry can still use the wrong account, the wrong period, an outdated template version, or post the same event twice.
- **Resolution:**
  - Templates must validate before activation (FR-ACC-005).
  - Drafts reference the template version.
  - The same event cannot be posted twice for the same purpose (a database constraint).
  - Approvers review drafts next to their evidence.
  - Accountant-reviewed golden scenarios (AF-91).
- **Disposition:** Specified: FR-ACC-005, FR-ACC-025, AC-061, AC-062.
- **Approval required?** No.

### AF-47 — Which evidence blocks which journal draft
- **Severity:** Medium
- **Type:** Missing requirement
- **Evidence:** D-ACC-06 blocks posting that "depends on unresolved financial evidence", but nothing defines the dependency.
- **Resolution:** A draft depends on every source event it uses, every match or exception involving those events, and their group-completeness status. Open dependencies set the draft to `Blocked`.
- **Disposition:** Specified (derived): FR-ACC-008, AC-058.
- **Approval required?** No.

### AF-48 — Changes to templates and the Chart of Accounts
- **Severity:** Medium
- **Type:** Unanswered question
- **Evidence:** Under D-SEC-08, changing sensitive financial settings requires MFA. D-ACC-09 and D-ACC-10 make templates versioned but say nothing about who approves an activation.
- **Resolution:** Preparers draft template versions and a different Controller activates them.
- **Disposition:** Logged as OQ-31; FR-ACC-027.
- **Approval required?** Yes.

### AF-49 — Journal numbering
- **Severity:** Low
- **Type:** Unanswered question
- **Evidence:** Gap-free sequence numbers are not specified.
- **Resolution:** Confirm with an accountant.
- **Disposition:** Logged as OQ-28; FR-ACC-015.
- **Approval required?** Accountant.

### AF-50 — Management or statutory statements
- **Severity:** Medium
- **Type:** Unanswered question
- **Evidence:** Seed L168 requires a profit and loss and balance sheet. Statutory presentation is not discussed.
- **Resolution:** Label them as management reports with no compliance claim.
- **Disposition:** Logged as OQ-32; FR-RPT-004. External review required.
- **Approval required?** Accountant and legal.

### AF-51 — Changing the financial year after posting
- **Severity:** Low
- **Type:** Unanswered question
- **Evidence:** D-ACC-15 requires safeguards but defines none.
- **Resolution:** Allow changes only before the first posting.
- **Disposition:** Logged as OQ-29; FR-ACC-022.
- **Approval required?** Yes.

### AF-52 — Historical imports could duplicate opening balances
- **Severity:** Medium
- **Type:** Potential risk
- **Evidence:** D-ACC-12 allows historical imports for reconciliation.
- **Consequence:** If pre-cutover events produced drafts, they would duplicate the opening balances.
- **Resolution:** Pre-cutover events never produce drafts.
- **Disposition:** Specified: FR-ACC-017, AC-060.
- **Approval required?** No.

## D. Authorization and security

### AF-60 — Platform operator access is undefined
- **Severity:** High
- **Type:** Missing requirement
- **Evidence:** Nothing defines how ClearSettle staff may access tenant data for support or incidents.
- **Consequence:** Ad-hoc database access would bypass tenant isolation and the audit trail.
- **Resolution:** No standing access. A time-bound, consented, audited break-glass procedure with MFA.
- **Disposition:** Logged as OQ-05; NFR-SEC-013.
- **Approval required?** Yes (owner and security).

### AF-61 — Session and token architecture with Next.js
- **Severity:** High
- **Type:** Unanswered question
- **Evidence:** D-TEC-03 (Next.js) and D-SEC-06 (managed OIDC) together leave open where tokens and sessions live. Next.js can render on the server, which adds a second component that may carry credentials.
- **Consequence:** If tokens are kept in browser storage, an XSS flaw could steal them. Inconsistent cookie and origin choices weaken CSRF and CORS protection.
- **Resolution:** Spring Boot acts as the confidential OIDC client and keeps server-side sessions, with same-site deployment and CSRF tokens. No tokens are kept in the browser.
- **Disposition:** Logged as OQ-35; NFR-SEC-002.
- **Approval required?** Yes.

### AF-62 — MFA must be verifiable by the server
- **Severity:** Medium
- **Type:** Potential risk
- **Evidence:** D-SEC-08 requires MFA, but no identity provider has been chosen (OQ-34).
- **Consequence:** If the backend cannot verify that MFA happened, privileged actions rely on UI checks only.
- **Resolution:**
  - The backend verifies MFA and the authentication time from the provider's assertions (NFR-SEC-003, NFR-SEC-004).
  - Privileged actions are refused when MFA cannot be asserted.
  - The ability to assert MFA becomes a provider-selection criterion.
- **Disposition:** Specified; OQ-34.
- **Approval required?** Provider selection.

### AF-63 — Pitfalls in row-level security
- **Severity:** Medium
- **Type:** Potential risk
- **Evidence:** D-SEC-10 says row-level security will be used "where appropriately designed". In PostgreSQL:
  - table owners bypass row-level security unless it is forced;
  - superusers and roles with `BYPASSRLS` always bypass it;
  - a tenant context set per connection can leak between pooled connections.
- **Resolution:**
  - Forced RLS.
  - A non-owner application role without bypass rights.
  - A per-transaction tenant context that fails closed.
  - Background jobs set their own context.
  - Test with AC-071 and AC-072.
- **Disposition:** Specified (Recommended mechanics): NFR-SEC-007.
- **Approval required?** Confirm at M1.

### AF-64 — Admin access to financial data and continuity
- **Severity:** Medium
- **Type:** Unanswered question
- **Evidence:** D-SEC-01 does not say whether the Admin role can see financial data. Removing the last Admin and transferring ownership are not addressed.
- **Resolution:** Admin is administrative only. At least one Admin must always exist.
- **Disposition:** Logged as OQ-36; FR-WSP-006.
- **Approval required?** Yes.

### AF-65 — Cross-tenant tests must prove allowed access too
- **Severity:** Medium
- **Type:** Missing requirement
- **Evidence:** D-SEC-10 asks for hostile cross-tenant tests only.
- **Consequence:** A suite that only proves denials can pass while legitimate same-tenant access is broken, or while a filter is too broad.
- **Resolution:** A permission-matrix test covering allowed and denied operations for every endpoint, plus paired positive and negative cross-tenant cases.
- **Disposition:** Specified: NFR-SEC-006, AC-070, specification §12.3.
- **Approval required?** No.

### AF-66 — Formula injection in exports and error reports
- **Severity:** Medium
- **Type:** Missing requirement
- **Evidence:** Error reports and exports reproduce user-supplied text (D-IMP-05, D-RPT-02).
- **Consequence:** A cell beginning with `=`, `+`, `-` or `@` can run as a formula when opened in a spreadsheet application.
- **Resolution:** Neutralize text cells, keep amounts numeric, and do not corrupt negative numbers.
- **Disposition:** Recommendation: FR-IMP-025, FR-RPT-012, AC-096.
- **Approval required?** Confirm.

### AF-67 — Sensitive identifiers in stored original files
- **Severity:** High
- **Type:** Unanswered question
- **Evidence:** D-DAT-03 keeps original uploads. D-DAT-05 requires masking "where appropriate". Reports may contain full card numbers or bank account numbers.
- **Consequence:** Storing unmasked card numbers could bring PCI DSS obligations, and a breach of stored originals would expose them.
- **Resolution:** Screen files before they reach evidence storage. Reject files containing likely card numbers. Mask bank account numbers in imported records. Seek specialist review.
- **Disposition:** Logged as OQ-39; FR-IMP-004, FR-IMP-022, AC-014. External review required.
- **Approval required?** Yes.

### AF-68 — XLSX decompression and parser abuse
- **Severity:** Medium
- **Type:** Potential risk
- **Evidence:** The 50 MB limit (D-IMP-09) applies to the compressed file. XLSX is compressed XML, so a small file can expand enormously (a "zip bomb").
- **Resolution:** Limits on uncompressed size, cells, columns and parse time; a hardened XML parser with entity expansion and external entities disabled; streaming parsing.
- **Disposition:** Recommendation: FR-IMP-030, NFR-PERF-002.
- **Approval required?** Confirm.

### AF-69 — Multi-workspace users and context mixing
- **Severity:** Medium
- **Type:** Unanswered question
- **Evidence:** D-SEC-07 lets a user create workspaces, but membership of several workspaces is not addressed.
- **Consequence:** Cached data or tokens from one workspace could leak into another in the UI or in jobs.
- **Resolution:** An explicit active workspace on every request, checked server-side, and no screens that mix workspaces.
- **Disposition:** Logged as OQ-03; FR-WSP-008.
- **Approval required?** Yes.

### AF-70 — Billing and legal terms are absent
- **Severity:** Medium
- **Type:** Missing requirement
- **Evidence:** No approved decision mentions billing, terms of service, a privacy policy or data-processing terms.
- **Resolution:** Billing stays out of the MVP build. Legal terms are a prerequisite for release.
- **Disposition:** Logged as OQ-04. External review required.
- **Approval required?** Yes.

### AF-71 — Invitation links could be hijacked
- **Severity:** Low
- **Type:** Potential risk
- **Evidence:** Invitations are approved (D-SEC-07), but how they are protected is not specified.
- **Consequence:** A forwarded invitation link could add the wrong person to a workspace.
- **Resolution:** Single-use, expiring invitations bound to the invited verified email.
- **Disposition:** Recommendation: FR-WSP-004.
- **Approval required?** Confirm.

### AF-72 — Auditor evidence access versus restricted original reports
- **Severity:** Low
- **Type:** Confirmed contradiction (tension)
- **Evidence:** D-SEC-01 gives Auditors access to "supporting evidence". D-DAT-05 restricts access to original reports.
- **Resolution:** Define which roles may download original files. The recommendation includes Auditors.
- **Disposition:** Logged as OQ-37.
- **Approval required?** Yes.

## E. Data lifecycle and reliability

### AF-80 — Retention periods are unknown
- **Severity:** High
- **Type:** Unanswered question
- **Evidence:** D-DAT-08 forbids inventing retention periods.
- **Consequence:** Automatic deletion could destroy records the law requires to be kept. Keeping data indefinitely could breach privacy obligations.
- **Resolution:** Build the retention mechanism, but keep automatic deletion of financial and audit data disabled until qualified advisers approve periods (NFR-DAT-007). This blocks production.
- **Disposition:** Logged as OQ-41. External review required.
- **Approval required?** Legal and accountant.

### AF-81 — Backups keep deleted data
- **Severity:** Medium
- **Type:** Potential risk
- **Evidence:** D-DAT-06 requires deletion to "account for backups".
- **Consequence:** Backups cannot be edited record by record, so deleted data persists until those backups expire.
- **Resolution:** Disclose that backups age out under their own retention, and obtain legal review.
- **Disposition:** Specified: NFR-DAT-011. External review required.
- **Approval required?** Legal.

### AF-82 — Restore consistency across database, storage, jobs and notifications
- **Severity:** Medium
- **Type:** Potential risk
- **Evidence:** D-OPS-05 and D-OPS-07.
- **Consequence:** A point-in-time database restore can reference files that were uploaded later, or that were deleted. It can also revive jobs that were mid-flight and re-send notifications.
- **Resolution:** Evidence files are never overwritten (versioning), post-restore consistency checks run, and notifications go through an outbox.
- **Disposition:** Specified: NFR-REL-007, FR-NTF-005, AC-092.
- **Approval required?** No.

### AF-83 — Recovery targets cannot be verified yet
- **Severity:** Medium
- **Type:** Unanswered question
- **Evidence:** D-OPS-06 sets RPO ≤ 1 hour and RTO ≤ 4 hours, but no providers are selected (Seed L221).
- **Resolution:** Choose providers that support point-in-time recovery and object versioning. Measure the targets in restore drills.
- **Disposition:** Logged as OQ-43; AC-092.
- **Approval required?** Yes.

### AF-84 — Import limits need a performance target
- **Severity:** Medium
- **Type:** Unanswered question
- **Evidence:** D-IMP-09 requires load testing but sets no acceptable processing time.
- **Resolution:** The owner sets a target after a baseline measurement.
- **Disposition:** Logged as OQ-44; NFR-PERF-001.
- **Approval required?** Yes.

### AF-85 — Offboarding interacts with jobs, approvals and holds
- **Severity:** Medium
- **Type:** Missing requirement
- **Evidence:** D-DAT-06.
- **Consequence:** Without a defined order, offboarding could interrupt running jobs, leave pending approvals open or delete data under a legal hold.
- **Resolution:** A defined sequence: freeze, export window, hold, eligible deletion.
- **Disposition:** Specified: NFR-DAT-009. Logged as OQ-42.
- **Approval required?** Yes.

### AF-86 — Real customer data outside production
- **Severity:** Medium
- **Type:** Missing requirement
- **Evidence:** D-OPS-03 requires separate environments but has no data policy.
- **Resolution:** Synthetic or anonymized data only outside production.
- **Disposition:** Logged as OQ-45; NFR-OPS-002.
- **Approval required?** Yes.

### AF-87 — Job status after a crash
- **Severity:** Medium
- **Type:** Potential risk
- **Evidence:** D-IMP-07 and D-OPS-01.
- **Consequence:** A crash between committing rows and updating the job status can leave the status saying "failed" when the data was in fact committed.
- **Resolution:** Commit in idempotent batches, update the job status in the same transaction as each batch, and recover through lease expiry.
- **Disposition:** Specified: FR-IMP-011, NFR-REL-001, NFR-REL-002, AC-009.
- **Approval required?** No.

### AF-88 — Superseded files are evidence
- **Severity:** Low
- **Type:** Potential risk
- **Evidence:** D-IMP-11.
- **Consequence:** Deleting a superseded file would lose evidence that earlier matches and journals relied on.
- **Resolution:** Superseded files follow the retention policy for original uploads.
- **Disposition:** Specified: FR-IMP-019.
- **Approval required?** No.

### AF-89 — Disaster-recovery procedures had no concrete tests
- **Severity:** Medium
- **Type:** Missing requirement
- **Evidence:** D-OPS-05 requires "regular restore tests", but none were defined.
- **Resolution:** A restore drill with measured RPO and RTO, consistency checks and recorded evidence.
- **Disposition:** Specified: AC-092; plan M9.
- **Approval required?** No.

## F. Testing and release readiness

### AF-90 — No real report formats
- **Severity:** High
- **Type:** Unanswered question
- **Evidence:** Seed L249 and L256 leave field schemas and test datasets unresolved, and the repository has no sample files.
- **Consequence:** Tests built on invented formats would pass while failing on real reports. The release gate's financial-correctness evidence would be meaningless.
- **Resolution:** The owner supplies anonymized samples for the first gateways and banks. Fixtures are built from them.
- **Disposition:** Logged as OQ-07 and OQ-08. Gates M2.
- **Approval required?** Yes (owner action).

### AF-91 — Balanced but wrong ledgers would pass the tests
- **Severity:** High
- **Type:** Potential risk
- **Evidence:** D-REL-01 item 2 requires balanced postings, but balance alone does not prove correctness.
- **Consequence:** A complete test suite could pass while revenue, fees or receivables are misstated.
- **Resolution:** Accountant-written, reviewed expected-journal scenarios for each policy (specification §8.10), used as regression fixtures.
- **Disposition:** Specified (specification §12.3). External review required.
- **Approval required?** Accountant.

### AF-92 — Operational risks the test suite will not catch
- **Severity:** Medium
- **Type:** Potential risk
- **Evidence:** The specification's test strategy (§12.3).
- **Consequence:** Restore failures, alerts nobody receives, expired credentials, an identity-provider outage or a slow migration would not show up in CI.
- **Resolution:** Scheduled operational exercises with recorded evidence (plan M9).
- **Disposition:** Specified in the plan.
- **Approval required?** No.

### AF-93 — No accessibility target
- **Severity:** Medium
- **Type:** Unanswered question
- **Evidence:** Seed L256.
- **Resolution:** WCAG 2.2 AA is recommended.
- **Disposition:** Logged as OQ-46.
- **Approval required?** Yes.

### AF-94 — The permission matrix is not final
- **Severity:** Medium
- **Type:** Unanswered question
- **Evidence:** Specification §2.3 contains cells marked I and R.
- **Consequence:** Authorization tests cannot be finalized until the matrix is approved.
- **Resolution:** Approve the matrix, then generate the API tests from it.
- **Disposition:** Logged as OQ-36, OQ-37 and OQ-22.
- **Approval required?** Yes.

### AF-95 — Concurrency coverage
- **Severity:** Low
- **Type:** Missing requirement
- **Evidence:** Checklist §8 L145.
- **Resolution:** Named concurrency criteria were added.
- **Disposition:** Specified: AC-033, AC-034, AC-052.
- **Approval required?** No.

### AF-96 — No latency targets
- **Severity:** Low
- **Type:** Unanswered question
- **Evidence:** Seed L256 leaves performance targets unresolved.
- **Resolution:** Measure baselines first, then set targets.
- **Disposition:** Specified: NFR-PERF-004.
- **Approval required?** Later.

## Answers to the brief's audit questions

| Question (Brief, Phase 4) | Answer | Findings |
|---|---|---|
| Could source reports, reconciliation amounts, settlement breakdowns and postings disagree silently? | Yes, under the approved decisions alone: through settlement arithmetic, incomplete groups and unmatches after posting. The specification closes these with derived requirements. | AF-20, AF-22, AF-45 |
| How do fees, taxes, refunds, chargebacks, reversals, partial refunds and source adjustments affect matching and journals? | Matching: explicit components from the settlement report only, linked to the original payment, with exact arithmetic. Journals: no approved treatment yet. | AF-26, AF-41; spec §5.4, §8.10 |
| Is a source reference with an amount mismatch treated as a discrepancy? | Yes. Approved (D-REC-05) and specified (FR-REC-004, AC-021). | — |
| Can missing, ambiguous, duplicated or conflicting evidence lead to automatic matches? | Not under the specification. FR-REC-003 requires the absence of contradictory evidence; FR-REC-005 and FR-REC-006 cover missing and ambiguous evidence; FR-IMP-016 blocks conflicting observations. | AF-21, AF-32 |
| Do grouped matches always have an explicit supported relationship and correct financial treatment? | The relationships are an allowlist recommendation (G1–G4) pending approval. Financial treatment is pending accounting policy. | AF-28, AF-41 |
| How does revenue recognition work when evidence is incomplete or contradictory? | It goes to a review queue and is never posted automatically. The trigger policy is unresolved and needs external review. | AF-42 |
| How do corrections, revisions and reruns affect historical matches and posted journals? | History is kept; affected items are flagged; posted journals are never changed; corrections need approval. Treatment for closed periods is unresolved. | AF-45 |
| How do unmatching, overrides, period close, adjustments and reversals interact? | Through "Correction required" items, close-checklist blocking and reversals that need approval. | AF-45, AF-47 |
| Could a balanced journal be economically incorrect? | Yes. Mitigated by template validation, uniqueness, evidence-side review and accountant-reviewed golden scenarios. | AF-46, AF-91 |
| Are invalid drafts and unresolved material discrepancies prevented from posting? | Yes for the approved block conditions (FR-ACC-008, FR-ACC-011). Materiality criteria are pending OQ-14. | AF-30, AF-47 |
| Can opening balances, cutover and historical imports create duplicates? | Not for pre-cutover events (FR-ACC-017). Cross-cutover transactions are unresolved. | AF-43, AF-52 |
| Which accounting policies need approval or professional review? | Specification §8.10 and §13.3. | AF-40 to AF-43, AF-50 |
| Can role combinations bypass independent approval? | Journals: no (approved). Other approval types: only if OQ-17 is not adopted. A sock-puppet second identity: residual risk. | AF-44 |
| Is access control enforced server-side? | Yes by requirement (NFR-SEC-006), verified by a generated permission-matrix test. | AF-65, AF-94 |
| Are queries, jobs, files, exports, reports and notifications all tenant-scoped? | Yes by requirement (D-SEC-04, NFR-SEC-007, NFR-SEC-008, NFR-SEC-016, FR-NTF-004, FR-RPT-010). | AF-63 |
| Do cross-tenant tests cover both allowed and denied operations? | Yes, after this audit. | AF-65 |
| Are session invalidation, MFA recovery, sensitive actions and privileged settings controlled? | Session invalidation and MFA enforcement: specified. MFA recovery belongs to the identity provider (D-SEC-06); its strength is a selection criterion. Fresh authentication defaults: OQ-38. | AF-62 |
| Do retention and deletion conflict with records, audit, holds or backups? | Potentially. Automatic deletion stays disabled until periods are approved; holds override; backup behaviour is disclosed. | AF-80, AF-81 |
| How do corrected files and offboarding affect jobs, evidence and history? | Superseded files are kept; offboarding follows a defined sequence. | AF-85, AF-88 |
| Can partial imports and retries create duplicates or inconsistent job status? | Not under the specified idempotency and transactional status updates. | AF-22, AF-87 |
| Does restoring a backup include files, metadata and audit history? | Required by D-OPS-05; post-restore consistency checks specified. | AF-82 |
| Are the recovery objectives and import limits achievable and measurable? | Unknown until providers are chosen and load tests run. Both now have measurement criteria. | AF-83, AF-84 |
| Do failure and disaster-recovery procedures have concrete tests? | Yes, after this audit (AC-090 to AC-092; plan M9). | AF-89, AF-92 |
| Does every approved high-risk requirement have an acceptance test? | Most do (§12.1). Gaps depend on unresolved policies: accounting scenarios and risk criteria. | AF-91, AF-94 |
| Could a green test suite leave important risks untested? | Yes: economic correctness (AF-91), real formats (AF-90) and operational readiness (AF-92). | AF-90 to AF-92 |

## Independent review results

Pending. Two independent read-only reviews were started on 15 October 2026 (one on financial and accounting fidelity, one on security, lifecycle, testing and cross-document consistency). Their findings will be recorded here, with their dispositions, once received and verified.
