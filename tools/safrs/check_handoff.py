#!/usr/bin/env python3
"""Enforce the session-handoff protocol.

If the current change set (staged + unstaged vs HEAD) contains non-trivial
work, HANDOFF.md must be part of it. Memory-file-only change sets are exempt,
so updating the handoff itself never demands another handoff.
"""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

# Changes to these files alone do not require a handoff update.
MEMORY_FILES = {
    'HANDOFF.md', 'PROGRESS.md', 'DECISIONS.md', 'CONTEXT.md',
    '.agents/knowledge/12_LESSONS.md',
}


def changed_files() -> set:
    out = subprocess.run(
        ['git', 'diff', '--name-only', 'HEAD'],
        cwd=ROOT, capture_output=True, text=True, check=False)
    if out.returncode != 0:
        return set()
    files = {line.strip().replace('\\', '/') for line in out.stdout.splitlines() if line.strip()}
    unt = subprocess.run(
        ['git', 'ls-files', '--others', '--exclude-standard'],
        cwd=ROOT, capture_output=True, text=True, check=False)
    files |= {line.strip().replace('\\', '/') for line in unt.stdout.splitlines() if line.strip()}
    return files


def main() -> None:
    files = changed_files()
    substantive = files - MEMORY_FILES
    if substantive and 'HANDOFF.md' not in files:
        raise SystemExit(
            'SAFRS session handoff failed: change set contains work but HANDOFF.md '
            'was not updated.\nOverwrite HANDOFF.md with current state, work in '
            'flight, blockers, and next actions (see AGENTS.md — Session protocol).')
    print('SAFRS session handoff: OK')


if __name__ == '__main__':
    main()
