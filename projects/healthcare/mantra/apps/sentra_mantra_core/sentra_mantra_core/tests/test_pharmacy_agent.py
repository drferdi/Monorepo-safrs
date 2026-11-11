"""Agen Farmasi & Rantai Pasok — empat aturan (spesifikasi §8).

Seluruh data uji sintetis dan dibuat di dalam transaksi tes; tidak satu pun
fixture berasal dari catatan rumah sakit yang sebenarnya.

Baris `Bin` dan `Stock Ledger Entry` ditulis lewat `db_insert()`. Detektor
dikontrak membaca baris pada keadaan itu; menjalankan seluruh mesin stok
ERPNext akan menguji ERPNext, bukan detektornya, dan membuat suite ini bergantung
pada perilaku app hulu yang tidak kami kendalikan.
"""

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, today

from sentra_mantra_core.agents import runner, sanitize
from sentra_mantra_core.agents import setup as agent_setup
from sentra_mantra_core.agents.detectors import pharmacy
from sentra_mantra_core.agents.permissions import AgentContext, AgentScopeError
from sentra_mantra_core.tests import agent_fixtures as fx

CARD_DOCTYPE = "Sentra Decision Card"


def _hash(length=8):
	return frappe.generate_hash(length=length)


class PharmacyTestCase(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		fx.ensure_chamber_access()

	def setUp(self):
		self.company = (
			frappe.defaults.get_global_default("company")
			or frappe.db.get_value("Company", {}, "name")
		)
		self.warehouse = frappe.db.get_value(
			"Warehouse", {"company": self.company, "is_group": 0, "disabled": 0}, "name"
		)
		self.agent = self._make_agent()
		self.ctx = fx.context(self.agent)

	def tearDown(self):
		frappe.db.rollback()

	def _make_agent(self):
		"""Agen dengan read_scope dan ambang yang benar-benar dikirim ke produksi."""
		doc = frappe.new_doc("Sentra Agent Definition")
		doc.agent_code = f"PHR-UJI-{_hash(6).upper()}"
		doc.agent_name = "Agen Farmasi uji"
		doc.domain = "Farmasi"
		doc.enabled = 1
		doc.schedule = "Bulanan"
		doc.audience_role = fx.CHIEF_ROLE
		doc.max_cards_per_run = 5
		for source_doctype, reason in agent_setup.PHARMACY_READ_SCOPE:
			doc.append("read_scope", {"source_doctype": source_doctype, "reason": reason})
		for rule in agent_setup.PHARMACY_RULES:
			doc.append("rules", dict(rule))
		doc.insert(ignore_permissions=True)
		return doc

	def rule(self, rule_code):
		return next(r for r in self.agent.rules if r.rule_code == rule_code)

	def set_threshold(self, rule_code, value=None, secondary=None):
		"""Ubah ambang seperti Chief mengubahnya lewat antarmuka: data, bukan kode."""
		row = self.rule(rule_code)
		if value is not None:
			frappe.db.set_value("Sentra Agent Rule", row.name, "threshold_value", value)
			row.threshold_value = value
		if secondary is not None:
			frappe.db.set_value("Sentra Agent Rule", row.name, "threshold_secondary", secondary)
			row.threshold_secondary = secondary
		return row

	# -- fixture sintetis --------------------------------------------------

	def make_item(self, valuation_rate=10_000):
		code = f"SYNTHETIC-MED-{_hash()}"
		frappe.get_doc(
			{
				"doctype": "Item",
				"item_code": code,
				"item_name": "Synthetic Medicine",
				"item_group": frappe.db.get_value("Item Group", {"is_group": 0}, "name"),
				"stock_uom": frappe.db.get_value("UOM", {"enabled": 1}, "name"),
				"is_stock_item": 1,
				"valuation_rate": valuation_rate,
			}
		).insert(ignore_permissions=True)
		return code

	def make_bin(self, item_code, qty, stock_value, valuation_rate=10_000):
		bin_doc = frappe.get_doc(
			{
				"doctype": "Bin",
				"item_code": item_code,
				"warehouse": self.warehouse,
				"actual_qty": qty,
				"stock_value": stock_value,
				"valuation_rate": valuation_rate,
			}
		)
		bin_doc.name = f"{item_code}-{self.warehouse}"
		bin_doc.db_insert()
		return bin_doc.name

	def make_outward_ledger_entry(self, item_code, posting_date):
		entry = frappe.get_doc(
			{
				"doctype": "Stock Ledger Entry",
				"item_code": item_code,
				"warehouse": self.warehouse,
				"posting_date": posting_date,
				"posting_time": "10:00:00",
				"voucher_type": "Stock Entry",
				"voucher_no": f"SYNTHETIC-{_hash(6)}",
				"actual_qty": -5,
				"is_cancelled": 0,
				"company": self.company,
			}
		)
		entry.name = f"SLE-UJI-{_hash(10)}"
		entry.db_insert()
		return entry.name

	def make_supplier(self):
		return (
			frappe.get_doc(
				{
					"doctype": "Supplier",
					"supplier_name": f"Synthetic Supplier {_hash()}",
					"supplier_type": "Company",
					"supplier_group": frappe.db.get_value("Supplier Group", {"is_group": 0}, "name"),
				}
			)
			.insert(ignore_permissions=True)
			.name
		)

	def make_draft_purchase_order(self, amount):
		item_code = self.make_item()
		order = frappe.get_doc(
			{
				"doctype": "Purchase Order",
				"supplier": self.make_supplier(),
				"company": self.company,
				"transaction_date": today(),
				"schedule_date": add_days(today(), 7),
				"items": [
					{
						"item_code": item_code,
						"qty": 1,
						"rate": amount,
						"schedule_date": add_days(today(), 7),
						"warehouse": self.warehouse,
					}
				],
			}
		)
		order.insert(ignore_permissions=True)
		return order

	def make_formulary(self, item_code, ingredient, strength="500mg"):
		return frappe.get_doc(
			{
				"doctype": "Sentra Formulary Item",
				"item": item_code,
				"active_ingredient": ingredient,
				"strength": strength,
			}
		).insert(ignore_permissions=True)

	def make_medicine_request(self, item_code, reason, rate=15_000):
		request = frappe.get_doc(
			{
				"doctype": "Material Request",
				"material_request_type": "Purchase",
				"company": self.company,
				"transaction_date": today(),
				"schedule_date": add_days(today(), 3),
				"mantra_request_category": "Medicine",
				"mantra_business_reason": reason,
				"mantra_supporting_document": "https://intranet.invalid/berkas-uji",
				"items": [
					{
						"item_code": item_code,
						"qty": 10,
						"rate": rate,
						"schedule_date": add_days(today(), 3),
						"warehouse": self.warehouse,
					}
				],
			}
		)
		request.insert(ignore_permissions=True)
		return request

	def make_reconciliation(self, difference, current_amount):
		doc = frappe.get_doc(
			{
				"doctype": "Stock Reconciliation",
				"company": self.company,
				"posting_date": today(),
				"posting_time": "10:00:00",
				"purpose": "Stock Reconciliation",
				"items": [
					{
						"item_code": self.make_item(),
						"warehouse": self.warehouse,
						"qty": 10,
						"valuation_rate": 1000,
						"current_qty": 12,
						"current_amount": current_amount,
						"amount": current_amount - difference,
						"amount_difference": -difference,
					}
				],
			}
		)
		doc.flags.ignore_validate = True
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True, ignore_mandatory=True)
		frappe.db.set_value("Stock Reconciliation", doc.name, "docstatus", 1)
		return doc


