"""Encounter insights — satu sweep harian, tiga keluaran agregat (nol PHI).

Sekali sehari seluruh Encounter organisasi dibaca berhalaman (200/halaman),
lalu dihitung di memori: pola hari/jam kunjungan, pasien baru vs lama per
bulan, dan lama rawat inap. Referensi pasien dipakai HANYA di memori untuk
menandai kunjungan pertama — tidak pernah disimpan, di-log, atau dikembalikan;
keluaran murni angka agregat. Sumber gagal -> None (tidak pernah nol palsu).

Diverifikasi sebelum ditulis (probe 2026-07-23): period.start selalu ada,
period.end ada pada encounter inap berstatus finished, subject.reference ada
di setiap encounter.
"""

from __future__ import annotations

import json
from datetime import date, datetime

import frappe
from frappe.utils import getdate

from sentra_mantra_integrations.satusehat.client import (
	SatuSehatClientError,
	SatuSehatConfigError,
	fhir_get,
	fhir_get_absolute,
	is_configured,
)

CACHE_KEY = "satusehat_encounter_insights"
CACHE_TTL_SECONDS = 86400  # sweep 33+ halaman — cukup sekali sehari
PAGE_SIZE = 200
MAX_PAGES = 60
NVR_MONTHS = 6
SECONDS_PER_DAY = 86400.0


def _sweep_encounters() -> list[dict]:
	"""Seluruh encounter organisasi -> baris ringkas {start, end, class, subject, status}."""
	rows: list[dict] = []
	bundle = fhir_get("Encounter", params={"_count": PAGE_SIZE})
	pages = 0
	while True:
		pages += 1
		for entry in bundle.get("entry") or []:
			resource = entry.get("resource") or {}
			period = resource.get("period") or {}
			rows.append(
				{
					"start": period.get("start"),
					"end": period.get("end"),
					"class": (resource.get("class") or {}).get("code"),
					"subject": (resource.get("subject") or {}).get("reference"),
					"status": resource.get("status"),
				}
			)
		next_links = [
			link.get("url")
			for link in (bundle.get("link") or [])
			if link.get("relation") == "next"
		]
		if not next_links or pages >= MAX_PAGES:
			return rows
		bundle = fhir_get_absolute(next_links[0])


def _parse_start(row: dict) -> datetime | None:
	try:
		return datetime.fromisoformat(row.get("start") or "")
	except ValueError:
		return None


def _time_patterns(rows: list[dict]) -> dict:
	day_of_week = [0] * 7
	hour_of_day = [0] * 24
	for row in rows:
		start = _parse_start(row)
		if not start:
			continue
		day_of_week[start.weekday()] += 1
		hour_of_day[start.hour] += 1
	return {"day_of_week": day_of_week, "hour_of_day": hour_of_day}


def _month_keys(ref: date, months: int) -> list[tuple[int, int]]:
	keys = []
	year, month = ref.year, ref.month
	for _ in range(months):
		keys.append((year, month))
		month -= 1
		if month == 0:
			year, month = year - 1, 12
	keys.reverse()
	return keys


def _new_vs_returning(rows: list[dict], ref: date, months: int = NVR_MONTHS) -> list[dict]:
	"""Per bulan: pasien yang kunjungan PERTAMA-nya jatuh di bulan itu = baru."""
	first_seen: dict[str, datetime] = {}
	dated = []
	for row in rows:
		start = _parse_start(row)
		subject = row.get("subject")
		if not start or not subject:
			continue
		dated.append((subject, start))
		if subject not in first_seen or start < first_seen[subject]:
			first_seen[subject] = start
	buckets = {key: {"new": set(), "returning": set()} for key in _month_keys(ref, months)}
	for subject, start in dated:
		key = (start.year, start.month)
		if key not in buckets:
			continue
		first = first_seen[subject]
		kind = "new" if (first.year, first.month) == key else "returning"
		buckets[key][kind].add(subject)
	return [
		{
			"year": year,
			"month": month,
			"new": len(buckets[(year, month)]["new"]),
			"returning": len(buckets[(year, month)]["returning"]),
		}
		for year, month in _month_keys(ref, months)
	]


def _inpatient(rows: list[dict]) -> dict:
	los_days = []
	active = 0
	for row in rows:
		if row.get("class") != "IMP":
			continue
		if row.get("status") == "in-progress":
			active += 1
		start = _parse_start(row)
		if not start or not row.get("end") or row.get("status") != "finished":
			continue
		try:
			end = datetime.fromisoformat(row["end"])
		except ValueError:
			continue
		los_days.append((end - start).total_seconds() / SECONDS_PER_DAY)
	return {
		"avg_los_days": round(sum(los_days) / len(los_days), 1) if los_days else None,
		"finished": len(los_days),
		"active": active,
	}


def encounter_insights(ref_date=None) -> dict | None:
	"""{"day_of_week", "hour_of_day", "new_vs_returning", "inpatient"} atau None."""
	if not is_configured():
		return None
	ref = getdate(ref_date) if ref_date else getdate()
	cache_key = f"{CACHE_KEY}:{ref.isoformat()}"
	cached = frappe.cache().get_value(cache_key)
	if cached:
		return json.loads(cached)

	try:
		rows = _sweep_encounters()
	except (SatuSehatClientError, SatuSehatConfigError):
		return None

	data = {
		**_time_patterns(rows),
		"new_vs_returning": _new_vs_returning(rows, ref),
		"inpatient": _inpatient(rows),
	}
	frappe.cache().set_value(cache_key, json.dumps(data), expires_in_sec=CACHE_TTL_SECONDS)
	return data
