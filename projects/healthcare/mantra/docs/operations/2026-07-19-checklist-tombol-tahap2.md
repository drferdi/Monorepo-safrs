# Checklist "Tombol Tahap 2" — Buka Gate GL

> **Tugas C4** (lane Claude). Prosedur satu halaman untuk membuka gate Tahap 2:
> flip `doc_status` state `Approved` 0→1 pada ketiga workflow Sentra sehingga
> approval mulai benar-benar posting ke General Ledger.
> Tooling: `sentra_mantra_core/tahap2_gate.py`. Semua perintah dijalankan **di
> dalam `.devcontainer/`** (bench container-only).
>
> **KELAS C — butuh GO eksplisit Chief.** Ini operasi ber-blast-radius tertinggi
> di sistem: setelah dibuka, approval memicu posting ledger yang tak bisa
> di-"unpost" tanpa jurnal balik. Jangan jalankan `open_gate` tanpa langkah 1–3
> di bawah tuntas.

## 0. Konteks singkat

Selama Tahap 1, `doc_status` state `Approved` sengaja **0** (draft-like) supaya
approval tidak pernah men-submit dokumen ke ledger. Membuka gate = mengubahnya
ke **1** pada ketiga workflow:

- `Sentra Purchase Order Approval`
- `Sentra Payment Entry Approval`
- `Sentra Journal Entry Approval`

## 1. Prasyarat (WAJIB sebelum flip)

- [ ] **GO eksplisit Chief** untuk gate Tahap 2 (tercatat di `.agent/HANDOFF.md`).
- [ ] **Backup database ≤ 24 jam.** `open_gate()` **menolak jalan** (`frappe.throw`)
      bila tidak ada backup `*-database.sql.gz` dalam 24 jam terakhir di
      `sites/mantra.localhost/private/backups`. Buat dulu:
      ```bash
      bench --site mantra.localhost backup --with-files
      ```
- [ ] **Salinan backup off-machine** sudah dibuat (di luar mesin dev). Ini
      syarat operasional Chief, bukan yang di-enforce kode — tetap wajib.
- [ ] **Frasa konfirmasi persis** disiapkan: `BUKA GATE TAHAP 2` (tanpa frasa ini
      `open_gate`/`close_gate` menolak jalan).

## 2. Run the financial cutover preflight (read-only)

Run the complete readiness check before inspecting or opening the gate:

```bash
bench --site mantra.localhost execute \
    sentra_mantra_core.financial_cutover.preflight
```

- [ ] Stop unless `ok: true`.
- [ ] Record every item in `blocking` and assign an owner before retrying.
- [ ] Confirm `opening_balance.cutover_date` matches the Director-approved
      cutover date.
- [ ] Confirm the required Company, postable accounts, cost centers, warehouses,
      cash/bank accounts, modes of payment, and active Finance role assignments
      are represented in `counts`.
- [ ] Treat every item in `warnings` as an explicit cutover review item.

`preflight()` is read-only. It does not create a Journal Entry, change a
Workflow, or write a GL Entry.

## 3. Cek kondisi sekarang (read-only, aman)

```bash
bench --site mantra.localhost execute sentra_mantra_core.tahap2_gate.status
```

Harapkan (kondisi Tahap 1): `doc_status = 0` di ketiga workflow dan
`gate_terbuka: false`. Catat juga `approved_masih_draft` per workflow (lihat §4).

## 4. Buka gate (flip 0→1)

```bash
bench --site mantra.localhost execute sentra_mantra_core.tahap2_gate.open_gate \
    --kwargs "{'confirm': 'BUKA GATE TAHAP 2'}"
```

- `open_gate` menjalankan kembali `status()` dan mengembalikan `changed` (daftar
  workflow yang benar-benar berubah) + snapshot status baru.
- Bila backup > 24 jam → perintah gagal dengan pesan jelas (buat backup dulu, §1).

## 5. Verifikasi pasca-flip

- [ ] `status()` menunjukkan `doc_status = 1` di **ketiga** workflow dan
      `gate_terbuka: true`.
- [ ] **Gotcha `approved_masih_draft`:** flip hanya memengaruhi transisi
      **setelahnya**. Dokumen yang **sudah** berstatus `Approved` saat gate dibuka
      **tetap draft** (`docstatus 0`) — TIDAK otomatis ter-submit ke ledger.
      Kolom `approved_masih_draft` pada `status()` menghitungnya. Bila > 0,
      dokumen tersebut perlu **di-approve ulang** (atau ditangani manual) agar
      masuk GL.
- [ ] Uji satu transaksi dummy end-to-end (mis. Journal Entry kecil) untuk
      memastikan approval kini menghasilkan GL Entry, lalu batalkan/jurnal-balik.
- [ ] Run the aggregate post-cutover reconciliation using the actual
      Director-approved cutover date:
      ```bash
      bench --site mantra.localhost execute \
          sentra_mantra_core.financial_cutover.reconcile \
          --kwargs "{'as_of_date': '<YYYY-MM-DD>'}"
      ```
- [ ] Stop unless `gl_difference` is zero and every entry in `unreconciled`
      has an owner, due date, and documented resolution.
- [ ] Confirm `source_documents` contains only submitted, non-cancelled source
      vouchers. Never copy party or patient data into the cutover record.

## 6. Rollback ke kondisi Tahap 1

Mengembalikan `Approved` ke `doc_status 0` (draft-like):

```bash
bench --site mantra.localhost execute sentra_mantra_core.tahap2_gate.close_gate \
    --kwargs "{'confirm': 'BUKA GATE TAHAP 2'}"
```

Catatan: rollback flip **tidak** menghapus GL Entry yang sudah terlanjur ter-post
oleh approval antara open→close. GL Entry yang sudah ada di-reverse lewat
pembatalan/jurnal balik dokumen sumber, bukan lewat `close_gate`. Kalau ragu,
restore dari backup §1 (lihat `docs/operations/backup-restore.md`).

## Ringkas urutan

1. GO Chief + backup ≤24 jam + salinan off-machine + frasa konfirmasi.
2. `financial_cutover.preflight` → stop unless `ok:true`.
3. `status` (read-only) → pastikan masih `0` / `gate_terbuka:false`.
4. `open_gate` dengan `confirm='BUKA GATE TAHAP 2'`.
5. Verifikasi `gate_terbuka:true`; tangani `approved_masih_draft > 0`; uji 1 transaksi.
6. Run `financial_cutover.reconcile` for the approved cutover date.
7. Bila perlu batal: `close_gate` (+ balik GL manual / restore backup).
