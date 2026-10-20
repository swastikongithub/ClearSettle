# ClearSettle — Frontend Design Proposal

**Status:** APPROVED by the owner on 19 October 2026: the seven decisions in section 10, with the owner's
clarifications, are recorded as D-UI-07 to D-UI-13 in the decision register. Proposed 17 October 2026 and
revised 19 October 2026 (see *Review corrections* below). The concepts remain static design references, not
the application; what is implemented is recorded in `docs/product/clearsettle_implementation_status.md`. It
answers OQ-47 (information architecture and visual direction) and the M1 frontend deliverable "a design proposal
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
| [`concepts/index.html`](concepts/index.html) | A starting page that links the three concepts and says what to look at in each |

No customer, transaction volume or financial result in the concepts is real.

**Previewing locally:** open `docs/design/concepts/index.html` in a browser (on Windows:
`start docs\design\concepts\index.html` from the repository root). No build, server or install is needed. The
pages load IBM Plex from Google Fonts and fall back to a system font offline; the application would serve its
fonts itself. Narrow the window below 1100 px and 960 px, or use the browser's device mode at 390 px, to see
the tablet and phone layouts. The concepts were rendered in Chromium at 1600, 1440, 1280, 1024 and 390 px
with no horizontal page scroll and no console errors.

### Review corrections (19 October 2026)

A review of the concepts against the specification and at more widths found three faults, now corrected:

- **Gross compared with net.** The reconciliation example compared the payment's gross amount (INR
  18,500.00) with the settlement line's *net* amount and called the fee an "unexplained difference". The
  specification forbids exactly that comparison (FR-FIN-001; L2 compares gross with gross, and the net is
  checked against the reported components by FR-REC-021). The table now shows *Payment gross* and
  *Settlement gross*, and the trace shows the line's reported fee, tax on fee and net beside the comparison.
  A second row wrongly showed an unreported settlement as a "Partial settlement" difference; it is now a
  currency mismatch whose amounts are shown but not compared. The Differences tile no longer nets signed
  differences (offsetting errors would hide each other) and never adds two currencies.
- **Layout.** At 1280 px, inside the proposed desktop range, the chain's labels covered the stage circles;
  they now sit above the line between the two stages they describe, and the chain runs vertically below
  1100 px. At 1024 px the reconciliation header squeezed its title into a one-word column; its actions now
  wrap below it. A table column (age) was hidden off the side of its panel at 1440 px; risk and age now sit
  under the exception type.
- **Colour roles.** Amber also marked "session ended" and "confirmation expired", and an outcome colour
  (awaiting, purple) marked the open period, which contradicted "one warm colour for differences". Session
  and confirmation notices are now informational (petrol), the period state and routine risk are neutral,
  and amber is used only for differences and the data gaps behind them (a partially imported file).

The sample figures were also made to agree with each other (orders less successful payments, journals to
post, stage 2 results).

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
(delta), awaiting settlement `#6a4aa8` (clock), unmatched `#55636c` (broken link). Outcome colours are used
for outcomes only. Vermilion `#ad2a1a` is reserved for high risk and destructive actions. Debit and credit
are never coded red/green; they are labelled columns (Dr/Cr) in journals and statements.

Messages have three roles: **information** on a petrol wash (a session ended, a confirmation was already
used or expired, the post-enrolment sign-in); **data warning** in amber, only when the numbers themselves
may be incomplete or wrong (a partially imported file, a run that used it); **error** in vermilion, only when
an action failed and the user must do something. Neutral grey marks states that are neither (the period's
open/closed state, routine risk).

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
  Indian grouping (`1,24,500.00`), approved as D-UI-09.
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
│           [17 without payment]  [9 differences]  [All in payouts]  [1 short credit]   [6 to post]          │
│                                 [58 awaiting]                                                              │
│  (◎)────────────┴──────────(◎)─────────┴──────(◎)───────┴───────(◎)───────┴───────(◎)───────┴──────(◎)     │
│  Orders        Successful payments  Settlement lines   Payouts          Bank credits      Posted journals  │
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

- Every number is a link to the filtered list behind it; every callout above a link is the work that closes
  it, placed on the link it belongs to (stage 1 differences sit between payments and settlement lines).
- Open differences are summed without netting: a +500 and a −500 are INR 1,000.00 of open work, not zero.
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
│ Payment     Value date  Payment   Settlement  Unexplained    │ ○ Order ORD-58213     INR 18,500.00     │
│                         gross     gross       Exception      │   orders_apr.csv, row 1,204             │
│ ▌pay_Q7XK2LM 24 Apr     18,500.00 18,050.00   −450.00        │ ○ Payment (gross)     INR 18,500.00     │
│                                               Amount mismatch│ ◉ Settlement line     INR 18,050.00     │
│                                               High risk, 6 d │   ┌ Payment gross    INR 18,500.00 ┐    │
│  pay_N2HD81Q 24 Apr      2,499.00  2,499.00     −0.99        │   │ Settlement gross INR 18,050.00 │    │
│                                         Settlement line inc. │   └ Unexplained      INR −450.00   ┘    │
│  …                                       6 of 9 shown        │   fee 361.00, tax 64.98, net 17,624.02  │
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

