"""Tests for emergency-response-dispositional-consistency feature (milestone-3).

Validates VAL-CROSS-005:
- Emergency case: consistent response across working diagnosis, therapy, follow-up, referral.
- No routine home-care as primary plan for emergency case.
- Emergency diagnosis, therapy, and referral all align with urgency level.

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


class EmergencyResponseConsistencyTests(unittest.TestCase):
    """Tests for _check_emergency_response_consistency."""

    def test_emergency_diagnosis_without_emergency_therapy(self):
        """Emergency diagnosis but routine therapy: inconsistency detected."""
        response = """DIAGNOSIS KERJA:
[I64] Stroke — defisit neurologis fokal mendadak

TATALAKSANA:
Tirah baring di rumah
Minum air hangat

FARMAKOLOGI:
Paracetamol 500mg PO 3x1 5 hari PC

KRITERIA RUJUK:
Kontrol ke poliklinik dalam 1 minggu

PROGNOSIS:
Baik bila diistirahatkan
"""
        result = m._check_emergency_response_consistency(response)
        self.assertTrue(result.get("has_inconsistency", False))
        self.assertIn("emergency", result.get("issues", [])[0].lower())

    def test_emergency_diagnosis_with_emergency_therapy_consistent(self):
        """Emergency diagnosis + emergency therapy: consistent."""
        response = """DIAGNOSIS KERJA:
[I64] Stroke — defisit neurologis fokal mendadak

TATALAKSANA:
Stabilisasi jalan napas
Monitor vital sign setiap 15 menit

FARMAKOLOGI:
Paracetamol 500mg PO 3x1 5 hari PC

KRITERIA RUJUK:
RUJUK EMERGENSI — onset <4.5 jam untuk trombolisis

PROGNOSIS:
Tergantung waktu door-to-needle
"""
        result = m._check_emergency_response_consistency(response)
        self.assertFalse(result.get("has_inconsistency", False))

    def test_routine_case_no_emergency_required(self):
        """Routine case: no emergency framing needed, should pass."""
        response = """DIAGNOSIS KERJA:
[J00] Nasofaringitis akut — demam, batuk, pilek

TATALAKSANA:
Istirahat cukup
Minum air hangat

FARMAKOLOGI:
Paracetamol 500mg PO 3x1 5 hari PC

KRITERIA RUJUK:
Kontrol bila demam >3 hari

PROGNOSIS:
Baik
"""
        result = m._check_emergency_response_consistency(response)
        self.assertFalse(result.get("has_inconsistency", False))

    def test_home_care_for_emergency_detected(self):
        """Home care as primary plan for emergency: inconsistency detected."""
        response = """DIAGNOSIS KERJA:
[I21] Acute Coronary Syndrome — nyeri dada hebat

TATALAKSANA:
Pulang ke rumah, istirahat
Diet rendah garam

FARMAKOLOGI:
Paracetamol 500mg PO 3x1 5 hari PC

KRITERIA RUJUK:
Kontrol ke poliklinik dalam 3 hari

PROGNOSIS:
Baik bila diistirahatkan
"""
        result = m._check_emergency_response_consistency(response)
        self.assertTrue(result.get("has_inconsistency", False))
        issues = [i.lower() for i in result.get("issues", [])]
        self.assertTrue(
            any("home" in i or "rumah" in i or "rawat jalan" in i for i in issues)
        )

    def test_emergency_referral_missing_detected(self):
        """Emergency diagnosis but no emergency referral: inconsistency detected."""
        response = """DIAGNOSIS KERJA:
[G00] Meningitis Bakterial — kaku leher, demam, muntah

TATALAKSANA:
Posisi kepala 30 derajat

FARMAKOLOGI:
Paracetamol 500mg PO 3x1 5 hari PC

KRITERIA RUJUK:
Kontrol bila demam tidak turun

PROGNOSIS:
Tergantung respons antibiotik
"""
        result = m._check_emergency_response_consistency(response)
        self.assertTrue(result.get("has_inconsistency", False))
        issues = [i.lower() for i in result.get("issues", [])]
        self.assertTrue(any("rujuk" in i or "referral" in i for i in issues))

    def test_consistent_emergency_full_response(self):
        """Fully consistent emergency response: diagnosis, therapy, referral all align."""
        response = """DIAGNOSIS KERJA:
[I64] Stroke — defisit neurologis fokal

TATALAKSANA:
Stabilisasi airway, breathing, circulation
Monitor GCS setiap 15 menit

FARMAKOLOGI:
Paracetamol 500mg PO 3x1 5 hari PC

KRITERIA RUJUK:
RUJUK EMERGENSI — stroke center, onset <4.5 jam

PROGNOSIS:
Tergantung waktu intervensi
"""
        result = m._check_emergency_response_consistency(response)
        self.assertFalse(result.get("has_inconsistency", False))

    def test_inconsistency_message_is_actionable(self):
        """Inconsistency message should tell doctor what to fix."""
        response = """DIAGNOSIS KERJA:
[I64] Stroke

TATALAKSANA:
Istirahat di rumah

KRITERIA RUJUK:
Kontrol rutin
"""
        result = m._check_emergency_response_consistency(response)
        self.assertTrue(result.get("has_inconsistency", False))
        message = result.get("message", "").lower()
        self.assertIn("emergency", message)
        self.assertIn("diagnosis", message)


if __name__ == "__main__":
    unittest.main()
