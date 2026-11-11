"""Halaman direktori "Profil Karyawan" — kartu manajemen orang (bukan mini-EMR).

Endpoint whitelisted untuk Frappe Page /app/profil-karyawan?emp=<id>.
Reuse home_profile._badge_for dan _cred_sub. Directory searchable per unit.
"""

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import today

from sentra_mantra_indonesia.home_profile import _badge_for, _cred_sub, _sisa_cuti
from sentra_mantra_indonesia.jobdesk import get_jobdesk
from sentra_mantra_indonesia.ws_common import schedule_hours_text, weekday_name

# Explicit allow-list — anything else must never be returned.
_EMP_FIELDS = (
	"name",
	"employee_name",
	"image",
	"designation",
	"department",
	"branch",
	"status",
	"user_id",
	"default_shift",
)


def _require_system_user():
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(_("Login diperlukan untuk melihat profil karyawan."), frappe.PermissionError)
	user_type = frappe.db.get_value("User", user, "user_type")
	if user_type != "System User":
		frappe.throw(_("Hanya pengguna desk yang boleh melihat direktori karyawan."), frappe.PermissionError)


def _may_view_cuti(emp) -> bool:
	"""Sisa cuti hanya untuk karyawan ybs. sendiri atau role HR (fail-closed).

	Kebijakan pelonggaran (mis. terlihat semua karyawan) = keputusan Chief;
	sampai ada keputusan itu, default tertutup (review C3-F3).
	"""
	user = frappe.session.user
	if emp.get("user_id") and emp.user_id == user:
		return True
	try:
		return bool({"HR Manager", "HR User", "System Manager"} & set(frappe.get_roles()))
	except Exception:
		return False


def _split_name(full_name: str | None, fallback: str | None):
	raw = (full_name or fallback or "").strip()
	if not raw:
		return "", None
	parts = raw.split(",", 1)
	main = parts[0].strip()
	suffix = parts[1].strip() if len(parts) > 1 else None
	return main, suffix or None


def _presence_for(user_id: str | None):
	"""Profil Publik links already saved on User (same source as Beranda)."""
	if not user_id:
		return []
	out = []
	for row in frappe.get_all(
		"Sentra Profil Link",
		filters={
			"parent": user_id,
			"parenttype": "User",
			"parentfield": "sentra_profil_links",
		},
		fields=["platform", "label", "url"],
		order_by="idx asc",
	):
		url = (row.url or "").strip()
		if url.lower().startswith(("https://", "http://")):
			out.append({"platform": row.platform, "label": row.label, "url": url})
	return out


@frappe.whitelist()
def data(employee: str | None = None):
	"""Directory payload for one Employee — public/directory fields only.

	Mirrors identity + credentials + Profil Publik already entered in details;
	never returns NIK, alamat, kontak, or account controls. Sisa cuti hanya
	dikembalikan untuk karyawan ybs. sendiri atau pemegang role HR.
	"""
	_require_system_user()
	emp_name = (employee or "").strip()
	if not emp_name:
		frappe.throw(_("Parameter karyawan wajib diisi."))

	emp = frappe.db.get_value("Employee", emp_name, _EMP_FIELDS, as_dict=True)
	if not emp:
		frappe.throw(_("Karyawan tidak ditemukan."), frappe.ValidationError)

	full_name = None
	user_image = None
	if emp.user_id:
		udoc = frappe.db.get_value(
			"User", emp.user_id, ["full_name", "user_image"], as_dict=True
		) or frappe._dict()
		full_name = udoc.full_name
		user_image = udoc.user_image

	name_main, name_suffix = _split_name(full_name, emp.employee_name)
	dept = (emp.department or "").removesuffix(" - MEL") or None

	out = {
		"employee": emp.name,
		"image": emp.image or user_image,
		"name_main": name_main,
		"name_suffix": name_suffix,
		"designation": emp.designation,
		"rank_badge": _badge_for(emp.designation),
		"department": dept,
		"branch": emp.branch,
		"status": emp.status,
		"is_clinical": False,
		"presence": _presence_for(emp.user_id),
	}

	prac = frappe.db.get_value(
		"Healthcare Practitioner",
		{"employee": emp.name},
		["name", "str_no", "sip_no", "str_expiry", "sip_expiry"],
		as_dict=True,
	)
	if not prac and emp.user_id:
		prac = frappe.db.get_value(
			"Healthcare Practitioner",
			{"user_id": emp.user_id},
			["name", "str_no", "sip_no", "str_expiry", "sip_expiry"],
			as_dict=True,
		)

	if prac and prac.name:
		out["is_clinical"] = True
		out["str_no"] = prac.str_no or None
		out["sip_no"] = prac.sip_no or None
		out["str_status"] = _cred_sub(prac.get("str_expiry"))
		out["sip_status"] = _cred_sub(prac.get("sip_expiry"))
		out["jadwal_praktik"] = schedule_hours_text(
			frappe.get_all(
				"Practitioner Service Unit Schedule",
				filters={"parent": prac.name, "parenttype": "Healthcare Practitioner"},
				pluck="schedule",
			)
			or [],
			weekday_name(),
		) or "Tidak ada jadwal"

	# Shift hari ini (assignment aktif)
	out["shift_today"] = _shift_today(emp.name) or emp.get("default_shift")

	# Sisa cuti — angka agregat saja (bukan riwayat cuti mentah),
	# dan hanya untuk diri sendiri / HR.
	if _may_view_cuti(emp):
		try:
			# _detail (bukan `_`): nama `_` akan men-shadow fungsi translasi
			# frappe dan membuat frappe.throw(_(...)) di atas UnboundLocalError.
			sisa, sub, _detail = _sisa_cuti(emp.name)
			out["sisa_cuti"] = sisa
			out["sisa_cuti_sub"] = sub
		except Exception:
			out["sisa_cuti"] = None

	out["jobdesk"] = get_jobdesk(emp.designation)
	return out


def _shift_today(employee: str) -> str | None:
	try:
		row = frappe.db.sql(
			"""
			select shift_type from `tabShift Assignment`
			where employee = %s and docstatus = 1 and status = 'Active'
				and start_date <= %s
				and (end_date is null or end_date >= %s)
			order by modified desc limit 1
			""",
			(employee, today(), today()),
		)
		return row[0][0] if row else None
	except Exception:
		return None


@frappe.whitelist()
def search_directory(department: str | None = None, q: str | None = None):
	"""Direktori searchable per departemen — untuk kepala unit."""
	_require_system_user()
	filters = {"status": "Active"}
	dept = (department or "").strip()
	if dept:
		filters["department"] = ("like", f"%{dept}%")
	query = (q or "").strip()
	or_filters = None
	if query:
		or_filters = [
			["employee_name", "like", f"%{query}%"],
			["name", "like", f"%{query}%"],
			["designation", "like", f"%{query}%"],
		]
	try:
		rows = frappe.get_all(
			"Employee",
			filters=filters,
			or_filters=or_filters,
			fields=["name", "employee_name", "designation", "department"],
			order_by="department asc, employee_name asc",
			limit_page_length=40,
		)
	except Exception:
		return {"items": []}
	return {
		"items": [
			{
				"employee": r.name,
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
				"route": f"/app/profil-karyawan?emp={r.name}",
			}
			for r in rows
		]
	}
