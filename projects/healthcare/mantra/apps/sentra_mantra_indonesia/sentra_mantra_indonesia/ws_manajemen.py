"""Blok manajemen workspace "Pasien & Klinik": Management Dashboard pelaporan.

Management Dashboard — zona pelaporan SATUSEHAT (agregat saja, nol PHI):
kartu volume hari/minggu/bulan, ALOS finished, kelengkapan pelaporan,
plus chart tren 8 minggu/6 bulan, pola hari/jam, baru-vs-lama, produktivitas
dokter. Di-cache di lapisan integrations; chart = bar CSS (ws_common).

	bench --site mantra.localhost execute sentra_mantra_indonesia.ws_manajemen.setup
"""

import json
import re

import frappe
from frappe.utils import getdate, today

from sentra_mantra_indonesia import clinic_workspace, ws_common

BLOCK_NAME = "Manajemen RSIA"
WORKSPACE = "Pasien & Klinik"
KLINIK_BLOCK = "Klinik Hari Ini RSIA"

# Akses lintas-app hanya via string attr path (ADR-0001) — tanpa import Python.
METRICS_METHOD = "sentra_mantra_integrations.satusehat.metrics.visit_counts"
DOCTOR_METRICS_METHOD = "sentra_mantra_integrations.satusehat.metrics.practitioner_visit_counts"
INSIGHTS_METHOD = "sentra_mantra_integrations.satusehat.insights.encounter_insights"
QUALITY_METHOD = "sentra_mantra_integrations.satusehat.metrics.reporting_quality"

MONTH_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
DAY_ID = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]

# Satu warna khas per chart supaya tiap panel langsung dikenali; rust (#FF4B26)
# dipakai untuk sinyal terpenting (pasien baru), netral slate untuk pembanding.
# Aksen chart mengikuti brand Melinda (oranye / teal / hijau).
CHART_COLOR = {
	"weekly": "#00B6BF",
	"monthly": "#FC7022",
	"days": "#00B090",
	"hours": "#FF6F60",
	"new": "#FC7022",
	"returning": "#00B6BF",
	"doctor_month": "#00B090",
	"doctor_total": "#00B6BF",
}


def _latest_aggregate_total(resource_type):
	"""total_records snapshot Aggregate terakhir, atau None bila tidak ada/gagal."""
	try:
		rows = frappe.get_all(
			"SATUSEHAT Sync Batch",
			filters={
				"resource_type": resource_type,
				"capture_mode": "Aggregate",
				"status": "Completed",
			},
			fields=["total_records"],
			order_by="finished_at desc",
			limit=1,
		)
	except Exception:
		return None
	if not rows:
		return None
	return int(rows[0]["total_records"] or 0)


def _satusehat_cards():
	"""Angka total sisi SATUSEHAT (snapshot agregat, nol PHI)."""
	if not ws_common.can("SATUSEHAT Sync Batch"):
		return []
	cards = []
	for resource_type, label in (
		("Patient", "Pasien Tercatat"),
		("Encounter", "Encounter Tercatat"),
	):
		total = _latest_aggregate_total(resource_type)
		if total is not None:
			cards.append(
				{
					"value": total,
					"label": label,
					"sub": "Snapshot SATUSEHAT",
				}
			)
	return cards


def _visit_metrics():
	"""Agregat kunjungan live (cached di integrations), atau None bila gagal."""
	if not ws_common.can("SATUSEHAT Sync Batch"):
		return None
	try:
		return frappe.get_attr(METRICS_METHOD)()
	except Exception:
		return None


def _visit_cards(metrics):
	"""Kartu volume SATUSEHAT dilepas (hari/minggu/bulan) — tren tetap di chart."""
	return []