# -- PHR-PO-THRESHOLD --------------------------------------------------------


class TestPurchaseOrderThreshold(PharmacyTestCase):
	def test_purchase_order_above_the_threshold_produces_a_card(self):
		order = self.make_draft_purchase_order(5_000_000)
		findings = pharmacy.po_awaiting_approval(self.ctx, self.rule("PHR-PO-THRESHOLD"))
		mine = [f for f in findings if f["subject"] == order.name]
		self.assertEqual(len(mine), 1)
		self.assertIn("Rp 5.000.000", mine[0]["evidence"][0]["value"])

	def test_purchase_order_below_the_threshold_produces_no_card(self):
		order = self.make_draft_purchase_order(500_000)
		findings = pharmacy.po_awaiting_approval(self.ctx, self.rule("PHR-PO-THRESHOLD"))
		self.assertEqual([f for f in findings if f["subject"] == order.name], [])

	def test_lowering_the_threshold_changes_behaviour_without_code_change(self):
		order = self.make_draft_purchase_order(500_000)
		rule = self.rule("PHR-PO-THRESHOLD")
		self.assertEqual([f for f in pharmacy.po_awaiting_approval(self.ctx, rule) if f["subject"] == order.name], [])
		rule = self.set_threshold("PHR-PO-THRESHOLD", value=100_000)
		found = [f for f in pharmacy.po_awaiting_approval(self.ctx, rule) if f["subject"] == order.name]
		self.assertEqual(len(found), 1)


