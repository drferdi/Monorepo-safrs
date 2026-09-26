"""Blok operasional workspace "Pasien & Klinik" — zona Operasi lokal.

Manajemen RS hari ini: appointment, kapasitas unit, praktisi bertugas.
Bukan RME / charting klinis.

    bench --site mantra.localhost execute sentra_mantra_indonesia.ws_klinik.setup
"""

import frappe
from frappe.utils import today

from sentra_mantra_indonesia import clinic_workspace, ws_common

BLOCK_NAME = "Klinik Hari Ini RSIA"
WORKSPACE = "Pasien & Klinik"

ACTIONS = [
	{"label": "Buat Appointment", "desc": "Jadwalkan kunjungan hari ini", "route": "/app/patient-appointment/new"},
	{"label": "Unit Pelayanan", "desc": "Kapasitas bed & ruang", "route": "/app/healthcare-service-unit/view/tree"},
	{"label": "Jadwal Praktik", "desc": "Slot tenaga kesehatan", "route": "/app/practitioner-schedule"},
	{"label": "Daftar Appointment", "desc": "Semua janji hari ini", "route": f"/app/patient-appointment?appointment_date="},
]


def _live_count(doctype, filters):
	"""Return a real count, or None when the source query is unavailable."""
	try:
		return frappe.db.count(doctype, filters)
	except Exception:
		return None


def _on_duty_count():
	"""Count all distinct practitioners scheduled today; None means query failure."""
	try:
		return int(
			frappe.db.sql(
				"""
				select count(distinct hcp.name)
				from `tabPractitioner Service Unit Schedule` psus
				inner join `tabHealthcare Practitioner` hcp
					on hcp.name = psus.parent
				inner join `tabHealthcare Schedule Time Slot` slot
					on slot.parent = psus.schedule
					and slot.parenttype = 'Practitioner Schedule'
				where psus.parenttype = 'Healthcare Practitioner'
					and ifnull(psus.schedule, '') != ''
					and ifnull(hcp.status, 'Active') = 'Active'
					and slot.day = %s
				""",
				(ws_common.weekday_name(),),
			)[0][0]
		)
	except Exception:
		return None


def _bed_cards():
	"""Kapasitas unit layanan (bed) — omit bila field/izin tidak tersedia."""
	if not ws_common.can("Healthcare Service Unit"):
		return []
	try:
		occupied = frappe.db.count(
			"Healthcare Service Unit",
			{"occupancy_status": "Occupied", "is_group": 0},
		)
		vacant = frappe.db.count(
			"Healthcare Service Unit",
			{"occupancy_status": "Vacant", "is_group": 0},
		)
	except Exception:
		return []
	total = occupied + vacant
	cards = [
		{"value": occupied, "label": "Unit Terisi"},
		{"value": vacant, "label": "Unit Kosong"},
	]
	if total:
		pct = round(occupied / total * 100)
		cards.insert(
			0,
			{
				"value": f"{pct}%",
				"label": "Okupansi Unit",
				"sub": f"{occupied}/{total} terisi",
				"route": "/app/healthcare-service-unit/view/tree",
			},
		)
	return cards


def _cards():
	cards = []
	if ws_common.can("Patient Appointment"):
		appointments = _live_count(
			"Patient Appointment",
			{"appointment_date": today(), "status": ("!=", "Cancelled")},
		)
		if appointments is not None:
			cards.append({
				"value": appointments,
				"label": "Appointment Hari Ini",
				"route": "/app/patient-appointment",
			})
		waiting = _live_count(
			"Patient Appointment",
			{"appointment_date": today(), "status": "Checked In"},
		)
		if waiting is not None:
			cards.append({
				"value": waiting,
				"label": "Checked-in Hari Ini",
				"route": "/app/patient-appointment",
			})
	if ws_common.can("Patient Encounter"):
		encounters = _live_count("Patient Encounter", {"docstatus": 0})
		if encounters is not None:
			cards.append({
				"value": encounters,
				"label": "Encounter Belum Ditutup",
				"route": "/app/patient-encounter",
			})
	if ws_common.can("Healthcare Practitioner"):
		on_duty_count = _on_duty_count()
		if on_duty_count is not None:
			cards.append({
				"value": on_duty_count,
				"label": "Praktisi Bertugas",
				"route": "/app/healthcare-practitioner",
			})
	cards.extend(_bed_cards())
	return cards


def _appointments():
	if not ws_common.can("Patient Appointment"):
		return []
	# get_list (bukan get_all): baris berisi patient_name, jadi User Permission /
	# row-level restriction milik user harus tetap berlaku.
	try:
		rows = frappe.get_list(
			"Patient Appointment",
			filters={"appointment_date": today(), "status": ("!=", "Cancelled")},
			fields=["name", "appointment_time", "patient_name", "practitioner_name", "status"],
			order_by="appointment_time asc",
			limit=6,
		)
	except Exception:
		return []
	return [
		{
			"title": r.patient_name or r.name,
			"sub": " · ".join(filter(None, [r.practitioner_name, frappe._(r.status)])),
			"right": ws_common.hhmm(r.appointment_time) if r.appointment_time else "",
			"route": f"/app/patient-appointment/{r.name}",
		}
		for r in rows
	]