### What the approved stack implies (no change proposed)

The Next.js static export served by nginx on the API's origin stays (D-TEC-03, D-SEC-11). Nothing in this
design needs server rendering or a Node server, and adding one would put authenticated pages back on a
server path that D-SEC-11 deliberately avoids. Two consequences need to be designed for:

- **Routes that carry an identifier use query parameters** (`/reconciliation/run/?id=R-0412`), as
  `/review?action=<id>` does today. A static export cannot generate a page for an identifier it does not
  know at build time, and nginx falls back to `/index.html` for unknown paths, so a path such as
  `/runs/R-0412/` would silently show the overview.
- **A Content Security Policy for the frontend is missing and needs build support.** nginx serves the static
  pages with no `Content-Security-Policy` header today, and nothing in the specification requires one; it is
  recommended for the shell milestone. The export emits inline scripts (checked in the current build), and a
  static export cannot use per-request nonces, so a strict policy needs the inline scripts' hashes computed at
  build time and written into the nginx configuration. Allowing `'unsafe-inline'` for scripts would be the
  weak alternative and is not recommended.

---

## 8. Screens mapped to backend APIs

| Screen | Existing API | Missing backend (milestone) |
|---|---|---|
| Sign-in states, sign-out, sign out everywhere, session ended | `/oauth2/authorization/keycloak`, `/login/oauth2/code/keycloak`, `GET /api/me`, `GET /api/session`, `GET /api/csrf`, `POST /logout`, `POST /api/session/logout-everywhere` | None. The expiry warning needs no new endpoint: the browser counts idle time from the last request the server answered and shares activity between tabs (built 20 October 2026) |
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
   **Built 20 October 2026** (evidence in the implementation status, "Application shell"). The confirmation
   is the review page, because the step-up returns the user to it; an in-place confirmation dialog for an
   operation that needs no step-up arrives with the first real sensitive operation (M6). Sections without a
   backend show a plain not-built state, with no sample data.
2. **Workspaces and members** (with the M1 workspace backend): create workspace, explicit switcher that
   clears client state, members, roles and invitations. Completes J1.
3. **Imports** (M2): the first financial screen, the start of the release-gate workflow.
4. **Reconciliation results and record trace** (M3, M4), then **exceptions** (M5).
5. **Ledger and approvals** (M6, M7): posting approval becomes the first real sensitive operation.
6. **Overview** with real aggregates, **reports and exports** (M8).
7. **Keycloak login theme** alongside step 1 or 2 (needs the D-UI-03 reference screenshot).

---

## 10. Decisions (approved 19 October 2026)

The owner approved all seven recommended defaults on 19 October 2026, with these clarifications. The
decision register entries are authoritative; the recommendations below are kept as the reasoning.

| # | Decision | Register | Owner's clarification |
|---|---|---|---|
| 1 | Visual direction | D-UI-07 | Professional, restrained, precise; no unnecessary gradients, decorative animation or dashboard-template styling. |
| 2 | Navigation | D-UI-08 | No separate Admin section until the admin-access decision (OQ-36). |
| 3 | Amounts | D-UI-09 | Indian grouping for INR, international for other currencies; minus signs on working screens, parentheses on P&L and balance-sheet views; exports numeric; never add currencies or compare gross with net. |
| 4 | Accessibility and browsers | D-UI-10 | No paid device testing without separate authorization; real Safari, iOS and Android results stay outstanding until available. |
| 5 | Dependencies | D-UI-11 | Static export and same-origin API kept; Radix, TanStack Query, TanStack Table and virtualization only when needed; fonts and icons in the repository; no CSS framework, component kit or animation library without a documented need. |
| 6 | Sign-in reference | D-UI-12 | Do not block on the screenshot. The application's own sign-in follows the approved direction with a Stripe-inspired polish, without copying; the Keycloak theme is a separate, optional task. |
| 7 | Build order | D-UI-13 | Shell and session experience first (return to the intended page, idle warning); backend session revocation before the members screen; then dependency order. |

### 1. Visual direction

**Recommended:** approve the palette, IBM Plex Sans with its condensed cut, the layout, and the settlement
chain as the one signature element, as corrected on 19 October.

