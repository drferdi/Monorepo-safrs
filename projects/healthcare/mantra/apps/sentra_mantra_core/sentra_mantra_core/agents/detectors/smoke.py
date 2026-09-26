"""Agen asap (`SMOKE`) — membuktikan pipeline tanpa menyentuh data nyata.

`read_scope` agen SMOKE sengaja kosong dan detektor ini tidak melakukan satu
pun kueri. Yang dibuktikan adalah jalur runner -> izin tindakan -> kontrak ->
kartu -> Chamber, bukan kemampuan deteksinya. Detektor domain (farmasi, klaim,
keuangan, operasional, tata kelola, kepatuhan, mutu) adalah tahap berikutnya.
"""

from __future__ import annotations

SUBJECT = "pipeline"


def smoke_pulse(ctx, rule) -> list[dict]:
	findings = int(rule.threshold_value or 1)
	return [
		{
			"subject": SUBJECT,
			"title": "Uji jalur Chamber — kerangka agen berjalan utuh",
			"trigger_explanation": (
				f"Dipicu karena aturan uji {rule.rule_code} selalu melaporkan "
				f"{findings} temuan, dengan ambang {findings} {rule.threshold_unit}."
			),
			"evidence": [
				{
					"label": "Temuan uji",
					"value": str(findings),
					"raw_value": float(findings),
					"source_doctype": "Sentra Agent Rule",
					"source_name": rule.rule_code,
					"tone": "Netral",
				},
				{
					"label": "DocType yang boleh dibaca agen ini",
					"value": str(len(ctx.read_scope)),
					"raw_value": float(len(ctx.read_scope)),
					"source_doctype": "Sentra Agent Definition",
					"source_name": ctx.agent_code,
					"tone": "Netral",
				},
			],
			"options": [
				{"label": "Tutup kartu", "handler": "close_card", "is_primary": 1},
				{
					"label": "Tunda dan minta klarifikasi",
					"handler": "defer_card",
					"requires_note": 1,
				},
			],
		}
	]
