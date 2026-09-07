# Sensitive paths

**Canonical:** `.safrs/sensitive-paths.json`, `tools/safrs/check_sensitive_changes.py`.

Patterns classified R2 or higher. Changes trigger enhanced review. Classification is data for the checker, not an instruction to weaken controls.

Do not paste the full pattern list here — read the JSON. Typical classes: policy, agent adapters, CI workflows, automation tools, security tests, shared packages, token sources.

HANDOFF (2026-08-26) records `check_sensitive_changes` as the remaining red governance check because verification-integrity evidence is bound to an old base (`d92a246`) while the diff base after the origin rewrite is `5b6b808`. Restamping that evidence is a **Chief** decision; an agent who wrote the code must not stamp their own integrity review.

## Related

- [Verification integrity](verification-integrity.md)
- [SAFRS verify](../verification/safrs-verify.md)
