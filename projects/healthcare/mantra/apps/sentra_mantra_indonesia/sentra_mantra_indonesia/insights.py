"""Blok "Pandangan Direktur" di Beranda — sinyal operasional untuk persona chief.

Desain: docs/design/2026-07-16-beranda-persona-design.md §4.1 / §6.
Blok selalu terpasang di Home; klien menyembunyikan seluruh kartu jika signals kosong
atau persona bukan chief. Bukan analytics dashboard.

    bench --site mantra.localhost execute sentra_mantra_indonesia.insights.setup
"""

import frappe
from frappe.utils import add_days, flt, get_datetime, now_datetime, today

from sentra_mantra_indonesia.ws_common import can, gated_count, persona

BLOCK_NAME = "Pandangan Direktur RSIA"

FINAL_STATES = ("Draft", "Approved", "Rejected", "Cancelled")
APPROVAL_DOCTYPES = ("Purchase Order", "Payment Entry", "Journal Entry")
QUALITY_METHOD = "sentra_mantra_integrations.satusehat.metrics.reporting_quality"
REFERRAL_EXCEPTIONS_METHOD = (
	"sentra_mantra_hospital.referral.reporting.director_exceptions"
)
REFERRAL_SIGNALS_METHOD = (
	"sentra_mantra_hospital.referral.reporting.director_signal_counts"
)
DAILY_CLOSE_METHOD = "sentra_mantra_core.financial_cutover.reconcile"

DIRECTOR_INBOX_DOCTYPES = {
	"Material Request": None,
	"Purchase Order": "grand_total",
	"Purchase Invoice": "grand_total",
	"Payment Entry": "paid_amount",
	"Journal Entry": "total_debit",
	"Expense Claim": "total_sanctioned_amount",
}
URGENCY_ORDER = {"critical": 0, "attention": 1, "normal": 2}

HTML = """
<div class="rsia-dir" hidden>
	<div class="rsia-bar">
		<div class="rsia-dots"><i></i><i></i><i></i></div>
		<span class="rsia-bar-title">Sentra / Pandangan Direktur</span>
		<span class="rsia-bar-tag"><i></i>CEO</span>
	</div>
	<div class="rsia-inner">
		<div class="rsia-dir-kicker">Sinyal operasional hari ini</div>
		<div class="rsia-dir-signals" data-sec="signals"></div>
		<div class="rsia-dir-kicker" data-sec="inbox-title" hidden>Keputusan menunggu</div>
		<div class="rsia-dir-signals" data-sec="inbox"></div>
	</div>
</div>
"""

SCRIPT = """
frappe.call("sentra_mantra_indonesia.insights.my_insights").then((r) => {
	const d = r.message || {};
	const signals = d.signals || [];
	const inbox = ((d.inbox || {}).items || []);
	if (!d.director || (!signals.length && !inbox.length)) return;
	const root = root_element.querySelector(".rsia-dir");
	root.hidden = false;
	const esc = frappe.utils.escape_html;
	const box = root_element.querySelector('[data-sec="signals"]');
	box.innerHTML = "";
	signals.forEach((s) => {
		const a = document.createElement("a");
		a.className = "rsia-dir-card";
		a.href = s.route || "#";
		a.innerHTML = `<b>${esc(String(s.count))}</b><label>${esc(s.label)}</label>`;
		box.appendChild(a);
	});
	if (inbox.length) {
		root_element.querySelector('[data-sec="inbox-title"]').hidden = false;
		const inboxBox = root_element.querySelector('[data-sec="inbox"]');
		inbox.forEach((item) => {
			const a = document.createElement("a");
			a.className = "rsia-dir-card";
			a.href = item.route || "#";
			const age = `${item.age_days} hari / ${item.urgency}`;
			a.innerHTML = `<b>${esc(item.name)}</b>` +
				`<label>${esc(item.doctype)} / ${esc(item.workflow_state)} / ${esc(age)}</label>`;
			inboxBox.appendChild(a);
		});
	}
}).catch(() => {
	root_element.querySelector(".rsia-inner").innerHTML =
		'<div class="rsia-empty">Ringkasan belum dapat dimuat. Buka daftar lengkap untuk melihat data.</div>';
	root_element.querySelector(".rsia-dir").hidden = false;
});
"""

