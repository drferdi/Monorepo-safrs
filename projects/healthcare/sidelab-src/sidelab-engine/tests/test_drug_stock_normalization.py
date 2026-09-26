# Architected and built by codieverse+.
import unittest

from sidelab.drug_stock import DRUG_STOCK_MATCH


class DrugStokMatchBuildTests(unittest.TestCase):
    """_DRUG_STOK_MATCH harus dibangun dari DB drug_map saat startup."""

    def test_drug_stok_match_exists(self):
        self.assertIsInstance(DRUG_STOCK_MATCH, dict)

    def test_generik_name_in_map(self):
        """Nama generik (lowercase) harus jadi key."""
        self.assertIn("amoxicillin", DRUG_STOCK_MATCH)

    def test_alias_in_map(self):
        """Alias juga harus jadi key yang valid."""
        # Amoksisilin adalah alias dari Amoxicillin
        self.assertIn("amoksisilin", DRUG_STOCK_MATCH)

    def test_stok_match_patterns_are_lowercase(self):
        """Semua pattern dalam list harus sudah lowercase."""
        for key, patterns in DRUG_STOCK_MATCH.items():
            for p in patterns:
                self.assertEqual(p, p.lower(), f"Pattern '{p}' untuk key '{key}' bukan lowercase")

    def test_known_stok_patterns_correct(self):
        """Amoxicillin harus punya patterns dari stok_match di drug_map."""
        patterns = DRUG_STOCK_MATCH.get("amoxicillin", [])
        self.assertTrue(len(patterns) > 0, "amoxicillin harus punya stok_match patterns")
        # Patterns harus mengandung salah satu: amoksilin, amoxicillin, amoksisilin
        lowered = [p.lower() for p in patterns]
        self.assertTrue(
            any("amox" in p or "amoks" in p for p in lowered),
            f"Expected amox*/amoks* pattern, got {lowered}",
        )

    def test_metformin_in_map(self):
        self.assertIn("metformin", DRUG_STOCK_MATCH)
        patterns = DRUG_STOCK_MATCH["metformin"]
        self.assertIn("metformin", patterns)

    def test_alias_maps_to_same_patterns(self):
        """Alias dan nama generik harus punya patterns yang sama."""
        generik_patterns = DRUG_STOCK_MATCH.get("paracetamol", [])
        alias_patterns = DRUG_STOCK_MATCH.get("parasetamol", [])
        self.assertEqual(set(generik_patterns), set(alias_patterns))


class DrugStokMatchPrecisionTests(unittest.TestCase):
    """Matching berbasis stok_match harus lebih presisi dari prefix-6-char."""

    def test_amoxicillin_does_not_match_ampicillin(self):
        """'amoxicillin' prefix 'amoxic' tidak boleh match 'ampicillin'."""
        # Prefix "amoxic" tidak ada di "ampisilin"
        # Test ini memverifikasi bahwa stok_match patterns spesifik
        amox_patterns = DRUG_STOCK_MATCH.get("amoxicillin", [])
        stok_name = "ampisilin"
        matched = any(stok_name.startswith(p) for p in amox_patterns)
        self.assertFalse(matched, f"amoxicillin salah match ampisilin via patterns {amox_patterns}")

    def test_startswith_beats_substring(self):
        """Pattern startswith lebih tepat dari substring 'in'."""
        # "moxi" prefix dari stok_match tidak boleh match "ciprofloksasin" (substring lain)
        # Verifikasi ciprofloxacin punya patterns sendiri yang tidak overlap
        cipro_patterns = DRUG_STOCK_MATCH.get("ciprofloxacin", [])
        if cipro_patterns:
            # "amoksilin".startswith(cipro_pattern) harus False
            amox_stok = "amoksilin"
            for p in cipro_patterns:
                self.assertFalse(amox_stok.startswith(p))


if __name__ == "__main__":
    unittest.main()
