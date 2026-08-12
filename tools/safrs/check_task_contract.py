#!/usr/bin/env python3
"""Validate stored task-contract artifacts.

Checks every contract in tests/fixtures/automation/contracts/ (and, when
present, .safrs/contracts/) against the TaskContractV1 schema subset and
recomputes the canonical contract digest. The canonical form must match the
Node implementation byte-for-byte, so this checker doubles as the
cross-language digest-parity gate required by the automation plan.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = ROOT / '.safrs' / 'schemas' / 'task-contract.v1.schema.json'
CONTRACT_DIRECTORIES = [
    ROOT / 'tests' / 'fixtures' / 'automation' / 'contracts',
    ROOT / '.safrs' / 'contracts',
]


def _normalize_numbers(value):
    """Match Node semantics: integral floats collapse to int (JSON.parse("1.0")
    yields 1 there), and non-finite numbers are rejected outright."""
    if isinstance(value, float):
        if value != value or value in (float('inf'), float('-inf')):
            raise ValueError('canonical JSON rejects non-finite numbers')
        if value.is_integer():
            return int(value)
        return value
    if isinstance(value, dict):
        return {key: _normalize_numbers(entry) for key, entry in value.items()}
    if isinstance(value, list):
        return [_normalize_numbers(entry) for entry in value]
    return value


def _reject_constant(constant: str):
    raise ValueError(f'canonical JSON rejects non-finite constant: {constant}')


def canonicalize(value) -> str:
    """Canonical JSON: sorted keys, no insignificant whitespace, raw UTF-8."""
    return json.dumps(
        _normalize_numbers(value),
        sort_keys=True,
        separators=(',', ':'),
        ensure_ascii=False,
        allow_nan=False,
    )


def digest_canonical(value) -> str:
    return hashlib.sha256(canonicalize(value).encode('utf-8')).hexdigest()


def resolve_ref(reference: str, root_schema):
    if not reference.startswith('#/'):
        raise SystemExit(f'unsupported $ref: {reference}')
    node = root_schema
    for segment in reference[2:].split('/'):
        node = node[segment]
    return node


def type_matches(expected: str, value) -> bool:
    if expected == 'object':
        return isinstance(value, dict)
    if expected == 'array':
        return isinstance(value, list)
    if expected == 'string':
        return isinstance(value, str)
    if expected == 'boolean':
        return isinstance(value, bool)
    if expected == 'integer':
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == 'number':
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if expected == 'null':
        return value is None
    raise SystemExit(f'unsupported schema type: {expected}')


def has_valid_calendar_date(value: str) -> bool:
    """The regex bounds clock fields; the calendar needs a real check."""
    match = re.match(r'^(\d{4})-(\d{2})-(\d{2})T', value)
    if not match:
        return False
    year, month, day = int(match[1]), int(match[2]), int(match[3])
    leap = (year % 4 == 0 and year % 100 != 0) or year % 400 == 0
    days = [31, 29 if leap else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    return 1 <= month <= 12 and 1 <= day <= days[month - 1]


def validate_node(schema, value, path, root_schema, errors):
    # Composition keywords first: they must apply even beside $ref/const/enum.
    if 'allOf' in schema:
        for sub_schema in schema['allOf']:
            validate_node(sub_schema, value, path, root_schema, errors)
    if 'if' in schema:
        condition_errors: list[str] = []
        validate_node(schema['if'], value, path, root_schema, condition_errors)
        if not condition_errors and 'then' in schema:
            validate_node(schema['then'], value, path, root_schema, errors)
    if '$ref' in schema:
        validate_node(resolve_ref(schema['$ref'], root_schema), value, path, root_schema, errors)
        return
    if 'const' in schema:
        if value != schema['const']:
            errors.append(f'{path}: expected const {schema["const"]!r}')
        return
    if 'enum' in schema:
        if value not in schema['enum']:
            errors.append(f'{path}: value not in enum')
        return
    if 'anyOf' in schema:
        for option in schema['anyOf']:
            option_errors = []
            validate_node(option, value, path, root_schema, option_errors)
            if not option_errors:
                return
        errors.append(f'{path}: no anyOf branch matched')
        return
    expected_type = schema.get('type')
    if expected_type and not type_matches(expected_type, value):
        errors.append(f'{path}: expected type {expected_type}')
        return
    if isinstance(value, str):
        pattern = schema.get('pattern')
        if pattern and not re.search(pattern, value):
            errors.append(f'{path}: pattern mismatch')
        if schema.get('format') == 'date-time' and not has_valid_calendar_date(value):
            errors.append(f'{path}: impossible calendar date')
        if 'minLength' in schema and len(value) < schema['minLength']:
            errors.append(f'{path}: shorter than minLength')
        if 'maxLength' in schema and len(value) > schema['maxLength']:
            errors.append(f'{path}: longer than maxLength')
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if 'minimum' in schema and value < schema['minimum']:
            errors.append(f'{path}: below minimum')
        if 'maximum' in schema and value > schema['maximum']:
            errors.append(f'{path}: above maximum')
    if isinstance(value, list):
        if 'minItems' in schema and len(value) < schema['minItems']:
            errors.append(f'{path}: fewer than minItems')
        if 'items' in schema:
            for index, entry in enumerate(value):
                validate_node(schema['items'], entry, f'{path}[{index}]', root_schema, errors)
    if isinstance(value, dict) and (
        'properties' in schema or 'required' in schema or 'additionalProperties' in schema
    ):
        for required_key in schema.get('required', []):
            if required_key not in value:
                errors.append(f'{path}: missing required {required_key}')
        for key, entry in value.items():
            property_schema = schema.get('properties', {}).get(key)
            if property_schema is not None:
                validate_node(property_schema, entry, f'{path}.{key}', root_schema, errors)
            elif schema.get('additionalProperties') is False:
                errors.append(f'{path}: additional property {key} forbidden')
            elif isinstance(schema.get('additionalProperties'), dict):
                validate_node(
                    schema['additionalProperties'], entry, f'{path}.{key}', root_schema, errors
                )


def validate_against_schema(schema, value):
    errors: list[str] = []
    validate_node(schema, value, '$', schema, errors)
    return errors


def check_contract_file(path: Path, schema) -> list[str]:
    raw = path.read_text(encoding='utf-8')
    contract = json.loads(raw, parse_constant=_reject_constant)
    errors = [f'{path.name}: {error}' for error in validate_against_schema(schema, contract)]
    stored_digest = contract.get('contract_digest')
    without_digest = {k: v for k, v in contract.items() if k != 'contract_digest'}
    recomputed = digest_canonical(without_digest)
    if stored_digest != recomputed:
        errors.append(
            f'{path.name}: contract_digest mismatch (stored {stored_digest}, recomputed {recomputed})'
        )
    if not raw.endswith('\n'):
        errors.append(f'{path.name}: stored canonical file must end with one newline')
    return errors


def main() -> None:
    schema = json.loads(SCHEMA_PATH.read_text(encoding='utf-8'))
    errors: list[str] = []
    seen = 0
    for directory in CONTRACT_DIRECTORIES:
        if not directory.is_dir():
            continue
        for file in sorted(directory.glob('*.json')):
            seen += 1
            errors.extend(check_contract_file(file, schema))
    if seen == 0:
        errors.append('no stored task contracts found to validate')
    if errors:
        raise SystemExit('SAFRS task contract check failed:\n- ' + '\n- '.join(errors))
    print(f'SAFRS task contracts: OK ({seen} validated)')


if __name__ == '__main__':
    main()
