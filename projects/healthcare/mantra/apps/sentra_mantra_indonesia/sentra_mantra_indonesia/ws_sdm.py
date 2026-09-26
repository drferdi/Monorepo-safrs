"""Blok operasional workspace "SDM" — coverage & kepatuhan kepegawaian.

Kartu rasio hadir, papan shift per unit, alert STR/SIP & IHS, cuti bentrok.
Permission-gated; tanpa PHI.

    bench --site mantra.localhost execute sentra_mantra_indonesia.ws_sdm.setup
"""

from __future__ import annotations

import frappe
from frappe.utils import add_days, date_diff, getdate, today

from sentra_mantra_indonesia import ws_common

BLOCK_NAME = "SDM Hari Ini RSIA"
WORKSPACE = "SDM"

ACTIONS = [
	{"label": "Data Karyawan", "desc": "Master pegawai", "route": "/app/employee"},
	{"label": "Direktori Profil", "desc": "Cari per unit", "route": "/app/profil-karyawan"},
	{"label": "Kehadiran", "desc": "Rekap hari ini", "route": "/app/attendance"},
	{"label": "Penugasan Shift", "desc": "Roster per unit", "route": "/app/shift-assignment"},
	{"label": "Ajukan Cuti", "desc": "Pengajuan baru", "route": "/app/leave-application/new"},
	{"label": "Praktisi & IHS", "desc": "Binding SATUSEHAT", "route": "/app/healthcare-practitioner"},
]


def _shift_aktif():
	try:
		return int(
			frappe.db.sql(
				"""select count(name) from `tabShift Assignment`
				where docstatus = 1 and status = 'Active' and start_date <= %s
				and (end_date is null or end_date >= %s)""",
				(today(), today()),
			)[0][0]
			or 0
		)
	except Exception:
		return None


def _cards():
	cards = []
	aktif = hadir = None
	if ws_common.can("Employee"):
		aktif = ws_common.count("Employee", {"status": "Active"})
		cards.append(
			{"value": aktif, "label": "Karyawan Aktif", "route": "/app/employee"}
		)
	if ws_common.can("Attendance"):
		hadir = ws_common.count(
			"Attendance",
			{
				"attendance_date": today(),
				"docstatus": ("<", 2),
				# Baris Absent/On Leave ikut tercatat hari ini — bukan "hadir" (C3-F4).
				"status": ("in", ("Present", "Half Day", "Work From Home")),
			},
		)
		cards.append(
			{
				"value": hadir,
				"label": "Hadir Hari Ini",
				"route": "/app/attendance",
			}
		)
	if aktif is not None and hadir is not None and aktif > 0:
		pct = round(hadir / aktif * 100)
		gap = max(0, aktif - hadir)
		cards.append(
			{
				"value": f"{pct}%",
				"label": "Rasio Hadir",
				"sub": f"{hadir}/{aktif} tercatat",
			}
		)
		cards.append(
			{
				"value": gap,
				"label": "Absen Tanpa Keterangan",
				"sub": "Aktif − hadir hari ini",
			}
		)
	if ws_common.can("Leave Application"):
		cards.append(
			{
				"value": ws_common.count(
					"Leave Application", {"status": "Open", "docstatus": 0}
				),
				"label": "Cuti Menunggu",
				"route": "/app/leave-application",
			}
		)
	if ws_common.can("Shift Assignment"):
		n = _shift_aktif()
		if n is not None:
			cards.append(
				{
					"value": n,
					"label": "Shift Aktif",
					"route": "/app/shift-assignment",
				}
			)
	return cards, aktif, hadir


def _credential_alerts():
	"""STR/SIP ≤90 hari + praktisi tanpa IHS — omit bila tidak berizin."""
	if not ws_common.can("Healthcare Practitioner"):
		return []
	items = []
	day = getdate(today())
	try:
		rows = frappe.db.sql(
			"""
			select name, practitioner_name, str_expiry, sip_expiry, satusehat_ihs
			from `tabHealthcare Practitioner`
			where ifnull(status, 'Active') = 'Active'
			""",
			as_dict=True,
		)
	except Exception:
		return []

	expiring = []
	no_ihs = 0
	for r in rows:
		r = frappe._dict(r)
		for field, label in (("str_expiry", "STR"), ("sip_expiry", "SIP")):
			exp = r.get(field)
			if not exp:
				continue
			sisa = date_diff(getdate(exp), day)
			if sisa <= 90:
				expiring.append((sisa, r.practitioner_name or r.name, label, r.name))
		if not (r.get("satusehat_ihs") or "").strip():
			name = (r.practitioner_name or "") or ""
			if name.lower().startswith("dr"):
				no_ihs += 1

	expiring.sort(key=lambda x: x[0])
	for sisa, pname, label, prac_id in expiring[:6]:
		tone = "kedaluwarsa" if sisa < 0 else f"{sisa} hari"
		items.append(
			{
				"title": f"{pname} · {label} {tone}",
				"sub": "Kredensial praktisi",
				"route": f"/app/healthcare-practitioner/{prac_id}",
			}
		)
	if no_ihs:
		items.append(
			{
				"title": f"{no_ihs} dokter belum binding IHS SATUSEHAT",
				"sub": "Diperlukan untuk metrik pelaporan",
				"route": "/app/healthcare-practitioner",
			}
		)
	return items


