# ClearSettle Architecture Decision Records (ADRs)

This directory holds architecture decision records. Each ADR captures one significant decision, its
context, the alternatives considered, the evidence, and its consequences.

The authoritative registry remains the [decision register](../clearsettle_decision_register.md): every
ADR here corresponds to a `D-…` decision entry and resolves one or more `OQ-…` open questions. When an
ADR and the register appear to disagree, the register governs until corrected.

## Status values

- **Proposed** — drafted, not yet approved.
- **Accepted** — approved by the owner and recorded in the decision register.
- **Superseded by ADR-NNNN** — replaced by a later decision.

An **Accepted** status records that the *policy* is approved. It does **not** assert that every
production behaviour has been verified. Each ADR lists its outstanding acceptance criteria; those remain
mandatory and are tracked in the [implementation status document](../clearsettle_implementation_status.md)
and the M0 spike evidence.

## Index

| ADR | Decision | Register ID | Resolves | Status |
|---|---|---|---|---|
| [0001](0001-identity-provider-keycloak.md) | Identity provider: Keycloak (OIDC Auth Code + PKCE S256) | D-SEC-12 | OQ-34 | Accepted 2026-10-16 |
| [0002](0002-session-expiration-policy.md) | Session policy: 15-min idle, 8-h absolute (not extended by activity) | D-SEC-13 | OQ-38 | Accepted 2026-10-16 |
| [0003](0003-mfa-universal-plus-step-up.md) | MFA: universal at login + step-up for sensitive actions | D-SEC-14 | OQ-55 | Accepted 2026-10-16 |
| [0004](0004-samesite-cookie-strategy-v3.md) | SameSite cookie strategy: Strict session cookie + Lax `__Host-CSLOGIN` (V3) | D-SEC-15 | OQ-57 | Accepted 2026-10-16 |

## Evidence basis

These decisions build on the approved authentication architecture [D-SEC-11] and the owner-authorized,
disposable **M0 authentication spike** and its security follow-up. The spike was a throwaway prototype,
not product code; it validated specific behaviours with Keycloak (live) and documented Amazon Cognito and
Auth0 from their documentation. Spike findings F-1 (authorization-code log leakage), F-2 (SameSite ×
callback), F-3 (ID-token storage), F-4 (CSRF / cookie-tossing) and F-5 (cross-browser) are referenced by
the ADRs and mapped to implementation controls in the M1 implementation checklist.
