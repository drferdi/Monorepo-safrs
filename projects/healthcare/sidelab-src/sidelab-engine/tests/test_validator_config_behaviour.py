# Architected and built by codieverse+.
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import sidelab.validator_config as validator_config

_DEFAULTS = {
    "min_verified_therapies": 3,
    "max_therapies_before_overpolypharmacy": 5,
    "kausal_primer_kelas": [],
    "kausal_primer_atc": [],
    "justifikasi_section_keyword": "JUSTIFIKASI KLINIS",
    "accept_if_two_kausal_plus_justification": False,
    "panel_emitted_when_justifikasi_accepted": "justifikasi_short_floor",
}

# Nilai sintetis, sengaja berbeda dari data/pharma_validator_config.json.
_CONFIG = {
    "_meta": {"schema_version": "test"},
    "min_verified_therapies": 4,
    "max_therapies_before_overpolypharmacy": 6,
    "kausal_primer_kelas": ["Antipiretik", "Antibakteri"],
    "kausal_primer_atc": ["N02B", "J01"],
    "justifikasi_section_keyword": "ALASAN KLINIS",
    "accept_if_two_kausal_plus_justification": True,
    "panel_emitted_when_justifikasi_accepted": "panel_uji",
}


class ValidatorConfigLoaderTests(unittest.TestCase):
    def setUp(self):
        saved = (validator_config._CACHE, validator_config._LAST_PATH)
        self.addCleanup(self._restore_cache, saved)
        validator_config.reset_cache()

        env = mock.patch.dict(os.environ)
        env.start()
        self.addCleanup(env.stop)
        for key in [k for k in os.environ if k.startswith("SIDELAB_VALIDATOR_")]:
            del os.environ[key]

        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.root = Path(self._tmp.name)

    @staticmethod
    def _restore_cache(saved):
        validator_config._CACHE, validator_config._LAST_PATH = saved

    def _write(self, payload, name="cfg.json"):
        path = self.root / name
        text = payload if isinstance(payload, str) else json.dumps(payload)
        path.write_text(text, encoding="utf-8")
        return path

    def test_missing_file_yields_compiled_defaults(self):
        self.assertEqual(validator_config.load_validator_config(self.root / "absent.json"), _DEFAULTS)

    def test_malformed_json_yields_compiled_defaults(self):
        self.assertEqual(validator_config.load_validator_config(self._write("{broken")), _DEFAULTS)

    def test_non_object_json_yields_compiled_defaults(self):
        self.assertEqual(validator_config.load_validator_config(self._write(["x"])), _DEFAULTS)

    def test_file_values_replace_defaults_and_meta_is_dropped(self):
        loaded = validator_config.load_validator_config(self._write(_CONFIG))

        expected = {k: v for k, v in _CONFIG.items() if k != "_meta"}
        self.assertEqual(loaded, expected)

    def test_keys_missing_from_file_fall_back_to_defaults(self):
        loaded = validator_config.load_validator_config(self._write({"min_verified_therapies": 2}))

        self.assertEqual(loaded, {**_DEFAULTS, "min_verified_therapies": 2})

    def test_numeric_strings_in_file_are_converted_to_int(self):
        loaded = validator_config.load_validator_config(
            self._write({"min_verified_therapies": "4", "max_therapies_before_overpolypharmacy": "7"})
        )

        self.assertEqual(loaded["min_verified_therapies"], 4)
        self.assertEqual(loaded["max_therapies_before_overpolypharmacy"], 7)

    def test_environment_overrides_int_and_string_knobs(self):
        os.environ["SIDELAB_VALIDATOR_MIN_VERIFIED_THERAPIES"] = "2"
        os.environ["SIDELAB_VALIDATOR_JUSTIFIKASI_SECTION_KEYWORD"] = "DASAR KLINIS"

        loaded = validator_config.load_validator_config(self._write(_CONFIG))

        self.assertEqual(loaded["min_verified_therapies"], 2)
        self.assertEqual(loaded["justifikasi_section_keyword"], "DASAR KLINIS")
        self.assertEqual(loaded["max_therapies_before_overpolypharmacy"], 6)

    def test_bad_integer_override_keeps_file_value(self):
        os.environ["SIDELAB_VALIDATOR_MIN_VERIFIED_THERAPIES"] = "tiga"

        loaded = validator_config.load_validator_config(self._write(_CONFIG))

        self.assertEqual(loaded["min_verified_therapies"], 4)

    def test_empty_override_is_ignored(self):
        os.environ["SIDELAB_VALIDATOR_PANEL_EMITTED_WHEN_JUSTIFIKASI_ACCEPTED"] = ""

        loaded = validator_config.load_validator_config(self._write(_CONFIG))

        self.assertEqual(loaded["panel_emitted_when_justifikasi_accepted"], "panel_uji")

    def test_boolean_override_accepts_truthy_words_only(self):
        path = self._write({**_CONFIG, "accept_if_two_kausal_plus_justification": False})
        for raw, expected in (("1", True), ("TRUE", True), ("yes", True), ("on", True), ("0", False), ("no", False)):
            with self.subTest(raw=raw):
                os.environ["SIDELAB_VALIDATOR_ACCEPT_IF_TWO_KAUSAL_PLUS_JUSTIFICATION"] = raw
                loaded = validator_config.load_validator_config(path)
                self.assertIs(loaded["accept_if_two_kausal_plus_justification"], expected)

    def test_list_override_splits_on_pipe_and_drops_blank_items(self):
        os.environ["SIDELAB_VALIDATOR_KAUSAL_PRIMER_ATC"] = "M01A| R05 | |A02B"

        loaded = validator_config.load_validator_config(self._write(_CONFIG))

        self.assertEqual(loaded["kausal_primer_atc"], ["M01A", "R05", "A02B"])
        self.assertEqual(loaded["kausal_primer_kelas"], ["Antipiretik", "Antibakteri"])

    def test_float_knob_override_is_parsed_or_kept_on_error(self):
        base = {**_DEFAULTS, "ambang_uji": 0.5}

        os.environ["SIDELAB_VALIDATOR_AMBANG_UJI"] = "0.75"
        self.assertEqual(validator_config._apply_env_overrides(base)["ambang_uji"], 0.75)
        os.environ["SIDELAB_VALIDATOR_AMBANG_UJI"] = "tinggi"
        self.assertEqual(validator_config._apply_env_overrides(base)["ambang_uji"], 0.5)

    def test_env_override_does_not_mutate_the_input_lists(self):
        os.environ["SIDELAB_VALIDATOR_KAUSAL_PRIMER_KELAS"] = "Antihistamin sistemik"
        original = {**_DEFAULTS, "kausal_primer_kelas": ["Antipiretik"], "kausal_primer_atc": ["J01"]}

        result = validator_config._apply_env_overrides(original)

        self.assertEqual(result["kausal_primer_kelas"], ["Antihistamin sistemik"])
        self.assertEqual(original["kausal_primer_kelas"], ["Antipiretik"])
        self.assertIsNot(result["kausal_primer_atc"], original["kausal_primer_atc"])

    def test_default_path_is_cached_until_reset(self):
        path = self._write(_CONFIG)
        with mock.patch.object(validator_config, "_DEFAULT_PATH", path):
            first = validator_config.load_validator_config()
            self._write({"min_verified_therapies": 9})
            cached = validator_config.load_validator_config()
            validator_config.reset_cache()
            reread = validator_config.load_validator_config()

        self.assertEqual(first["min_verified_therapies"], 4)
        self.assertIs(cached, first)
        self.assertEqual(reread["min_verified_therapies"], 9)

    def test_explicit_path_bypasses_cached_default(self):
        with mock.patch.object(validator_config, "_DEFAULT_PATH", self._write(_CONFIG)):
            validator_config.load_validator_config()

            loaded = validator_config.load_validator_config(
                self._write({"min_verified_therapies": 8}, name="other.json")
            )

        self.assertEqual(loaded["min_verified_therapies"], 8)


if __name__ == "__main__":
    unittest.main()
