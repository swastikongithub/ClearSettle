# ClearSettle Project Documentation

## Current state

ClearSettle is in product discovery and specification. Do not begin application implementation until the user explicitly approves it.

## Product sources

- `product/clearsettle_decision_register.md`: authoritative record of approved, open, and deferred decisions (open questions `OQ-…`).
- `product/clearsettle_approved_decisions_seed.md`: primary record of the decisions approved during product discovery.
- `product/clearsettle_product_specification.md`: product requirements, acceptance criteria, and unresolved items, traced to the register.
- `product/clearsettle_specification_audit.md`: contradiction and gap audit of the specification.
- `product/clearsettle_implementation_plan.md`: proposed milestone plan; does not authorize implementation.
- `product/archive/`: superseded documents retained for traceability only.

## Engineering sources

- `engineering/clearsettle_master_engineering_checklist.md`: engineering checklist and ClearSettle-specific requirements.
- `engineering/the_complete_anatomy_of_a_vibe_coded_software_system.md`: original Gemini document, preserved intact as a reference.

## Planned documents to develop together

- Product scope and user roles — now covered by the product specification §1–§2 (pending owner review)
- Reconciliation workflows and financial rules — specification §5–§8; detailed accounting policy still open
- Supported file formats and import validation — specification §4; provider formats still open (OQ-07, OQ-08)
- Architecture decisions and data model
- API contracts
- UI specification (marketing site, authentication, and application separately)
- Test and verification plan — outline in specification §12.3
- Deployment and operations runbook
