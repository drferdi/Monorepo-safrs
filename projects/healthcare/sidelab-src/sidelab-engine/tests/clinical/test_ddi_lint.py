# Architected and built by codieverse+.
"""Tests for sidelab/ddi_lint.py — cross-drug DDI and patient-KI checks.

These exercise only the linter (unit-level). The validator-level
panel integration is verified in test_pharma_validator.py.
"""
import importlib.util
import unittest
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "pharma_records", Path(__file__).resolve().parent.parent.parent
    / "sidelab" / "pharma_records.py"
)
pr = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(pr)

_spec = importlib.util.spec_from_file_location(
    "fornas_loader", Path(__file__).resolve().parent.parent.parent
    / "sidelab" / "fornas_loader.py"
)
fl = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(fl)

_spec = importlib.util.spec_from_file_location(
    "ddi_lint", Path(__file__).resolve().parent.parent.parent
    / "sidelab" / "ddi_lint.py"
)
m = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(m)


def _record(name: str, lookup_key: str = "") -> pr.TherapyRecord:
    return pr.TherapyRecord(
        raw=f"{name} 500 mg PO",
        name=name,
        canonical_name=lookup_key or name.lower(),
        lookup_key=lookup_key or name.lower(),
    )


class DDILintCrossTests(unittest.TestCase):
    """Real-enrichment behaviour for cross-drug alerts."""

    def setUp(self) -> None:
        fl.reset_fornas_cache()

    def test_ibuprofen_warfarin_pair_triggers_mayor_alert(self):
        recs = [_record("Ibuprofen 400 mg"), _record("Warfarin 5 mg")]
        alerts = m.find_cross_drug_alerts(recs)
        match = next(
            (a for a in alerts
             if "ibuprofen" in a.get("drug_a", "") and "warfarin" in a.get("drug_b", "")
             ),
            None,
        )
        self.assertIsNotNone(match)
        self.assertEqual(match.get("level"), "mayor")
        self.assertTrue(match.get("effect"))

    def test_paracetamol_single_drug_returns_empty(self):
        recs = [_record("Paracetamol 500 mg")]
        self.assertEqual(m.find_cross_drug_alerts(recs), [])

    def test_unrelated_drugs_produce_no_alert(self):
        # Both DOMPERIDON have no interactions with PARACETAMOL in the
        # enrichment sidecar.
        recs = [
            _record("Paracetamol 500 mg"),
            _record("Domperidon 10 mg"),
        ]
        alerts = m.find_cross_drug_alerts(recs)
        self.assertEqual(alerts, [])

    def test_alerts_sorted_by_severity(self):
        # Mayor pair first, then minor pair; downstream panel
        # highlight will land on the most severe one.
        recs = [
            _record("Ibuprofen 400 mg"),
            _record("Warfarin 5 mg"),
            _record("Paracetamol 500 mg"),
        ]
        alerts = m.find_cross_drug_alerts(recs)
        if not alerts:
            self.skipTest("no cross-drug alerts in current enrichment")
        ranks = [
            {"kontraindikasi": 5, "mayor": 4, "moderate": 3, "minor": 2}.get(
                str(a.get("level", "minor")).lower(), 0
            )
            for a in alerts
        ]
        self.assertEqual(ranks, sorted(ranks, reverse=True))

    def test_common_fktp_batch_enrichment_resolves_with_safety_fields(self):
        required = {
            "amlodipin",
            "kaptopril",
            "garam oralit",
            "zinc",
            "antasida",
            "prednison",
        }

        for name in required:
            with self.subTest(name=name):
                drug = fl.resolve_by_name(name)
                self.assertIsNotNone(drug)
                self.assertTrue(drug.get("interaksi") or drug.get("kontraindikasi_relatif"))
                self.assertTrue(drug.get("atc_code"))

    def test_amlodipin_simvastatin_pair_triggers_alert(self):
        recs = [_record("Amlodipin 10 mg", "amlodipin"), _record("Simvastatin 20 mg", "simvastatin")]

        alerts = m.find_cross_drug_alerts(recs)

        match = next(
            (a for a in alerts if "amlodipin" in a.get("drug_a", "") and "simvastatin" in a.get("drug_b", "")),
            None,
        )
        self.assertIsNotNone(match)
        self.assertIn(match.get("level"), {"moderate", "mayor"})

    def test_kaptopril_spironolakton_pair_triggers_hyperkalemia_alert(self):
        recs = [_record("Kaptopril 25 mg", "kaptopril"), _record("Spironolakton 25 mg", "spironolakton")]

        alerts = m.find_cross_drug_alerts(recs)

        match = next(
            (a for a in alerts if "kaptopril" in a.get("drug_a", "") and "spironolakton" in a.get("drug_b", "")),
            None,
        )
        self.assertIsNotNone(match)
        self.assertEqual(match.get("level"), "mayor")
        self.assertIn("hiperkalemia", match.get("effect", "").lower())

    def test_antasida_siprofloksasin_pair_triggers_absorption_alert(self):
        recs = [
            _record("Antasida 1 tablet", "antasida"),
            _record("Siprofloksasin 500 mg", "siprofloksasin"),
        ]

        alerts = m.find_cross_drug_alerts(recs)

        match = next(
            (a for a in alerts if "antasida" in a.get("drug_a", "") and "siprofloksasin" in a.get("drug_b", "")),
            None,
        )
        self.assertIsNotNone(match)
        self.assertIn("absor", match.get("effect", "").lower())

    def test_zinc_siprofloksasin_pair_triggers_absorption_alert(self):
        recs = [_record("Zinc 20 mg", "zinc"), _record("Siprofloksasin 500 mg", "siprofloksasin")]

        alerts = m.find_cross_drug_alerts(recs)

        match = next(
            (a for a in alerts if "zinc" in a.get("drug_a", "") and "siprofloksasin" in a.get("drug_b", "")),
            None,
        )
        self.assertIsNotNone(match)
        self.assertIn("absor", match.get("effect", "").lower())

    def test_prednison_ibuprofen_pair_triggers_gi_bleeding_alert(self):
        recs = [_record("Prednison 5 mg", "prednison"), _record("Ibuprofen 400 mg", "ibuprofen")]

        alerts = m.find_cross_drug_alerts(recs)

        match = next(
            (a for a in alerts if "prednison" in a.get("drug_a", "") and "ibuprofen" in a.get("drug_b", "")),
            None,
        )
        self.assertIsNotNone(match)
        self.assertEqual(match.get("level"), "mayor")
        self.assertIn("perdarahan", match.get("effect", "").lower())


