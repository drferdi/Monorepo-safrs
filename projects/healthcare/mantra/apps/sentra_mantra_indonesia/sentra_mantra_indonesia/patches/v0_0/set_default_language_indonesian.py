import frappe


def execute():
	"""Ganti bahasa UI ke Bahasa Indonesia (Chief, 2026-07-15).

	- System Settings.language = "id" -> default untuk sesi Guest dan semua
	  user baru.
	- User yang sudah ada dan masih memakai default lama ("en" atau kosong)
	  ikut dipindah ke "id". User yang kelak memilih bahasa lain sendiri
	  tidak akan tersentuh bila patch ini terulang di site lain (idempoten:
	  hanya menyentuh en/kosong).
	"""
	if not frappe.db.exists("Language", "id"):
		return
	frappe.db.set_single_value("System Settings", "language", "id")
	for user in frappe.get_all(
		"User", filters={"language": ("in", ("en", "", None))}, pluck="name"
	):
		frappe.db.set_value("User", user, "language", "id", update_modified=False)
