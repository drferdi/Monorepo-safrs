#!/usr/bin/env python3
"""The shell and PowerShell verifiers run one checker list (ADR 0007 WP-C)."""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INDEPENDENCE_CHECKER = 'tools/safrs/check_project_independence.py'
INDEPENDENCE_TEST = 'tests/architecture/test_project_independence.py'


def shell_checks():
    text = (ROOT / 'scripts/safrs-verify.sh').read_text(encoding='utf-8')
    return re.findall(r'^"\$PYTHON" (\S+\.py)$', text, flags=re.MULTILINE)


def powershell_checks():
    text = (ROOT / 'scripts/safrs-verify.ps1').read_text(encoding='utf-8')
    block = re.search(r'\$checks = @\((.*?)\)', text, flags=re.DOTALL)
    return re.findall(r"'([^']+\.py)'", block.group(1)) if block else []


class VerifierParityTests(unittest.TestCase):
    def test_shell_and_powershell_run_the_same_checks_in_order(self):
        self.assertTrue(shell_checks())
        self.assertEqual(shell_checks(), powershell_checks())

    def test_verifiers_run_the_blocking_independence_checker(self):
        self.assertIn(INDEPENDENCE_CHECKER, shell_checks())
        self.assertIn(INDEPENDENCE_CHECKER, powershell_checks())

    def test_governance_workflow_runs_the_checker_and_its_test(self):
        workflow = (ROOT / '.github/workflows/safrs-governance.yml').read_text(encoding='utf-8')
        runs = re.findall(r'^\s+run: python (\S+\.py)\s*$', workflow, flags=re.MULTILINE)
        self.assertIn(INDEPENDENCE_CHECKER, runs)
        self.assertIn(INDEPENDENCE_TEST, runs)


if __name__ == '__main__':
    unittest.main()