# -- PHR-STOCK-VARIANCE ------------------------------------------------------


class TestStockVariance(PharmacyTestCase):
	def test_variance_above_the_value_floor_produces_a_card(self):
		doc = self.make_reconciliation(difference=2_000_000, current_amount=20_000_000)
		findings = pharmacy.stock_variance(self.ctx, self.rule("PHR-STOCK-VARIANCE"))
		mine = [f for f in findings if f["subject"] == doc.name]
		self.assertEqual(len(mine), 1)
		self.assertIn("Rp 2.000.000", mine[0]["evidence"][0]["value"])

	def test_variance_below_both_thresholds_produces_no_card(self):
		doc = self.make_reconciliation(difference=100_000, current_amount=100_000_000)
		findings = pharmacy.stock_variance(self.ctx, self.rule("PHR-STOCK-VARIANCE"))
		self.assertEqual([f for f in findings if f["subject"] == doc.name], [])

	def test_percentage_threshold_alone_can_raise_the_card(self):
		# Nilainya kecil, tetapi 20 persen dari nilai tercatat.
		doc = self.make_reconciliation(difference=100_000, current_amount=500_000)
		rule = self.set_threshold("PHR-STOCK-VARIANCE", value=999_000_000, secondary=5)
		mine = [f for f in pharmacy.stock_variance(self.ctx, rule) if f["subject"] == doc.name]
		self.assertEqual(len(mine), 1)

	def test_raising_the_threshold_silences_a_previously_reported_variance(self):
		doc = self.make_reconciliation(difference=2_000_000, current_amount=20_000_000)
		rule = self.rule("PHR-STOCK-VARIANCE")
		self.assertTrue([f for f in pharmacy.stock_variance(self.ctx, rule) if f["subject"] == doc.name])
		rule = self.set_threshold("PHR-STOCK-VARIANCE", value=50_000_000, secondary=90)
		self.assertEqual([f for f in pharmacy.stock_variance(self.ctx, rule) if f["subject"] == doc.name], [])


# -- PHR-SLOW-MOVING ---------------------------------------------------------


class TestSlowMovingStock(PharmacyTestCase):
	def _subject(self, item_code):
		return f"{item_code}::{self.warehouse}"

	def test_stock_without_outward_movement_produces_a_card(self):
		item = self.make_item()
		self.make_bin(item, qty=100, stock_value=9_000_000)
		findings = pharmacy.slow_moving_stock(self.ctx, self.rule("PHR-SLOW-MOVING"))
		mine = [f for f in findings if f["subject"] == self._subject(item)]
		self.assertEqual(len(mine), 1)
		self.assertIn("Rp 9.000.000", mine[0]["evidence"][0]["value"])

	def test_recent_outward_movement_produces_no_card(self):
		item = self.make_item()
		self.make_bin(item, qty=100, stock_value=9_000_000)
		self.make_outward_ledger_entry(item, add_days(today(), -3))
		findings = pharmacy.slow_moving_stock(self.ctx, self.rule("PHR-SLOW-MOVING"))
		self.assertEqual([f for f in findings if f["subject"] == self._subject(item)], [])

	def test_value_below_the_floor_produces_no_card(self):
		item = self.make_item()
		self.make_bin(item, qty=1, stock_value=100_000)
		findings = pharmacy.slow_moving_stock(self.ctx, self.rule("PHR-SLOW-MOVING"))
		self.assertEqual([f for f in findings if f["subject"] == self._subject(item)], [])

	def test_shortening_the_period_reports_stock_that_moved_recently(self):
		item = self.make_item()
		self.make_bin(item, qty=100, stock_value=9_000_000)
		self.make_outward_ledger_entry(item, add_days(today(), -10))
		rule = self.rule("PHR-SLOW-MOVING")
		self.assertEqual(
			[f for f in pharmacy.slow_moving_stock(self.ctx, rule) if f["subject"] == self._subject(item)], []
		)
		rule = self.set_threshold("PHR-SLOW-MOVING", value=5)
		self.assertEqual(
			len([f for f in pharmacy.slow_moving_stock(self.ctx, rule) if f["subject"] == self._subject(item)]), 1
		)


