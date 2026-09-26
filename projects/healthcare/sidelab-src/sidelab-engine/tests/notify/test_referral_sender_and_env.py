import os
import unittest
from pathlib import Path
from unittest.mock import patch

from sidelab.notify import config as notify_config
from sidelab.notify.message_builder import format_referral

_ENGINE_DIR = Path(__file__).resolve().parents[2]
_SENDER_ENV = {
    "SIDELAB_REFERRAL_SENDER_NAME": "dr Uji Pengirim",
    "SIDELAB_REFERRAL_SENDER_FACILITY": "Puskesmas Contoh",
    "SIDELAB_REFERRAL_SENDER_CITY": "Kota Contoh",
}


class ReferralSenderFromEnvironmentTests(unittest.TestCase):
    def test_referral_names_the_sender_from_the_environment(self):
        with patch.dict(os.environ, _SENDER_ENV):
            text = format_referral("KRITERIA RUJUK: sesak berat", {"nama": "Pasien Uji"}, "S-1")

        self.assertIn("Saya dr Uji Pengirim dari Puskesmas Contoh Kota Contoh ijin", text)
        self.assertIn("Terima kasih.\ndr Uji Pengirim\nPuskesmas Contoh\nKota Contoh\n", text)

    def test_referral_without_sender_configuration_names_no_real_person(self):
        cleared = {name: "" for name in _SENDER_ENV}
        with patch.dict(os.environ, cleared):
            text = format_referral("KRITERIA RUJUK: sesak berat", {}, "S-2")

        self.assertNotIn("Ferdi", text)
        self.assertNotIn("Balowerti", text)
        self.assertIn("Saya - dari - - ijin", text)


class EngineEnvFileTests(unittest.TestCase):
    def test_notify_config_loads_only_the_engine_env_file(self):
        with patch.object(notify_config, "load_dotenv") as load_dotenv:
            notify_config.load_config()

        load_dotenv.assert_called_once_with(_ENGINE_DIR / ".env")

    def test_engine_env_file_sits_inside_the_capsule_engine_folder(self):
        self.assertEqual(notify_config.ENGINE_ENV_PATH.parent, _ENGINE_DIR)
        self.assertTrue((_ENGINE_DIR / "pyproject.toml").is_file())


if __name__ == "__main__":
    unittest.main()
