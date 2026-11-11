"""Blok operasional workspace "Keuangan" — pipeline, aging, cash, draft pile.

Nilai finansial hanya dihitung bila user punya read permission pada doctype
sumbernya. GL ringkas TIDAK ditampilkan (hormati gate Tahap 2).

    bench --site mantra.localhost execute sentra_mantra_indonesia.ws_keuangan.setup
"""

from __future__ import annotations

import frappe
from frappe.utils import add_days, date_diff, flt, get_first_day, getdate, today

from sentra_mantra_indonesia import ws_common
from sentra_mantra_indonesia.financial_metrics import (
	daily_movement,
	expense_mix,
	financial_position,
	revenue_mix,
)

BLOCK_NAME = "Keuangan Hari Ini RSIA"
WORKSPACE = "Keuangan"

FINAL_STATES = ("Draft", "Approved", "Rejected", "Cancelled")

ACTIONS = [
	{"label": "Tagihan", "desc": "Daftar Sales Invoice", "route": "/app/sales-invoice"},
	{"label": "Pembayaran", "desc": "Payment Entry", "route": "/app/payment-entry"},
	{"label": "Penjamin", "desc": "Customer / penjamin", "route": "/app/customer"},
	{"label": "Pengadaan", "desc": "Purchase Order", "route": "/app/purchase-order"},
	{"label": "Pemasok", "desc": "Supplier", "route": "/app/supplier"},
	{"label": "Jurnal", "desc": "Journal Entry (draft)", "route": "/app/journal-entry"},
	{"label": "Buat Tagihan", "desc": "Sales Invoice baru", "route": "/app/sales-invoice/new"},
	{"label": "Catat Pembayaran", "desc": "Payment Entry baru", "route": "/app/payment-entry/new"},
]


def _pe_sum(payment_type, from_date, to_date=None):
	to_date = to_date or from_date
	try:
		return float(
			frappe.db.sql(
				"""select ifnull(sum(paid_amount), 0) from `tabPayment Entry`
				where docstatus = 1 and payment_type = %s
					and posting_date between %s and %s""",
				(payment_type, from_date, to_date),
			)[0][0]
			or 0
		)
	except Exception:
		return None


def _cards():
	cards = []
	if ws_common.can("Sales Invoice"):
		cards.append(
			{
				"value": ws_common.count(
					"Sales Invoice", {"docstatus": 1, "outstanding_amount": (">", 0)}
				),
				"label": "Tagihan Belum Lunas",
				"route": "/app/sales-invoice",
			}
		)
	if ws_common.can("Payment Entry"):
		masuk = _pe_sum("Receive", today())
		keluar = _pe_sum("Pay", today())
		if masuk is not None:
			cards.append(
				{
					"value": ws_common.rupiah(masuk),
					"label": "Penerimaan Hari Ini",
					"route": "/app/payment-entry",
				}
			)
		if keluar is not None:
			cards.append(
				{
					"value": ws_common.rupiah(keluar),
					"label": "Pengeluaran Hari Ini",
					"route": "/app/payment-entry",
				}
			)
		week_start = add_days(today(), -6)
		w_in = _pe_sum("Receive", week_start, today())
		w_out = _pe_sum("Pay", week_start, today())
		if w_in is not None and w_out is not None:
			cards.append(
				{
					"value": ws_common.rupiah(w_in - w_out),
					"label": "Net Cash 7 Hari",
					"sub": f"In {ws_common.rupiah(w_in)} · Out {ws_common.rupiah(w_out)}",
				}
			)
	if ws_common.can("Purchase Order"):
		cards.append(
			{
				"value": ws_common.count(
					"Purchase Order",
					{"docstatus": 0, "workflow_state": ("not in", FINAL_STATES)},
				),
				"label": "PO Menunggu",
				"route": "/app/purchase-order",
			}
		)
	draft_n = 0
	for dt in ("Purchase Order", "Payment Entry", "Journal Entry", "Sales Invoice"):
		if ws_common.can(dt):
			draft_n += ws_common.count(dt, {"docstatus": 0})
	if draft_n:
		cards.append(
			{
				"value": draft_n,
				"label": "Draft Menumpuk",
				"sub": "Risiko kontrol internal",
			}
		)
	return cards


