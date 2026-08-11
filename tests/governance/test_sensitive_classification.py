#!/usr/bin/env python3
import json
import hashlib
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CHECKER = 'tools/safrs/check_sensitive_changes.py'
REVIEW_EVIDENCE = '.safrs/reviews/verification-integrity.json'


def install_checker(repository, config=None):
    """Copy the checker into a throwaway repository, with a policy file."""
    (repository / 'tools/safrs').mkdir(parents=True, exist_ok=True)
    (repository / '.safrs').mkdir(exist_ok=True)
    shutil.copy2(ROOT / CHECKER, repository / CHECKER)
    if config is None:
        shutil.copy2(ROOT / '.safrs/sensitive-paths.json', repository / '.safrs/sensitive-paths.json')
    else:
        (repository / '.safrs/sensitive-paths.json').write_text(
            json.dumps(config), encoding='utf-8'
        )


def git(repository, *arguments, check=True):
    return subprocess.run(
        ['git', '-c', 'user.name=SAFRS Test', '-c', 'user.email=test@example.invalid',
         *arguments],
        cwd=repository,
        check=check,
        capture_output=True,
        text=True,
    )


def commit_baseline(repository):
    git(repository, 'init', '-q')
    git(repository, 'add', '.')
    git(repository, 'commit', '-qm', 'baseline')


def write(repository, relative, content='changed\n'):
    target = repository / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')


def run_checker(repository, environment=None):
    return subprocess.run(
        [sys.executable, repository / CHECKER],
        cwd=repository,
        text=True,
        capture_output=True,
        env=environment,
    )


def change_set_digest(repository, paths):
    digest = hashlib.sha256()
    for relative in sorted(paths):
        target = repository / relative
        content_digest = (
            hashlib.sha256(target.read_bytes()).hexdigest()
            if target.is_file()
            else '<deleted>'
        )
        digest.update(f'{relative}\0{content_digest}\n'.encode())
    return digest.hexdigest()


def write_review_evidence(repository, paths, *, digest=None):
    write(
        repository,
        REVIEW_EVIDENCE,
        json.dumps(
            {
                'version': 1,
                'verdict': 'approved',
                'reviewer_id': 'agent:independent-integrity-reviewer',
                'reviewed_at': '2026-08-11T15:30:00Z',
                'change_set_sha256': digest or change_set_digest(repository, paths),
            },
            indent=2,
        ) + '\n',
    )