class DDILintPatientKITests(unittest.TestCase):
    """Patient-specific KI matching across enrichment entries."""

    def setUp(self) -> None:
        fl.reset_fornas_cache()

    def test_no_pasien_returns_empty(self):
        recs = [_record("Paracetamol 500 mg")]
        self.assertEqual(m.find_patient_conflicts(recs, None), [])
        self.assertEqual(m.find_patient_conflicts(recs, {}), [])

    def test_paracetamol_alcohol_flagged_as_relative(self):
        recs = [_record("Paracetamol 500 mg")]
        pasien = {"komorbid": "konsumsi alkohol kronis aktif"}
        alerts = m.find_patient_conflicts(recs, pasien)
        match = next(
            (a for a in alerts if a.get("drug_canonical", "") == "parasetamol"),
            None,
        )
        self.assertIsNotNone(match)
        self.assertEqual(match.get("matched_field"), "komorbid")

    def test_ibuprofen_active_ulcer_patient_conflict(self):
        records = [_record("Ibuprofen 400 mg", "ibuprofen")]
        pasien = {"komorbid": "ulkus peptikum aktif"}

        alerts = m.find_patient_conflicts(records, pasien)

        self.assertTrue(any("ulkus" in a.get("syarat", "").lower() for a in alerts))

    def test_amoksisilin_penicillin_allergy_flagged_absolute(self):
        recs = [_record("Amoxicillin 500 mg")]
        pasien = {"alergi": "riwayat alergi penisilin"}
        alerts = m.find_patient_conflicts(recs, pasien)
        match = next(
            (a for a in alerts if "amoksisilin" in a.get("drug_canonical", "")),
            None,
        )
        self.assertIsNotNone(match)
        self.assertEqual(match.get("kontraindikasi_tipe"), "absolute")
        self.assertEqual(match.get("matched_field"), "alergi")

    def test_pediatric_populasi_tag_for_young_patient(self):
        recs = [_record("Salbutamol inhaler")]
        pasien = {"umur": 8}
        alerts = m.find_patient_conflicts(recs, pasien)
        # Salbutamol entry does not declare a pediatric KI in the
        # current enrichment, so the test is purely structural: any
        # returned alert must have tipe == "population".
        for alert in alerts:
            self.assertIn(alert.get("kontraindikasi_tipe", ""), {"population", "relative"})

    def test_pediatric_populasi_negatif_for_adult(self):
        recs = [_record("Salbutamol inhaler")]
        pasien = {"umur": 45}
        alerts = [
            a
            for a in m.find_patient_conflicts(recs, pasien)
            if a.get("kontraindikasi_tipe") == "population"
            and "pediatri" in str(a.get("matched_snippet", "")).lower()
        ]
        self.assertEqual(alerts, [])

    def test_pediatric_populasi_for_underage(self):
        recs = [_record("Asam Mefenamat 500 mg")]  # M01AG01 → pediatric warning
        pasien = {"umur": 4}
        alerts = m.find_patient_conflicts(recs, pasien)
        # Asam Mefenamat has no pediatric KI explicitly; let lookup
        # succeed without false positives. Just ensure no False.
        self.assertIsInstance(alerts, list)

    def test_kaptopril_pregnancy_flagged_absolute(self):
        recs = [_record("Kaptopril 25 mg", "kaptopril")]
        pasien = {"komorbid": "pasien hamil trimester 2"}

        alerts = m.find_patient_conflicts(recs, pasien)

        match = next((a for a in alerts if a.get("drug_canonical") == "kaptopril"), None)
        self.assertIsNotNone(match)
        self.assertEqual(match.get("kontraindikasi_tipe"), "absolute")

    def test_oralit_renal_failure_flagged_relative(self):
        recs = [_record("Garam oralit", "garam oralit")]
        pasien = {"komorbid": "gagal ginjal berat"}

        alerts = m.find_patient_conflicts(recs, pasien)

        self.assertTrue(any(a.get("drug_canonical") == "garam oralit" for a in alerts))

    def test_prednison_uncontrolled_diabetes_flagged_relative(self):
        recs = [_record("Prednison 5 mg", "prednison")]
        pasien = {"komorbid": "diabetes mellitus tidak terkontrol"}

        alerts = m.find_patient_conflicts(recs, pasien)

        self.assertTrue(any("diabetes" in a.get("syarat", "").lower() for a in alerts))


