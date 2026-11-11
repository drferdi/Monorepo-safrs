# Architected and built by codieverse+.
import unittest

from sidelab.icd.indexes import find_by_icd


class IcdIndexTests(unittest.TestCase):
    """Test pre-computed ICD lookup indexes.

    Setiap test menyuntik entri ke index dict langsung (bukan lewat DB)
    sehingga tidak bergantung pada data fixture di disk.
    """

    def setUp(self):
        self.full_exact: dict = {}
        self.full_prefix: dict = {}
        self.d144_exact: dict = {}
        self.d144_prefix: dict = {}

    def tearDown(self):
        self.full_exact.clear()
        self.full_prefix.clear()
        self.d144_exact.clear()
        self.d144_prefix.clear()

    # --- _find_full_by_icd ---

    def test_full_exact_match(self):
        self.full_exact["J06"] = {"icd10": "J06", "nama": "ISPA"}
        result = find_by_icd("J06", self.full_exact, self.full_prefix)
        self.assertEqual(result["nama"], "ISPA")

    def test_full_prefix_fallback_when_query_is_child(self):
        # stored "J06", query "J06.9" → prefix "J06"
        self.full_prefix["J06"] = {"icd10": "J06", "nama": "ISPA"}
        result = find_by_icd("J06.9", self.full_exact, self.full_prefix)
        self.assertEqual(result["nama"], "ISPA")

    def test_full_prefix_fallback_when_query_is_parent(self):
        # stored "J06.9", query "J06" → prefix "J06" matches stored prefix
        self.full_prefix["J06"] = {"icd10": "J06.9", "nama": "ISPA lanjut"}
        result = find_by_icd("J06", self.full_exact, self.full_prefix)
        self.assertEqual(result["nama"], "ISPA lanjut")

    def test_full_empty_input_returns_none(self):
        self.assertIsNone(find_by_icd("", self.full_exact, self.full_prefix))
        self.assertIsNone(find_by_icd(None, self.full_exact, self.full_prefix))

    def test_full_not_found_returns_none(self):
        self.assertIsNone(find_by_icd("ZZZ", self.full_exact, self.full_prefix))

    def test_full_case_insensitive(self):
        self.full_exact["J06"] = {"icd10": "J06", "nama": "ISPA"}
        self.assertEqual(
            find_by_icd("j06", self.full_exact, self.full_prefix)["nama"],
            "ISPA",
        )

    # --- _find_144_by_icd ---

    def test_d144_exact_match(self):
        self.d144_exact["A09"] = {"icd10": "A09", "name": "Diare"}
        result = find_by_icd("A09", self.d144_exact, self.d144_prefix)
        self.assertEqual(result["name"], "Diare")

    def test_d144_prefix_fallback(self):
        self.d144_prefix["A09"] = {"icd10": "A09.0", "name": "Diare akut"}
        result = find_by_icd("A09.9", self.d144_exact, self.d144_prefix)
        self.assertEqual(result["name"], "Diare akut")

    def test_d144_empty_input_returns_none(self):
        self.assertIsNone(find_by_icd("", self.d144_exact, self.d144_prefix))
        self.assertIsNone(find_by_icd(None, self.d144_exact, self.d144_prefix))

    def test_d144_not_found_returns_none(self):
        self.assertIsNone(find_by_icd("ZZZ", self.d144_exact, self.d144_prefix))


if __name__ == "__main__":
    unittest.main()
