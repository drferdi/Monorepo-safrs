"""Add `satusehat_ihs` to Healthcare Practitioner for the SmartHealth Link module.

The SATUSEHAT shl/get API requires the requesting practitioner's real IHS
number; without it the integration fails closed (no fabricated identity is ever
sent to a government API). The field is filled manually per doctor by the
admin — hence editable, unlike the read-only materializer identity fields.

PII note (UU PDP): a practitioner IHS number is a personal identifier.
Unique-index safety: new column, all existing rows NULL — MariaDB unique
indexes permit multiple NULLs. Idempotent: create_custom_fields skips existing.
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
	create_custom_fields(
		{
			"Healthcare Practitioner": [
				{
					"fieldname": "satusehat_ihs",
					"label": "SATUSEHAT IHS Number",
					"fieldtype": "Data",
					"unique": 1,
					"search_index": 1,
					"no_copy": 1,
					"insert_after": "practitioner_name",
					"description": "Nomor IHS praktisi di SATUSEHAT — wajib untuk membuka SmartHealth Link (PII).",
				}
			]
		},
		ignore_validate=True,
	)
	frappe.db.commit()
