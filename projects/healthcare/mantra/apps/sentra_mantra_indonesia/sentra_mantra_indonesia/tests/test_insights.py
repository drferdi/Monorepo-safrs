"""Pandangan Direktur — CEO operational signals only."""

from unittest import TestCase
from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_indonesia.insights import QUALITY_METHOD, _signals, my_insights


class TestInsights(FrappeTestCase):
	def tearDown(self):
		frappe.set_user("Administrator")
		super().tearDown()

	def test_non_chief_gets_empty_signals(self):
		with (
			patch("sentra_mantra_indonesia.insights.persona", return_value=("umum", None)),
			patch("sentra_mantra_indonesia.insights.frappe.get_roles", return_value=["Employee"]),
		):
			payload = my_insights()
		self.assertEqual(payload["persona"], "umum")
		self.assertEqual(payload["signals"], [])

	def test_chief_signals_omit_zeros(self):
		with patch("sentra_mantra_indonesia.insights.persona", return_value=("chief", None)):
			with patch("sentra_mantra_indonesia.insights.gated_count", return_value=0):
				with patch("sentra_mantra_indonesia.insights.can", return_value=False):
					payload = my_insights()
		self.assertEqual(payload["persona"], "chief")
		self.assertEqual(payload["signals"], [])

	def test_chief_surfaces_pending_approvals(self):
		def fake_count(doctype, filters):
			return 2 if doctype == "Purchase Order" else 0

		with patch("sentra_mantra_indonesia.insights.persona", return_value=("chief", None)):
			with patch("sentra_mantra_indonesia.insights.gated_count", side_effect=fake_count):
				with patch("sentra_mantra_indonesia.insights.can", return_value=False):
					payload = my_insights()
		self.assertEqual(len(payload["signals"]), 1)
		self.assertEqual(payload["signals"][0]["label"], "Persetujuan menunggu")
		self.assertEqual(payload["signals"][0]["count"], 2)

	def test_pending_approval_route_follows_largest_queue(self):
		def fake_count(doctype, filters):
			return {"Purchase Order": 2, "Payment Entry": 0, "Journal Entry": 5}.get(doctype, 0)

		with patch("sentra_mantra_indonesia.insights.persona", return_value=("chief", None)):
			with patch("sentra_mantra_indonesia.insights.gated_count", side_effect=fake_count):
				with patch("sentra_mantra_indonesia.insights.can", return_value=False):
					payload = my_insights()
		sig = payload["signals"][0]
		self.assertEqual(sig["count"], 7)
		self.assertEqual(sig["route"], "/app/journal-entry")

	def test_administrator_my_insights_no_traceback(self):
		frappe.set_user("Administrator")
		payload = my_insights()
		self.assertEqual(payload["persona"], "chief")
		self.assertIsInstance(payload["signals"], list)
		self.assertLessEqual(len(payload["signals"]), 6)


