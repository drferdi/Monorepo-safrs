#!/usr/bin/env python3
"""Classify changed files by SAFRS risk and reject unreviewable change sets.

Exit codes:
  0 - no violation
  1 - policy violation: verification controls and implementation changed together
  2 - classification could not be determined (git could not answer)

There is no bypass. If the changed-file set cannot be established with
certainty, this checker refuses rather than assuming the lowest risk.
"""
import fnmatch
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
config = json.loads((ROOT/'.safrs/sensitive-paths.json').read_text(encoding='utf-8'))
base = os.environ.get('SAFRS_BASE_REF')
head = os.environ.get('SAFRS_HEAD_REF', 'HEAD')


def unavailable(command, returncode, stderr):
    """Refuse: no risk level is printed, because a guessed value would mislead."""
    print('SAFRS_CLASSIFICATION_UNAVAILABLE', file=sys.stderr)
    print(f'  command: {" ".join(command)}', file=sys.stderr)
    print(f'  returncode: {returncode}', file=sys.stderr)
    print(f'  stderr: {stderr.strip()}', file=sys.stderr)
    print(
        'The changed-file set could not be determined; refusing to guess a risk level.',
        file=sys.stderr,
    )
    raise SystemExit(2)


def git_names(command):
    p=subprocess.run(command,cwd=ROOT,text=True,capture_output=True)
    if p.returncode != 0:
        unavailable(command, p.returncode, p.stderr)
    return set(x.strip() for x in p.stdout.splitlines() if x.strip())


if not base:
    # Local fallback: staged + unstaged + untracked names.
    cmds = [
        ['git','diff','--name-only','HEAD'],
        ['git','diff','--cached','--name-only'],
        ['git','ls-files','--others','--exclude-standard']
    ]
    names=set()
    for cmd in cmds:
        names.update(git_names(cmd))
else:
    names=git_names(['git','diff','--name-only',f'{base}...{head}'])

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
    raise SystemExit(
        'SAFRS sensitive change classification failed: verification controls and '
        'implementation changed in the same change set; split them into separate '
        'changes or obtain independent review.'
    )
