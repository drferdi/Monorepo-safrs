# Verification integrity

**Canonical:** `SAFRS_SPEC.md` §12, `.safrs/reviews/verification-integrity.json`.

If implementation and the controls that verify it change together, the change is at least R2 and needs designated integrity review. Agents must not weaken tests, linters, architecture checks, or governance gates merely to make a task pass.

`check_sensitive_changes.py` compares the current diff base to the stamped review evidence.

Current operational note (HANDOFF 2026-08-26, still the recorded next action on 2026-09-05): the only red SAFRS check is this one, caused by unrelated local/origin history after a rewrite. That is a Chief stamp-or-repoint decision, not a license to skip the checker.
