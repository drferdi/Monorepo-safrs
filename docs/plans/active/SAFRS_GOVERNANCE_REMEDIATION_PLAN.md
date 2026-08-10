# SAFRS Governance Remediation Plan

**Goal:** Menutup gap governance yang ditemukan pada audit SAFRS v1.1 tanggal 2026-08-11 (Phase 1 struktur, Phase 2 perbandingan vs dokumen SEN-001, Phase 3 pemetaan 8 fitur golden-path) tanpa melemahkan kontrol yang sudah berfungsi.

**Current state:** ACTIVE (baru dibuat, 0 dari 19 item selesai)
**Repository:** `D:\DEV\Monorepo`
**Risk:** Campuran R0–R2, dirinci per fase di bawah.
**Declared conformance saat ini:** SAFRS Core (dokumen rencana ini sendiri tidak mengubah level; Fase 1–2 di bawah adalah prasyarat untuk mengklaim Controlled).
**Sumber:** Audit SAFRS v1.1 2026-08-11 (Phase 1 struktur repo, Phase 2 perbandingan terhadap SEN-001 "SAFRS v1.1 — Strategic Introduction", Phase 3 verifikasi 8 fitur golden-path).

## Relasi dengan rencana lain

`docs/superpowers/plans/2026-08-11-solo-dev-dx-friction-fixes.md` sudah ada (belum dieksekusi, 0/10 task selesai) dan menutup 9 titik friksi DX secara terpisah — seluruhnya R1, dan secara eksplisit **tidak menyentuh** `packages/`, `projects/`, `.safrs/`, atau `.github/workflows/`. Rencana itu sudah mencakup perluasan `.env.example` per capability pack (Task 9) — **jangan duplikasi item itu di sini**; jalankan rencana DX tersebut secara terpisah/paralel bila Chief setuju.