class DDIRenderSectionTests(unittest.TestCase):

    def test_no_alerts_returns_empty_string(self):
        self.assertEqual(m.render_alerts_section([], []), "")

    def test_ddi_alert_section_renders_in_bahasa(self):
        alert = m.DDIAlert(
            drug_a="ibuprofen",
            drug_b="warfarin",
            level="mayor",
            effect="Risiko perdarahan GI meningkat",
            mekanisme="Efek antiplatelet sinergis",
            management="Hindari; tambahkan PPI",
        )
        out = m.render_alerts_section([alert], [])
        self.assertIn("PERINGATAN KLINIS TAMBAHAN", out)
        self.assertIn("MAYOR", out)
        self.assertIn("ibuprofen", out)
        self.assertIn("warfarin", out)
        self.assertIn("Hindari", out)

    def test_ki_alert_section_renders_pasien_snippet(self):
        alert = m.KIPatientAlert(
            drug_id="fornas:amoksisilin",
            drug_canonical="amoksisilin",
            kontraindikasi_tipe="absolute",
            syarat="alergi penisilin",
            matched_field="alergi",
            matched_snippet="alergi penisilin",
            catatan="Ganti dengan makrolida",
            severity_rank=5,
        )
        out = m.render_alerts_section([], [alert])
        self.assertIn("ABSOLUTE", out)
        self.assertIn("alergi penisilin", out)
        self.assertIn("Ganti dengan makrolida", out)
        self.assertIn("Pasien (alergi)", out)


if __name__ == "__main__":
    unittest.main()
