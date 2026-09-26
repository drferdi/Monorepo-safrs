from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
	"""Masa berlaku STR/SIP pada Healthcare Practitioner — dasar indikator
	kedaluwarsa di kartu profil beranda (dan kelak pengingat perpanjangan).
	Melengkapi add_practitioner_str_sip_fields."""
	create_custom_fields(
		{
			"Healthcare Practitioner": [
				dict(
					fieldname="str_expiry",
					label="STR Berlaku Sampai",
					fieldtype="Date",
					insert_after="str_no",
				),
				dict(
					fieldname="sip_expiry",
					label="SIP Berlaku Sampai",
					fieldtype="Date",
					insert_after="sip_no",
				),
			]
		}
	)
