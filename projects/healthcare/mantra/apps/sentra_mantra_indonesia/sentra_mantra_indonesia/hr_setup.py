"""Setup HR Indonesia untuk RSIA Melinda (Chief GO "pakai default", 2026-07-15).

Default mengikuti UU 13/2003 + SKB 3 Menteri No. 1497/2/5 Tahun 2025
(libur nasional & cuti bersama 2026). Semua fungsi idempoten — aman
dijalankan berulang.

    bench --site mantra.localhost execute sentra_mantra_indonesia.hr_setup.setup
    bench --site mantra.localhost execute sentra_mantra_indonesia.hr_setup.allocate
    bench --site mantra.localhost execute sentra_mantra_indonesia.hr_setup.set_leave_approvers
    bench --site mantra.localhost execute sentra_mantra_indonesia.hr_setup.report
"""

from datetime import date, timedelta

import frappe

COMPANY = "RSIA Melinda"
LEAVE_PERIOD_FROM = "2026-01-01"
LEAVE_PERIOD_TO = "2026-12-31"
HOLIDAY_LIST = "Libur Nasional & Cuti Bersama 2026"
LEAVE_POLICY = "Kebijakan Cuti Standar RSIA Melinda"

# UU 13/2003: cuti tahunan 12 hari (pasal 79), sakit dibayar (pasal 93),
# melahirkan 3 bulan (pasal 82), izin penting berbayar (pasal 93 ayat 4).
LEAVE_TYPES = {
	"Cuti Tahunan": {
		"max_leaves_allowed": 12,
		"applicable_after": 365,  # UU: hak cuti tahunan setelah 12 bulan kerja
		"is_carry_forward": 0,
		"include_holiday": 0,
	},
	"Cuti Sakit": {
		# Sesuai UU tidak dibatasi kuota selama ada surat dokter; saldo
		# alokasi 14 hanya patokan, boleh minus.
		"allow_negative": 1,
		"include_holiday": 0,
	},
	"Cuti Melahirkan": {
		"max_continuous_days_allowed": 90,
		"include_holiday": 1,
		# Tidak dialokasikan massal; alokasikan per karyawati saat dibutuhkan.
	},
	"Izin Penting (Berbayar)": {
		# Menikah 3 hr, menikahkan/khitan/baptis anak 2 hr, istri melahirkan/
		# keguguran 2 hr, kematian keluarga inti 2 hr, anggota serumah 1 hr.
		"allow_negative": 1,
		"include_holiday": 0,
	},
	"Izin Tanpa Gaji": {
		"is_lwp": 1,
		"include_holiday": 0,
	},
}

# Alokasi tahunan massal (per Leave Policy) — hanya tipe berkuota.
POLICY_ALLOCATIONS = {"Cuti Tahunan": 12, "Cuti Sakit": 14}

# Fixture HRMS berbahasa/berkonsep barat, 0 pemakaian, tidak punya field
# disabled -> dihapus (bisa dibuat ulang kapan pun bila ternyata perlu).
WESTERN_LEAVE_TYPES = [
	"Casual Leave",
	"Privilege Leave",
	"Sick Leave",
	"Leave Without Pay",
	"Compensatory Off",
]

# SKB 3 Menteri 2026: 17 libur nasional.
NATIONAL_HOLIDAYS_2026 = {
	"2026-01-01": "Tahun Baru 2026 Masehi",
	"2026-01-16": "Isra Mikraj Nabi Muhammad SAW",
	"2026-02-17": "Tahun Baru Imlek 2577 Kongzili",
	"2026-03-19": "Hari Suci Nyepi (Tahun Baru Saka 1948)",
	"2026-03-21": "Idulfitri 1447 H",
	"2026-03-22": "Idulfitri 1447 H (hari kedua)",
	"2026-04-03": "Wafat Yesus Kristus",
	"2026-04-05": "Kebangkitan Yesus Kristus (Paskah)",
	"2026-05-01": "Hari Buruh Internasional",
	"2026-05-14": "Kenaikan Yesus Kristus",
	"2026-05-27": "Iduladha 1447 H",
	"2026-05-31": "Hari Raya Waisak 2570 BE",
	"2026-06-01": "Hari Lahir Pancasila",
	"2026-06-16": "Tahun Baru Islam 1448 H",
	"2026-08-17": "Proklamasi Kemerdekaan RI",
	"2026-08-25": "Maulid Nabi Muhammad SAW",
	"2026-12-25": "Kelahiran Yesus Kristus (Natal)",
}

