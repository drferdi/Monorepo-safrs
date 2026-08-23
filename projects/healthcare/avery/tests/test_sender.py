"""Uji unit untuk avery_outbound.sender."""

import hashlib
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from avery_outbound import policy, sender, store


class FakeClock:
    def __init__(self, start):
        self.current = start

    def __call__(self):
        return self.current

    def advance(self, **kwargs):
        self.current = self.current + timedelta(**kwargs)


class SenderTestBase(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name) / "avery-outbound"
        self.draft_path = Path(self._tmp.name) / "draft.txt"
        self.draft_text = "Selamat pagi, ini pengingat jadwal kontrol Anda besok."
        self.draft_path.write_text(self.draft_text, encoding="utf-8")
        self.draft_sha256 = hashlib.sha256(self.draft_text.encode("utf-8")).hexdigest()
        self.clock = FakeClock(datetime(2026, 8, 23, 8, 0, 0, tzinfo=timezone.utc))
        self.store = store.Store(root=self.root, now=self.clock)

    def tearDown(self):
        self._tmp.cleanup()


class BuildCommandTests(SenderTestBase):
    def test_argv_persis(self):
        req = self.store.create(
            target="6281234567890",
            draft_sha256=self.draft_sha256,
            draft_path=str(self.draft_path),
        )
        argv = sender.build_command(req, profile="avery")
        self.assertEqual(
            argv,
            [
                "hermes",
                "-p",
                "avery",
                "send",
                "--to",
                "whatsapp:6281234567890",
                "--file",
                str(self.draft_path),
            ],
        )

    def test_hash_mismatch_raise(self):
        req = self.store.create(
            target="6281234567890",
            draft_sha256="0" * 64,
            draft_path=str(self.draft_path),
        )
        with self.assertRaises(policy.PolicyError):
            sender.build_command(req)


class PrepareSendTests(SenderTestBase):
    def test_prepare_send_sukses(self):
        req = self.store.create(
            target="6281234567890",
            draft_sha256=self.draft_sha256,
            draft_path=str(self.draft_path),
        )
        self.store.approve(req.id)
        argv = sender.prepare_send(self.store, req.id)
        self.assertIn("whatsapp:6281234567890", argv)
        refreshed = self.store.get(req.id)
        self.assertEqual(refreshed.status, "sent")

    def test_prepare_send_kedua_kali_raise(self):
        req = self.store.create(
            target="6281234567890",
            draft_sha256=self.draft_sha256,
            draft_path=str(self.draft_path),
        )
        self.store.approve(req.id)
        sender.prepare_send(self.store, req.id)
        with self.assertRaises(store.StoreError):
            sender.prepare_send(self.store, req.id)

    def test_prepare_send_belum_approved_raise(self):
        req = self.store.create(
            target="6281234567890",
            draft_sha256=self.draft_sha256,
            draft_path=str(self.draft_path),
        )
        with self.assertRaises(store.StoreError):
            sender.prepare_send(self.store, req.id)


if __name__ == "__main__":
    unittest.main()