def _on_duty_checkin_count(day):
	"""Distinct karyawan dengan log IN hari ini — None bila query gagal."""
	try:
		return int(
			frappe.db.sql(
				"""
				select count(distinct employee)
				from `tabEmployee Checkin`
				where date(`time`) = %s and log_type = 'IN'
				""",
				(day,),
			)[0][0]
			or 0
		)
	except Exception:
		return None


def _late_checkin_count(day):
	"""Karyawan first-IN hari ini melewati start shift (+ grace) — None bila gagal.

	Tanpa Shift Assignment aktif: baseline Jam Kantor 08:00, grace 0.
	"""
	try:
		return int(
			frappe.db.sql(
				"""
				select count(*) from (
					select
						ec.employee,
						min(time(ec.`time`)) as first_in,
						time(coalesce(min(st.start_time), '08:00:00')) as start_t,
						coalesce(min(st.late_entry_grace_period), 0) as grace_min
					from `tabEmployee Checkin` ec
					left join `tabShift Assignment` sa
						on sa.employee = ec.employee
						and sa.docstatus = 1
						and sa.status = 'Active'
						and sa.start_date <= %s
						and (sa.end_date is null or sa.end_date >= %s)
					left join `tabShift Type` st on st.name = sa.shift_type
					where date(ec.`time`) = %s and ec.log_type = 'IN'
					group by ec.employee
				) t
				where t.first_in > addtime(t.start_t, sec_to_time(t.grace_min * 60))
				""",
				(day, day, day),
			)[0][0]
			or 0
		)
	except Exception:
		return None


def _checkin_cards():
	"""Kartu operasi lokal dari Employee Checkin — ganti volume hari/bulan."""
	if not ws_common.can("Employee Checkin"):
		return []
	day = today()
	cards = []
	on_duty = _on_duty_checkin_count(day)
	if on_duty is not None:
		cards.append(
			{
				"value": on_duty,
				"label": "On Duty Staff",
				"sub": "Check-in hari ini",
				"route": "/app/employee-checkin",
			}
		)
	late = _late_checkin_count(day)
	if late is not None:
		cards.append(
			{
				"value": late,
				"label": "Late Staff",
				"sub": "Check-in terlambat",
				"route": "/app/employee-checkin",
			}
		)
	return cards


def _bor_snapshot():
	"""BOR dari Healthcare Service Unit lokal — None bila izin/query gagal."""
	if not ws_common.can("Healthcare Service Unit"):
		return None
	try:
		occupied = int(
			frappe.db.count(
				"Healthcare Service Unit",
				{"occupancy_status": "Occupied", "is_group": 0},
			)
			or 0
		)
		vacant = int(
			frappe.db.count(
				"Healthcare Service Unit",
				{"occupancy_status": "Vacant", "is_group": 0},
			)
			or 0
		)
	except Exception:
		return None
	total = occupied + vacant
	if not total:
		return None
	return {
		"occupied": occupied,
		"vacant": vacant,
		"total": total,
		"pct": round(occupied / total * 100),
	}


def _bor_cards():
	snap = _bor_snapshot()
	if not snap:
		return []
	return [
		{
			"value": f"{snap['pct']}%",
			"label": "BOR (Bed Occupancy)",
			"sub": f"{snap['occupied']}/{snap['total']} terisi · Operasi lokal",
			"route": "/app/healthcare-service-unit/view/tree",
		},
		{
			"value": snap["occupied"],
			"label": "Unit Terisi",
			"sub": "Operasi lokal",
		},
		{
			"value": snap["vacant"],
			"label": "Unit Kosong",
			"sub": "Operasi lokal",
		},
	]


