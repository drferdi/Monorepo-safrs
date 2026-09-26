"""Link profil publik per-user (Chief, 2026-07-17): setiap user mengisi link
sosial/akademiknya sendiri lewat form User (avatar > My Settings), bukan
hardcode di kode. Blok Beranda membaca child table ini via endpoint per-user
(sentra_mantra_indonesia.home_today.my_today) sehingga tiap orang hanya
melihat link miliknya.

Idempoten — aman dijalankan ulang:

    bench --site mantra.localhost execute sentra_mantra_core.profil_links.setup
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

CUSTOM_FIELDS = {
	"User": [
		{
			"fieldname": "sentra_profil_section",
			"fieldtype": "Section Break",
			"label": "Profil Publik",
			"insert_after": "bio",
			"collapsible": 1,
		},
		{
			"fieldname": "sentra_profil_links",
			"fieldtype": "Table",
			"label": "Link Profil Publik",
			"options": "Sentra Profil Link",
			"insert_after": "sentra_profil_section",
		},
	]
}


def setup():
	create_custom_fields(CUSTOM_FIELDS, ignore_validate=True)
	frappe.clear_cache(doctype="User")
	frappe.db.commit()
	return {"fields": [f["fieldname"] for f in CUSTOM_FIELDS["User"]]}
