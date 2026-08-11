#!/usr/bin/env python3
"""Tests for tools/safrs/check_task_ownership.py"""
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CHECKER = 'tools/safrs/check_task_ownership.py'


def shared_registry_path(repository: Path) -> Path:
    result = subprocess.run(
        ['git', 'rev-parse', '--git-common-dir'],
        cwd=repository,
        text=True,
        capture_output=True,
        check=True,
    )
    common_directory = Path(result.stdout.strip())
    if not common_directory.is_absolute():
        common_directory = repository / common_directory
    return common_directory / 'safrs-control-plane' / 'active-tasks.json'


def write_registry(repository: Path, payload: dict) -> None:
    target = shared_registry_path(repository)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(payload), encoding='utf-8')


def install_checker(repository: Path) -> None:
    (repository / 'tools' / 'safrs').mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / CHECKER, repository / CHECKER)
    if not (repository / '.git').exists():
        subprocess.run(
            ['git', 'init', '--initial-branch=main'],
            cwd=repository,
            text=True,
            capture_output=True,
            check=True,
        )


def commit_fixture(repository: Path) -> None:
    git(repository, 'config', 'user.email', 'tests@example.invalid')
    git(repository, 'config', 'user.name', 'SAFRS Tests')
    git(repository, 'add', '.')
    status = git(repository, 'status', '--porcelain').stdout.strip()
    if status:
        git(repository, 'commit', '-m', 'test fixture')


def run_checker(
    repository: Path, *, prepare_clean: bool = True
) -> subprocess.CompletedProcess[str]:
    if prepare_clean:
        commit_fixture(repository)
    return subprocess.run(
        [sys.executable, str(repository / CHECKER)],
        cwd=repository,
        text=True,
        capture_output=True,
    )


def git(repository: Path, *arguments: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ['git', *arguments],
        cwd=repository,
        text=True,
        capture_output=True,
        check=True,
    )


def base_task(**overrides):
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')
    task = {
        'id': 'TASK-1',
        'title': 'Example',
        'state': 'EXECUTING',
        'risk': 'R1',
        'scope_prefixes': ['packages/api/'],
        'allowed_tools': ['git'],
        'owner_id': 'agent:test',
        'owner_label': 'Test Agent',
        'worktree_id': 'main',
        'claimed_at': now,
        'updated_at': now,
        'expires_at': None,
    }
    task.update(overrides)
    return task