def _bor_by_unit_panel():
	"""BOR per ward/unit induk — omit bila kosong/gagal."""
	if not ws_common.can("Healthcare Service Unit"):
		return []
	try:
		rows = frappe.db.sql(
			"""
			select
				coalesce(
					nullif(p.name, ''),
					nullif(u.parent_healthcare_service_unit, ''),
					'Unit lain'
				) as unit,
				sum(case when u.occupancy_status = 'Occupied' then 1 else 0 end) as occupied,
				sum(case when u.occupancy_status = 'Vacant' then 1 else 0 end) as vacant
			from `tabHealthcare Service Unit` u
			left join `tabHealthcare Service Unit` p
				on p.name = u.parent_healthcare_service_unit
			where ifnull(u.is_group, 0) = 0
				and u.occupancy_status in ('Occupied', 'Vacant')
			group by unit
			having (occupied + vacant) > 0
			order by (occupied / (occupied + vacant)) desc, unit asc
			limit 10
			""",
			as_dict=True,
		)
	except Exception:
		return []
	items = []
	for r in rows:
		r = frappe._dict(r)
		total = int(r.occupied or 0) + int(r.vacant or 0)
		if not total:
			continue
		pct = round(int(r.occupied or 0) / total * 100)
		unit = (r.unit or "Unit").removesuffix(" - MEL")
		items.append(
			{
				"title": unit,
				"sub": f"{int(r.occupied or 0)}/{total} terisi",
				"right": f"{pct}%",
			}
		)
	return items


def _visit_charts(metrics):
	if not metrics:
		return []
	charts = []
	weekly = metrics.get("weekly") or []
	if weekly:
		charts.append(
			{
				"title": "Tren Mingguan",
				"caption": f"{len(weekly)} minggu terakhir",
				"labels": [getdate(b["start"]).strftime("%d/%m") for b in weekly],
				"series": [
					{
						"label": "Kunjungan",
						"values": [b["value"] or 0 for b in weekly],
						"color": CHART_COLOR["weekly"],
					}
				],
			}
		)
	monthly = metrics.get("monthly") or []
	if monthly:
		charts.append(
			{
				"title": "Tren Bulanan",
				"caption": f"{len(monthly)} bulan terakhir",
				"labels": [MONTH_ID[b["month"] - 1] for b in monthly],
				"series": [
					{
						"label": "Kunjungan",
						"values": [b["value"] or 0 for b in monthly],
						"color": CHART_COLOR["monthly"],
					}
				],
			}
		)
	return charts


def _doctor_metrics():
	"""Agregat kunjungan per dokter (cached di integrations), atau None bila gagal."""
	if not ws_common.can("SATUSEHAT Sync Batch"):
		return None
	try:
		return frappe.get_attr(DOCTOR_METRICS_METHOD)()
	except Exception:
		return None


def _short_doctor_label(practitioner_name):
	"""Dua kata pertama tanpa koma — muat di label kolom chart ("dr. Dibya")."""
	words = [w.rstrip(",") for w in (practitioner_name or "").split()]
	return " ".join(words[:2])


def _doctor_charts(metrics):
	if not metrics or not metrics.get("practitioners"):
		return []
	roster = [
		r for r in metrics["practitioners"] if _is_roster_doctor(r.get("name"))
	]
	if not roster:
		return []
	charts = []
	for key, title, caption, color in (
		("month", "Per Dokter · Bulan", "Volume bulan berjalan", CHART_COLOR["doctor_month"]),
		("total", "Per Dokter · Kumulatif", "Total encounter tercatat", CHART_COLOR["doctor_total"]),
	):
		rows = sorted(roster, key=lambda r: r.get(key) or 0, reverse=True)
		charts.append(
			{
				"title": title,
				"caption": caption,
				"labels": [_short_doctor_label(r["name"]) for r in rows],
				"series": [
					{
						"label": "Kunjungan",
						"values": [r.get(key) or 0 for r in rows],
						"color": color,
					}
				],
			}
		)
	return charts


