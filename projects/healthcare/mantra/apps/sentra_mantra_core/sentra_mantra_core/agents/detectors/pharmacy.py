"""Agen Farmasi & Rantai Pasok (`PHARMACY`) — spesifikasi §8.

Empat aturan, seluruhnya deterministik dan seluruh ambangnya data pada
`Sentra Agent Rule`. Tidak ada satu pun angka ambang di berkas ini; yang ada di
sini hanya cara menghitungnya.

Yang tidak pernah masuk kartu: nama pemasok, nama pemohon, nama penerima.
Temuan audit 11 Juli 2026 adalah soal celah sistem, bukan soal orang, dan §2
melarang menyebut individu secara permanen. Setiap teks bebas dari dokumen —
alasan permintaan, nama item — dibersihkan lewat `sanitize` sebelum menjadi
nilai fakta.

`read_scope` agen ini tidak memuat `Employee`, `Salary Slip`, `Patient`, maupun
`Sales Invoice`: agen Farmasi secara struktural buta terhadap data karyawan dan
pasien.
"""

from __future__ import annotations

from frappe.utils import add_days, add_to_date, now_datetime, today

from sentra_mantra_core.agents import sanitize

# Batas pemindaian per eksekusi. Jumlah kartu yang benar-benar terbit dibatasi
# `max_cards_per_run` pada definisi agen; batas di sini menjaga satu aturan
# tidak memindai seluruh gudang dalam satu jalan.
MAX_FINDINGS = 20
MAX_SCAN_ROWS = 200

# Jendela pengambilan dokumen untuk aturan yang §7 tidak beri periodenya.
# Dedup mencegah kartu berulang, jadi jendela ini hanya menentukan seberapa
# jauh ke belakang satu eksekusi melihat.
VARIANCE_LOOKBACK_DAYS = 7
REQUEST_WINDOW_HOURS = 24

# §8 langkah 1: permintaan pembelian obat dengan alasan "stok kosong".
_STOCK_OUT_PHRASES = ("stok kosong", "stok habis", "kosong stok", "out of stock", "kehabisan")

MEDICINE_CATEGORY = "Medicine"


def rupiah(value) -> str:
	try:
		return "Rp " + f"{float(value):,.0f}".replace(",", ".")
	except (TypeError, ValueError):
		return "Rp 0"


def _fact(label, value, source_doctype, source_name, raw_value=None, tone="Netral") -> dict:
	"""Setiap fakta wajib menyebut sumbernya — tidak ada angka tanpa asal-usul (§3)."""
	return {
		"label": label,
		"value": sanitize.clean_text(value),
		"raw_value": raw_value,
		"source_doctype": source_doctype,
		"source_name": source_name,
		"tone": tone,
	}


def _review_options() -> list[dict]:
	return [
		{"label": "Sudah saya tinjau", "handler": "close_card", "is_primary": 1},
		{"label": "Minta klarifikasi pengadaan", "handler": "defer_card"},
	]


# -- PHR-PO-THRESHOLD --------------------------------------------------------


def po_awaiting_approval(ctx, rule) -> list[dict]:
	"""PO belum tersubmit yang nilainya melewati ambang keputusan Chief."""
	threshold = float(rule.threshold_value or 0)
	findings = []
	for row in ctx.get_all(
		"Purchase Order",
		filters=[["docstatus", "=", 0], ["grand_total", ">=", threshold]],
		fields=["name", "grand_total", "transaction_date"],
		order_by="grand_total desc",
		limit_page_length=MAX_FINDINGS,
	):
		waiting_days = _days_since(row.transaction_date)
		findings.append(
			{
				"subject": row.name,
				"title": "Pesanan pembelian menunggu keputusan di atas ambang",
				"trigger_explanation": (
					f"Dipicu karena nilai pesanan {rupiah(row.grand_total)} melewati ambang "
					f"{rupiah(threshold)} dan dokumennya belum disetujui."
				),
				"evidence": [
					_fact(
						"Nilai pesanan",
						rupiah(row.grand_total),
						"Purchase Order",
						row.name,
						raw_value=row.grand_total,
						tone="Peringatan",
					),
					_fact(
						"Ambang berlaku", rupiah(threshold), "Sentra Agent Rule", rule.rule_code
					),
					_fact(
						"Menunggu",
						f"{waiting_days} hari",
						"Purchase Order",
						row.name,
						raw_value=waiting_days,
						tone="Peringatan" if waiting_days else "Netral",
					),
				],
				"options": _review_options(),
			}
		)
	return findings


