"""RME extract status block for the existing MANTRA Home workspace.

Only batch metadata and aggregate status counts leave this module. Raw RME
payloads remain in the permission-protected staging record DocType.
"""

from __future__ import annotations

import json

import frappe

from sentra_mantra_integrations.rme_bridge.staging import BATCH_DOCTYPE, RECORD_DOCTYPE

BLOCK_NAME = "Status Extract RME"
BLOCK_ID = "rsiaRmeExtract"
CLINIC_BLOCK_NAME = "Jumlah Pasien RME"
CLINIC_BLOCK_ID = "rsiaRmePatientTotal"
HOME_WORKSPACE = "Home"
CLINIC_WORKSPACE = "Pasien & Klinik"

ENTITIES = ("patient", "visit")
VALIDATION_STATUSES = ("Pending", "Valid", "Invalid")
MAPPING_STATUSES = ("Pending", "Matched", "New", "Conflict", "Failed")

HTML = """
<section class="rme-bridge" hidden>
	<header class="rme-bar">
		<div class="rme-dots" aria-hidden="true"><i></i><i></i><i></i></div>
		<span class="rme-title">Sentra / Extract RME</span>
		<span class="rme-tag"><i></i>Read-only</span>
	</header>
	<div class="rme-inner">
		<div class="rme-empty" data-sec="empty" hidden>
			<strong>Belum ada hasil extract RME</strong>
			<span>Ringkasan akan terisi otomatis setelah batch pertama masuk ke staging.</span>
		</div>
		<div data-sec="summary" hidden>
			<div class="rme-kicker">Status data staging terbaru</div>
			<div class="rme-stats" data-sec="stats"></div>
			<div class="rme-batches" data-sec="batches"></div>
		</div>
	</div>
</section>
"""

CLINIC_HTML = """
<section class="rme-patient-total" hidden>
	<div class="rme-patient-kpi">
		<span class="rme-patient-eyebrow">RME RSIA Melinda</span>
		<strong data-value></strong>
		<span class="rme-patient-label">Pasien di RME</span>
	</div>
	<div class="rme-patient-audit">
		<span data-source></span>
		<span data-captured></span>
		<a data-audit href="#">Buka audit snapshot</a>
	</div>
</section>
"""

CLINIC_SCRIPT = """
frappe.call("sentra_mantra_integrations.rme_bridge.dashboard.get_patient_total").then((r) => {
	const d = r.message || {};
	if (!d.visible || !d.has_data) return;
	const root = root_element.querySelector(".rme-patient-total");
	root.querySelector("[data-value]").textContent = new Intl.NumberFormat("id-ID").format(d.total);
	root.querySelector("[data-source]").textContent = `Sumber: ${d.connection_label || d.source_kind}`;
	root.querySelector("[data-captured]").textContent = `Ditarik ${frappe.datetime.str_to_user(d.captured_at)}`;
	root.querySelector("[data-audit]").href = `/app/rme-staging-batch/${encodeURIComponent(d.batch)}`;
	root.hidden = false;
});
"""

CLINIC_STYLE = """
.rme-patient-total {
	display: grid; grid-template-columns: minmax(180px, 1fr) minmax(240px, 2fr);
	align-items: stretch; border: 1px solid var(--border-color); border-radius: 8px;
	background: var(--card-bg); color: var(--text-color); overflow: hidden;
	font-family: InterVariable, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.rme-patient-total[hidden] { display: none; }
.rme-patient-kpi { padding: 18px 20px; border-right: 1px solid var(--border-color); }
.rme-patient-eyebrow, .rme-patient-label { display: block; color: var(--text-muted); font-size: 11px; line-height: 16px; }
.rme-patient-eyebrow { text-transform: uppercase; font-weight: 600; }
.rme-patient-kpi strong { display: block; margin: 4px 0 2px; font-size: 30px; line-height: 36px; font-weight: 650; color: #171717; }
:host-context([data-theme="dark"]) .rme-patient-kpi strong { color: var(--text-color); }
.rme-patient-audit { display: flex; flex-wrap: wrap; align-content: center; gap: 5px 18px; padding: 18px 20px; color: var(--text-muted); font-size: 12px; }
.rme-patient-audit span { min-width: 180px; }
.rme-patient-audit a { width: 100%; margin-top: 4px; color: #087f5b; font-weight: 600; text-decoration: none; }
.rme-patient-audit a:hover { text-decoration: underline; text-underline-offset: 3px; }
@media (max-width: 767px) {
	.rme-patient-total { grid-template-columns: 1fr; }
	.rme-patient-kpi { border-right: 0; border-bottom: 1px solid var(--border-color); }
}
"""

