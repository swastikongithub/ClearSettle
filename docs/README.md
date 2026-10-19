# ClearSettle Project Documentation

## Current state

ClearSettle is in product discovery and specification. **Authentication (M1) implementation is authorized** as of 16 October 2026, after the M0 authentication spike and the owner's approval of D-SEC-12 to D-SEC-15 (identity provider, session policy, MFA, SameSite). Implementation of other areas is not yet authorized; do not begin them until the owner explicitly approves each.

The authentication implementation lives under `backend/` (Spring Boot OIDC + sessions), `frontend/` (Next.js, client-rendered, same origin), and `deploy/` (local development stack). Its architecture decisions are recorded as ADRs in `product/adr/` and in the decision register; the owner's 17 October 2026 security-policy approvals are D-SEC-16 to D-SEC-19. Progress is tracked in `product/clearsettle_implementation_status.md`.

## Product sources

- `product/clearsettle_decision_register.md`: authoritative record of approved, open, and deferred decisions (open questions `OQ-…`).
- `product/clearsettle_approved_decisions_seed.md`: primary record of the decisions approved during product discovery.
- `product/clearsettle_product_specification.md`: product requirements, acceptance criteria, and unresolved items, traced to the register.
- `product/clearsettle_specification_audit.md`: contradiction and gap audit of the specification.
- `product/clearsettle_implementation_plan.md`: proposed milestone plan; does not authorize implementation.
- `product/archive/`: superseded documents retained for traceability only.

## Design sources

- `design/clearsettle_frontend_design_proposal.md`: frontend design proposal (visual direction, information architecture, components, API mapping, sequence). **Proposal awaiting owner approval; not implemented.**
- `design/concepts/`: static visual concepts for that proposal, with illustrative sample data only. Open `design/concepts/index.html` in a browser; no build is needed.

## Engineering sources

- `engineering/clearsettle_master_engineering_checklist.md`: engineering checklist and ClearSettle-specific requirements.
- `engineering/the_complete_anatomy_of_a_vibe_coded_software_system.md`: original Gemini document, preserved intact as a reference.

## Planned documents to develop together

- Product scope and user roles — now covered by the product specification §1–§2 (pending owner review)
- Reconciliation workflows and financial rules — specification §5–§8; detailed accounting policy still open
- Supported file formats and import validation — specification §4; provider formats still open (OQ-07, OQ-08)
- Architecture decisions and data model — authentication session architecture approved as D-SEC-11, with the identity provider (D-SEC-12), session policy (D-SEC-13), MFA (D-SEC-14) and SameSite strategy (D-SEC-15) approved 16 October 2026 and captured as ADRs in `product/adr/`; other architecture decisions and the data model still to develop
- API contracts
- UI specification (marketing site, authentication, and application separately) — application and authentication proposal in `design/` (pending owner approval); marketing site deferred (D-DEF-01)
- Test and verification plan — outline in specification §12.3
- Deployment and operations runbook
