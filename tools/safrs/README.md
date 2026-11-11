# SAFRS enforcement checks

Python checks enforce repository policy, document routing, topology, capsule independence, Actions pinning, task ownership/lifecycle, approvals, evidence, and handoff scope.

Run `pnpm governance` from the framework root. Individual checks are executable as `python tools/safrs/check_<name>.py`; checks that accept `--root` can inspect fixture repositories. The root runners execute the same checks on Windows and Bash.

## Dependency boundary

This is a framework component. Checks read repository-owned policies, registries, source/configuration, and Git state. They are not runtime or build dependencies for application tools. `check_tool_independence.py` reuses structural routines from `check_project_independence.py` and covers declared standalone tools plus discovered tool contracts. `tools/standalone-tools.json` prevents removal of a declared application's contract from silently removing its coverage.

Root structural verification does not establish extraction readiness. Use the standalone verifier to execute lifecycle commands in isolation; do not weaken gates or alter evidence to make a report pass.

## Tests and effects

Tests live in `tests/architecture/` and `tests/governance/`; for tool coverage run `python tests/architecture/test_tool_independence.py`. Governance checks are diagnostic; `generate_routing.py` is a separate generator that writes agent routing and is not a read-only check. Python-only checks have no TypeScript gate.