# SKB 3 Menteri 2026: 8 cuti bersama.
CUTI_BERSAMA_2026 = {
	"2026-02-16": "Cuti Bersama Tahun Baru Imlek",
	"2026-03-18": "Cuti Bersama Hari Suci Nyepi",
	"2026-03-20": "Cuti Bersama Idulfitri 1447 H",
	"2026-03-23": "Cuti Bersama Idulfitri 1447 H",
	"2026-03-24": "Cuti Bersama Idulfitri 1447 H",
	"2026-05-15": "Cuti Bersama Kenaikan Yesus Kristus",
	"2026-05-28": "Cuti Bersama Iduladha 1447 H",
	"2026-12-24": "Cuti Bersama Natal",
}

# Shift nakes (Chief 2026-07-15: 07-14 dst.) + jam kantor manajemen 08-17.
# Auto-attendance sengaja off dulu (absensi manual/checkin; aturan telat
# otomatis menyusul).
SHIFT_TYPES = {
	"Shift Pagi": ("07:00:00", "14:00:00"),
	"Shift Sore": ("14:00:00", "21:00:00"),
	"Shift Malam": ("21:00:00", "07:00:00"),
	"Jam Kantor": ("08:00:00", "17:00:00"),
}

# Alur persetujuan sederhana dulu: semua -> CEO; CEO -> WADIR Widya.
DEFAULT_APPROVER = "drferdiiskandar@melinda.co.id"
CEO_FALLBACK_APPROVER = "widya.puti.melinda@melinda.co.id"


def _weekly_days(weekday):
	"""Semua tanggal 2026 pada hari tsb. (0=Senin … 5=Sabtu, 6=Minggu)."""
	d, out = date(2026, 1, 1), []
	while d <= date(2026, 12, 31):
		if d.weekday() == weekday:
			out.append(d.isoformat())
		d += timedelta(days=1)
	return out


def _sundays():
	return _weekly_days(6)


# Manajemen libur Sabtu (Chief 2026-07-17) — list terpisah dari nakes shift
# (libur nakes mengikuti roster L, bukan hari tetap). Penetapan ke Employee
# manajemen menyusul bersama mapping departemen (gelombang K5).
MANAGEMENT_HOLIDAY_LIST = "Libur Manajemen 2026"


def ensure_management_holiday_list():
	"""Idempoten: libur nasional + cuti bersama + Sabtu & Minggu weekly off."""
	if frappe.db.exists("Holiday List", MANAGEMENT_HOLIDAY_LIST):
		return {"holiday_list": MANAGEMENT_HOLIDAY_LIST, "created": False}
	hl = frappe.get_doc(
		{
			"doctype": "Holiday List",
			"holiday_list_name": MANAGEMENT_HOLIDAY_LIST,
			"from_date": LEAVE_PERIOD_FROM,
			"to_date": LEAVE_PERIOD_TO,
		}
	)
	seen = set()
	for day, desc in sorted({**NATIONAL_HOLIDAYS_2026, **CUTI_BERSAMA_2026}.items()):
		hl.append("holidays", {"holiday_date": day, "description": desc})
		seen.add(day)
	for weekday, label in ((5, "Sabtu"), (6, "Minggu")):
		for day in _weekly_days(weekday):
			if day not in seen:
				hl.append(
					"holidays",
					{"holiday_date": day, "description": f"{label} (libur mingguan)", "weekly_off": 1},
				)
				seen.add(day)
	hl.insert()
	frappe.db.commit()
	return {"holiday_list": MANAGEMENT_HOLIDAY_LIST, "created": True, "days": len(hl.holidays)}


