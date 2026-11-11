"""K2v read-only: compare flyer SCHEDULES vs DB slots + panel payload for today.

Run inside container:
  bench --site mantra.localhost console < scripts/_k2v_verify_slots.py
or:
  cd /workspace && ./env/bin/python -c "
import frappe; frappe.init(site='mantra.localhost'); frappe.connect()
exec(open('scripts/_k2v_verify_slots.py').read())
"
"""

import json

import frappe

from sentra_mantra_indonesia import ws_common
from sentra_mantra_indonesia.praktik_dokter import SCHEDULES
from sentra_mantra_indonesia.ws_klinik import data, on_duty_today

DAYS = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday",
]

SQL = """
select
	slot.day as day,
	coalesce(nullif(hcp.practitioner_name, ''), hcp.name) as title,
	psus.service_unit as service_unit,
	min(slot.from_time) as mulai,
	max(slot.to_time) as selesai
from `tabPractitioner Service Unit Schedule` psus
inner join `tabHealthcare Practitioner` hcp on hcp.name = psus.parent
inner join `tabHealthcare Schedule Time Slot` slot
	on slot.parent = psus.schedule and slot.parenttype = 'Practitioner Schedule'
where psus.parenttype = 'Healthcare Practitioner'
	and ifnull(psus.schedule, '') != ''
	and ifnull(hcp.status, 'Active') = 'Active'
	and slot.day = %s
group by hcp.name, psus.service_unit
order by mulai asc, title asc
"""


def run():
	"""Read-only K2v compare; invoked via scripts/_k2v_run.sh (bench console)."""
	out = {
		"today_weekday": ws_common.weekday_name(),
		"panel_today": on_duty_today(),
		"api_panel": next(
			p for p in data()["panels"] if p["title"] == "Praktisi Bertugas"
		),
		"by_day": {},
		"flyer_expected": {},
		"diffs": [],
	}

	expected = {d: [] for d in DAYS}
	for spec in SCHEDULES.values():
		for day, fr, to in spec["slots"]:
			expected[day].append(
				{
					"title": spec["practitioner_name"],
					"sub": spec["service_unit"].removesuffix(" - MEL"),
					"right": f"{ws_common.hhmm(fr)}–{ws_common.hhmm(to)}",
				}
			)
	for d in DAYS:
		expected[d].sort(key=lambda x: (x["right"], x["title"]))
	out["flyer_expected"] = expected

	for d in DAYS:
		rows = frappe.db.sql(SQL, (d,), as_dict=True)
		actual = [
			{
				"title": r.title,
				"sub": (r.service_unit or "").removesuffix(" - MEL"),
				"right": f"{ws_common.hhmm(r.mulai)}–{ws_common.hhmm(r.selesai)}",
			}
			for r in rows
		]
		out["by_day"][d] = actual
		exp_keys = {(e["title"], e["right"], e["sub"]) for e in expected[d]}
		act_keys = {(a["title"], a["right"], a["sub"]) for a in actual}
		missing = sorted(exp_keys - act_keys)
		extra = sorted(act_keys - exp_keys)
		if missing or extra:
			out["diffs"].append(
				{"day": d, "missing_vs_flyer": missing, "extra_vs_flyer": extra}
			)

	return out


if __name__ == "__main__":
	print(json.dumps(run(), indent=2, default=str, ensure_ascii=False))
