"""FHIR -> canonical mapping: hand-written synthetic fixtures only, never real patient data."""

from unittest import TestCase

from sentra_mantra_integrations.satusehat import mapping
from sentra_mantra_integrations.satusehat.resources import (
	condition,
	encounter,
	medication_request,
	observation,
	procedure,
)

SYNTHETIC_ENCOUNTER = {
	"resourceType": "Encounter",
	"id": "enc-synthetic-1",
	"status": "finished",
	"class": {"code": "AMB", "display": "ambulatory"},
	"subject": {"reference": "Patient/synthetic-patient-1"},
	"serviceProvider": {"reference": "Organization/100027810"},
	"period": {"start": "2026-01-01T08:00:00+07:00", "end": "2026-01-01T08:30:00+07:00"},
}

SYNTHETIC_CONDITION = {
	"resourceType": "Condition",
	"id": "cond-synthetic-1",
	"clinicalStatus": {"coding": [{"code": "active"}]},
	"code": {
		"coding": [{"system": "http://hl7.org/fhir/sid/icd-10", "code": "J45.9", "display": "Asthma"}]
	},
	"subject": {"reference": "Patient/synthetic-patient-1"},
	"encounter": {"reference": "Encounter/enc-synthetic-1"},
}

SYNTHETIC_OBSERVATION = {
	"resourceType": "Observation",
	"id": "obs-synthetic-1",
	"status": "final",
	"code": {"coding": [{"system": "http://loinc.org", "code": "8310-5", "display": "Body temperature"}]},
	"valueQuantity": {"value": 36.6, "unit": "Cel"},
	"effectiveDateTime": "2026-01-01T08:05:00+07:00",
	"subject": {"reference": "Patient/synthetic-patient-1"},
	"encounter": {"reference": "Encounter/enc-synthetic-1"},
}

SYNTHETIC_PROCEDURE = {
	"resourceType": "Procedure",
	"id": "proc-synthetic-1",
	"status": "completed",
	"code": {"coding": [{"system": "http://snomed.info/sct", "code": "80146002", "display": "Appendectomy"}]},
	"performedDateTime": "2026-01-01T09:00:00+07:00",
	"subject": {"reference": "Patient/synthetic-patient-1"},
	"encounter": {"reference": "Encounter/enc-synthetic-1"},
}

SYNTHETIC_MEDICATION_REQUEST = {
	"resourceType": "MedicationRequest",
	"id": "med-synthetic-1",
	"status": "active",
	"intent": "order",
	"medicationCodeableConcept": {"coding": [{"system": "kfa", "code": "KFA001", "display": "Paracetamol"}]},
	"dosageInstruction": [{"text": "3x500mg"}],
	"subject": {"reference": "Patient/synthetic-patient-1"},
	"encounter": {"reference": "Encounter/enc-synthetic-1"},
}


class TestSatuSehatMapping(TestCase):
	def test_normalize_encounter(self):
		result = encounter.normalize_encounter(SYNTHETIC_ENCOUNTER)
		self.assertEqual(result["fhir_id"], "enc-synthetic-1")
		self.assertEqual(result["subject_ref"], "Patient/synthetic-patient-1")
		self.assertEqual(result["class_code"], "AMB")
		self.assertEqual(result["target_doctype"], "Patient Encounter")

	def test_normalize_condition_uses_icd10_coding(self):
		result = condition.normalize_condition(SYNTHETIC_CONDITION)
		self.assertEqual(result["code_value"], "J45.9")
		self.assertEqual(result["code_system"], "http://hl7.org/fhir/sid/icd-10")
		self.assertEqual(result["encounter_ref"], "Encounter/enc-synthetic-1")

	def test_normalize_observation_value_quantity(self):
		result = observation.normalize_observation(SYNTHETIC_OBSERVATION)
		self.assertEqual(result["value"], 36.6)
		self.assertEqual(result["unit"], "Cel")
		self.assertEqual(result["code_system"], "http://loinc.org")

	def test_normalize_observation_value_string_fallback(self):
		fhir = dict(SYNTHETIC_OBSERVATION)
		fhir.pop("valueQuantity")
		fhir["valueString"] = "Normal"
		result = observation.normalize_observation(fhir)
		self.assertEqual(result["value"], "Normal")
		self.assertIsNone(result["unit"])

	def test_normalize_procedure(self):
		result = procedure.normalize_procedure(SYNTHETIC_PROCEDURE)
		self.assertEqual(result["code_value"], "80146002")
		self.assertEqual(result["target_doctype"], "Clinical Procedure")

	def test_normalize_medication_request(self):
		result = medication_request.normalize_medication_request(SYNTHETIC_MEDICATION_REQUEST)
		self.assertEqual(result["dosage_text"], "3x500mg")
		self.assertEqual(result["code_display"], "Paracetamol")
		self.assertEqual(result["target_doctype"], "Drug Prescription")

	def test_dispatch_by_resource_type(self):
		result = mapping.normalize("Encounter", SYNTHETIC_ENCOUNTER)
		self.assertEqual(result["fhir_id"], "enc-synthetic-1")

	def test_dispatch_rejects_unknown_resource_type(self):
		with self.assertRaises(ValueError):
			mapping.normalize("Patient", {})

	def test_reference_id_returns_raw_string_never_resolved(self):
		self.assertEqual(
			mapping.reference_id(
				{"reference": "Patient/synthetic-patient-1", "display": "Should Not Be Used"}
			),
			"Patient/synthetic-patient-1",
		)

	def test_reference_id_none_when_absent(self):
		self.assertIsNone(mapping.reference_id(None))
		self.assertIsNone(mapping.reference_id({}))
