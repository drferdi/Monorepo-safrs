"""Source of truth jadwal praktik dokter — dari flyer resmi RSIA Melinda
(Chief, 17 Jul 2026). Edit SCHEDULES lalu:

    bench --site mantra.localhost execute sentra_mantra_indonesia.praktik_dokter.sync

Idempoten: membuat/menyelaraskan Practitioner Schedule (slot hari+jam) dan
menautkannya ke Healthcare Practitioner via Practitioner Service Unit
Schedule. Praktisi dicari berdasarkan practitioner_name persis; entri dengan
create_if_missing=True dibuatkan record praktisi baru bila belum ada
(ditandai di hasil — data pelengkap STR/Employee menyusul dari Chief).

Konsumen: panel "Praktisi Bertugas" (ws_klinik.on_duty_today) dan tile
"Jadwal Praktik Hari Ini" (home_profile).
"""

import frappe

TIME_PER_APPOINTMENT = 15  # menit — default; ubah bila Chief menentukan lain

# day memakai nama Inggris (kontrak Healthcare Schedule Time Slot.day).
SCHEDULES = {
	"Praktik dr. Dibya — Poli OBGYN Sore": {
		"practitioner_name": "dr. Dibya Arfianda, Sp.OG, M.Ked.Klin.",
		"service_unit": "Poli OBGYN - MEL",
		"slots": [
			("Monday", "18:30:00", "20:00:00"),
			("Thursday", "18:30:00", "20:00:00"),
			("Friday", "18:30:00", "20:00:00"),
		],
	},
	"Praktik dr. Dibya — Private Clinic Minggu": {
		"practitioner_name": "dr. Dibya Arfianda, Sp.OG, M.Ked.Klin.",
		"service_unit": "Poli OBGYN - MEL",
		"slots": [
			("Sunday", "09:00:00", "16:00:00"),
		],
	},
	"Praktik dr. Hidayati — Poli Anak Sore": {
		"practitioner_name": "dr. Hidayati Utami Dewi, Sp.A",
		"service_unit": "Poli Anak - MEL",
		"create_if_missing": True,  # flyer 17 Jul; belum ada di master praktisi
		"slots": [
			("Wednesday", "18:00:00", "20:00:00"),
			("Friday", "18:00:00", "20:00:00"),
		],
	},
}


def _find_or_create_practitioner(spec, out):
	name = frappe.db.get_value(
		"Healthcare Practitioner", {"practitioner_name": spec["practitioner_name"]}
	)
	if name:
		return name
	if not spec.get("create_if_missing"):
		return None
	doc = frappe.get_doc(
		{
			"doctype": "Healthcare Practitioner",
			"first_name": spec["practitioner_name"],
			"practitioner_name": spec["practitioner_name"],
			"status": "Active",
		}
	)
	doc.insert()
	out["practitioner_created"].append(doc.name)
	return doc.name


def _upsert_schedule(sched_name, spec):
	"""Practitioner Schedule dengan slot persis seperti SCHEDULES."""
	if frappe.db.exists("Practitioner Schedule", sched_name):
		doc = frappe.get_doc("Practitioner Schedule", sched_name)
	else:
		doc = frappe.new_doc("Practitioner Schedule")
		doc.schedule_name = sched_name
	doc.time_per_appointment = TIME_PER_APPOINTMENT
	existing = {(s.day, str(s.from_time), str(s.to_time)) for s in doc.time_slots}
	wanted = {(d, f, t) for d, f, t in spec["slots"]}
	if existing != wanted:
		doc.set("time_slots", [])
		for day, from_time, to_time in spec["slots"]:
			doc.append(
				"time_slots", {"day": day, "from_time": from_time, "to_time": to_time}
			)
	doc.save()
	return doc.name


def list_active():
	"""Debug/helper: daftar praktisi aktif + flag IHS (tanpa PHI)."""
	rows = frappe.get_all(
		"Healthcare Practitioner",
		filters={"status": "Active"},
		fields=["practitioner_name", "satusehat_ihs"],
		order_by="practitioner_name",
	)
	return [
		{
			"name": r.practitioner_name,
			"ihs": bool(r.satusehat_ihs),
		}
		for r in rows
	]


def sync(commit=True):
	out = {"schedules": [], "attached": [], "practitioner_created": [], "skipped": []}
	for sched_name, spec in SCHEDULES.items():
		prac_name = _find_or_create_practitioner(spec, out)
		if not prac_name:
			out["skipped"].append(
				f"{sched_name}: praktisi '{spec['practitioner_name']}' tidak ditemukan"
			)
			continue
		_upsert_schedule(sched_name, spec)
		out["schedules"].append(sched_name)

		prac = frappe.get_doc("Healthcare Practitioner", prac_name)
		if not any(
			row.schedule == sched_name and row.service_unit == spec["service_unit"]
			for row in prac.practitioner_schedules
		):
			prac.append(
				"practitioner_schedules",
				{"schedule": sched_name, "service_unit": spec["service_unit"]},
			)
			prac.save()
			out["attached"].append(f"{prac_name} <- {sched_name}")
	if commit:
		frappe.db.commit()
	return out
