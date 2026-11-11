"""Referral settlement state, evidence, and retry contracts."""

from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_hospital.referral.settlement import (
	execute_payment,
	prepare_settlement,
	verify_settlement,
)


class ReferralSettlementFixture(FrappeTestCase):
	def setUp(self):
		super().setUp()
		self.addCleanup(frappe.set_user, "Administrator")
		frappe.set_user("Administrator")
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
		self.assertTrue(self.service_item)
		self.assertTrue(self.expense_account)
		self.assertTrue(self.cost_center)
		self.cash_mode = frappe.db.get_value(
			"Mode of Payment", {"type": "Cash", "enabled": 1}, "name"
		)
		self.tariff = self._make_tariff()
		self.partner = self._make_partner()

	def _make_service_item(self):
		item_group = frappe.db.get_value("Item Group", {"is_group": 0}, "name")
		stock_uom = frappe.db.get_value("UOM", {"enabled": 1}, "name")
		item_code = f"SYNTHETIC-REFERRAL-SERVICE-{frappe.generate_hash(length=8)}"
		frappe.get_doc(
			{
				"doctype": "Item",
				"item_code": item_code,
				"item_name": "Synthetic Referral Service",
				"item_group": item_group,
				"stock_uom": stock_uom,
				"is_stock_item": 0,
			}
		).insert(ignore_permissions=True)
		return item_code

	def _make_tariff(self):
		doc = frappe.get_doc(
			{
				"doctype": "Referral Tariff Rule",
				"company": self.company,
				"payer_category": "Synthetic",
				"service_line": "Outpatient",
				"amount": 500_000,
				"effective_from": "2026-01-01",
				"service_item": self.service_item,
				"expense_account": self.expense_account,
				"cost_center": self.cost_center,
				"active": 1,
				"approved_by": "Administrator",
				"approved_on": "2026-07-26 12:00:00",
				"approval_reference": "SYNTHETIC-APPROVAL",
			}
		)
		doc.insert(ignore_permissions=True, ignore_links=True)
		return doc.name

	def _make_partner(self, *, payment_channel="Cash", bank_account=None):
		doc = frappe.get_doc(
			{
				"doctype": "Referral Partner",
				"partner_name": f"Synthetic Settlement Partner {frappe.generate_hash(length=8)}",
				"supplier": f"SYNTHETIC-SUPPLIER-{frappe.generate_hash(length=8)}",
				"active": 1,
				"company": self.company,
				"default_payment_channel": payment_channel,
				"bank_account": bank_account,
				"effective_from": "2026-01-01",
				"agreement_reference": "SYNTHETIC-AGREEMENT",
			}
		)
		doc.insert(ignore_permissions=True, ignore_links=True)
		return doc.name

	def _make_handover(self, *, eligible=True):
		values = {
			"doctype": "Referral Handover",
			"patient": f"SYNTHETIC-PATIENT-{frappe.generate_hash(length=8)}",
			"arrival_at": "2026-08-01 09:00:00",
			"accepted_by_employee": f"SYNTHETIC-EMPLOYEE-{frappe.generate_hash(length=8)}",
			"referral_partner": self.partner,
			"payer_category": "Synthetic",
			"service_line": "Outpatient",
			"company": self.company,
			"tariff_rule": self.tariff if eligible else None,
			"eligible_amount": 500_000 if eligible else 0,
			"eligibility_status": "Eligible" if eligible else "Exception",
			"exception_reason": None if eligible else "Synthetic tariff exception.",
			"workflow_state": "Eligible" if eligible else "Exception",
		}
		doc = frappe.get_doc(values)
		doc.insert(ignore_permissions=True, ignore_links=True)
		return doc.name


class TestReferralSettlementSchema(ReferralSettlementFixture):
	def test_schema_carries_evidence_accounting_and_verification_links(self):
		"""Dropping a payout invariant field must make this test fail."""
		meta = frappe.get_meta("Referral Settlement")

		self.assertEqual(meta.autoname, "format:REF-SETTLEMENT-{YYYY}-{#####}")
		for fieldname, options in (
			("referral_handover", "Referral Handover"),
			("referral_partner", "Referral Partner"),
			("purchase_invoice", "Purchase Invoice"),
			("payment_entry", "Payment Entry"),
			("service_item", "Item"),
			("expense_account", "Account"),
			("cost_center", "Cost Center"),
			("mode_of_payment", "Mode of Payment"),
			("verified_by", "User"),
			("paid_by", "User"),
		):
			self.assertEqual(meta.get_field(fieldname).options, options)
		for fieldname in (
			"amount",
			"payment_channel",
			"payment_status",
			"cash_receiver_name",
			"cash_received_at",
			"cash_receipt_attachment",
			"transfer_reference",
			"transfer_proof_attachment",
			"verified_at",
			"exception_reason",
			"workflow_state",
		):
			self.assertIsNotNone(meta.get_field(fieldname))