# -- PHR-SUBSTITUTE-AVAILABLE ------------------------------------------------


class TestSubstituteAvailable(PharmacyTestCase):
	def _scenario(self, reason="Stok kosong di gudang farmasi", alternative_qty=40):
		ingredient = f"Zat-Uji-{_hash(6)}"
		requested = self.make_item()
		alternative = self.make_item()
		self.make_formulary(requested, ingredient)
		self.make_formulary(alternative, ingredient)
		if alternative_qty:
			self.make_bin(alternative, qty=alternative_qty, stock_value=400_000, valuation_rate=10_000)
		request = self.make_medicine_request(requested, reason)
		return request, requested, alternative

	def test_stockout_request_with_an_available_equivalent_produces_an_urgent_card(self):
		request, requested, _alternative = self._scenario()
		findings = pharmacy.substitute_available(self.ctx, self.rule("PHR-SUBSTITUTE-AVAILABLE"))
		mine = [f for f in findings if f["subject"] == f"{request.name}::{requested}"]
		self.assertEqual(len(mine), 1)
		self.assertEqual(mine[0]["severity"], "Mendesak")
		labels = [row["label"] for row in mine[0]["evidence"]]
		self.assertIn("Zat aktif", labels)
		self.assertIn("Tersedia di gudang", labels)
		self.assertIn("Lokasi tersedia", labels)
		self.assertIn("Selisih harga terhadap stok internal", labels)
		self.assertIn("Tanggal dinyatakan kosong", labels)

	def test_no_alternative_in_stock_produces_no_card(self):
		request, requested, _alternative = self._scenario(alternative_qty=0)
		findings = pharmacy.substitute_available(self.ctx, self.rule("PHR-SUBSTITUTE-AVAILABLE"))
		self.assertEqual([f for f in findings if f["subject"] == f"{request.name}::{requested}"], [])

	def test_request_without_a_stockout_reason_still_produces_a_review_card(self):
		"""Fix 2 (§9.1): saringan alasan dibalik — kartu tetap terbit tanpa
		alasan eksplisit, hanya tingkatnya yang lebih rendah."""
		request, requested, _alternative = self._scenario(reason="Penambahan buffer rutin")
		findings = pharmacy.substitute_available(self.ctx, self.rule("PHR-SUBSTITUTE-AVAILABLE"))
		mine = [f for f in findings if f["subject"] == f"{request.name}::{requested}"]
		self.assertEqual(len(mine), 1)
		self.assertEqual(mine[0]["severity"], "Perlu Tinjauan")
		labels = [row["label"] for row in mine[0]["evidence"]]
		self.assertIn("Tanggal permintaan", labels)
		self.assertNotIn("Tanggal dinyatakan kosong", labels)

	def test_running_the_agent_twice_does_not_duplicate_the_card(self):
		"""Setiap permintaan obat kini diperiksa; dedup masih harus menyatukan
		temuan yang sama untuk request+item yang sama."""
		request, requested, _alternative = self._scenario(reason="Penambahan buffer rutin")
		subject = f"{request.name}::{requested}"
		first = runner.run_agent(self.agent.name, trigger="Manual")
		second = runner.run_agent(self.agent.name, trigger="Manual")
		self.assertEqual(first["status"], "Selesai")
		self.assertEqual(second["status"], "Selesai")
		cards = frappe.get_all(
			CARD_DOCTYPE,
			filters={"agent": self.agent.name, "rule_code": "PHR-SUBSTITUTE-AVAILABLE"},
			fields=["name", "dedup_key"],
		)
		mine = [c for c in cards if c.dedup_key.endswith(f":{subject}")]
		self.assertEqual(len(mine), 1)

	def test_raising_the_quantity_threshold_silences_a_thin_alternative(self):
		request, requested, _alternative = self._scenario(alternative_qty=3)
		rule = self.rule("PHR-SUBSTITUTE-AVAILABLE")
		self.assertTrue(
			[f for f in pharmacy.substitute_available(self.ctx, rule) if f["subject"] == f"{request.name}::{requested}"]
		)
		rule = self.set_threshold("PHR-SUBSTITUTE-AVAILABLE", value=10)
		self.assertEqual(
			[f for f in pharmacy.substitute_available(self.ctx, rule) if f["subject"] == f"{request.name}::{requested}"],
			[],
		)

	def test_outside_purchase_option_demands_a_written_note(self):
		self._scenario()
		findings = pharmacy.substitute_available(self.ctx, self.rule("PHR-SUBSTITUTE-AVAILABLE"))
		options = {o["label"]: o for o in findings[0]["options"]}
		self.assertEqual(options["Perintahkan substitusi"]["is_primary"], 1)
		self.assertEqual(options["Setujui pembelian luar"]["requires_note"], 1)
		self.assertIn("Minta klarifikasi farmasi", options)

	def test_strength_written_with_different_spacing_still_matches(self):
		ingredient = f"Zat-Uji-{_hash(6)}"
		requested = self.make_item()
		alternative = self.make_item()
		self.make_formulary(requested, ingredient, strength="500mg")
		self.make_formulary(alternative, ingredient, strength="500 MG")
		self.make_bin(alternative, qty=40, stock_value=400_000)
		request = self.make_medicine_request(requested, "Stok kosong di gudang farmasi")
		findings = pharmacy.substitute_available(self.ctx, self.rule("PHR-SUBSTITUTE-AVAILABLE"))
		self.assertEqual(
			len([f for f in findings if f["subject"] == f"{request.name}::{requested}"]), 1
		)

	def test_a_different_strength_is_not_treated_as_a_substitute(self):
		ingredient = f"Zat-Uji-{_hash(6)}"
		requested = self.make_item()
		alternative = self.make_item()
		self.make_formulary(requested, ingredient, strength="500mg")
		self.make_formulary(alternative, ingredient, strength="250mg")
		self.make_bin(alternative, qty=40, stock_value=400_000)
		request = self.make_medicine_request(requested, "Stok kosong di gudang farmasi")
		findings = pharmacy.substitute_available(self.ctx, self.rule("PHR-SUBSTITUTE-AVAILABLE"))
		self.assertEqual([f for f in findings if f["subject"] == f"{request.name}::{requested}"], [])

	def test_severity_is_urgent(self):
		self._scenario()
		findings = pharmacy.substitute_available(self.ctx, self.rule("PHR-SUBSTITUTE-AVAILABLE"))
		self.assertEqual(findings[0]["severity"], "Mendesak")


