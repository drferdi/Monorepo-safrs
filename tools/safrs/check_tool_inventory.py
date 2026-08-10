#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
path = ROOT / '.safrs' / 'tool-inventory.json'
data = json.loads(path.read_text(encoding='utf-8'))
errors = []

if data.get('default_network_policy') != 'deny-unless-task-authorized':
    errors.append('default_network_policy must be deny-unless-task-authorized')

required = {
    'id', 'owner', 'purpose', 'allowed_operations', 'data_scope',
    'authentication', 'network_endpoints', 'provenance', 'review_status'
}
ids = set()
for index, tool in enumerate(data.get('tools', [])):
    missing = sorted(required - set(tool))
    if missing:
        errors.append(f'tool[{index}] missing fields: {", ".join(missing)}')
    tool_id = tool.get('id')
    if not tool_id or tool_id in ids:
        errors.append(f'duplicate/missing tool id: {tool_id}')
    ids.add(tool_id)
    if tool.get('review_status') not in {'APPROVED', 'RESTRICTED', 'DISABLED'}:
        errors.append(f'{tool_id}: invalid review_status {tool.get("review_status")}')
    if not isinstance(tool.get('network_endpoints'), list):
        errors.append(f'{tool_id}: network_endpoints must be a list')

for required_tool in {'local-filesystem', 'git', 'python3', 'bash'}:
    if required_tool not in ids:
        errors.append(f'missing required local tool: {required_tool}')

if errors:
    raise SystemExit('SAFRS tool inventory failed:\n- ' + '\n- '.join(errors))
print('SAFRS tool inventory: OK')