class SensitiveClassificationTests(unittest.TestCase):
    def test_production_path_is_classified_r3(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            repository = Path(temporary_directory)
            config = {
                'minimum_risk': 'R2',
                'patterns': ['projects/**/production/**'],
                'verification_control_patterns': [],
                'risk_overrides': [
                    {'risk': 'R3', 'patterns': ['projects/**/production/**']},
                ],
            }
            install_checker(repository, config)
            commit_baseline(repository)
            write(repository, 'projects/demo/production/config.yml', 'enabled: false\n')

            result = run_checker(repository)

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn('SAFRS_RISK=R3', result.stdout)

    def test_root_automation_controls_remain_r2_in_a_historical_diff(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            repository = Path(temporary_directory)
            install_checker(repository)
            paths = [
                'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'turbo.json',
                '.github/renovate.json', 'scripts/safrs-verify.mjs',
                'scripts/safrs-verify.ps1', 'scripts/safrs-verify.sh',
                '.codex/config.toml', '.codex/hooks.json',
                '.codex/hooks/guard-tool-use.mjs',
                'tests/repository/automation-policy.test.mjs',
            ]
            for path in paths:
                write(repository, path, 'baseline\n')
            commit_baseline(repository)
            for path in paths:
                write(repository, path)
            git(repository, 'add', '.')
            git(repository, 'commit', '-qm', 'automation controls')

            result = run_checker(repository, {**os.environ, 'SAFRS_BASE_REF': 'HEAD~1'})

            # Verification controls and implementation moved together: this diff
            # must be rejected, not merely annotated.
            self.assertNotEqual(result.returncode, 0, result.stdout)
            self.assertIn('SAFRS_VERIFICATION_INTEGRITY_REVIEW=required', result.stdout)
            self.assertIn('SAFRS_RISK=R2', result.stdout)
            for path in paths:
                self.assertIn(f'  - {path}', result.stdout)

    def test_verification_and_implementation_together_are_rejected(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            repository = Path(temporary_directory)
            config = {
                'minimum_risk': 'R2',
                'patterns': ['tools/safrs/**'],
                'verification_control_patterns': ['tools/safrs/**'],
                'risk_overrides': [],
            }
            install_checker(repository, config)
            commit_baseline(repository)
            write(repository, 'tools/safrs/check_extra.py', '# control\n')
            write(repository, 'src/app.py', '# implementation\n')

            result = run_checker(repository)

            self.assertNotEqual(result.returncode, 0, result.stdout)
            self.assertIn('SAFRS_VERIFICATION_INTEGRITY_REVIEW=required', result.stdout)

    def test_matching_independent_review_evidence_satisfies_integrity_gate(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            repository = Path(temporary_directory)
            config = {
                'minimum_risk': 'R2',
                'patterns': ['tools/safrs/**'],
                'verification_control_patterns': ['tools/safrs/**'],
                'risk_overrides': [],
            }
            install_checker(repository, config)
            commit_baseline(repository)
            changed = ['src/app.py', 'tools/safrs/check_extra.py']
            write(repository, changed[0], '# implementation\n')
            write(repository, changed[1], '# control\n')
            write_review_evidence(repository, changed)

            result = run_checker(repository)

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn('SAFRS_VERIFICATION_INTEGRITY_REVIEW=approved', result.stdout)

    def test_stale_review_evidence_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            repository = Path(temporary_directory)
            config = {
                'minimum_risk': 'R2',
                'patterns': ['tools/safrs/**'],
                'verification_control_patterns': ['tools/safrs/**'],
                'risk_overrides': [],
            }
            install_checker(repository, config)
            commit_baseline(repository)
            changed = ['src/app.py', 'tools/safrs/check_extra.py']
            write(repository, changed[0], '# implementation\n')
            write(repository, changed[1], '# control\n')
            write_review_evidence(repository, changed, digest='0' * 64)

            result = run_checker(repository)

            self.assertNotEqual(result.returncode, 0, result.stdout)
            self.assertIn('review evidence does not match', result.stderr.lower())

    def test_undeterminable_change_set_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            repository = Path(temporary_directory)
            config = {
                'minimum_risk': 'R2',
                'patterns': ['tools/safrs/**'],
                'verification_control_patterns': ['tools/safrs/**'],
                'risk_overrides': [],
            }
            install_checker(repository, config)
            # Deliberately no `git init`: every git invocation fails, so the
            # changed-file set cannot be determined. Fail closed, never guess R1.
            self.assertFalse((repository / '.git').exists())

            result = run_checker(repository)

            self.assertNotEqual(result.returncode, 0, result.stdout)
            self.assertNotIn('SAFRS_RISK=R1', result.stdout)
            self.assertIn('SAFRS_CLASSIFICATION_UNAVAILABLE', result.stdout + result.stderr)

    def test_ordinary_implementation_change_is_accepted(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            repository = Path(temporary_directory)
            config = {
                'minimum_risk': 'R2',
                'patterns': ['tools/safrs/**'],
                'verification_control_patterns': ['tools/safrs/**'],
                'risk_overrides': [],
            }
            install_checker(repository, config)
            commit_baseline(repository)
            write(repository, 'src/app.py', '# implementation\n')

            result = run_checker(repository)

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn('SAFRS_RISK=R1', result.stdout)


if __name__ == '__main__':
    unittest.main()
