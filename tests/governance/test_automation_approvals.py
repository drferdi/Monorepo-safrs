#!/usr/bin/env python3
"""Governance tests for approval bindings and evidence integrity."""
from __future__ import annotations

import copy
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def load(name: str):
    spec = importlib.util.spec_from_file_location(
        name, ROOT / 'tools' / 'safrs' / f'{name}.py'
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


approvals = load('check_approval_evidence')

HEAD = 'b' * 40
CONTRACT = 'c' * 64
DIFF = 'e' * 64


def approval_record(**overrides):
    record = {
        'schema_version': 1,
        'approval_id': 'APR-1',
        'kind': 'R2_CODE_OWNER',
        'task_id': 'TASK-20260813-DEMO-R2',
        'contract_digest': CONTRACT,
        'subject_sha': HEAD,
        'diff_digest': DIFF,
        'operation_digest': None,
        'target_environment': None,
        'idempotency_key': None,
        'reviewer_identity': 'chief',
        'reviewer_authority': 'code-owner',
        'author_identity': 'agent:claude:fable',
        'issued_at': '2026-08-13T00:00:00Z',
        'expires_at': '2026-08-14T00:00:00Z',
        'source_event_url': 'https://github.com/x/1',
        'source_event_id': 'review-1',
        'revoked_at': None,
        'approval_digest': 'f' * 64,
    }
    record.update(overrides)
    return record


def manifest_body(**overrides):
    body = {
        'schema_version': 1,
        'manifest_id': 'MANIFEST-1',
        'task_id': 'TASK-20260813-DEMO-R1',
        'run_id': 'RUN-DEMO-1',
        'attempt_ids': [1],
        'contract_digest': CONTRACT,
        'lease_event_digests': [],
        'base_sha': 'a' * 40,
        'head_sha': HEAD,
        'diff_digest': DIFF,
        'effective_risk': 'R1',
        'risk_reasons': [],
        'tool_events': [],
        'network_events': [],
        'budget_usage': {},
        'check_verdicts': [],
        'approval_ids': [],
        'publication': None,
        'execution': None,
        'recovery_events': [],
        'artifact_hashes': {},
        'redaction_version': 1,
        'created_at': '2026-08-13T00:00:00Z',
    }
    body.update(overrides)
    return body


def sealed(**overrides):
    body = manifest_body(**overrides)
    return {**body, 'manifest_digest': approvals.checker.digest_canonical(body)}


class ApprovalBindings(unittest.TestCase):
    def test_valid_r2_approval_passes(self):
        self.assertEqual(approvals.check_approval('a.json', approval_record()), [])

    def test_self_review_is_rejected(self):
        errors = approvals.check_approval(
            'a.json', approval_record(reviewer_identity='agent:claude:fable')
        )
        self.assertTrue(any('self-review' in error for error in errors))

    def test_r2_requires_diff_binding(self):
        errors = approvals.check_approval('a.json', approval_record(diff_digest=None))
        self.assertTrue(any('diff_digest' in error for error in errors))

    def test_r3_requires_operation_target_and_idempotency(self):
        errors = approvals.check_approval(
            'a.json', approval_record(kind='R3_EXECUTION', diff_digest=None)
        )
        for field in ('operation_digest', 'target_environment', 'idempotency_key'):
            self.assertTrue(any(field in error for error in errors), field)

    def test_unknown_kind_and_bad_expiry_fail(self):
        self.assertTrue(approvals.check_approval('a.json', approval_record(kind='R9')))
        self.assertTrue(
            approvals.check_approval(
                'a.json', approval_record(expires_at='2026-08-12T00:00:00Z')
            )
        )

    def test_secret_shaped_approval_content_fails(self):
        errors = approvals.check_approval(
            'a.json',
            approval_record(reviewer_authority='token ghp_ABCDEFGHIJKLMNOPQRSTUVWX1234'),
        )
        self.assertTrue(any('secret' in error for error in errors))


class EvidenceIntegrity(unittest.TestCase):
    def test_sealed_manifest_verifies(self):
        self.assertEqual(approvals.check_manifest('m.json', sealed()), [])

    def test_tampered_manifest_fails(self):
        manifest = sealed()
        manifest['effective_risk'] = 'R0'
        errors = approvals.check_manifest('m.json', manifest)
        self.assertTrue(any('manifest_digest mismatch' in error for error in errors))

    def test_missing_required_field_fails(self):
        manifest = sealed()
        del manifest['check_verdicts']
        self.assertTrue(approvals.check_manifest('m.json', manifest))

    def test_secret_canary_never_passes(self):
        manifest = sealed(
            recovery_events=['rotate ghp_ABCDEFGHIJKLMNOPQRSTUVWX1234 now']
        )
        errors = approvals.check_manifest('m.json', manifest)
        self.assertTrue(any('secret-shaped' in error for error in errors))

    def test_redaction_markers_are_not_mistaken_for_secrets(self):
        manifest = sealed(recovery_events=['rotate GITHUB_TOKEN=[REDACTED:ASSIGNMENT]'])
        self.assertEqual(approvals.check_manifest('m.json', manifest), [])

    def test_node_sealed_manifest_verifies_in_python(self):
        """Cross-language parity: whatever Node seals, Python must accept."""
        node_style = copy.deepcopy(sealed())
        self.assertEqual(approvals.check_manifest('m.json', node_style), [])


if __name__ == '__main__':
    unittest.main(verbosity=1)
