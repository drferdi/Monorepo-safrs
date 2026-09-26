"""Managerial visit aggregates: date-windowed _count=0 queries, cached, PHI-free."""

import json
from datetime import date
from unittest.mock import MagicMock, patch

from frappe.tests.utils import FrappeTestCase

from sentra_mantra_integrations.satusehat import metrics


def _bundle(total):
	return {"resourceType": "Bundle", "total": total}


class TestVisitCounts(FrappeTestCase):
	def _run(self, fhir_get, cached=None):
		cache = MagicMock()
		cache.get_value.return_value = cached
		with (
			patch("sentra_mantra_integrations.satusehat.metrics.is_configured", return_value=True),
			patch("sentra_mantra_integrations.satusehat.metrics.fhir_get", side_effect=fhir_get) as fg,
			patch("sentra_mantra_integrations.satusehat.metrics.frappe.cache", return_value=cache),
		):
			result = metrics.visit_counts(ref_date=date(2026, 7, 22))  # Rabu
		return result, fg, cache

	def test_windows_cover_today_week_month_and_trends(self):
		result, fg, cache = self._run(lambda path, params=None: _bundle(7))

		self.assertEqual(result["today"], 7)
		self.assertEqual(result["week"], 7)
		self.assertEqual(result["month"], 7)
		self.assertEqual(len(result["weekly"]), 8)
		self.assertEqual(len(result["monthly"]), 6)
		# 3 kartu + 8 minggu + 6 bulan = 17 query _count=0
		self.assertEqual(fg.call_count, 17)
		dates = [c.kwargs["params"]["date"] for c in fg.call_args_list]
		self.assertIn("ge2026-07-22", dates)  # hari ini
		self.assertIn("ge2026-07-20", dates)  # Senin minggu ini
		self.assertIn("ge2026-07-01", dates)  # awal bulan
		self.assertIn(["ge2026-06-01", "lt2026-06-08"], dates)  # minggu tertua
		self.assertIn(["ge2026-02-01", "lt2026-03-01"], dates)  # bulan tertua
		self.assertTrue(all(c.kwargs["params"]["_count"] == 0 for c in fg.call_args_list))
		self.assertEqual(result["weekly"][0]["start"], "2026-06-01")
		self.assertEqual(result["monthly"][0]["month"], 2)
		cache.set_value.assert_called_once()

	def test_client_error_returns_none_never_zero(self):
		from sentra_mantra_integrations.satusehat.client import SatuSehatClientError

		def boom(path, params=None):
			raise SatuSehatClientError("SATUSEHAT rejected the request")

		result, _, cache = self._run(boom)
		self.assertIsNone(result)
		cache.set_value.assert_not_called()

	def test_cached_value_skips_http_entirely(self):
		payload = {"today": 1, "week": 2, "month": 3, "weekly": [], "monthly": []}
		result, fg, _ = self._run(lambda *a, **k: _bundle(0), cached=json.dumps(payload))
		self.assertEqual(result, payload)
		fg.assert_not_called()

	def test_unconfigured_returns_none(self):
		with patch(
			"sentra_mantra_integrations.satusehat.metrics.is_configured", return_value=False
		):
			self.assertIsNone(metrics.visit_counts(ref_date=date(2026, 7, 22)))


PRACTITIONERS = [
	{"practitioner_name": "dr. Dibya Arfianda, Sp.OG, M.Ked.Klin.", "satusehat_ihs": "10007229496"},
	{"practitioner_name": "dr. Maya Kusumawati", "satusehat_ihs": "10009717804"},
]