# -- PHR-STOCK-VARIANCE ------------------------------------------------------


def stock_variance(ctx, rule) -> list[dict]:
	"""Selisih opname fisik versus catatan, di atas nilai rupiah ATAU persentase."""
	value_floor = float(rule.threshold_value or 0)
	percent_floor = float(rule.threshold_secondary or 0)
	since = add_days(today(), -VARIANCE_LOOKBACK_DAYS)
	findings = []
	for header in ctx.get_all(
		"Stock Reconciliation",
		filters=[["docstatus", "=", 1], ["posting_date", ">=", since]],
		fields=["name", "posting_date"],
		order_by="posting_date desc",
		limit_page_length=MAX_FINDINGS,
	):
		doc = ctx.get_doc("Stock Reconciliation", header.name)
		difference = sum(abs(row.amount_difference or 0) for row in doc.items or [])
		counted = sum(abs(row.current_amount or 0) for row in doc.items or [])
		percent = (difference / counted * 100) if counted else 0
		if difference < value_floor and percent < percent_floor:
			continue
		findings.append(
			{
				"subject": header.name,
				"title": "Selisih opname fisik melewati ambang",
				"trigger_explanation": (
					f"Dipicu karena selisih {rupiah(difference)} melewati ambang "
					f"{rupiah(value_floor)}, atau {percent:.1f} persen melewati ambang "
					f"{percent_floor:.1f} persen."
				),
				"evidence": [
					_fact(
						"Nilai selisih",
						rupiah(difference),
						"Stock Reconciliation",
						header.name,
						raw_value=difference,
						tone="Bahaya",
					),
					_fact(
						"Selisih terhadap nilai tercatat",
						f"{percent:.1f} persen",
						"Stock Reconciliation",
						header.name,
						raw_value=percent,
						tone="Peringatan",
					),
					_fact(
						"Baris item terdampak",
						str(len(doc.items or [])),
						"Stock Reconciliation",
						header.name,
						raw_value=len(doc.items or []),
					),
					_fact(
						"Tanggal opname",
						str(header.posting_date),
						"Stock Reconciliation",
						header.name,
					),
				],
				"options": _review_options(),
			}
		)
	return findings


# -- PHR-SLOW-MOVING ---------------------------------------------------------