# -- batas dan bentuk fakta --------------------------------------------------


class TestPharmacyBoundaries(PharmacyTestCase):
	def test_agent_cannot_read_employee(self):
		with self.assertRaises(AgentScopeError):
			self.ctx.get_all("Employee", limit_page_length=1)

	def test_agent_cannot_read_patient(self):
		with self.assertRaises(AgentScopeError):
			self.ctx.get_all("Patient", limit_page_length=1)

	def test_agent_cannot_read_sales_invoice_or_salary_slip(self):
		for blocked in ("Sales Invoice", "Salary Slip"):
			with self.assertRaises(AgentScopeError):
				self.ctx.get_all(blocked, limit_page_length=1)
		self.assertEqual(len(self.ctx.violations), 2)

	def test_read_scope_matches_the_specification(self):
		self.assertEqual(
			sorted(self.ctx.read_scope),
			sorted(name for name, _reason in agent_setup.PHARMACY_READ_SCOPE),
		)

	def test_every_evidence_row_names_its_source(self):
		self.make_bin(self.make_item(), qty=100, stock_value=9_000_000)
		self.make_draft_purchase_order(5_000_000)
		for rule_code, detector in (
			("PHR-PO-THRESHOLD", pharmacy.po_awaiting_approval),
			("PHR-SLOW-MOVING", pharmacy.slow_moving_stock),
		):
			for finding in detector(self.ctx, self.rule(rule_code)):
				for row in finding["evidence"]:
					self.assertTrue(row["source_doctype"], f"{rule_code} tanpa source_doctype")
					self.assertTrue(row["source_name"], f"{rule_code} tanpa source_name")

	def test_agent_publishes_a_card_end_to_end(self):
		self.make_draft_purchase_order(5_000_000)
		result = runner.run_agent(self.agent.name, trigger="Manual")
		self.assertEqual(result["status"], "Selesai")
		cards = frappe.get_all(CARD_DOCTYPE, filters={"agent": self.agent.name}, pluck="name")
		self.assertTrue(cards)
		card = frappe.get_doc(CARD_DOCTYPE, cards[0])
		self.assertEqual(card.audience_role, fx.CHIEF_ROLE)
		self.assertTrue(card.evidence)
		for row in card.evidence:
			self.assertTrue(row.source_doctype)
			self.assertTrue(row.source_name)