**Why:** the chain is the product's own evidence model, so it explains the product instead of decorating
it; a light, low-glare base suits long table sessions; one warm colour that means "difference" lets the
eye find the work.

**If you want a different feel:** the palette is the cheapest part to change, since the tokens are isolated
in one file and the layout does not depend on them.

### 2. Information architecture

**Recommended:** approve the eight sections in section 3, with **Records** instead of "Transactions" and
the administrator's tools inside **Settings**.

**Why:** the sections follow journeys J1 to J6 and the record types of the specification, and "transaction"
is ambiguous there (§2.1).

**Alternative:** a separate Admin section, if workspace administrators are a different audience from the
finance team (for example an IT administrator who should not see financial sections). That depends on
OQ-36 (Admin access) and can be revisited then.

### 3. Amounts in INR

**Recommended:**
- Indian digit grouping for INR (`1,24,500.00`), international grouping for every other currency
  (`USD 124,500.00`).
- Always the currency's full minor units (two decimals for INR and USD), and never abbreviated ("₹1.2 Cr"
  or "12.4 L" are not used, even on the overview).
- A true minus sign in working views and differences (`−450.00`). Parentheses only in the formal
  statements, the P&L and the balance sheet, where accountants expect them.
- Exports carry plain decimal values (`124500.00`) with a separate currency column, so spreadsheets read
  them as numbers.

**Why:** the users are Indian finance teams whose ledgers, bank statements and accounting software group in
lakhs and crores. A difference needs a direction, and a minus sign reads faster in a dense table than
brackets.

**How:** amounts are formatted from the API's decimal string by one small, tested formatter that never
converts them to a JavaScript number.

**Alternative:** international grouping everywhere is a one-line change in that formatter. It mostly
affects familiarity, not structure.

### 4. Accessibility and browser support (OQ-46)

**Recommended:**
- WCAG 2.2 AA for every application screen, and complete keyboard operation.
- The current and previous major versions of Chrome, Edge, Firefox and Safari on desktop.
- Safari on iOS and Chrome on Android for the review flows: sign-in, approvals and exception review.
- Layout: designed for 1280 to 1600 px, usable at 1024 px, and review flows from 360 px.

**Why:** AA is the usual procurement baseline and what the tokens were measured against.

**Caveat:** real Safari, iOS and Android testing needs a Mac and phones, or a paid device cloud, which is
billable and needs your authorization. Today only Playwright WebKit and device emulation are available, and
they are not Safari.

### 5. Frontend dependencies (OQ-48)

**Recommended:** add each library at the step that first needs it, pinned, and check its compatibility with
React 19 and Next 16 at that point.

| Need | Proposal | First needed |
|---|---|---|
| Dialogs and menus with correct focus, Escape and ARIA behaviour | Radix UI primitives (Dialog, Dropdown Menu, then others as needed) | Step 1: the confirmation dialog and the user menu |
| Server state, and a full cache clear on workspace switch (FR-WSP-017) | TanStack Query, with no optimistic updates for financial actions | Step 2: workspaces |
| Large, keyboard-navigable grids, sorted and filtered on the server | TanStack Table and TanStack Virtual (headless) | Steps 3 and 4: imports and results |
| Fonts with no third-party request | IBM Plex Sans and Condensed `woff2` files in the repository (SIL Open Font License), loaded with `@font-face` | Step 1 |
| Icons | A small set of in-repository SVG icons (about 25, as in the concepts), not an icon package | Step 1 |

Not proposed: a CSS framework, a component kit (MUI, Chakra), an animation library, or a date library.
Styling stays with CSS custom properties and CSS Modules. Dates use `Intl` and the API's ISO strings; a
library is reconsidered only if time-zone logic grows.

**Alternative:** no libraries at all. That is feasible for step 1, but costly and risky for the data grid
and for accessible dialogs.

### 6. The D-UI-03 sign-in reference (OQ-47)

**Recommended:** provide the screenshot when convenient. It blocks only the Keycloak login theme, not the
rest of step 1.

**Until then:** ClearSettle's own signed-out and session-ended pages use the concept's colour field, and the
Keycloak pages keep Keycloak's default theme. Users see a change of style between the two until the theme
is built.

### 7. Implementation sequence

**Recommended:** confirm section 9, with two amendments:
- Step 1 includes the two shell items still outstanding from M1 security: returning to a deep link after
  sign-in, and the idle-expiry warning with its small backend addition.
- Build ClearSettle-side session revocation in the M1 backend before step 2's members screen: an audited
  administrative revocation, OIDC back-channel logout, or both (engineering checklist §7, D-SEC-18). Removing
  a member and resetting a factor both depend on it.

**Why:** the first step is useful on its own and has a working backend, and every later step ships only
screens whose backend exists.