STYLE = """
.rsia-dir {
	position: relative;
	border: 1px solid var(--border-color);
	border-radius: 8px;
	background: var(--card-bg);
	color: #525252;
	font-family: InterVariable, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
	font-size: 14px;
	line-height: 22px;
	overflow: hidden;
	margin-top: 4px;
}
:host-context([data-theme="dark"]) .rsia-dir { color: var(--text-color); }
.rsia-bar {
	display: flex; align-items: center; gap: 12px;
	padding: 12px 16px; border-bottom: 1px solid var(--border-color);
}
.rsia-dots { display: flex; gap: 6px; padding-right: 12px; border-right: 1px solid var(--border-color); }
.rsia-dots i { width: 9px; height: 9px; border-radius: 50%; }
.rsia-dots i:nth-child(1) { background: #FF5F57; }
.rsia-dots i:nth-child(2) { background: #FEBC2E; }
.rsia-dots i:nth-child(3) { background: #28C840; }
.rsia-bar-title, .rsia-bar-tag {
	font-size: 10px; letter-spacing: .22em; text-transform: uppercase;
	color: #171717; font-weight: 600;
}
:host-context([data-theme="dark"]) .rsia-bar-title { color: var(--text-color); }
.rsia-bar-tag { margin-left: auto; color: var(--text-muted); display: flex; align-items: center; gap: 8px; font-weight: 500; }
.rsia-bar-tag i { display: block; width: 34px; height: 1px; background: var(--border-color); }
.rsia-inner { padding: 16px; }
.rsia-dir-kicker {
	font-size: 10px; letter-spacing: .18em; text-transform: uppercase;
	color: var(--text-muted); padding-bottom: 6px; border-bottom: 1px solid var(--border-color);
	margin-bottom: 12px;
}
.rsia-dir-signals { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }
.rsia-dir-card {
	display: block; padding: 12px 14px;
	border: 1px solid var(--border-color); border-radius: 8px;
	text-decoration: none; transition: border-color 120ms ease;
}
.rsia-dir-card b { display: block; font-size: 24px; line-height: 30px; font-weight: 600; color: #171717; }
:host-context([data-theme="dark"]) .rsia-dir-card b { color: var(--text-color); }
.rsia-dir-card label {
	display: block; margin-top: 2px; font-size: 10px; letter-spacing: .14em;
	text-transform: uppercase; color: var(--text-muted); cursor: pointer;
}
.rsia-dir-card:hover { border-color: #FF4B26; text-decoration: none; }
.rsia-dir-card:hover b { color: #FF4B26; }
.rsia-empty { color: var(--text-muted); padding: 6px 0; }
"""


def _route(doctype, filters=None):
	"""Bare list route only — query-string filters are not applied by Desk
	(same contract as home_today._route; C3-F10)."""
	_ = filters
	slug = frappe.scrub(doctype).replace("_", "-")
	return f"/app/{slug}"


def _document_route(doctype, name):
	return f"{_route(doctype)}/{name}"


def _row_value(row, field, default=None):
	if isinstance(row, dict):
		return row.get(field, default)
	return getattr(row, field, default)


def _age_days(creation) -> int:
	if not creation:
		return 0
	delta = now_datetime() - get_datetime(creation)
	return max(delta.days, 0)


def _urgency(age_days: int, *, exception: bool = False) -> str:
	if exception or age_days >= 4:
		return "critical"
	if age_days >= 2:
		return "attention"
	return "normal"


def _next_owner_role(workflow_state: str) -> str:
	if workflow_state == "Finance Review":
		return "MANTRA Finance Head"
	return "MANTRA Director"


def _inbox_item(doctype, row, amount_field=None, *, exception=False):
	name = _row_value(row, "name")
	workflow_state = _row_value(row, "workflow_state") or "Pending"
	age_days = _age_days(_row_value(row, "creation"))
	item = {
		"doctype": doctype,
		"name": name,
		"age_days": age_days,
		"workflow_state": workflow_state,
		"next_owner_role": _next_owner_role(workflow_state),
		"urgency": _urgency(age_days, exception=exception),
		"route": _document_route(doctype, name),
	}
	if amount_field:
		item["amount"] = flt(_row_value(row, amount_field))
	return item


