"""Synthetic native medicine procurement acceptance."""

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, today

from erpnext.accounts.doctype.payment_entry.payment_entry import get_payment_entry
from erpnext.buying.doctype.purchase_order.purchase_order import make_purchase_receipt
from erpnext.stock.doctype.material_request.material_request import make_purchase_order
from erpnext.stock.doctype.purchase_receipt.purchase_receipt import (
	make_purchase_invoice,
)
from sentra_mantra_core.request_to_pay_setup import setup


class TestRequestToPayEndToEnd(FrappeTestCase):
	def setUp(self):
		super().setUp()
		frappe.set_user("Administrator")
		setup()
		self.company = (
			frappe.defaults.get_global_default("company")
			or frappe.db.get_value("Company", {}, "name")
		)
		self.warehouse = frappe.db.get_value(
			"Warehouse", {"company": self.company, "is_group": 0, "disabled": 0}, "name"
		)
		self.item = self._make_batch_item()
		self.supplier = self._make_supplier()
		self.employee = self._make_employee()

	def _make_batch_item(self):
		item_code = f"SYNTHETIC-MEDICINE-{frappe.generate_hash(length=8)}"
		frappe.get_doc(
			{
				"doctype": "Item",
				"item_code": item_code,
				"item_name": "Synthetic Batch Medicine",
				"item_group": frappe.db.get_value("Item Group", {"is_group": 0}, "name"),
				"stock_uom": frappe.db.get_value("UOM", {"enabled": 1}, "name"),
				"is_stock_item": 1,
				"has_batch_no": 1,
				"create_new_batch": 1,
				"shelf_life_in_days": 365,
				"valuation_rate": 10_000,
			}
		).insert(ignore_permissions=True)
		return item_code

	def _make_supplier(self):
		return frappe.get_doc(
			{
				"doctype": "Supplier",
				"supplier_name": f"Synthetic Pharmacy Supplier {frappe.generate_hash(length=8)}",
				"supplier_type": "Company",
				"supplier_group": frappe.db.get_value(
					"Supplier Group", {"is_group": 0}, "name"
				),
			}
		).insert(ignore_permissions=True).name

	def _make_employee(self):
		return frappe.get_doc(
			{
				"doctype": "Employee",
				"first_name": "Synthetic Pharmacy Receiver",
				"company": self.company,
				"date_of_birth": "1990-01-01",
				"date_of_joining": "2026-01-01",
				"gender": frappe.db.get_value("Gender", {}, "name"),
				"status": "Active",
			}
		).insert(ignore_permissions=True).name

	def test_medicine_chain_posts_and_reverses_native_stock_and_gl(self):
		"""Broken links, evidence, ledgers, batch expiry, or cancellation must fail."""
		material_request = frappe.get_doc(
			{
				"doctype": "Material Request",
				"company": self.company,
				"material_request_type": "Purchase",
				"schedule_date": add_days(today(), 1),
				"mantra_request_category": "Medicine",
				"mantra_business_reason": "Synthetic pharmacy replenishment.",
				"mantra_supporting_document": "/private/files/synthetic-mr.pdf",
				"items": [
					{
						"item_code": self.item,
						"qty": 10,
						"warehouse": self.warehouse,
						"schedule_date": add_days(today(), 1),
					}
				],
			}
		).insert()
		material_request.submit()

		purchase_order = make_purchase_order(material_request.name)
		purchase_order.supplier = self.supplier
		purchase_order.items[0].rate = 10_000
		purchase_order.items[0].price_list_rate = 10_000
		purchase_order.insert()
		purchase_order.submit()

		purchase_receipt = make_purchase_receipt(purchase_order.name)
		purchase_receipt.mantra_received_by_employee = self.employee
		purchase_receipt.mantra_receipt_evidence = (
			"/private/files/synthetic-pharmacy-receipt.pdf"
		)
		purchase_receipt.insert()
		purchase_receipt.submit()

		purchase_invoice = make_purchase_invoice(purchase_receipt.name)
		purchase_invoice.insert()
		purchase_invoice.submit()

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
		payment_entry = get_payment_entry(
			"Purchase Invoice",
			purchase_invoice.name,
			party_amount=purchase_invoice.grand_total,
			bank_account=cash_account,
		)
		payment_entry.mantra_execution_reference = "SYNTHETIC-PHARMACY-PAYMENT"
		payment_entry.mantra_payment_evidence = (
			"/private/files/synthetic-pharmacy-payment.pdf"
		)
		payment_entry.insert()
		payment_entry.submit()

		self.assertEqual(material_request.docstatus, 1)
		self.assertEqual(purchase_order.docstatus, 1)
		self.assertEqual(purchase_receipt.docstatus, 1)
		self.assertEqual(purchase_invoice.docstatus, 1)
		self.assertEqual(payment_entry.docstatus, 1)
		self.assertEqual(purchase_order.items[0].material_request, material_request.name)
		self.assertEqual(purchase_receipt.items[0].purchase_order, purchase_order.name)
		self.assertEqual(
			purchase_invoice.items[0].purchase_receipt,
			purchase_receipt.name,
		)
		self.assertEqual(
			frappe.db.get_value(
				"Stock Ledger Entry",
				{
					"voucher_type": "Purchase Receipt",
					"voucher_no": purchase_receipt.name,
					"item_code": self.item,
				},
				"sum(actual_qty)",
			),
			10,
		)
		batch_no = frappe.db.get_value(
			"Serial and Batch Entry",
			{"parent": purchase_receipt.items[0].serial_and_batch_bundle},
			"batch_no",
		)
		batch_no = batch_no or purchase_receipt.items[0].batch_no
		batch_no = batch_no or frappe.db.get_value("Batch", {"item": self.item}, "name")
		self.assertTrue(batch_no)
		batch = frappe.get_doc("Batch", batch_no)
		batch.expiry_date = add_days(today(), 365)
		batch.save()
		self.assertTrue(frappe.db.get_value("Batch", batch_no, "expiry_date"))
		for voucher_type, voucher_no in (
			("Purchase Invoice", purchase_invoice.name),
			("Payment Entry", payment_entry.name),
		):
			debit, credit = frappe.db.get_value(
				"GL Entry",
				{"voucher_type": voucher_type, "voucher_no": voucher_no},
				["sum(debit)", "sum(credit)"],
			)
			self.assertEqual(debit, credit)

		payment_entry.reload()
		payment_entry.cancel()
		purchase_invoice.reload()
		purchase_invoice.cancel()
		purchase_receipt.reload()
		purchase_receipt.cancel()
		purchase_order.reload()
		purchase_order.cancel()
		material_request.reload()
		material_request.cancel()

		for doc in (
			payment_entry,
			purchase_invoice,
			purchase_receipt,
			purchase_order,
			material_request,
		):
			self.assertEqual(doc.docstatus, 2)
		self.assertTrue(frappe.db.exists(doc.doctype, doc.name))
		self.assertEqual(frappe.db.get_value(doc.doctype, doc.name, "docstatus"), 2)
		self.assertEqual(
			frappe.db.get_value(
				"Bin",
				{"item_code": self.item, "warehouse": self.warehouse},
				"actual_qty",
			)
			or 0,
			0,
		)
