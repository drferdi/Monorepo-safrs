#!/usr/bin/env python3
import shutil
import subprocess
import sys
import tempfile
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
        for path in ['packages', 'tools', 'tests', 'scripts', 'docs']:
            with self.subTest(path=path):
                self.assertTrue((ROOT / path).is_dir())

    def test_active_runtime_boundaries_have_concise_agent_routing(self):
        expected = {
            'packages/api/AGENTS.md': '../../AGENTS.md',
            'packages/database/AGENTS.md': '../../AGENTS.md',
            'tools/AGENTS.md': '../AGENTS.md',
        }
        if (ROOT / 'projects').is_dir():
            expected.update({
                'projects/internal/golden-path/AGENTS.md': '../../../AGENTS.md',
                'projects/internal/golden-path/apps/web/AGENTS.md': '../../../../../AGENTS.md',
            })
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

    def test_topology_requires_capsule_agent_files(self):
        """ADR 0007 decision 7: every capsule and _template carry .agents/{HANDOFF,DECISIONS,CONTEXT}.md."""
        with tempfile.TemporaryDirectory() as directory:
            fixture = Path(directory)
            (fixture / 'tools/safrs').mkdir(parents=True)
            checker = fixture / 'tools/safrs/check_topology.py'
            shutil.copy2(ROOT / 'tools/safrs/check_topology.py', checker)
            files = [
                'packages/api/AGENTS.md', 'packages/database/AGENTS.md', 'packages/README.md',
                'tools/AGENTS.md', 'tools/README.md', 'tests/README.md', 'docs/adrs/README.md',
                'docs/plans/active/README.md', 'docs/plans/completed/README.md',
                'docs/plans/archived/README.md', 'docs/evidence/README.md',
                '.cursor/rules/01-safrs.mdc', 'projects/README.md',
                'projects/internal/AGENTS.md', 'projects/internal/README.md',
                'projects/internal/golden-path/apps/web/AGENTS.md',
            ]
            capsule_files = ['AGENTS.md', 'README.md', 'docs/architecture.md', 'docs/data.md',
                             'docs/testing.md', 'src/README.md', 'tests/README.md',
                             '.agents/HANDOFF.md', '.agents/DECISIONS.md', '.agents/CONTEXT.md']
            for capsule in ['projects/_template', 'projects/internal/golden-path',
                            'projects/internal/unicom']:
                files += [f'{capsule}/{relative}' for relative in capsule_files]
            for relative in files:
                target = fixture / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text('fixture\n', encoding='utf-8')

            def run():
                return subprocess.run([sys.executable, checker], capture_output=True, text=True)

            complete = run()
            self.assertEqual(complete.returncode, 0, complete.stdout + complete.stderr)

            (fixture / 'projects/internal/unicom/.agents/CONTEXT.md').unlink()
            (fixture / 'projects/_template/.agents/HANDOFF.md').unlink()
            result = run()
            self.assertNotEqual(result.returncode, 0, result.stdout)
            self.assertIn('internal/unicom: missing capsule path .agents/CONTEXT.md', result.stderr)
            self.assertIn('projects/_template/.agents/HANDOFF.md', result.stderr)

    def test_shell_verifier_resolves_a_portable_python_command(self):
        verifier = (ROOT / 'scripts/safrs-verify.sh').read_text(encoding='utf-8')
        self.assertIn('PYTHON=', verifier)
        self.assertNotIn('\npython3 tools/safrs/', verifier)

if __name__ == '__main__':
    unittest.main()
