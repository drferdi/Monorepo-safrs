"""Blok "Manajemen RSIA": kartu & tren kunjungan bersumber agregat SATUSEHAT.

Mirrors test_ws_klinik_cards.py discipline: no permission -> nothing rendered,
failed/unavailable source -> nothing rendered (never fake zeros).
"""

from unittest import TestCase
from unittest.mock import patch

from sentra_mantra_indonesia.ws_manajemen import (
	_block_html,
	_bor_by_unit_panel,
	_bor_cards,
	_chart_groups,
	_checkin_cards,
	_doctor_charts,
	_doctor_panels,
	_insight_cards,
	_insight_charts,
	_is_roster_doctor,
	_late_checkin_count,
	_on_duty_checkin_count,
	_quality_cards,
	_satusehat_cards,
	_short_doctor_label,
	_visit_cards,
	_visit_charts,
	_visit_metrics,
)

METRICS = {
	"today": 0,
	"week": 17,
	"month": 121,
	"weekly": [
		{"start": "2026-06-01", "value": 30},
		{"start": "2026-06-08", "value": 41},
	],
	"monthly": [
		{"year": 2026, "month": 5, "value": 150},
		{"year": 2026, "month": 6, "value": 169},
		{"year": 2026, "month": 7, "value": 121},
	],
}


class TestSatusehatCards(TestCase):
	def test_reads_latest_completed_aggregate_snapshot(self):
		totals = {"Patient": [{"total_records": 2736}], "Encounter": [{"total_records": 6446}]}
		with (
			patch("sentra_mantra_indonesia.ws_manajemen.ws_common.can", return_value=True),
			patch(
				"sentra_mantra_indonesia.ws_manajemen.frappe.get_all",
				side_effect=lambda doctype, filters=None, **kw: totals[filters["resource_type"]],
			),
		):
			cards = _satusehat_cards()

		self.assertEqual(
			[(c["label"], c["value"], c["sub"]) for c in cards],
			[
				("Pasien Tercatat", 2736, "Snapshot SATUSEHAT"),
				("Encounter Tercatat", 6446, "Snapshot SATUSEHAT"),
			],
		)

	def test_no_permission_no_satusehat_cards(self):
		with patch("sentra_mantra_indonesia.ws_manajemen.ws_common.can", return_value=False):
			self.assertEqual(_satusehat_cards(), [])

	def test_missing_snapshot_renders_no_fake_zero(self):
		with (
			patch("sentra_mantra_indonesia.ws_manajemen.ws_common.can", return_value=True),
			patch("sentra_mantra_indonesia.ws_manajemen.frappe.get_all", return_value=[]),
		):
			self.assertEqual(_satusehat_cards(), [])


class TestVisitMetricsGate(TestCase):
	def test_no_permission_never_calls_integrations(self):
		with (
			patch("sentra_mantra_indonesia.ws_manajemen.ws_common.can", return_value=False),
			patch("sentra_mantra_indonesia.ws_manajemen.frappe.get_attr") as get_attr,
		):
			self.assertIsNone(_visit_metrics())
		get_attr.assert_not_called()

	def test_source_failure_returns_none(self):
		with (
			patch("sentra_mantra_indonesia.ws_manajemen.ws_common.can", return_value=True),
			patch(
				"sentra_mantra_indonesia.ws_manajemen.frappe.get_attr",
				side_effect=RuntimeError("module unavailable"),
			),
		):
			self.assertIsNone(_visit_metrics())


class TestVisitCards(TestCase):
	def test_volume_cards_removed(self):
		self.assertEqual(_visit_cards(METRICS), [])
		self.assertEqual(_visit_cards(None), [])


