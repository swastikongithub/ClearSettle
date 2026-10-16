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
  endpoint) in the product.
- **Safari/WebKit and mobile browsers remain unverified** (spike tested Firefox + Chromium only). This is
  an explicit validation gap until tested; do not claim those environments pass.
- Decide and implement the external-deep-link re-entry UX under `SameSite=Strict`.

## Assumptions / limitations

- Assumes the single-origin design (D-SEC-11). A multi-origin design would reopen cookie-scope analysis.
