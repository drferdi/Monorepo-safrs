#!/usr/bin/env python3
"""Semantic lifecycle agreement between the task registry and lease ledger.

Validates, deterministically and offline:
- every local lease-event chain (digest integrity, sequence contiguity,
  fencing monotonicity mirroring tools/automation/src/leases.mjs);
- registry/ledger agreement: a mutation-active task must not sit on a
  terminal chain and a terminal task must not sit on an active chain;
- scope agreement: the chain's scope digest matches the registry claim;
- session surfaces exist (.agents/HANDOFF.md, .agents/PROGRESS.md).

Tasks without a chain are tolerated (pre-lease claims); drift inside an
existing chain fails closed.
"""
from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

MUTATION_ACTIVE = {
    'CLAIMED', 'PLANNED', 'EXECUTING', 'VERIFYING', 'REVIEW', 'BLOCKED', 'CONFLICT',
}
TERMINAL_EVENT_TYPES = {'RELEASE', 'EXPIRE'}
TERMINAL_STATES = {'MERGED', 'CLOSED', 'FAILED', 'ABORTED', 'SUPERSEDED'}


def load_contract_checker():
    spec = importlib.util.spec_from_file_location(
        'check_task_contract', Path(__file__).with_name('check_task_contract.py')
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


checker = load_contract_checker()


def control_plane_dir() -> Path:
    result = subprocess.run(
        ['git', 'rev-parse', '--git-common-dir'],
        cwd=ROOT, text=True, capture_output=True,
    )
    if result.returncode != 0:
        raise SystemExit(f'SAFRS lifecycle failed: no git common dir: {result.stderr.strip()}')
    common = Path(result.stdout.strip())
    if not common.is_absolute():
        common = (ROOT / common).resolve()
    return common / 'safrs-control-plane'


def scope_digest(prefixes) -> str:
    normalized = sorted(p.lower() for p in prefixes)
    return checker.digest_canonical(normalized)


def verify_chain(events, errors, label):
    token = 0
    for index, event in enumerate(events):
        body = {k: v for k, v in event.items() if k != 'event_digest'}
        if event.get('event_digest') != checker.digest_canonical(body):
            errors.append(f'{label}: event[{index}] digest mismatch')
        if event.get('sequence') != index + 1:
            errors.append(f'{label}: event[{index}] sequence gap')
        bumps = event.get('event_type') in {'CLAIM', 'RECLAIM'}
        expected = token + 1 if bumps else token
        if event.get('fencing_token') != expected:
            errors.append(
                f'{label}: event[{index}] fencing token {event.get("fencing_token")}, expected {expected}'
            )
        token = expected


def chain_is_terminal(events) -> bool:
    last = events[-1]
    return (
        last.get('event_type') in TERMINAL_EVENT_TYPES
        or last.get('next_state') in TERMINAL_STATES
    )


def main() -> None:
    errors: list[str] = []
    control = control_plane_dir()

    registry_tasks = {}
    registry_path = control / 'active-tasks.json'
    if registry_path.is_file():
        registry = json.loads(registry_path.read_text(encoding='utf-8'))
        registry_tasks = {task['id']: task for task in registry.get('tasks', [])}

    chains: dict[str, list] = {}
    ledger_path = control / 'lease-events.ndjson'
    if ledger_path.is_file():
        for line_number, line in enumerate(
            ledger_path.read_text(encoding='utf-8').splitlines(), 1
        ):
            if not line.strip():
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError as error:
                errors.append(f'lease-events.ndjson:{line_number}: unparseable: {error}')
                continue
            chains.setdefault(event.get('task_id', '<unknown>'), []).append(event)

    for task_id, events in sorted(chains.items()):
        verify_chain(events, errors, task_id)
        task = registry_tasks.get(task_id)
        if task is None:
            # A chain may outlive registry pruning; that is history, not drift.
            continue
        terminal_chain = chain_is_terminal(events)
        active_task = task.get('state') in MUTATION_ACTIVE
        if active_task and terminal_chain:
            errors.append(
                f'{task_id}: registry says {task["state"]} but lease chain is terminal'
            )
        if not active_task and not terminal_chain:
            errors.append(
                f'{task_id}: registry says {task["state"]} but lease chain is still active'
            )
        claim_scopes = task.get('scope_prefixes', [])
        last_claim = next(
            (
                event
                for event in reversed(events)
                if event.get('event_type') in {'CLAIM', 'RECLAIM'}
            ),
            None,
        )
        if last_claim and last_claim.get('scope_digest') != scope_digest(claim_scopes):
            errors.append(f'{task_id}: lease scope digest diverges from registry claim')

    for surface in ['.agents/HANDOFF.md', '.agents/PROGRESS.md']:
        path = ROOT / surface
        if not path.is_file() or not path.read_text(encoding='utf-8').strip():
            errors.append(f'missing or empty session surface: {surface}')

    if errors:
        raise SystemExit('SAFRS lifecycle failed:\n- ' + '\n- '.join(errors))
    checked = sum(len(events) for events in chains.values())
    print(f'SAFRS lifecycle: OK ({len(chains)} chains, {checked} events)')


if __name__ == '__main__':
    main()
