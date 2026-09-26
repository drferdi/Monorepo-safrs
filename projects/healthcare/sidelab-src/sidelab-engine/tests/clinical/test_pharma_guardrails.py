# Architected and built by codieverse+.
import importlib.util
import unittest
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "sidelab_app", Path(__file__).resolve().parent.parent.parent / "sidelab.py"
)
m = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(m)


class PharmaGuardrailTests(unittest.TestCase):
    """Tests for VAL-SAFETY-007: noninfectious cases suppress irrelevant antibiotics."""

    def test_noninfectious_msk_filters_irrelevant_antibiotics_and_backfills_rational_options(
        self,
    ):
        """Osteoarthritis case: antibiotics removed, supportive backfilled."""
        response = """DIAGNOSIS KERJA:
M19.9 Osteoartritis

FARMAKOLOGI:
Paracetamol 3x500mg PO 5 hari PC
Amoxicilin-Klavulanat 625 mg PO 3x1 5 hari PC
Metronidazol 1x500 mg PO 5 hari PC

EDUKASI PASIEN:
-"""

        formatted = m._format_farmakologi_tree(response)

        self.assertIn("Paracetamol 3x500mg PO 5 hari PC", formatted)
        self.assertNotIn("Amoxicilin-Klavulanat", formatted)
        self.assertNotIn("Metronidazol", formatted)
        self.assertIn("Ibuprofen 3x400 mg PO 5 hari PC", formatted)
        self.assertIn("Vitamin B kompleks 1x1 PO 5 hari PC", formatted)

    def test_mialgia_filters_irrelevant_antibiotics(self):
        """Myalgia case: antibiotics filtered, supportive options favored."""
        response = """DIAGNOSIS KERJA:
M79.1 Mialgia

FARMAKOLOGI:
Amoxicilin 500mg PO 3x1 7 hari PC
Cotrimoxazole 960mg PO 2x1 5 hari PC

EDUKASI PASIEN:
-"""

        formatted = m._format_farmakologi_tree(response)

        self.assertNotIn("Amoxicilin", formatted)
        self.assertNotIn("Cotrimoxazole", formatted)
        # Supportive backfill should include Ibuprofen and Vitamin B kompleks
        self.assertIn("Ibuprofen", formatted)
        self.assertIn("Vitamin B kompleks", formatted)

    def test_low_back_pain_filters_antibiotics(self):
        """Low back pain (noninfectious): antibiotics suppressed."""
        response = """DIAGNOSIS KERJA:
M54.5 Nyeri Punggung Bawah / Low Back Pain

FARMAKOLOGI:
Paracetamol 500mg PO 3x1 5 hari PC
Amoxicilin-Klavulanat 625 mg PO 3x1 5 hari PC

EDUKASI PASIEN:
-"""

        formatted = m._format_farmakologi_tree(response)

        self.assertIn("Paracetamol", formatted)
        self.assertNotIn("Amoxicilin-Klavulanat", formatted)
        self.assertIn("Ibuprofen", formatted)
        self.assertIn("Vitamin B kompleks", formatted)

    def test_infectious_case_preserves_antibiotics(self):
        """Pneumonia (infectious): antibiotics should NOT be filtered."""
        response = """DIAGNOSIS KERJA:
J18.9 Pneumonia, tidak spesifik

FARMAKOLOGI:
Amoxicilin 500mg PO 3x1 7 hari PC
Paracetamol 500mg PO 3x1 5 hari PC

EDUKASI PASIEN:
-"""

        formatted = m._format_farmakologi_tree(response)

        # Infectious case — antibiotics should remain
        self.assertIn("Amoxicilin", formatted)
        self.assertIn("Paracetamol", formatted)

    def test_noninfectious_msk_only_supportive_drugs_passes_through(self):
        """Noninfectious MSK with only supportive drugs: no unnecessary additions."""
        response = """DIAGNOSIS KERJA:
M19.9 Osteoartritis

FARMAKOLOGI:
Paracetamol 500mg PO 3x1 5 hari PC
Ibuprofen 400mg PO 3x1 5 hari PC
Vitamin B kompleks 1x1 PO 5 hari PC

EDUKASI PASIEN:
-"""

        formatted = m._format_farmakologi_tree(response)

        self.assertIn("Paracetamol", formatted)
        self.assertIn("Ibuprofen", formatted)
        self.assertIn("Vitamin B kompleks", formatted)
        # Should not have lost any drugs
        drug_count = formatted.count("├─ DDI:") or 0
        self.assertGreaterEqual(
            drug_count,
            3,
            f"Expected >=3 drugs to remain, got {drug_count} DDI entries",
        )

    def test_noninfectious_uri_with_antibiotics_filters_them(self):
        """URI/viral URI case (non-bacterial): antibiotics filtered."""
        response = """DIAGNOSIS KERJA:
J00 Nasofaringitis akut

FARMAKOLOGI:
Paracetamol 500mg PO 3x1 5 hari PC
Amoxicilin 500mg PO 3x1 5 hari PC

EDUKASI PASIEN:
-"""

        formatted = m._format_farmakologi_tree(response)

        self.assertIn("Paracetamol", formatted)
        self.assertNotIn("Amoxicilin", formatted)
        # Should have Vitamin C backfill for URI case
        self.assertIn("Vitamin C", formatted)

    def test_noninfectious_msk_with_amoksisilin_spelling_filters_it(self):
        """Bahasa Indonesia spelling 'Amoksisilin' also filtered."""
        response = """DIAGNOSIS KERJA:
M79.1 Mialgia

FARMAKOLOGI:
Amoksisilin 500mg PO 3x1 7 hari PC
Paracetamol 500mg PO 3x1 5 hari PC

EDUKASI PASIEN:
-"""

        formatted = m._format_farmakologi_tree(response)

        self.assertNotIn("Amoksisilin", formatted)
        self.assertIn("Paracetamol", formatted)

    def test_noninfectious_non_msk_not_in_cluster_passes_through(self):
        """Non-MSK/URI noninfectious case without cluster rule: passes through unchanged."""
        response = """DIAGNOSIS KERJA:
F41.9 Gangguan Anxietas tidak spesifik

FARMAKOLOGI:
Amitriptyline 25mg PO 1x1 HS 7 hari

EDUKASI PASIEN:
-"""

        formatted = m._format_farmakologi_tree(response)

        # No cluster rule for anxiety — drug should remain
        self.assertIn("Amitriptyline", formatted)