class TestReferralSettlementPreparation(ReferralSettlementFixture):
	def test_eligible_handover_enters_finance_review_with_frozen_amount(self):
		"""Recalculating or dropping the handover amount during preparation must fail."""
		handover = self._make_handover(eligible=True)

		settlement_name = prepare_settlement(handover, "Cash")

		settlement = frappe.get_doc("Referral Settlement", settlement_name)
		self.assertEqual(settlement.referral_handover, handover)
		self.assertEqual(settlement.referral_partner, self.partner)
		self.assertEqual(settlement.amount, 500_000)
		self.assertEqual(settlement.service_item, self.service_item)
		self.assertEqual(settlement.expense_account, self.expense_account)
		self.assertEqual(settlement.cost_center, self.cost_center)
		self.assertEqual(settlement.workflow_state, "Finance Review")
		self.assertEqual(settlement.payment_status, "Pending")

	def test_exception_handover_enters_director_exception_path(self):
		"""Letting an exception bypass Director review must fail."""
		handover = self._make_handover(eligible=False)

		settlement_name = prepare_settlement(handover, "Cash")

		settlement = frappe.get_doc("Referral Settlement", settlement_name)
		self.assertEqual(settlement.workflow_state, "Exception")
		self.assertEqual(settlement.payment_status, "Exception")
		self.assertEqual(settlement.amount, 0)

	def test_prepare_is_idempotent_per_handover(self):
		"""Creating two settlement records for one handover must fail."""
		handover = self._make_handover(eligible=True)

		first = prepare_settlement(handover, "Cash")
		second = prepare_settlement(handover, "Cash")

		self.assertEqual(second, first)
		self.assertEqual(
			frappe.db.count("Referral Settlement", {"referral_handover": handover}),
			1,
		)


class TestReferralSettlementVerification(ReferralSettlementFixture):
	def test_finance_verification_moves_review_to_ready_to_pay(self):
		"""Leaving a verified routine settlement outside Ready to Pay must fail."""
		settlement = prepare_settlement(self._make_handover(), "Cash")
		frappe.db.set_value(
			"Referral Settlement",
			settlement,
			"mode_of_payment",
			self.cash_mode,
			update_modified=False,
		)

		with patch.object(frappe, "get_roles", return_value=["Accounts Manager"]):
			result = verify_settlement(settlement)

		doc = frappe.get_doc("Referral Settlement", settlement)
		self.assertEqual(result["workflow_state"], "Ready to Pay")
		self.assertEqual(doc.workflow_state, "Ready to Pay")
		self.assertEqual(doc.verified_by, "Administrator")
		self.assertTrue(doc.verified_at)

	def test_finance_verification_requires_mode_of_payment(self):
		"""Allowing Finance to approve an unmapped disbursement path must fail."""
		settlement = prepare_settlement(self._make_handover(), "Cash")

		with patch.object(frappe, "get_roles", return_value=["Accounts Manager"]):
			with self.assertRaises(frappe.ValidationError):
				verify_settlement(settlement)

	def test_invalid_state_jump_to_paid_is_rejected(self):
		"""Bypassing Ready to Pay from Finance Review must fail."""
		settlement = prepare_settlement(self._make_handover(), "Cash")
		doc = frappe.get_doc("Referral Settlement", settlement)
		doc.workflow_state = "Paid"
		doc.payment_status = "Paid"

		with self.assertRaises(frappe.ValidationError):
			doc.save()

	def test_verifier_and_payer_must_be_different_users(self):
		"""Allowing one user to verify and execute a payout must fail."""
		doc = frappe.new_doc("Referral Settlement")
		doc.workflow_state = "Paid"
		doc.payment_status = "Paid"
		doc.payment_channel = "Cash"
		doc.cash_receiver_name = "Synthetic Receiver"
		doc.cash_received_at = "2026-08-01 10:00:00"
		doc.cash_receipt_attachment = "/private/files/synthetic-cash.pdf"
		doc.purchase_invoice = "SYNTHETIC-PI"
		doc.payment_entry = "SYNTHETIC-PE"
		doc.verified_by = "Administrator"
		doc.paid_by = "Administrator"

		with patch.object(frappe.db, "get_value", return_value=1):
			with self.assertRaises(frappe.ValidationError):
				doc.validate()