def _director_access() -> bool:
	p, _ = persona()
	return p == "chief" or "MANTRA Director" in frappe.get_roles()


def director_inbox() -> dict:
	"""Return permission-filtered operational decisions for the Director persona."""
	if not _director_access():
		return {"items": []}

	items = []
	for doctype, amount_field in DIRECTOR_INBOX_DOCTYPES.items():
		if not can(doctype):
			continue
		fields = ["name", "creation", "workflow_state"]
		if amount_field:
			fields.append(amount_field)
		rows = frappe.get_list(
			doctype,
			filters={
				"docstatus": 0,
				"workflow_state": ("not in", FINAL_STATES),
			},
			fields=fields,
			order_by="creation asc, name asc",
			limit_page_length=100,
		)
		items.extend(_inbox_item(doctype, row, amount_field) for row in rows)

	try:
		referral_rows = frappe.get_attr(REFERRAL_EXCEPTIONS_METHOD)()
	except (ImportError, ModuleNotFoundError, frappe.PermissionError):
		referral_rows = []
	items.extend(
		_inbox_item(
			"Referral Settlement",
			row,
			"amount",
			exception=True,
		)
		for row in referral_rows
	)
	items.sort(
		key=lambda item: (
			URGENCY_ORDER[item["urgency"]],
			-item["age_days"],
			item["doctype"],
			item["name"],
		)
	)
	return {"items": items}


def _attendance_gap():
	if not (can("Employee") and can("Attendance")):
		return 0
	active = gated_count("Employee", {"status": "Active"})
	present = gated_count(
		"Attendance",
		{
			"attendance_date": today(),
			"docstatus": ("<", 2),
			"status": ("in", ("Present", "Half Day", "Work From Home")),
		},
	)
	return max(active - present, 0)


def _helpdesk_open():
	if not can("HD Ticket"):
		return 0
	return gated_count("HD Ticket", {"status": ("not in", ("Closed", "Resolved"))})


def _satusehat_completeness_pct():
	if not can("SATUSEHAT Sync Batch"):
		return None
	try:
		quality = frappe.get_attr(QUALITY_METHOD)()
	except Exception:
		return None
	if not quality or quality.get("completeness_pct") is None:
		return None
	return int(round(float(quality["completeness_pct"])))


def _operating_signals():
	signals = []
	try:
		referral = frappe.get_attr(REFERRAL_SIGNALS_METHOD)()
	except Exception:
		referral = {}
	for key, label, urgency, route in (
		(
			"exceptions",
			"Referral payout exceptions",
			"critical",
			"/app/referral-settlement",
		),
		(
			"unreconciled",
			"Referral payouts unreconciled",
			"attention",
			"/app/referral-settlement",
		),
		(
			"failed_transfers",
			"Failed transfers",
			"critical",
			"/app/referral-settlement",
		),
	):
		count = int(referral.get(key) or 0)
		if count:
			signals.append({
				"label": label,
				"count": count,
				"route": route,
				"urgency": urgency,
			})

	procurement_overdue = gated_count(
		"Material Request",
		{
			"docstatus": 0,
			"workflow_state": ("not in", FINAL_STATES),
			"creation": ("<=", add_days(today(), -4)),
		},
	)
	if procurement_overdue:
		signals.append({
			"label": "Procurement requests overdue",
			"count": procurement_overdue,
			"route": _route("Material Request"),
			"urgency": "attention",
		})

	receipts_not_billed = gated_count(
		"Purchase Receipt",
		{"docstatus": 1, "per_billed": ("<", 100)},
	)
	if receipts_not_billed:
		signals.append({
			"label": "Purchase receipts not billed",
			"count": receipts_not_billed,
			"route": _route("Purchase Receipt"),
			"urgency": "attention",
		})

	differences = 0
	if can("GL Entry"):
		try:
			reconciliation = frappe.get_attr(DAILY_CLOSE_METHOD)(today())
			differences = len(reconciliation.get("unreconciled") or [])
		except Exception:
			differences = 0
	if differences:
		signals.append({
			"label": "Daily close differences",
			"count": differences,
			"route": "/app/query-report/General Ledger",
			"urgency": "critical",
		})
	return signals


