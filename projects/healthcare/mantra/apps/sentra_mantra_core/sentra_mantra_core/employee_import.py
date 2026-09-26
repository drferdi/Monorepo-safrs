"""Importer Daftar Pegawai RSIA Melinda dari xlsx (Chief-approved, 2026-07-15).

File xlsx berisi PII (NIK, alamat, tanggal lahir) — file TIDAK ikut git dan
importer tidak pernah mencetak NIK/alamat; output hanya agregat + nama.

    bench --site mantra.localhost execute sentra_mantra_core.employee_import.dry_run
    bench --site mantra.localhost execute sentra_mantra_core.employee_import.run
"""

from datetime import date, datetime

import frappe

PATH = "/tmp/daftar_pegawai.xlsx"
COMPANY = "RSIA Melinda"

GENDER_MAP = {"Laki - Laki": "Male", "Laki-Laki": "Male", "Perempuan": "Female"}
# Jabatan di file -> Designation di site ("Direktur Rsia Melinda" = Direktur
# Utama — dulu "CEO", di-rename 2026-07-15; sama orangnya)
DESIG_MAP = {
	"apoteker": "Apoteker",
	"Apoteker": "Apoteker",
	"Perawat OK": "Perawat OK",
	"Ketua Komite Medik": "Ketua Komite Medik",
	"Direktur Rsia Melinda": "Direktur Utama",
}
# "Kepegawaian" -> Manajemen per keputusan Chief 2026-07-15 (dipindah kapan
# pun mudah — Department di Employee hanya Link field).
DEPT_MAP = {"Farmasi": "Farmasi - MEL", "Kepegawaian": "Manajemen - MEL"}
EMPLOYMENT_TYPES = ["Tetap", "Kontrak", "Internship", "Mitra"]


def _parse_date(v):
	if v in (None, ""):
		return None
	if isinstance(v, datetime):
		v = v.date()
	if isinstance(v, date):
		return None if v == date(1970, 1, 1) else v
	try:
		parsed = datetime.strptime(str(v).strip(), "%d-%m-%Y").date()
	except ValueError:
		return None
	return None if parsed == date(1970, 1, 1) else parsed


def _rows():
	import openpyxl

	wb = openpyxl.load_workbook(PATH, read_only=True, data_only=True)
	raw = list(wb.worksheets[0].iter_rows(values_only=True))
	hdr = [str(h) for h in raw[0]]
	rows, seen_nrp, dup_skipped = [], set(), []
	for r in raw[1:]:
		d = dict(zip(hdr, r))
		nama = str(d.get("Nama") or "").strip()
		if not nama:
			continue
		nrp = str(d.get("NRP") or "").strip()
		if nrp and nrp in seen_nrp:
			dup_skipped.append(nama)
			continue
		if nrp:
			seen_nrp.add(nrp)
		rows.append(d)
	return rows, dup_skipped


def _build(d):
	"""Return (payload, problems) untuk satu baris."""
	problems = []
	nama = str(d["Nama"]).strip()
	gender = GENDER_MAP.get(str(d.get("Jenis Kelamin") or "").strip())
	dob = _parse_date(d.get("Tanggal Lahir"))
	doj = _parse_date(d.get("Tanggal Masuk"))
	keluar = _parse_date(d.get("Tanggal Keluar"))
	aktif = str(d.get("Status Aktif") or "").strip() == "Aktif"
	if not gender:
		problems.append("gender kosong/tak dikenal")
	if not dob:
		problems.append("tanggal lahir kosong/invalid")
	if not doj:
		problems.append("tanggal masuk kosong/invalid")
	if not aktif and not keluar:
		problems.append("Tidak Aktif tanpa tanggal keluar valid")
	jabatan = str(d.get("Jabatan") or "").strip()
	dept = str(d.get("Departemen") or "").strip()
	payload = {
		"doctype": "Employee",
		"first_name": nama,
		"gender": gender,
		"date_of_birth": dob,
		"date_of_joining": doj,
		"company": COMPANY,
		"status": "Active" if aktif else "Left",
		"employment_type": str(d.get("Status") or "").strip() or None,
		"designation": DESIG_MAP.get(jabatan),
		"department": DEPT_MAP.get(dept),
		"current_address": str(d.get("Alamat") or "").strip() or None,
		"nik": str(d.get("NRP") or "").strip() or None,
		# avatar default per gender; tergantikan saat karyawan upload foto sendiri
		"image": "/assets/sentra_mantra_core/images/doctor-m.png"
		if gender == "Male"
		else "/assets/sentra_mantra_core/images/doctor-w.png",
	}
	if not aktif and keluar:
		payload["relieving_date"] = keluar
	return payload, problems


