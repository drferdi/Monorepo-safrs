#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
PYTHON=python3
if ! "$PYTHON" -c 'import sys' >/dev/null 2>&1; then
  PYTHON=python
fi
if ! "$PYTHON" -c 'import sys' >/dev/null 2>&1; then
  printf 'Python 3 yang dapat dijalankan diperlukan untuk verifikasi SAFRS.\n' >&2
  exit 1
fi
"$PYTHON" tools/safrs/check_policy.py
"$PYTHON" tools/safrs/check_docs.py
"$PYTHON" tools/safrs/check_routing.py
"$PYTHON" tools/safrs/check_tool_inventory.py
"$PYTHON" tools/safrs/check_topology.py
"$PYTHON" tools/safrs/check_actions_pinning.py
"$PYTHON" tools/safrs/check_automation_policy.py
"$PYTHON" tools/safrs/check_task_contract.py
"$PYTHON" tools/safrs/check_task_ownership.py
"$PYTHON" tools/safrs/check_lifecycle.py
"$PYTHON" tools/safrs/check_approval_evidence.py
"$PYTHON" tools/safrs/check_sensitive_changes.py
"$PYTHON" tools/safrs/check_status_claims.py
"$PYTHON" tools/safrs/check_handoff.py
"$PYTHON" tests/architecture/test_safrs_topology.py
"$PYTHON" tests/governance/test_sensitive_classification.py
"$PYTHON" tests/governance/test_task_ownership.py
"$PYTHON" tests/governance/test_automation_contracts.py
"$PYTHON" tests/governance/test_automation_approvals.py
printf 'SAFRS local governance verification: PASS\n'
