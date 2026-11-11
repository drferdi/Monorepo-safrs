"""Synthetic referral handover capture, privacy, and duplicate protection."""

import json
from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_hospital.referral.handover import record_handover


class TestReferralHandover(FrappeTestCase):
	def setUp(self):
		super().setUp()
		self.addCleanup(frappe.set_user, "Administrator")
		self.company = (
			frappe.defaults.get_global_default("company")
			or frappe.db.get_value("Company", {}, "name")
		)
		self.user, self.employee = self._make_employee_user(with_nursing_role=True)
		self.patient = self._make_patient()
		self.partner = self._make_partner()
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

	def _make_employee_user(self, *, with_nursing_role):
		token = frappe.generate_hash(length=8)
		email = f"synthetic-nurse-{token}@example.test"
		roles = [{"role": "Nursing User"}] if with_nursing_role else []
		user = frappe.get_doc(
			{
				"doctype": "User",
				"email": email,
				"first_name": "Synthetic Nurse",
				"enabled": 1,
				"send_welcome_email": 0,
				"roles": roles,
			}
		).insert(ignore_permissions=True)
		department = frappe.db.get_value("Department", {}, "name")
		employee = frappe.get_doc(
			{
				"doctype": "Employee",
				"first_name": "Synthetic Nurse",
				"company": self.company,
				"user_id": user.name,
				"date_of_birth": "1990-01-01",
				"date_of_joining": "2026-01-01",
				"department": department,
				"gender": "Female",
				"status": "Active",
			}
		).insert(ignore_permissions=True)
		return user.name, employee.name

	def _make_patient(self):
		patient = frappe.get_doc(
			{
				"doctype": "Patient",
				"first_name": f"Synthetic Patient {frappe.generate_hash(length=8)}",
				"sex": "Female",
			}
		).insert(ignore_permissions=True)
		return patient.name

	def _make_partner(self):
		supplier_group = (
			frappe.db.get_value("Supplier Group", {"is_group": 0}, "name")
			or frappe.db.get_value("Supplier Group", {}, "name")
		)
		supplier = frappe.get_doc(
			{
				"doctype": "Supplier",
				"supplier_name": f"Synthetic Referral {frappe.generate_hash(length=8)}",
				"supplier_type": "Individual",
				"supplier_group": supplier_group,
			}
		).insert(ignore_permissions=True)
		partner = frappe.get_doc(
			{
				"doctype": "Referral Partner",
				"partner_name": f"Synthetic Partner {frappe.generate_hash(length=8)}",
				"supplier": supplier.name,
				"active": 1,
				"company": self.company,
				"default_payment_channel": "Cash",
				"effective_from": "2026-01-01",
				"agreement_reference": "SYNTHETIC-AGREEMENT",
			}
		).insert(ignore_permissions=True)
		return partner.name

	def _make_tariff(self, **overrides):
		values = {
			"doctype": "Referral Tariff Rule",
			"company": self.company,
			"payer_category": self.payer_category,
			"service_line": "Outpatient",
			"amount": 500_000,
			"effective_from": "2026-01-01",
			"priority": 1,
			"service_item": self.service_item,
			"expense_account": self.expense_account,
			"cost_center": self.cost_center,
			"active": 1,
			"approved_by": "Administrator",
			"approved_on": "2026-07-26 12:00:00",
			"approval_reference": "SYNTHETIC-APPROVAL",
		}
		values.update(overrides)
		return frappe.get_doc(values).insert(ignore_permissions=True)

	def _record(self, **overrides):
		values = {
			"patient": self.patient,
			"arrival_at": "2026-08-01 09:00:00",
			"accepted_by_employee": self.employee,
			"referral_partner": self.partner,
			"payer_category": self.payer_category,
			"service_line": "Outpatient",
		}
		values.update(overrides)
		frappe.set_user(self.user)
		return record_handover(**values)

	def test_logged_in_nurse_must_match_accepted_employee(self):
		"""Allowing one user to attribute acceptance to another employee must fail."""
		_, other_employee = self._make_employee_user(with_nursing_role=True)

		with self.assertRaises(frappe.PermissionError):
			self._record(accepted_by_employee=other_employee)

	def test_linked_employee_must_hold_nursing_intake_role(self):
		"""Allowing a linked employee without an intake role must fail."""
		user, employee = self._make_employee_user(with_nursing_role=False)
		frappe.set_user(user)

		with self.assertRaises(frappe.PermissionError):
			record_handover(
				patient=self.patient,
				arrival_at="2026-08-01 09:00:00",
				accepted_by_employee=employee,
				referral_partner=self.partner,
				payer_category=self.payer_category,
				service_line="Outpatient",
			)

	def test_tariff_rule_and_amount_are_immutable_snapshots(self):
		"""Re-reading an edited tariff instead of storing the handover snapshot must fail."""
		rule = self._make_tariff(amount=525_000)

		handover_name = self._record()

		handover = frappe.get_doc("Referral Handover", handover_name)
		self.assertEqual(handover.eligibility_status, "Eligible")
		self.assertEqual(handover.tariff_rule, rule.name)
		self.assertEqual(handover.eligible_amount, 525_000)
		rule.db_set("amount", 700_000)
		handover.reload()
		self.assertEqual(handover.eligible_amount, 525_000)

	def test_duplicate_company_patient_service_date_and_line_fails_closed(self):
		"""Creating a second payable attribution for the same arrival must fail."""
		self._make_tariff()
		first = self._record()

		with self.assertRaises(frappe.ValidationError):
			self._record()

		self.assertEqual(
			frappe.db.count(
				"Referral Handover",
				{"deduplication_key": frappe.db.get_value("Referral Handover", first, "deduplication_key")},
			),
			1,
		)

	def test_missing_or_ambiguous_tariff_creates_exception_without_amount(self):
		"""Converting an unmatched handover into Eligible must fail."""
		missing_name = self._record()
		missing = frappe.get_doc("Referral Handover", missing_name)
		self.assertEqual(missing.eligibility_status, "Exception")
		self.assertEqual(missing.eligible_amount, 0)
		self.assertFalse(missing.tariff_rule)

	def test_audit_payload_contains_no_patient_or_partner_identifier(self):
		"""Leaking PHI or party identity into the shared audit spine must fail."""
		self._make_tariff()

		handover_name = self._record(source_reference="SYNTHETIC-SOURCE")

		frappe.set_user("Administrator")
		event_name = frappe.db.get_value(
			"Audit Event",
			{
				"target_doctype": "Referral Handover",
				"target_name": handover_name,
			},
			"name",
		)
		payload = json.loads(frappe.db.get_value("Audit Event", event_name, "payload_json"))
		self.assertEqual(
			set(payload),
			{"eligibility_status", "tariff_rule", "amount"},
		)
		self.assertNotIn(self.patient, json.dumps(payload))
		self.assertNotIn(self.partner, json.dumps(payload))

	def test_audit_failure_does_not_roll_back_handover(self):
		"""Making audit availability transactional with handover capture must fail."""
		self._make_tariff()
		real_get_attr = frappe.get_attr

		def get_attr_with_audit_outage(path):
			if path == "sentra_mantra_core.audit_registry.record_event":
				raise RuntimeError("synthetic audit outage")
			return real_get_attr(path)

		with patch.object(frappe, "get_attr", side_effect=get_attr_with_audit_outage):
			handover_name = self._record()

		self.assertTrue(frappe.db.exists("Referral Handover", handover_name))
