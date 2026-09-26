from frappe.custom.doctype.property_setter.property_setter import make_property_setter


def execute():
	"""Set nomor rekam medis (MRN) Patient ke format RM-.###### (Chief, 2026-07-15).

	Regulatory naming series -> milik sentra_mantra_indonesia per ADR-0001.
	Property Setter (bukan edit source healthcare). Ditetapkan SEBELUM pasien
	pertama ada; mengubahnya setelah itu memutus kontinuitas nomor RM.
	"""
	make_property_setter("Patient", "naming_series", "options", "RM-.######", "Text")
	make_property_setter("Patient", "naming_series", "default", "RM-.######", "Text")