class PharmaClusterRuleHelperTests(unittest.TestCase):
    """Tests for _get_pharma_cluster_rule and _should_keep_pharma_candidate."""

    def test_get_cluster_rule_osteoarthritis(self):
        """Osteoarthritis diagnosis triggers MSK cluster rule."""
        response = """DIAGNOSIS KERJA:
M19.9 Osteoartritis

FARMAKOLOGI:
Paracetamol 500mg PO 3x1 5 hari PC
"""
        rule = m._get_pharma_cluster_rule(response)
        self.assertIsNotNone(rule)
        self.assertIn("blocked_drug_keywords", rule)
        self.assertIn("amoxic", rule["blocked_drug_keywords"])
        self.assertIn("defaults", rule)
        self.assertIn("Ibuprofen", rule["defaults"][0])

    def test_get_cluster_rule_nasofaringitis(self):
        """Nasofaringitis diagnosis triggers URI cluster rule."""
        response = """DIAGNOSIS KERJA:
J00 Nasofaringitis akut

FARMAKOLOGI:
Paracetamol 500mg PO 3x1 5 hari PC
"""
        rule = m._get_pharma_cluster_rule(response)
        self.assertIsNotNone(rule)
        self.assertIn("blocked_drug_keywords", rule)
        self.assertIn("defaults", rule)
        self.assertIn("Vitamin C", rule["defaults"][0])

    def test_get_cluster_rule_infectious_returns_none(self):
        """Pneumonia (infectious, not in cluster rules): returns None."""
        response = """DIAGNOSIS KERJA:
J18.9 Pneumonia, tidak spesifik
"""
        rule = m._get_pharma_cluster_rule(response)
        self.assertIsNone(rule)

    def test_should_keep_amoxiclav_blocked_by_msk_rule(self):
        """Amoxiclav-like drug blocked by MSK rule."""
        rule = {
            "blocked_drug_keywords": (
                "amoxic",
                "amoks",
                "clavulan",
                "metronid",
                "cotrim",
                "trimeth",
                "albend",
            ),
        }
        self.assertFalse(m._should_keep_pharma_candidate("amoxicillin", rule))
        self.assertFalse(m._should_keep_pharma_candidate("amoksisilin", rule))
        self.assertFalse(m._should_keep_pharma_candidate("metronidazol", rule))

    def test_should_keep_paracetamol_allowed(self):
        """Paracetamol not blocked by any cluster rule."""
        rule = {
            "blocked_drug_keywords": (
                "amoxic",
                "amoks",
                "clavulan",
                "metronid",
                "cotrim",
                "trimeth",
                "albend",
            ),
        }
        self.assertTrue(m._should_keep_pharma_candidate("paracetamol", rule))
        self.assertTrue(m._should_keep_pharma_candidate("ibuprofen", rule))

    def test_should_keep_no_cluster_rule_returns_true(self):
        """Without cluster rule, all candidates are kept."""
        self.assertTrue(m._should_keep_pharma_candidate("amoxicillin", None))
        self.assertTrue(m._should_keep_pharma_candidate("metronidazol", None))


class PharmaSupportivePickTests(unittest.TestCase):
    """Tests for _pick_supportive_pharma backfill logic."""

    def test_pick_supportive_osteoarthritis_returns_vitamin_b(self):
        """Osteoarthritis triggers Vitamin B kompleks backfill."""
        response = """DIAGNOSIS KERJA:
M19.9 Osteoartritis
"""
        line, info, key = m._pick_supportive_pharma(response)
        self.assertIsNotNone(line)
        self.assertIsNotNone(info)
        self.assertIsNotNone(key)
        self.assertIn("Vitamin B", line)
        self.assertEqual(key, "vitamin b kompleks")

    def test_pick_supportive_ispa_returns_vitamin_c(self):
        """ISPA triggers Vitamin C backfill."""
        response = """DIAGNOSIS KERJA:
J06.9 ISPA tidak spesifik
"""
        line, info, key = m._pick_supportive_pharma(response)
        self.assertIsNotNone(line)
        self.assertIn("Vitamin C", line)
        self.assertEqual(key, "vitamin c")

    def test_pick_supportive_infectious_returns_none(self):
        """Pneumonia (not in supportive rules) returns None."""
        response = """DIAGNOSIS KERJA:
J18.9 Pneumonia
"""
        line, info, key = m._pick_supportive_pharma(response)
        self.assertIsNone(line)
        self.assertIsNone(info)
        self.assertIsNone(key)


if __name__ == "__main__":
    unittest.main()
