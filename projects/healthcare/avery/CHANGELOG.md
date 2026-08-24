# Changelog

Seluruh perubahan penting pada AVERY dicatat di berkas ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/), penomoran mengikuti [Semantic Versioning](https://semver.org/).

---

## [0.2.0] — 2026-08-25

### FIX-01…06 — perbaikan perilaku Avery (2026-08-23)

Diterapkan ke runtime profil `avery` dan dibuktikan (`docs/6-evidence/`). Rencana: `docs/5-superpowers/plans/2026-08-23-avery-fix-execution-plan.md`.

- FIX-01 config: migrasi v38; satu blok WhatsApp; kunci mati `group_allowed_chats` dibuang; `scripts/restart-gateway.ps1` mencetak effective config 6 baris dan menolak placeholder/JID tidak valid (fail-closed).
- FIX-02 ingress: `patches/hermes-0.20.5/0001-whatsapp-ingress-reason-codes.patch` (reason code `BROADCAST|GROUP_NOT_ALLOWED|USER_NOT_ALLOWED|MENTION_MISMATCH|PASSED|INVALID_MESSAGE` di INFO; regex mention invalid = BOOT FAIL) + `scripts/apply-hermes-patches.ps1` (idempoten, SHA-256, `-Revert`).
- FIX-03 persona: `SOUL.md` — Execution rule, daftar 18 skill, pembuangan lapisan izin kedua; 5 `SKILL.md` dibersihkan dari rujukan hantu; `contact-outreach` v5.0.0 kanonik; `scripts/push-profile-to-runtime.ps1` (repo→runtime, SHA-256, dry-run default).
- FIX-04 kapabilitas: `scripts/capability-smoke.ps1` + `scripts/smoke_evidence.py`; 6/6 instrumen yang dapat diuji di `-z` lolos, browser native lolos.
- FIX-05/06: `agent.execution_guidance`/`tool_use_enforcement` dinyalakan (mode `auto` tidak mencakup gemini); `tool_loop_guardrails` hard stop 3/5/3; format BLOCKED; `terminal.cwd` → workspace; `verify_on_stop` tetap off (lihat catatan plan §6).

Pengerasan kapsul. Semua butir di bawah terverifikasi di repositori lewat uji otomatis atau dry-run; tidak ada yang mengklaim cutover runtime, pengiriman hidup, atau pemantauan berjalan.

### Ditambahkan

- **Manifest kepemilikan skill** `ai/profiles/avery/custom-skills.json` — tepat 18 pohon skill milik Avery. `sync-profile-to-repo.ps1` kini hanya menyalin pohon yang tercantum, mencadangkan berkas yang akan ditimpa ke `ai/profiles/avery.bak-<stempel>/`, dan memverifikasi SHA-256 tiap salinan. `-WhatIf` terbukti nol mutasi.
- **Broker outbound terikat persetujuan** `src/avery_outbound/` — `prepare` memeriksa draf (menolak yang menyapa Chief atau memuat perancah cron), mengikat pada hash SHA-256, menyimpan metadata tanpa isi pesan di bawah `HERMES_HOME`; `approve` kedaluwarsa 15 menit; `status` mencetak argv `hermes -p avery send ...` sekali pakai tanpa mengeksekusinya — satu-satunya keluaran dengan nomor penuh, karena manusia menyalinnya ke terminal; keluaran lain disamarkan ke empat digit terakhir. Tidak pernah mengubah allowlist: penerima yang belum terdaftar menghasilkan kode keluar 3.
- **Rangkaian uji** `tests/` (pustaka standar `unittest`) dan runner `scripts/test.ps1`.
- **Alat pemulihan Windows** — `health-check.ps1` (JSON tersanitasi, kode keluar 0/1/2), `restart-gateway.ps1` (dry-run default, `-Execute` untuk bertindak), `restore-native-runtime-layout.ps1` (fail-closed, menolak bila proses Hermes masih berjalan), `member_watch.py` (pembanding snapshot anggota, pengenal disamarkan).
- **Living Console** — aplikasi desktop Electron (`console/`) dan padanan HTTP lokal `scripts/control_center.py` (port 8989, mitigasi CSRF Origin + header kustom, token opsional): streaming log, status gateway, dan dock peluncur skrip operasional.
- **Gerbang CI lokal** `scripts/ci-checks.ps1` — unit test, scan data sensitif (nomor/JID/kunci API), dan grep anti-regrési rename dalam satu perintah.
- **Housekeeping sesi otomatis** `scripts/session-housekeeping.ps1` + `scripts/lib/housekeeping.py` — rotasi sesi di atas ambang token (default 40.000) atau idle > 24 jam; memori kanonis tidak tersentuh; dry-run default.

### Dihapus

- 20 pohon skill bundled/managed milik Hermes dan 5 berkas state pengelola skill dari `ai/profiles/avery/skills/` — bukan milik Avery dan berubah setiap sesi.
- Prototipe `scripts/outreach.py`; logikanya berpindah ke `src/avery_outbound/policy.py` tanpa kemampuan `--authorize`.

### Diubah

- `docs/whatsapp-group-fix.md` disanitasi: JID dan nomor telepon diganti placeholder. Riwayat git sebelum commit ini masih memuat nilai aslinya.
- Skill `contact-outreach` diperbarui ke alur broker.
- **Broker outbound toleran berkas korup** — `store.list()` dan `expire_stale()` melewati JSON rusak dengan entri ledger `corrupt_file`; `get()` melempar `StoreError` yang jelas. Tiga uji baru.
- **Lifecycle restart terkonsolidasi** — `restart-gateway.bat` mendelegasikan penuh ke `restart-gateway.ps1 -Execute` (satu logika, nol duplikasi); pra-cek junction + sinkronisasi profil + housekeeping kini bagian dari jalur restart; blok effective config menandai `[CLI-GAGAL:<key>]` alih-alih diam saat CLI tidak menjawab.
- **`start-avery.bat` resolusi junction** — lokasi Hermes Studio dibaca dari `scripts/runtime-links.json`, bukan hardcode path legacy.
- **Reorganisasi dokumentasi** — struktur baru: `docs/4-spds/` (SPDS lengkap), `docs/5-superpowers/`, `docs/6-evidence/`; `PROJECT_GENOME.yaml`; pagar `.gitignore` untuk `backups/` (memuat PII/kredensial runtime) dan `console/node_modules/`.
- **Persona SOUL.md** — protokol identifikasi sender multi-user (call sign per anggota), aturan `NO_REPLY` ketat di grup, larangan narrasi tool ke WhatsApp.

## [0.1.0] — 2026-08-23

Rilis fondasi. AVERY berjalan sebagai agen percakapan di WhatsApp dengan gerbang relevansi, pengetahuan lokal, dan jejak eksekusi yang dapat diaudit.

Belum versi 1.0 karena satu alasan yang jujur: belum ada pekerjaan multi-langkah nyata yang berjalan penuh dari awal sampai akhir melalui AVERY. Fondasinya berdiri, lapisan kendali di atasnya belum.

### Ditambahkan

**Balasan grup WhatsApp.** Lima grup kerja aktif dengan dua lapis gerbang — intake menyaring berdasarkan grup dan penyebutan nama, otorisasi menyaring berdasarkan pengirim. Sebuah pesan harus lolos keduanya.

**Gerbang relevansi per grup.** `channel_overrides` memberi tiap grup lingkup topiknya sendiri. Di luar lingkup itu AVERY menjawab `NO_REPLY` dan gateway menahan pesannya. Diam adalah jawaban yang sah.

**Jejak eksekusi ber-run-ID.** Kanban dipakai sebagai penyimpan tugas sekaligus jejak audit — `create` menghasilkan ID, `show` menampilkan peristiwa bertimestamp, `complete` mencatat `[run 1] completed`. Terbukti ujung ke ujung pada tugas `t_d24db445`.

**Lima skill baru:**

| Skill | Isi |
|---|---|
| `capability-and-limits` | keterbatasan sebagai titik awal, bukan alasan; protokol lima langkah; inventaris kapabilitas nyata |
| `execution-audit` | pekerjaan yang tidak meninggalkan jejak dianggap tidak terjadi |
| `new-member-watch` | deteksi anggota baru dengan membandingkan peserta grup terhadap snapshot; berjalan tiap dua jam |
| `contact-outreach` | menghubungi kontak atas instruksi Chief lewat penjadwal |
| `kediri-knowledge` | 24 record Kediri Raya terverifikasi beserta schema dan registri sumber |

**Empat skrip operasional:**

| Skrip | Fungsi |
|---|---|
| `restart-gateway` | satu-satunya restart yang benar — hentikan, bunuh bridge yatim, tunggu `connected` |
| `check-unregistered-groups` | menyebut grup yang dikenal sesi tetapi belum terdaftar di konfigurasi |
| `verify-runtime-junctions` | memeriksa dan memulihkan junction runtime |
| `sync-profile-to-repo` | menyalin skill dan persona keluar dari runtime, menolak kredensial dan data pribadi |
| `rename-capsule` | mengganti nama capsule tanpa memutus junction runtime |

**Dokumentasi:** `gate-0-reality-audit.md` (inventaris berbasis bukti), `maestro-architecture.md` (rancangan empat lapis kendali beserta urutan pembangunan), `whatsapp-group-fix.md` (riwayat insiden), `deploy-hostinger.md` (runbook penempatan VPS), serta dokumentasi berlapis `1-human` / `2-agent` / `3-governance`.

### Diperbaiki

**Balasan grup yang tidak pernah muncul.** Akar masalahnya satu baris placeholder yang tidak pernah diganti: `group_policy: none`. Nilai itu tidak dikenali `_is_group_allowed()`, jatuh ke tolak-semua, dan setiap pesan grup dibuang **tanpa satu baris log pun** — sehingga tidak ada jejak yang bisa ditelusuri.

**Regex penyebutan nama yang tidak pernah cocok.** `mention_patterns` tersimpan dalam kutip ganda YAML, sehingga backslash ter-escape ganda dan `\b` berubah menjadi backslash literal.

**SQLite rentan korupsi.** Dinaikkan dari 3.50.4 ke 3.53.1; bug WAL-reset hilang.

**Model yang tidak dapat dipakai.** Seluruh SKU `:free` terbukti menolak dengan 429 dari shared pool. Model utama dipindah ke `google/gemini-2.5-flash`.

**Nama grup berupa ID mentah.** `channel_aliases.json` kini memuat nama sebenarnya, sehingga AVERY melihat "Founders Core", bukan deretan angka.

### Diubah

**Runtime Hermes berada fisik di dalam capsule** (`runtime/`), dengan directory junction di setiap lokasi lama sehingga seluruh path absolut tetap bekerja. Seluruh direktori itu gitignored — tidak satu byte pun runtime ikut terlacak.

**Nama capsule** dari `medisync` menjadi `avery`, agar sama dengan nama agennya.

**Hermes Studio** dinaikkan ke 0.6.46.

### Diketahui belum ada

Kejujuran soal batas rilis ini:

- **Lapisan kendali Maestro belum dibangun.** Gateway menyatu di dalam Hermes; Orchestrator hampir kosong; Supervisor baru sepertiga. Rinciannya di `docs/maestro-architecture.md`.
- **Tidak ada batas laju.** Sepuluh orang bertanya bersamaan menghasilkan sepuluh pemanggilan model, tanpa penahan.
- **Tidak ada gerbang persetujuan untuk tindakan.** Persetujuan baru berlaku untuk tulisan memori dan skill.
- **Tidak ada validasi hasil** sebelum balasan keluar.
- **Tidak ada pemantauan.** Gateway tidak melahirkan ulang bridge yang mati; bila bridge tumbang, AVERY diam tanpa peringatan.
- **Satu kanal.** Hanya WhatsApp.
- **Skrip operasional masih PowerShell.** Versi `.sh` ada tetapi belum diuji di Linux.
- **`whatsapp_cloud` tidak mendukung grup** — adapternya menolak pesan berbentuk grup secara eksplisit. Bukan pengganti Baileys untuk pemakaian ini.

### Catatan keamanan

Repositori ini privat dan memuat data operasional nyata, termasuk JID grup pada `docs/whatsapp-group-fix.md`. Kredensial, sesi WhatsApp, basis data runtime, dan catatan memori tidak pernah masuk — `scripts/sync-profile-to-repo.ps1` menegakkannya secara mekanis, termasuk memindai isi berkas untuk nomor telepon dan pola kunci API.
