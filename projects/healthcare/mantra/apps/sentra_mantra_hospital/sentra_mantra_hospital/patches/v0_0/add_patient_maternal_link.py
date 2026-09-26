"""Tambah Custom Field `custom_ibu` (Link -> Patient) pada Patient.

Fondasi Melinda Maternal Workflows: menautkan neonatus ke pasien ibunya.
Pola sama seperti presiden ADR-0001 (Custom Field via patch versioned, bukan ad
hoc lewat console). Idempoten — `create_custom_fields` melewati yang sudah ada.
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
	create_custom_fields(
		{
			"Patient": [
				{
					"fieldname": "custom_ibu",
					"label": "Ibu (Pasien)",
					"fieldtype": "Link",
					"options": "Patient",
					"insert_after": "sex",
					"description": (
						"Tautan neonatus ke pasien ibu "
						"(Melinda Maternal Workflows, sentra_mantra_hospital)."
					),
				}
			]
		},
		ignore_validate=True,
	)
	frappe.db.commit()
