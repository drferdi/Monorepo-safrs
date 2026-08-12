#!/usr/bin/env python3
"""Validate the automation policy, adapter capabilities, and schema set.

Internal references must resolve: operation risks and approval defaults use
declared risk levels, budget dimensions match the TaskContractV1 schema,
every v1 schema file parses with additionalProperties pinned to false, and
the Droid adapter stays read-only-disabled until Activation Decision 4.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RISKS = {'R0', 'R1', 'R2', 'R3'}
APPROVAL_REQUIREMENTS = {
    'none',
    'automatic_gates_only',
    'independent_or_code_owner',
    'protected_environment_human',
}
EXPECTED_SCHEMAS = {
    'task-contract',
    'run-contract',
    'lease-event',
    'approval-record',
    'evidence-manifest',
    'operation-contract',
    'platform-attestation',
}

errors: list[str] = []


def load(path: Path):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError) as error:
        raise SystemExit(f'SAFRS automation policy check failed: cannot read {path}: {error}')


policy = load(ROOT / '.safrs' / 'automation-policy.json')
adapters = load(ROOT / '.safrs' / 'adapter-capabilities.json')

if type(policy.get('version')) is not int or policy['version'] != 1:
    errors.append('automation-policy version must be 1')
if policy.get('risk_order') != ['R0', 'R1', 'R2', 'R3']:
    errors.append('risk_order must be R0..R3')
# type() rather than isinstance(): bool is an int subclass and must not pass.
if type(policy.get('max_expiry_hours')) is not int or policy['max_expiry_hours'] < 1:
    errors.append('max_expiry_hours must be a positive integer')

for operation_id, record in policy.get('operations', {}).items():
    if record.get('min_risk') not in RISKS:
        errors.append(f'operation {operation_id}: invalid min_risk')
    if not record.get('description'):
        errors.append(f'operation {operation_id}: description required')

for classification, risk in policy.get('data_classification_risk', {}).items():
    if risk not in RISKS:
        errors.append(f'data classification {classification}: invalid risk {risk}')

for capability, risk in policy.get('capability_risk', {}).items():
    if risk not in RISKS:
        errors.append(f'capability {capability}: invalid risk {risk}')

for level, requirement in policy.get('approval_defaults', {}).items():
    if level not in RISKS or requirement not in APPROVAL_REQUIREMENTS:
        errors.append(f'approval default {level}: invalid entry {requirement}')
if set(policy.get('approval_defaults', {})) != RISKS:
    errors.append('approval_defaults must cover exactly R0..R3')

r3 = policy.get('r3', {})
if r3.get('prepare_only') is not True:
    errors.append('r3.prepare_only must be true')
if r3.get('production_adapters_enabled') is not False:
    errors.append('r3.production_adapters_enabled must be false')
if r3.get('free_form_shell_forbidden') is not True:
    errors.append('r3.free_form_shell_forbidden must be true')

schema_dir = ROOT / '.safrs' / 'schemas'
found_schemas = set()
task_contract_schema = None
for file in sorted(schema_dir.glob('*.v1.schema.json')):
    name = file.name.removesuffix('.v1.schema.json')
    found_schemas.add(name)
    schema = load(file)
    if schema.get('additionalProperties') is not False:
        errors.append(f'schema {name}: additionalProperties must be false')
    if schema.get('$schema') != 'https://json-schema.org/draft/2020-12/schema':
        errors.append(f'schema {name}: must declare JSON Schema 2020-12')
    if name == 'task-contract':
        task_contract_schema = schema
if found_schemas != EXPECTED_SCHEMAS:
    missing = EXPECTED_SCHEMAS - found_schemas
    extra = found_schemas - EXPECTED_SCHEMAS
    if missing:
        errors.append(f'missing schemas: {", ".join(sorted(missing))}')
    if extra:
        errors.append(f'unexpected schemas: {", ".join(sorted(extra))}')

if task_contract_schema is not None:
    schema_budget_keys = set(
        task_contract_schema['properties']['budgets']['required']
    )
    policy_budget_keys = set(policy.get('budgets', {}).get('required_dimensions', []))
    if schema_budget_keys != policy_budget_keys:
        errors.append(
            'budget dimensions diverge between automation-policy and task-contract schema'
        )
    for dimension in policy.get('budgets', {}).get('maximums', {}):
        if dimension not in schema_budget_keys:
            errors.append(f'budget maximum for unknown dimension: {dimension}')

if type(adapters.get('version')) is not int or adapters['version'] != 1:
    errors.append('adapter-capabilities version must be 1')
for adapter_id, record in adapters.get('adapters', {}).items():
    if not isinstance(record.get('enforceable_pre_action_hooks'), bool):
        errors.append(f'adapter {adapter_id}: enforceable_pre_action_hooks must be boolean')
    if record.get('activation') not in {'active', 'read_only', 'read_only_disabled'}:
        errors.append(f'adapter {adapter_id}: invalid activation state')
    if not record.get('enforceable_pre_action_hooks') and record.get('activation') == 'active':
        errors.append(
            f'adapter {adapter_id}: cannot be active without enforceable pre-action hooks'
        )
droid = adapters.get('adapters', {}).get('droid')
if droid is None or droid.get('activation') != 'read_only_disabled':
    errors.append('droid adapter must stay read_only_disabled pending Activation Decision 4')

if errors:
    raise SystemExit('SAFRS automation policy check failed:\n- ' + '\n- '.join(errors))
print('SAFRS automation policy: OK')
