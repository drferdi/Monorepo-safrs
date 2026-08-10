#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
path = ROOT / '.safrs' / 'policy.json'
data = json.loads(path.read_text(encoding='utf-8'))
required_tiers = {'R0','R1','R2','R3'}
actual = set(data.get('risk_tiers', {}))
if actual != required_tiers:
    raise SystemExit(f'policy risk_tiers must be exactly {sorted(required_tiers)}; got {sorted(actual)}')
if data['risk_tiers']['R3'].get('human_authorization') is not True:
    raise SystemExit('R3 must require human_authorization=true')
for forbidden in ['read-production-secrets','direct-production-deploy','self-authorize-R3']:
    if forbidden not in data.get('forbidden_by_default', []):
        raise SystemExit(f'missing mandatory forbidden capability: {forbidden}')
repository = data.get('repository', {})
required_repository = {
    'type': 'monorepo',
    'default_branch': 'main',
    'project_capsule_root': 'projects',
    'shared_package_root': 'packages',
    'shared_test_root': 'tests',
    'tool_root': 'tools',
}
for key, expected in required_repository.items():
    if repository.get(key) != expected:
        raise SystemExit(f'policy repository.{key} must be {expected!r}')
isolation = data.get('execution_isolation', {})
if isolation.get('parallel_mutation') != 'dedicated-worktree':
    raise SystemExit('parallel mutation must require a dedicated worktree')
if data.get('tool_inventory') != '.safrs/tool-inventory.json':
    raise SystemExit('policy must reference .safrs/tool-inventory.json')
print('SAFRS policy: OK')
