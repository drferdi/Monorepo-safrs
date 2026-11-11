"""Saldo awal (opening balance) importer — validasi + pembuatan JE opening DRAFT.

Prinsip aman yang diuji:
- Akun tidak ada / grup / Receivable-Payable tanpa party → ditolak validasi.
- Tidak balance tanpa balancing account → ditolak.
- apply hanya membuat JE DRAFT (docstatus 0); GL Entry TIDAK bertambah.
"""

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_core.saldo_awal import build_opening_je, validate_rows

CUTOVER = "2026-08-01"


def _first_account(**filters):
	filters.setdefault("is_group", 0)
	rows = frappe.get_all("Account", filters=filters, pluck="name", limit=1)
	return rows[0] if rows else None


class TestSaldoAwal(FrappeTestCase):
	def test_validate_flags_missing_account(self):
		rep = validate_rows([{"account": "Akun Ngawur XYZ", "debit": 100, "credit": 0}], CUTOVER)
		self.assertFalse(rep["ok"])
		self.assertTrue(any("tidak ada" in i for i in rep["issues"]))

	def test_validate_flags_debit_and_credit_both_or_neither(self):
		acc = _first_account(account_type="Bank") or _first_account(root_type="Asset")
		rep = validate_rows([{"account": acc, "debit": 100, "credit": 100}], CUTOVER)
		self.assertFalse(rep["ok"])
		self.assertTrue(any("tepat SATU" in i for i in rep["issues"]))

	def test_validate_flags_receivable_without_party(self):
		acc = _first_account(account_type="Receivable")
		if not acc:
			self.skipTest("tidak ada akun Receivable di CoA")
		rep = validate_rows([{"account": acc, "debit": 500, "credit": 0}], CUTOVER)
		self.assertFalse(rep["ok"])
		self.assertTrue(any("wajib party" in i for i in rep["issues"]))

	def test_validate_flags_unbalanced(self):
		asset = _first_account(account_type="Bank") or _first_account(root_type="Asset")
		rep = validate_rows([{"account": asset, "debit": 1000, "credit": 0}], CUTOVER)
		self.assertFalse(rep["ok"])
		self.assertTrue(any("balance" in i.lower() for i in rep["issues"]))

	def test_validate_rejects_missing_cutover_date(self):
		asset = _first_account(account_type="Bank") or _first_account(root_type="Asset")
		rep = validate_rows([{"account": asset, "debit": 1, "credit": 0}], None)
		self.assertFalse(rep["ok"])
		self.assertTrue(any("CUTOVER_DATE" in i for i in rep["issues"]))

	def test_build_creates_draft_opening_je_without_touching_gl(self):
		asset = _first_account(account_type="Bank") or _first_account(root_type="Asset")
		equity = _first_account(root_type="Equity")
		if not (asset and equity):
			self.skipTest("butuh satu akun Aset dan satu akun Ekuitas di CoA")

		gl_before = frappe.db.count("GL Entry")
		rows = [
			{"account": asset, "debit": 1_000_000, "credit": 0},
			{"account": equity, "debit": 0, "credit": 1_000_000},
		]
		rep = validate_rows(rows, CUTOVER)
		self.assertTrue(rep["ok"], msg=str(rep["issues"]))
		self.assertTrue(rep["balanced"])

		je = build_opening_je(rows, CUTOVER, submit=False)
		self.assertEqual(je.docstatus, 0)  # DRAFT — belum posting
		self.assertEqual(je.is_opening, "Yes")
		self.assertEqual(je.voucher_type, "Opening Entry")
		self.assertEqual(len(je.accounts), 2)
		# GL tetap 0/utuh — draft tidak posting
		self.assertEqual(frappe.db.count("GL Entry"), gl_before)

	def test_build_raises_on_invalid_rows(self):
		with self.assertRaises(frappe.ValidationError):
			build_opening_je([{"account": "Ngawur", "debit": 1, "credit": 0}], CUTOVER)
