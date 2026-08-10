#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
required = [
    'projects/README.md',
    'projects/_template/AGENTS.md',
    'projects/_template/README.md',
    'projects/_template/docs/architecture.md',
    'projects/_template/docs/data.md',
    'projects/_template/docs/testing.md',
    'projects/_template/src/README.md',
    'projects/_template/tests/README.md',
    'projects/golden-path/apps/web/AGENTS.md',
    'packages/api/AGENTS.md',
    'packages/database/AGENTS.md',
    'packages/README.md',
    'tools/AGENTS.md',
    'tools/README.md',
    'tests/README.md',
    'docs/adrs/README.md',
    'docs/plans/active',
    'docs/plans/completed/README.md',
    'docs/plans/archived/README.md',
    'docs/evidence/README.md',
    '.cursor/rules/safrs.mdc',
]
errors = [f'missing required topology path: {item}' for item in required if not (ROOT / item).exists()]

projects_root = ROOT / 'projects'
if projects_root.exists():
    for capsule in sorted(p for p in projects_root.iterdir() if p.is_dir() and not p.name.startswith('_')):
        for relative in ['AGENTS.md', 'README.md', 'docs/architecture.md', 'docs/data.md', 'docs/testing.md', 'src', 'tests']:
            if not (capsule / relative).exists():
                errors.append(f'{capsule.name}: missing capsule path {relative}')
        for relative in ['AGENTS.md', 'README.md']:
            file = capsule / relative
            if file.exists() and '<replace-' in file.read_text(encoding='utf-8'):
                errors.append(f'{capsule.name}: unresolved activation placeholder in {relative}')

if errors:
    raise SystemExit('SAFRS repository topology failed:\n- ' + '\n- '.join(errors))
print('SAFRS repository topology: OK')
