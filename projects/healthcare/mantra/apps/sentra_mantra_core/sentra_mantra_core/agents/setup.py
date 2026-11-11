"""Setup kerangka agen — peran, izin, agen asap, blok Chamber.

Idempoten; dijalankan eksplisit (pola app ini):

    bench --site mantra.localhost execute sentra_mantra_core.agents.setup.setup
"""

from __future__ import annotations

import frappe
from frappe.permissions import add_permission, update_permission_property

CHIEF_ROLE = "Sentra Chief"
CARD_DOCTYPE = "Sentra Decision Card"

SMOKE_AGENT_CODE = "SMOKE"
SMOKE_RULE_CODE = "SMOKE-PULSE"


def ensure_chief_role() -> bool:
	if frappe.db.exists("Role", CHIEF_ROLE):
		return False
	frappe.get_doc({"doctype": "Role", "role_name": CHIEF_ROLE, "desk_access": 1}).insert(
		ignore_permissions=True
	)
	return True


def ensure_permissions() -> None:
	"""Chief boleh membaca dan memutuskan kartu; visibilitas per kartu tetap
	disaring `audience_role` lewat hooks permission_query_conditions."""
	if not frappe.db.exists(
		"Custom DocPerm", {"parent": CARD_DOCTYPE, "role": CHIEF_ROLE, "permlevel": 0}
	):
		add_permission(CARD_DOCTYPE, CHIEF_ROLE, permlevel=0)
	update_permission_property(CARD_DOCTYPE, CHIEF_ROLE, 0, "write", 1)


def ensure_smoke_agent() -> str:
	"""Agen asap: tanpa read_scope, satu aturan, satu kartu per eksekusi."""
	if frappe.db.exists("Sentra Agent Definition", SMOKE_AGENT_CODE):
		return SMOKE_AGENT_CODE
	agent = frappe.new_doc("Sentra Agent Definition")
	agent.agent_code = SMOKE_AGENT_CODE
	agent.agent_name = "Agen Uji Pipeline"
	agent.domain = "Kerangka"
	agent.enabled = 1
	agent.schedule = "Harian"
	agent.run_time = "05:30:00"
	agent.max_cards_per_run = 1
	agent.audience_role = CHIEF_ROLE
	agent.append(
		"rules",
		{
			"rule_code": SMOKE_RULE_CODE,
			"description": "Menerbitkan satu kartu uji untuk membuktikan pipeline Chamber.",
			"handler_path": "sentra_mantra_core.agents.detectors.smoke.smoke_pulse",
			"threshold_value": 1,
			"threshold_unit": "Jumlah",
			"severity": "Informasi",
			"enabled": 1,
		},
	)
	agent.insert(ignore_permissions=True)
	return agent.name


# Spesifikasi §8. Perhatikan yang TIDAK ada: Employee, Salary Slip, Patient,
# Sales Invoice. Agen Farmasi secara struktural buta terhadap data karyawan dan
# pasien; melebarkan daftar ini adalah keputusan arsitektural, bukan perbaikan.
PHARMACY_READ_SCOPE = (
	("Item", "Master obat dan alkes"),
	("Bin", "Saldo per gudang"),
	("Stock Ledger Entry", "Mutasi masuk dan keluar"),
	("Stock Reconciliation", "Hasil opname fisik"),
	("Material Request", "Permintaan pembelian"),
	("Purchase Order", "Pesanan pembelian"),
	("Purchase Receipt", "Penerimaan barang"),
	("Purchase Invoice", "Tagihan pembelian"),
	("Supplier", "Rekanan pemasok"),
	("Sentra Formulary Item", "Master formularium zat aktif"),
)

# Ambang rekomendasi §7, seluruhnya data yang dapat Chief ubah lewat antarmuka
# tanpa penerapan ulang kode.
PHARMACY_RULES = (
	{
		"rule_code": "PHR-PO-THRESHOLD",
		"description": "Pesanan pembelian menunggu persetujuan di atas nilai tertentu.",
		"handler_path": "sentra_mantra_core.agents.detectors.pharmacy.po_awaiting_approval",
		"threshold_value": 2_000_000,
		"threshold_unit": "IDR",
		"severity": "Perlu Keputusan",
		"enabled": 1,
	},
	{
		"rule_code": "PHR-STOCK-VARIANCE",
		"description": "Selisih opname fisik terhadap catatan, dalam rupiah atau persentase.",
		"handler_path": "sentra_mantra_core.agents.detectors.pharmacy.stock_variance",
		"threshold_value": 1_000_000,
		"threshold_unit": "IDR",
		"threshold_secondary": 5,
		"threshold_secondary_unit": "Persen",
		"severity": "Perlu Tinjauan",
		"enabled": 1,
	},
	{
		"rule_code": "PHR-SLOW-MOVING",
		"description": "Persediaan tanpa mutasi keluar melewati periode, di atas nilai lantai.",
		"handler_path": "sentra_mantra_core.agents.detectors.pharmacy.slow_moving_stock",
		"threshold_value": 90,
		"threshold_unit": "Hari",
		"threshold_secondary": 5_000_000,
		"threshold_secondary_unit": "IDR",
		"severity": "Perlu Tinjauan",
		"enabled": 1,
	},
	{
		"rule_code": "PHR-SUBSTITUTE-AVAILABLE",
		"description": (
			"Zat aktif sama tersedia di gudang untuk permintaan pembelian obat — "
			"Mendesak bila alasannya stok kosong, Perlu Tinjauan bila tidak."
		),
		"handler_path": "sentra_mantra_core.agents.detectors.pharmacy.substitute_available",
		"threshold_value": 0,
		"threshold_unit": "Jumlah",
		# Nilai bawaan; detektor selalu menetapkan tingkat per temuan
		# (Mendesak/Perlu Tinjauan) sehingga kolom ini praktis tidak dipakai —
		# lihat pharmacy.py:_substitute_finding.
		"severity": "Mendesak",
		"enabled": 1,
	},
)

PHARMACY_AGENT_CODE = "PHARMACY"


def ensure_pharmacy_agent() -> str:
	"""Agen Farmasi. Definisi yang sudah ada tidak ditimpa — ambang yang Chief
	ubah lewat antarmuka harus menang atas nilai bawaan di kode."""
	if frappe.db.exists("Sentra Agent Definition", PHARMACY_AGENT_CODE):
		return PHARMACY_AGENT_CODE
	agent = frappe.new_doc("Sentra Agent Definition")
	agent.agent_code = PHARMACY_AGENT_CODE
	agent.agent_name = "Agen Farmasi & Rantai Pasok"
	agent.domain = "Farmasi"
	agent.enabled = 1
	agent.schedule = "Harian"
	agent.run_time = "05:30:00"
	agent.max_cards_per_run = 3
	agent.audience_role = CHIEF_ROLE
	for source_doctype, reason in PHARMACY_READ_SCOPE:
		agent.append("read_scope", {"source_doctype": source_doctype, "reason": reason})
	for rule in PHARMACY_RULES:
		agent.append("rules", rule)
	agent.insert(ignore_permissions=True)
	return agent.name


def setup() -> None:
	from sentra_mantra_core import chamber_desk

	created_role = ensure_chief_role()
	ensure_permissions()
	agent = ensure_smoke_agent()
	pharmacy = ensure_pharmacy_agent()
	chamber_desk.install_block()
	frappe.db.commit()
	print(
		f"Kerangka agen siap — peran {CHIEF_ROLE} baru: {created_role}; "
		f"agen: {agent}, {pharmacy}; blok Chamber terpasang."
	)
