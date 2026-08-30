# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.
> **BINDING: read `.agents/BOUNDARIES.md` first — no push/publish/visibility change without an explicit Chief order in YOUR session; other sessions' local commits are off-limits.**

Last updated: 2026-08-26 (backlog untracked ter-commit; task ownership hijau)

## Current state

- **Memori capsule Kediri kini punya rumahnya sendiri:**
  `projects/product/kediri-history/.agents/` (dibuat 2026-08-26 atas perintah Chief) memuat
  HANDOFF, BOUNDARIES (G01-G05), PROGRESS (papan fase kanonik), DECISIONS, dan `knowledge/`
  (integritas historis, kontrak motion, lingkungan, jebakan). Papan fase Kediri **hanya**
  hidup di sana; berkas ini dan README capsule menarasikan, tidak menduplikasi. Tanpa
  `skills/` - standar authoring tetap milik root dan bukan dependensi capsule (G04).
- **Sesi Kediri (TASK-20260826-KEDIRI-PHASE01, R2; TASK-20260826-KEDIRI-HANDOFF, R1):**
  Status fase kanonik: `projects/product/kediri-history/.agents/PROGRESS.md` (jangan salin
  angkanya ke sini). Ringkasnya: fondasi sampai bukti browser selesai, aset final dan
  performa belum, deployment menunggu Chief. Dieksekusi atas
  perintah Chief (keputusan G01-G05 lalu perintah end-to-end, 2026-08-26). Capsule `projects/product/kediri-history` kini aplikasi utuh:
  14 koleksi Payload dengan RBAC/draf/versi, gerbang publikasi yang dapat dieksekusi,
  tiga irisan vertikal yang sudah ditinjau, Arsip publik, Explore, Journey semantik dengan
  anchor stabil, overlay Timeline, fondasi GSAP + tiga koreografi hero, varian responsif dan
  reduced motion, serta `verify:production`.
  Bukti: 51 unit test, 32 e2e (desktop+mobile), token gate 34 pemeriksaan kontras,
  `verify:production` 0 kegagalan kritis, build 20 rute,
  `project-standalone verify product/kediri-history` = **PASS** penuh.
  Batas: tidak ada citra historis yang dikirim (akuisisi institusional belum dilakukan),
  klaim 1869 sengaja tertahan di needs_review, dan tidak ada remote/deploy yang dibuat.
  **SENTRA-GSAP FAIL (historis)** — gate sentra:gsap:qa/verify tidak pernah dijalankan;
  standar Sentra-GSAP dicabut 2026-08-28, diganti skill GSAP resmi (`.claude/skills/gsap-*`,
  router `/gsap`). Motion tetap tidak disebut production-ready sampai diverifikasi ulang.
  **Infra nyata (2026-08-26, Chief menyalakan Docker):** seluruh rantai dijalankan ulang di
  atas PostgreSQL 18.6 dan MinIO dari `infra/docker-compose.yml`, dari basis data kosong:
  migrate, seed, `verify:production` (12 record, 0 kritis), lint, typecheck, 51 unit test,
  build 20 rute, 32 e2e, deploy dry-run, dan `project-standalone verify` = PASS penuh.
  Adapter S3 terbukti menulis ke MinIO dan batas hak nyata di lapisan objek: derivatif publik
  anonim 200, master arsip 403, dan hapus record juga menghapus objek (tanpa yatim). Fixture
  teknisnya dihapus dan basis data disemai ulang bersih.
  **Cacat yang ditemukan dan diperbaiki:** `infra/docker-compose.yml` tidak pernah bisa start —
  image `postgres:18` menuntut mount di `/var/lib/postgresql`, bukan `/var/lib/postgresql/data`.
  Tidak terlihat sebelumnya karena Docker belum pernah berjalan. Sudah diperbaiki dan diuji.
  **Jebakan berulang:** `next build` tidak membersihkan `.next/dev/`, jadi satu `pnpm dev` di
  sesi lampau membuat standalone verify gagal karena symlink; `rm -rf apps/web/.next` sebelum
  verify adalah wajib (tercatat di `docs/testing.md`). PGlite tetap fallback sah bila Docker
  tidak tersedia, tetapi bukan lagi satu-satunya bukti.
- **Backlog untracked sudah habis (Chief, 2026-08-26).** Tiga commit di `main` lokal:
  `af60d9c` capsule Kediri + memori `.agents/` (192 berkas), `31027ea` instalasi Sentra-GSAP
  (35), `3140872` deployment Avery (14). Working tree bersih. Chief menjalankan dua commit
  terakhir sendiri karena classifier auto-mode menolak sesi agen menyentuh path itu.
  Akibatnya **`check_task_ownership` kini OK** — 49 path tak bertuan itu hilang, dan klaim basi
  `TASK-20260821-SENTRABOT-WORKSPACE-CATALOG-OWNERSHIP` tidak lagi menghalangi apa pun.