def _pipeline():
	"""PO → PE → JE dengan umur menunggu (hari sejak creation).

	creation, bukan modified: edit kecil pada dokumen basi tidak boleh
	me-reset umurnya ke 0d — panel ini justru ada untuk menampilkan
	persetujuan yang paling lama tertunda (C3-F9).
	"""
	items = []
	day = getdate(today())
	for doctype, label in (
		("Purchase Order", "PO"),
		("Payment Entry", "PE"),
		("Journal Entry", "JE"),
	):
		if not ws_common.can(doctype):
			continue
		rows = frappe.get_all(
			doctype,
			filters={"docstatus": 0, "workflow_state": ("not in", FINAL_STATES)},
			fields=["name", "workflow_state", "creation"],
			order_by="creation asc",
			limit=4,
		)
		for r in rows:
			r = frappe._dict(r)
			age = max(0, date_diff(day, getdate(r.creation)))
			items.append(
				{
					"title": f"{label} {r.name}",
					"sub": frappe._(r.workflow_state),
					"right": f"{age}d",
					"route": f"/app/{frappe.scrub(doctype).replace('_', '-')}/{r.name}",
					"_age": age,
				}
			)
	items.sort(key=lambda x: -x["_age"])
	for it in items:
		it.pop("_age", None)
	return items[:9]


PROCUREMENT_STAGES = (
	(
		"Material Request",
		{
			"docstatus": 0,
			"mantra_request_category": ("is", "set"),
			"workflow_state": ("not in", FINAL_STATES),
		},
		None,
	),
	(
		"Purchase Order",
		{"docstatus": 1, "per_received": ("<", 100)},
		"base_grand_total",
	),
	("Purchase Receipt", {"docstatus": 0}, None),
	(
		"Purchase Invoice",
		{"docstatus": 1, "outstanding_amount": (">", 0)},
		"outstanding_amount",
	),
	(
		"Payment Entry",
		{"docstatus": 0, "payment_type": "Pay", "party_type": "Supplier"},
		None,
	),
)


def _procurement_pipeline():
	"""Permission-filtered aggregate stages without named supplier rows."""
	stages = []
	day = getdate(today())
	for doctype, filters, amount_field in PROCUREMENT_STAGES:
		if not ws_common.can(doctype):
			continue
		fields = ["creation"]
		if amount_field:
			fields.append(amount_field)
		rows = [
			frappe._dict(row)
			for row in frappe.get_list(
				doctype,
				filters=filters,
				fields=fields,
				order_by="creation asc",
				limit_page_length=0,
			)
		]
		stage = {
			"status": "pending",
			"count": len(rows),
			"oldest_days": (
				max(0, date_diff(day, getdate(rows[0].creation))) if rows else 0
			),
			"route": f"/app/{frappe.scrub(doctype).replace('_', '-')}",
		}
		if amount_field:
			stage["amount"] = flt(
				sum(flt(row.get(amount_field)) for row in rows)
			)
		stages.append(stage)
	return stages


def _procurement_panel_items(stages):
	labels = {
		"/app/material-request": "Material Request",
		"/app/purchase-order": "Purchase Order",
		"/app/purchase-receipt": "Purchase Receipt",
		"/app/purchase-invoice": "Purchase Invoice",
		"/app/payment-entry": "Payment Entry",
	}
	items = []
	for stage in stages:
		right = f"{stage['count']} pending"
		if "amount" in stage:
			right = f"{right} · {ws_common.rupiah(stage['amount'])}"
		items.append(
			{
				"title": labels[stage["route"]],
				"sub": f"Tertua {stage['oldest_days']} hari",
				"right": right,
				"route": stage["route"],
			}
		)
	return items


AR_BUCKETS = (
	("0–30 hari", 0, 30),
	("31–60 hari", 31, 60),
	("61–90 hari", 61, 90),
	(">90 hari", 91, None),
)


def _ar_aging_buckets():
	"""Jumlah outstanding per bucket umur piutang (due_date → today)."""
	if not ws_common.can("Sales Invoice"):
		return []
	day = today()
	try:
		rows = frappe.db.sql(
			"""
			select
				case
					when datediff(%s, ifnull(due_date, posting_date)) <= 30 then '0–30 hari'
					when datediff(%s, ifnull(due_date, posting_date)) <= 60 then '31–60 hari'
					when datediff(%s, ifnull(due_date, posting_date)) <= 90 then '61–90 hari'
					else '>90 hari'
				end as bucket,
				sum(outstanding_amount) as outstanding,
				count(name) as n
			from `tabSales Invoice`
			where docstatus = 1 and outstanding_amount > 0
			group by bucket
			""",
			(day, day, day),
			as_dict=True,
		)
	except Exception:
		return []
	by_name = {frappe._dict(r).bucket: frappe._dict(r) for r in rows}
	items = []
	for label, _lo, _hi in AR_BUCKETS:
		r = by_name.get(label)
		amt = float(r.outstanding) if r else 0.0
		n = int(r.n) if r else 0
		items.append(
			{
				"title": label,
				"sub": f"{n} tagihan" if n else "Kosong",
				"right": ws_common.rupiah(amt),
			}
		)
	return items