class TestReferralSettlementEvidence(ReferralSettlementFixture):
	def _paid_doc(self, payment_channel):
		doc = frappe.new_doc("Referral Settlement")
		doc.workflow_state = "Paid"
		doc.payment_status = "Paid"
		doc.payment_channel = payment_channel
		doc.purchase_invoice = "SYNTHETIC-PI"
		doc.payment_entry = "SYNTHETIC-PE"
		doc.verified_by = "finance-reviewer@example.test"
		doc.paid_by = "finance-executor@example.test"
		return doc

	def test_cash_paid_requires_receiver_timestamp_and_receipt(self):
		"""Marking a cash settlement Paid without signed receipt evidence must fail."""
		doc = self._paid_doc("Cash")

		with patch.object(frappe.db, "get_value", return_value=1):
			with self.assertRaises(frappe.ValidationError):
				doc.validate()

	def test_transfer_paid_requires_reference_and_proof(self):
		"""Marking a transfer Paid without transfer evidence must fail."""
		doc = self._paid_doc("Transfer")

		with patch.object(frappe.db, "get_value", return_value=1):
			with self.assertRaises(frappe.ValidationError):
				doc.validate()

	def test_paid_requires_submitted_accounting_documents(self):
		"""Treating draft accounting documents as paid must fail."""
		doc = self._paid_doc("Transfer")
		doc.transfer_reference = "SYNTHETIC-TRANSFER"
		doc.transfer_proof_attachment = "/private/files/synthetic-transfer.pdf"

		with patch.object(frappe.db, "get_value", return_value=0):
			with self.assertRaises(frappe.ValidationError):
				doc.validate()


class TestReferralSettlementRetry(ReferralSettlementFixture):
	def test_execute_paid_settlement_reuses_original_accounting_documents(self):
		"""Retrying a Paid settlement must never create duplicate accounting documents."""
		settlement = prepare_settlement(self._make_handover(), "Cash")
		frappe.db.set_value(
			"Referral Settlement",
			settlement,
			{
				"workflow_state": "Paid",
				"payment_status": "Paid",
				"purchase_invoice": "SYNTHETIC-PI",
				"payment_entry": "SYNTHETIC-PE",
				"cash_receiver_name": "Synthetic Receiver",
				"cash_received_at": "2026-08-01 10:00:00",
				"cash_receipt_attachment": "/private/files/synthetic-cash.pdf",
				"verified_by": "finance-reviewer@example.test",
				"paid_by": "finance-executor@example.test",
			},
			update_modified=False,
		)
		pi_before = frappe.db.count("Purchase Invoice")
		pe_before = frappe.db.count("Payment Entry")
		real_get_value = frappe.db.get_value

		def submitted_accounting_docs(*args, **kwargs):
			doctype = kwargs.get("doctype") or (args[0] if args else None)
			fieldname = kwargs.get("fieldname") or (args[2] if len(args) > 2 else None)
			if doctype in {"Purchase Invoice", "Payment Entry"} and fieldname == "docstatus":
				return 1
			return real_get_value(*args, **kwargs)

		with patch.object(frappe.db, "get_value", side_effect=submitted_accounting_docs):
			result = execute_payment(settlement)

		self.assertEqual(
			result,
			{
				"settlement": settlement,
				"purchase_invoice": "SYNTHETIC-PI",
				"payment_entry": "SYNTHETIC-PE",
				"payment_status": "Paid",
			},
		)
		self.assertEqual(frappe.db.count("Purchase Invoice"), pi_before)
		self.assertEqual(frappe.db.count("Payment Entry"), pe_before)


