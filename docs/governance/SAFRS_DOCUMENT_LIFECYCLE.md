# SAFRS Document Lifecycle

## Classes
- **CANONICAL:** current normative truth.
- **ACTIVE:** current operational/implementation state.
- **HISTORICAL:** useful history, not current instruction.
- **SUPERSEDED:** replaced by another document, not normative.
- **ARCHIVED:** retained but excluded from current decisions.

## ADR lifecycle
`PROPOSED → ACCEPTED → SUPERSEDED` or `REJECTED`.

## Plan lifecycle
`ACTIVE → COMPLETED → ARCHIVED`.

## Rules
1. One canonical document ID maps to one current path.
2. Superseded documents must name their replacement in the registry when a replacement exists.
3. Completed execution plans do not become architecture truth automatically.
4. Code changes that alter a documented invariant must update the owning canonical document/ADR in the same PR.
5. CI validates registry structure and referenced files.