def slow_moving_stock(ctx, rule) -> list[dict]:
	"""Persediaan tanpa mutasi keluar melewati periode, di atas nilai lantai."""
	idle_days = int(rule.threshold_value or 0)
	value_floor = float(rule.threshold_secondary or 0)
	cutoff = add_days(today(), -idle_days)
	findings = []
	for bin_row in ctx.get_all(
		"Bin",
		filters=[["actual_qty", ">", 0], ["stock_value", ">=", value_floor]],
		fields=["item_code", "warehouse", "actual_qty", "stock_value"],
		order_by="stock_value desc",
		limit_page_length=MAX_SCAN_ROWS,
	):
		last_out = ctx.get_all(
			"Stock Ledger Entry",
			filters=[
				["item_code", "=", bin_row.item_code],
				["warehouse", "=", bin_row.warehouse],
				["actual_qty", "<", 0],
				["is_cancelled", "=", 0],
			],
			fields=["posting_date"],
			order_by="posting_date desc",
			limit_page_length=1,
		)
		if last_out and str(last_out[0].posting_date) >= str(cutoff):
			continue
		last_out_label = str(last_out[0].posting_date) if last_out else "belum pernah keluar"
		findings.append(
			{
				"subject": f"{bin_row.item_code}::{bin_row.warehouse}",
				"title": "Persediaan tanpa mutasi keluar melewati periode",
				"trigger_explanation": (
					f"Dipicu karena tidak ada mutasi keluar selama {idle_days} hari terakhir "
					f"sementara nilai persediaannya {rupiah(bin_row.stock_value)}, "
					f"di atas lantai {rupiah(value_floor)}."
				),
				"evidence": [
					_fact(
						"Nilai persediaan diam",
						rupiah(bin_row.stock_value),
						"Bin",
						bin_row.item_code,
						raw_value=bin_row.stock_value,
						tone="Peringatan",
					),
					_fact(
						"Saldo",
						f"{bin_row.actual_qty:g} unit",
						"Bin",
						bin_row.item_code,
						raw_value=bin_row.actual_qty,
					),
					_fact("Lokasi", bin_row.warehouse, "Bin", bin_row.item_code),
					_fact(
						"Mutasi keluar terakhir",
						last_out_label,
						"Stock Ledger Entry",
						bin_row.item_code,
						tone="Bahaya" if not last_out else "Peringatan",
					),
				],
				"options": _review_options(),
			}
		)
		if len(findings) >= MAX_FINDINGS:
			break
	return findings


# -- PHR-SUBSTITUTE-AVAILABLE ------------------------------------------------


def substitute_available(ctx, rule) -> list[dict]:
	"""Zat aktif yang sama tersedia di gudang untuk permintaan pembelian obat.

	Diperiksa untuk SETIAP permintaan pembelian obat 24 jam terakhir — bukan
	hanya yang beralasan "stok kosong". Daftar frasa tetap mudah disiasati
	(§9.1: siapa pun yang menulis "persediaan nihil" atau "urgent" akan lolos
	dari saringan itu, dan siapa pun yang pernah melihat satu kartu bisa
	menebak daftarnya). Membalik saringan menutup celah itu: alasan tertulis
	tidak lagi menentukan APAKAH kartu terbit, hanya SEBERAPA mendesak ia
	tampil — alasan stok kosong eksplisit menaikkan kartu ke Mendesak,
	ketiadaan alasan itu tetap terbit sebagai Perlu Tinjauan selama
	substitusinya benar ada.

	Langkah: telusuri zat aktif tiap item lewat master formularium, cari item
	lain berzat aktif dan berkekuatan sama yang saldonya di atas ambang,
	lalu susun faktanya.
	"""
	min_qty = float(rule.threshold_value or 0)
	since = add_to_date(now_datetime(), hours=-REQUEST_WINDOW_HOURS)
	findings = []
	for header in ctx.get_all(
		"Material Request",
		filters=[
			["material_request_type", "=", "Purchase"],
			["mantra_request_category", "=", MEDICINE_CATEGORY],
			["docstatus", "<", 2],
			["creation", ">=", since],
		],
		fields=["name", "mantra_business_reason", "transaction_date"],
		order_by="creation desc",
		limit_page_length=MAX_FINDINGS,
	):
		stockout_reason = _mentions_stock_out(header.mantra_business_reason)
		request = ctx.get_doc("Material Request", header.name)
		for row in request.items or []:
			formulary = _formulary_entry(ctx, row.item_code)
			if not formulary:
				continue
			alternatives = _available_alternatives(ctx, formulary, row.item_code, min_qty)
			if not alternatives:
				continue
			findings.append(
				_substitute_finding(header, row, formulary, alternatives, rule, stockout_reason)
			)
			if len(findings) >= MAX_FINDINGS:
				return findings
	return findings


def _mentions_stock_out(reason) -> bool:
	text = sanitize.clean_text(reason, 500).lower()
	return any(phrase in text for phrase in _STOCK_OUT_PHRASES)


def _formulary_entry(ctx, item_code):
	rows = ctx.get_all(
		"Sentra Formulary Item",
		filters={"item": item_code},
		fields=["active_ingredient", "strength"],
		limit_page_length=1,
	)
	return rows[0] if rows else None


