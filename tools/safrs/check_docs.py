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

if errors:
    raise SystemExit('SAFRS document registry failed:\n- ' + '\n- '.join(errors))
print('SAFRS document registry: OK')