SCRIPT = """
frappe.call("sentra_mantra_integrations.rme_bridge.dashboard.get_dashboard_data").then((r) => {
	const d = r.message || {};
	if (!d.visible) return;
	const root = root_element.querySelector(".rme-bridge");
	root.hidden = false;
	if (!d.has_data) {
		root_element.querySelector('[data-sec="empty"]').hidden = false;
		return;
	}

	const esc = frappe.utils.escape_html;
	const fmt = (value) => value ? frappe.datetime.str_to_user(value) : "Masih berjalan";
	const labels = {patient: "Pasien", visit: "Kunjungan"};
	const totals = d.totals || {};
	const stats = [
		[totals.records || 0, "Record terbaru"],
		[totals.pending_validation || 0, "Menunggu validasi"],
		[totals.conflict || 0, "Konflik pemetaan"],
		[totals.failed || 0, "Gagal diproses"],
	];
	root_element.querySelector('[data-sec="stats"]').innerHTML = stats.map(([count, label]) =>
		`<div class="rme-stat"><b>${esc(String(count))}</b><span>${esc(label)}</span></div>`
	).join("");

	root_element.querySelector('[data-sec="batches"]').innerHTML = (d.batches || []).map((batch) => {
		const batchRoute = `/app/rme-staging-batch/${encodeURIComponent(batch.name)}`;
		const recordsRoute = `/app/rme-staging-record?batch=${encodeURIComponent(batch.name)}`;
		const statusClass = `rme-status-${String(batch.status || "").toLowerCase()}`;
		return `<article class="rme-batch">
			<div class="rme-batch-main">
				<div><strong>${esc(labels[batch.entity] || batch.entity)}</strong><span>${esc(batch.name)}</span></div>
				<b>${esc(String(batch.total_records || 0))}</b>
			</div>
			<div class="rme-batch-meta">
				<span class="rme-status ${statusClass}">${esc(batch.status || "Draft")}</span>
				<span>Ditarik ${esc(fmt(batch.finished_at || batch.started_at))}</span>
				<span>Valid ${esc(String((batch.validation || {}).Valid || 0))}</span>
				<span>Baru ${esc(String((batch.mapping || {}).New || 0))}</span>
				<span>Cocok ${esc(String((batch.mapping || {}).Matched || 0))}</span>
			</div>
			<nav class="rme-links" aria-label="Audit extract RME">
				<a href="${batchRoute}">Lihat batch</a>
				<a href="${recordsRoute}">Lihat audit record</a>
			</nav>
		</article>`;
	}).join("");
	root_element.querySelector('[data-sec="summary"]').hidden = false;
}).catch(() => {
	const root = root_element.querySelector(".rme-bridge");
	root.hidden = false;
	root_element.querySelector(".rme-inner").innerHTML =
		'<div class="rme-empty"><strong>Status extract tidak dapat dimuat</strong><span>Buka daftar RME Staging Batch untuk melihat audit terakhir.</span></div>';
});
"""