def _poli_schedule_today_by_name():
	"""Map nama praktisi → teks jadwal poli hari ini (unit · jam)."""
	if not ws_common.can("Healthcare Practitioner"):
		return {}
	day = ws_common.weekday_name()
	try:
		rows = frappe.db.sql(
			"""
			select
				coalesce(nullif(hcp.practitioner_name, ''), hcp.name) as title,
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
			order by title asc, mulai asc
			""",
			(day,),
			as_dict=True,
		)
	except Exception:
		return {}

	out = {}
	for row in rows:
		name = (row.title or "").strip()
		if not name:
			continue
		unit = (row.service_unit or "").removesuffix(" - MEL")
		start, end = ws_common.hhmm(row.mulai), ws_common.hhmm(row.selesai)
		hours = f"{start}–{end}" if start and end else ""
		label = " · ".join(filter(None, [unit, hours]))
		if not label:
			continue
		if name in out:
			out[name] = f"{out[name]}; {label}"
		else:
			out[name] = label
	return out


# Roster dokter Melinda yang boleh tampil di Manajemen (Chief 2026-07-23).
# Match longgar lewat kunci nama — gelar/titik Sp.OG vs SpOG tidak memblokir.
ROSTER_DOCTOR_KEYS = (
	"dibya arfianda",
	"boyong baskoro",
	"sutoko andrianto",
	"hidayati utami dewi",
	"maya kusumawati",
	"dedi wahyu",
	"dewanti kusuma sari",
)


def _norm_doctor_name(name):
	text = (name or "").lower()
	text = re.sub(r"[^a-z0-9\s]", " ", text)
	return re.sub(r"\s+", " ", text).strip()


def _is_roster_doctor(name):
	normalized = _norm_doctor_name(name)
	if not normalized:
		return False
	return any(key in normalized for key in ROSTER_DOCTOR_KEYS)


def _local_doctors():
	"""Roster dokter Melinda (allowlist Chief) — bukan semua Healthcare Practitioner."""
	if not ws_common.can("Healthcare Practitioner"):
		return []
	try:
		rows = frappe.get_all(
			"Healthcare Practitioner",
			filters={"status": "Active"},
			fields=["name", "practitioner_name"],
			order_by="practitioner_name asc",
			limit_page_length=200,
		)
	except Exception:
		return []
	return [r for r in rows if _is_roster_doctor(r.get("practitioner_name"))]


def _clear_doctor_metrics_cache():
	"""Buang cache metrik dokter agar daftar/volume tidak basi."""
	try:
		from frappe.utils import getdate

		key = f"satusehat_practitioner_metrics:{getdate().isoformat()}"
		frappe.cache().delete_value(key)
	except Exception:
		pass


def _doctor_panels(metrics):
	"""Tabel roster dokter lokal + jadwal poli hari ini + volume SATUSEHAT bila ada."""
	doctors = _local_doctors()
	metrics_by = {
		(row.get("name") or "").strip(): row
		for row in ((metrics or {}).get("practitioners") or [])
	}
	# Fallback: bila master lokal kosong, pakai nama IHS yang masuk roster.
	if not doctors and metrics_by:
		doctors = [
			{"name": None, "practitioner_name": name}
			for name in metrics_by
			if _is_roster_doctor(name)
		]
	if not doctors:
		return []

	schedules = _poli_schedule_today_by_name()
	items = []
	for doc in doctors:
		name = (doc.get("practitioner_name") or "").strip()
		if not name:
			continue
		stat = metrics_by.get(name) or {}
		month = int(stat.get("month") or 0)
		total = int(stat.get("total") or 0)
		item = {
			"title": name,
			"sub": (
				f"Kumulatif {_id_number(total)}"
				if total or month
				else "Belum terikat SATUSEHAT"
			),
			"mid": schedules.get(name) or "Tidak ada jadwal hari ini",
			"right": f"{_id_number(month)} bln ini" if (month or total) else "—",
			"_month": month,
		}
		if doc.get("name"):
			item["route"] = f"/app/healthcare-practitioner/{doc['name']}"
		items.append(item)
	items.sort(key=lambda i: (-i["_month"], i["title"]))
	for item in items:
		item.pop("_month", None)
	return [
		{
			"title": "Daftar Dokter · Roster & Jadwal",
			"empty": "Belum ada dokter aktif di master praktisi.",
			"items": items,
		}
	]


