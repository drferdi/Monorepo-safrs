#!/usr/bin/env python3
"""Fail when a status checkbox contradicts the repository.

Status boards drift because nobody returns to them once the work lands. This
checker makes the provable half of that drift fail closed:

- `[x]` citing a commit that is not in this repository -> fabricated evidence.
- `[x]` citing a repository path that does not exist   -> the done claim is false.

Only backtick-quoted citations are inspected, and only when they are provably a
path or a commit, so prose is never guessed at. A citation is a path when it
carries a known file extension or its first segment is a real directory here —
that keeps branch names like `fix/some-branch` and refs like `origin/main` out.

What this cannot catch: a box that was never ticked after the work landed. No
static check proves that. That half is a working rule, recorded in the session
guardrails — the change set that finishes the work ticks its box in the same
commit.

Scope is the live boards only. `docs/plans/completed/` is history and is not
audited against today's tree.

Add `<!-- status-claims: ignore -->` on the line above a checkbox to exempt a
line the rules cannot judge — a deletion, say — and give the reason there.
"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

SCANNED = [
    '.agents/PROGRESS.md',
    'docs/plans/active',
]

CHECKBOX = re.compile(r'^\s*[-*]\s*\[( |x|X|~|!)\]\s*(.*)$')
CITATION = re.compile(r'`([^`]+)`')
COMMIT = re.compile(r'^[0-9a-f]{7,40}$')
EXTENSIONS = (
    '.md', '.mjs', '.js', '.ts', '.tsx', '.json', '.jsonc', '.py', '.sh',
    '.ps1', '.yml', '.yaml', '.toml', '.css',
)
IGNORE = 'status-claims: ignore'


def looks_like_path(citation):
    if citation.startswith(('http://', 'https://')):
        return False
    # Commands, globs, and prose fragments are not paths worth resolving.
    if any(character in citation for character in ' *?<>|'):
        return False
    if citation.endswith(EXTENSIONS):
        return True
    # A leading segment that is a real directory separates repository paths
    # from branch names and refs, which share the slash but nothing else.
    head = citation.split('/', 1)[0]
    return bool(head) and (ROOT / head).is_dir()


def commit_exists(sha):
    result = subprocess.run(
        ['git', 'cat-file', '-e', f'{sha}^{{commit}}'],
        cwd=ROOT,
        capture_output=True,
    )
    return result.returncode == 0


def markdown_files():
    for entry in SCANNED:
        target = ROOT / entry
        if target.is_dir():
            yield from sorted(target.rglob('*.md'))
        elif target.is_file():
            yield target


def check_line(path, number, state, text, errors):
    if state not in ('x', 'X'):
        return
    for citation in CITATION.findall(text):
        if looks_like_path(citation):
            if not (ROOT / citation).exists():
                errors.append(
                    f'{path}:{number}: marked done but `{citation}` does not exist'
                )
        elif COMMIT.match(citation) and not commit_exists(citation):
            errors.append(
                f'{path}:{number}: marked done citing commit `{citation}`, '
                'which is not in this repository'
            )


def main():
    errors = []
    for file_path in markdown_files():
        relative = file_path.relative_to(ROOT).as_posix()
        lines = file_path.read_text(encoding='utf-8').splitlines()
        for index, line in enumerate(lines):
            match = CHECKBOX.match(line)
            if not match:
                continue
            if index and IGNORE in lines[index - 1]:
                continue
            check_line(relative, index + 1, match.group(1), match.group(2), errors)

    if errors:
        print('SAFRS status claims failed:', file=sys.stderr)
        for error in errors:
            print(f'  - {error}', file=sys.stderr)
        print(
            '  A board that disagrees with the repository is worse than no board. '
            'Correct the box or the citation.',
            file=sys.stderr,
        )
        raise SystemExit(1)

    print('SAFRS status claims: OK')


if __name__ == '__main__':
    main()
