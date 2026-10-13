#!/usr/bin/env python3
"""SCOPE_AMEND digest rules. Uses in-memory events, never the live registry."""
import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    "check_lifecycle", ROOT / "tools" / "safrs" / "check_lifecycle.py"
)
LIFE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(LIFE)


def amend(previous, updated, *, previous_digest=None, updated_digest=None):
    return {
        "event_type": "SCOPE_AMEND",
        "transfer_operation_id": "TRANSFER-20261013-DEMO",
        "previous_scope_prefixes": previous,
        "previous_scope_digest": previous_digest or LIFE.scope_digest(previous),
        "scope_prefixes": updated,
        "scope_digest": updated_digest or LIFE.scope_digest(updated),
        "updated_scope_digest": updated_digest or LIFE.scope_digest(updated),
        "transfer_reason": "test",
        "authorized_actor": "gaffer",
    }


class ScopeAmendDigestTest(unittest.TestCase):
    def test_claim_without_amend_stays_effective(self):
        claim = {
            "event_type": "CLAIM",
            "scope_prefixes": ["a.txt", "b.txt"],
            "scope_digest": LIFE.scope_digest(["b.txt", "a.txt"]),
        }
        self.assertIs(LIFE.latest_scope_event([claim]), claim)
        self.assertEqual(LIFE.scope_amend_errors([claim]), [])

    def test_latest_amend_is_the_effective_scope(self):
        previous = ["a.txt", "b.txt"]
        updated = ["a.txt"]
        claim = {
            "event_type": "CLAIM",
            "scope_prefixes": previous,
            "scope_digest": LIFE.scope_digest(previous),
        }
        event = amend(previous, updated)
        self.assertEqual(LIFE.scope_amend_errors([claim, event]), [])
        self.assertEqual(
            LIFE.latest_scope_event([claim, event])["scope_digest"],
            LIFE.scope_digest(updated),
        )

    def test_forged_digest_is_rejected(self):
        previous = ["a.txt", "b.txt"]
        claim = {
            "event_type": "CLAIM",
            "scope_prefixes": previous,
            "scope_digest": LIFE.scope_digest(previous),
        }
        forged = amend(previous, ["a.txt"], updated_digest="0" * 64)
        errors = LIFE.scope_amend_errors([claim, forged])
        self.assertTrue(any("digest" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