STYLE = """
.rme-bridge {
	border: 1px solid var(--border-color); border-radius: 8px;
	background: var(--card-bg); color: #525252; overflow: hidden;
	font-family: InterVariable, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
:host-context([data-theme="dark"]) .rme-bridge { color: var(--text-color); }
.rme-bar { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--border-color); }
.rme-dots { display: flex; gap: 6px; padding-right: 12px; border-right: 1px solid var(--border-color); }
.rme-dots i { width: 9px; height: 9px; border-radius: 50%; }
.rme-dots i:nth-child(1) { background: #ff5f57; }
.rme-dots i:nth-child(2) { background: #febc2e; }
.rme-dots i:nth-child(3) { background: #28c840; }
.rme-title, .rme-tag { font-size: 10px; letter-spacing: .18em; text-transform: uppercase; font-weight: 600; }
.rme-title { color: #171717; }
:host-context([data-theme="dark"]) .rme-title { color: var(--text-color); }
.rme-tag { margin-left: auto; color: var(--text-muted); display: flex; align-items: center; gap: 8px; }
.rme-tag i { width: 34px; height: 1px; background: var(--border-color); }
.rme-inner { padding: 16px 20px 18px; }
.rme-kicker { font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: var(--text-muted); padding-bottom: 7px; }
.rme-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); }
.rme-stat { min-width: 0; padding: 14px 16px; border-left: 1px solid var(--border-color); }
.rme-stat:first-child { border-left: 0; }
.rme-stat b { display: block; font-size: 23px; line-height: 28px; color: #171717; font-weight: 600; }
:host-context([data-theme="dark"]) .rme-stat b { color: var(--text-color); }
.rme-stat span { display: block; margin-top: 2px; color: var(--text-muted); font-size: 11px; line-height: 16px; }
.rme-batches { margin-top: 6px; }
.rme-batch { padding: 14px 0; border-bottom: 1px solid var(--border-color); }
.rme-batch:last-child { border-bottom: 0; padding-bottom: 0; }
.rme-batch-main { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.rme-batch-main div { min-width: 0; }
.rme-batch-main strong { display: block; color: #171717; font-size: 14px; }
:host-context([data-theme="dark"]) .rme-batch-main strong { color: var(--text-color); }
.rme-batch-main span { display: block; color: var(--text-muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rme-batch-main > b { flex: none; font-size: 20px; color: #171717; }
:host-context([data-theme="dark"]) .rme-batch-main > b { color: var(--text-color); }
.rme-batch-meta { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 7px; color: var(--text-muted); font-size: 11px; }
.rme-status { font-weight: 600; color: #525252; }
.rme-status-completed { color: #087f5b; }
.rme-status-failed { color: #c92a2a; }
.rme-status-running { color: #b26a00; }
.rme-links { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 7px; }
.rme-links a { color: #525252; font-size: 12px; font-weight: 600; text-decoration: none; }
:host-context([data-theme="dark"]) .rme-links a { color: var(--text-color); }
.rme-links a:hover { color: #ff4b26; text-decoration: underline; text-underline-offset: 3px; }
.rme-empty { padding: 8px 0; }
.rme-empty strong { display: block; color: #171717; font-size: 14px; }
:host-context([data-theme="dark"]) .rme-empty strong { color: var(--text-color); }
.rme-empty span { display: block; margin-top: 3px; color: var(--text-muted); font-size: 12px; }
@media (max-width: 767px) {
	.rme-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
	.rme-stat:nth-child(3) { border-left: 0; border-top: 1px solid var(--border-color); }
	.rme-stat:nth-child(4) { border-top: 1px solid var(--border-color); }
	.rme-inner { padding-left: 16px; padding-right: 16px; }
}
"""


def _status_counts(batch_name: str, fieldname: str, statuses: tuple[str, ...]) -> dict[str, int]:
	counts = dict.fromkeys(statuses, 0)
	for row in frappe.get_all(
		RECORD_DOCTYPE,
		filters={"batch": batch_name},
		fields=[fieldname, "count(name) as total"],
		group_by=fieldname,
	):
		status = row.get(fieldname)
		if status in counts:
			counts[status] = int(row.total or 0)
	return counts


def _latest_batch(
	entity: str,
	capture_mode: str | None = None,
	status: str | None = None,
) -> str | None:
	filters = {"entity": entity}
	if capture_mode:
		filters["capture_mode"] = capture_mode
	if status:
		filters["status"] = status
	names = frappe.get_all(
		BATCH_DOCTYPE,
		filters=filters,
		pluck="name",
		order_by="started_at desc, creation desc",
		limit=1,
	)
	return names[0] if names else None


def _batch_summary(batch_name: str) -> dict:
	batch = frappe.db.get_value(
		BATCH_DOCTYPE,
		batch_name,
		[
			"name",
			"entity",
			"source_kind",
			"capture_mode",
			"status",
			"started_at",
			"finished_at",
			"total_records",
		],
		as_dict=True,
	)
	if not batch:
		raise frappe.DoesNotExistError(BATCH_DOCTYPE, batch_name)
	return {
		"name": batch.name,
		"entity": batch.entity,
		"source_kind": batch.source_kind,
		"status": batch.status,
		"started_at": batch.started_at,
		"finished_at": batch.finished_at,
		"total_records": (
			int(batch.total_records or 0)
			if batch.capture_mode == "Aggregate"
			else frappe.db.count(RECORD_DOCTYPE, {"batch": batch.name})
		),
		"validation": _status_counts(batch.name, "validation_status", VALIDATION_STATUSES),
		"mapping": _status_counts(batch.name, "mapping_status", MAPPING_STATUSES),
	}


