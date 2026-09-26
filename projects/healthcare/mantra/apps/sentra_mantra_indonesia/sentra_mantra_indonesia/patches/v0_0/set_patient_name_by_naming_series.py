import frappe


def execute():
	"""Companion set_patient_mrn_naming_series: docname Patient baru mengikuti
	naming series hanya bila Healthcare Settings.patient_name_by = "Naming
	Series" (healthcare patient.py autoname). Tanpa ini, docname = nama pasien
	dan format RM-.###### tidak pernah terpakai."""
	frappe.db.set_single_value("Healthcare Settings", "patient_name_by", "Naming Series")
