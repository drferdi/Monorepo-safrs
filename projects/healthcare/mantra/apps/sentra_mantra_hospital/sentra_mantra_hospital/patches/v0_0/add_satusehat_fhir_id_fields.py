"""Add `satusehat_fhir_id` Custom Field to the clinical targets of the
SATUSEHAT materializer (Patient Encounter, Vital Signs, Clinical Procedure,
and the Patient Encounter Diagnosis child row).

External-id key for idempotency (satusehat_intake, BUILD SPEC S6): every
materialized document is keyed to its originating SATUSEHAT fhir_id so a
repeat run finds and updates instead of duplicating. Versioned patch per the
add_patient_maternal_link precedent — never ad hoc via console, and never on
integrations-owned DocTypes. Idempotent: create_custom_fields skips fields
that already exist.
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def _field(insert_after):
	return {
		"fieldname": "satusehat_fhir_id",
		"label": "SATUSEHAT FHIR ID",
		"fieldtype": "Data",
		"read_only": 1,
		"no_copy": 1,
		"search_index": 1,
		"insert_after": insert_after,
		"description": "FHIR resource id of the SATUSEHAT record this document was materialized from (sentra_mantra_hospital.satusehat_intake).",
	}


def execute():
	create_custom_fields(
		{
			"Patient Encounter": [_field("naming_series")],
			"Vital Signs": [_field("naming_series")],
			"Clinical Procedure": [_field("naming_series")],
			"Patient Encounter Diagnosis": [_field("diagnosis")],
		},
		ignore_validate=True,
	)
	frappe.db.commit()
