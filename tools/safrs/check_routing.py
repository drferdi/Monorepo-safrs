#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ag = ROOT / 'AGENTS.md'
text = ag.read_text(encoding='utf-8')
required = [
    '00_READ_FIRST.md', '02_OBJECTIVES.md', '03_ARCHITECTURE.md',
    '04_CONTEXT.md', 'SAFRS_SPEC.md', 'scripts/safrs-verify.sh',
    'docs/governance/SAFRS_PROJECT_CAPSULES.md',
    'projects/golden-path/apps/web', 'pnpm run doctor', 'pnpm run setup',
    'pnpm dev', 'pnpm run governance'
]
missing = [x for x in required if x not in text]
missing_files = [x for x in required if (x.endswith('.md') or x.startswith('projects/')) and not (ROOT / x).exists()]
if (ROOT / '.cursorrules').exists():
    raise SystemExit('deprecated .cursorrules must not exist; use the thin canonical adapter')
if missing or missing_files:
    msg=[]
    if missing: msg.append('AGENTS.md missing references: ' + ', '.join(missing))
    if missing_files: msg.append('referenced files missing: ' + ', '.join(missing_files))
    raise SystemExit('\n'.join(msg))
print('SAFRS agent routing: OK')
