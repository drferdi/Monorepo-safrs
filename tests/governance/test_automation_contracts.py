#!/usr/bin/env python3
"""Governance tests for automation contracts, schemas, and digest parity."""
from __future__ import annotations

import copy
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def load_checker():
    spec = importlib.util.spec_from_file_location(
        'check_task_contract', ROOT / 'tools' / 'safrs' / 'check_task_contract.py'
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


checker = load_checker()
SCHEMA = json.loads(
    (ROOT / '.safrs' / 'schemas' / 'task-contract.v1.schema.json').read_text(encoding='utf-8')
)
CONTRACT_DIR = ROOT / 'tests' / 'fixtures' / 'automation' / 'contracts'


def load_contract(name: str):
    return json.loads((CONTRACT_DIR / f'{name}.json').read_text(encoding='utf-8'))


class CanonicalDigestParity(unittest.TestCase):
    def test_stored_digests_reproduce_in_python(self):
        """Node wrote these digests; Python must recompute them identically."""
        for name in ['valid-r0', 'valid-r1', 'valid-r2', 'valid-r3']:
            contract = load_contract(name)
            stored = contract.pop('contract_digest')
            self.assertEqual(stored, checker.digest_canonical(contract), name)

    def test_canonical_form_sorts_keys_without_whitespace(self):
        self.assertEqual(
            checker.canonicalize({'b': 1, 'a': ['x', {'d': 2, 'c': 3}]}),
            '{"a":["x",{"c":3,"d":2}],"b":1}',
        )

    def test_numeric_canonicalization_matches_node(self):
        """Only safe integers are canonical: engine float spellings diverge
        (Python 1.2e-07 vs Node 1.2e-7), so floats fail closed."""
        self.assertEqual(checker.canonicalize({'a': 1.0}), '{"a":1}')
        self.assertEqual(checker.canonicalize({'a': -0.0}), '{"a":0}')
        self.assertEqual(checker.canonicalize({'a': 9007199254740991}), '{"a":9007199254740991}')
        for bad in [12.5, 1.2e-7, 1e21, 9007199254740992, float('nan'), float('inf')]:
            with self.assertRaises(ValueError):
                checker.canonicalize({'a': bad})

    def test_malformed_contract_files_report_errors_without_crashing(self):
        import tempfile, pathlib
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            (root / 'array.json').write_text('[1,2,3]\n', encoding='utf-8')
            (root / 'nan.json').write_text('{"a": NaN}\n', encoding='utf-8')
            for name in ['array.json', 'nan.json']:
                errors = checker.check_contract_file(root / name, SCHEMA)
                self.assertTrue(errors, name)

    def test_impossible_calendar_dates_fail(self):
        base = load_contract('valid-r1')
        for bad in ['2026-02-29T00:00:00Z', '2026-02-31T00:00:00Z', '2026-04-31T00:00:00Z']:
            mutated = dict(base)
            mutated['created_at'] = bad
            self.assertTrue(checker.validate_against_schema(SCHEMA, mutated), bad)
        leap = dict(base)
        leap['created_at'] = '2028-02-29T00:00:00Z'
        self.assertEqual(
            [e for e in checker.validate_against_schema(SCHEMA, leap) if 'created_at' in e],
            [],
        )


class SchemaValidation(unittest.TestCase):
    def test_valid_contracts_pass(self):
        for name in ['valid-r0', 'valid-r1', 'valid-r2', 'valid-r3']:
            errors = checker.validate_against_schema(SCHEMA, load_contract(name))
            self.assertEqual(errors, [], name)

    def test_every_required_field_is_enforced(self):
        base = load_contract('valid-r1')
        for field in SCHEMA['required']:
            mutated = copy.deepcopy(base)
            del mutated[field]
            errors = checker.validate_against_schema(SCHEMA, mutated)
            self.assertTrue(errors, f'missing {field} must fail')

    def test_additional_properties_fail_closed(self):
        mutated = load_contract('valid-r1')
        mutated['smuggled_field'] = True
        self.assertTrue(checker.validate_against_schema(SCHEMA, mutated))

    def test_pattern_and_enum_violations_fail(self):
        for field, value in [
            ('base_sha', 'not-a-sha'),
            ('task_id', 'task-lowercase'),
            ('effective_risk', 'R9'),
            ('contract_digest', 'short'),
        ]:
            mutated = load_contract('valid-r1')
            mutated[field] = value
            self.assertTrue(
                checker.validate_against_schema(SCHEMA, mutated), field
            )

    def test_risk_monotonicity_recorded_in_fixtures(self):
        order = {'R0': 0, 'R1': 1, 'R2': 2, 'R3': 3}
        for name in ['valid-r0', 'valid-r1', 'valid-r2', 'valid-r3']:
            contract = load_contract(name)
            self.assertGreaterEqual(
                order[contract['effective_risk']],
                order[contract['declared_risk']],
                name,
            )
            if contract['effective_risk'] != 'R0':
                self.assertTrue(contract['risk_reasons'], name)


if __name__ == '__main__':
    unittest.main(verbosity=1)