def _signals():
	out = _operating_signals()
	# agregat 3 doctype; kartu menaut ke doctype dengan antrean terbanyak
	# (dulu selalu /app/purchase-order — menyesatkan saat antrean di tempat lain)
	per_doctype = {
		doctype: gated_count(doctype, {"docstatus": 0, "workflow_state": ("not in", FINAL_STATES)})
		for doctype in APPROVAL_DOCTYPES
	}
	pending = sum(per_doctype.values())
	if pending:
		out.append({
			"label": "Persetujuan menunggu",
			"count": pending,
			"route": _route(max(per_doctype, key=per_doctype.get)),
			"urgency": "attention",
		})
	overdue = gated_count("Sales Invoice", {"docstatus": 1, "status": "Overdue"})
	if overdue:
		out.append({
			"label": "Tagihan overdue",
			"count": overdue,
			"route": _route("Sales Invoice", {"status": "Overdue"}),
			"urgency": "critical",
		})
	if can("Healthcare Practitioner"):
		try:
			blank = frappe.db.sql(
				"""select count(name) from `tabHealthcare Practitioner`
				where ifnull(str_no, '') = '' or ifnull(sip_no, '') = ''"""
			)[0][0]
		except Exception:
			blank = 0
		if blank:
			out.append({
				"label": "STR/SIP kosong",
				"count": blank,
				"route": "/app/healthcare-practitioner",
				"urgency": "attention",
			})
		try:
			expiring = frappe.db.sql(
				"""select count(name) from `tabHealthcare Practitioner`
				where ifnull(status, 'Active') = 'Active'
					and (
						(str_expiry is not null and str_expiry <= date_add(curdate(), interval 90 day))
						or (sip_expiry is not null and sip_expiry <= date_add(curdate(), interval 90 day))
					)"""
			)[0][0]
		except Exception:
			expiring = 0
		if expiring:
			out.append({
				"label": "STR/SIP ≤90 hari",
				"count": int(expiring),
				"route": "/app/healthcare-practitioner",
				"urgency": "attention",
			})
	leave = gated_count("Leave Application", {"status": "Open", "docstatus": 0})
	if leave:
		out.append({
			"label": "Cuti menunggu",
			"count": leave,
			"route": _route("Leave Application", {"status": "Open"}),
			"urgency": "normal",
		})
	gap = _attendance_gap()
	if gap:
		out.append({
			"label": "Kehadiran belum lengkap",
			"count": gap,
			"route": _route("Attendance", {"attendance_date": today()}),
			"urgency": "attention",
		})
	hd = _helpdesk_open()
	if hd:
		out.append({
			"label": "Tiket Helpdesk terbuka",
			"count": hd,
			"route": "/app/hd-ticket",
			"urgency": "normal",
		})
	pct = _satusehat_completeness_pct()
	if pct is not None:
		out.append({
			"label": "Kelengkapan SATUSEHAT (%)",
			"count": pct,
			"route": "/app/satusehat-sync-batch",
			"urgency": "normal",
		})
	out.sort(
		key=lambda signal: (
			URGENCY_ORDER[signal["urgency"]],
			-signal["count"],
			signal["label"],
		)
	)
	return out[:6]


@frappe.whitelist()
def my_insights():
	"""Sinyal operasional CEO — kosong untuk persona lain."""
	p, _ = persona()
	if not _director_access():
		return {"persona": p, "director": False, "signals": [], "inbox": {"items": []}}
	return {
		"persona": p,
		"director": True,
		"signals": _signals(),
		"inbox": director_inbox(),
	}


def setup():
	"""Idempoten: upsert Custom HTML Block saja (layout Home di home_today.setup)."""
	from sentra_mantra_indonesia.ws_common import upsert_block

	upsert_block(BLOCK_NAME, HTML, SCRIPT, STYLE)
	frappe.db.commit()
	return {"block": BLOCK_NAME}
