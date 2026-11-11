"""Impor saldo awal (opening balance) untuk cutover keuangan RSIA Melinda.

Alur (pola sama seperti org_positions.py): isi angka dari lembar finance ke
`OPENING` + `CUTOVER_DATE` di bawah, lalu:

    # cek dulu (read-only, tidak menulis apa pun)
    bench --site mantra.localhost execute sentra_mantra_core.saldo_awal.preview

    # buat Journal Entry opening sebagai DRAFT (docstatus 0 — TIDAK submit;
    # baru posting ke GL saat gate Tahap 2 dibuka + approval)
    bench --site mantra.localhost execute sentra_mantra_core.saldo_awal.apply \
        --kwargs "{'confirm': 'SALDO AWAL'}"

Aman by design:
- `apply` HANYA insert JE draft; tidak pernah submit → GL tetap 0 sampai cutover.
- Akun Receivable/Payable WAJIB punya party (Customer/Supplier) — divalidasi.
- Harus balance (total debit == total credit), atau sediakan `BALANCING_ACCOUNT`
  (mis. Temporary Opening) untuk menyerap selisih.
- Idempoten pada level cek: `preview` bisa dijalankan berkali-kali tanpa efek.

`OPENING` = daftar baris, tiap baris:
    {"account": "<nama akun>", "debit": <rp>, "credit": <rp>,
     "party_type": "Customer"|"Supplier" (opsional), "party": "<nama>" (opsional),
     "cost_center": "<cc>" (opsional)}
Isi salah satu dari debit/credit (> 0), yang lain 0.
"""

import frappe

# --- diisi dari lembar saldo awal finance (kosong sampai angka tersedia) ---
OPENING: list[dict] = []
CUTOVER_DATE: str | None = None  # mis. "2026-08-01" (ditetapkan Direktur)
BALANCING_ACCOUNT: str | None = None  # opsional, mis. "Temporary Opening - MEL"
CONFIRM_PHRASE = "SALDO AWAL"


def _company() -> str:
	company = frappe.defaults.get_global_default("company")
	if not company:
		company = frappe.db.get_value("Company", {}, "name")
	return company


def validate_rows(rows: list[dict], cutover_date: str | None) -> dict:
	"""Read-only: validasi tiap baris tanpa menulis. Kembalikan laporan."""
	issues: list[str] = []
	total_debit = 0.0
	total_credit = 0.0

	if not cutover_date:
		issues.append("CUTOVER_DATE belum diisi (mis. '2026-08-01').")
	elif not frappe.db.exists("Fiscal Year", {
		"year_start_date": ("<=", cutover_date),
		"year_end_date": (">=", cutover_date),
	}):
		issues.append(f"Tidak ada Fiscal Year yang memuat {cutover_date}.")

	if not rows:
		issues.append("OPENING kosong — tidak ada baris saldo awal untuk diproses.")

	for i, r in enumerate(rows, 1):
		acc = r.get("account")
		debit = float(r.get("debit") or 0)
		credit = float(r.get("credit") or 0)
		total_debit += debit
		total_credit += credit

		if not acc or not frappe.db.exists("Account", acc):
			issues.append(f"Baris {i}: akun '{acc}' tidak ada.")
			continue
		acc_row = frappe.db.get_value(
			"Account", acc, ["is_group", "account_type"], as_dict=True
		)
		if acc_row.is_group:
			issues.append(f"Baris {i}: akun '{acc}' adalah grup (tidak bisa diposting).")
		if (debit > 0) == (credit > 0):
			issues.append(f"Baris {i}: isi tepat SATU dari debit/credit (> 0), akun '{acc}'.")
		if acc_row.account_type in ("Receivable", "Payable") and not (
			r.get("party_type") and r.get("party")
		):
			issues.append(
				f"Baris {i}: akun '{acc}' ({acc_row.account_type}) wajib party_type+party."
			)

	diff = round(total_debit - total_credit, 2)
	balanced = diff == 0
	if not balanced and not BALANCING_ACCOUNT:
		issues.append(
			f"Tidak balance: debit {total_debit:,.2f} vs credit {total_credit:,.2f} "
			f"(selisih {diff:,.2f}); sediakan BALANCING_ACCOUNT atau perbaiki angka."
		)

	return {
		"ok": not issues,
		"issues": issues,
		"rows": len(rows),
		"total_debit": total_debit,
		"total_credit": total_credit,
		"balanced": balanced,
		"cutover_date": cutover_date,
	}


def build_opening_je(
	rows: list[dict],
	cutover_date: str,
	balancing_account: str | None = None,
	submit: bool = False,
):
	"""Buat Journal Entry opening. DRAFT by default (submit=False) — TIDAK posting
	ke GL. Validasi dijalankan lebih dulu; raise bila ada issue."""
	report = validate_rows(rows, cutover_date)
	if not report["ok"]:
		frappe.throw("Saldo awal tidak valid:\n- " + "\n- ".join(report["issues"]))

	je = frappe.new_doc("Journal Entry")
	je.voucher_type = "Opening Entry"
	je.is_opening = "Yes"
	je.company = _company()
	je.posting_date = cutover_date
	je.user_remark = "Saldo awal cutover (sentra_mantra_core.saldo_awal)"

	for r in rows:
		je.append("accounts", {
			"account": r["account"],
			"debit_in_account_currency": float(r.get("debit") or 0),
			"credit_in_account_currency": float(r.get("credit") or 0),
			"party_type": r.get("party_type"),
			"party": r.get("party"),
			"cost_center": r.get("cost_center"),
		})

	diff = round(report["total_debit"] - report["total_credit"], 2)
	if diff != 0 and balancing_account:
		je.append("accounts", {
			"account": balancing_account,
			"debit_in_account_currency": -diff if diff < 0 else 0,
			"credit_in_account_currency": diff if diff > 0 else 0,
		})

	je.insert()
	if submit:  # sengaja tidak dipakai untuk saldo awal sampai gate Tahap 2 + GO
		je.submit()
	return je


def preview() -> dict:
	"""Read-only: validasi OPENING/CUTOVER_DATE saat ini."""
	return validate_rows(OPENING, CUTOVER_DATE)


def apply(confirm: str | None = None) -> dict:
	"""Buat JE opening DRAFT dari OPENING. Wajib frasa konfirmasi."""
	if confirm != CONFIRM_PHRASE:
		frappe.throw(f"Konfirmasi salah. Jalankan dengan confirm='{CONFIRM_PHRASE}'.")
	je = build_opening_je(OPENING, CUTOVER_DATE, BALANCING_ACCOUNT, submit=False)
	frappe.db.commit()
	return {"journal_entry": je.name, "docstatus": je.docstatus, "is_opening": je.is_opening}
