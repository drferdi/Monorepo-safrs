"""Referral partner and effective tariff master contracts."""

from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase


class TestReferralMasterSchema(FrappeTestCase):
	def test_referral_partner_links_native_finance_masters(self):
		"""Removing a required native master link must fail."""
		meta = frappe.get_meta("Referral Partner")

		self.assertEqual(meta.autoname, "format:REF-PARTNER-{#####}")
		self.assertEqual(meta.get_field("company").options, "Company")
		self.assertEqual(meta.get_field("supplier").options, "Supplier")
		self.assertEqual(meta.get_field("bank_account").options, "Bank Account")
		self.assertEqual(
			meta.get_field("tax_withholding_category").options,
			"Tax Withholding Category",
		)
		for fieldname in (
			"partner_name",
			"supplier",
			"active",
			"company",
			"default_payment_channel",
			"effective_from",
			"agreement_reference",
		):
			self.assertIsNotNone(meta.get_field(fieldname))

	def test_referral_tariff_contains_effective_approval_contract(self):
		"""Dropping an eligibility dimension or approval field must fail."""
		meta = frappe.get_meta("Referral Tariff Rule")

		self.assertEqual(meta.autoname, "format:REF-TARIFF-{YYYY}-{#####}")
		self.assertEqual(
			meta.get_field("service_line").options,
			"Outpatient\nInpatient\nPharmacy",
		)
		for fieldname in (
			"company",
			"payer_category",
			"service_line",
			"inpatient_class",
			"amount",
			"effective_from",
			"effective_to",
			"priority",
			"service_item",
			"expense_account",
			"cost_center",
			"active",
			"approved_by",
			"approved_on",
			"approval_reference",
		):
			self.assertIsNotNone(meta.get_field(fieldname))

	def test_master_permissions_separate_maintenance_and_approval(self):
		"""Granting routine maintenance or approval to the wrong role must fail."""
		partner_permissions = {
			(row.role, row.permlevel): row
			for row in frappe.get_meta("Referral Partner").permissions
		}
		tariff_permissions = {
			(row.role, row.permlevel): row
			for row in frappe.get_meta("Referral Tariff Rule").permissions
		}

		self.assertTrue(partner_permissions[("Accounts Manager", 0)].create)
		self.assertTrue(partner_permissions[("Accounts Manager", 0)].write)
		self.assertTrue(partner_permissions[("Nursing User", 0)].read)
		self.assertFalse(bool(partner_permissions[("Nursing User", 0)].write))
		self.assertTrue(partner_permissions[("System Manager", 0)].write)
		self.assertTrue(tariff_permissions[("Accounts Manager", 0)].create)
		self.assertTrue(tariff_permissions[("Accounts Manager", 0)].write)
		self.assertTrue(tariff_permissions[("Nursing User", 0)].read)
		self.assertFalse(bool(tariff_permissions[("Nursing User", 0)].write))
		self.assertFalse(bool(tariff_permissions[("MANTRA Director", 0)].create))
		self.assertTrue(tariff_permissions[("MANTRA Director", 1)].write)


class TestReferralPartnerValidation(FrappeTestCase):
	def test_transfer_partner_requires_native_bank_account_link(self):
		"""Allowing an active transfer partner without a destination must fail."""
		partner = frappe.new_doc("Referral Partner")
		partner.active = 1
		partner.default_payment_channel = "Transfer"
		partner.effective_from = "2026-08-01"

		with self.assertRaises(frappe.ValidationError):
			partner.validate()

	def test_partner_rejects_an_inverted_effective_period(self):
		"""Allowing effective_to before effective_from must fail."""
		partner = frappe.new_doc("Referral Partner")
		partner.active = 0
		partner.default_payment_channel = "Cash"
		partner.effective_from = "2026-08-02"
		partner.effective_to = "2026-08-01"

		with self.assertRaises(frappe.ValidationError):
			partner.validate()


class TestReferralTariffValidation(FrappeTestCase):
	def _rule(self):
		rule = frappe.new_doc("Referral Tariff Rule")
		rule.company = "_Test Company"
		rule.payer_category = "Private"
		rule.service_line = "Outpatient"
		rule.amount = 500_000
		rule.effective_from = "2026-08-01"
		rule.service_item = "_Test Item"
		rule.expense_account = "_Test Account Cost for Goods Sold - _TC"
		rule.cost_center = "_Test Cost Center - _TC"
		rule.active = 0
		return rule

	def test_tariff_rejects_non_positive_amount(self):
		"""Allowing a zero or negative incentive must fail."""
		rule = self._rule()
		rule.amount = 0

		with self.assertRaises(frappe.ValidationError):
			rule.validate()

	def test_tariff_rejects_an_inverted_effective_period(self):
		"""Allowing effective_to before effective_from must fail."""
		rule = self._rule()
		rule.effective_to = "2026-07-31"

		with self.assertRaises(frappe.ValidationError):
			rule.validate()

	def test_active_tariff_requires_complete_approval_evidence(self):
		"""Activating an unsigned tariff must fail closed."""
		rule = self._rule()
		rule.active = 1

		with patch.object(frappe, "get_roles", return_value=["MANTRA Director"]):
			with self.assertRaises(frappe.ValidationError):
				rule.validate()

	def test_active_tariff_requires_complete_accounting_configuration(self):
		"""Activating a tariff without a frozen accounting dimension must fail."""
		rule = self._rule()
		rule.active = 1
		rule.expense_account = None
		rule.approved_by = "director@example.test"
		rule.approved_on = "2026-07-26 12:00:00"
		rule.approval_reference = "BOARD-2026-07"

		with patch.object(frappe, "get_roles", return_value=["MANTRA Director"]):
			with self.assertRaises(frappe.ValidationError):
				rule.validate()

	def test_accounts_manager_cannot_activate_tariff(self):
		"""Allowing the tariff maintainer to self-approve must fail."""
		rule = self._rule()
		rule.active = 1
		rule.approved_by = "director@example.test"
		rule.approved_on = "2026-07-26 12:00:00"
		rule.approval_reference = "BOARD-2026-07"

		with patch.object(frappe, "get_roles", return_value=["Accounts Manager"]):
			with self.assertRaises(frappe.PermissionError):
				rule.validate()

	def test_director_can_validate_a_fully_approved_tariff(self):
		"""Removing Director approval authority must fail."""
		rule = self._rule()
		rule.active = 1
		rule.approved_by = "director@example.test"
		rule.approved_on = "2026-07-26 12:00:00"
		rule.approval_reference = "BOARD-2026-07"

		with patch.object(frappe, "get_roles", return_value=["MANTRA Director"]):
			rule.validate()