def _attention(aktif, hadir):
	items = []
	if ws_common.can("Leave Application"):
		n = ws_common.count("Leave Application", {"status": "Open", "docstatus": 0})
		if n:
			items.append(
				{
					"title": f"{n} pengajuan cuti menunggu persetujuan",
					"route": "/app/leave-application",
				}
			)
	if aktif is not None and hadir is not None and aktif - hadir > 0:
		items.append(
			{
				"title": f"{aktif - hadir} pegawai belum tercatat kehadirannya",
				"route": "/app/attendance",
			}
		)
	if ws_common.can("Employee"):
		n = ws_common.count(
			"Employee",
			{
				"status": "Active",
				"contract_end_date": ("between", [today(), add_days(today(), 30)]),
			},
		)
		if n:
			items.append(
				{
					"title": f"{n} kontrak kerja berakhir dalam 30 hari",
					"route": "/app/employee",
				}
			)
	items.extend(_credential_alerts())
	return items


def _shift_board():
	"""Siapa bertugas per unit (department) hari ini."""
	if not ws_common.can("Shift Assignment"):
		return []
	try:
		rows = frappe.db.sql(
			"""
			select
				ifnull(nullif(e.department, ''), 'Tanpa Unit') as unit,
				sa.shift_type,
				count(sa.name) as n
			from `tabShift Assignment` sa
			inner join `tabEmployee` e on e.name = sa.employee
			where sa.docstatus = 1 and sa.status = 'Active'
				and sa.start_date <= %s
				and (sa.end_date is null or sa.end_date >= %s)
			group by unit, sa.shift_type
			order by n desc, unit asc
			limit 12
			""",
			(today(), today()),
			as_dict=True,
		)
	except Exception:
		return []
	return [
		{
			"title": (r.unit or "").removesuffix(" - MEL"),
			"sub": r.shift_type,
			"right": f"{r.n} orang",
		}
		for r in rows
	]


def _leave_overlap_by_dept():
	"""Departemen dengan >1 cuti overlapping hari ini (risiko coverage)."""
	if not ws_common.can("Leave Application"):
		return []
	try:
		rows = frappe.db.sql(
			"""
			select
				ifnull(nullif(e.department, ''), 'Tanpa Unit') as unit,
				count(la.name) as n
			from `tabLeave Application` la
			inner join `tabEmployee` e on e.name = la.employee
			where la.docstatus < 2
				and la.status in ('Open', 'Approved')
				and la.from_date <= %s and la.to_date >= %s
			group by unit
			having n > 1
			order by n desc
			limit 8
			""",
			(today(), today()),
			as_dict=True,
		)
	except Exception:
		return []
	return [
		{
			"title": (r.unit or "").removesuffix(" - MEL"),
			"sub": "Cuti overlapping hari ini",
			"right": f"{r.n} orang",
		}
		for r in rows
	]


def _quick_people():
	"""Pintasan ke profil/jobdesk — sampel kepala unit / designation struktural."""
	if not ws_common.can("Employee"):
		return []
	try:
		rows = frappe.db.sql(
			"""
			select name, employee_name, designation, department
			from `tabEmployee`
			where status = 'Active'
				and (
					designation like 'Direktur%%'
					or designation like 'WADIR%%'
					or designation like 'Wakil Direktur%%'
					or designation like 'Kepala%%'
				)
			order by designation asc
			limit 8
			""",
			as_dict=True,
		)
	except Exception:
		return []
	return [
		{
			"title": r.employee_name or r.name,
			"sub": " · ".join(
				filter(
					None,
					[
						r.designation,
						(r.department or "").removesuffix(" - MEL") or None,
					],
				)
			),
			"right": "Profil",
			"route": f"/app/profil-karyawan?emp={r.name}",
		}
		for r in rows
	]


@frappe.whitelist()
def data():
	"""Ringkasan SDM hari ini — semua angka dijaga permission."""
	cards, aktif, hadir = _cards()
	return {
		"cards": cards,
		"actions": ACTIONS,
		"panels": [
			{
				"title": "Perlu Perhatian",
				"items": _attention(aktif, hadir),
				"empty": "Tidak ada hal yang membutuhkan perhatian.",
			},
			{
				"title": "Papan Shift per Unit",
				"items": _shift_board(),
				"empty": "Belum ada penugasan shift aktif hari ini.",
			},
			{
				"title": "Cuti Overlapping per Unit",
				"items": _leave_overlap_by_dept(),
				"empty": "Tidak ada bentrok cuti antar unit hari ini.",
			},
			{
				"title": "Direktori Struktural",
				"items": _quick_people(),
				"empty": "Belum ada jabatan struktural terdata.",
			},
		],
		"note": {
			"title": "Penggajian — Dalam Persiapan",
			"desc": "Konfigurasi payroll belum diaktifkan. Modul dibuka setelah data karyawan & kehadiran stabil.",
		},
	}


def setup():
	# Layout komponen sama dengan Keuangan/ws_common (Chief: jangan desain SDM khusus).
	ws_common.upsert_block(
		BLOCK_NAME,
		ws_common.block_html("SDM", "Kepegawaian"),
		ws_common.block_script("sentra_mantra_indonesia.ws_sdm.data"),
		ws_common.BLOCK_STYLE,
	)
	ws_common.slim_to_block(WORKSPACE, BLOCK_NAME, "rsiaSdmHariIni")
	frappe.db.commit()
	return {"block": BLOCK_NAME, "workspace": WORKSPACE, "layout": "block-only"}