@frappe.whitelist()
def get_dashboard_data() -> dict:
	"""Return PHI-free metadata for the current user's Home dashboard."""
	if frappe.session.user == "Guest" or not frappe.has_permission(BATCH_DOCTYPE, "read"):
		return {"visible": False}

	batches = []
	for entity in ENTITIES:
		batch_name = _latest_batch(entity)
		if batch_name:
			batches.append(_batch_summary(batch_name))

	return {
		"visible": True,
		"has_data": bool(batches),
		"batches": batches,
		"totals": {
			"records": sum(batch["total_records"] for batch in batches),
			"pending_validation": sum(batch["validation"]["Pending"] for batch in batches),
			"conflict": sum(batch["mapping"]["Conflict"] for batch in batches),
			"failed": sum(batch["mapping"]["Failed"] for batch in batches),
		},
	}


@frappe.whitelist()
def get_patient_total() -> dict:
	"""Return the latest completed RME patient count without patient payloads."""
	if frappe.session.user == "Guest" or not frappe.has_permission(BATCH_DOCTYPE, "read"):
		return {"visible": False}

	batch_name = _latest_batch("patient", status="Completed")
	if not batch_name:
		return {"visible": True, "has_data": False}

	batch = frappe.db.get_value(
		BATCH_DOCTYPE,
		batch_name,
		[
			"name",
			"source_kind",
			"connection_label",
			"total_records",
			"finished_at",
			"started_at",
			"capture_mode",
		],
		as_dict=True,
	)
	total = (
		int(batch.total_records or 0)
		if batch.capture_mode == "Aggregate"
		else frappe.db.count(RECORD_DOCTYPE, {"batch": batch.name})
	)
	return {
		"visible": True,
		"has_data": True,
		"total": total,
		"batch": batch.name,
		"source_kind": batch.source_kind,
		"connection_label": batch.connection_label,
		"captured_at": batch.finished_at or batch.started_at,
	}


def _upsert_block(name: str, html: str, script: str, style: str):
	if frappe.db.exists("Custom HTML Block", name):
		block = frappe.get_doc("Custom HTML Block", name)
	else:
		block = frappe.new_doc("Custom HTML Block")
		block.__newname = name
	block.private = 0
	block.html = html
	block.script = script
	block.style = style
	block.save(ignore_permissions=True)


def _inject_block(
	workspace_name: str,
	block_name: str,
	block_id: str,
	after_id: str | None = None,
) -> str | None:
	if not frappe.db.exists("Workspace", workspace_name):
		return None

	workspace = frappe.get_doc("Workspace", workspace_name)
	rows = [row for row in workspace.custom_blocks if row.custom_block_name != block_name]
	workspace.set("custom_blocks", rows)
	workspace.append("custom_blocks", {"custom_block_name": block_name, "label": block_name})

	try:
		content = json.loads(workspace.content or "[]")
	except (TypeError, json.JSONDecodeError):
		content = []
	content = [
		item
		for item in content
		if item.get("id") != block_id
		and item.get("data", {}).get("custom_block_name") != block_name
	]
	new_item = {
		"id": block_id,
		"type": "custom_block",
		"data": {"custom_block_name": block_name, "col": 12},
	}
	insert_at = next(
		(index + 1 for index, item in enumerate(content) if item.get("id") == after_id),
		len(content),
	) if after_id else len(content)
	content.insert(insert_at, new_item)
	workspace.content = json.dumps(content)
	workspace.save(ignore_permissions=True)
	frappe.clear_document_cache("Workspace", workspace_name)
	return workspace.name


def install_dashboard() -> dict:
	"""Idempotently install RME audit blocks in their owned workspaces."""
	_upsert_block(BLOCK_NAME, HTML, SCRIPT, STYLE)
	_upsert_block(CLINIC_BLOCK_NAME, CLINIC_HTML, CLINIC_SCRIPT, CLINIC_STYLE)
	home = _inject_block(HOME_WORKSPACE, BLOCK_NAME, BLOCK_ID, "rsiaPandanganDirektur")
	clinic = _inject_block(
		CLINIC_WORKSPACE,
		CLINIC_BLOCK_NAME,
		CLINIC_BLOCK_ID,
		"rsiaKlinikHariIni",
	)
	return {
		"block": BLOCK_NAME,
		"workspace": home,
		"clinic_block": CLINIC_BLOCK_NAME,
		"clinic_workspace": clinic,
	}


def setup() -> dict:
	result = install_dashboard()
	frappe.db.commit()
	return result
