"""Encounter insights: satu sweep harian -> heatmap jam/hari, pasien baru vs
lama, dan LOS/okupansi inap. Semua keluaran agregat murni (nol identitas);
sumber gagal -> None, tidak pernah nol palsu."""

import json
from datetime import date
from unittest.mock import MagicMock, patch

from frappe.tests.utils import FrappeTestCase

from sentra_mantra_integrations.satusehat import insights


def _enc(start, end=None, klass="AMB", subject="P1", status="finished"):
	return {
		"start": start,
		"end": end,
		"class": klass,
		"subject": subject,
		"status": status,
	}


ROWS = [
	# Senin 2026-02-02 pagi — P1 pertama kali muncul (baru di Feb)
	_enc("2026-02-02T08:30:00+07:00", subject="P1"),
	# Rabu 2026-07-01 pagi — P1 kembali (lama di Jul)
	_enc("2026-07-01T09:00:00+07:00", subject="P1"),
	# Rabu 2026-07-01 sore — P2 pertama kali (baru di Jul)
	_enc("2026-07-01T16:00:00+07:00", subject="P2"),
	# Inap selesai: 2 hari persis
	_enc("2026-07-05T10:00:00+07:00", end="2026-07-07T10:00:00+07:00", klass="IMP", subject="P3"),
	# Inap selesai: 1 hari
	_enc("2026-07-10T10:00:00+07:00", end="2026-07-11T10:00:00+07:00", klass="IMP", subject="P4"),
	# Inap masih berjalan (aktif) — tanpa end
	_enc("2026-07-20T10:00:00+07:00", klass="IMP", subject="P5", status="in-progress"),
]


class TestAggregations(FrappeTestCase):
	def test_day_of_week_and_hour_histograms(self):
		result = insights._time_patterns(ROWS)
		# Senin = index 0: 2 kunjungan (2 Feb + 20 Jul); Rabu = index 2: 2 kunjungan
		self.assertEqual(len(result["day_of_week"]), 7)
		self.assertEqual(result["day_of_week"][0], 2)
		self.assertEqual(result["day_of_week"][2], 2)
		self.assertEqual(len(result["hour_of_day"]), 24)
		self.assertEqual(result["hour_of_day"][8], 1)
		self.assertEqual(result["hour_of_day"][9], 1)
		self.assertEqual(result["hour_of_day"][10], 3)
		self.assertEqual(result["hour_of_day"][16], 1)

	def test_new_vs_returning_per_month(self):
		result = insights._new_vs_returning(ROWS, ref=date(2026, 7, 22), months=6)
		self.assertEqual(len(result), 6)
		feb = result[0]
		self.assertEqual((feb["year"], feb["month"]), (2026, 2))
		self.assertEqual((feb["new"], feb["returning"]), (1, 0))
		jul = result[-1]
		self.assertEqual((jul["year"], jul["month"]), (2026, 7))
		# Jul: P2/P3/P4/P5 baru (4), P1 lama (1)
		self.assertEqual((jul["new"], jul["returning"]), (4, 1))

	def test_inpatient_los_and_active(self):
		result = insights._inpatient(ROWS)
		self.assertEqual(result["finished"], 2)
		self.assertEqual(result["active"], 1)
		self.assertAlmostEqual(result["avg_los_days"], 1.5)

	def test_inpatient_none_when_no_imp(self):
		result = insights._inpatient([_enc("2026-07-01T08:00:00+07:00")])
		self.assertIsNone(result["avg_los_days"])
		self.assertEqual(result["active"], 0)


class TestEncounterInsights(FrappeTestCase):
	def _run(self, sweep_result, cached=None):
		cache = MagicMock()
		cache.get_value.return_value = cached
		side = sweep_result if isinstance(sweep_result, Exception) else (lambda: sweep_result)
		with (
			patch("sentra_mantra_integrations.satusehat.insights.is_configured", return_value=True),
			patch(
				"sentra_mantra_integrations.satusehat.insights._sweep_encounters", side_effect=side
			) as sweep,
			patch("sentra_mantra_integrations.satusehat.insights.frappe.cache", return_value=cache),
		):
			result = insights.encounter_insights(ref_date=date(2026, 7, 22))
		return result, sweep, cache

	def test_combines_all_three_insights_and_caches_daily(self):
		result, _, cache = self._run(ROWS)
		self.assertEqual(result["day_of_week"][2], 2)
		self.assertEqual(result["new_vs_returning"][-1]["new"], 4)
		self.assertAlmostEqual(result["inpatient"]["avg_los_days"], 1.5)
		cache.set_value.assert_called_once()
		self.assertEqual(
			cache.set_value.call_args.kwargs["expires_in_sec"], insights.CACHE_TTL_SECONDS
		)

	def test_cached_value_skips_sweep(self):
		payload = {"day_of_week": [0] * 7, "hour_of_day": [0] * 24, "new_vs_returning": [], "inpatient": {}}
		result, sweep, _ = self._run(ROWS, cached=json.dumps(payload))
		self.assertEqual(result, payload)
		sweep.assert_not_called()

	def test_sweep_failure_returns_none(self):
		from sentra_mantra_integrations.satusehat.client import SatuSehatClientError

		result, _, cache = self._run(SatuSehatClientError("rejected"))
		self.assertIsNone(result)
		cache.set_value.assert_not_called()

	def test_unconfigured_returns_none(self):
		with patch(
			"sentra_mantra_integrations.satusehat.insights.is_configured", return_value=False
		):
			self.assertIsNone(insights.encounter_insights(ref_date=date(2026, 7, 22)))
