#!/usr/bin/env python3
"""Validate the current SAFRS active-task registry snapshot.

This checker validates schema, path safety, expiry, and mutation-active
scope overlap. It does not replay lifecycle transition history.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]

MUTATION_ACTIVE = frozenset({
    'CLAIMED', 'PLANNED', 'EXECUTING', 'VERIFYING', 'REVIEW', 'BLOCKED', 'CONFLICT',
})
ALL_STATES = frozenset({
    'PROPOSED', 'CLAIMED', 'PLANNED', 'EXECUTING', 'VERIFYING', 'REVIEW', 'MERGED',
    'CLOSED', 'BLOCKED', 'CONFLICT', 'FAILED', 'ABORTED', 'SUPERSEDED',
})
RISKS = frozenset({'R0', 'R1', 'R2', 'R3'})
ISO_Z_RE = re.compile(
    r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$'
)
WILDCARD_RE = re.compile(r'[*?\[\]]')
SECRET_ASSIGNMENT_RE = re.compile(
    r'\b[A-Z0-9_]*(?:PASSWORD|TOKEN|KEY|SECRET|CREDENTIAL|AUTH)[A-Z0-9_]*=\S+',
    re.I,
)
CREDENTIAL_URL_RE = re.compile(r'\b[a-z][a-z0-9+.-]*://[^\s/@:]+:[^\s/@]+@[^\s]+', re.I)
CREDENTIAL_LITERAL_RE = re.compile(
    r'\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|'
    r'(?:sk|rk|pk)-(?:live|test)-[A-Za-z0-9_-]{16,}|AKIA[A-Z0-9]{16})\b',
    re.I,
)


def fail(message: str) -> None:
    raise SystemExit(f'SAFRS task ownership failed: {message}')


def parse_iso(value: str, *, context: str) -> datetime:
    if not ISO_Z_RE.match(value):
        fail(f'{context} must be valid ISO-8601 UTC ({value!r})')
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        fail(f'{context} must be valid ISO-8601 UTC ({value!r})')


def resolve_registry_path() -> Path:
    result = subprocess.run(
        ['git', 'rev-parse', '--git-common-dir'],
        cwd=ROOT,
        text=True,
        capture_output=True,
    )
    if result.returncode != 0:
        fail(f'cannot resolve Git common directory: {result.stderr.strip()}')
    common_directory = Path(result.stdout.strip())
    if not common_directory.is_absolute():
        common_directory = (ROOT / common_directory).resolve()
    return common_directory / 'safrs-control-plane' / 'active-tasks.json'


def resolve_git_path(*arguments: str) -> Path:
    result = subprocess.run(
        ['git', 'rev-parse', *arguments],
        cwd=ROOT,
        text=True,
        capture_output=True,
    )
    if result.returncode != 0:
        fail(f'cannot resolve Git path {" ".join(arguments)}: {result.stderr.strip()}')
    path = Path(result.stdout.strip())
    return path if path.is_absolute() else (ROOT / path).resolve()


def current_worktree_id() -> str:
    git_directory = resolve_git_path('--git-dir')
    common_directory = resolve_git_path('--git-common-dir')
    if git_directory == common_directory:
        return 'main'
    try:
        return git_directory.relative_to(common_directory).as_posix()
    except ValueError:
        fail('Git worktree directory is outside the common Git directory')


def changed_paths() -> set[str]:
    commands = [
        ['git', 'diff', '--name-only', 'HEAD'],
        ['git', 'diff', '--cached', '--name-only'],
        ['git', 'ls-files', '--others', '--exclude-standard'],
    ]
    paths: set[str] = set()
    for command in commands:
        result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
        if result.returncode != 0:
            fail(f'cannot determine changed paths: {result.stderr.strip()}')
        paths.update(line.strip().replace('\\', '/') for line in result.stdout.splitlines() if line.strip())
    return paths


def normalize_prefix(raw: Any, *, context: str) -> str:
    if not isinstance(raw, str) or not raw.strip():
        fail(f'{context}: scope prefix must be a non-empty string')
    value = raw.strip().replace('\\', '/')
    directory_scope = value.endswith('/')
    while '//' in value:
        value = value.replace('//', '/')
    if value.startswith('/') or re.match(r'^[A-Za-z]:/', value) or value.startswith('//'):
        fail(f'{context}: absolute paths are forbidden ({raw!r})')
    if any(part == '..' for part in value.split('/')):
        fail(f'{context}: ".." segments are forbidden ({raw!r})')
    if WILDCARD_RE.search(value) or '!' in value:
        fail(f'{context}: wildcards and negative patterns are forbidden ({raw!r})')
    if value == '' or value == '.':
        fail(f'{context}: empty or "." scope is forbidden')
    parts = [part for part in value.split('/') if part and part != '.']
    value = '/'.join(parts) + ('/' if directory_scope else '')
    target = ROOT / value
    if target.exists():
        if target.is_dir() and not directory_scope:
            fail(f'{context}: existing directory scopes must end with "/"')
        if target.is_file() and directory_scope:
            fail(f'{context}: file scopes must not end with "/"')
    return value


def prefixes_overlap(left: str, right: str) -> bool:
    left = left.casefold()
    right = right.casefold()
    if left == right:
        return True
    if left.endswith('/') and right.startswith(left):
        return True
    if right.endswith('/') and left.startswith(right):
        return True
    return False


def require_string(task: dict[str, Any], field: str, task_id: str, *, allow_empty: bool = False) -> str:
    value = task.get(field)
    if not isinstance(value, str):
        fail(f'task {task_id}: {field} must be a string')
    if not allow_empty and not value.strip():
        fail(f'task {task_id}: {field} must be non-empty')
    return value


def reject_secret_assignment(value: str, *, context: str) -> None:
    if (
        SECRET_ASSIGNMENT_RE.search(value)
        or CREDENTIAL_URL_RE.search(value)
        or CREDENTIAL_LITERAL_RE.search(value)
    ):
        fail(f'{context}: secret-like value is forbidden')


def validate_task(task: Any, index: int, seen_ids: set[str]) -> dict[str, Any]:
    if not isinstance(task, dict):
        fail(f'tasks[{index}] must be an object')
    task_id = task.get('id')
    if not isinstance(task_id, str) or not task_id.strip():
        fail(f'tasks[{index}].id must be a non-empty string')
    reject_secret_assignment(task_id, context=f'tasks[{index}].id')
    if task_id in seen_ids:
        fail(f'duplicate task id {task_id!r}')
    seen_ids.add(task_id)

    title = require_string(task, 'title', task_id)
    if len(title) > 200:
        fail(f'task {task_id}: title exceeds 200 characters')
    reject_secret_assignment(title, context=f'task {task_id}: title')

    state = require_string(task, 'state', task_id)
    if state not in ALL_STATES:
        fail(f'task {task_id}: invalid state {state!r}')

    risk = require_string(task, 'risk', task_id)
    if risk not in RISKS:
        fail(f'task {task_id}: invalid risk {risk!r}')
    if risk == 'R0' and state in MUTATION_ACTIVE:
        fail(f'task {task_id}: R0 tasks cannot be mutation-active')

    scopes = task.get('scope_prefixes')
    if not isinstance(scopes, list) or not scopes:
        fail(f'task {task_id}: scope_prefixes must be a non-empty array')
    normalized_scopes = [
        normalize_prefix(item, context=f'task {task_id} scope_prefixes[{i}]')
        for i, item in enumerate(scopes)
    ]

    tools = task.get('allowed_tools')
    if not isinstance(tools, list) or any(not isinstance(item, str) for item in tools):
        fail(f'task {task_id}: allowed_tools must be an array of strings')
    for tool in tools:
        reject_secret_assignment(tool, context=f'task {task_id}: allowed_tools')

    owner_id = require_string(task, 'owner_id', task_id)
    owner_label = require_string(task, 'owner_label', task_id)
    reject_secret_assignment(owner_id, context=f'task {task_id}: owner_id')
    reject_secret_assignment(owner_label, context=f'task {task_id}: owner_label')
    worktree_id = require_string(task, 'worktree_id', task_id)
    if (
        worktree_id.startswith('/')
        or re.match(r'^[A-Za-z]:/', worktree_id)
        or any(part in ('', '.', '..') for part in worktree_id.replace('\\', '/').split('/'))
    ):
        fail(f'task {task_id}: worktree_id must be a safe Git-common-relative id')

    claimed_at = require_string(task, 'claimed_at', task_id)
    updated_at = require_string(task, 'updated_at', task_id)
    for field_name, field_value in (('claimed_at', claimed_at), ('updated_at', updated_at)):
        parse_iso(field_value, context=f'task {task_id}: {field_name}')
    if parse_iso(updated_at, context=f'task {task_id}: updated_at') < parse_iso(
        claimed_at, context=f'task {task_id}: claimed_at'
    ):
        fail(f'task {task_id}: updated_at must be >= claimed_at')

    expires_at = task.get('expires_at', None)
    if expires_at is not None:
        if not isinstance(expires_at, str):
            fail(f'task {task_id}: expires_at must be ISO-8601 UTC or null')
        parse_iso(expires_at, context=f'task {task_id}: expires_at')

    notes = task.get('notes')
    if notes is not None:
        if not isinstance(notes, str):
            fail(f'task {task_id}: notes must be a string when present')
        if len(notes) > 500:
            fail(f'task {task_id}: notes exceeds 500 characters')
        reject_secret_assignment(notes, context=f'task {task_id}: notes')

    return {
        'id': task_id,
        'state': state,
        'scope_prefixes': normalized_scopes,
        'expires_at': expires_at,
        'worktree_id': worktree_id,
    }


def validate_registry(data: Any, *, now: datetime | None = None) -> None:
    if not isinstance(data, dict):
        fail('registry root must be an object')
    if data.get('version') != 1:
        fail('version must be 1')
    tasks = data.get('tasks')
    if not isinstance(tasks, list):
        fail('tasks must be an array')

    seen_ids: set[str] = set()
    validated = [validate_task(task, index, seen_ids) for index, task in enumerate(tasks)]
    clock = now or datetime.now(timezone.utc)

    active = [task for task in validated if task['state'] in MUTATION_ACTIVE]
    for task in active:
        expires_at = task['expires_at']
        if expires_at is not None and parse_iso(
            expires_at, context=f'task {task["id"]}: expires_at'
        ) < clock:
            fail(
                f'task {task["id"]}: mutation-active task expired at {expires_at}; '
                'close it or extend expires_at'
            )

    for i, left in enumerate(active):
        for right in active[i + 1:]:
            for left_scope in left['scope_prefixes']:
                for right_scope in right['scope_prefixes']:
                    if prefixes_overlap(left_scope, right_scope):
                        fail(
                            f'mutation-active overlap between {left["id"]} ({left_scope}) '
                            f'and {right["id"]} ({right_scope})'
                        )

    worktree_id = current_worktree_id()
    owned_here = [task for task in active if task['worktree_id'] == worktree_id]
    for path in sorted(changed_paths()):
        owners = [
            task
            for task in owned_here
            if any(
                scope == path
                or (scope.endswith('/') and path.casefold().startswith(scope.casefold()))
                for scope in task['scope_prefixes']
            )
        ]
        if not owners:
            fail(f'changed path has no active owner in {worktree_id}: {path}')
        if len(owners) > 1:
            fail(f'changed path has multiple active owners in {worktree_id}: {path}')


def main() -> None:
    registry = resolve_registry_path()
    if not registry.is_file():
        validate_registry({'version': 1, 'tasks': []})
        print('SAFRS task ownership: OK')
        return
    try:
        data = json.loads(registry.read_text(encoding='utf-8'))
    except json.JSONDecodeError as error:
        fail(f'invalid JSON in shared active-tasks.json: {error}')
    validate_registry(data)
    print('SAFRS task ownership: OK')


if __name__ == '__main__':
    main()
