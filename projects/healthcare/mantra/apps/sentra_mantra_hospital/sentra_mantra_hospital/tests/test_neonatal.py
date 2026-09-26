"""Fondasi tautan ibu-bayi (Melinda Maternal Workflows).

Semua Patient di sini sintetik (FrappeTestCase rollback per test) — nol data
nyata/PHI. Menguji integritas tautan, bukan alur klinis penuh.
"""

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_hospital.neonatal import (
	MATERNAL_FIELD,
	babies_of,
	create_neonate,
	link_to_mother,
	mother_of,
)


def _patient(first_name: str, sex: str) -> str:
	doc = frappe.new_doc("Patient")
	doc.first_name = first_name
	doc.sex = sex
	doc.insert()
	return doc.name


class TestNeonatalLinkage(FrappeTestCase):
	def test_create_neonate_links_to_mother(self):
		mom = _patient("Ibu Uji", "Female")
		baby = create_neonate(mom, "Bayi Uji", "Male")
		self.assertEqual(mother_of(baby), mom)
		self.assertIn(baby, babies_of(mom))

	def test_multiple_babies_same_mother(self):
		mom = _patient("Ibu Kembar", "Female")
		b1 = create_neonate(mom, "Kembar 1", "Female")
		b2 = create_neonate(mom, "Kembar 2", "Male")
		self.assertEqual(set(babies_of(mom)), {b1, b2})

	def test_link_rejects_self(self):
		p = _patient("Solo", "Female")
		with self.assertRaises(frappe.ValidationError):
			link_to_mother(p, p)

	def test_link_rejects_non_female_mother(self):
		dad = _patient("Ayah", "Male")
		baby = _patient("Bayi", "Female")
		with self.assertRaises(frappe.ValidationError):
			link_to_mother(baby, dad)

	def test_link_rejects_missing_patient(self):
		real = _patient("Ada", "Female")
		with self.assertRaises(frappe.ValidationError):
			link_to_mother("Tidak Ada XYZ", real)

	def test_link_rejects_cycle(self):
		a = _patient("A", "Female")
		b = _patient("B", "Female")
		link_to_mother(b, a)  # ibu dari b = a
		with self.assertRaises(frappe.ValidationError):
			link_to_mother(a, b)  # ibu dari a = b -> siklus

	def test_field_present_after_migrate(self):
		# Custom Field dari patch harus ada (migrate sudah jalan sebelum test).
		self.assertTrue(frappe.db.exists("Custom Field", {"dt": "Patient", "fieldname": MATERNAL_FIELD}))
