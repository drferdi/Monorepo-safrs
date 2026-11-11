from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
	"""Add NIK (Nomor Induk Kependudukan) to Employee (Chief GO 2026-07-15).

	Indonesia-specific regulatory identifier, needed later for SATUSEHAT/BPJS
	identity mapping — hence owned by sentra_mantra_indonesia per ADR-0001.
	Schema only; values are site data imported operationally.
	"""
	create_custom_fields(
		{
			"Employee": [
				dict(
					fieldname="nik",
					label="NIK",
					fieldtype="Data",
					length=16,
					insert_after="date_of_birth",
				)
			]
		}
	)
