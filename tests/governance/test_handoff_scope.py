#!/usr/bin/env python3
"""Scope-aware handoff gate (ADR 0007 decision 7).

Each substantive changed file maps to an owner scope: a file under
projects/<domain>/<capsule>/ belongs to that capsule, anything else to the
root. Every touched scope needs its own HANDOFF.md in the change set.
"""
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CHECKER = 'tools/safrs/check_handoff.py'
SHARED = 'tools/safrs/memory_files.py'
ROOT_HANDOFF = '.agents/HANDOFF.md'
UNICOM = 'projects/internal/unicom'
UNICOM_HANDOFF = f'{UNICOM}/.agents/HANDOFF.md'


def git(repository, *arguments):
    subprocess.run(
        ['git', '-c', 'user.name=SAFRS Test', '-c', 'user.email=test@example.invalid',
         *arguments],
        cwd=repository, check=True, capture_output=True, text=True,
    )


def write(repository, relative, content='changed\n'):
    target = repository / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')


class HandoffScopeTests(unittest.TestCase):
    def repository(self, with_projects=True):
        directory = Path(tempfile.mkdtemp(prefix='safrs-handoff-'))
        self.addCleanup(shutil.rmtree, directory, ignore_errors=True)
        (directory / 'tools/safrs').mkdir(parents=True)
        shutil.copy2(ROOT / CHECKER, directory / CHECKER)
        shutil.copy2(ROOT / SHARED, directory / SHARED)
        # Importing memory_files writes __pycache__/, which the real repository ignores.
        write(directory, '.gitignore', '__pycache__/\n')
        write(directory, ROOT_HANDOFF, '# root handoff\n')
        write(directory, 'tools/example.py', 'baseline\n')
        if with_projects:
            write(directory, UNICOM_HANDOFF, '# unicom handoff\n')
            write(directory, f'{UNICOM}/src/page.tsx', 'baseline\n')
        git(directory, 'init', '-q', '--initial-branch=main')
        git(directory, 'add', '.')
        git(directory, 'commit', '-qm', 'baseline')
        return directory

    def run_checker(self, repository):
        return subprocess.run(
            [sys.executable, repository / CHECKER],
            cwd=repository, capture_output=True, text=True,
        )

    def assertPasses(self, repository):
        result = self.run_checker(repository)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def assertFailsNaming(self, repository, *handoffs):
        result = self.run_checker(repository)
        self.assertNotEqual(result.returncode, 0, result.stdout)
        for handoff in handoffs:
            self.assertIn(handoff, result.stdout + result.stderr)

    def test_root_only_work_requires_the_root_handoff(self):
        repository = self.repository()
        write(repository, 'tools/example.py')
        self.assertFailsNaming(repository, ROOT_HANDOFF)
        write(repository, ROOT_HANDOFF, '# updated\n')
        self.assertPasses(repository)

    def test_capsule_only_work_requires_the_capsule_handoff_not_the_root(self):
        repository = self.repository()
        write(repository, f'{UNICOM}/src/page.tsx')
        self.assertFailsNaming(repository, UNICOM_HANDOFF)
        write(repository, UNICOM_HANDOFF, '# updated\n')
        self.assertPasses(repository)

    def test_the_root_handoff_does_not_satisfy_capsule_work(self):
        repository = self.repository()
        write(repository, f'{UNICOM}/src/page.tsx')
        write(repository, ROOT_HANDOFF, '# updated\n')
        self.assertFailsNaming(repository, UNICOM_HANDOFF)

    def test_mixed_work_requires_both_handoffs(self):
        repository = self.repository()
        write(repository, 'tools/example.py')
        write(repository, f'{UNICOM}/src/page.tsx')
        write(repository, UNICOM_HANDOFF, '# updated\n')
        self.assertFailsNaming(repository, ROOT_HANDOFF)
        write(repository, ROOT_HANDOFF, '# updated\n')
        self.assertPasses(repository)

    def test_memory_only_work_requires_no_handoff(self):
        repository = self.repository()
        write(repository, '.agents/DECISIONS.md', '# root decisions\n')
        write(repository, f'{UNICOM}/.agents/DECISIONS.md', '# unicom decisions\n')
        write(repository, f'{UNICOM}/.agents/CONTEXT.md', '# unicom context\n')
        self.assertPasses(repository)

    def test_template_and_domain_files_belong_to_the_root(self):
        repository = self.repository()
        write(repository, 'projects/_template/.agents/HANDOFF.md', '# skeleton\n')
        write(repository, 'projects/internal/AGENTS.md', '# domain router\n')
        self.assertFailsNaming(repository, ROOT_HANDOFF)
        write(repository, ROOT_HANDOFF, '# updated\n')
        self.assertPasses(repository)

    def test_a_tree_without_projects_passes(self):
        repository = self.repository(with_projects=False)
        self.assertPasses(repository)
        write(repository, 'tools/example.py')
        write(repository, ROOT_HANDOFF, '# updated\n')
        self.assertPasses(repository)


if __name__ == '__main__':
    unittest.main()
