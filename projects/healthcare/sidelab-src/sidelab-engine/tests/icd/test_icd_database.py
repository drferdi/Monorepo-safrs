# Architected and built by codieverse+.
import json
import tempfile
import unittest
from pathlib import Path

import sidelab.icd.database as icd_db


class IcdDatabaseTests(unittest.TestCase):
    def setUp(self):
        self._orig_data_file = icd_db._DATA_FILE
        self._orig_codes_by_key = icd_db._codes_by_key
        self._orig_all_entries = icd_db._all_entries
        self._orig_metadata = icd_db._metadata

    def tearDown(self):
        icd_db._DATA_FILE = self._orig_data_file
        icd_db._codes_by_key = self._orig_codes_by_key
        icd_db._all_entries = self._orig_all_entries
        icd_db._metadata = self._orig_metadata

    def test_metadata_handles_entry_without_code_gracefully(self):
        temp_path = Path(tempfile.gettempdir()) / "icd_bad_fixture.json"
        temp_path.write_text(
            json.dumps({"codes": [{"name_id": "broken entry"}]}), encoding="utf-8"
        )

        icd_db._DATA_FILE = temp_path
        icd_db._codes_by_key = None
        icd_db._all_entries = None
        icd_db._metadata = None

        meta = icd_db.metadata()

        self.assertEqual(meta.get("invalid_entries"), 1)
        self.assertEqual(icd_db.all_entries(), [{"name_id": "broken entry"}])
        self.assertIsNone(icd_db.get_by_code("I10"))


    def test_concurrent_load_is_safe(self):
        import threading
        import tempfile
        import json
        from pathlib import Path

        fixture = [{"code": "J06", "name_id": "ISPA", "name_en": "URTI"}]
        temp_path = Path(tempfile.gettempdir()) / "icd_concurrent_fixture.json"
        temp_path.write_text(json.dumps({"codes": fixture}), encoding="utf-8")

        icd_db._DATA_FILE = temp_path
        icd_db._codes_by_key = None
        icd_db._all_entries = None
        icd_db._metadata = None

        errors: list[str] = []

        def load():
            try:
                icd_db._load()
            except Exception as exc:
                errors.append(str(exc))

        threads = [threading.Thread(target=load) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertFalse(errors, f"Thread errors: {errors}")
        self.assertIsNotNone(icd_db._codes_by_key)
        self.assertIn("J06", icd_db._codes_by_key)


if __name__ == "__main__":
    unittest.main()
