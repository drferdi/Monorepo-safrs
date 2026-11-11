"""PHI-free managerial visit aggregates from SATUSEHAT.

Counts only (`_count=0`, Bundle.total) — no resource body is ever fetched or
stored. Results are cached (per reference date) so a dashboard load does not
hammer the API: 17 queries per cache miss, none afterwards for CACHE_TTL.

Consumed by the workspace layer via a string attr path (ADR-0001: other custom
apps never import this app in Python).
"""

from __future__ import annotations

import json
from datetime import date, timedelta

import frappe
from frappe.utils import getdate

from sentra_mantra_integrations.satusehat.client import (
	SatuSehatClientError,
	SatuSehatConfigError,
	fhir_get,
	is_configured,
)

CACHE_KEY = "satusehat_visit_metrics"
PRACTITIONER_CACHE_KEY = "satusehat_practitioner_metrics"
QUALITY_CACHE_KEY = "satusehat_reporting_quality"
CACHE_TTL_SECONDS = 900
WEEKS = 8
MONTHS = 6


def _count_with(params: dict) -> int | None:
	bundle = fhir_get("Encounter", params=dict({"_count": 0}, **params))
	total = bundle.get("total")
	return int(total) if total is not None else None


def _count(date_param) -> int | None:
	return _count_with({"date": date_param})


def _week_windows(ref: date, weeks: int = WEEKS):
	monday = ref - timedelta(days=ref.weekday())
	return [
		(monday - timedelta(weeks=offset), monday - timedelta(weeks=offset - 1))
		for offset in range(weeks - 1, -1, -1)
	]


def _month_windows(ref: date, months: int = MONTHS):
	firsts = []
	year, month = ref.year, ref.month
	for _ in range(months):
		firsts.append(date(year, month, 1))
		month -= 1
		if month == 0:
			year, month = year - 1, 12
	firsts.reverse()
	windows = []
	for start in firsts:
		if start.month == 12:
			end = date(start.year + 1, 1, 1)
		else:
			end = date(start.year, start.month + 1, 1)
		windows.append((start, end))
	return windows


def visit_counts(ref_date=None) -> dict | None:
	"""{"today", "week", "month", "weekly": [...], "monthly": [...]} atau None.

	None berarti sumber tidak tersedia (belum dikonfigurasi / API menolak) —
	pemanggil tidak boleh merender nol palsu.
	"""
	if not is_configured():
		return None
	ref = getdate(ref_date) if ref_date else getdate()
	cache_key = f"{CACHE_KEY}:{ref.isoformat()}"
	cached = frappe.cache().get_value(cache_key)
	if cached:
		return json.loads(cached)

	monday = ref - timedelta(days=ref.weekday())
	first_of_month = ref.replace(day=1)
	try:
		data = {
			"today": _count(f"ge{ref.isoformat()}"),
			"week": _count(f"ge{monday.isoformat()}"),
			"month": _count(f"ge{first_of_month.isoformat()}"),
			"weekly": [
				{
					"start": start.isoformat(),
					"value": _count([f"ge{start.isoformat()}", f"lt{end.isoformat()}"]),
				}
				for start, end in _week_windows(ref)
			],
			"monthly": [
				{
					"year": start.year,
					"month": start.month,
					"value": _count([f"ge{start.isoformat()}", f"lt{end.isoformat()}"]),
				}
				for start, end in _month_windows(ref)
			],
		}
	except (SatuSehatClientError, SatuSehatConfigError):
		return None

	frappe.cache().set_value(cache_key, json.dumps(data), expires_in_sec=CACHE_TTL_SECONDS)
	return data


def practitioner_visit_counts(ref_date=None) -> dict | None:
	"""{"practitioners": [{"name", "month", "total"}, ...]} atau None.

	Sumber daftar dokter: Healthcare Practitioner aktif yang sudah punya binding
	`satusehat_ihs`. Tanpa binding -> None (bukan chart kosong); kegagalan API ->
	None (tidak pernah nol palsu). Filter `participant` sudah diverifikasi akurat
	terhadap sweep manual sebelum fungsi ini ditulis.
	"""
	if not is_configured():
		return None
	practitioners = frappe.get_all(
		"Healthcare Practitioner",
		filters={"satusehat_ihs": ("is", "set"), "status": "Active"},
		fields=["practitioner_name", "satusehat_ihs"],
		order_by="practitioner_name",
	)
	if not practitioners:
		return None
	ref = getdate(ref_date) if ref_date else getdate()
	cache_key = f"{PRACTITIONER_CACHE_KEY}:{ref.isoformat()}"
	cached = frappe.cache().get_value(cache_key)
	if cached:
		return json.loads(cached)

	first_of_month = ref.replace(day=1)
	try:
		rows = [
			{
				"name": p["practitioner_name"],
				"month": _count_with(
					{
						"participant": f"Practitioner/{p['satusehat_ihs']}",
						"date": f"ge{first_of_month.isoformat()}",
					}
				),
				"total": _count_with({"participant": f"Practitioner/{p['satusehat_ihs']}"}),
			}
			for p in practitioners
		]
	except (SatuSehatClientError, SatuSehatConfigError):
		return None

	data = {"practitioners": rows}
	frappe.cache().set_value(cache_key, json.dumps(data), expires_in_sec=CACHE_TTL_SECONDS)
	return data


def reporting_quality(ref_date=None) -> dict | None:
	"""{"total", "finished", "completeness_pct"} atau None.

	Persentase encounter yang benar-benar ditutup (status=finished) — indikator
	kualitas pelaporan; 77% data Melinda mandek di "arrived" (probe 2026-07-23),
	sehingga metrik turunannya (LOS, okupansi) hanya seakurat angka ini.
	"""
	if not is_configured():
		return None
	ref = getdate(ref_date) if ref_date else getdate()
	cache_key = f"{QUALITY_CACHE_KEY}:{ref.isoformat()}"
	cached = frappe.cache().get_value(cache_key)
	if cached:
		return json.loads(cached)

	try:
		total = _count_with({})
		finished = _count_with({"status": "finished"})
	except (SatuSehatClientError, SatuSehatConfigError):
		return None
	if not total:
		return None

	data = {
		"total": total,
		"finished": finished or 0,
		"completeness_pct": round((finished or 0) / total * 100, 1),
	}
	frappe.cache().set_value(cache_key, json.dumps(data), expires_in_sec=CACHE_TTL_SECONDS)
	return data