class TestCheckinCards(TestCase):
	def test_on_duty_and_late_from_checkin(self):
		with (
			patch("sentra_mantra_indonesia.ws_manajemen.ws_common.can", return_value=True),
			patch("sentra_mantra_indonesia.ws_manajemen.today", return_value="2026-07-23"),
			patch(
				"sentra_mantra_indonesia.ws_manajemen._on_duty_checkin_count",
				return_value=12,
			),
			patch(
				"sentra_mantra_indonesia.ws_manajemen._late_checkin_count",
				return_value=3,
			),
		):
			cards = _checkin_cards()
		self.assertEqual(
			[(c["label"], c["value"], c["sub"]) for c in cards],
			[
				("On Duty Staff", 12, "Check-in hari ini"),
				("Late Staff", 3, "Check-in terlambat"),
			],
		)

	def test_no_permission_no_checkin_cards(self):
		with patch("sentra_mantra_indonesia.ws_manajemen.ws_common.can", return_value=False):
			self.assertEqual(_checkin_cards(), [])

	def test_query_failure_omits_card_no_fake_zero(self):
		with (
			patch("sentra_mantra_indonesia.ws_manajemen.ws_common.can", return_value=True),
			patch("sentra_mantra_indonesia.ws_manajemen.today", return_value="2026-07-23"),
			patch(
				"sentra_mantra_indonesia.ws_manajemen._on_duty_checkin_count",
				return_value=None,
			),
			patch(
				"sentra_mantra_indonesia.ws_manajemen._late_checkin_count",
				return_value=None,
			),
		):
			self.assertEqual(_checkin_cards(), [])

	def test_count_helpers_return_none_on_sql_error(self):
		with patch(
			"sentra_mantra_indonesia.ws_manajemen.frappe.db.sql",
			side_effect=RuntimeError("db down"),
		):
			self.assertIsNone(_on_duty_checkin_count("2026-07-23"))
			self.assertIsNone(_late_checkin_count("2026-07-23"))


class TestBorCards(TestCase):
	def test_bor_pct_and_unit_counts(self):
		def count(doctype, filters=None):
			if filters.get("occupancy_status") == "Occupied":
				return 7
			if filters.get("occupancy_status") == "Vacant":
				return 3
			return 0

		with (
			patch("sentra_mantra_indonesia.ws_manajemen.ws_common.can", return_value=True),
			patch(
				"sentra_mantra_indonesia.ws_manajemen.frappe.db.count",
				side_effect=count,
			),
		):
			cards = _bor_cards()
		self.assertEqual(
			[(c["label"], c["value"]) for c in cards],
			[
				("BOR (Bed Occupancy)", "70%"),
				("Unit Terisi", 7),
				("Unit Kosong", 3),
			],
		)

	def test_no_beds_no_fake_zero(self):
		with (
			patch("sentra_mantra_indonesia.ws_manajemen.ws_common.can", return_value=True),
			patch("sentra_mantra_indonesia.ws_manajemen.frappe.db.count", return_value=0),
		):
			self.assertEqual(_bor_cards(), [])

	def test_no_permission_empty(self):
		with patch("sentra_mantra_indonesia.ws_manajemen.ws_common.can", return_value=False):
			self.assertEqual(_bor_cards(), [])
			self.assertEqual(_bor_by_unit_panel(), [])

	def test_by_unit_panel_formats_pct(self):
		rows = [
			{"unit": "VK - MEL", "occupied": 2, "vacant": 2},
			{"unit": "NICU - MEL", "occupied": 4, "vacant": 1},
		]
		with (
			patch("sentra_mantra_indonesia.ws_manajemen.ws_common.can", return_value=True),
			patch(
				"sentra_mantra_indonesia.ws_manajemen.frappe.db.sql",
				return_value=rows,
			),
		):
			items = _bor_by_unit_panel()
		self.assertEqual(items[0]["title"], "VK")
		self.assertEqual(items[0]["right"], "50%")
		self.assertEqual(items[1]["title"], "NICU")
		self.assertEqual(items[1]["right"], "80%")


class TestManajemenCopy(TestCase):
	def test_block_bar_marks_pelaporan_zone(self):
		html = _block_html()
		self.assertIn("Pelaporan", html)
		self.assertIn("via RME", html)

	def test_quality_card_label_and_finished_sub(self):
		cards = _quality_cards(
			{"total": 100, "finished": 20, "completeness_pct": 20.0}
		)
		self.assertEqual(cards[0]["label"], "Kelengkapan Pelaporan")
		self.assertIn("/", cards[0]["sub"])

	def test_alos_card_uses_pelaporan_subtitle(self):
		cards = _insight_cards({"inpatient": {"avg_los_days": 2.1, "finished": 10, "active": 1}})
		self.assertEqual(cards[0]["label"], "ALOS (hari)")
		self.assertIn("SATUSEHAT", cards[0]["sub"])

	def test_html_includes_chart_groups_host(self):
		html = _block_html()
		self.assertIn('data-sec="chart-groups"', html)


