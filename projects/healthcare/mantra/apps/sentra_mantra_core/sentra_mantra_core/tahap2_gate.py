"""Gate Tahap 2 — flip doc_status state "Approved" on every posting workflow.

Selama Tahap 1, doc_status Approved sengaja 0 (draft-like) supaya approval
TIDAK pernah submit dokumen ke ledger (lihat CLAUDE.md bench, PRASYARAT
WAJIB Tahap 2). Membuka gate = approval mulai benar-benar posting ke GL.

    # lihat kondisi sekarang (aman, read-only)
    bench --site mantra.localhost execute sentra_mantra_core.tahap2_gate.status

    # buka gate (WAJIB: backup <24 jam + GO Chief; frasa konfirmasi persis)
    bench --site mantra.localhost execute sentra_mantra_core.tahap2_gate.open_gate \
        --kwargs "{'confirm': 'BUKA GATE TAHAP 2'}"

    # rollback ke kondisi Tahap 1
    bench --site mantra.localhost execute sentra_mantra_core.tahap2_gate.close_gate \
        --kwargs "{'confirm': 'BUKA GATE TAHAP 2'}"

Catatan: flip hanya memengaruhi transisi SETELAHNYA. Dokumen yang sudah
berstatus Approved saat gate dibuka tetap draft (docstatus 0) — kolom
`approved_masih_draft` pada status() menghitungnya; dokumen tsb. perlu
di-approve ulang (atau ditangani manual) agar masuk ledger.
"""

import os
import time

import frappe

CONFIRM_PHRASE = "BUKA GATE TAHAP 2"
WORKFLOWS = (
	"Sentra Purchase Order Approval",
	"Sentra Payment Entry Approval",
	"Sentra Journal Entry Approval",
	"Sentra Material Request Approval",
	"Sentra Expense Claim Approval",
	"Sentra Purchase Invoice Approval",
)
BACKUP_MAX_AGE_HOURS = 24


def status():
	"""Read-only: doc_status state Approved per workflow + dokumen yang sudah
	Approved tapi masih draft (tidak ikut ter-submit oleh flip)."""
	rows = []
	for wf in WORKFLOWS:
		doctype = frappe.db.get_value("Workflow", wf, "document_type")
		if not doctype:
			rows.append(
				{
					"workflow": wf,
					"document_type": None,
					"doc_status": None,
					"approved_masih_draft": None,
					"missing": True,
				}
			)
			continue
		rows.append(
			{
				"workflow": wf,
				"document_type": doctype,
				"doc_status": frappe.db.get_value(
					"Workflow Document State", {"parent": wf, "state": "Approved"}, "doc_status"
				),
				"approved_masih_draft": frappe.db.count(
					doctype, {"docstatus": 0, "workflow_state": "Approved"}
				),
				"missing": False,
			}
		)
	return {"workflows": rows, "gate_terbuka": all(str(r["doc_status"]) == "1" for r in rows)}


def _latest_backup_age_hours():
	path = frappe.utils.get_site_path("private", "backups")
	newest = 0
	try:
		for f in os.listdir(path):
			if f.endswith("-database.sql.gz"):
				newest = max(newest, os.path.getmtime(os.path.join(path, f)))
	except OSError:
		return None
	if not newest:
		return None
	return (time.time() - newest) / 3600


def _set_doc_status(value, confirm, commit):
	if confirm != CONFIRM_PHRASE:
		frappe.throw(f"Konfirmasi salah. Jalankan dengan confirm='{CONFIRM_PHRASE}'.")
	changed = []
	for wf in WORKFLOWS:
		doc = frappe.get_doc("Workflow", wf)
		for state in doc.states:
			if state.state == "Approved" and str(state.doc_status) != str(value):
				state.doc_status = str(value)
				changed.append(wf)
		doc.save()
	frappe.clear_cache()
	if commit:
		frappe.db.commit()
	return changed


def open_gate(confirm=None, commit=True, check_backup=True):
	"""Flip Approved -> doc_status 1 (submit ke ledger) pada ketiga workflow."""
	if check_backup:
		age = _latest_backup_age_hours()
		if age is None or age > BACKUP_MAX_AGE_HOURS:
			frappe.throw(
				"Tidak ada backup database dalam "
				f"{BACKUP_MAX_AGE_HOURS} jam terakhir. Jalankan "
				"`bench --site mantra.localhost backup --with-files` dulu "
				"(lihat docs/operations/backup-restore.md)."
			)
	changed = _set_doc_status(1, confirm, commit)
	return {"changed": changed, **status()}


def close_gate(confirm=None, commit=True):
	"""Rollback: Approved kembali doc_status 0 (draft-like, kondisi Tahap 1)."""
	changed = _set_doc_status(0, confirm, commit)
	return {"changed": changed, **status()}