def _insights():
	"""Insight sweep harian (cached di integrations), atau None bila gagal."""
	if not ws_common.can("SATUSEHAT Sync Batch"):
		return None
	try:
		return frappe.get_attr(INSIGHTS_METHOD)()
	except Exception:
		return None


def _insight_charts(insights):
	if not insights:
		return []
	charts = []
	days = insights.get("day_of_week") or []
	if len(days) == 7:
		charts.append(
			{
				"title": "Distribusi Hari",
				"caption": "Pola kunjungan per hari (historis)",
				"labels": DAY_ID,
				"series": [
					{"label": "Kunjungan", "values": days, "color": CHART_COLOR["days"]}
				],
			}
		)
	hours = insights.get("hour_of_day") or []
	nonzero = [i for i, v in enumerate(hours) if v]
	if nonzero:
		lo, hi = nonzero[0], nonzero[-1]
		charts.append(
			{
				"title": "Distribusi Jam",
				"caption": "Pola kunjungan per jam (historis)",
				"labels": [f"{h:02d}" for h in range(lo, hi + 1)],
				"series": [
					{
						"label": "Kunjungan",
						"values": hours[lo : hi + 1],
						"color": CHART_COLOR["hours"],
					}
				],
			}
		)
	nvr = insights.get("new_vs_returning") or []
	if nvr:
		charts.append(
			{
				"title": "Pasien Baru vs Lama",
				"caption": "Komposisi bulanan",
				"labels": [MONTH_ID[b["month"] - 1] for b in nvr],
				"series": [
					{
						"label": "Pasien Baru",
						"values": [b["new"] or 0 for b in nvr],
						"color": CHART_COLOR["new"],
					},
					{
						"label": "Pasien Lama",
						"values": [b["returning"] or 0 for b in nvr],
						"color": CHART_COLOR["returning"],
					},
				],
			}
		)
	return charts


def _insight_cards(insights):
	inpatient = (insights or {}).get("inpatient") or {}
	cards = []
	if inpatient.get("avg_los_days") is not None:
		cards.append(
			{
				"value": f"{inpatient['avg_los_days']:.1f}".replace(".", ","),
				"label": "ALOS (hari)",
				"sub": "Inap finished · SATUSEHAT",
			}
		)
	# Kartu "Pasien Inap Aktif" sengaja tidak dirender: status in-progress di data
	# Melinda mayoritas encounter yang tak pernah ditutup, jadi angkanya menyesatkan.
	return cards


def _quality_metrics():
	"""Indikator kelengkapan pelaporan (cached di integrations), atau None."""
	if not ws_common.can("SATUSEHAT Sync Batch"):
		return None
	try:
		return frappe.get_attr(QUALITY_METHOD)()
	except Exception:
		return None


def _id_number(value):
	"""Format ribuan gaya Indonesia: 6446 -> '6.446'."""
	return f"{value:,}".replace(",", ".")


def _quality_cards(quality):
	if not quality or quality.get("completeness_pct") is None:
		return []
	pct = f"{quality['completeness_pct']:.1f}".replace(".", ",")
	return [
		{
			"value": f"{pct}%",
			"label": "Kelengkapan Pelaporan",
			"sub": f"{_id_number(quality['finished'])}/{_id_number(quality['total'])} ditutup",
		}
	]


def _chart_groups(metrics, insights, doctor_metrics):
	"""Kelompok chart: Pola · Produktivitas (grup Volume dilepas atas arahan Chief)."""
	groups = []
	# Tren mingguan/bulanan (_visit_charts) sengaja tidak dirender — kartu volume juga dilepas.
	_ = metrics
	pola = _insight_charts(insights)
	if pola:
		groups.append(
			{"title": "Pola", "desc": "Hari, jam, dan komposisi pasien", "charts": pola}
		)
	prod = _doctor_charts(doctor_metrics)
	if prod:
		groups.append(
			{
				"title": "Produktivitas",
				"desc": "Per tenaga (binding IHS lokal)",
				"charts": prod,
			}
		)
	return groups


