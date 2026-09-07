# Conformance levels

**Canonical:** `SAFRS_SPEC.md` §19 and `docs/governance/safrs_conformance.md`.

| Level | Meaning |
| --- | --- |
| **SAFRS Core** | Canonical routing, policy, risk tiers, local verification |
| **SAFRS Controlled** | Core + CI enforcement + sensitive-path gates + review rules |
| **SAFRS Secure** | Controlled + execution isolation + credential/network controls + supply-chain protections |
| **SAFRS Regulated** | Secure + auditable approvals, domain-specific invariants, controlled production access, evidence retention |

## Declared level of this repository

**SAFRS Core** (assessment date 2026-08-10 in `docs/governance/safrs_conformance.md`).

Core is achieved because routing, R0–R3 policy, sensitive-path declaration, document registry, topology checks, tool inventory, and local `safrs-verify` exist.

**Controlled is not claimed.** CI workflows are committed, but required branch protection / CODEOWNERS enforcement on the remote is not proven. HANDOFF (2026-08-26) records GitHub Free private-repo branch-protection limits.

**Secure is not claimed.**

**Regulated is not claimed** and must not be inferred from the presence of a `healthcare/` domain folder. Healthcare-domain capsules still have to classify clinical overclaim (see Avery SPDS). A domain name is not a medical-device claim.

## Related

- [SAFRS governance](../features/safrs-governance.md)
- [Verification](../verification/index.md)
