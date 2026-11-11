"""Melinda Maternal Workflows — fondasi tautan ibu-bayi (neonatal linkage).

RSIA: setiap kelahiran menghasilkan pasien neonatus yang harus tertaut ke pasien
ibunya untuk kelangsungan klinis (rekam bersama, billing maternal, indikator
mutu). `healthcare` bawaan tidak punya tautan ini — ditambahkan lewat Custom
Field `custom_ibu` pada Patient (patch v0_0.add_patient_maternal_link).

    # daftar bayi tertaut ke seorang ibu
    bench --site mantra.localhost execute \
        sentra_mantra_hospital.neonatal.babies_of --args "['<nama pasien ibu>']"
"""

import frappe

MATERNAL_FIELD = "custom_ibu"


def _require_patient(name: str | None, label: str) -> None:
	if not name or not frappe.db.exists("Patient", name):
		frappe.throw(f"Pasien {label} '{name}' tidak ada.")


def _assert_mother_female(mother: str) -> None:
	if frappe.db.get_value("Patient", mother, "sex") != "Female":
		frappe.throw("Pasien ibu harus berjenis kelamin Female.")


def link_to_mother(baby: str, mother: str) -> dict:
	"""Tautkan pasien `baby` ke pasien `mother`. Validasi: keduanya ada, berbeda,
	ibu Female, dan tidak membentuk siklus pada rantai ibu."""
	if baby == mother:
		frappe.throw("Bayi dan ibu tidak boleh pasien yang sama.")
	_require_patient(baby, "bayi")
	_require_patient(mother, "ibu")
	_assert_mother_female(mother)

	# cegah siklus: telusuri rantai ibu dari `mother` ke atas; tak boleh menyentuh `baby`
	cursor, seen = mother, set()
	while cursor:
		if cursor == baby:
			frappe.throw("Tautan ibu-bayi membentuk siklus.")
		if cursor in seen:
			break
		seen.add(cursor)
		cursor = frappe.db.get_value("Patient", cursor, MATERNAL_FIELD)

	frappe.db.set_value("Patient", baby, MATERNAL_FIELD, mother)
	return {"baby": baby, "mother": mother}


def create_neonate(mother: str, first_name: str, sex: str, **extra) -> str:
	"""Buat pasien neonatus baru yang langsung tertaut ke `mother`."""
	_require_patient(mother, "ibu")
	doc = frappe.new_doc("Patient")
	doc.first_name = first_name
	doc.sex = sex
	for key, value in extra.items():
		doc.set(key, value)
	doc.insert()
	link_to_mother(doc.name, mother)  # pakai ulang validasi (Female, beda, non-siklus)
	return doc.name


def babies_of(mother: str) -> list[str]:
	"""Daftar pasien neonatus yang tertaut ke `mother`."""
	return frappe.get_all("Patient", filters={MATERNAL_FIELD: mother}, pluck="name")


def mother_of(baby: str) -> str | None:
	"""Pasien ibu dari `baby`, atau None bila belum tertaut."""
	return frappe.db.get_value("Patient", baby, MATERNAL_FIELD) or None