@frappe.whitelist()
def data():
	"""Metrik manajemen — permission-gated, agregat saja, tanpa PHI."""
	metrics = _visit_metrics()
	insights = _insights()
	doctor_metrics = _doctor_metrics()
	groups = _chart_groups(metrics, insights, doctor_metrics)
	flat = [ch for g in groups for ch in g["charts"]]
	panels = []
	bor_units = _bor_by_unit_panel()
	if bor_units:
		panels.append(
			{
				"title": "BOR per Unit (lokal)",
				"items": bor_units,
				"empty": "Belum ada data okupansi unit.",
			}
		)
	panels.extend(_doctor_panels(doctor_metrics))
	return {
		"cards": _bor_cards()
		+ _checkin_cards()
		+ _satusehat_cards()
		+ _insight_cards(insights)
		+ _quality_cards(_quality_metrics()),
		"actions": [],
		"panels": panels,
		"chart_groups": groups,
		"charts": flat,
	}


def _block_html():
	return f"""
<div class="rsia-ws">
	{ws_common.bar("Manajemen", "Pelaporan · via RME")}
	<div class="rsia-inner">
		<div class="rsia-note" data-sec="note" hidden></div>
		<div class="rsia-cards" data-sec="cards"><i class="rsia-skel"></i><i class="rsia-skel"></i><i class="rsia-skel"></i><i class="rsia-skel"></i></div>
		<div class="rsia-chart-groups" data-sec="chart-groups"></div>
		<div class="rsia-panels" data-sec="panels"></div>
	</div>
</div>
"""


