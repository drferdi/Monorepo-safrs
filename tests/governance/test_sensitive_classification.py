#!/usr/bin/env python3
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class SensitiveClassificationTests(unittest.TestCase):
    def test_production_path_is_classified_r3(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            repository = Path(temporary_directory)
            (repository / 'tools/safrs').mkdir(parents=True)
            (repository / '.safrs').mkdir()
            (repository / 'projects/demo/production').mkdir(parents=True)
            shutil.copy2(
                ROOT / 'tools/safrs/check_sensitive_changes.py',
                repository / 'tools/safrs/check_sensitive_changes.py',
            )
            config = {
                'minimum_risk': 'R2',
                'patterns': ['projects/**/production/**'],
                'verification_control_patterns': [],
                'risk_overrides': [
                    {'risk': 'R3', 'patterns': ['projects/**/production/**']},
                ],
            }
            (repository / '.safrs/sensitive-paths.json').write_text(
                json.dumps(config), encoding='utf-8'
            )
            (repository / 'projects/demo/production/config.yml').write_text(
                'enabled: false\n', encoding='utf-8'
            )
            subprocess.run(
                ['git', 'init', '-q'], cwd=repository, check=True, capture_output=True
            )

            result = subprocess.run(
                [sys.executable, repository / 'tools/safrs/check_sensitive_changes.py'],
                cwd=repository,
                text=True,
                capture_output=True,
                check=True,
            )

            self.assertIn('SAFRS_RISK=R3', result.stdout)

    def test_root_automation_controls_remain_r2_in_a_historical_diff(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            repository = Path(temporary_directory)
            (repository / 'tools/safrs').mkdir(parents=True)
            (repository / '.safrs').mkdir()
            (repository / '.github').mkdir()
            (repository / 'scripts').mkdir()
            (repository / 'tests/repository').mkdir(parents=True)
            shutil.copy2(
                ROOT / 'tools/safrs/check_sensitive_changes.py',
                repository / 'tools/safrs/check_sensitive_changes.py',
            )
            shutil.copy2(
                ROOT / '.safrs/sensitive-paths.json',
                repository / '.safrs/sensitive-paths.json',
            )
            paths = [
                'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'turbo.json',
                '.github/renovate.json', 'scripts/safrs-verify.mjs',
                'scripts/safrs-verify.ps1', 'scripts/safrs-verify.sh',
                'tests/repository/automation-policy.test.mjs',
            ]
            for path in paths:
                target = repository / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text('baseline\n', encoding='utf-8')
            subprocess.run(['git', 'init', '-q'], cwd=repository, check=True)
            subprocess.run(['git', 'add', '.'], cwd=repository, check=True)
            subprocess.run(
                ['git', '-c', 'user.name=SAFRS Test', '-c', 'user.email=test@example.invalid',
                 'commit', '-qm', 'baseline'],
                cwd=repository,
                check=True,
            )
            for path in paths:
                (repository / path).write_text('changed\n', encoding='utf-8')
            subprocess.run(['git', 'add', '.'], cwd=repository, check=True)
            subprocess.run(
                ['git', '-c', 'user.name=SAFRS Test', '-c', 'user.email=test@example.invalid',
                 'commit', '-qm', 'automation controls'],
                cwd=repository,
                check=True,
            )

            result = subprocess.run(
                [sys.executable, repository / 'tools/safrs/check_sensitive_changes.py'],
                cwd=repository,
                text=True,
                capture_output=True,
                check=True,
                env={**__import__('os').environ, 'SAFRS_BASE_REF': 'HEAD~1'},
            )

            self.assertIn('SAFRS_RISK=R2', result.stdout)
            for path in paths:
                self.assertIn(f'  - {path}', result.stdout)


if __name__ == '__main__':
    unittest.main()
