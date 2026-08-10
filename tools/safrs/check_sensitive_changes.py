#!/usr/bin/env python3
import fnmatch
import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
config = json.loads((ROOT/'.safrs/sensitive-paths.json').read_text(encoding='utf-8'))
base = os.environ.get('SAFRS_BASE_REF')
head = os.environ.get('SAFRS_HEAD_REF', 'HEAD')

if not base:
    # Local fallback: staged + unstaged + untracked names.
    cmds = [
        ['git','diff','--name-only','HEAD'],
        ['git','diff','--cached','--name-only'],
        ['git','ls-files','--others','--exclude-standard']
    ]
    names=set()
    for cmd in cmds:
        p=subprocess.run(cmd,cwd=ROOT,text=True,capture_output=True)
        if p.returncode == 0:
            names.update(x.strip() for x in p.stdout.splitlines() if x.strip())
else:
    p=subprocess.run(['git','diff','--name-only',f'{base}...{head}'],cwd=ROOT,text=True,capture_output=True,check=True)
    names=set(x.strip() for x in p.stdout.splitlines() if x.strip())

patterns=config['patterns']
verification=config['verification_control_patterns']
risk_overrides=config.get('risk_overrides', [])

def match(path, pattern):
    # fnmatch handles ** sufficiently for repository path classification.
    return fnmatch.fnmatch(path, pattern)

sensitive=sorted(p for p in names if any(match(p, pat) for pat in patterns))
verification_changed=sorted(p for p in names if any(match(p, pat) for pat in verification))
implementation_changed=sorted(p for p in names if p not in verification_changed and not p.startswith('docs/'))
override_matches = {
    rule['risk']: sorted(
        p for p in names
        if any(match(p, pattern) for pattern in rule.get('patterns', []))
    )
    for rule in risk_overrides
}

risk = 'R2' if sensitive else 'R1'
if override_matches.get('R3'):
    risk = 'R3'

print(f'Changed files: {len(names)}')
print(f'SAFRS_RISK={risk}')
if sensitive:
    print('Sensitive changes:')
    for p in sensitive: print(f'  - {p}')

for override_risk, matched_paths in sorted(override_matches.items()):
    if matched_paths:
        print(f'{override_risk} override paths:')
        for p in matched_paths: print(f'  - {p}')

if verification_changed:
    print('Verification/governance controls changed (minimum R2):')
    for p in verification_changed: print(f'  - {p}')

if verification_changed and implementation_changed:
    print('SAFRS_VERIFICATION_INTEGRITY_REVIEW=required')
    print('Implementation and governing verification changed together; independent review required.')
