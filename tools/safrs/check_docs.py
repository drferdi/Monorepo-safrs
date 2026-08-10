#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
registry_path = ROOT / '.safrs' / 'document-registry.json'
registry = json.loads(registry_path.read_text(encoding='utf-8'))
allowed_status = set(registry['allowed_status'])
allowed_type = set(registry['allowed_type'])
ids = set()
paths = set()
errors = []

for d in registry.get('documents', []):
    did, path = d.get('id'), d.get('path')
    if not did or did in ids:
        errors.append(f'duplicate/missing document id: {did}')
    ids.add(did)
    if not path or path in paths:
        errors.append(f'duplicate/missing document path: {path}')
    paths.add(path)
    if d.get('status') not in allowed_status:
        errors.append(f'{did}: invalid status {d.get("status")}')
    if d.get('type') not in allowed_type:
        errors.append(f'{did}: invalid type {d.get("type")}')
    if path and not (ROOT / path).exists():
        errors.append(f'{did}: missing file {path}')
    if d.get('status') == 'SUPERSEDED' and d.get('superseded_by') and d['superseded_by'] not in ids:
        # forward references validated in second pass below
        pass

for d in registry.get('documents', []):
    target = d.get('superseded_by')
    if target and target not in ids:
        errors.append(f'{d.get("id")}: unknown superseded_by target {target}')

allowed_norm = set(registry.get('allowed_normativity', []))
allowed_scope = set(registry.get('allowed_scope', []))
orders = {}
for d in registry.get('documents', []):
    n, s, o = d.get('normativity'), d.get('scope'), d.get('read_order')
    if n is not None and n not in allowed_norm:
        errors.append(f"{d.get('id')}: invalid normativity {n}")
    if s is not None and s not in allowed_scope:
        errors.append(f"{d.get('id')}: invalid scope {s}")
    if (n is None) != (s is None):
        errors.append(f"{d.get('id')}: normativity and scope must be set together")
    if o is not None:
        if n != 'MUST':
            errors.append(f"{d.get('id')}: read_order requires normativity MUST")
        if o in orders:
            errors.append(f"{d.get('id')}: duplicate read_order {o} (also {orders[o]})")
        orders[o] = d.get('id')

if errors:
    raise SystemExit('SAFRS document registry failed:\n- ' + '\n- '.join(errors))
print('SAFRS document registry: OK')