class TestManagementSignals(TestCase):
	def test_operating_signals_include_only_non_zero_counts(self):
		referral_counts = lambda: {
			"exceptions": 2,
			"unreconciled": 0,
			"failed_transfers": 3,
		}
		reconcile = lambda as_of_date: {"unreconciled": [{"type": "payable"}]}

		def _gc(doctype, filters=None):
			return {
				"Material Request": 4,
				"Purchase Receipt": 5,
			}.get(doctype, 0)

		def _method(path):
			return {
				"sentra_mantra_hospital.referral.reporting.director_signal_counts": referral_counts,
				"sentra_mantra_core.financial_cutover.reconcile": reconcile,
			}[path]

		with (
			patch("sentra_mantra_indonesia.insights.gated_count", side_effect=_gc),
			patch(
				"sentra_mantra_indonesia.insights.can",
				side_effect=lambda doctype: doctype == "GL Entry",
			),
			patch("sentra_mantra_indonesia.insights.frappe.get_attr", side_effect=_method),
		):
			signals = _signals()

		labels = [signal["label"] for signal in signals]
		self.assertIn("Referral payout exceptions", labels)
		self.assertNotIn("Referral payouts unreconciled", labels)
		self.assertIn("Procurement requests overdue", labels)
		self.assertIn("Purchase receipts not billed", labels)
		self.assertIn("Failed transfers", labels)
		self.assertIn("Daily close differences", labels)
		self.assertTrue(all(signal["count"] > 0 for signal in signals))
		self.assertTrue(all(signal["route"] for signal in signals))

	def test_signal_list_is_bounded_and_sorted_by_urgency_then_count(self):
		referral_counts = lambda: {
			"exceptions": 2,
			"unreconciled": 9,
			"failed_transfers": 5,
		}
		reconcile = lambda as_of_date: {
			"unreconciled": [{"type": "general_ledger"}] * 7
		}

		def _gc(doctype, filters=None):
			return {
				"Material Request": 8,
				"Purchase Receipt": 4,
				"Sales Invoice": 6,
				"Purchase Order": 3,
				"Payment Entry": 0,
				"Journal Entry": 0,
			}.get(doctype, 0)

		def _method(path):
			return {
				"sentra_mantra_hospital.referral.reporting.director_signal_counts": referral_counts,
				"sentra_mantra_core.financial_cutover.reconcile": reconcile,
			}[path]

		with (
			patch("sentra_mantra_indonesia.insights.gated_count", side_effect=_gc),
			patch(
				"sentra_mantra_indonesia.insights.can",
				side_effect=lambda doctype: doctype == "GL Entry",
			),
			patch("sentra_mantra_indonesia.insights.frappe.get_attr", side_effect=_method),
		):
			signals = _signals()

		self.assertEqual(len(signals), 6)
		urgencies = [signal["urgency"] for signal in signals]
		self.assertEqual(
			urgencies,
			sorted(urgencies, key={"critical": 0, "attention": 1, "normal": 2}.get),
		)
		critical_counts = [
			signal["count"] for signal in signals if signal["urgency"] == "critical"
		]
		self.assertEqual(critical_counts, sorted(critical_counts, reverse=True))

	def test_includes_leave_and_attendance_gap_when_permitted(self):
		def _gc(doctype, filters=None):
			return {
				"Leave Application": 3,
				"Employee": 50,
				"Attendance": 40,
				"Sales Invoice": 0,
				"Purchase Order": 0,
				"Payment Entry": 0,
				"Journal Entry": 0,
				"HD Ticket": 2,
			}.get(doctype, 0)

		with (
			patch("sentra_mantra_indonesia.insights.gated_count", side_effect=_gc),
			patch(
				"sentra_mantra_indonesia.insights.can",
				side_effect=lambda dt: dt
				in {"Employee", "Attendance", "HD Ticket", "Healthcare Practitioner"},
			),
			patch(
				"sentra_mantra_indonesia.insights.frappe.get_attr",
				side_effect=RuntimeError("skip ssh"),
			),
			patch(
				"sentra_mantra_indonesia.insights.frappe.db.sql",
				return_value=((0,),),
			),
		):
			labels = [s["label"] for s in _signals()]
		self.assertIn("Cuti menunggu", labels)
		self.assertIn("Kehadiran belum lengkap", labels)
		self.assertIn("Tiket Helpdesk terbuka", labels)

	def test_omits_satusehat_signal_when_quality_unavailable(self):
		with (
			patch("sentra_mantra_indonesia.insights.gated_count", return_value=0),
			patch("sentra_mantra_indonesia.insights.can", return_value=True),
			patch(
				"sentra_mantra_indonesia.insights.frappe.get_attr",
				side_effect=RuntimeError("down"),
			),
			patch(
				"sentra_mantra_indonesia.insights.frappe.db.sql",
				return_value=((0,),),
			),
		):
			labels = [s["label"] for s in _signals()]
		self.assertNotIn("Kelengkapan SATUSEHAT (%)", labels)

	def test_includes_satusehat_completeness_when_available(self):
		quality_fn = lambda: {"completeness_pct": 21.7, "finished": 1, "total": 5}

		with (
			patch("sentra_mantra_indonesia.insights.gated_count", return_value=0),
			patch("sentra_mantra_indonesia.insights.can") as can_mock,
			patch(
				"sentra_mantra_indonesia.insights.frappe.get_attr",
				return_value=quality_fn,
			) as get_attr,
			patch(
				"sentra_mantra_indonesia.insights.frappe.db.sql",
				return_value=((0,),),
			),
		):
			can_mock.side_effect = lambda dt: dt in {
				"Healthcare Practitioner",
				"SATUSEHAT Sync Batch",
				"HD Ticket",
			}
			signals = _signals()
		labels = [s["label"] for s in signals]
		self.assertIn("Kelengkapan SATUSEHAT (%)", labels)
		sig = next(s for s in signals if s["label"] == "Kelengkapan SATUSEHAT (%)")
		self.assertEqual(sig["count"], 22)
		get_attr.assert_called_with(QUALITY_METHOD)