class TestPractitionerVisitCounts(FrappeTestCase):
	def _run(self, fhir_get, practitioners=None, cached=None):
		cache = MagicMock()
		cache.get_value.return_value = cached
		with (
			patch("sentra_mantra_integrations.satusehat.metrics.is_configured", return_value=True),
			patch(
				"sentra_mantra_integrations.satusehat.metrics.frappe.get_all",
				return_value=PRACTITIONERS if practitioners is None else practitioners,
			),
			patch("sentra_mantra_integrations.satusehat.metrics.fhir_get", side_effect=fhir_get) as fg,
			patch("sentra_mantra_integrations.satusehat.metrics.frappe.cache", return_value=cache),
		):
			result = metrics.practitioner_visit_counts(ref_date=date(2026, 7, 22))
		return result, fg, cache

	def test_counts_month_and_total_per_bound_practitioner(self):
		def fake(path, params=None):
			return _bundle(112 if "date" in params else 4831)

		result, fg, cache = self._run(fake)

		self.assertEqual(len(result["practitioners"]), 2)
		self.assertEqual(result["practitioners"][0]["name"], "dr. Dibya Arfianda, Sp.OG, M.Ked.Klin.")
		self.assertEqual(result["practitioners"][0]["month"], 112)
		self.assertEqual(result["practitioners"][0]["total"], 4831)
		# 2 praktisi x (bulan ini + total) = 4 query _count=0
		self.assertEqual(fg.call_count, 4)
		for call in fg.call_args_list:
			self.assertEqual(call.kwargs["params"]["_count"], 0)
		participants = {c.kwargs["params"]["participant"] for c in fg.call_args_list}
		self.assertEqual(participants, {"Practitioner/10007229496", "Practitioner/10009717804"})
		month_calls = [c for c in fg.call_args_list if "date" in c.kwargs["params"]]
		self.assertEqual(len(month_calls), 2)
		self.assertEqual(month_calls[0].kwargs["params"]["date"], "ge2026-07-01")
		cache.set_value.assert_called_once()

	def test_no_bound_practitioners_returns_none_not_empty_chart(self):
		result, fg, _ = self._run(lambda *a, **k: _bundle(0), practitioners=[])
		self.assertIsNone(result)
		fg.assert_not_called()

	def test_client_error_returns_none(self):
		from sentra_mantra_integrations.satusehat.client import SatuSehatClientError

		def boom(path, params=None):
			raise SatuSehatClientError("rejected")

		result, _, cache = self._run(boom)
		self.assertIsNone(result)
		cache.set_value.assert_not_called()

	def test_cached_value_skips_http(self):
		payload = {"practitioners": [{"name": "dr. X", "month": 1, "total": 2}]}
		result, fg, _ = self._run(lambda *a, **k: _bundle(0), cached=json.dumps(payload))
		self.assertEqual(result, payload)
		fg.assert_not_called()

	def test_unconfigured_returns_none(self):
		with patch(
			"sentra_mantra_integrations.satusehat.metrics.is_configured", return_value=False
		):
			self.assertIsNone(metrics.practitioner_visit_counts(ref_date=date(2026, 7, 22)))


class TestReportingQuality(FrappeTestCase):
	def _run(self, fhir_get, cached=None):
		cache = MagicMock()
		cache.get_value.return_value = cached
		with (
			patch("sentra_mantra_integrations.satusehat.metrics.is_configured", return_value=True),
			patch("sentra_mantra_integrations.satusehat.metrics.fhir_get", side_effect=fhir_get) as fg,
			patch("sentra_mantra_integrations.satusehat.metrics.frappe.cache", return_value=cache),
		):
			result = metrics.reporting_quality(ref_date=date(2026, 7, 22))
		return result, fg, cache

	def test_completeness_is_finished_over_total(self):
		def fake(path, params=None):
			return _bundle(1386 if params.get("status") == "finished" else 6446)

		result, fg, cache = self._run(fake)
		self.assertEqual(result, {"total": 6446, "finished": 1386, "completeness_pct": 21.5})
		self.assertEqual(fg.call_count, 2)
		cache.set_value.assert_called_once()

	def test_zero_total_returns_none_never_division_error(self):
		result, _, cache = self._run(lambda path, params=None: _bundle(0))
		self.assertIsNone(result)
		cache.set_value.assert_not_called()

	def test_client_error_returns_none(self):
		from sentra_mantra_integrations.satusehat.client import SatuSehatClientError

		def boom(path, params=None):
			raise SatuSehatClientError("rejected")

		result, _, _ = self._run(boom)
		self.assertIsNone(result)

	def test_cached_value_skips_http(self):
		payload = {"total": 10, "finished": 5, "completeness_pct": 50.0}
		result, fg, _ = self._run(lambda *a, **k: _bundle(0), cached=json.dumps(payload))
		self.assertEqual(result, payload)
		fg.assert_not_called()
