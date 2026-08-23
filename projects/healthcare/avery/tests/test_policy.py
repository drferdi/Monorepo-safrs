"""Uji unit untuk avery_outbound.policy."""

import hashlib
import json
import unittest
from pathlib import Path

from avery_outbound import policy

FIXTURES = Path(__file__).resolve().parent / "fixtures"


class NormalizeTests(unittest.TestCase):
    def test_leading_zero_menjadi_62(self):
        self.assertEqual(policy.normalize("0812-3456-7890"), "6281234567890")

    def test_strip_non_digit(self):
        self.assertEqual(policy.normalize("+62 812 3456 7890"), "6281234567890")

    def test_terlalu_pendek_raise(self):
        with self.assertRaises(policy.PolicyError):
            policy.normalize("12345")

    def test_terlalu_panjang_raise(self):
        with self.assertRaises(policy.PolicyError):
            policy.normalize("1" * 20)


class CheckDraftTests(unittest.TestCase):
    def test_draft_kosong_ditolak(self):
        with self.assertRaises(policy.PolicyError):
            policy.check_draft("")

    def test_draft_hanya_spasi_ditolak(self):
        with self.assertRaises(policy.PolicyError):
            policy.check_draft("   \n  ")

    def test_scaffold_ditolak(self):
        fixture = json.loads((FIXTURES / "cron-agent-outbound.json").read_text(encoding="utf-8"))
        with self.assertRaises(policy.PolicyError):
            policy.check_draft(fixture["draft"])

    def test_menyapa_chief_ditolak(self):
        with self.assertRaises(policy.PolicyError):
            policy.check_draft("Baik, Chief. Sudah saya kerjakan.")

    def test_menyebut_chief_tanpa_menyapa_diterima(self):
        # Menyebut identitas boleh, menyapa tidak.
        policy.check_draft("Halo, saya asisten dari dr. Ferdi Iskandar.")

    def test_draft_wajar_diterima(self):
        policy.check_draft("Selamat pagi, ini pengingat jadwal kontrol Anda besok.")


class ValidateTargetTests(unittest.TestCase):
    def test_nomor_tunggal_diterima(self):
        self.assertEqual(policy.validate_target("0812-3456-7890"), "6281234567890")

    def test_grup_ditolak(self):
        with self.assertRaises(policy.PolicyError):
            policy.validate_target("120363412345678901@g.us")

    def test_lid_ditolak(self):
        with self.assertRaises(policy.PolicyError):
            policy.validate_target("12345678901234@lid")

    def test_daftar_koma_ditolak(self):
        with self.assertRaises(policy.PolicyError):
            policy.validate_target("6281234567890,6281234567891")

    def test_kosong_ditolak(self):
        with self.assertRaises(policy.PolicyError):
            policy.validate_target("")


class ReadAllowedTests(unittest.TestCase):
    def test_parse_baris_allowlist(self, tmp_path=None):
        import tempfile

        with tempfile.TemporaryDirectory() as d:
            env_path = Path(d) / ".env"
            env_path.write_text(
                "SOME_KEY=value\nWHATSAPP_ALLOWED_USERS=628000000001,628000000002\n",
                encoding="utf-8",
            )
            self.assertEqual(
                policy.read_allowed(env_path),
                ["628000000001", "628000000002"],
            )

    def test_file_tidak_ada_mengembalikan_kosong(self):
        self.assertEqual(policy.read_allowed(Path("berkas-tidak-ada.env")), [])


class DraftHashTests(unittest.TestCase):
    def test_hash_sesuai_sha256(self):
        text = "isi draf uji"
        expected = hashlib.sha256(text.encode("utf-8")).hexdigest()
        self.assertEqual(policy.draft_hash(text), expected)


if __name__ == "__main__":
    unittest.main()
