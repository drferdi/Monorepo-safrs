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
    git(repository, 'init', '-q', '--initial-branch=main')
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
            git(
                repository,
                'hash-object',
                '--path',
                relative,
                str(target),
            ).stdout.strip()
            if target.is_file()
            else '<deleted>'
        )
        digest.update(f'{relative}\0{content_digest}\n'.encode())
    return digest.hexdigest()


def write_review_evidence(repository, paths, *, base_sha=None, digest=None):
    resolved_base = base_sha or git(repository, 'rev-parse', 'HEAD').stdout.strip()
    write(
        repository,
        REVIEW_EVIDENCE,
        json.dumps(
            {
                'version': 1,
                'verdict': 'approved',
                'reviewer_id': 'agent:independent-integrity-reviewer',
                'reviewed_at': '2026-08-11T15:30:00Z',
                'base_sha': resolved_base,
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

    def test_review_fingerprint_matches_windows_crlf_and_historical_git_blobs(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            repository = Path(temporary_directory)
            config = {
                'minimum_risk': 'R2',
                'patterns': ['tools/safrs/**'],
                'verification_control_patterns': ['tools/safrs/**'],
                'risk_overrides': [],
            }
            install_checker(repository, config)
            write(repository, '.gitattributes', '* text=auto eol=lf\n')
            commit_baseline(repository)
            base_sha = git(repository, 'rev-parse', 'HEAD').stdout.strip()
            changed = ['src/app.py', 'tools/safrs/check_extra.py']
            for relative, content in (
                (changed[0], b'# implementation\r\n'),
                (changed[1], b'# control\r\n'),
            ):
                target = repository / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(content)
            write_review_evidence(repository, changed, base_sha=base_sha)
            git(repository, 'add', '.')
            git(repository, 'commit', '-qm', 'reviewed change')

            result = run_checker(
                repository,
                {
                    **os.environ,
                    'SAFRS_BASE_REF': 'HEAD~1',
                    'SAFRS_HEAD_REF': 'HEAD',
                },
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn('SAFRS_VERIFICATION_INTEGRITY_REVIEW=approved', result.stdout)

    def test_review_evidence_covers_prior_commit_and_local_followup(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            repository = Path(temporary_directory)
            config = {
                'minimum_risk': 'R2',
                'patterns': ['tools/safrs/**'],
                'verification_control_patterns': ['tools/safrs/**'],
                'risk_overrides': [],
            }
            install_checker(repository, config)
            write(repository, '.gitattributes', '* text=auto eol=lf\n')
            commit_baseline(repository)
            base_sha = git(repository, 'rev-parse', 'HEAD').stdout.strip()
            changed = ['src/app.py', 'tools/safrs/check_extra.py']
            write(repository, changed[0], '# first commit\r\n')
            git(repository, 'add', '.')
            git(repository, 'commit', '-qm', 'first change')
            write(repository, changed[1], '# local followup\r\n')
            write_review_evidence(repository, changed, base_sha=base_sha)

            local_result = run_checker(repository)

            self.assertEqual(local_result.returncode, 0, local_result.stderr)
            git(repository, 'add', '.')
            git(repository, 'commit', '-qm', 'reviewed followup')
            historical_result = run_checker(
                repository,
                {
                    **os.environ,
                    'SAFRS_BASE_REF': base_sha,
                    'SAFRS_HEAD_REF': 'HEAD',
                },
            )
            self.assertEqual(historical_result.returncode, 0, historical_result.stderr)

    def test_missing_evidence_sees_prior_implementation_commit(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            repository = Path(temporary_directory)
            config = {
                'minimum_risk': 'R2',
                'patterns': ['tools/safrs/**'],
                'verification_control_patterns': ['tools/safrs/**'],
                'review_base_ref': 'main',
                'risk_overrides': [],
            }
            install_checker(repository, config)
            commit_baseline(repository)
            git(repository, 'checkout', '-qb', 'feature')
            write(repository, 'src/app.py', '# prior implementation\n')
            git(repository, 'add', '.')
            git(repository, 'commit', '-qm', 'implementation')
            write(repository, 'tools/safrs/check_extra.py', '# local control\n')

            result = run_checker(repository)

            self.assertNotEqual(result.returncode, 0, result.stdout)
            self.assertIn('SAFRS_VERIFICATION_INTEGRITY_REVIEW=required', result.stdout)
            self.assertIn('Changed files: 2', result.stdout)

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
