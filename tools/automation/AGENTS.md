# tools/automation — Agent Boundary

Scope: SAFRS automation control-plane code (canonical JSON, contracts,
risk, scopes; later phases add leases, guard, budgets, approvals,
evidence, publisher, executor, R3).

Rules:

1. This package is a **verification control** (classified in
   `.safrs/sensitive-paths.json`). Every change is at least R2 and needs
   designated review.
2. No runtime dependencies. Node built-ins only. A new dependency needs
   Chief approval plus an approved tool-inventory entry first.
3. Canonical JSON and digest semantics are frozen by
   `test/canonical-json.test.mjs`, and mirrored by
   `tools/safrs/check_task_contract.py`. Changing them requires updating
   the Python side in the same reviewed change set — digests must stay
   byte-identical across Node and Python, Windows and Linux.
4. Fail closed. Reject what policy cannot fully resolve; never guess.
5. Test-first. Every invariant lands as a failing test before the
   implementation that satisfies it.

Verify locally:

```bash
node --test tools/automation/test/canonical-json.test.mjs tools/automation/test/scopes.test.mjs tools/automation/test/risk.test.mjs tools/automation/test/contracts.test.mjs
python tools/safrs/check_automation_policy.py
python tools/safrs/check_task_contract.py
python tests/governance/test_automation_contracts.py
```
