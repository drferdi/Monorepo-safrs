# Architected and built by codieverse+.
import unittest

from sidelab.icd.indexes import get_pharma_detail


class PharmaDetailTests(unittest.TestCase):
    def test_empty_string_returns_none(self):
        self.assertIsNone(get_pharma_detail("", {}))

    def test_none_input_returns_none(self):
        self.assertIsNone(get_pharma_detail(None, {}))

    def test_unknown_icd_returns_none(self):
        self.assertIsNone(get_pharma_detail("ZZZ", {}))

    def test_uses_d144_icd_prefix_dict(self):
        fake_pharma = {"first_line": [{"drug": "amoxicillin"}]}
        index = {"J06": {"icd10": "J06", "pharmacotherapy": fake_pharma}}
        result = get_pharma_detail("J06", index)
        self.assertEqual(result, fake_pharma)

    def test_lookup_is_case_insensitive(self):
        fake_pharma = {"first_line": []}
        index = {"J06": {"icd10": "J06", "pharmacotherapy": fake_pharma}}
        result = get_pharma_detail("j06", index)
        self.assertEqual(result, fake_pharma)

    def test_returns_none_when_entry_has_no_pharmacotherapy(self):
        index = {"J06": {"icd10": "J06"}}
        result = get_pharma_detail("J06", index)
        self.assertIsNone(result)


if __name__ == "__main__":
    unittest.main()
