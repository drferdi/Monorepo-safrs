#!/usr/bin/env python3
"""Classify changed files by SAFRS risk and reject unreviewable change sets.

Exit codes:
  0 - no violation
  1 - policy violation: verification controls and implementation changed together
  2 - classification could not be determined (git could not answer)

There is no unbound bypass. Coupled implementation/control changes require a
strict independent-review artifact whose fingerprint matches the exact current
change set. If classification is uncertain, this checker refuses.
"""
import fnmatch
import hashlib
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
config = json.loads((ROOT/'.safrs/sensitive-paths.json').read_text(encoding='utf-8'))
base = os.environ.get('SAFRS_BASE_REF')
head = os.environ.get('SAFRS_HEAD_REF', 'HEAD')
review_evidence_path = '.safrs/reviews/verification-integrity.json'


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


def read_review_evidence():
    evidence_file = ROOT / review_evidence_path
    if not evidence_file.is_file():
        return None
    try:
        return json.loads(evidence_file.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError) as error:
        raise SystemExit(f'SAFRS integrity review evidence is invalid: {error}')


review_evidence = read_review_evidence()
configured_base_ref = config.get('review_base_ref', 'main')
if not isinstance(configured_base_ref, str) or not configured_base_ref.strip():
    raise SystemExit('SAFRS sensitive-path config requires review_base_ref')
diff_base_ref = base or configured_base_ref
diff_base_result = subprocess.run(
    ['git', 'rev-parse', f'{diff_base_ref}^{{commit}}'],
    cwd=ROOT,
    text=True,
    capture_output=True,
)
if diff_base_result.returncode != 0:
    unavailable(diff_base_result.args, diff_base_result.returncode, diff_base_result.stderr)
diff_base_sha = diff_base_result.stdout.strip()

if not base:
    # Local fallback: the reviewed branch diff plus staged, unstaged, and
    # untracked names. This keeps follow-up commits aligned with PR CI.
    cmds = [
        ['git','diff','--name-only',f'{diff_base_sha}...HEAD'],
        ['git','diff','--name-only','HEAD'],
        ['git','diff','--cached','--name-only'],
        ['git','ls-files','--others','--exclude-standard']
    ]
    names=set()
    for cmd in cmds:
        names.update(git_names(cmd))
else:
    names=git_names(['git','diff','--name-only',f'{diff_base_sha}...{head}'])

# The attestation describes the other changed files. Excluding it avoids a
# circular fingerprint while still validating its exact schema and content.
classified_names = names - {review_evidence_path}

patterns=config['patterns']
verification=config['verification_control_patterns']
risk_overrides=config.get('risk_overrides', [])

def match(path, pattern):
    # fnmatch handles ** sufficiently for repository path classification.
    return fnmatch.fnmatch(path, pattern)

sensitive=sorted(p for p in classified_names if any(match(p, pat) for pat in patterns))
verification_changed=sorted(p for p in classified_names if any(match(p, pat) for pat in verification))
implementation_changed=sorted(p for p in classified_names if p not in verification_changed and not p.startswith('docs/'))
override_matches = {
    rule['risk']: sorted(
        p for p in classified_names
        if any(match(p, pattern) for pattern in rule.get('patterns', []))
    )
    for rule in risk_overrides
}


def content_identity(path):
    if base:
        result = subprocess.run(
            ['git', 'rev-parse', f'{head}:{path}'],
            cwd=ROOT,
            text=True,
            capture_output=True,
        )
        if result.returncode != 0:
            return '<deleted>'
        return result.stdout.strip()
    target = ROOT / path
    if not target.is_file():
        return '<deleted>'
    result = subprocess.run(
        ['git', 'hash-object', '--path', path, str(target)],
        cwd=ROOT,
        text=True,
        capture_output=True,
    )
    if result.returncode != 0:
        unavailable(result.args, result.returncode, result.stderr)
    return result.stdout.strip()


def change_set_sha256(paths):
    digest = hashlib.sha256()
    for path in sorted(paths):
        digest.update(f'{path}\0{content_identity(path)}\n'.encode())
    return digest.hexdigest()


def integrity_review_approved(paths):
    if review_evidence is None:
        return False
    evidence = review_evidence
    required = {
        'version', 'verdict', 'reviewer_id', 'reviewed_at', 'base_sha',
        'change_set_sha256'
    }
    if set(evidence) != required:
        raise SystemExit(
            'SAFRS integrity review evidence has an invalid schema; '
            f'required fields: {", ".join(sorted(required))}'
        )
    if evidence['version'] != 1 or evidence['verdict'] != 'approved':
        raise SystemExit('SAFRS integrity review evidence is not an approved v1 review')
    if not isinstance(evidence['reviewer_id'], str) or not evidence['reviewer_id'].strip():
        raise SystemExit('SAFRS integrity review evidence requires reviewer_id')
    if (
        not isinstance(evidence['base_sha'], str)
        or len(evidence['base_sha']) not in (40, 64)
        or any(
            character not in '0123456789abcdef'
            for character in evidence['base_sha']
        )
    ):
        raise SystemExit('SAFRS integrity review evidence requires a full base_sha')
    evidence_base = subprocess.run(
        ['git', 'rev-parse', f'{evidence["base_sha"]}^{{commit}}'],
        cwd=ROOT,
        text=True,
        capture_output=True,
    )
    # Staleness is not tampering. An approval bound to an older base or to a
    # different change set is simply not an approval for *this* change set, so
    # it fails through to "review required" with an actionable message rather
    # than aborting with an error that looks like a broken checker.
    if evidence_base.returncode != 0:
        print(
            'Integrity review evidence references an unavailable base_sha; '
            'treating it as no approval.'
        )
        return False
    if evidence_base.stdout.strip() != diff_base_sha:
        print(
            'Integrity review evidence is stale (bound to '
            f'{evidence["base_sha"][:12]}, current diff base is '
            f'{diff_base_sha[:12]}); treating it as no approval.'
        )
        return False
    if not isinstance(evidence['reviewed_at'], str) or not evidence['reviewed_at'].endswith('Z'):
        raise SystemExit('SAFRS integrity review evidence requires UTC reviewed_at')
    try:
        datetime.fromisoformat(evidence['reviewed_at'].replace('Z', '+00:00'))
    except ValueError as error:
        raise SystemExit('SAFRS integrity review evidence has invalid reviewed_at') from error
    expected = change_set_sha256(paths)
    if evidence['change_set_sha256'] != expected:
        print(
            'Integrity review evidence was issued for a different change set; '
            'treating it as no approval.'
        )
        return False
    return True

risk = 'R2' if sensitive else 'R1'
if override_matches.get('R3'):
    risk = 'R3'

print(f'Changed files: {len(classified_names)}')
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
    if integrity_review_approved(classified_names):
        print('SAFRS_VERIFICATION_INTEGRITY_REVIEW=approved')
        print('Independent review evidence matches the current change-set fingerprint.')
    else:
        print('SAFRS_VERIFICATION_INTEGRITY_REVIEW=required')
        print('Implementation and governing verification changed together; independent review required.')
        raise SystemExit(
            'SAFRS sensitive change classification failed: verification controls and '
            'implementation changed in the same change set; split them into separate '
            'changes or obtain independent review.'
        )
