"""Normalized -> healthcare field dicts. Pure functions, synthetic data only."""

from unittest import TestCase

from sentra_mantra_hospital.satusehat_intake.mapping import (
	IHS_SYSTEM,
	NIK_SYSTEM,
	diagnosis_label,
	encounter_fields,
	fhir_ref_id,
	patient_fields,
	patient_identifiers,
	practitioner_attribution,
	procedure_fields,
	split_fhir_datetime,
	vital_signs_fields,
)


class TestFhirRefId(TestCase):
	def test_extracts_id_from_reference(self):
		self.assertEqual(fhir_ref_id("Patient/synthetic-1"), "synthetic-1")
		self.assertEqual(fhir_ref_id("Encounter/enc-9"), "enc-9")

	def test_none_for_missing_or_malformed(self):
		self.assertIsNone(fhir_ref_id(None))
		self.assertIsNone(fhir_ref_id(""))
		self.assertIsNone(fhir_ref_id("no-slash"))
		self.assertIsNone(fhir_ref_id("Patient/"))


class TestSplitFhirDatetime(TestCase):
	def test_splits_datetime_with_positive_offset(self):
		self.assertEqual(
			split_fhir_datetime("2026-01-01T08:00:00+07:00"), ("2026-01-01", "08:00:00")
		)

	def test_splits_datetime_with_zulu(self):
		self.assertEqual(split_fhir_datetime("2026-01-01T01:00:00Z"), ("2026-01-01", "01:00:00"))

	def test_date_only_value(self):
		self.assertEqual(split_fhir_datetime("2026-01-01"), ("2026-01-01", None))

	def test_none_for_empty(self):
		self.assertEqual(split_fhir_datetime(None), (None, None))
		self.assertEqual(split_fhir_datetime(""), (None, None))


class TestEncounterFields(TestCase):
	def test_maps_period_and_finished_status(self):
		fields, reason = encounter_fields(
			{"period_start": "2026-01-01T08:00:00+07:00", "status": "finished"}
		)
		self.assertIsNone(reason)
		self.assertEqual(fields["encounter_date"], "2026-01-01")
		self.assertEqual(fields["encounter_time"], "08:00:00")
		self.assertEqual(fields["status"], "Completed")

	def test_in_progress_maps_to_open(self):
		fields, _ = encounter_fields({"period_start": "2026-01-01T08:00:00+07:00", "status": "in-progress"})
		self.assertEqual(fields["status"], "Open")

	def test_unknown_status_omitted(self):
		fields, _ = encounter_fields({"period_start": "2026-01-01T08:00:00+07:00", "status": "entered-in-error"})
		self.assertNotIn("status", fields)

	def test_missing_period_start_fails_closed(self):
		fields, reason = encounter_fields({"status": "finished"})
		self.assertIsNone(fields)
		self.assertEqual(reason, "missing_period_start")


class TestVitalSignsFields(TestCase):
	def _obs(self, **overrides):
		base = {
			"code_value": "8310-5",
			"value": 36.6,
			"unit": "Cel",
			"effective_datetime": "2026-01-01T08:05:00+07:00",
		}
		base.update(overrides)
		return base

	def test_temperature_maps_with_matching_unit(self):
		fields, reason = vital_signs_fields(self._obs())
		self.assertIsNone(reason)
		self.assertEqual(fields["temperature"], "36.6")
		self.assertEqual(fields["signs_date"], "2026-01-01")
		self.assertEqual(fields["signs_time"], "08:05:00")

	def test_unsupported_loinc_code_fails_closed(self):
		fields, reason = vital_signs_fields(self._obs(code_value="99999-9"))
		self.assertIsNone(fields)
		self.assertEqual(reason, "unsupported_observation_code")

	def test_unit_mismatch_fails_closed_never_converts(self):
		fields, reason = vital_signs_fields(self._obs(unit="[degF]"))
		self.assertIsNone(fields)
		self.assertEqual(reason, "unit_mismatch")

	def test_missing_value_fails_closed(self):
		fields, reason = vital_signs_fields(self._obs(value=None))
		self.assertIsNone(fields)
		self.assertEqual(reason, "missing_observation_value")

	def test_missing_effective_datetime_fails_closed(self):
		fields, reason = vital_signs_fields(self._obs(effective_datetime=None))
		self.assertIsNone(fields)
		self.assertEqual(reason, "missing_effective_datetime")

	def test_bp_systolic_maps(self):
		fields, reason = vital_signs_fields(
			self._obs(code_value="8480-6", value=120, unit="mm[Hg]")
		)
		self.assertIsNone(reason)
		self.assertEqual(fields["bp_systolic"], "120")

	def test_height_weight_deliberately_unsupported_in_v1(self):
		# metres-vs-centimetres ambiguity — excluded until an explicit decision
		for loinc in ("8302-2", "29463-7"):
			fields, reason = vital_signs_fields(self._obs(code_value=loinc, unit="cm"))
			self.assertIsNone(fields)
			self.assertEqual(reason, "unsupported_observation_code")