- **Satu-satunya check SAFRS yang masih merah:** `check_sensitive_changes` (17 dari 18 PASS).
  Sebabnya tidak berubah dan bukan dari commit hari ini: bukti review integritas terikat basis
  lama `d92a246`, sedangkan basis diff kini `5b6b808` pasca-rewrite origin 2026-08-25. Karena
  riwayat lokal dan origin tak berkerabat, seluruh riwayat terhitung satu change-set, sehingga
  verification controls dan implementasi selalu tampak berubah bersamaan.
  **Keputusan Chief yang dibutuhkan:** stempel ulang bukti review integritas terhadap basis
  `5b6b808`, atau repoint `review_base_ref`. Agen yang menulis kodenya tidak boleh menstempel
  reviewnya sendiri.

- **Sesi audit (TASK-20260825-AUDIT-REMEDIATION, R2):** audit penuh vs SAFRS v1.1 selesai;
  remediasi keputusan Chief dieksekusi: precommit test yatim dihapus, 4 dokumen governance
  disahkan CANONICAL + registry + routing regenerate, aturan trailer atribusi (#12) masuk
  `AGENTS.md`, evidence integritas distempel ulang oleh Chief (base `d92a246`).
- Change-set besar (±259 file, termasuk kerja sesi-sesi sebelumnya) telah di-commit ke `main`
  lokal atas perintah Chief — sebagian oleh sesi paralel (s.d. `06261c5`), sisa 4 file oleh
  sesi audit. Catatan tabrakan: sesi paralel meng-commit scope yang sedang dimiliki task
  audit; hasil sejalan perintah Chief, insiden dicatat untuk ledger.
- Verifikasi governance penuh: PASS (lihat commit evidence terakhir).
- **Blocker eksternal:** branch protection tidak bisa aktif — repo private di GitHub Free
  (butuh Pro; public dilarang: PII di riwayat). Menunggu keputusan billing Chief.
- Belum di-push (pre-push gate `CHIEF_PUSH_OK` tetap berlaku).

- **Capsule gate baru (Chief, 2026-08-25):** pre-push kini memblokir push yang range
  keluarnya menyentuh `projects/**` (override sadar `CHIEF_PUSH_PROJECTS_OK=1`);
  aturan tercatat di `.agents/BOUNDARIES.md` §1. Fakta: `origin/main` lama sudah
  memuat `projects/**` — pembersihan butuh history rewrite atas perintah Chief.

- **Origin di-rewrite (Chief, 2026-08-25):** repo public; riwayat origin dibersihkan
  (projects/** dihapus total, PII diredaksi), force-push `main` @ `5b6b808`, branch basi
  dihapus, ruleset aktif (21369601). Backup: `d:\DEV\Monorepo-mirror-backup-20260825.git`.
  Riwayat lokal ≠ origin — JANGAN push/fetch tanpa alur publish terfilter (BOUNDARIES §1).

## Next action

1. **Chief: `check_sensitive_changes` — satu-satunya check merah.** Stempel ulang bukti review
   integritas terhadap basis `5b6b808`, atau repoint `review_base_ref`. Semua check lain PASS.
2. Chief: tiket GitHub Support untuk purge `refs/pull/*` + objek lama (PII residual).
3. Rancang alur publish terfilter (lokal→origin) + upload tiap capsule ke repo-nya sendiri
   (kebijakan Chief 2026-08-25; remote `avery` sudah ada, capsule lain belum).
4. Chief: pasang allow rule permission supaya alur "approve A-B-C" jalan. Terbukti perlu:
   sesi agen ditolak classifier saat mengklaim task dan meng-commit path milik Chief, sehingga
   Chief harus menjalankan dua commit itu sendiri.
5. Roadmap disetujui Chief: penegakan bertahap `roles` di `.safrs/policy.json` (belum dimulai).
6. Kediri: akuisisi citra historis dari institusi penyimpan (Museum Nasional, Perpusnas,
   KITLV, Rijksmuseum, Wereldmuseum, Nationaal Archief) — Phase 16 tidak dapat maju tanpa itu.
7. Kediri: konfirmasi arsip untuk klaim jembatan 1869 dan mekanisme pengangkatan 1912.
8. Kediri: standar Sentra-GSAP dicabut (2026-08-28) — gate lama tidak pernah dijalankan.
   Kualitas motion kini diverifikasi lewat skill GSAP resmi (router `/gsap`) + verifikasi
   visual/e2e capsule; motion belum dinyatakan production-ready sampai itu dilakukan.
9. Kediri: Phase 22 (deployment) menunggu otorisasi Chief; tidak ada remote yang dibuat.
10. Belum di-push. Gate pre-push (`CHIEF_PUSH_OK`, `CHIEF_PUSH_PROJECTS_OK`) tetap berlaku, dan
    riwayat lokal tak berkerabat dengan origin — jangan push/fetch tanpa alur publish terfilter.

> Docker Desktop sudah beres (2026-08-26). Stack capsule Kediri ditinggalkan hidup; hentikan
> dengan `docker compose -f infra/docker-compose.yml down` — tanpa `-v` supaya data semai
> bertahan.
