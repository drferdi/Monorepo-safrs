"""Generator siklus pelaporan (FR-01) — fail-closed.

Hanya Report Card berstatus Aktif dengan frekuensi Bulanan/Triwulanan/Tahunan
yang menghasilkan siklus. Perlu Verifikasi / Retired: tidak pernah. Harian dan
Event-based: dibuat manual (harian = rekap bulanan di MVP).
"""

from __future__ import annotations

import datetime

import frappe
from frappe.utils import add_days, get_first_day, get_last_day, getdate

_SCHEDULABLE = ("Bulanan", "Triwulanan", "Tahunan")


def period_for(frekuensi, reference_date=None):
	"""(periode_label, period_start, period_end) untuk periode berjalan; None bila tak terjadwal."""
	if frekuensi not in _SCHEDULABLE:
		return None
	ref = getdate(reference_date)
	if frekuensi == "Bulanan":
		return (ref.strftime("%Y-%m"), get_first_day(ref), get_last_day(ref))
	if frekuensi == "Triwulanan":
		quarter = (ref.month - 1) // 3 + 1
		start = datetime.date(ref.year, 3 * quarter - 2, 1)
		end = get_last_day(datetime.date(ref.year, 3 * quarter, 1))
		return (f"{ref.year}-Q{quarter}", start, end)
	start = datetime.date(ref.year, 1, 1)
	return (str(ref.year), start, datetime.date(ref.year, 12, 31))


def generate_cycles(reference_date=None) -> list[str]:
	"""Buat siklus periode berjalan untuk semua card Aktif; return nama cycle baru."""
	created = []
	cards = frappe.get_all(
		"Sentra Report Card",
		filters={"status": "Aktif", "frekuensi": ("in", _SCHEDULABLE)},
		fields=["name", "frekuensi", "tenggat_internal_hari", "deadline_eksternal_hari"],
	)
	for card in cards:
		period = period_for(card.frekuensi, reference_date)
		if not period:
			continue
		label, start, end = period
		if frappe.db.exists(
			"Sentra Report Cycle", {"report_card": card.name, "periode_label": label}
		):
			continue
		doc = frappe.get_doc(
			{
				"doctype": "Sentra Report Cycle",
				"report_card": card.name,
				"periode_label": label,
				"period_start": start,
				"period_end": end,
				"tenggat_internal": add_days(end, card.tenggat_internal_hari or 5),
				"deadline_eksternal": add_days(end, card.deadline_eksternal_hari or 10),
				"status": "Dibuka",
			}
		)
		doc.insert(ignore_permissions=True)
		created.append(doc.name)
	return created


def backfill_cycles(reference_date) -> list[str]:
	"""Buat siklus untuk periode LAMPAU yang terlewat (recovery manual).

	Scheduler harian hanya membuat siklus periode berjalan; kalau site mati,
	scheduler nonaktif, atau card baru diaktifkan terlambat, periode yang sudah
	lewat TIDAK pernah dibuat ulang otomatis. Operator memanggil ini dengan
	tanggal di dalam periode yang hilang, satu periode per pemanggilan:

	    bench --site mantra.localhost execute \\
	        sentra_mantra_indonesia.pelaporan_cycles.backfill_cycles \\
	        --kwargs "{'reference_date': '2026-05-15'}"

	Dedup periode di generate_cycles tetap berlaku, jadi aman diulang.
	"""
	created = generate_cycles(reference_date)
	frappe.db.commit()
	return created


def scheduled_generate():
	"""Entrypoint scheduler harian (periode berjalan saja — lihat backfill_cycles)."""
	generate_cycles()
	frappe.db.commit()