Rencana ini (governance remediation) mengambil bagian yang sengaja **di luar** cakupan rencana DX: L5/CODEOWNERS/branch-protection, enforcement mekanis single-mutation-owner, dan tiga keputusan yang butuh konfirmasi eksplisit Chief (Fitur #7 auto-merge, Fitur #5 capability pack, housekeeping file sisa audit).

---

## Fase 0 — Housekeeping (R0, aksi Chief di mesin asli — sandbox audit tidak punya izin unlink)

- [ ] Hapus `packages/env/src/__audit_test.mjs` dan 8 file `_tmp_17_*`/`_tmp_18_*`/`_tmp_3_*`/`_tmp_73_*` di root (sisa dari sesi verifikasi Phase 3, semua 0 byte, untracked, tidak berbahaya).
- [ ] Baca dan putuskan status `.github/CODEOWNERS` dan `docs/governance/PLATFORM_ACTIVATION.md` — keduanya untracked. `PLATFORM_ACTIVATION.md` belum pernah saya baca isinya di audit ini; sebelum commit, pastikan isinya bukan draft yang belum siap.
- [ ] Konfirmasi 2 commit yang sudah *ahead of* `origin/main` memang sengaja belum di-push, atau push jika sudah siap.

**Exit:** `git status --porcelain` bersih (tidak ada untracked file selain yang sengaja belum di-commit dengan alasan jelas).

---

## Fase 1 — L5 Human Authority: CODEOWNERS & Branch Protection (Prioritas tertinggi, R2)

Ini gap paling material dari Phase 2: model R2/R3 di `SAFRS_SPEC.md` mengasumsikan review manusia wajib sebelum merge, tapi mekanisme yang memaksanya (GitHub CODEOWNERS + branch protection) belum hidup. **Saya tidak punya akses GitHub API tersambung di sesi ini** (plugin GitHub belum diautentikasi) — Fase ini didominasi aksi manual Chief. Saya bisa membantu menyusun konten/perintah, tapi eksekusi di GitHub admin settings harus Chief.

- [ ] Buat tim GitHub sungguhan yang menggantikan placeholder `@sentra/safrs-maintainers` di `.github/CODEOWNERS` (atau ganti ke username individu Chief bila belum ada tim).
- [ ] Update `.github/CODEOWNERS` dengan handle nyata (file ini sudah berisi pattern R2/verification-control/R3 yang benar dari `sensitive-paths.json` — hanya ownernya yang placeholder).
- [ ] Nyalakan branch protection pada `main`: require pull request before merge, require status check `SAFRS Governance` (dari `safrs-governance.yml`) dan `CI` (dari `ci.yml`), require review from Code Owners, disable force-push.
- [ ] Jalankan `bash scripts/safrs-verify.sh` setelah `.github/CODEOWNERS` di-commit — script ini akan mengklasifikasikan ulang perubahan CODEOWNERS sebagai R2 secara otomatis (sudah terverifikasi di audit).
- [ ] Update `docs/governance/SAFRS_CONFORMANCE.md` untuk menaikkan klaim dari Core ke Controlled **hanya setelah** branch protection benar-benar aktif dan terverifikasi (screenshot/`gh api` output sebagai bukti, bukan asumsi).

**Exit:** PR yang menyentuh path R2/R3 benar-benar diblokir GitHub sampai code owner approve — dibuktikan dengan PR uji coba nyata, bukan hanya konfigurasi.

---

## Fase 2 — Single-Mutation-Owner: dari Kebijakan ke Mekanisme (R1–R2)

PDF SEN-001 menyebut aturan ini sebagai satu dari lima mekanisme inti SAFRS, tapi di repo baru berupa prosa di `SAFRS_MULTI_AGENT_PROTOCOL.md`. Usulan implementasi minimal, sesuai prinsip P10 "simplicity is a control" (jangan bangun sistem lock terdistribusi yang rumit untuk repo solo-dev):

- [ ] Tambahkan file penanda task aktif yang mekanis-dicek, mis. `.safrs/active-tasks.json` (daftar task_id, scope glob, status, owner) — **ini file governance baru**, klasifikasi R2 karena masuk kategori `.safrs/**`, butuh review Chief sebelum merge.
- [ ] Tambahkan checker `tools/safrs/check_task_ownership.py` yang menolak commit/PR bila dua task berstatus `EXECUTING` memiliki scope glob yang tumpang tindih.
- [ ] Daftarkan checker baru ini ke `scripts/safrs-verify.sh` dan `safrs-governance.yml` (perubahan pada verification-control file — otomatis R2 per aturan `check_sensitive_changes.py`, review wajib).
- [ ] Tambahkan test governance baru di `tests/governance/` yang menguji checker ini (pola sama seperti `test_sensitive_classification.py`).

**Catatan:** untuk repo solo-developer dengan satu agent aktif pada satu waktu, urgensi Fase ini lebih rendah daripada Fase 1 — relevan terutama jika Chief berencana menjalankan >1 agent AI paralel di repo yang sama. Saya sarankan Chief konfirmasi prioritas ini sebelum saya implementasikan, karena ini menambah file baru ke `.safrs/**` (R2).

**Exit:** dua task tiruan dengan scope tumpang tindih gagal lulus `pnpm governance` sampai salah satu ditutup.

---

## Fase 3 — Verifikasi Live yang Tidak Bisa Dilakukan dari Sandbox Audit (R0, aksi Chief di mesin sendiri)

Fitur golden-path #1, #3, #4 terklasifikasi `EXISTS_BUT_INCOMPLETE` murni karena sandbox audit ini tidak punya toolchain Linux native yang cocok dan tidak punya Docker — bukan karena kode bermasalah (lihat bukti pembacaan kode di audit §10).

- [ ] Jalankan `pnpm check` penuh (`governance && lint && typecheck && test && build`) di mesin Windows Chief. Kirim/simpan output sebagai bukti Fitur #1.
- [ ] Jalankan `git commit` kecil untuk mengukur waktu nyata pre-commit hook Biome (klaim "<100ms"). Bukti Fitur #3.
- [ ] Jalankan `pnpm dev` (menyalakan Docker Postgres via `compose.yaml`), lalu `pnpm db:seed` dan `pnpm db:studio`. Bukti Fitur #4.

**Exit:** ketiga fitur naik status dari `EXISTS_BUT_INCOMPLETE` ke `EXISTS_AND_VERIFIED` dengan bukti command nyata dari mesin Chief.

---

## Fase 4 — Keputusan: Fitur #7 Auto-Merge Renovate (R2, blocked menunggu keputusan Chief)

Konflik langsung antara permintaan Fitur #7 dan (a) Aturan Penting Chief sendiri di awal tugas ini, (b) invariant SAFRS-02, (c) `renovate.json` yang sengaja `automerge: false`. **Saya tidak akan mengubah `renovate.json` tanpa pilihan eksplisit Chief.**

- [ ] Chief pilih satu: (a) automerge terbatas ke patch/minor non-sensitif, (b) automerge penuh sesuai permintaan literal, (c) pertahankan `automerge: false`.
- [ ] Jika (a) atau (b) dipilih: saya tambahkan `packageRules` yang sesuai di `renovate.json` — ini R2 (verification-control file), butuh review Chief sebelum merge meski saya yang menulis diff-nya.

**Exit:** `renovate.json` mencerminkan keputusan eksplisit Chief, bukan asumsi saya.

---

## Fase 5 — Keputusan: Fitur #5 Email/Stripe Dev Server (R1–R2, blocked menunggu keputusan Chief)

Saat ini `MISSING` — hanya manifest `tools/capabilities/manifests/email.json` dan `stripe.json` yang mendeklarasikan capability pack, belum diinstal.

- [ ] Chief konfirmasi: aktifkan sekarang (instal `react-email`/`resend` dan `stripe`, tambah script `dev:email`/`stripe:listen`) atau biarkan sebagai capability pack opsional untuk nanti.
- [ ] Jika diaktifkan: ini penambahan dependency baru → R2 per `SAFRS_SPEC.md` §7 ("new dependency" masuk contoh R2) — akan saya tandai untuk review meski dependency-nya kecil.

**Exit:** status Fitur #5 berubah dari `MISSING` menjadi `EXISTS_AND_VERIFIED` (jika diaktifkan) atau tetap `MISSING` dengan alasan tercatat sebagai keputusan sadar, bukan kelalaian.

---

## Fase 6 — Nuansa Dokumentasi (R1, prioritas rendah, `REQUIRES_SPECIFICATION_REVIEW`)

- [ ] Putuskan apakah `SAFRS_SPEC.md` §13 (Document classes: Canonical/Active/Historical/Superseded/Archived) perlu diselaraskan dengan lifecycle dokumen umum di SEN-001 (`DRAFT → ACTIVE → CANONICAL → SUPERSEDED → ARCHIVED`) — khususnya status `DRAFT` yang tidak ada di repo, dan kelas "Historical" yang tidak ada di SEN-001. Ini butuh spesifikasi normatif 5-Paper yang belum tersedia untuk diputuskan secara otoritatif — tandai `REQUIRES_SPECIFICATION_REVIEW` sampai dokumen itu ada.
- [ ] Pertimbangkan apakah 12 file `0X_*.md` root sebaiknya dipisah mana yang benar-benar L1 Constitution (non-negotiable) vs L2 Context (panduan/filosofi) — SEN-001 menekankan konstitusi harus pendek ("under two pages").
- [ ] Tambahkan aturan eksplisit "Tailwind-only, no inline style" ke `AGENTS.md` root jika itu memang konvensi yang berlaku (saat ini hanya tersirat di `projects/golden-path/docs/architecture.md`).

**Exit:** tidak mendesak — bisa dikerjakan kapan saja tanpa risiko fungsional.

---

## Acceptance criteria

- Tidak ada kontrol yang sudah berfungsi (governance checker, CI, pre-commit, reset-guard) yang dilemahkan oleh rencana ini.
- Fase 1 selesai sebelum repo mengklaim conformance level di atas Core.
- Fase 4 dan 5 tidak dieksekusi tanpa keputusan eksplisit Chief yang tercatat (bukan diasumsikan agent).
- Setiap item yang menyentuh `.safrs/**`, `.github/workflows/**`, atau `renovate.json` diperlakukan R2 minimum sesuai `SAFRS_SPEC.md` §12, terlepas dari seberapa kecil diff-nya.
- Rencana ini dipindah ke `docs/plans/completed/` hanya setelah seluruh checkbox di atas selesai atau secara eksplisit di-drop dengan alasan tercatat.
