from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
	"""Nomor STR (Surat Tanda Registrasi) dan SIP (Surat Izin Praktik) pada
	Healthcare Practitioner — registrasi/izin nakes khas Indonesia (KKI/
	Kemenkes), dipakai kartu profil beranda dan kelak SATUSEHAT."""
	create_custom_fields(
		{
			"Healthcare Practitioner": [
				dict(
					fieldname="str_no",
					label="Nomor STR",
					fieldtype="Data",
					insert_after="department",
				),
				dict(
					fieldname="sip_no",
					label="Nomor SIP",
					fieldtype="Data",
					insert_after="str_no",
				),
			]
		}
	)