def _block_script():
	return (
		"""
frappe.call("%s").then((r) => {
	const d = r.message || {};
	const esc = frappe.utils.escape_html;
	const sec = (n) => root_element.querySelector(`[data-sec="${n}"]`);

	if (d.note) {
		const n = sec("note");
		n.hidden = false;
		n.innerHTML = `<b>${esc(d.note.title)}</b><small>${esc(d.note.desc)}</small>`;
	}

	const cards = sec("cards");
	cards.innerHTML = "";
	(d.cards || []).forEach((c) => {
		const el = document.createElement(c.route ? "a" : "div");
		el.className = "rsia-card";
		if (c.route) el.href = c.route;
		el.innerHTML = `<b>${esc(String(c.value))}</b><label>${esc(c.label)}</label>` +
			(c.sub ? `<small>${esc(c.sub)}</small>` : "");
		cards.appendChild(el);
	});
	if (!(d.cards || []).length) cards.remove();

	const renderChart = (ch, host) => {
		const max = Math.max(1, ...ch.series.flatMap((s) => s.values));
		const box = document.createElement("div");
		box.className = "rsia-chart";
		const tint = (s) => (s.color ? `background:${esc(s.color)}` : "");
		const legend = ch.series.map((s, i) =>
			`<span class="rsia-legend"><i class="s${i}" style="${tint(s)}"></i>${esc(s.label)}</span>`).join("");
		const caption = ch.caption
			? `<div class="rsia-chart-caption">${esc(ch.caption)}</div>` : "";
		box.innerHTML = `<div class="rsia-ws-kicker">${esc(ch.title)}</div>` + caption +
			`<div class="rsia-chart-legend">${legend}</div>`;
		const bars = document.createElement("div");
		bars.className = "rsia-chart-bars";
		ch.labels.forEach((lb, idx) => {
			const col = document.createElement("div");
			col.className = "rsia-chart-col";
			const pair = ch.series.map((s, i) => {
				const v = s.values[idx] || 0;
				const h = Math.max(2, Math.round((v / max) * 100));
				return `<i class="s${i}" style="height:${h}%%;${tint(s)}" title="${esc(s.label)}: ${v}"></i>`;
			}).join("");
			col.innerHTML = `<span class="rsia-chart-pair">${pair}</span>` +
				`<label>${esc(lb)}</label>`;
			bars.appendChild(col);
		});
		box.appendChild(bars);
		host.appendChild(box);
	};

	const groupsHost = sec("chart-groups");
	const groups = (d.chart_groups || []).filter((g) => (g.charts || []).length);
	if (!groups.length && (d.charts || []).length) {
		groups.push({ title: "Analisis", desc: "", charts: d.charts });
	}
	groups.forEach((g) => {
		const section = document.createElement("div");
		section.className = "rsia-chart-group";
		section.innerHTML =
			`<div class="rsia-group-head">` +
			`<div class="rsia-ws-kicker">${esc(g.title)}</div>` +
			(g.desc ? `<small>${esc(g.desc)}</small>` : "") +
			`</div>`;
		const grid = document.createElement("div");
		grid.className = "rsia-charts";
		(g.charts || []).forEach((ch) => renderChart(ch, grid));
		section.appendChild(grid);
		groupsHost.appendChild(section);
	});
	if (!groups.length) groupsHost.remove();

	const panels = sec("panels");
	(d.panels || []).forEach((p) => {
		const isDoctor = (p.items || []).some((it) => it.mid != null);
		const col = document.createElement("div");
		col.className = isDoctor ? "rsia-panel rsia-doctor-panel" : "rsia-panel";
		col.innerHTML = `<div class="rsia-ws-kicker">${esc(p.title)}</div>` +
			(isDoctor
				? `<div class="rsia-doctor-head">` +
					`<span>Nama dokter</span><span>Jadwal poli</span><span>Bulan ini</span>` +
					`</div>`
				: "");
		const list = document.createElement("div");
		list.className = "rsia-list";
		if (!(p.items || []).length) {
			list.innerHTML = `<div class="rsia-empty">${esc(p.empty || "Belum ada data.")}</div>`;
		} else {
			p.items.forEach((it) => {
				const a = document.createElement(it.route ? "a" : "div");
				a.className = isDoctor ? "rsia-row rsia-doctor-row" : "rsia-row";
				if (it.route) a.href = it.route;
				a.innerHTML =
					`<span class="rsia-row-txt"><b>${esc(it.title)}</b>` +
					(it.sub ? `<small>${esc(it.sub)}</small>` : "") + `</span>` +
					(isDoctor
						? `<span class="rsia-row-mid">${esc(it.mid || "—")}</span>`
						: "") +
					(it.right ? `<span class="rsia-row-right">${esc(it.right)}</span>` : "");
				list.appendChild(a);
			});
		}
		col.appendChild(list);
		panels.appendChild(col);
	});
	if (!(d.panels || []).length) panels.remove();
}).catch(() => {
	root_element.querySelector(".rsia-inner").innerHTML =
		'<div class="rsia-empty">Metrik belum dapat dimuat. Buka daftar lengkap untuk melihat data.</div>';
});
"""
		% "sentra_mantra_indonesia.ws_manajemen.data"
	)


