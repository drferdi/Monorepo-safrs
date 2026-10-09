#!/usr/bin/env python3
"""Enforce the scope-aware session-handoff protocol (ADR 0007 decision 7).

Each substantive file in the current change set (staged + unstaged + untracked
vs HEAD) maps to an owner scope: a file under projects/<domain>/<capsule>/
belongs to that capsule, anything else to the root. Every touched scope must
update its own HANDOFF.md in the same change set. Memory-file-only change sets
are exempt, so updating a handoff never demands another handoff.
"""
import subprocess
from pathlib import Path

from memory_files import handoff_for, is_memory_file

ROOT = Path(__file__).resolve().parents[2]


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
    required = {handoff_for(path) for path in files if not is_memory_file(path)}
    missing = sorted(handoff for handoff in required if handoff not in files)
    if missing:
        raise SystemExit(
            'SAFRS session handoff failed: change set contains work but these handoffs '
            'were not updated:\n- ' + '\n- '.join(missing) + '\nOverwrite each with '
            'current state, work in flight, blockers, and next actions (see AGENTS.md — '
            'Task Lifecycle & Documentation).')
    print('SAFRS session handoff: OK')


if __name__ == '__main__':
    main()
