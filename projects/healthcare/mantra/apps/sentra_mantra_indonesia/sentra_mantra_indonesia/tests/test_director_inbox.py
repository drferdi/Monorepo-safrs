"""Director Decision Inbox contract and permission regressions."""

from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from sentra_mantra_indonesia.insights import director_inbox


class TestDirectorInbox(TestCase):
	def test_persona_matrix_exposes_named_rows_only_to_director_and_system_manager(self):
		matrix = (
			(("umum", ["Employee"]), False),
			(("clinical", ["Nursing User", "Employee"]), False),
			(("finance", ["Accounts User", "Employee"]), False),
			(("finance", ["Accounts Manager", "Employee"]), False),
			(("umum", ["MANTRA Director", "Employee"]), True),
			(("chief", ["System Manager"]), True),
		)

		for (resolved_persona, roles), allowed in matrix:
			with self.subTest(roles=roles):
				with (
					patch(
						"sentra_mantra_indonesia.insights.persona",
						return_value=(resolved_persona, None),
					),
					patch(
						"sentra_mantra_indonesia.insights.frappe.get_roles",
						return_value=roles,
					),
					patch("sentra_mantra_indonesia.insights.can", return_value=False),
					patch(
						"sentra_mantra_indonesia.insights.frappe.get_attr",
						return_value=lambda: [],
					) as get_attr,
				):
					director_inbox()

				self.assertEqual(get_attr.called, allowed)

	def test_non_director_receives_no_named_rows(self):
		with (
			patch("sentra_mantra_indonesia.insights.persona", return_value=("umum", None)),
			patch("sentra_mantra_indonesia.insights.frappe.get_roles", return_value=["Employee"]),
			patch("sentra_mantra_indonesia.insights.frappe.get_list") as get_list,
		):
			self.assertEqual(director_inbox(), {"items": []})
		get_list.assert_not_called()

	def test_pending_rows_include_decision_contract_and_age_urgency(self):
		now = datetime(2026, 7, 26, 10, 0, 0)

		def rows(doctype, **kwargs):
			if doctype == "Purchase Invoice":
				return [
					SimpleNamespace(
						name="ACC-PINV-2026-00001",
						grand_total=1250000,
						creation=now - timedelta(days=3),
						workflow_state="Director Review",
					)
				]
			return []

		with (
			patch("sentra_mantra_indonesia.insights.persona", return_value=("chief", None)),
			patch("sentra_mantra_indonesia.insights.frappe.get_roles", return_value=["System Manager"]),
			patch("sentra_mantra_indonesia.insights.can", return_value=True),
			patch("sentra_mantra_indonesia.insights.frappe.get_list", side_effect=rows),
			patch("sentra_mantra_indonesia.insights.now_datetime", return_value=now),
			patch(
				"sentra_mantra_indonesia.insights.frappe.get_attr",
				return_value=lambda: [],
			),
		):
			item = director_inbox()["items"][0]

		self.assertEqual(item["doctype"], "Purchase Invoice")
		self.assertEqual(item["name"], "ACC-PINV-2026-00001")
		self.assertEqual(item["amount"], 1250000)
		self.assertEqual(item["age_days"], 3)
		self.assertEqual(item["workflow_state"], "Director Review")
		self.assertEqual(item["next_owner_role"], "MANTRA Director")
		self.assertEqual(item["urgency"], "attention")
		self.assertEqual(item["route"], "/app/purchase-invoice/ACC-PINV-2026-00001")

	def test_amount_is_omitted_when_doctype_permission_is_missing(self):
		now = datetime(2026, 7, 26, 10, 0, 0)
		row = SimpleNamespace(
			name="ACC-JV-2026-00001",
			total_debit=800000,
			creation=now,
			workflow_state="Director Review",
		)

		def permitted(doctype):
			return doctype != "Journal Entry"

		with (
			patch("sentra_mantra_indonesia.insights.persona", return_value=("chief", None)),
			patch("sentra_mantra_indonesia.insights.frappe.get_roles", return_value=["System Manager"]),
			patch("sentra_mantra_indonesia.insights.can", side_effect=permitted),
			patch(
				"sentra_mantra_indonesia.insights.frappe.get_list",
				side_effect=lambda doctype, **kwargs: [row] if doctype == "Journal Entry" else [],
			),
			patch("sentra_mantra_indonesia.insights.now_datetime", return_value=now),
			patch(
				"sentra_mantra_indonesia.insights.frappe.get_attr",
				return_value=lambda: [],
			),
		):
			items = director_inbox()["items"]

		self.assertFalse(any(item["doctype"] == "Journal Entry" for item in items))

	def test_referral_exception_uses_public_adapter_and_is_always_critical(self):
		now = datetime(2026, 7, 26, 10, 0, 0)
		adapter = lambda: [
			{
				"name": "REF-SET-00001",
				"amount": 250000,
				"creation": now,
				"workflow_state": "Exception",
			}
		]

		with (
			patch("sentra_mantra_indonesia.insights.persona", return_value=("chief", None)),
			patch("sentra_mantra_indonesia.insights.frappe.get_roles", return_value=["System Manager"]),
			patch("sentra_mantra_indonesia.insights.can", return_value=True),
			patch("sentra_mantra_indonesia.insights.frappe.get_list", return_value=[]),
			patch("sentra_mantra_indonesia.insights.now_datetime", return_value=now),
			patch(
				"sentra_mantra_indonesia.insights.frappe.get_attr",
				return_value=adapter,
			) as get_attr,
		):
			item = director_inbox()["items"][0]

		get_attr.assert_called_with(
			"sentra_mantra_hospital.referral.reporting.director_exceptions"
		)
		self.assertEqual(item["doctype"], "Referral Settlement")
		self.assertEqual(item["urgency"], "critical")
		self.assertEqual(item["next_owner_role"], "MANTRA Director")

	def test_inbox_sorts_critical_before_attention_before_normal(self):
		now = datetime(2026, 7, 26, 10, 0, 0)
		rows_by_doctype = {
			"Material Request": [
				SimpleNamespace(
					name="MAT-MR-00001",
					creation=now,
					workflow_state="Finance Review",
				)
			],
			"Purchase Order": [
				SimpleNamespace(
					name="PUR-ORD-00001",
					grand_total=10,
					creation=now - timedelta(days=2),
					workflow_state="Director Review",
				)
			],
			"Payment Entry": [
				SimpleNamespace(
					name="ACC-PAY-00001",
					paid_amount=20,
					creation=now - timedelta(days=4),
					workflow_state="Director Review",
				)
			],
		}

		with (
			patch("sentra_mantra_indonesia.insights.persona", return_value=("chief", None)),
			patch("sentra_mantra_indonesia.insights.frappe.get_roles", return_value=["System Manager"]),
			patch("sentra_mantra_indonesia.insights.can", return_value=True),
			patch(
				"sentra_mantra_indonesia.insights.frappe.get_list",
				side_effect=lambda doctype, **kwargs: rows_by_doctype.get(doctype, []),
			),
			patch("sentra_mantra_indonesia.insights.now_datetime", return_value=now),
			patch(
				"sentra_mantra_indonesia.insights.frappe.get_attr",
				return_value=lambda: [],
			),
		):
			urgencies = [item["urgency"] for item in director_inbox()["items"]]

		self.assertEqual(urgencies, ["critical", "attention", "normal"])
