# Architected and built by codieverse+.
"""Tests for pharmacotherapy-interaction-contraindication feature (milestone-3).

Validates VAL-SAFETY-006:
- Whenever drug recommendations are shown, the visible pharmacotherapy output
  includes interaction and contraindication information
- The output includes contraindication information
- A doctor can review this information directly in the terminal without
  needing hidden state or external interpretation

Simulated cases only. No real patient data.
"""

import importlib.util
import unittest
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "sidelab_app", Path(__file__).resolve().parent.parent.parent / "sidelab.py"
)
m = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(m)


class LibraryPharmaLinesTests(unittest.TestCase):
    """Tests for _library_pharma_lines — must include DDI/KI for every drug."""

    def test_known_drug_includes_ddi_and_ki(self):
        """Drug in _PHARMA_LOOKUP produces DDI + KI lines in output."""
        d144 = {
            "pharmacotherapy": {
                "first_line": [
                    {
                        "drug": "Paracetamol",
                        "dose": "500mg",
                        "route": "PO",
                        "frequency": "3x1",
                        "duration": "5 hari",
                    }
                ]
            }
        }
        lines = m._library_pharma_lines(d144)
        # Should include: drug line, DDI line, KI line, blank spacer
        self.assertGreaterEqual(
            len(lines), 3, f"Expected >=3 lines, got {len(lines)}: {lines}"
        )
        has_ddi = any("DDI:" in line for line in lines)
        has_ki = any("Kontraindikasi:" in line or "KI:" in line for line in lines)
        self.assertTrue(has_ddi, f"No DDI line found in: {lines}")
        self.assertTrue(has_ki, f"No Kontraindikasi line found in: {lines}")

    def test_unknown_drug_produces_unavailable_fallback(self):
        """Drug NOT in _PHARMA_LOOKUP produces 'Tidak tersedia' fallback."""
        d144 = {
            "pharmacotherapy": {
                "first_line": [
                    {
                        "drug": "Unobtanium",
                        "dose": "100mg",
                        "route": "PO",
                        "frequency": "1x1",
                        "duration": "10 hari",
                    }
                ]
            }
        }
        lines = m._library_pharma_lines(d144)
        has_fallback = any(
            "Tidak tersedia di database lokal" in line
            or "tidak tersedia" in line.lower()
            for line in lines
        )
        self.assertTrue(
            has_fallback,
            f"Expected 'Tidak tersedia di database lokal' fallback in: {lines}",
        )

    def test_multiple_drugs_each_have_ddi_ki(self):
        """Multiple drugs — each gets its own DDI + KI block."""
        d144 = {
            "pharmacotherapy": {
                "first_line": [
                    {
                        "drug": "Paracetamol",
                        "dose": "500mg",
                        "route": "PO",
                        "frequency": "3x1",
                        "duration": "5 hari",
                    },
                    {
                        "drug": "Ibuprofen",
                        "dose": "400mg",
                        "route": "PO",
                        "frequency": "3x1",
                        "duration": "5 hari",
                    },
                ]
            }
        }
        lines = m._library_pharma_lines(d144)
        # Count DDI and KI occurrences
        ddi_count = sum(1 for line in lines if "DDI:" in line)
        ki_count = sum(
            1 for line in lines if "Kontraindikasi:" in line or "KI:" in line
        )
        self.assertGreaterEqual(
            ddi_count,
            2,
            f"Expected >=2 DDI lines for 2 drugs, got {ddi_count}: {lines}",
        )
        self.assertGreaterEqual(
            ki_count, 2, f"Expected >=2 KI lines for 2 drugs, got {ki_count}: {lines}"
        )

    def test_ddi_content_matches_known_drug(self):
        """DDI line contains the expected interaction info for paracetamol."""
        d144 = {
            "pharmacotherapy": {
                "first_line": [
                    {
                        "drug": "Paracetamol",
                        "dose": "500mg",
                        "route": "PO",
                        "frequency": "3x1",
                        "duration": "5 hari",
                    }
                ]
            }
        }
        lines = m._library_pharma_lines(d144)
        ddi_lines = [line for line in lines if "DDI:" in line]
        self.assertTrue(ddi_lines, "No DDI line found")
        # Paracetamol DDI should mention warfarin or hepatotoxicity
        ddi_text = " ".join(ddi_lines).lower()
        self.assertTrue(
            "warfarin" in ddi_text or "hepatotoksisitas" in ddi_text,
            f"Expected paracetamol DDI to mention warfarin/hepatotoxicity, got: {ddi_text}",
        )

    def test_ki_content_matches_known_drug(self):
        """KI line contains the expected contraindication info for ibuprofen."""
        d144 = {
            "pharmacotherapy": {
                "first_line": [
                    {
                        "drug": "Ibuprofen",
                        "dose": "400mg",
                        "route": "PO",
                        "frequency": "3x1",
                        "duration": "5 hari",
                    }
                ]
            }
        }
        lines = m._library_pharma_lines(d144)
        ki_lines = [
            line for line in lines if "Kontraindikasi:" in line or "KI:" in line
        ]
        self.assertTrue(ki_lines, "No KI line found")
        # Ibuprofen KI should mention NSAID-sensitif or ulkus or hamil trimester
        ki_text = " ".join(ki_lines).lower()
        self.assertTrue(
            "nsaid" in ki_text or "ulkus" in ki_text or "hamil" in ki_text,
            f"Expected ibuprofen KI to mention NSAID/ulkus/hamil, got: {ki_text}",
        )

    def test_second_line_drugs_also_include_ddi_ki(self):
        """Second-line drugs from library also get DDI/KI."""
        d144 = {
            "pharmacotherapy": {
                "second_line": [
                    {
                        "drug": "Amoxicillin",
                        "dose": "500mg",
                        "route": "PO",
                        "frequency": "3x1",
                        "duration": "7 hari",
                    }
                ]
            }
        }
        lines = m._library_pharma_lines(d144)
        has_ddi = any("DDI:" in line for line in lines)
        has_ki = any("Kontraindikasi:" in line or "KI:" in line for line in lines)
        self.assertTrue(has_ddi, f"No DDI line found for second_line: {lines}")
        self.assertTrue(has_ki, f"No KI line found for second_line: {lines}")

    def test_prophylaxis_drugs_also_include_ddi_ki(self):
        """Prophylaxis drugs from library also get DDI/KI."""
        d144 = {
            "pharmacotherapy": {
                "prophylaxis": [
                    {
                        "drug": "Vitamin C",
                        "dose": "500mg",
                        "route": "PO",
                        "frequency": "1x1",
                        "duration": "5 hari",
                    }
                ]
            }
        }
        lines = m._library_pharma_lines(d144)
        has_ddi = any("DDI:" in line for line in lines)
        has_ki = any("Kontraindikasi:" in line or "KI:" in line for line in lines)
        self.assertTrue(has_ddi, f"No DDI line found for prophylaxis: {lines}")
        self.assertTrue(has_ki, f"No KI line found for prophylaxis: {lines}")

    def test_empty_pharmacotherapy_returns_empty(self):
        """Empty pharmacotherapy dict returns empty list."""
        d144 = {"pharmacotherapy": {}}
        lines = m._library_pharma_lines(d144)
        self.assertEqual(lines, [])

    def test_no_d144_returns_empty(self):
        """None d144 returns empty list."""
        lines = m._library_pharma_lines(None)
        self.assertEqual(lines, [])

    def test_output_contains_visible_ascii_tree_structure(self):
        """Output uses visible ASCII tree structure for scannability."""
        d144 = {
            "pharmacotherapy": {
                "first_line": [
                    {
                        "drug": "Paracetamol",
                        "dose": "500mg",
                        "route": "PO",
                        "frequency": "3x1",
                        "duration": "5 hari",
                    }
                ]
            }
        }
        lines = m._library_pharma_lines(d144)
        # Should have tree branch markers or indentation visible in terminal
        joined = "\n".join(lines)
        has_tree = "├─" in joined or "└─" in joined or "│" in joined
        self.assertTrue(
            has_tree,
            f"Expected visible tree structure (├─ └─ │) in output: {repr(joined)}",
        )

    def test_amoxicillin_conflict_with_penicillin_allergy_cci_visible(self):
        """For amoxicillin, KI must mention penicillin hypersensitivity."""
        d144 = {
            "pharmacotherapy": {
                "first_line": [
                    {
                        "drug": "Amoxicillin",
                        "dose": "500mg",
                        "route": "PO",
                        "frequency": "3x1",
                        "duration": "7 hari",
                    }
                ]
            }
        }
        lines = m._library_pharma_lines(d144)
        ki_lines = [
            line for line in lines if "Kontraindikasi:" in line or "KI:" in line
        ]
        ki_text = " ".join(ki_lines).lower()
        self.assertTrue(
            "penisilin" in ki_text or "penicillin" in ki_text,
            f"Amoxicillin KI should mention penicillin hypersensitivity: {ki_text}",
        )