class TestReferralSettlementAccounting(ReferralSettlementFixture):
	def _make_supplier(self):
		supplier_group = frappe.db.get_value("Supplier Group", {"is_group": 0}, "name")
		supplier = frappe.get_doc(
			{
				"doctype": "Supplier",
				"supplier_name": f"Synthetic Referral Supplier {frappe.generate_hash(length=8)}",
				"supplier_group": supplier_group,
				"supplier_type": "Company",
			}
		).insert(ignore_permissions=True)
		return supplier.name

	def _make_cash_mode(self):
		cash_account = frappe.db.get_value(
			"Account",
			{
				"company": self.company,
				"account_type": "Cash",
				"is_group": 0,
				"disabled": 0,
			},
			"name",
		)
		self.assertTrue(cash_account)
		mode_name = f"Synthetic Referral Cash {frappe.generate_hash(length=8)}"
		frappe.get_doc(
			{
				"doctype": "Mode of Payment",
				"mode_of_payment": mode_name,
				"type": "Cash",
				"enabled": 1,
				"accounts": [
					{"company": self.company, "default_account": cash_account}
				],
			}
		).insert(ignore_permissions=True)
		return mode_name

	def _make_unmapped_cash_mode(self):
		mode_name = f"Synthetic Unmapped Referral Cash {frappe.generate_hash(length=8)}"
		frappe.get_doc(
			{
				"doctype": "Mode of Payment",
				"mode_of_payment": mode_name,
				"type": "Cash",
				"enabled": 1,
			}
		).insert(ignore_permissions=True)
		return mode_name

	def _make_bank_mode(self):
		bank_account = frappe.db.get_value(
			"Account",
			{
				"company": self.company,
				"account_type": "Bank",
				"is_group": 0,
				"disabled": 0,
			},
			"name",
		)
		self.assertTrue(bank_account)
		mode_name = f"Synthetic Referral Transfer {frappe.generate_hash(length=8)}"
		frappe.get_doc(
			{
				"doctype": "Mode of Payment",
				"mode_of_payment": mode_name,
				"type": "Bank",
				"enabled": 1,
				"accounts": [
					{"company": self.company, "default_account": bank_account}
				],
			}
		).insert(ignore_permissions=True)
		return mode_name

	def _make_party_bank_account(self, supplier):
		bank_name = f"Synthetic Referral Bank {frappe.generate_hash(length=8)}"
		frappe.get_doc({"doctype": "Bank", "bank_name": bank_name}).insert(
			ignore_permissions=True
		)
		return frappe.get_doc(
			{
				"doctype": "Bank Account",
				"account_name": "Synthetic Referral Destination",
				"bank": bank_name,
				"party_type": "Supplier",
				"party": supplier,
				"is_default": 1,
				"bank_account_no": f"9000{frappe.generate_hash(length=10)}",
			}
		).insert(ignore_permissions=True).name

	def _make_reviewer(self):
		email = f"synthetic-referral-reviewer-{frappe.generate_hash(length=8)}@example.test"
		frappe.get_doc(
			{
				"doctype": "User",
				"email": email,
				"first_name": "Synthetic Referral Reviewer",
				"enabled": 1,
				"send_welcome_email": 0,
				"roles": [{"role": "Accounts Manager"}],
			}
		).insert(ignore_permissions=True)
		return email

	def test_execute_payment_submits_balanced_documents_and_reuses_them(self):
		"""Dropping submission, allocation, balancing, or retry reuse must fail."""
		supplier = self._make_supplier()
		self.partner = self._make_partner()
		frappe.db.set_value(
			"Referral Partner", self.partner, "supplier", supplier, update_modified=False
		)
		mode_of_payment = self._make_cash_mode()
		settlement_name = prepare_settlement(self._make_handover(), "Cash")
		settlement = frappe.get_doc("Referral Settlement", settlement_name)
		settlement.mode_of_payment = mode_of_payment
		settlement.save()

		reviewer = self._make_reviewer()
		frappe.set_user(reviewer)
		verify_settlement(settlement_name)
		frappe.set_user("Administrator")

		settlement = frappe.get_doc("Referral Settlement", settlement_name)
		settlement.cash_receiver_name = "Synthetic Receiver"
		settlement.cash_received_at = "2026-07-26 14:00:00"
		settlement.cash_receipt_attachment = "/private/files/synthetic-referral-cash.pdf"
		settlement.save()

		first = execute_payment(settlement_name)
		second = execute_payment(settlement_name)

		self.assertEqual(second, first)
		self.assertEqual(first["payment_status"], "Paid")
		purchase_invoice = frappe.get_doc("Purchase Invoice", first["purchase_invoice"])
		payment_entry = frappe.get_doc("Payment Entry", first["payment_entry"])
		self.assertEqual(purchase_invoice.docstatus, 1)
		self.assertEqual(payment_entry.docstatus, 1)
		self.assertEqual(purchase_invoice.supplier, supplier)
		self.assertEqual(purchase_invoice.items[0].item_code, self.service_item)
		self.assertEqual(purchase_invoice.items[0].expense_account, self.expense_account)
		self.assertEqual(purchase_invoice.items[0].cost_center, self.cost_center)
		self.assertEqual(payment_entry.mode_of_payment, mode_of_payment)
		self.assertEqual(len(payment_entry.references), 1)
		self.assertEqual(payment_entry.references[0].reference_doctype, "Purchase Invoice")
		self.assertEqual(
			payment_entry.references[0].reference_name, purchase_invoice.name
		)
		debit, credit = frappe.db.get_value(
			"GL Entry",
			{"voucher_type": "Payment Entry", "voucher_no": payment_entry.name},
			["sum(debit)", "sum(credit)"],
		)
		self.assertEqual(debit, credit)
		self.assertEqual(
			frappe.db.count(
				"Purchase Invoice",
				{"name": first["purchase_invoice"], "supplier": supplier},
			),
			1,
		)
		self.assertEqual(
			frappe.db.count("Payment Entry", {"name": first["payment_entry"]}),
			1,
		)

	def test_execute_payment_fails_before_accounting_when_mode_is_unmapped(self):
		"""Creating liability before resolving one disbursement account must fail."""
		supplier = self._make_supplier()
		self.partner = self._make_partner()
		frappe.db.set_value(
			"Referral Partner", self.partner, "supplier", supplier, update_modified=False
		)
		mode_of_payment = self._make_unmapped_cash_mode()
		settlement_name = prepare_settlement(self._make_handover(), "Cash")
		settlement = frappe.get_doc("Referral Settlement", settlement_name)
		settlement.mode_of_payment = mode_of_payment
		settlement.save()

		reviewer = self._make_reviewer()
		frappe.set_user(reviewer)
		verify_settlement(settlement_name)
		frappe.set_user("Administrator")

		settlement = frappe.get_doc("Referral Settlement", settlement_name)
		settlement.cash_receiver_name = "Synthetic Receiver"
		settlement.cash_received_at = "2026-07-26 14:00:00"
		settlement.cash_receipt_attachment = "/private/files/synthetic-referral-cash.pdf"
		settlement.save()
		purchase_invoice_count = frappe.db.count("Purchase Invoice")
		payment_entry_count = frappe.db.count("Payment Entry")

		with self.assertRaises(frappe.ValidationError):
			execute_payment(settlement_name)

		self.assertEqual(frappe.db.count("Purchase Invoice"), purchase_invoice_count)
		self.assertEqual(frappe.db.count("Payment Entry"), payment_entry_count)

	def test_transfer_payment_uses_bank_mapping_and_reference(self):
		"""Using a non-Bank source or dropping transfer reference data must fail."""
		supplier = self._make_supplier()
		party_bank_account = self._make_party_bank_account(supplier)
		self.partner = self._make_partner(
			payment_channel="Transfer", bank_account=party_bank_account
		)
		frappe.db.set_value(
			"Referral Partner", self.partner, "supplier", supplier, update_modified=False
		)
		mode_of_payment = self._make_bank_mode()
		settlement_name = prepare_settlement(self._make_handover(), "Transfer")
		settlement = frappe.get_doc("Referral Settlement", settlement_name)
		settlement.mode_of_payment = mode_of_payment
		settlement.save()

		reviewer = self._make_reviewer()
		frappe.set_user(reviewer)
		verify_settlement(settlement_name)
		frappe.set_user("Administrator")

		settlement = frappe.get_doc("Referral Settlement", settlement_name)
		settlement.transfer_reference = "SYNTHETIC-TRANSFER-REFERENCE"
		settlement.transfer_proof_attachment = (
			"/private/files/synthetic-referral-transfer.pdf"
		)
		settlement.save()

		result = execute_payment(settlement_name)

		payment_entry = frappe.get_doc("Payment Entry", result["payment_entry"])
		self.assertEqual(payment_entry.docstatus, 1)
		self.assertEqual(payment_entry.mode_of_payment, mode_of_payment)
		self.assertEqual(payment_entry.reference_no, "SYNTHETIC-TRANSFER-REFERENCE")
		self.assertEqual(
			frappe.db.get_value("Account", payment_entry.paid_from, "account_type"),
			"Bank",
		)
