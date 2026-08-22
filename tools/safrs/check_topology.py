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
    'projects/internal/golden-path/apps/web/AGENTS.md',
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
    '.cursor/rules/01-safrs.mdc',
]
errors = [f'missing required topology path: {item}' for item in required if not (ROOT / item).exists()]

# Capsules live two levels deep: projects/<domain>/<capsule>.
# A domain folder groups capsules; it owns no code, so it only carries the
# routing pair (AGENTS.md + README.md) and is never checked for src/tests.
DOMAIN_REQUIRED = ['AGENTS.md', 'README.md']
CAPSULE_REQUIRED = [
    'AGENTS.md',
    'README.md',
    'docs/architecture.md',
    'docs/data.md',
    'docs/testing.md',
    'src',
    'tests',
]


def check_placeholders(folder, label, sink):
    for relative in ['AGENTS.md', 'README.md']:
        file = folder / relative
        if file.exists() and '<replace-' in file.read_text(encoding='utf-8'):
            sink.append(f'{label}: unresolved activation placeholder in {relative}')


projects_root = ROOT / 'projects'
if projects_root.exists():
    domains = sorted(
        p for p in projects_root.iterdir() if p.is_dir() and not p.name.startswith('_')
    )
    for domain in domains:
        if not any(domain.iterdir()):
            continue
        for relative in DOMAIN_REQUIRED:
            if not (domain / relative).exists():
                errors.append(f'{domain.name}: missing domain path {relative}')
        check_placeholders(domain, domain.name, errors)

        capsules = sorted(
            p for p in domain.iterdir() if p.is_dir() and not p.name.startswith('_')
        )
        if not capsules:
            errors.append(f'{domain.name}: domain folder holds no capsule')
        for capsule in capsules:
            if not any(capsule.iterdir()):
                continue
            label = f'{domain.name}/{capsule.name}'
            for relative in CAPSULE_REQUIRED:
                if not (capsule / relative).exists():
                    errors.append(f'{label}: missing capsule path {relative}')
            check_placeholders(capsule, label, errors)

if errors:
    raise SystemExit('SAFRS repository topology failed:\n- ' + '\n- '.join(errors))
print('SAFRS repository topology: OK')
