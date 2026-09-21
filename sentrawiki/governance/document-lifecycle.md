# Document lifecycle

**Canonical:** `docs/governance/safrs_document_lifecycle.md`, `SAFRS_SPEC.md` §13, `.safrs/document-registry.json`.

| Class | Meaning |
| --- | --- |
| CANONICAL | current normative truth |
| ACTIVE | current operational/implementation state |
| HISTORICAL | useful history, not current instruction |
| SUPERSEDED | replaced; not normative |
| ARCHIVED | retained, excluded from current decisions |

ADR: `PROPOSED → ACCEPTED → SUPERSEDED` or `REJECTED`.
Plan: `ACTIVE → COMPLETED → ARCHIVED`.

Rules:

1. One canonical document ID maps to one current path.
2. Superseded documents name their replacement in the registry when a replacement exists.
3. Completed execution plans do not become architecture truth automatically.
4. Code that changes a documented invariant must update the owning canonical document in the same change set.
5. CI validates registry structure and referenced files.

This wiki is **not** in the document registry. It is derived navigation.

Routing in `AGENTS.md` between `SAFRS:ROUTING:BEGIN/END` is generated from the registry by `python tools/safrs/generate_routing.py`. Do not edit that block by hand.