def _ar_aging_cards():
	"""Kartu ringkas per bucket — hanya yang punya nilai > 0 (no fake zero)."""
	items = _ar_aging_buckets()
	cards = []
	for it in items:
		# right is rupiah string; detect non-zero via sub count
		if it["sub"] == "Kosong":
			continue
		cards.append(
			{
				"value": it["right"],
				"label": f"AR {it['title']}",
				"sub": it["sub"],
			}
		)
	return cards


# Baris bernama (customer/party + nominal) bisa memuat pasien self-pay yang
# terdaftar sebagai Customer — hanya untuk role akuntansi, bukan semua pemegang
# read Sales Invoice (temuan review C3-F5).
_NAMED_ROW_ROLES = ("Accounts Manager", "Accounts User", "System Manager")


def _aging_penjamin():
	"""Top Customer by outstanding + bucket dominan.

	Baris memuat nama customer — pasien self-pay mungkin ikut tampil, karena
	itu di-gate role akuntansi, bukan sekadar read Sales Invoice.
	"""
	if not ws_common.can("Sales Invoice") or not ws_common.has_role(*_NAMED_ROW_ROLES):
		return []
	day = today()
	try:
		rows = frappe.db.sql(
			"""
			select customer, customer_name,
				sum(outstanding_amount) as outstanding,
				count(name) as n,
				sum(case when datediff(%s, ifnull(due_date, posting_date)) > 90
					then outstanding_amount else 0 end) as over_90
			from `tabSales Invoice`
			where docstatus = 1 and outstanding_amount > 0
			group by customer, customer_name
			order by outstanding desc
			limit 6
			""",
			(day,),
			as_dict=True,
		)
	except Exception:
		return []
	items = []
	for r in rows:
		r = frappe._dict(r)
		over = float(r.over_90 or 0)
		sub = f"{int(r.n)} tagihan open"
		if over > 0:
			sub = f"{sub} · >90h {ws_common.rupiah(over)}"
		item = {
			"title": r.customer_name or r.customer,
			"sub": sub,
			"right": ws_common.rupiah(r.outstanding),
		}
		if r.customer:
			item["route"] = f"/app/customer/{r.customer}"
		items.append(item)
	return items


def _recent_transactions():
	items = []
	if not ws_common.has_role(*_NAMED_ROW_ROLES):
		return items
	# get_list (bukan get_all): baris menampilkan customer_name/party_name,
	# jadi row-level permission user harus tetap berlaku.
	if ws_common.can("Sales Invoice"):
		for r in frappe.get_list(
			"Sales Invoice",
			filters={"docstatus": 1},
			fields=["name", "customer_name", "grand_total", "modified"],
			order_by="modified desc",
			limit=4,
		):
			items.append(
				{
					"title": r.name,
					"sub": " · ".join(filter(None, ["Tagihan", r.customer_name])),
					"right": ws_common.rupiah(r.grand_total),
					"route": f"/app/sales-invoice/{r.name}",
					"_ts": r.modified,
				}
			)
	if ws_common.can("Payment Entry"):
		for r in frappe.get_list(
			"Payment Entry",
			filters={"docstatus": 1},
			fields=["name", "party_name", "paid_amount", "modified"],
			order_by="modified desc",
			limit=4,
		):
			items.append(
				{
					"title": r.name,
					"sub": " · ".join(filter(None, ["Payment Entry", r.party_name])),
					"right": ws_common.rupiah(r.paid_amount),
					"route": f"/app/payment-entry/{r.name}",
					"_ts": r.modified,
				}
			)
	items.sort(key=lambda x: x.pop("_ts"), reverse=True)
	return items[:5]


def _gl_gate_open() -> bool:
	"""Read the authoritative Class C gate without importing another app."""
	try:
		return bool(
			frappe.get_attr("sentra_mantra_core.tahap2_gate.status")().get(
				"gate_terbuka"
			)
		)
	except Exception:
		return False