def setup():
	made = {"leave_types": [], "deleted_western": [], "shifts": [], "holiday_list": None, "leave_period": None, "policy": None}

	for name, props in LEAVE_TYPES.items():
		if not frappe.db.exists("Leave Type", name):
			frappe.get_doc({"doctype": "Leave Type", "leave_type_name": name, **props}).insert()
			made["leave_types"].append(name)

	for name in WESTERN_LEAVE_TYPES:
		if frappe.db.exists("Leave Type", name) and not frappe.db.exists("Leave Allocation", {"leave_type": name}):
			frappe.delete_doc("Leave Type", name)
			made["deleted_western"].append(name)

	if not frappe.db.exists("Holiday List", HOLIDAY_LIST):
		hl = frappe.get_doc(
			{
				"doctype": "Holiday List",
				"holiday_list_name": HOLIDAY_LIST,
				"from_date": LEAVE_PERIOD_FROM,
				"to_date": LEAVE_PERIOD_TO,
			}
		)
		seen = set()
		for day, desc in sorted({**NATIONAL_HOLIDAYS_2026, **CUTI_BERSAMA_2026}.items()):
			hl.append("holidays", {"holiday_date": day, "description": desc})
			seen.add(day)
		for day in _sundays():
			if day not in seen:
				hl.append("holidays", {"holiday_date": day, "description": "Minggu (libur mingguan)", "weekly_off": 1})
		hl.insert()
		made["holiday_list"] = f"{HOLIDAY_LIST} ({len(hl.holidays)} hari)"
	if frappe.db.get_value("Company", COMPANY, "default_holiday_list") != HOLIDAY_LIST:
		frappe.db.set_value("Company", COMPANY, "default_holiday_list", HOLIDAY_LIST)

	if not frappe.db.exists("Leave Period", {"from_date": LEAVE_PERIOD_FROM, "to_date": LEAVE_PERIOD_TO, "company": COMPANY}):
		lp = frappe.get_doc(
			{
				"doctype": "Leave Period",
				"from_date": LEAVE_PERIOD_FROM,
				"to_date": LEAVE_PERIOD_TO,
				"company": COMPANY,
				"is_active": 1,
			}
		).insert()
		made["leave_period"] = lp.name

	if not frappe.db.exists("Leave Policy", {"title": LEAVE_POLICY}):
		pol = frappe.get_doc(
			{
				"doctype": "Leave Policy",
				"title": LEAVE_POLICY,
				"leave_policy_details": [
					{"leave_type": lt, "annual_allocation": qty} for lt, qty in POLICY_ALLOCATIONS.items()
				],
			}
		)
		pol.insert()
		pol.submit()
		made["policy"] = pol.name

	for name, (start, end) in SHIFT_TYPES.items():
		if not frappe.db.exists("Shift Type", name):
			st = frappe.get_doc({"doctype": "Shift Type", "start_time": start, "end_time": end})
			st.__newname = name
			st.insert()
			made["shifts"].append(name)
		elif str(frappe.db.get_value("Shift Type", name, "end_time")).zfill(8) != end:
			frappe.db.set_value("Shift Type", name, {"start_time": start, "end_time": end})
			made["shifts"].append(f"{name} (jam diperbarui)")

	frappe.db.commit()
	return made


def allocate():
	"""Terapkan Leave Policy ke semua karyawan Aktif via Leave Policy
	Assignment (submit -> HRMS otomatis membuat Leave Allocation, pro-rata
	untuk yang bergabung di tengah periode)."""
	period = frappe.db.get_value(
		"Leave Period", {"from_date": LEAVE_PERIOD_FROM, "to_date": LEAVE_PERIOD_TO, "company": COMPANY}
	)
	policy = frappe.db.get_value("Leave Policy", {"title": LEAVE_POLICY})
	if not (period and policy):
		return {"error": "jalankan setup() dulu"}
	done, skipped, failed = [], [], {}
	for emp in frappe.get_all("Employee", filters={"status": "Active", "company": COMPANY}, pluck="name"):
		if frappe.db.exists(
			"Leave Policy Assignment", {"employee": emp, "leave_period": period, "docstatus": 1}
		):
			skipped.append(emp)
			continue
		try:
			lpa = frappe.get_doc(
				{
					"doctype": "Leave Policy Assignment",
					"employee": emp,
					"leave_policy": policy,
					"assignment_based_on": "Leave Period",
					"leave_period": period,
					"company": COMPANY,
				}
			)
			lpa.insert()
			lpa.submit()
			done.append(emp)
		except Exception as e:
			failed[emp] = f"{type(e).__name__}: {str(e)[:80]}"
	frappe.db.commit()
	return {"assigned": len(done), "skipped_existing": len(skipped), "failed": failed}


