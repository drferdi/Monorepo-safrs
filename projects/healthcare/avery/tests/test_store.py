"""Uji unit untuk avery_outbound.store."""

import json
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from avery_outbound import models, store


class FakeClock:
    def __init__(self, start):
        self.current = start

    def __call__(self):
        return self.current

    def advance(self, **kwargs):
        self.current = self.current + timedelta(**kwargs)


class StoreTestBase(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name) / "avery-outbound"
        self.clock = FakeClock(datetime(2026, 8, 23, 8, 0, 0, tzinfo=timezone.utc))
        self.store = store.Store(root=self.root, now=self.clock)

    def tearDown(self):
        self._tmp.cleanup()


class CreateTests(StoreTestBase):
    def test_create_menghasilkan_pending(self):
        req = self.store.create(
            target="6281234567890",
            draft_sha256="a" * 64,
            draft_path="draft.txt",
            ttl_minutes=15,
        )
        self.assertEqual(req.status, "pending")
        self.assertEqual(req.target, "6281234567890")
        self.assertTrue(req.id)

    def test_file_ditulis_di_bawah_root(self):
        req = self.store.create(
            target="6281234567890", draft_sha256="a" * 64, draft_path="draft.txt"
        )
        path = self.root / "pending" / f"{req.id}.json"
        self.assertTrue(path.exists())
        data = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(data["status"], "pending")

    def test_atomic_write_tidak_tersisa_file_sementara(self):
        self.store.create(
            target="6281234567890", draft_sha256="a" * 64, draft_path="draft.txt"
        )
        sisa = list((self.root / "pending").glob("*.tmp*"))
        self.assertEqual(sisa, [])


class ApproveCancelTests(StoreTestBase):
    def test_approve_mengubah_status(self):
        req = self.store.create(
            target="6281234567890", draft_sha256="a" * 64, draft_path="draft.txt"
        )
        approved = self.store.approve(req.id)
        self.assertEqual(approved.status, "approved")

    def test_approve_setelah_kadaluarsa_raise(self):
        req = self.store.create(
            target="6281234567890",
            draft_sha256="a" * 64,
            draft_path="draft.txt",
            ttl_minutes=15,
        )
        self.clock.advance(minutes=15, seconds=1)
        with self.assertRaises(store.StoreError):
            self.store.approve(req.id)

    def test_cancel_mengubah_status(self):
        req = self.store.create(
            target="6281234567890", draft_sha256="a" * 64, draft_path="draft.txt"
        )
        cancelled = self.store.cancel(req.id)
        self.assertEqual(cancelled.status, "cancelled")


class MarkSentTests(StoreTestBase):
    def test_mark_sent_hanya_dari_approved(self):
        req = self.store.create(
            target="6281234567890", draft_sha256="a" * 64, draft_path="draft.txt"
        )
        with self.assertRaises(store.StoreError):
            self.store.mark_sent(req.id)

    def test_mark_sent_single_use(self):
        req = self.store.create(
            target="6281234567890", draft_sha256="a" * 64, draft_path="draft.txt"
        )
        self.store.approve(req.id)
        sent = self.store.mark_sent(req.id)
        self.assertEqual(sent.status, "sent")
        with self.assertRaises(store.StoreError):
            self.store.mark_sent(req.id)


class ExpireStaleTests(StoreTestBase):
    def test_expire_stale_menandai_expired(self):
        req = self.store.create(
            target="6281234567890",
            draft_sha256="a" * 64,
            draft_path="draft.txt",
            ttl_minutes=15,
        )
        self.clock.advance(minutes=16)
        self.store.expire_stale()
        refreshed = self.store.get(req.id)
        self.assertEqual(refreshed.status, "expired")


class LedgerTests(StoreTestBase):
    def test_ledger_tidak_memuat_isi_draft(self):
        req = self.store.create(
            target="6281234567890", draft_sha256="a" * 64, draft_path="draft.txt"
        )
        self.store.approve(req.id)
        self.store.mark_sent(req.id)
        ledger_path = self.root / "ledger.jsonl"
        self.assertTrue(ledger_path.exists())
        lines = ledger_path.read_text(encoding="utf-8").strip().splitlines()
        self.assertGreaterEqual(len(lines), 3)
        for line in lines:
            entry = json.loads(line)
            joined = json.dumps(entry)
            self.assertNotIn("isi draf", joined)
            self.assertIn("request_id", entry)

    def test_append_ledger_manual(self):
        entry = models.LedgerEntry(
            ts=self.clock().isoformat(),
            request_id="xyz",
            event="note",
            detail="test",
        )
        self.store.append_ledger(entry)
        ledger_path = self.root / "ledger.jsonl"
        lines = ledger_path.read_text(encoding="utf-8").strip().splitlines()
        self.assertEqual(len(lines), 1)


if __name__ == "__main__":
    unittest.main()


class DefaultRootTests(unittest.TestCase):
    """Regresi: HERMES_HOME bisa akar .hermes ATAU langsung direktori profil."""

    def _with_env(self, home, profile=None):
        import os
        from avery_outbound.store import default_root
        old = {k: os.environ.get(k) for k in ("HERMES_HOME", "HERMES_PROFILE")}
        try:
            os.environ["HERMES_HOME"] = home
            if profile is None:
                os.environ.pop("HERMES_PROFILE", None)
            else:
                os.environ["HERMES_PROFILE"] = profile
            return default_root()
        finally:
            for k, v in old.items():
                if v is None:
                    os.environ.pop(k, None)
                else:
                    os.environ[k] = v

    def test_hermes_home_akar(self):
        root = self._with_env(str(Path("C:/u/.hermes")))
        self.assertEqual(
            root.parts[-5:],
            (".hermes", "profiles", "avery", "pending", "avery-outbound"),
        )

    def test_hermes_home_sudah_direktori_profil(self):
        root = self._with_env(str(Path("C:/u/.hermes/profiles/avery")))
        self.assertEqual(root.parts.count("avery"), 1)
        self.assertEqual(
            root.parts[-5:],
            (".hermes", "profiles", "avery", "pending", "avery-outbound"),
        )
