#!/usr/bin/env python3
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
workflow_dir = ROOT / '.github' / 'workflows'
# Third-party/repository actions must use a full 40-hex commit SHA. Local actions ./... are exempt.
uses_re = re.compile(r'^\s*-?\s*uses:\s*([^\s#]+)')
sha_re = re.compile(r'^.+@[0-9a-fA-F]{40}$')
errors=[]

if workflow_dir.exists():
    for file in sorted(list(workflow_dir.glob('*.yml')) + list(workflow_dir.glob('*.yaml'))):
        for lineno, line in enumerate(file.read_text(encoding='utf-8').splitlines(), 1):
            m=uses_re.match(line)
            if not m:
                continue
            ref=m.group(1).strip('"\'')
            if ref.startswith('./') or ref.startswith('docker://'):
                continue
            if not sha_re.match(ref):
                errors.append(f'{file.relative_to(ROOT)}:{lineno}: action not pinned to full SHA: {ref}')

if errors:
    raise SystemExit('SAFRS GitHub Actions pinning failed:\n- ' + '\n- '.join(errors))
print('SAFRS GitHub Actions pinning: OK')
