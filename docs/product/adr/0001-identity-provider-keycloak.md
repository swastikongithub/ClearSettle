# ADR-0001 — Identity Provider: Keycloak

- **Status:** Accepted 2026-10-16 (owner approval). Recorded as **D-SEC-12**; resolves **OQ-34**.
- **Builds on:** D-SEC-11 (authentication session architecture A′).

## Context

ClearSettle needs an OIDC identity provider for login, MFA, step-up, and sign-out. OQ-34 required a
provider with standards OIDC, MFA, MFA assertions, forced re-authentication, session revocation, and
suitable data residency. The M0 spike compared Keycloak (tested live), Amazon Cognito, and Auth0
(documentation only).

## Decision

Adopt **Keycloak** as the identity provider for the current implementation, using **OpenID Connect
Authorization Code Flow with PKCE (`S256`)** and a **confidential** client. Keycloak is selected because
it is the only candidate whose end-to-end behaviour was verified live in the spike, and it gives full
control of authentication flows and claim mapping without per-MAU cost or feature-plan gating.

The application validates the provider's issuer, signatures, audience, expiry, `nonce`, and required
claims through Spring Security's OIDC support, with exact redirect-URI registration and fail-closed
behaviour on any invalid token, claim, state, or callback.

## Alternatives considered

- **Amazon Cognito** — documentation-verified: Auth Code + PKCE (S256 only), exact redirect URIs,
  `acr`/`amr`/`auth_time`, `acr_values`+`max_age` step-up on managed login. Caveats: `acr`/`amr` and
  step-up require the Essentials/Plus plan, and managed login **silently ignores `acr_values`** on an
  insufficient plan (an IdP-side fail-open). Not tested live.
- **Auth0** — documentation-verified: Auth Code + PKCE for Regular Web (confidential) apps, exact
  callback URLs; **step-up validated via the `amr` claim containing `mfa`**, not an `acr` level. Not
  tested live.

Both remain viable and may be reconsidered later; doing so requires live validation first.

## Evidence

LIVE-TESTED against Keycloak 26.8.1 in the M0 spike (`scratchpad/m0-auth-spike/evidence/`): authorization
request with `code_challenge_method=S256`, `state`, `nonce`, exact `redirect_uri` (O-01); rejection of a
PKCE-required request with no `code_challenge` (C-PKCE-01) and of unregistered redirect URIs
(C-REDIR-01/02); fail-closed ID-token validation across 13 abuse cases (O-04…O-16); identity keyed on
`(iss, sub)` (I-01/02/03); step-up with `acr`/`auth_time` (U-01…U-04). Cognito/Auth0 capabilities are
documentation-verified (report §6, accessed 2026-10-16).

## Consequences and trade-offs

- **Positive:** lowest integration risk (only live-verified option); full flow/claim control; no per-MAU
  cost; standards-based, so a later migration to a managed provider is a configuration + provider-aware
  claim change, not a rewrite.
- **Negative / responsibilities:** we operate Keycloak (HA, patching, backing database, key rotation,
  upgrades, backup/restore, monitoring). An operational runbook is required before any production use.
- Identity binding is on the validated `(iss, sub)` pair, never email alone; replacing the provider later
  needs a designed relinking process (per OQ-34 / AF-125).

## Required implementation controls

- Confidential client with **PKCE forced in code** (Spring Boot exposes no `requireProofKey` property).
- Exact redirect URIs only; no wildcards.
- Full OIDC ID-token validation plus application-level, **provider-aware**, **fail-closed** `acr`/
  `auth_time` checks (acr-level for Keycloak; `amr=mfa` noted for a possible future Auth0).
- Client secret from secrets management; never logged or committed.
- RP-initiated logout via the provider `end_session_endpoint`.

## Outstanding acceptance criteria (mandatory; not satisfied by approval)

- Live validation against any **managed** provider (Cognito/Auth0) remains **outstanding** and must not
  be represented as complete; no billable external tests were run and none are authorized here.
- Backchannel logout and MFA enrolment/recovery against the chosen provider are not yet exercised
  end-to-end (see ADR-0003). **M1 (17 October 2026):** enrolment is verified (B-01, B-07); the Keycloak
  recovery controls that exist are verified (P-08, R-01, R-02; D-SEC-18). Back-channel logout is **not
  implemented**: an IdP-side logout or MFA reset does not end ClearSettle sessions (R-02), which the recovery
  procedure must cover until it is.
  **Update (20 October 2026):** OIDC back-channel logout is implemented and verified against Keycloak 26.8.1
  (P-09, R-02, M-07, M-08; `BackChannelLogoutPostgresTest`). When a Keycloak session ends, its ClearSettle
  sessions end on every instance. Keycloak reports only sessions it still holds: a ClearSettle session kept
  active past Keycloak's SSO idle timeout outlives its Keycloak session and is not reached (LR-05). A factor
  removal alone sends nothing, so the reset procedure must sign the user out at Keycloak. Details in the
  implementation status, "Backend session revocation".
- ID-token and callback validation (AC-157) — wrong signature, `alg=none`, HS256 with the client secret,
  wrong issuer or audience, expired token, missing or mismatched `nonce`, wrong `state`, missing or tampered
  login-state cookie, a code from another login (PKCE verifier mismatch), a replayed code — is **verified in
  M1** against a controlled test provider driving the real client registration and Spring Security
  (`OidcCallbackValidationTest`); Keycloak's own PKCE and redirect-URI enforcement is verified live (P-02,
  P-03).

## Assumptions / limitations

- Assumes the organization accepts operating Keycloak. If not, reopen for a managed provider (with live
  validation first).
- Data-residency/region posture is an owner input not decided here.
