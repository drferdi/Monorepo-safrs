# safrs-verify

**Entry:** `pnpm governance` → `scripts/safrs-verify.mjs` → `scripts/safrs-verify.sh` or `.ps1`.

The shell script (`scripts/safrs-verify.sh`) runs these Python programs in order:

1. `tools/safrs/check_policy.py`
2. `check_docs.py`
3. `check_routing.py`
4. `check_tool_inventory.py`
5. `check_topology.py`
6. `check_actions_pinning.py`
7. `check_automation_policy.py`
8. `check_task_contract.py`
9. `check_task_ownership.py`
10. `check_lifecycle.py`
11. `check_approval_evidence.py`
12. `check_sensitive_changes.py`
13. `check_status_claims.py`
14. `check_handoff.py`
15. `tests/architecture/test_safrs_topology.py`
16. `tests/governance/test_sensitive_classification.py`
17. `tests/governance/test_task_ownership.py`
18. `tests/governance/test_automation_contracts.py`
19. `tests/governance/test_automation_approvals.py`

Then prints `SAFRS local governance verification: PASS`.

Older wiki text said "16 checkers". Count the invocations in the script; do not reuse the stale number.

`check_project_independence.py` exists for capsule structure but is invoked via `tools/project-standalone`, not this list.

## Related

- [tools/safrs](../tools/safrs.md)
- [Verification integrity](../governance/verification-integrity.md)