def _normalised(value) -> str:
	"""'500 mg', '500mg', dan '500MG' adalah kekuatan yang sama.

	Perbandingan string apa adanya akan membuat aturan ini diam hanya karena
	dua petugas mengetik kekuatan dengan spasi yang berbeda — kegagalan senyap
	pada aturan yang paling bernilai.
	"""
	return "".join(str(value or "").lower().split())


def _available_alternatives(ctx, formulary, requested_item, min_qty):
	target_strength = _normalised(formulary.strength)
	peers = [
		row.item
		for row in ctx.get_all(
			"Sentra Formulary Item",
			filters=[["active_ingredient", "like", (formulary.active_ingredient or "").strip()]],
			fields=["item", "strength"],
			limit_page_length=MAX_SCAN_ROWS,
		)
		if row.item != requested_item and _normalised(row.strength) == target_strength
	]
	if not peers:
		return []
	return ctx.get_all(
		"Bin",
		filters=[["item_code", "in", peers], ["actual_qty", ">", min_qty]],
		fields=["item_code", "warehouse", "actual_qty", "valuation_rate"],
		order_by="actual_qty desc",
		limit_page_length=MAX_SCAN_ROWS,
	)


def _substitute_finding(header, row, formulary, alternatives, rule, stockout_reason) -> dict:
	best = alternatives[0]
	available = sum(alt.actual_qty or 0 for alt in alternatives)
	requested_rate = float(row.rate or 0)
	internal_rate = float(best.valuation_rate or 0)
	price_gap = requested_rate - internal_rate
	tanggal_label = "Tanggal dinyatakan kosong" if stockout_reason else "Tanggal permintaan"
	evidence = [
		_fact(
			"Zat aktif",
			f"{formulary.active_ingredient} {formulary.strength or ''}".strip(),
			"Sentra Formulary Item",
			best.item_code,
			tone="Bahaya",
		),
		_fact(
			"Tersedia di gudang",
			f"{available:g} unit",
			"Bin",
			best.item_code,
			raw_value=available,
			tone="Bahaya",
		),
		_fact("Lokasi tersedia", best.warehouse, "Bin", best.item_code),
		_fact(
			"Selisih harga terhadap stok internal",
			rupiah(price_gap),
			"Material Request",
			header.name,
			raw_value=price_gap,
			tone="Bahaya" if price_gap > 0 else "Netral",
		),
		_fact(tanggal_label, str(header.transaction_date), "Material Request", header.name),
	]
	if stockout_reason:
		title = "Obat dinyatakan kosong padahal zat aktif sama tersedia"
		trigger = (
			f"Dipicu karena permintaan pembelian beralasan stok kosong, sementara "
			f"{available:g} unit zat aktif yang sama masih tercatat di gudang — "
			f"di atas ambang {min_qty_label(rule)}."
		)
	else:
		title = "Permintaan pembelian obat memiliki substitusi tersedia di gudang"
		trigger = (
			f"Dipicu karena permintaan pembelian ini tidak menyebut alasan stok kosong, namun "
			f"{available:g} unit zat aktif yang sama masih tercatat di gudang — "
			f"di atas ambang {min_qty_label(rule)}."
		)
	return {
		"subject": f"{header.name}::{row.item_code}",
		"title": title,
		"severity": "Mendesak" if stockout_reason else "Perlu Tinjauan",
		"trigger_explanation": trigger,
		"evidence": evidence,
		"options": [
			{"label": "Perintahkan substitusi", "handler": "close_card", "is_primary": 1},
			{
				"label": "Setujui pembelian luar",
				"handler": "close_card",
				"requires_note": 1,
			},
			{"label": "Minta klarifikasi farmasi", "handler": "defer_card"},
		],
	}


def min_qty_label(rule) -> str:
	return f"{float(rule.threshold_value or 0):g} {rule.threshold_unit or 'unit'}"


def _days_since(value) -> int:
	if not value:
		return 0
	from frappe.utils import date_diff

	return max(0, date_diff(today(), value))
