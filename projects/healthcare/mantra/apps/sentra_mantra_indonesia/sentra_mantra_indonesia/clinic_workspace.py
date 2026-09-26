"""Layout workspace Pasien & Klinik — permukaan manajemen RS.

Blok Klinik (operasi lokal) dan extract RME dikeluarkan dari konten;
yang tampil di atas = Manajemen RSIA saja.

	bench --site mantra.localhost execute sentra_mantra_indonesia.clinic_workspace.apply
"""

from __future__ import annotations

import json

import frappe

WORKSPACE = "Pasien & Klinik"

# Urutan kanonik blok yang tetap di konten (atas → bawah).
BLOCK_ORDER = ("Manajemen RSIA",)

# Dikeluarkan dari konten workspace (blok HTML tetap ada di Custom HTML Block).
HIDE_FROM_CONTENT = frozenset(
	{
		"Klinik Hari Ini RSIA",
		"Jumlah Pasien RME",
		"Status Extract RME",
	}
)


def _is_clinic_block(block: dict) -> bool:
	return block.get("type") == "custom_block" and bool(
		(block.get("data") or {}).get("custom_block_name")
	)


def _block_name(block: dict) -> str:
	return (block.get("data") or {}).get("custom_block_name") or ""


def apply() -> dict:
	"""Idempoten: susun ulang custom_block di konten Workspace Pasien & Klinik."""
	if not frappe.db.exists("Workspace", WORKSPACE):
		return {"workspace": WORKSPACE, "ok": False, "reason": "missing"}

	ws = frappe.get_doc("Workspace", WORKSPACE)
	content = json.loads(ws.content or "[]")

	kept_other = []
	clinic_blocks = {}
	for block in content:
		if not _is_clinic_block(block):
			kept_other.append(block)
			continue
		name = _block_name(block)
		if name in HIDE_FROM_CONTENT:
			continue
		clinic_blocks[name] = block

	ordered = []
	for name in BLOCK_ORDER:
		if name in clinic_blocks:
			ordered.append(clinic_blocks.pop(name))
	for name in sorted(clinic_blocks):
		ordered.append(clinic_blocks[name])

	ws.content = json.dumps(ordered + kept_other)
	ws.save()
	frappe.clear_document_cache("Workspace", WORKSPACE)
	frappe.db.commit()
	return {
		"workspace": WORKSPACE,
		"ok": True,
		"order": [_block_name(b) for b in ordered],
		"hidden": sorted(HIDE_FROM_CONTENT),
	}
