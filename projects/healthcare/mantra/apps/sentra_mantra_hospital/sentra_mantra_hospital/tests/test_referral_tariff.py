"""Deterministic, effective-dated referral tariff selection."""

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_hospital.referral.tariff import match_tariff


class TestReferralTariffMatching(FrappeTestCase):
	def setUp(self):
		super().setUp()
		self.company = (
			frappe.defaults.get_global_default("company")
			or frappe.db.get_value("Company", {}, "name")
		)
		self.service_item = self._make_service_item()
		self.expense_account = frappe.db.get_value(
			"Account",
			{"company": self.company, "root_type": "Expense", "is_group": 0},
			"name",
		)
		self.cost_center = frappe.db.get_value(
			"Cost Center", {"company": self.company, "is_group": 0}, "name"
		)
		self.payer_category = f"Synthetic-{frappe.generate_hash(length=8)}"

	def _make_service_item(self):
		item_code = f"SYNTHETIC-REFERRAL-SERVICE-{frappe.generate_hash(length=8)}"
		frappe.get_doc(
			{
				"doctype": "Item",
				"item_code": item_code,
				"item_name": "Synthetic Referral Service",
				"item_group": frappe.db.get_value("Item Group", {"is_group": 0}, "name"),
				"stock_uom": frappe.db.get_value("UOM", {"enabled": 1}, "name"),
				"is_stock_item": 0,
			}
		).insert(ignore_permissions=True)
		return item_code

	def _make_rule(self, **overrides):
		values = {
			"doctype": "Referral Tariff Rule",
			"company": self.company,
			"payer_category": self.payer_category,
			"service_line": "Outpatient",
			"amount": 500_000,
			"effective_from": "2026-08-01",
			"effective_to": None,
			"priority": 0,
			"service_item": self.service_item,
			"expense_account": self.expense_account,
			"cost_center": self.cost_center,
			"active": 1,
			"approved_by": "Administrator",
			"approved_on": "2026-07-26 12:00:00",
			"approval_reference": "SYNTHETIC-TEST",
		}
		values.update(overrides)
		return frappe.get_doc(values).insert(ignore_permissions=True)

	def _match(self, **overrides):
		values = {
			"company": self.company,
			"payer_category": self.payer_category,
			"service_line": "Outpatient",
			"inpatient_class": None,
			"service_date": "2026-08-15",
		}
		values.update(overrides)
		return match_tariff(**values)

	def test_exact_match_returns_rule_amount_and_eligible_status(self):
		"""Returning a fallback amount or wrong rule must fail."""
		rule = self._make_rule(amount=525_000)

		result = self._match()

		self.assertEqual(
			result,
			{"rule": rule.name, "amount": 525_000.0, "status": "Eligible"},
		)

	def test_effective_date_boundaries_are_inclusive(self):
		"""Excluding either signed effective-date boundary must fail."""
		rule = self._make_rule(
			effective_from="2026-08-01",
			effective_to="2026-08-31",
		)

		self.assertEqual(self._match(service_date="2026-08-01")["rule"], rule.name)
		self.assertEqual(self._match(service_date="2026-08-31")["rule"], rule.name)
		with self.assertRaises(frappe.ValidationError):
			self._match(service_date="2026-07-31")
		with self.assertRaises(frappe.ValidationError):
			self._match(service_date="2026-09-01")

	def test_class_specific_rule_can_override_generic_rule_by_priority(self):
		"""Ignoring inpatient class or priority must fail."""
		self._make_rule(
			service_line="Inpatient",
			inpatient_class=None,
			amount=500_000,
			priority=1,
		)
		specific = self._make_rule(
			service_line="Inpatient",
			inpatient_class="VIP",
			amount=750_000,
			priority=10,
		)

		result = self._match(service_line="Inpatient", inpatient_class="VIP")

		self.assertEqual(result["rule"], specific.name)
		self.assertEqual(result["amount"], 750_000)

	def test_highest_priority_rule_wins(self):
		"""Selecting an older lower-priority rule must fail."""
		self._make_rule(amount=400_000, priority=1)
		selected = self._make_rule(amount=600_000, priority=5)

		result = self._match()

		self.assertEqual(result["rule"], selected.name)

	def test_no_match_fails_closed_without_fallback(self):
		"""Inventing a default tariff when no approved rule matches must fail."""
		with self.assertRaises(frappe.ValidationError):
			self._match()

	def test_equal_top_priority_is_ambiguous_even_when_effective_dates_differ(self):
		"""Tie-breaking two top-priority rules instead of failing closed must fail."""
		self._make_rule(priority=5, effective_from="2026-08-01")
		self._make_rule(priority=5, effective_from="2026-08-10")

		with self.assertRaises(frappe.ValidationError):
			self._match()