# -- carry-over: pemindai nama --------------------------------------------


class TestProtectedNames(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		fx.ensure_chamber_access()

	def setUp(self):
		self.agent = fx.make_agent("NAMA", rules=[fx.rule("UJI-NAMA")])
		self.ctx = fx.context(self.agent)

	def tearDown(self):
		frappe.db.rollback()

	def _emit(self, title):
		from sentra_mantra_core.agents import contract

		return contract.emit_decision_card(
			self.ctx,
			self.agent.rules[0],
			subject=f"nama-{_hash(6)}",
			title=title,
			evidence=[
				{
					"label": "Temuan uji",
					"value": "1",
					"source_doctype": "Sentra Agent Rule",
					"source_name": "UJI-NAMA",
				}
			],
			options=[{"label": "Tutup kartu", "handler": "close_card", "is_primary": 1}],
		)

	def test_card_naming_a_supplier_is_rejected(self):
		supplier = frappe.get_doc(
			{
				"doctype": "Supplier",
				"supplier_name": f"Sintetis Pemasokuji {_hash(6)}",
				"supplier_type": "Company",
				"supplier_group": frappe.db.get_value("Supplier Group", {"is_group": 0}, "name"),
			}
		).insert(ignore_permissions=True)
		self.assertEqual(
			sanitize.scan_for_identifiers(f"Pesanan ke {supplier.supplier_name} tertunda"),
			"nama pemasok",
		)
		with self.assertRaises(frappe.ValidationError):
			self._emit(f"Pesanan ke {supplier.supplier_name} tertunda")

	def test_card_naming_a_healthcare_practitioner_is_rejected(self):
		practitioner = frappe.get_doc(
			{
				"doctype": "Healthcare Practitioner",
				"first_name": f"Sintetis Dokteruji {_hash(6)}",
				"status": "Active",
			}
		).insert(ignore_permissions=True)
		self.assertEqual(
			sanitize.scan_for_identifiers(f"Resep dari {practitioner.practitioner_name}"),
			"nama tenaga kesehatan",
		)
		with self.assertRaises(frappe.ValidationError):
			self._emit(f"Resep dari {practitioner.practitioner_name} tertunda")

	def test_card_naming_a_system_user_is_rejected(self):
		email = f"nama-uji-{_hash(6)}@example.com"
		frappe.get_doc(
			{
				"doctype": "User",
				"email": email,
				"first_name": f"Sintetis Penggunauji {_hash(6)}",
				"user_type": "System User",
				"send_welcome_email": 0,
			}
		).insert(ignore_permissions=True)
		full_name = frappe.db.get_value("User", email, "full_name")
		self.assertEqual(
			sanitize.scan_for_identifiers(f"Diajukan oleh {full_name}"), "nama pengguna sistem"
		)

	def test_a_short_supplier_name_does_not_block_unrelated_cards(self):
		"""Pencocokan pada batas kata, bukan substring.

		Tanpa ini, satu Supplier bernama "Sehat" melumpuhkan setiap kartu yang
		menyebut "kesehatan" — dan siapa pun yang boleh membuat Supplier bisa
		menghentikan penerbitan kartu.
		"""
		frappe.get_doc(
			{
				"doctype": "Supplier",
				"supplier_name": "Sehat",
				"supplier_type": "Company",
				"supplier_group": frappe.db.get_value("Supplier Group", {"is_group": 0}, "name"),
			}
		).insert(ignore_permissions=True)
		self.assertIsNone(
			sanitize.scan_for_identifiers("Anggaran kesehatan gudang farmasi melewati ambang")
		)
		self.assertEqual(
			sanitize.scan_for_identifiers("Pesanan ke Sehat tertunda"), "nama pemasok"
		)

	def test_clean_aggregate_text_is_still_accepted(self):
		self.assertIsNone(
			sanitize.scan_for_identifiers("Selisih opname farmasi Rp 1.200.000 pada 3 item")
		)

	def test_protected_names_cover_every_declared_source(self):
		self.assertEqual(
			{label for _dt, _field, label in sanitize._NAME_SOURCES},
			{
				"nama individu dari basis data karyawan",
				"nama tenaga kesehatan",
				"nama pengguna sistem",
				"nama pemasok",
			},
		)