def set_leave_approvers():
	"""Semua karyawan Aktif -> approver CEO; karyawan CEO sendiri -> WADIR."""
	counts = {"set_ceo": 0, "set_wadir": 0, "sudah_terisi": 0}
	for emp in frappe.get_all(
		"Employee", filters={"status": "Active", "company": COMPANY}, fields=["name", "user_id", "leave_approver"]
	):
		if emp.leave_approver:
			counts["sudah_terisi"] += 1
			continue
		approver = CEO_FALLBACK_APPROVER if emp.user_id == DEFAULT_APPROVER else DEFAULT_APPROVER
		frappe.db.set_value("Employee", emp.name, "leave_approver", approver, update_modified=False)
		counts["set_ceo" if approver == DEFAULT_APPROVER else "set_wadir"] += 1
	frappe.db.commit()
	return counts


def _cleanup_leave_application(name):
	"""Submit cuti Approved otomatis membuat Attendance "On Leave" — batalkan
	dan hapus Attendance itu dulu, baru Leave Application-nya."""
	for att in frappe.get_all("Attendance", filters={"leave_application": name}, pluck="name"):
		doc = frappe.get_doc("Attendance", att)
		if doc.docstatus == 1:
			doc.cancel()
		frappe.delete_doc("Attendance", att)
	la = frappe.get_doc("Leave Application", name)
	if la.docstatus == 1:
		la.cancel()
	frappe.delete_doc("Leave Application", name)


def test_leave_cycle():
	"""Uji siklus cuti end-to-end pada satu karyawan lama (masuk < 2025):
	cek saldo -> ajukan 2 hari Cuti Tahunan status Approved -> submit ->
	saldo berkurang 2 -> cancel + hapus (site kembali bersih)."""
	from hrms.hr.doctype.leave_application.leave_application import get_leave_balance_on

	emp = frappe.get_all(
		"Employee",
		filters={"status": "Active", "company": COMPANY, "date_of_joining": ("<", "2025-01-01")},
		fields=["name", "employee_name"],
		limit=1,
	)[0]
	before = get_leave_balance_on(emp.name, "Cuti Tahunan", "2026-08-05")
	la = frappe.get_doc(
		{
			"doctype": "Leave Application",
			"employee": emp.name,
			"leave_type": "Cuti Tahunan",
			"from_date": "2026-08-05",
			"to_date": "2026-08-06",
			"status": "Approved",
			"leave_approver": DEFAULT_APPROVER,
			"description": "uji siklus cuti (otomatis dibersihkan)",
		}
	)
	la.insert()
	la.submit()
	after = get_leave_balance_on(emp.name, "Cuti Tahunan", "2026-08-07")
	_cleanup_leave_application(la.name)
	restored = get_leave_balance_on(emp.name, "Cuti Tahunan", "2026-08-07")
	frappe.db.commit()
	return {
		"employee": emp.employee_name,
		"saldo_sebelum": before,
		"saldo_setelah_cuti_2_hari": after,
		"saldo_setelah_dibersihkan": restored,
		"lulus": before - after == 2 and restored == before,
	}


def report():
	period = frappe.db.get_value(
		"Leave Period", {"from_date": LEAVE_PERIOD_FROM, "to_date": LEAVE_PERIOD_TO, "company": COMPANY}
	)
	return {
		"leave_types": frappe.get_all("Leave Type", pluck="name"),
		"holiday_days": frappe.db.count("Holiday", {"parent": HOLIDAY_LIST}),
		"company_default_holiday_list": frappe.db.get_value("Company", COMPANY, "default_holiday_list"),
		"leave_period": period,
		"shift_types": frappe.get_all("Shift Type", pluck="name"),
		"policy_assignments_submitted": frappe.db.count("Leave Policy Assignment", {"docstatus": 1}),
		"leave_allocations_submitted": frappe.db.count("Leave Allocation", {"docstatus": 1}),
		"employees_with_approver": frappe.db.count("Employee", {"status": "Active", "leave_approver": ("is", "set")}),
	}
