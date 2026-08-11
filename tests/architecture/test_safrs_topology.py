#!/usr/bin/env python3
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class SafrsTopologyTests(unittest.TestCase):
    def test_control_layers_have_repository_artifacts(self):
        paths = [
            '.safrs/policy.json',
            'AGENTS.md',
            'docs/governance/SAFRS_MULTI_AGENT_PROTOCOL.md',
            'tools/safrs/check_policy.py',
            'SECURITY.md',
        ]
        for path in paths:
            with self.subTest(path=path):
                self.assertTrue((ROOT / path).is_file())

    def test_monorepo_roots_exist(self):
        for path in ['projects', 'packages', 'tools', 'tests', 'scripts', 'docs']:
            with self.subTest(path=path):
                self.assertTrue((ROOT / path).is_dir())

    def test_active_runtime_boundaries_have_concise_agent_routing(self):
        expected = {
            'projects/golden-path/AGENTS.md': '../../AGENTS.md',
            'projects/golden-path/apps/web/AGENTS.md': '../../../../AGENTS.md',
            'packages/api/AGENTS.md': '../../AGENTS.md',
            'packages/database/AGENTS.md': '../../AGENTS.md',
            'tools/AGENTS.md': '../AGENTS.md',
        }
        for path, canonical_link in expected.items():
            with self.subTest(path=path):
                document = ROOT / path
                self.assertTrue(document.is_file())
                self.assertIn(canonical_link, document.read_text(encoding='utf-8'))

    def test_no_deprecated_cursor_rules_file_exists(self):
        self.assertFalse((ROOT / '.cursorrules').exists())

    def test_codex_repository_adapter_is_complete(self):
        paths = [
            '.codex/config.toml',
            '.codex/hooks.json',
            '.codex/hooks/guard-tool-use.mjs',
            '.codex/hooks/format-edited-files.mjs',
            '.codex/agents/safrs-reviewer.toml',
            '.codex/agents/security-reviewer.toml',
            '.agents/skills/verify/SKILL.md',
            '.agents/skills/prisma-migration/SKILL.md',
            'docs/bootstrap/CODEX_SETUP.md',
        ]
        for path in paths:
            with self.subTest(path=path):
                self.assertTrue((ROOT / path).is_file())

    def test_shell_verifier_resolves_a_portable_python_command(self):
        verifier = (ROOT / 'scripts/safrs-verify.sh').read_text(encoding='utf-8')
        self.assertIn('PYTHON=', verifier)
        self.assertNotIn('\npython3 tools/safrs/', verifier)

if __name__ == '__main__':
    unittest.main()