class TestDiagnosisLabel(TestCase):
	def test_code_and_display(self):
		self.assertEqual(
			diagnosis_label({"code_value": "J45.9", "code_display": "Asthma"}), "J45.9 - Asthma"
		)

	def test_display_only(self):
		self.assertEqual(diagnosis_label({"code_display": "Asthma"}), "Asthma")

	def test_code_only(self):
		self.assertEqual(diagnosis_label({"code_value": "J45.9"}), "J45.9")

	def test_none_when_empty(self):
		self.assertIsNone(diagnosis_label({}))


class TestPatientIdentifiers(TestCase):
	def test_extracts_ihs_and_nik_by_system(self):
		raw = {
			"identifier": [
				{"system": NIK_SYSTEM, "value": "9999999999999999"},
				{"system": IHS_SYSTEM, "value": "P9999"},
				{"system": "https://example.org/mrn", "value": "MRN-1"},
			]
		}
		self.assertEqual(patient_identifiers(raw), {"ihs": "P9999", "nik": "9999999999999999"})

	def test_missing_identifiers_yield_none(self):
		self.assertEqual(patient_identifiers({}), {"ihs": None, "nik": None})
		self.assertEqual(
			patient_identifiers({"identifier": [{"system": IHS_SYSTEM, "value": "  "}]}),
			{"ihs": None, "nik": None},
		)


class TestPatientFields(TestCase):
	RAW = {"name": [{"text": "Pasien Sintetis"}], "gender": "female", "birthDate": "1990-01-01"}

	def test_maps_text_name_gender_dob(self):
		fields, reason = patient_fields(self.RAW)
		self.assertIsNone(reason)
		self.assertEqual(
			fields, {"first_name": "Pasien Sintetis", "sex": "Female", "dob": "1990-01-01"}
		)

	def test_given_family_fallback(self):
		raw = {"name": [{"given": ["Pasien"], "family": "Sintetis"}], "gender": "male"}
		fields, _ = patient_fields(raw)
		self.assertEqual(fields["first_name"], "Pasien Sintetis")
		self.assertEqual(fields["sex"], "Male")

	def test_missing_name_fails_closed(self):
		fields, reason = patient_fields({"gender": "female"})
		self.assertIsNone(fields)
		self.assertEqual(reason, "missing_patient_name")

	def test_unknown_gender_fails_closed_never_coerced(self):
		for gender in ("unknown", "", None):
			fields, reason = patient_fields({"name": [{"text": "Pasien"}], "gender": gender})
			self.assertIsNone(fields)
			self.assertEqual(reason, "missing_patient_sex")

	def test_dob_optional(self):
		fields, reason = patient_fields({"name": [{"text": "Pasien"}], "gender": "other"})
		self.assertIsNone(reason)
		self.assertNotIn("dob", fields)
		self.assertEqual(fields["sex"], "Other")


class TestPractitionerAttribution(TestCase):
	def test_extracts_ihs_and_display(self):
		raw = {
			"participant": [
				{"individual": {"reference": "Practitioner/N9999", "display": "dr. Sintetis"}}
			]
		}
		self.assertEqual(practitioner_attribution(raw), ("N9999", "dr. Sintetis"))

	def test_display_optional(self):
		raw = {"participant": [{"individual": {"reference": "Practitioner/N9999"}}]}
		self.assertEqual(practitioner_attribution(raw), ("N9999", None))

	def test_none_when_no_practitioner_participant(self):
		self.assertEqual(practitioner_attribution({}), (None, None))
		self.assertEqual(
			practitioner_attribution(
				{"participant": [{"individual": {"reference": "RelatedPerson/x"}}]}
			),
			(None, None),
		)


class TestProcedureFields(TestCase):
	def test_maps_performed_datetime(self):
		fields, reason = procedure_fields({"performed_datetime": "2026-01-01T09:00:00+07:00"})
		self.assertIsNone(reason)
		self.assertEqual(fields["start_date"], "2026-01-01")
		self.assertEqual(fields["start_time"], "09:00:00")

	def test_missing_performed_datetime_fails_closed(self):
		fields, reason = procedure_fields({})
		self.assertIsNone(fields)
		self.assertEqual(reason, "missing_performed_datetime")
