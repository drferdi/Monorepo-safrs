"""Permission-safe, non-PHI daily referral settlement summary."""

from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_hospital.referral.reporting import (
	daily_summary,
	director_exceptions,
	director_signal_counts,
)


class TestReferralReporting(FrappeTestCase):
	def test_daily_summary_returns_only_aggregate_contract(self):
		"""Leaking a patient-linked row or misclassifying a payout must fail."""
		handovers = [
			frappe._dict(
				name="REF-HANDOVER-2026-00001",
				eligible_amount=500_000,
				eligibility_status="Eligible",
			),
			frappe._dict(
				name="REF-HANDOVER-2026-00002",
				eligible_amount=300_000,
				eligibility_status="Eligible",
			),
			frappe._dict(
				name="REF-HANDOVER-2026-00003",
				eligible_amount=0,
				eligibility_status="Exception",
			),
		]
		settlements = [
			frappe._dict(
				referral_handover="REF-HANDOVER-2026-00001",
				amount=500_000,
				payment_channel="Cash",
				payment_status="Paid",
				purchase_invoice="PI-SYNTHETIC-1",
				payment_entry="PE-SYNTHETIC-1",
			),
			frappe._dict(
				referral_handover="REF-HANDOVER-2026-00002",
				amount=300_000,
				payment_channel="Transfer",
				payment_status="Payment Failed",
				purchase_invoice="PI-SYNTHETIC-2",
				payment_entry=None,
			),
			frappe._dict(
				referral_handover="REF-HANDOVER-2026-00003",
				amount=0,
				payment_channel="Cash",
				payment_status="Exception",
				purchase_invoice=None,
				payment_entry=None,
			),
		]

		with (
			patch.object(frappe, "get_roles", return_value=["Accounts Manager"]),
			patch.object(frappe, "get_list", side_effect=[handovers, settlements]),
			patch.object(frappe.db, "get_value", return_value=1),
		):
			result = daily_summary("2026-08-01")

		self.assertEqual(
			result,
			{
				"date": "2026-08-01",
				"handovers": 3,
				"eligible_amount": 800_000.0,
				"paid_amount": 500_000.0,
				"cash_amount": 500_000.0,
				"transfer_amount": 0.0,
				"pending": 0,
				"unreconciled": 1,
				"exceptions": 1,
			},
		)

	def test_paid_label_with_draft_accounting_is_an_exception_not_confirmed(self):
		"""Counting a draft-linked payout as confirmed must fail."""
		handovers = [
			frappe._dict(
				name="REF-HANDOVER-2026-00001",
				eligible_amount=500_000,
				eligibility_status="Eligible",
			)
		]
		settlements = [
			frappe._dict(
				referral_handover="REF-HANDOVER-2026-00001",
				amount=500_000,
				payment_channel="Transfer",
				payment_status="Paid",
				purchase_invoice="PI-DRAFT",
				payment_entry="PE-SUBMITTED",
			)
		]

		def accounting_docstatus(doctype, name, fieldname):
			if doctype == "Purchase Invoice":
				return 0
			return 1

		with (
			patch.object(frappe, "get_roles", return_value=["Accounts Manager"]),
			patch.object(frappe, "get_list", side_effect=[handovers, settlements]),
			patch.object(frappe.db, "get_value", side_effect=accounting_docstatus),
		):
			result = daily_summary("2026-08-01")

		self.assertEqual(result["paid_amount"], 0)
		self.assertEqual(result["transfer_amount"], 0)
		self.assertEqual(result["exceptions"], 1)

	def test_empty_authorized_day_returns_zero_aggregates(self):
		"""Treating a valid empty day as an error must fail."""
		with (
			patch.object(frappe, "get_roles", return_value=["Accounts Manager"]),
			patch.object(frappe, "get_list", return_value=[]),
		):
			result = daily_summary("2026-08-01")

		self.assertEqual(result["handovers"], 0)
		self.assertEqual(result["paid_amount"], 0)
		self.assertEqual(result["exceptions"], 0)

	def test_unauthorized_user_cannot_read_financial_referral_aggregate(self):
		"""Exposing payout amounts to a generic employee must fail."""
		with patch.object(frappe, "get_roles", return_value=["Employee"]):
			with self.assertRaises(frappe.PermissionError):
				daily_summary("2026-08-01")

	def test_director_exception_adapter_returns_only_non_phi_decision_fields(self):
		rows = [
			frappe._dict(
				name="REF-SET-00001",
				amount=250_000,
				creation="2026-08-01 08:00:00",
				workflow_state="Exception",
			)
		]
		with (
			patch.object(frappe, "get_roles", return_value=["MANTRA Director"]),
			patch.object(frappe, "get_list", return_value=rows) as get_list,
		):
			result = director_exceptions()

		self.assertEqual(result, rows)
		fields = get_list.call_args.kwargs["fields"]
		self.assertEqual(
			fields,
			["name", "amount", "creation", "payment_status as workflow_state"],
		)
		self.assertFalse(any("patient" in field.lower() for field in fields))

	def test_director_signal_counts_separates_failure_buckets(self):
		rows = [
			frappe._dict(payment_status="Exception"),
			frappe._dict(payment_status="Unreconciled"),
			frappe._dict(payment_status="Payment Failed"),
			frappe._dict(payment_status="Payment Failed"),
		]
		with (
			patch.object(frappe, "get_roles", return_value=["MANTRA Director"]),
			patch.object(frappe, "get_list", return_value=rows),
		):
			result = director_signal_counts()

		self.assertEqual(
			result,
			{"exceptions": 1, "unreconciled": 1, "failed_transfers": 2},
		)
