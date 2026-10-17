# ADR-0004 — SameSite Cookie Strategy (V3: Strict session cookie + Lax `__Host-CSLOGIN`)

- **Status:** Accepted 2026-10-16 (owner approval). Recorded as **D-SEC-15**; resolves **OQ-57**.
- **Builds on:** D-SEC-11, NFR-SEC-022 (CSRF defense).

## Context

A `SameSite=Strict` session cookie is withheld on the OIDC callback (a cross-site top-level navigation
from the IdP). If the in-progress authorization request lives in that session, login cannot complete.
OQ-57 required a `SameSite` choice that is both strong and callback-compatible, without treating SameSite
as the CSRF control. The spike validated the "V3" strategy.

## Decision

- **Main session cookie:** `__Host-` prefixed, `Secure`, `HttpOnly`, host-only (no `Domain`), `Path=/`,
  **`SameSite=Strict`**.
- **Login-state cookie:** a separate **`__Host-CSLOGIN`**, `Secure`, `HttpOnly`, host-only,
  **`SameSite=Lax`**, short-lived (≤5 min), **encrypted/authenticated** payload, holding only the
  in-progress authorization request; consumed and cleared at the callback.
- **CSRF defense is retained in full and is independent of SameSite:** a `__Host-` double-submit CSRF
  cookie **and** a required custom header (`X-CS-Request`) plus the token. SameSite is defense-in-depth,
  not the CSRF control.

## Alternatives considered

- **V1** (`Lax` session cookie, auth request in session) — simplest, login works natively, but the Lax
  cookie can ride some cross-site top-level navigations (browser-dependent, F-5). Acceptable only because
  CSRF does not depend on SameSite.
- **V2** (`Strict` session cookie, auth request in session) — **not viable**; breaks the callback
  (`authorization_request_not_found`).
- **V3** — chosen; strongest viable option.

## Evidence

M0 spike (LIVE-TESTED, Firefox + Chromium): V2 breaks the callback (V-LOGIN negative control:
`session_cookie=false`, `sec_fetch_site=cross-site`, `authorization_request_not_found`); V3 completes
login because the Lax `__Host-CSLOGIN` cookie carries login state across the callback (V-LOGIN:
`login_state_cookie=true`, `reject=null`), with both session and CSRF cookies `SameSite=Strict`, `__Host-`
(S-01), and the Strict session cookie not sent on cross-site navigation (S-03). CSRF holds under V3,
including same-site cookie-tossing rejected by the CSRF layer, not by content-type (X-01…X-09; F-4).

## Consequences and trade-offs

- **Positive:** strongest cookie isolation; the login cookie is tightly scoped and transient.
- **Negative:** a user following an **external deep link** has their first top-level GET arrive without
  the Strict session cookie and appears logged-out; the app must re-initiate login smoothly. Slightly
  more code (an encrypted login-state cookie repository) and key management.
- `__Host-` requires HTTPS + host-only + `Path=/` (compatible with the single-origin design, D-SEC-11).

## Required implementation controls

- Session cookie and `__Host-CSLOGIN` exactly as above; local/dev config must not weaken these in
  production (e.g. no `Secure`-off or `Domain`-scoped cookie leaking into production).
- Full CSRF: `__Host-` double-submit cookie + required custom header + token; reject unsafe requests
  missing any mandatory control; resist same-site cookie-tossing on both JSON and no-body endpoints.
- OIDC `state`/`nonce`/PKCE correlated via the login-state cookie, not SameSite.

## Outstanding acceptance criteria (mandatory)

- Re-verify V3 cookie attributes, callback completion, and CSRF (incl. cookie-tossing on a no-body
  endpoint) in the product. **Verified in M1** (C-01…C-05, E-01…E-10, K-01; Chromium and Firefox; CSRF and
  callback also in Playwright WebKit).
- **Safari/WebKit and mobile browsers remain unverified** (spike tested Firefox + Chromium only). This is
  an explicit validation gap until tested; do not claim those environments pass. **M1:** Playwright's
  WebKit engine was tested (see the notes below); real Safari and iOS/Android browsers remain
  **unverified**.
- Decide and implement the external-deep-link re-entry UX under `SameSite=Strict`. **OUTSTANDING.**

## Implementation notes from M1 integration testing (2026-10-16)

- **Step-up under `SameSite=Strict` (new finding, not covered by the M0 spike).** The step-up callback is
  also a cross-site navigation, so the Strict session cookie is not sent and the callback runs in a new
  session. Without handling, a step-up (a) reset the 8-hour absolute anchor, (b) left the originating
  session alive, and (c) on a different-person mismatch failed to end the victim's session. Fix: the
  step-up resolver writes a random nonce into the originating session and the encrypted `__Host-CSLOGIN`
  state; the callback finds the originating session by user + nonce, carries over its absolute anchor,
  and retires it (mismatch: ends it). A missing originating session fails closed (`session_expired`).
- **Browsers that do not enforce SameSite (new finding).** Playwright's WebKit build on Windows implements
  no SameSite at all: it stores a server-set `Strict` cookie as `None` and sends it on every cross-site
  navigation (link, 302, POST→302, form POST), while Chromium and Firefox withhold it on all of them
  (reproducible: `e2e/engine-samesite-probe.mjs`). In such a browser the step-up callback runs *inside*
  the originating session, whose id Spring has already rotated while its stored record still carries the
  old id. Two defects followed and are fixed with regression tests: an id-based guard deleted the live
  session on a successful step-up, and on a refused step-up the invalidation addressed the rotated id so
  the stored session survived. The originating session is now always addressed by the id its stored
  record was found under (user + nonce), and **every refused step-up ends the originating session** (the
  refusal response clears the browser's session cookie in either path, so nothing may linger server-side).
- **Finding the originating session needs a by-id read (17 October 2026).** With several sessions per user,
  Spring Session JDBC's principal-name query (no `ORDER BY`, an extractor that assumes adjacent rows) can
  return a session without some of its attributes on PostgreSQL, so a step-up minutes after sign-in was
  refused as `session_expired` (wall-clock test LR-03). The callback now takes only ids from the principal
  index and reads each session by id; regression tests on H2 and PostgreSQL.
- CSRF holds without SameSite: in that engine every forged/cross-site/cookie-tossing request (E-01…E-10)
  is still rejected by the CSRF layer, with the victim's cookies attached. This is the live evidence that
  SameSite is defense-in-depth here, not the CSRF control.
- A cross-site rejected request can cause the CSRF cookie to be re-issued (harmless: the value is never
  readable cross-site, and the SPA reads the current cookie at request time).
- **Still unverified:** real Safari (macOS) and iOS/Android browsers. Playwright WebKit is an engine proxy,
  not Safari: Safari's SameSite and ITP behaviour are not reproduced by it, and device emulation only
  changes viewport, user agent and touch.

## Assumptions / limitations

- Assumes the single-origin design (D-SEC-11). A multi-origin design would reopen cookie-scope analysis.