def _metric_value(metric):
	value = metric.get("value", 0)
	if metric.get("unit") == "IDR":
		return ws_common.rupiah(value)
	return value


def _metric_cards(metrics):
	return [
		{
			"value": _metric_value(metric),
			"label": metric["label"],
			"sub": f"{metric['status']} · as of {metric['as_of']}",
			"route": metric["route"],
		}
		for metric in metrics
	]


def _metric_panel(title, metrics):
	return {
		"title": title,
		"items": [
			{
				"title": metric["label"],
				"sub": f"{metric['status']} · as of {metric['as_of']}",
				"right": _metric_value(metric),
				"route": metric["route"],
			}
			for metric in metrics[:10]
		],
		"empty": f"Belum ada data {title.lower()}.",
	}


@frappe.whitelist()
def data(as_of_date=None, from_date=None):
	"""Ringkasan keuangan — permission-gated; tanpa GL (Tahap 2 gate)."""
	as_of = str(getdate(as_of_date or today()))
	from_date = str(getdate(from_date or get_first_day(as_of)))
	procurement_pipeline = _procurement_pipeline()
	payload = {
		"cards": _cards() + _ar_aging_cards(),
		"actions": ACTIONS,
		"procurement_pipeline": procurement_pipeline,
		"panels": [
			{
				"title": "AR Aging Buckets",
				"items": _ar_aging_buckets(),
				"empty": "Tidak ada piutang outstanding.",
			},
			{
				"title": "Pipeline Pengadaan Native",
				"items": _procurement_panel_items(procurement_pipeline),
				"empty": "Tidak ada tahap pengadaan yang dapat diakses.",
			},
			{
				"title": "Pipeline Persetujuan (PO → PE → JE)",
				"items": _pipeline(),
				"empty": "Tidak ada dokumen menunggu persetujuan.",
			},
			{
				"title": "Aging Piutang Penjamin",
				"items": _aging_penjamin(),
				"empty": "Tidak ada outstanding penjamin.",
			},
			{
				"title": "Transaksi Terbaru",
				"items": _recent_transactions(),
				"empty": "Belum ada transaksi tercatat.",
			},
		],
	}
	if not _gl_gate_open():
		payload["cards"].insert(
			0,
			{
				"value": "Tertutup",
				"label": "Gate GL Tahap 2",
				"sub": "Saldo/GL menunggu GO Chief dan opening balance.",
			},
		)
		payload["note"] = {
			"title": "Gate GL Tahap 2 masih tertutup",
			"desc": "Kartu saldo/GL sengaja tidak ditampilkan sampai Workflow Approved doc_status diubah atas GO Chief. AR aging dari due_date Sales Invoice (Customer/penjamin).",
		}
		return payload

	payload["note"] = {
		"title": "Gate GL Tahap 2 terbuka",
		"desc": f"Metrik terkonfirmasi memakai dokumen submitted sampai {as_of}.",
	}
	if ws_common.can("GL Entry"):
		position = financial_position(as_of)
		expenses = expense_mix(from_date, as_of)
		payload["financial_position"] = position
		payload["expense_mix"] = expenses
		payload["cards"].extend(_metric_cards(position["metrics"]))
		payload["panels"].append(_metric_panel("Expense Mix", expenses))
	if ws_common.can("Payment Entry"):
		movement = daily_movement(as_of)
		payload["daily_movement"] = movement
		payload["cards"].extend(_metric_cards(movement["metrics"]))
	if ws_common.can("Sales Invoice"):
		revenue = revenue_mix(from_date, as_of)
		payload["revenue_mix"] = revenue
		payload["panels"].append(_metric_panel("Revenue Mix", revenue))
	return payload


def setup():
	ws_common.upsert_block(
		BLOCK_NAME,
		ws_common.block_html("Keuangan", "Finansial"),
		ws_common.block_script("sentra_mantra_indonesia.ws_keuangan.data"),
		ws_common.BLOCK_STYLE,
	)
	# Hanya blok netral — shortcut tile Frappe di bawahnya terlihat warna-warni.
	ws_common.slim_to_block(WORKSPACE, BLOCK_NAME, "rsiaKeuanganHariIni")
	frappe.db.commit()
	return {"block": BLOCK_NAME, "workspace": WORKSPACE, "layout": "block-only"}
