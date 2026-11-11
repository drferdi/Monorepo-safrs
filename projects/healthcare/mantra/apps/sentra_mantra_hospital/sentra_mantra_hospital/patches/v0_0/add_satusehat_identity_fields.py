"""Add SATUSEHAT identity fields (REVISION 01 of the materializer spec).

Patient: `satusehat_ihs` + `satusehat_nik` are the stable dedup keys for
DECISION A (SATUSEHAT as a patient source) — both UNIQUE-indexed so a re-run
finds the created Patient instead of inserting a duplicate; `patient_source`
tags SATUSEHAT-origin patients as auditable/distinguishable from staff entry.

Patient Encounter: `satusehat_practitioner_ihs` + `satusehat_practitioner_name`
preserve the real SATUSEHAT attribution (DECISION B) while the encounter itself
is attributed to the "SATUSEHAT Import" placeholder practitioner — a later
wave can remap to the real practitioner without re-pulling data.

PII note (UU PDP): satusehat_nik (national ID) and satusehat_ihs are personal
identifiers stored on Patient — record this in the privacy/compliance docs.

Unique-index safety: the columns are new, so every existing row holds NULL and
MariaDB unique indexes permit multiple NULLs — the constraint only binds real
identifier values. Idempotent: create_custom_fields skips existing fields.
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def _field(fieldname, label, insert_after, description, unique=0):
	return {
		"fieldname": fieldname,
		"label": label,
		"fieldtype": "Data",
		"read_only": 1,
		"no_copy": 1,
		"unique": unique,
		"search_index": unique,
		"insert_after": insert_after,
		"description": description,
	}


def execute():
	create_custom_fields(
		{
			"Patient": [
				_field(
					"satusehat_ihs",
					"SATUSEHAT IHS Number",
					"uid",
					"Kemkes IHS number — stable dedup key for SATUSEHAT-sourced patients (PII).",
					unique=1,
				),
				_field(
					"satusehat_nik",
					"SATUSEHAT NIK",
					"satusehat_ihs",
					"NIK from the SATUSEHAT Patient resource — stable dedup key (PII, UU PDP).",
					unique=1,
				),
				_field(
					"patient_source",
					"Patient Source",
					"satusehat_nik",
					'Set to "SATUSEHAT" when this Patient was created by the SATUSEHAT materializer.',
				),
			],
			"Patient Encounter": [
				_field(
					"satusehat_practitioner_ihs",
					"SATUSEHAT Practitioner IHS",
					"satusehat_fhir_id",
					"IHS number of the real SATUSEHAT practitioner — preserved for a future remap wave.",
				),
				_field(
					"satusehat_practitioner_name",
					"SATUSEHAT Practitioner Name",
					"satusehat_practitioner_ihs",
					"Display name of the real SATUSEHAT practitioner (encounter is attributed to the import placeholder).",
				),
			],
		},
		ignore_validate=True,
	)
	frappe.db.commit()