def dry_run():
	rows, dup_skipped = _rows()
	reqd = [df.fieldname for df in frappe.get_meta("Employee").fields if df.reqd]
	has_addr = bool(frappe.get_meta("Employee").get_field("current_address"))
	genders_ok = [g for g in ["Male", "Female"] if frappe.db.exists("Gender", g)]
	et_missing = [t for t in EMPLOYMENT_TYPES if not frappe.db.exists("Employment Type", t)]
	valid, invalid = [], {}
	unmapped_jabatan, unmapped_dept = set(), set()
	for d in rows:
		payload, problems = _build(d)
		jab = str(d.get("Jabatan") or "").strip()
		dept = str(d.get("Departemen") or "").strip()
		if jab and jab not in DESIG_MAP:
			unmapped_jabatan.add(jab)
		if dept and dept not in DEPT_MAP:
			unmapped_dept.add(dept)
		if problems:
			invalid[payload["first_name"]] = problems
		else:
			valid.append(payload["first_name"])
	name_hits = {
		frag: frappe.utils.cstr([str(d["Nama"]).strip() for d in rows if frag in str(d["Nama"]).lower()])
		for frag in ["yuni", "dedi", "widya", "ferdi"]
	}
	return {
		"total_rows": len(rows),
		"duplikat_nrp_diskip": dup_skipped,
		"employee_reqd_fields": reqd,
		"has_current_address_field": has_addr,
		"gender_records_ok": genders_ok,
		"employment_type_perlu_dibuat": et_missing,
		"valid_count": len(valid),
		"invalid": invalid,
		"jabatan_belum_terpetakan": sorted(unmapped_jabatan),
		"departemen_belum_terpetakan": sorted(unmapped_dept),
		"kandidat_link_user": name_hits,
	}


# Nama persis di xlsx -> User site (diverifikasi lewat dry_run sebelum run).
# Rahayu Wahyuni = "Bu Yuni", dikonfirmasi Chief 2026-07-15.
USER_MAP = {
	"dr. Ferdi Iskandar S.H. M.KN .C.LM": "drferdiiskandar@melinda.co.id",
	"Widya Putimelinda": "widya.puti.melinda@melinda.co.id",
	"dr. Dedi Wahyu Indrawijaya": "dr.dediwahyu@gmail.com",
	"Rahayu Wahyuni": "yunetsukses@gmail.com",
}


def run():
	rows, dup_skipped = _rows()
	for t in EMPLOYMENT_TYPES:
		if not frappe.db.exists("Employment Type", t):
			frappe.get_doc({"doctype": "Employment Type", "employee_type_name": t}).insert()
	created, skipped_existing, failed = [], [], {}
	for d in rows:
		payload, problems = _build(d)
		nama = payload["first_name"]
		if problems:
			failed[nama] = "; ".join(problems)
			continue
		if frappe.db.exists(
			"Employee", {"employee_name": nama, "date_of_birth": payload["date_of_birth"]}
		):
			skipped_existing.append(nama)
			continue
		if nama in USER_MAP and frappe.db.exists("User", USER_MAP[nama]):
			payload["user_id"] = USER_MAP[nama]
		try:
			emp = frappe.get_doc(payload).insert()
			created.append(emp.name)
		except Exception as e:
			failed[nama] = f"{type(e).__name__}: {str(e)[:80]}"
	frappe.db.commit()
	return {
		"created_count": len(created),
		"skipped_existing": len(skipped_existing),
		"failed": failed,
		"duplikat_nrp_diskip": dup_skipped,
		"total_employee_di_site": frappe.db.count("Employee"),
	}


def backfill():
	"""Lengkapi Employee yang sudah ada dari xlsx: nik / department / user_id
	yang masih kosong. Idempoten; tidak pernah menimpa nilai yang sudah terisi;
	tidak mencetak nilai NIK."""
	rows, _dup = _rows()
	counts = {"nik": 0, "department": 0, "user_id": 0, "tanpa_employee": []}
	for d in rows:
		nama = str(d["Nama"]).strip()
		dob = _parse_date(d.get("Tanggal Lahir"))
		emp = frappe.db.get_value("Employee", {"employee_name": nama, "date_of_birth": dob})
		if not emp:
			counts["tanpa_employee"].append(nama)
			continue
		nik = str(d.get("NRP") or "").strip()
		if nik and not frappe.db.get_value("Employee", emp, "nik"):
			frappe.db.set_value("Employee", emp, "nik", nik)
			counts["nik"] += 1
		dept = DEPT_MAP.get(str(d.get("Departemen") or "").strip())
		if dept and not frappe.db.get_value("Employee", emp, "department"):
			frappe.db.set_value("Employee", emp, "department", dept)
			counts["department"] += 1
		user = USER_MAP.get(nama)
		if user and frappe.db.exists("User", user) and not frappe.db.get_value("Employee", emp, "user_id"):
			frappe.db.set_value("Employee", emp, "user_id", user)
			counts["user_id"] += 1
	frappe.db.commit()
	return counts