class TaskOwnershipTests(unittest.TestCase):
    def test_empty_registry_passes(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            repository = Path(temporary_directory)
            install_checker(repository)
            write_registry(repository, {'version': 1, 'tasks': []})
            result = run_checker(repository)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn('SAFRS task ownership: OK', result.stdout)

    def test_overlapping_mutation_active_fails(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            repository = Path(temporary_directory)
            install_checker(repository)
            write_registry(
                repository,
                {
                    'version': 1,
                    'tasks': [
                        base_task(id='TASK-A', scope_prefixes=['.cursor/']),
                        base_task(
                            id='TASK-B',
                            scope_prefixes=['.cursor/rules/'],
                            owner_id='agent:other',
                        ),
                    ],
                },
            )
            result = run_checker(repository)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('overlap', result.stderr.lower() + result.stdout.lower())

    def test_non_overlapping_mutation_active_passes(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            repository = Path(temporary_directory)
            install_checker(repository)
            write_registry(
                repository,
                {
                    'version': 1,
                    'tasks': [
                        base_task(id='TASK-A', scope_prefixes=['packages/api/']),
                        base_task(
                            id='TASK-B',
                            scope_prefixes=['packages/ui/'],
                            owner_id='agent:other',
                        ),
                    ],
                },
            )
            result = run_checker(repository)
            self.assertEqual(result.returncode, 0, result.stderr)

    def test_terminal_task_does_not_block(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            repository = Path(temporary_directory)
            install_checker(repository)
            write_registry(
                repository,
                {
                    'version': 1,
                    'tasks': [
                        base_task(id='TASK-A', state='CLOSED', scope_prefixes=['.cursor/']),
                        base_task(id='TASK-B', scope_prefixes=['.cursor/rules/']),
                    ],
                },
            )
            result = run_checker(repository)
            self.assertEqual(result.returncode, 0, result.stderr)

    def test_wildcard_scope_fails(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            repository = Path(temporary_directory)
            install_checker(repository)
            write_registry(
                repository,
                {'version': 1, 'tasks': [base_task(scope_prefixes=['packages/**'])]},
            )
            result = run_checker(repository)
            self.assertNotEqual(result.returncode, 0)

    def test_expired_mutation_active_fails(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            repository = Path(temporary_directory)
            install_checker(repository)
            past = (datetime.now(timezone.utc) - timedelta(hours=1)).replace(
                microsecond=0
            ).isoformat().replace('+00:00', 'Z')
            write_registry(
                repository,
                {'version': 1, 'tasks': [base_task(expires_at=past)]},
            )
            result = run_checker(repository)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('expired', (result.stderr + result.stdout).lower())

    def test_malformed_json_fails(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            repository = Path(temporary_directory)
            install_checker(repository)
            target = shared_registry_path(repository)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text('{not-json', encoding='utf-8')
            result = run_checker(repository)
            self.assertNotEqual(result.returncode, 0)

    def test_missing_shared_registry_means_no_active_tasks(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            repository = Path(temporary_directory)
            install_checker(repository)
            git(repository, 'init', '--initial-branch=main')
            result = run_checker(repository)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn('SAFRS task ownership: OK', result.stdout)

    def test_checker_reads_one_registry_shared_by_sibling_worktrees(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            sandbox = Path(temporary_directory)
            repository = sandbox / 'repository'
            sibling = sandbox / 'sibling'
            repository.mkdir()
            git(repository, 'init', '--initial-branch=main')
            git(repository, 'config', 'user.email', 'tests@example.invalid')
            git(repository, 'config', 'user.name', 'SAFRS Tests')
            install_checker(repository)
            write_registry(repository, {'version': 1, 'tasks': []})
            (repository / 'README.md').write_text('fixture\n', encoding='utf-8')
            git(repository, 'add', '.')
            git(repository, 'commit', '-m', 'fixture')
            git(repository, 'worktree', 'add', '-b', 'second', str(sibling))

            common_directory = Path(
                git(repository, 'rev-parse', '--git-common-dir').stdout.strip()
            )
            if not common_directory.is_absolute():
                common_directory = repository / common_directory
            shared_registry = (
                common_directory / 'safrs-control-plane' / 'active-tasks.json'
            )
            shared_registry.parent.mkdir(parents=True, exist_ok=True)
            shared_registry.write_text(
                json.dumps(
                    {
                        'version': 1,
                        'tasks': [
                            base_task(id='TASK-A', scope_prefixes=['tools/']),
                            base_task(
                                id='TASK-B',
                                scope_prefixes=['tools/safrs/'],
                                owner_id='agent:other',
                            ),
                        ],
                    }
                ),
                encoding='utf-8',
            )

            result = run_checker(sibling)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('overlap', (result.stderr + result.stdout).lower())

    def test_existing_directory_scope_requires_trailing_slash(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            repository = Path(temporary_directory)
            install_checker(repository)
            write_registry(
                repository,
                {'version': 1, 'tasks': [base_task(scope_prefixes=['tools/safrs'])]},
            )
            result = run_checker(repository)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('must end with', (result.stderr + result.stdout).lower())

    def test_dot_alias_and_case_variant_still_overlap(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            repository = Path(temporary_directory)
            install_checker(repository)
            write_registry(
                repository,
                {
                    'version': 1,
                    'tasks': [
                        base_task(id='TASK-A', scope_prefixes=['././TOOLS/']),
                        base_task(
                            id='TASK-B',
                            scope_prefixes=['tools/safrs/'],
                            owner_id='agent:other',
                        ),
                    ],
                },
            )
            result = run_checker(repository)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('overlap', (result.stderr + result.stdout).lower())

    def test_r0_cannot_be_mutation_active(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            repository = Path(temporary_directory)
            install_checker(repository)
            write_registry(repository, {'version': 1, 'tasks': [base_task(risk='R0')]})
            result = run_checker(repository)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('r0', (result.stderr + result.stdout).lower())

    def test_invalid_calendar_timestamp_fails_without_traceback(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            repository = Path(temporary_directory)
            install_checker(repository)
            write_registry(
                repository,
                {
                    'version': 1,
                    'tasks': [
                        base_task(
                            state='CLOSED',
                            claimed_at='2026-99-99T99:99:99Z',
                            updated_at='2026-99-99T99:99:99Z',
                        )
                    ],
                },
            )
            result = run_checker(repository)
            self.assertNotEqual(result.returncode, 0)
            output = (result.stderr + result.stdout).lower()
            self.assertIn('iso-8601', output)
            self.assertNotIn('traceback', output)

    def test_changed_path_without_active_owner_fails(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            repository = Path(temporary_directory)
            install_checker(repository)
            commit_fixture(repository)
            changed = repository / 'owned' / 'file.txt'
            changed.parent.mkdir(parents=True)
            changed.write_text('changed\n', encoding='utf-8')
            result = run_checker(repository, prepare_clean=False)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('no active owner', (result.stderr + result.stdout).lower())

    def test_changed_path_with_one_active_owner_passes(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            repository = Path(temporary_directory)
            install_checker(repository)
            commit_fixture(repository)
            changed = repository / 'owned' / 'file.txt'
            changed.parent.mkdir(parents=True)
            changed.write_text('changed\n', encoding='utf-8')
            write_registry(
                repository,
                {
                    'version': 1,
                    'tasks': [base_task(scope_prefixes=['owned/'])],
                },
            )
            result = run_checker(repository, prepare_clean=False)
            self.assertEqual(result.returncode, 0, result.stderr)

    def test_secret_assignments_and_missing_allowed_tools_fail_schema(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            repository = Path(temporary_directory)
            install_checker(repository)
            secret_task = base_task(title='API_TOKEN=top-secret')
            lowercase_secret = base_task(
                id='TASK-LOWERCASE', title='api_token=lowercase-secret'
            )
            credential_shaped = base_task(
                id='TASK-PAT', owner_label='ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
            )
            credential_id_value = 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
            credential_id = base_task(id=credential_id_value)
            missing_tools = base_task(id='TASK-NO-TOOLS')
            del missing_tools['allowed_tools']
            for task in (
                secret_task,
                lowercase_secret,
                credential_shaped,
                credential_id,
                missing_tools,
            ):
                write_registry(repository, {'version': 1, 'tasks': [task]})
                result = run_checker(repository)
                self.assertNotEqual(result.returncode, 0)
                self.assertNotIn(
                    credential_id_value,
                    result.stdout + result.stderr,
                )


if __name__ == '__main__':
    unittest.main()
