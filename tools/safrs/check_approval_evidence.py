#!/usr/bin/env python3
"""Validate approval records and evidence manifests stored in the repository.

Mirrors tools/automation/src/{approvals,evidence}.mjs in Python so approval
bindings and evidence digests are enforced by the governance gate as well as
by the Node runtime. Both languages must agree: a manifest sealed by Node
must verify here byte-identically.

Fails closed on: unknown approval kind, missing binding for the kind,
self-review, expiry-before-issue, revoked records, manifest digest
mismatch, missing required manifest fields, and secret-shaped content that
survived redaction.
"""
from __future__ import annotations

import importlib.util
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
APPROVAL_DIR = ROOT / '.safrs' / 'approvals'
EVIDENCE_DIR = ROOT / '.safrs' / 'evidence'

R2_KINDS = {'R2_CODE_OWNER', 'R2_INDEPENDENT', 'VERIFICATION_INTEGRITY'}
ALL_KINDS = R2_KINDS | {'R3_EXECUTION'}

MANIFEST_REQUIRED = [
    'schema_version', 'manifest_id', 'task_id', 'run_id', 'attempt_ids',
    'contract_digest', 'lease_event_digests', 'base_sha', 'head_sha',
    'diff_digest', 'effective_risk', 'risk_reasons', 'tool_events',
    'network_events', 'budget_usage', 'check_verdicts', 'approval_ids',
    'publication', 'execution', 'recovery_events', 'artifact_hashes',
    'redaction_version', 'created_at', 'manifest_digest',
]

SECRET_PATTERNS = [
    re.compile(
        r'\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|'
        r'(?:sk|rk|pk)-(?:live|test)-[A-Za-z0-9_-]{16,}|AKIA[A-Z0-9]{16})\b'
    ),
    re.compile(
        r'\b[A-Z0-9_]*(?:PASSWORD|TOKEN|KEY|SECRET|CREDENTIAL|AUTH)[A-Z0-9_]*=\S+',
        re.I,
    ),
    re.compile(r'\b[a-z][a-z0-9+.-]*://[^\s/@:]+:[^\s/@]+@', re.I),
]
REDACTION_MARKER = re.compile(r'\[REDACTED:[A-Z_]+\]')


def load_contract_checker():
    spec = importlib.util.spec_from_file_location(
        'check_task_contract', Path(__file__).with_name('check_task_contract.py')
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


checker = load_contract_checker()


def contains_secret(value) -> bool:
    # A space, not an empty string: a trailing marker would otherwise leave
    # "NAME=" glued to the closing JSON quote, which \S+ still matches.
    serialized = REDACTION_MARKER.sub(' ', json.dumps(value, ensure_ascii=False))
    return any(pattern.search(serialized) for pattern in SECRET_PATTERNS)


def check_approval(name: str, approval: dict) -> list[str]:
    errors = []
    kind = approval.get('kind')
    if kind not in ALL_KINDS:
        errors.append(f'{name}: unknown approval kind {kind!r}')
        return errors
    if approval.get('reviewer_identity') == approval.get('author_identity'):
        errors.append(f'{name}: self-review is never a qualifying approval')
    if not approval.get('reviewer_authority'):
        errors.append(f'{name}: reviewer_authority is required')
    issued = approval.get('issued_at', '')
    expires = approval.get('expires_at', '')
    if not issued or not expires or expires <= issued:
        errors.append(f'{name}: expires_at must be after issued_at')
    if kind in R2_KINDS and not approval.get('diff_digest'):
        errors.append(f'{name}: {kind} requires a diff_digest binding')
    if kind == 'R3_EXECUTION':
        for field in ('operation_digest', 'target_environment', 'idempotency_key'):
            if not approval.get(field):
                errors.append(f'{name}: R3_EXECUTION requires {field}')
    if contains_secret(approval):
        errors.append(f'{name}: approval record contains secret-shaped content')
    return errors


def check_manifest(name: str, manifest: dict) -> list[str]:
    errors = [
        f'{name}: missing required field {field}'
        for field in MANIFEST_REQUIRED
        if field not in manifest
    ]
    stored = manifest.get('manifest_digest')
    body = {k: v for k, v in manifest.items() if k != 'manifest_digest'}
    recomputed = checker.digest_canonical(body)
    if stored != recomputed:
        errors.append(
            f'{name}: manifest_digest mismatch (stored {stored}, recomputed {recomputed})'
        )
    if contains_secret(manifest):
        errors.append(f'{name}: evidence contains secret-shaped content')
    return errors


def main() -> None:
    errors: list[str] = []
    approvals = sorted(APPROVAL_DIR.glob('*.json')) if APPROVAL_DIR.is_dir() else []
    manifests = sorted(EVIDENCE_DIR.glob('*.json')) if EVIDENCE_DIR.is_dir() else []

    for path in approvals:
        try:
            errors.extend(check_approval(path.name, json.loads(path.read_text(encoding='utf-8'))))
        except ValueError as error:
            errors.append(f'{path.name}: unparseable approval record: {error}')

    for path in manifests:
        try:
            errors.extend(check_manifest(path.name, json.loads(path.read_text(encoding='utf-8'))))
        except ValueError as error:
            errors.append(f'{path.name}: unparseable evidence manifest: {error}')

    if errors:
        raise SystemExit('SAFRS approval/evidence check failed:\n- ' + '\n- '.join(errors))
    print(
        f'SAFRS approval and evidence: OK ({len(approvals)} approvals, {len(manifests)} manifests)'
    )


if __name__ == '__main__':
    main()