def on_duty_today(limit=12):
	"""Praktisi dengan slot Practitioner Schedule untuk hari ini.

	Permission-gated on Healthcare Practitioner (no ignore_permissions).
	Each item: title=nama, sub=unit layanan, right=jam, route=dokumen praktisi.
	"""
	if not ws_common.can("Healthcare Practitioner"):
		return []
	day = ws_common.weekday_name()
	try:
		rows = frappe.db.sql(
			"""
			select
				hcp.name as practitioner,
				coalesce(nullif(hcp.practitioner_name, ''), hcp.name) as title,
				hcp.employee as employee,
				psus.service_unit as service_unit,
				min(slot.from_time) as mulai,
				max(slot.to_time) as selesai
			from `tabPractitioner Service Unit Schedule` psus
			inner join `tabHealthcare Practitioner` hcp
				on hcp.name = psus.parent
			inner join `tabHealthcare Schedule Time Slot` slot
				on slot.parent = psus.schedule
				and slot.parenttype = 'Practitioner Schedule'
			where psus.parenttype = 'Healthcare Practitioner'
				and ifnull(psus.schedule, '') != ''
				and ifnull(hcp.status, 'Active') = 'Active'
				and slot.day = %s
			group by hcp.name, psus.service_unit
			order by mulai asc, title asc
			limit %s
			""",
			(day, limit),
			as_dict=True,
		)
	except Exception:
		return None

	items = []
	for r in rows:
		start, end = ws_common.hhmm(r.mulai), ws_common.hhmm(r.selesai)
		if not start or not end:
			continue
		# Directory page when Employee is linked; else Practitioner form (list Employee unchanged).
		route = (
			f"/app/profil-karyawan?emp={r.employee}"
			if r.employee
			else f"/app/healthcare-practitioner/{r.practitioner}"
		)
		items.append(
			{
				"title": r.title,
				# konsisten dengan kartu profil Beranda: tanpa sufiks abbr
				"sub": (r.service_unit or "").removesuffix(" - MEL"),
				"right": f"{start}–{end}",
				"route": route,
			}
		)
	return items


@frappe.whitelist()
def data():
	"""Ringkasan operasi lokal hari ini — permission-gated, tanpa PHI list di kartu."""
	on_duty = on_duty_today()
	day = today()
	actions = []
	for action in ACTIONS:
		item = dict(action)
		if item["route"].endswith("appointment_date="):
			item["route"] = f"/app/patient-appointment?appointment_date={day}"
		actions.append(item)
	panels = [
		{
			"title": "Agenda Appointment",
			"items": _appointments(),
			"empty": "Belum ada appointment hari ini di MANTRA.",
		}
	]
	if on_duty is not None:
		panels.append(
			{
				"title": "Praktisi Bertugas",
				"items": on_duty,
				"empty": "Belum ada jadwal praktik hari ini.",
			}
		)
	return {
		"cards": _cards(),
		"actions": actions,
		"panels": panels,
	}


def _block_html():
	# data-v memaksa browser/desk membuang cache HTML blok lama.
	html = ws_common.block_html("Klinik", None, actions_title="Aksi cepat")
	return html.replace(
		'<div class="rsia-ws">',
		'<div class="rsia-ws" data-v="klinik-2026-07-23b">',
		1,
	)


def inspect_block():
	"""Debug: isi HTML Custom HTML Block + payload data (tanpa PHI)."""
	import json

	html = frappe.db.get_value("Custom HTML Block", BLOCK_NAME, "html") or ""
	hits = frappe.db.sql(
		"""
		select name, private, modified
		from `tabCustom HTML Block`
		where html like %s or script like %s
		""",
		("%Operasi lokal%", "%Operasi lokal%"),
		as_dict=True,
	)
	payload = data()
	subs = [c.get("sub") for c in payload.get("cards") or [] if c.get("sub")]
	ws = frappe.get_doc("Workspace", WORKSPACE)
	content = json.loads(ws.content or "[]")
	return {
		"block": BLOCK_NAME,
		"block_modified": str(
			frappe.db.get_value("Custom HTML Block", BLOCK_NAME, "modified")
		),
		"has_operasi_lokal": "Operasi lokal" in html,
		"has_bar_tag": "rsia-bar-tag" in html,
		"html_head": html[:500],
		"other_hits": hits,
		"card_subs": subs,
		"card_labels": [c.get("label") for c in payload.get("cards") or []],
		"workspace_block_types": [
			(b.get("type"), (b.get("data") or {}).get("custom_block_name") or (b.get("data") or {}).get("number_card_name"))
			for b in content
		],
	}


def setup():
	"""Simpan blok HTML; tidak di-inject ke workspace (disembunyikan dari konten)."""
	ws_common.upsert_block(
		BLOCK_NAME,
		_block_html(),
		ws_common.block_script("sentra_mantra_indonesia.ws_klinik.data"),
		ws_common.BLOCK_STYLE,
	)
	layout = clinic_workspace.apply()
	frappe.db.commit()
	frappe.clear_cache()
	return {
		"block": BLOCK_NAME,
		"workspace": WORKSPACE,
		"layout": layout,
		"on_workspace": False,
	}