# Perluasan gaya khusus chart — bahasa desain sama (border tipis, kicker
# uppercase, netral ikut tema; aksen #FF4B26 hanya untuk hover, sesuai aturan).
_CHART_STYLE = """
.rsia-chart-groups { display: flex; flex-direction: column; gap: 20px; }
.rsia-chart-group { display: flex; flex-direction: column; gap: 10px; }
.rsia-group-head { display: flex; flex-direction: column; gap: 2px; }
.rsia-group-head .rsia-ws-kicker { border-bottom: none; padding-bottom: 0; }
.rsia-group-head small { font-size: 12px; color: var(--text-muted); }
.rsia-charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.rsia-chart { border: 1px solid var(--border-color); border-radius: 8px; padding: 12px 14px; min-width: 0; }
.rsia-chart-caption { margin-top: 4px; font-size: 12px; color: var(--text-muted); }
.rsia-chart-legend { display: flex; gap: 14px; margin-top: 8px; }
.rsia-legend { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-muted); }
.rsia-legend i { width: 9px; height: 9px; border-radius: 2px; display: block; }
.rsia-legend i.s0, .rsia-chart-pair i.s0 { background: #171717; }
:host-context([data-theme="dark"]) .rsia-legend i.s0,
:host-context([data-theme="dark"]) .rsia-chart-pair i.s0 { background: #e5e5e5; }
.rsia-legend i.s1, .rsia-chart-pair i.s1 { background: #a3a3a3; }
.rsia-chart-bars { display: flex; align-items: flex-end; gap: 8px; height: 120px; margin-top: 12px; }
.rsia-chart-col { flex: 1; min-width: 0; display: flex; flex-direction: column; height: 100%; }
.rsia-chart-pair { flex: 1; display: flex; align-items: flex-end; justify-content: center; gap: 3px; }
.rsia-chart-pair i { display: block; width: 100%; max-width: 14px; border-radius: 3px 3px 0 0; transition: filter 120ms ease, background 120ms ease; }
/* Warna seri di-set inline dari data(); hover pakai filter supaya tetap
   berlaku di atas inline style (background hover kalah spesifisitas). */
.rsia-chart-pair i:hover { filter: brightness(1.25) saturate(1.2); }
.rsia-chart-col label { margin-top: 6px; font-size: 10px; text-align: center; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rsia-doctor-head, .rsia-doctor-row {
	display: grid;
	grid-template-columns: minmax(0, 1.4fr) minmax(0, 1.2fr) auto;
	gap: 12px;
	align-items: start;
}
.rsia-doctor-head {
	margin-top: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--border-color);
	font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--text-muted);
}
.rsia-doctor-head span:last-child, .rsia-doctor-row .rsia-row-right { text-align: right; }
.rsia-doctor-row .rsia-row-txt b {
	white-space: normal; overflow: visible; text-overflow: unset;
}
.rsia-doctor-row .rsia-row-mid {
	font-size: 12px; line-height: 18px; color: var(--text-muted);
}
.rsia-doctor-row .rsia-row-right { margin-left: 0; }
"""


def _inject_after(workspace, block_name, block_id, after_block):
	"""Idempoten: pasang blok tepat di bawah blok `after_block` (atau paling atas)."""
	ws = frappe.get_doc("Workspace", workspace)
	if not any(cb.custom_block_name == block_name for cb in ws.custom_blocks):
		ws.append("custom_blocks", {"custom_block_name": block_name, "label": block_name})
	content = json.loads(ws.content)
	if not any(
		b.get("type") == "custom_block" and b["data"].get("custom_block_name") == block_name
		for b in content
	):
		position = 0
		for index, block in enumerate(content):
			if (
				block.get("type") == "custom_block"
				and block["data"].get("custom_block_name") == after_block
			):
				position = index + 1
				break
		content.insert(
			position,
			{"id": block_id, "type": "custom_block", "data": {"custom_block_name": block_name, "col": 12}},
		)
		ws.content = json.dumps(content)
	ws.save()
	frappe.clear_document_cache("Workspace", workspace)


def setup():
	_clear_doctor_metrics_cache()
	ws_common.upsert_block(
		BLOCK_NAME,
		_block_html(),
		_block_script(),
		ws_common.BLOCK_STYLE + _CHART_STYLE,
	)
	_inject_after(WORKSPACE, BLOCK_NAME, "rsiaManajemen", KLINIK_BLOCK)
	layout = clinic_workspace.apply()
	frappe.db.commit()
	return {"block": BLOCK_NAME, "workspace": WORKSPACE, "layout": layout}
