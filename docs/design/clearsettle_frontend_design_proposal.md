# ClearSettle — Frontend Design Proposal

**Status:** PROPOSAL for owner review (17 October 2026). Nothing here is approved or implemented. It answers
OQ-47 (information architecture and visual direction) and the M1 frontend deliverable "a design proposal
produced with the `frontend-design` skill … the owner must approve it" (implementation plan §5 M1, D-UI-01,
D-UI-05, NFR-UX-003).

**What exists today:** the frontend is an authentication test scaffold (`frontend/app/page.js`,
`frontend/app/review/page.js`): unstyled pages that exercise sign-in, sign-out and the sensitive-action
review. It is not the ClearSettle interface, and the concepts below do not replace it.

**Visual concepts** (static HTML, open in a browser; every page carries a "design concept, not the
application" banner and uses illustrative sample data only):

| File | Shows |
|---|---|
| [`concepts/overview.html`](concepts/overview.html) | Application shell and the period overview (dashboard) |
| [`concepts/reconciliation.html`](concepts/reconciliation.html) | Reconciliation run results and the record trace |
| [`concepts/flows.html`](concepts/flows.html) | Sign-in (Keycloak theme direction), the post-enrolment step, session end, sensitive-action confirmation, data states |
| [`concepts/tokens.css`](concepts/tokens.css) | The proposed tokens, as CSS custom properties |

No customer, transaction volume or financial result in the concepts is real.

---

## 1. Brief

- **Subject:** proving that the money customers paid actually arrived, and turning that evidence into
  approved double-entry journals. The chain is order → payment attempt → settlement line → payout → bank
  credit → journal (specification §1.1), and every difference is either explained by evidence or stays
  visibly open (D-REC-17).
- **Audience:** finance teams at Indian small and medium businesses that take payments through gateways:
  reconciliation analysts, journal preparers, controllers who approve and post, workspace admins and
  external reviewers (§1.3). They work at a desk, in long sessions, with large tables; they are accountable
  for every number they sign off.
- **Primary job of the interface:** show, for a period, where the money is and what is unexplained, and
  make the next correct action obvious, without ever presenting an unexplained difference as resolved.
- **Benchmark:** Stripe-level polish (D-UI-02), not Stripe's look. Sign-in follows the approved reference:
  a restrained form over a flowing multicolour background (D-UI-03; the screenshot itself is still missing).

### Design principles

1. **The chain is the interface.** The memorable element is the settlement chain: the five links from
   order to bank credit, then the ledger, with the gaps between them labelled. It appears as the overview
   strip and, for one record, as the trace in the reconciliation detail panel. Everything else stays quiet.
2. **Both amounts, never a corrected one.** Where sources disagree, show each original amount, its file and
   row, and the difference (FR-EXC-009). Differences get the one warm colour in the system.
3. **Nothing happens by surprise.** Financial actions are explicit, reviewed and confirmed; no optimistic
   updates (NFR-UX-006). The UI says what a button will do before it does it ("Approve and post 3
   journals").
4. **Evidence over decoration.** Structure (borders, colour, icons) encodes meaning: status, risk,
   selection. No gradients, illustrations or motion in the workspace except where they answer an action.
5. **Honest states.** Loading, empty, partial and error are designed states; a failed request is never
   shown as zero (NFR-UX-005).

### Review against the generic defaults (the skill's second pass)

| Default that was considered | Decision |
|---|---|
| Cream background, serif display face, terracotta accent | Rejected: cool grey-green paper (`#f3f5f4`), one sans family, petrol primary |
| Near-black page with one acid accent | Rejected: long sessions over dense tables need a light, low-glare base |
| SaaS card kit: identical rounded cards, one radius, soft shadows | Panels only where content is a unit; two radii by role (controls 6 px, panels 10 px); no card shadows (dialogs only) |
| Big number + small label + gradient as the hero | The overview's figures exist only inside the chain, where each number is a stage and each gap is a link to the work |
| All-caps eyebrows, middle-dot meta strings, monospace small labels, "→" on buttons | Not used; references use a condensed cut of the same family instead of a monospace face |
| Generic blue primary (`#2563eb`-like) or Stripe's violet | Petrol `#0b5563`: credible, distinct, and not confusable with any status colour |

---

## 2. Visual direction and tokens

### Colour

| Token | Hex | Role |
|---|---|---|
| Ink | `#17232b` | Text and icons (14.6:1 on paper) |
| Paper | `#f3f5f4` | App background |
| Sheet | `#ffffff` | Tables, panels, forms, dialogs |
| Rule | `#d6dddb` | Borders and dividers |
| Petrol | `#0b5563` | Primary actions, focus ring, selection, the chain line |
| Amber | `#a85808` | Differences: the thing the product exists to show (4.6:1 on its wash, 5.2:1 on white) |

Reconciliation outcomes each have a colour **and** an icon **and** a text label (status is never shown by
colour alone, NFR-UX-002): matched `#1f6f47` (tick), candidate `#2c56a8` (link), difference `#a85808`
(delta), awaiting settlement `#6a4aa8` (clock), unmatched `#55636c` (broken link). Vermilion `#ad2a1a` is
reserved for high risk and destructive actions. Debit and credit are never coded red/green; they are
labelled columns (Dr/Cr) in journals and statements.

Measured text contrast of the tokens (WCAG formula): secondary text `#4a5963` 7.2:1 and tertiary text
`#606d76` 4.9:1 on paper; white on petrol 8.4:1; each status colour on its tint 5.3–6.0:1; amber on its tint
4.6:1. The target is WCAG 2.2 AA (OQ-46, proposed, not yet approved); contrast must be re-measured on the
implemented components, including focus rings and disabled states.

### Type

**IBM Plex Sans** for everything, with **IBM Plex Sans Condensed** for references and identifiers
(`pay_Q7XK2LM`, `SETL-2604-17`). Chosen for this product, not by habit:

- it has the rupee sign and true tabular figures, and its 0/O and 1/l/I are distinct, which matters when
  people compare references and amounts;
- it has a Devanagari companion (IBM Plex Sans Devanagari), so a later Hindi or Marathi interface would
  keep one typographic voice (India first, D-PRD-03);
- it is open source and can be self-hosted (no third-party font requests from the application).

Scale: 12 / 13 / 15 / 18 / 24 / 32 px (table meta, dense tables, body, panel titles, page titles, chain
figures). Weights 400, 500, 600 only. Sentence case everywhere.

### Layout

- Desktop first (1280–1600 px) with responsive tablet and phone layouts for review flows (OQ-46 proposal).
- Shell: 232 px navigation rail, 56 px top bar, content up to 1440 px, 4 px spacing base
  (4/8/12/16/24/32/48).
- Work views use a split layout: list on the left, detail panel (400 px) on the right; below 1200 px the
  detail stacks under the list; on phones the rail becomes a horizontal strip and wide tables scroll inside
  their panel (a card layout for phones is proposed for the exception queue only).
- Left alignment throughout; numbers right-aligned in tabular figures.

### Motion

The workspace has none except feedback: a dialog opening, a row expanding, a toast after a confirmed action.
The sign-in background drifts slowly (28-second cycle) as the approved reference asks, and stops for users
who prefer reduced motion.

---

## 3. Information architecture and navigation

```
[Workspace switcher]                         Top bar: period ▾  period status  data cut-off   Jobs  Notifications  User ▾
Overview                                                                                      └ Account, Sign out,
Imports            Source reports · Mapping templates · Quarantined rows                        Sign out everywhere
Reconciliation     Runs (Stage 1, Stage 2) · Results · Compare runs · Candidates
Exceptions         Queue · Assigned to me · Awaiting approval
Records            Orders · Payment attempts · Settlement lines · Payouts · Bank transactions
Ledger             Journals (drafts, submitted, posted) · Chart of Accounts · Periods and close · Opening balances
Reports            Trial balance · P&L · Balance sheet · General ledger · Journal entries
                   Reconciliation summary · Unmatched · Exceptions · Fee breakdown · Audit history export
Settings           Workspace profile · Members and roles · Source accounts · Templates · Financial year and cutover
                   Security (sessions) · Offboarding
```

- The **workspace switcher** is explicit and lists only the user's memberships (FR-WSP-008, FR-WSP-018).
  Switching clears all client state and cached data of the previous workspace (FR-WSP-017).
- The **period** is a first-class control: most work is "this month", and every accounting view shows the
  period's Open/Closed status and is labelled Provisional when appropriate (FR-RPT-003).
- "Transaction" alone is avoided (§2.1): the section is **Records**, with the specific record types.
- Navigation items are shown by permission (§2.3), but the server enforces every permission; hiding a link
  is a convenience, never a control.
- **Admin capabilities** live in Settings for users with the Admin role: members and roles, invitations,
  audit history (per OQ-37), offboarding. MFA recovery is performed in Keycloak today (D-SEC-18); a
  ClearSettle screen for it is not proposed until its procedure is designed.

---

## 4. Page and component inventory

| Area | Pages | Key components |
|---|---|---|
| Authentication | Signed-out start; post-enrolment "sign in once more"; session ended (idle/absolute); account disabled; access denied; Keycloak login theme (password, code, enrolment) | Auth card, message (info/warn/error), colour field background |
| Shell | Workspace switcher; create workspace; period selector; jobs tray; notifications; user menu | Rail, top bar, switcher listbox, job progress |
| Overview | Period overview | Settlement chain, needs-attention list, age bars, activity feed |
| Imports | Upload; mapping with preview; validation summary; import detail; quarantined rows; templates; revision diff | Dropzone, column mapper, row preview grid, job status, diff table |
| Reconciliation | Runs list; run results by outcome; candidate review; run comparison | Outcome selector, data grid, split detail, record trace, comparison grid |
| Exceptions | Queue (filters: type, status, assignee, risk, link, currency, age); exception detail; approval | Status history timeline, evidence list, resolution form, approval panel |
| Records | Record browsers per type; record detail with its trace | Data grid, trace |
| Ledger | Journal list and detail; draft editor; submission; approval and posting; Chart of Accounts; periods and close checklist; opening balances | Journal lines (Dr/Cr), balance check, close checklist |
| Reports | Statement and report views; export dialog; export history | Report header with coverage disclosure, export job |
| Settings | Profile; members and roles; invitations; source accounts; financial year and cutover; sessions; offboarding | Role matrix, invitation form, audit note |
| Cross-cutting | Sensitive-action confirmation (step-up and review); toasts; empty, loading, partial and error states | Dialog, confirmation facts table, expiry note |

### Component conventions

- **Amounts:** always with currency (NFR-UX-002): ISO code as a muted prefix in tables (`INR 18,500.00`),
  symbol allowed in prose. Tabular figures, right-aligned, exact decimal values from the API (never
  floating-point arithmetic in the browser). Negative values with a true minus sign; differences signed and
  in amber. No total ever adds two currencies (FR-RPT-014). Grouping follows the workspace locale; for INR
  the proposal is Indian grouping (`1,24,500.00`) — a decision for the owner (§10).
- **Dates and times:** shown in the workspace time zone with its label ("IST"); the UTC instant is available
  on hover and in exports (NFR-UX-004). Value dates are dates, not timestamps.
- **References:** condensed cut, copyable, never truncated in the middle.
- **Tables:** sticky headers, sortable columns that say how they are sorted, row selection with a visible
  bar, keyboard navigation (arrow keys, Enter opens detail), server-side pagination and filtering for large
  sets (OQ-50 proposes cursor pagination).
- **Statuses:** chip with icon and label; risk is a separate chip; never colour alone.
- **Buttons:** say what happens ("Resolve with a reason", "Approve and post"); one primary per view; the
  same verb in the button, the confirmation and the toast.
- **Forms:** labels above fields, inline validation after the field is left, server errors attached to the
  field they concern, and a summary at the top for long forms.
- **Dialogs:** used for confirmation and short focused tasks only; focus trapped and restored; Escape
  cancels; the destructive or financial action is never the default focus.
- **Focus and keyboard:** a 2 px petrol focus ring with offset on every interactive element; skip link to
  content; all actions reachable without a pointer.

---

## 5. Overview (dashboard)

Question it answers: *for this period, where is the money and what stops us from closing?*

```
┌ April 2026 ─ Provisional: open period, 6 unposted journals, 4 high-risk exceptions ──────────────────────┐
│ Where the money is                                         Stage 1 R-0412, Stage 2 R-0413, finished …     │
│  (◎)──[12 without payment]──(◎)──[58 awaiting]──(◎)──[9 differences]──(◎)──[1 short credit]──(◎)──[24 ready]──(◎)
│  Orders        Successful payments  Settlement lines   Payouts          Bank credits      Posted to ledger │
│  2,148         2,131                2,073              30               30                18               │
│  INR …         INR …                INR …              INR …            INR …             INR …            │
│  Fees and taxes deducted (as reported) · Open differences · Bank statement continuity                     │
├──────────────────────────────────────────────────────┬────────────────────────────────────────────────────┤
│ Needs attention (by risk, then age)                  │ Open differences by age (high risk / routine)      │
│  High risk: 4 awaiting approval            [Review]  │ ▇▇▇▇▇▇▇▇ 0–7 d  ▇▇▇▇ 8–30 d  ▇▇ 31–60 d  ▏ >60 d  │
│  21 candidates                             [Review]  ├────────────────────────────────────────────────────┤
│  Payout credited short                [Investigate]  │ Activity (audit events)          [Audit history]   │
│  6 journals submitted for posting          [Review]  │  22:10 Stage 2 run finished …                      │
│  Settlement report partially imported [Open import]  │  21:48 Bank statement imported …                   │
└──────────────────────────────────────────────────────┴────────────────────────────────────────────────────┘
```

- Every number is a link to the filtered list behind it; every gap label is the work that closes it.
- The strip shows counts and amounts per currency; with several currencies it shows one row per currency.
- Role emphasis: analysts see candidates and exceptions first, controllers see approvals and the close
  checklist, auditors get the same view read-only. The data is the same; only the order changes.
- One small chart (differences by age, split by risk) because age drives action; no vanity metrics (volume
  trends, growth) — they answer no question in this workflow.

---

## 6. Reconciliation workflow

```
┌ Reconciliation ─ Run R-0412 · scope · rules v7 · inputs · started by ──── [Stage 1|Stage 2] [Compare] [Start a new run]
│ ⚠ Partially imported input: results for 28 Apr may be incomplete. Open the import
│ [Matched 2,031] [Candidates 21] [Differences 9 ▾] [Awaiting settlement 58] [Unmatched 12] [Outside scope 0]
├──────────────────────────────────────────────────────────────┬───────────────────────────────────────┐
│ Filters: type · risk · assignee · age                [Export]│ pay_Q7XK2LM  amount mismatch, 6 days   │
│ Payment     Value date  Gateway   Settlement  Difference Type│ ○ Order ORD-58213     INR 18,500.00     │
│ ▌pay_Q7XK2LM 24 Apr     18,500.00 17,980.10   −519.90   …    │   orders_apr.csv, row 1,204             │
│  pay_N2HD81Q 24 Apr      2,499.00  2,439.03    −59.97   …    │ ○ Payment attempt     INR 18,500.00     │
│  …                                                           │ ◉ Settlement line     INR 17,980.10     │
│                                                              │   ┌ Gateway   INR 18,500.00 ┐          │
│                                                              │   │ Settlement INR 17,980.10 │          │
│                                                              │   └ Difference INR −519.90   ┘          │
│                                                              │   [Attach evidence] [Comment] [Resolve] │
│                                                              │ ┆ Payout · Bank credit · Journal         │
└──────────────────────────────────────────────────────────────┴───────────────────────────────────────┘
```

The user journey follows J2 → J3 → J4 → J5 (specification §3):

1. **Import** (J2): upload, map with a preview, review the validation summary, commit. A partially imported
   file is visible everywhere it is used.
2. **Run** (J3, J4): the user starts a run for a period and stage (runs are never automatic, FR-REC-066);
   one active run per stage (FR-REC-061); progress in the jobs tray.
3. **Review outcomes:** the outcome selector filters the grid; candidates open a side-by-side comparison and
   are confirmed or rejected explicitly, never automatically (D-REC-06).
4. **Investigate** (J5): the detail panel shows the record's trace in both directions (file → row → record
   → match or exception → event → journal line, FR-FIN-007) with both original amounts at the point of
   disagreement. Actions: comment, attach evidence, match manually (with evidence), unmatch (with reason),
   resolve with a reason and resolution type (FR-EXC-004).
5. **Approve** high-risk resolutions: a different authorized user, through the sensitive-action
   confirmation when the operation is classified sensitive (D-SEC-17).
6. **Rerun and compare** (J6): added, removed and changed matches and exceptions between two runs
   (FR-REC-064); manual decisions flagged "Needs re-review", never silently dropped (FR-REC-063).

None of these screens can be functional before their backend exists; they must not be built against fake
data to look finished (§8).

---

## 7. Authentication and session integration

How the designed UI uses what exists (D-SEC-11 to D-SEC-19):

- **Same origin, no tokens in the browser.** The UI is the Next.js static export served by the proxy on the
  API's origin. It calls `/api/...` with `credentials: "same-origin"`. The session cookie is `HttpOnly`; the
  browser never receives OIDC tokens, client secrets or session contents (AC-159). Nothing is kept in web
  storage except non-sensitive UI preferences.
- **Sign-in:** a link to `/oauth2/authorization/keycloak`; Keycloak shows the password, code and enrolment
  pages (to be themed, see below); the backend sets the session and redirects to `/`. The UI learns its
  state from `GET /api/me` (401 = signed out).
- **Errors from sign-in** arrive as `/?auth_error=<code>` and map to designed messages: `mfa_not_verified`
  (expected after enrolment: "sign in once more with your code", D-SEC-16), `mfa_required`,
  `account_disabled`, `reauth_user_mismatch`, `session_expired`, and a generic message for anything else.
- **CSRF:** every unsafe request sends the `__Host-XSRF-TOKEN` value as `X-XSRF-TOKEN` plus
  `X-CS-Request: 1` (one shared API client, as `frontend/lib/api.js` does today). `GET /api/csrf` primes the
  cookie. A 403 `csrf_*` is a programming error, reported, never retried blindly.
- **Session end:** any 401 `unauthenticated` or `session_expired` shows the "you were signed out" state and
  keeps the user's place for after sign-in; nothing is resubmitted automatically. A warning before the
  15-minute idle timeout ("where practical", AC-162) needs a small backend addition (remaining idle time)
  and is proposed for the shell milestone.
- **External deep links under `SameSite=Strict`:** the first navigation from another site arrives without
  the session cookie (ADR-0004). The shell must treat that 401 as "re-check" — sign in, then return to the
  requested route — rather than show an error. This UX is still outstanding and belongs to the shell work.
- **Sign out / sign out everywhere:** `POST /logout` (then the provider logout URL it returns) and
  `POST /api/session/logout-everywhere`, both in the user menu, with a confirmation for "everywhere".
- **Sensitive actions:** the feature endpoint answers `202 confirmation_required` or `401 step_up_required`
  with `stepUpUrl`; the UI shows the review dialog or "Confirm it is you", navigates to `stepUpUrl`, returns
  to `/review?action=<id>`, shows `GET /api/sensitive-actions/<id>`, and sends
  `POST /api/sensitive-actions/<id>/confirm` only when the user presses the named action button. 409
  (already used), 410 (expired), 404 and 422 have designed messages. Nothing is optimistic.
- **Authorization in the UI** is presentation only; the server decides (D-SEC-03). The UI never infers
  permission from a cached role after a 403.
- **Keycloak login theme:** the credential pages are Keycloak's; matching D-UI-03 needs a ClearSettle login
  theme (FreeMarker templates and CSS) maintained with the realm. Proposed for the same milestone as the
  shell.

---

## 8. Screens mapped to backend APIs

| Screen | Existing API | Missing backend (milestone) |
|---|---|---|
| Sign-in states, sign-out, sign out everywhere, session ended | `/oauth2/authorization/keycloak`, `/login/oauth2/code/keycloak`, `GET /api/me`, `GET /api/session`, `GET /api/csrf`, `POST /logout`, `POST /api/session/logout-everywhere` | Remaining idle time for the expiry warning (M1) |
| Sensitive-action review and confirmation | `GET /api/sensitive-actions/{id}`, `POST …/confirm`, `POST …/cancel`, step-up via `?step_up=` | A real sensitive operation (first: posting approval, M6) |
| Workspace switcher, create workspace | none | Workspaces, memberships, active-workspace validation, `/api/v1/workspaces` (M1) |
| Members, roles, invitations | none | Membership, roles, invitations, audit (M1) |
| Overview | none | Per-period aggregates from runs, exceptions, journals, imports (M3–M8) |
| Imports, mapping, quarantine, revisions | none | Upload storage, import jobs, templates, validation (M2, M5) |
| Reconciliation runs and results, candidates, compare | none | Runs, matches, candidates, comparison (M3–M5) |
| Exceptions | none | Exception workflow and approvals (M5) |
| Records and trace | none | Source records and provenance, trace endpoint (M2–M7) |
| Ledger: journals, approval, periods, opening balances | none | Accounting core (M6, M7) |
| Reports and exports | none | Reporting and export jobs (M8) |
| Settings: profile, financial year, source accounts | none | Workspace settings (M1, M6) |
| Jobs tray, notifications | none | Jobs and notifications (M2, M8) |
| Audit history | `security_event` table (authentication events only; no API) | Audit core and its API (M1), export (M8) |

---

## 9. Implementation sequence

Most useful functional screen first; every step ships only screens whose backend exists.

1. **Shell and authentication** (functional now): tokens and base components; sign-in states including
   `mfa_not_verified`; signed-out and session-ended handling with deep-link return; user menu with sign out
   and sign out everywhere; the sensitive-action confirmation dialog wired to the existing endpoints;
   accessibility baseline. Replaces the scaffold pages, keeping the e2e hooks the harness uses.
2. **Workspaces and members** (with the M1 workspace backend): create workspace, explicit switcher that
   clears client state, members, roles and invitations. Completes J1.
3. **Imports** (M2): the first financial screen, the start of the release-gate workflow.
4. **Reconciliation results and record trace** (M3, M4), then **exceptions** (M5).
5. **Ledger and approvals** (M6, M7): posting approval becomes the first real sensitive operation.
6. **Overview** with real aggregates, **reports and exports** (M8).
7. **Keycloak login theme** alongside step 1 or 2 (needs the D-UI-03 reference screenshot).

---

## 10. Decisions requested from the owner

1. Approve the visual direction: palette, IBM Plex Sans, layout and the settlement chain as the signature
   element.
2. Approve the information architecture (section names, Records instead of Transactions, Settings holding
   admin capabilities).
3. Amount formatting for INR: Indian digit grouping (`1,24,500.00`) or international (`124,500.00`), and
   negative-value style in statements (minus sign or parentheses).
4. Accessibility and support target (OQ-46): WCAG 2.2 AA, current evergreen browsers, desktop first with
   responsive review flows.
5. Frontend dependencies (OQ-48, each adds supply-chain surface): proposed **Radix UI primitives** (dialogs,
   menus, listboxes with correct accessibility), **TanStack Table** with **TanStack Virtual** (large grids),
   **TanStack Query** (server state, with a full cache clear on workspace switch); styling with CSS custom
   properties and CSS Modules (no CSS framework); self-hosted Plex fonts. No animation library.
6. Provide the D-UI-03 reference screenshot (OQ-47) before the Keycloak theme is designed.
7. Confirm the sequence in section 9, starting with the shell and authentication.