INSIGHTS = {
	"day_of_week": [10, 5, 8, 12, 7, 20, 30],
	"hour_of_day": [0] * 6 + [2, 5, 9, 4, 3, 1, 0, 0, 1, 2, 6, 8, 7, 3, 1, 0, 0, 0],
	"new_vs_returning": [
		{"year": 2026, "month": 6, "new": 40, "returning": 129},
		{"year": 2026, "month": 7, "new": 33, "returning": 88},
	],
	"inpatient": {"avg_los_days": 2.4, "active": 3, "finished": 1005},
}


class TestInsightCharts(TestCase):
	def test_three_charts_days_hours_and_new_vs_returning(self):
		charts = _insight_charts(INSIGHTS)
		self.assertEqual(len(charts), 3)
		days, hours, nvr = charts
		self.assertEqual(days["labels"], ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"])
		self.assertEqual(days["series"][0]["values"], [10, 5, 8, 12, 7, 20, 30])
		# jam hanya rentang yang ada isinya (06..20 pada fixture)
		self.assertEqual(hours["labels"][0], "06")
		self.assertEqual(hours["labels"][-1], "20")
		self.assertEqual(hours["series"][0]["values"][0], 2)
		self.assertEqual(nvr["labels"], ["Jun", "Jul"])
		self.assertEqual(
			[s["label"] for s in nvr["series"]], ["Pasien Baru", "Pasien Lama"]
		)
		self.assertEqual(nvr["series"][0]["values"], [40, 33])
		self.assertEqual(nvr["series"][1]["values"], [129, 88])
		# Baru = aksen rust (sinyal utama), Lama = netral slate
		self.assertEqual(nvr["series"][0]["color"], "#FC7022")
		self.assertEqual(nvr["series"][1]["color"], "#00B6BF")
		self.assertEqual(days["series"][0]["color"], "#00B090")
		self.assertEqual(hours["series"][0]["color"], "#FF6F60")

	def test_no_insights_no_charts(self):
		self.assertEqual(_insight_charts(None), [])


class TestInsightCards(TestCase):
	def test_inpatient_cards_avg_los_only_no_misleading_active_count(self):
		# "Pasien Inap Aktif" dihapus (arahan Chief 2026-07-23): mayoritas encounter
		# tidak pernah ditutup vendor, jadi angka "aktif" = overcount menyesatkan.
		cards = _insight_cards(INSIGHTS)
		self.assertEqual(
			[(c["label"], c["value"]) for c in cards],
			[("ALOS (hari)", "2,4")],
		)

	def test_missing_avg_los_renders_no_fake_zero(self):
		cards = _insight_cards({"inpatient": {"avg_los_days": None, "active": 0, "finished": 0}})
		self.assertEqual(cards, [])

	def test_no_insights_no_cards(self):
		self.assertEqual(_insight_cards(None), [])


class TestQualityCards(TestCase):
	def test_completeness_card_with_indonesian_percent(self):
		cards = _quality_cards({"total": 6446, "finished": 1386, "completeness_pct": 21.5})
		self.assertEqual(
			[(c["label"], c["value"], c["sub"]) for c in cards],
			[("Kelengkapan Pelaporan", "21,5%", "1.386/6.446 ditutup")],
		)

	def test_no_metrics_no_cards(self):
		self.assertEqual(_quality_cards(None), [])


DOCTOR_METRICS = {
	"practitioners": [
		{"name": "dr. Dibya Arfianda, Sp.OG, M.Ked.Klin.", "month": 112, "total": 4831},
		{"name": "dr. Maya Kusumawati", "month": 3, "total": 275},
		# Kasus negatif allowlist pakai pseudonim — jangan taruh nama praktisi
		# riil non-roster di fixture repo (C3-F8).
		{"name": "dr. Zeta Contoh, Sp.A.", "month": 7, "total": 620},
	]
}


class TestDoctorCharts(TestCase):
	def test_short_label_keeps_title_and_first_name(self):
		self.assertEqual(_short_doctor_label("dr. Dibya Arfianda, Sp.OG, M.Ked.Klin."), "dr. Dibya")
		self.assertEqual(_short_doctor_label("dr. Fiktifiana"), "dr. Fiktifiana")

	def test_month_and_total_charts_sorted_desc(self):
		charts = _doctor_charts(DOCTOR_METRICS)
		self.assertEqual(len(charts), 2)
		month, total = charts
		self.assertEqual(month["title"], "Per Dokter · Bulan")
		# Zeta (pseudonim) tidak masuk roster Chief — hanya Dibya & Maya.
		self.assertEqual(month["labels"], ["dr. Dibya", "dr. Maya"])
		self.assertEqual(month["series"][0]["values"], [112, 3])
		self.assertEqual(month["series"][0]["color"], "#00B090")
		self.assertEqual(total["title"], "Per Dokter · Kumulatif")
		self.assertEqual(total["labels"], ["dr. Dibya", "dr. Maya"])
		self.assertEqual(total["series"][0]["values"], [4831, 275])
		self.assertEqual(total["series"][0]["color"], "#00B6BF")

	def test_no_metrics_no_charts(self):
		self.assertEqual(_doctor_charts(None), [])

	def test_roster_allowlist(self):
		self.assertTrue(_is_roster_doctor("dr. Dibya Arfianda, SpOG"))
		self.assertTrue(_is_roster_doctor("dr. Sutoko Andrianto, Sp.OG (K)"))
		self.assertFalse(_is_roster_doctor("dr. Zeta Contoh, Sp.A."))
		self.assertFalse(_is_roster_doctor("Ns. Bukan Dokter"))


class TestDoctorPanels(TestCase):
	def test_local_roster_merged_with_satusehat_volume(self):
		local = [
			{"name": "HCP-D", "practitioner_name": "dr. Dibya Arfianda, Sp.OG, M.Ked.Klin."},
			{"name": "HCP-H", "practitioner_name": "dr. Hidayati Utami Dewi, Sp.A"},
			{"name": "HCP-M", "practitioner_name": "dr. Maya Kusumawati"},
		]
		with (
			patch(
				"sentra_mantra_indonesia.ws_manajemen._local_doctors",
				return_value=local,
			),
			patch(
				"sentra_mantra_indonesia.ws_manajemen._poli_schedule_today_by_name",
				return_value={
					"dr. Dibya Arfianda, Sp.OG, M.Ked.Klin.": "Poli OBGYN · 08:00–14:00",
				},
			),
		):
			panels = _doctor_panels(DOCTOR_METRICS)
		self.assertEqual(panels[0]["title"], "Daftar Dokter · Roster & Jadwal")
		items = panels[0]["items"]
		self.assertEqual(
			[i["title"] for i in items],
			[
				"dr. Dibya Arfianda, Sp.OG, M.Ked.Klin.",
				"dr. Maya Kusumawati",
				"dr. Hidayati Utami Dewi, Sp.A",
			],
		)
		self.assertEqual(items[0]["right"], "112 bln ini")
		self.assertEqual(items[0]["mid"], "Poli OBGYN · 08:00–14:00")
		self.assertEqual(items[-1]["sub"], "Belum terikat SATUSEHAT")
		self.assertEqual(items[-1]["right"], "—")

	def test_no_local_and_no_metrics_no_panel(self):
		with patch(
			"sentra_mantra_indonesia.ws_manajemen._local_doctors",
			return_value=[],
		):
			self.assertEqual(_doctor_panels(None), [])


class TestVisitCharts(TestCase):
	def test_weekly_and_monthly_charts_with_indonesian_labels(self):
		charts = _visit_charts(METRICS)
		self.assertEqual(len(charts), 2)
		weekly, monthly = charts
		self.assertEqual(weekly["title"], "Tren Mingguan")
		self.assertEqual(weekly["labels"], ["01/06", "08/06"])
		self.assertEqual(
			weekly["series"], [{"label": "Kunjungan", "values": [30, 41], "color": "#00B6BF"}]
		)
		self.assertEqual(monthly["title"], "Tren Bulanan")
		self.assertEqual(monthly["labels"], ["Mei", "Jun", "Jul"])
		self.assertEqual(monthly["series"][0]["values"], [150, 169, 121])
		self.assertEqual(monthly["series"][0]["color"], "#FC7022")

	def test_no_metrics_no_charts(self):
		self.assertEqual(_visit_charts(None), [])


class TestChartGroups(TestCase):
	def test_groups_pola_produktivitas_no_volume(self):
		groups = _chart_groups(METRICS, INSIGHTS, DOCTOR_METRICS)
		self.assertEqual([g["title"] for g in groups], ["Pola", "Produktivitas"])
		self.assertEqual(len(groups[0]["charts"]), 3)
		self.assertEqual(len(groups[1]["charts"]), 2)

	def test_empty_sources_yield_no_groups(self):
		self.assertEqual(_chart_groups(None, None, None), [])
