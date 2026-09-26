"""Check-in desk sederhana: login → satu tombol → timestamp (Employee Checkin).

Hanya untuk Employee yang tertaut akun login; tidak boleh absen atas nama orang lain.
Setelah punch, juga menulis Attendance hari itu (status Present) agar muncul di
menu Kehadiran — auto-attendance Shift Type sengaja off di setup RSIA.
"""

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import format_datetime, get_datetime, getdate, now_datetime


def _my_employee() -> str | None:
	user = frappe.session.user
	if not user or user == "Guest":
		return None
	return frappe.db.get_value(
		"Employee",
		{"user_id": user, "status": "Active"},
		"name",
	)


def _last_checkin(employee: str):
	return frappe.db.get_value(
		"Employee Checkin",
		{"employee": employee},
		["name", "log_type", "time"],
		order_by="time desc",
		as_dict=True,
	)


def _ensure_attendance_present(employee: str, when) -> dict:
	"""Upsert Attendance Present for the punch date so Kehadiran list shows it."""
	day = getdate(when)
	existing = frappe.db.get_value(
		"Attendance",
		{"employee": employee, "attendance_date": day, "docstatus": ("<", 2)},
		["name", "status", "docstatus"],
		as_dict=True,
	)
	if existing:
		if existing.docstatus == 0 and existing.status != "Present":
			frappe.db.set_value("Attendance", existing.name, "status", "Present")
		return {"attendance": existing.name, "created": False, "status": "Present"}

	company = frappe.db.get_value("Employee", employee, "company")
	doc = frappe.get_doc(
		{
			"doctype": "Attendance",
			"employee": employee,
			"attendance_date": day,
			"status": "Present",
			"company": company,
		}
	)
	doc.insert(ignore_permissions=True)
	doc.submit()
	return {"attendance": doc.name, "created": True, "status": doc.status}


def status_payload():
	"""Status absensi untuk kartu Beranda (tanpa throw)."""
	if frappe.session.user == "Guest":
		return {"ok": False, "reason": "login"}
	emp = _my_employee()
	if not emp:
		return {
			"ok": False,
			"reason": "no_employee",
			"message": _("Akun belum tertaut data Karyawan. Hubungi SDM."),
		}
	last = _last_checkin(emp)
	next_type = "IN"
	if last and last.log_type == "IN":
		next_type = "OUT"
	att_today = frappe.db.get_value(
		"Attendance",
		{"employee": emp, "attendance_date": frappe.utils.today(), "docstatus": ("<", 2)},
		["name", "status"],
		as_dict=True,
	)
	return {
		"ok": True,
		"employee": emp,
		"next_type": next_type,
		"button_label": _("Check-in") if next_type == "IN" else _("Check-out"),
		"last_type": last.log_type if last else None,
		"last_time": format_datetime(last.time) if last and last.time else None,
		"last_time_raw": str(get_datetime(last.time)) if last and last.time else None,
		"attendance_today": att_today.name if att_today else None,
		"attendance_status": att_today.status if att_today else None,
	}


@frappe.whitelist()
def status():
	if frappe.session.user == "Guest":
		frappe.throw(_("Login diperlukan."), frappe.PermissionError)
	return status_payload()


@frappe.whitelist()
def punch():
	"""Satu tombol: IN jika terakhir OUT/kosong, OUT jika terakhir IN."""
	if frappe.session.user == "Guest":
		frappe.throw(_("Login diperlukan."), frappe.PermissionError)
	emp = _my_employee()
	if not emp:
		frappe.throw(_("Akun belum tertaut data Karyawan. Hubungi SDM."))

	last = _last_checkin(emp)
	log_type = "OUT" if last and last.log_type == "IN" else "IN"
	when = now_datetime().replace(microsecond=0)

	doc = frappe.get_doc(
		{
			"doctype": "Employee Checkin",
			"employee": emp,
			"log_type": log_type,
			"time": when,
			"device_id": "desk-beranda",
		}
	)
	# Hanya absen diri sendiri (emp dari session) — bukan atas nama orang lain.
	doc.insert(ignore_permissions=True)

	# Kehadiran list reads Attendance, not Employee Checkin (auto-attendance off).
	att_info = _ensure_attendance_present(emp, when)

	frappe.db.commit()

	return {
		"ok": True,
		"employee": emp,
		"log_type": log_type,
		"time": format_datetime(when),
		"time_raw": str(when),
		"name": doc.name,
		"attendance": (att_info or {}).get("attendance"),
		"next_type": "OUT" if log_type == "IN" else "IN",
		"button_label": _("Check-out") if log_type == "IN" else _("Check-in"),
	}