class FormatFarmakologiTreeTests(unittest.TestCase):
    """Tests for _format_farmakologi_tree — LLM output path, already includes DDI/KI."""

    def test_known_drug_gets_ddi_ki_from_lookup(self):
        """LLM-generated FARMAKOLOGI section gets DDI/KI injected."""
        response = """DIAGNOSIS KERJA:
M19.9 Osteoartritis

FARMAKOLOGI:
Paracetamol 500mg PO 3x1 5 hari PC

EDUKASI PASIEN:
-"""
        formatted = m._format_farmakologi_tree(response)
        self.assertIn("DDI:", formatted)
        self.assertIn("Kontraindikasi:", formatted)

    def test_unknown_drug_gets_fallback_message(self):
        """LLM-generated drug not in lookup gets 'Tidak tersedia' fallback."""
        response = """DIAGNOSIS KERJA:
J00 Nasofaringitis akut

FARMAKOLOGI:
Zyxalonium 50mg PO 2x1 3 hari PC

EDUKASI PASIEN:
-"""
        formatted = m._format_farmakologi_tree(response)
        self.assertIn("Tidak tersedia di database lokal", formatted)

    def test_no_farmakologi_section_returns_unchanged(self):
        """Response without FARMAKOLOGI section is returned unchanged."""
        response = """DIAGNOSIS KERJA:
J00 Nasofaringitis akut

EDUKASI PASIEN:
- Minum air putih banyak
"""
        formatted = m._format_farmakologi_tree(response)
        self.assertEqual(formatted, response)


if __name__ == "__main__":
    unittest.main()
