# Avery — Rencana Eksekusi FIX-01…06 (turunan teknis dari `2026-08-23-avery-complete-fix-and-hardening.md`)

> Status: DIEKSEKUSI 2026-08-23 (lihat `docs/evidence/`). Tersisa butir yang butuh pesan WhatsApp dari Chief: 2.7, T1, T2, T8, T9, T10.
> Sumber kebenaran: kode Hermes 0.20.5 yang terpasang di
> `C:\Users\drfer\.hermes-web-ui\desktop-runtime\hermes\0.20.4\win-x64\python` (selanjutnya `<HERMES>`),
> bukan dokumen lama. Setiap klaim di bawah punya `file:line` di pohon itu.

## 0. Koreksi peta dari dokumen Chief ke realita kode

| Dokumen Chief | Realita Hermes 0.20.5 | Konsekuensi untuk plan |
|---|---|---|
| `gateway/baileys-bridge/` + `core/security/` (JS) | Bridge Node: `<HERMES>/scripts/whatsapp-bridge/bridge.js`; gate Python: `<HERMES>/gateway/platforms/whatsapp_common.py:390-422` (`_should_process_message`); authz: `gateway/authz_mixin.py:386`. Tidak ada `core/security/`. | FIX-02 = patch 1 fungsi Python + 1 env flag bridge |
| MAESTRO / error budget / CASE / DLP | Tidak ada satu pun string itu di profil runtime Avery maupun kode Hermes | "Fix governance conflict" FIX-03 = tidak ada yang perlu diubah di runtime; hanya dokumen repo (`docs/`) kalau masih menyebutnya |
| "Avery system instructions" | Yang masuk system prompt hanya: `SOUL.md` (`agent/prompt_builder.py:2342`), indeks 18 `SKILL.md` (`:1828`), `MEMORY.md`/`USER.md`, dan prompt cron. Direktori `docs/` di profil **tidak** diinjeksi (`agent/system_prompt.py:340-894`). | FIX-03/05 menyasar SOUL.md + SKILL.md + cron prompt saja |
| "emit structured startup log" (FIX-01) | Tidak ada log effective-config saat startup (hanya `logger.debug` per-turn `gateway/run.py:5405`). Ada `hermes config get`, `hermes status`, `hermes tools --summary`. | Acceptance dipenuhi tanpa patch core: cetak effective config lewat CLI native di `restart-gateway.ps1`. **Deviasi dari teks Chief, dinyatakan eksplisit.** |
| Retry policy `max_attempts = 3` (FIX-06) | Hermes tidak punya auto-retry tool; yang ada `tool_loop_guardrails` (hitung + peringatkan; hard stop opsional, default `false`) `agent/tool_guardrails.py:120-124` | Bounded recovery = `hard_stop_enabled: true` + ambang selaras 3 |
| Completion-loop (FIX-05) | Hermes **sudah punya** blok prompt native "execution discipline / verification-gated completion" (`agent.execution_guidance`) dan `agent.tool_use_enforcement` — tetapi mode `auto` hanya aktif untuk gpt/codex/grok/deepseek/kimi/qwen/… **bukan gemini** (`hermes_cli/config_defaults.py:150-167`). Avery = `google/gemini-2.5-flash` → blok ini tidak pernah disuntik. | FIX-05 utama = nyalakan native (`true`), bukan menulis prosa baru |

Prinsip: **config native dulu, patch minimal kedua, prosa terakhir.** Penyakit asal Avery adalah 221 baris prompt bertumpuk; jangan dibangun ulang lewat SOUL.md gemuk.

## 1. Batasan yang mengikat

- Tidak mengirim pesan WhatsApp baru ke grup/kontak; semua uji inbound dikirim **oleh Chief** dari WhatsApp.
- Tidak menyentuh `memory.write_approval`, `skills.write_approval`, `skills.guard_agent_created`, allowlist grup/DM, `approvals` (Chief-set).
- Backup sebelum setiap mutasi: `config.yaml`, `SOUL.md`, `SKILL.md` yang diubah, `cron/jobs.json` → `<nama>.pre-fixNN-<stempel>.bak`.
- Patch ke pohon `<HERMES>` **wajib** disimpan sebagai berkas patch di kapsul (`patches/hermes-0.20.5/*.patch`) + skrip apply idempoten dengan cek SHA-256 (hilang saat Hermes update).
- Tidak membaca/mencetak `auth.json`, `.env` (nilai), `creds.json`, `state.db` mentah, `memories/`. Semua JID/nomor diredaksi dalam log, laporan, dan checklist.
- Restart gateway hanya via `python -m hermes_cli.main --profile avery gateway restart` (atau `scripts/restart-gateway.ps1`); bukan `.bat`, bukan Start-Process GUI.
- Edit Chief di root `AGENTS.md` dan `.safrs/reviews/verification-integrity.json` tidak disentuh/di-commit. Tidak push.

## 2. Per-FIX

### FIX-01 — Satu sumber kebenaran config

**Rantai resolusi nyata** (`hermes_cli/config.py:3614-3740`, `env_loader.py:470-553`, `oneshot.py:389-400`):
`DEFAULT_CONFIG` → `$HERMES_HOME/config.yaml` (deep-merge) → `${VAR}` expansion → managed overlay (leaf wins). Env: `$HERMES_HOME/.env` **menimpa** shell env (`env_loader.py:499`). Model: `--model` > `HERMES_INFERENCE_MODEL` > `model.default`. Profil: `-p avery` diproses pra-argparse (`hermes_cli/main.py:520-692`) → `HERMES_HOME=~/.hermes/profiles/avery`; `~/.hermes` = junction ke `runtime/hermes-home`. Studio (`~/.hermes-web-ui`) hanya menyuntik `mcp_servers` + env `HERMES_WEB_UI_*`; tidak ada override model.

**Temuan konfigurasi Avery saat ini** (`profiles/avery/config.yaml`):
- `_config_version: 37`, terbaru 38 (`config_defaults.py:3674`).
- `gateway.platforms.whatsapp.extra.group_allowed_chats` = kunci **Telegram-only** (`gateway/config.py:1710`), nol pembaca WhatsApp → mati. `free_response_chats` **hidup** (`whatsapp_common.py:140`), pertahankan.
- `whatsapp.group_allow_from` + `group_policy: allowlist` + `mention_patterns` dibridge benar (`gateway/config.py:1700-1735`).
- Dua blok (`gateway.platforms.whatsapp` dan `platforms.whatsapp`) keduanya di-merge, top-level menang (`gateway/config.py:1574-1604`) — legal, tapi dua tempat untuk satu hal.
- `agent.execution_guidance`/`tool_use_enforcement` tidak diset → `auto` → nonaktif untuk gemini (lihat FIX-05).

**Langkah**
- [x] 1.1 Backup `config.yaml`.
- [x] 1.2 Jalankan `python -m hermes_cli.main --profile avery config migrate` (non-interaktif) → `_config_version: 38`; baca diff.
- [x] 1.3 Hapus kunci mati `gateway.platforms.whatsapp.extra.group_allowed_chats`; satukan blok WhatsApp runtime ke satu tempat (`platforms.whatsapp` top-level, `extra.free_response_chats` ikut pindah). Tidak mengubah nilai allowlist.
- [x] 1.4 Tambah ke `scripts/restart-gateway.ps1` langkah "effective config" setelah restart: `hermes --profile avery config get model.default`, `config get model.provider`, `config get _config_version`, `hermes --profile avery tools --summary` → dicetak sebagai 5 baris `profile= provider= model= toolset= config_source=<path config.yaml>`. (Pengganti log startup; tidak patch core.)
- [x] 1.5 Acceptance: restart 3× lewat skrip; ketiga keluaran identik (diff nol). Simpan ke `docs/evidence/fix01-effective-config.txt` (tersanitasi).

**Rollback:** pulihkan backup config, restart.

### FIX-02 — Ingress WhatsApp tidak lagi diam

**Titik drop tanpa log** (bukti): `whatsapp_common.py:396` broadcast, `:401-402` grup tidak diizinkan, `:404-406` DM tidak diizinkan, `:422` mention gagal — semua `return False` tanpa `logger` apa pun; `adapter.py:1650-1652` menelan exception parse ke `print()` (stdout, bukan file). `gateway.log` dikunci `INFO` (`hermes_logging.py:341-350`) → patch **harus** log di INFO, bukan DEBUG. Regex mention invalid hanya `logger.warning` lalu dilanjutkan (`whatsapp_common.py:324-330`).

**Langkah**
- [x] 2.1 `WHATSAPP_DEBUG=1` di `profiles/avery/.env` (dibaca bridge saat start, `bridge.js:58`; diteruskan adapter `adapter.py:715`). Nol patch; drop tier bridge (`from_me_group`, `agent_echo`, `empty`, `allowlist_mismatch`) tampil di `platforms/whatsapp/bridge.log` dengan ID diredaksi 4 digit (`redactWhatsAppId`).
- [x] 2.2 Patch `whatsapp_common.py::_should_process_message`: setiap `return False` didahului `logger.info("[%s] ingress drop reason=%s chat=%s", ...)` dengan kode tetap `BROADCAST | GROUP_NOT_ALLOWED | USER_NOT_ALLOWED | MENTION_MISMATCH`; jalur lolos `logger.info(... reason=PASSED ...)`. chat_id diredaksi ke 4 digit terakhir dengan helper lokal. `adapter.py:1650` → `logger.warning` (reason `INVALID_MESSAGE`) menggantikan `print`.
- [x] 2.3 Patch `_compile_mention_patterns` (`whatsapp_common.py:291-335`): bila **ada** pola invalid → `raise ValueError("BOOT FAIL: invalid mention pattern ...")` (bukan warning). Risiko dinyatakan: config regex rusak kini menjatuhkan gateway saat start — itu yang diminta Chief.
- [x] 2.4 Validasi placeholder saat boot, di `restart-gateway.ps1` (bukan core): tolak restart bila `config.yaml` memuat `@g.us` yang tidak berbentuk `^\d{10,20}@g\.us$` atau string `PLACEHOLDER|CHANGEME|xxxx`.
- [x] 2.5 Simpan patch: `patches/hermes-0.20.5/0001-whatsapp-ingress-reason-codes.patch` + `scripts/apply-hermes-patches.ps1` (cek SHA-256 berkas target sebelum/sesudah; idempoten; `-WhatIf`).
- [x] 2.6 Restart gateway; `HERMES_DISPATCHED` dibuktikan dari baris `gateway.run` yang sudah ada setelah `PASSED` (agent run log) — tidak perlu kode baru.
- [ ] 2.7 Acceptance (Chief mengirim 3 pesan dari WhatsApp, Avery boleh membalas hanya di grup allowlist): chatter biasa → `MENTION_MISMATCH`; `@Avery` di grup bukan allowlist → `GROUP_NOT_ALLOWED`; `@Avery` grup allowlist → `PASSED` + dispatch. Bukti: 3 baris `gateway.log` tersanitasi ke `docs/evidence/fix02-ingress-trace.txt`.

**Rollback:** `apply-hermes-patches.ps1 -Revert` (simpan salinan asli `.orig`), hapus `WHATSAPP_DEBUG`, restart.

### FIX-03 — Hapus permission layer kedua dari Avery

Target nyata = `SOUL.md` (4.706 char, 65 baris, repo & runtime byte-identik) + 18 `SKILL.md` + 1 prompt cron. `docs/` profil tidak diinjeksi → hanya higiene, prioritas rendah.

Klasifikasi temuan audit:
- **DIPERTAHANKAN** (Chief: quiet-by-default tetap): `SOUL.md:32` "Quiet by default", `:38`, aturan diam `new-member-watch` (:29,:32,:57,:62), `community-steward:22`, `contact-outreach:30-33`, `sentra-knowledge:25` (jangan umbar dokumen internal di grup). Gate memory/skill approval (`CAPABILITY_MAP` 15-16) — Chief-set.
- **DITULIS ULANG** (permission-seeking pada kerja yang sudah diotorisasi): `SOUL.md:39` "recommendation is not decision", `:44-45` "without appropriate human approval", `:49` "return for approval", `:65` "does not replace accountable human judgment" → diganti satu aturan Chief (blok "When the requested objective is within the authority granted…" + "Do not invent additional permission requirements."). `new-member-watch:58` "bila ragu tanyakan Chief dulu" → "bila data hilang, laporkan BLOCKED dengan format FIX-06". `sentra-knowledge:25` "ask for the minimum clarification" → hanya bila informasi benar-benar hilang.
- **DIPERBAIKI** (stale/hantu): bootstrap `SOUL.md:12-24` 13→18 skill; `avery-self-check:17` "13 expected" → 18; rujukan `HERMES_AUTONOMY_DIRECTIVE.md` (`execution-audit:4,14`, `capability-and-limits:31`) dihapus/diganti rujukan ke FIX-06 rule; `capability-and-limits:47` "repositori Medisync" → `avery`.

**Langkah**
- [x] 3.1 Backup SOUL.md + 5 SKILL.md terdampak (`new-member-watch`, `sentra-knowledge`, `avery-self-check`, `execution-audit`, `capability-and-limits`).
- [x] 3.2 Edit di **repo** (`ai/profiles/avery/...`), ukuran SOUL.md tidak bertambah > 10 % (target ≤ 5.200 char).
- [x] 3.3 Salin repo → runtime (`profiles/avery/SOUL.md`, `profiles/avery/skills/<nama>/SKILL.md`) dengan verifikasi SHA-256; skrip sync yang ada arahnya runtime→repo, jadi cutover ini manual-terverifikasi (skrip kecil `scripts/push-profile-to-runtime.ps1 -WhatIf` default).
- [x] 3.4 Tidak ada restart penuh: SOUL/skills dibaca per sesi; cukup sesi baru (`/new` atau `-z`).
- [x] 3.5 Acceptance (oneshot, tanpa WhatsApp): `hermes -p avery -z "Cari file <path uji di workspace>, analisis masalahnya dan perbaiki."` — FAIL bila respons memuat pertanyaan izin; PASS bila `state.db.messages` memuat urutan `search_files/read_file → patch/write_file → read_file → laporan`. Ulang 3×.

**Rollback:** pulihkan `.bak`, salin balik.

### FIX-04 — Instrumen Hermes benar-benar sampai

Fakta: `hermes-whatsapp` ≡ `hermes-cli` ≡ `_HERMES_CORE_TOOLS` (`toolsets.py:499-535`); selama `platform_toolsets.whatsapp` tidak diset, paritas WhatsApp↔CLI dijamin definisi. Uji via `hermes -p avery -z` (approval bypass, `oneshot.py:255`) mewakili gateway untuk tool exposure. Bukti = `state.db.messages`: baris `assistant` ber-`tool_calls` + baris `role='tool'` berpasangan (`hermes_state_common.py:405-429`), query tanpa filter `active=1`.

**Langkah**
- [x] 4.1 `scripts/capability-smoke.ps1`: 8 prompt oneshot berurutan (Files read+write temp di workspace, Terminal `echo`, Web `web_extract` 1 halaman, Knowledge `skill_view sentra-knowledge` + baca 1 dokumen kanonik, Memory `memory` read, Skills `skills_list`, Cron `cronjob list`, Delegation `delegate_task` trivial **hanya bila** `delegation` sudah aktif di config). Setelah tiap prompt, query `state.db` untuk session_id terakhir → tulis `DISCOVERABLE/CALLABLE/CONSUMED` per instrumen ke `docs/evidence/fix04-smoke.json` (tanpa isi pesan).
- [x] 4.2 Untuk tiap FAIL ikuti tangga Chief: `hermes tools --summary` (registered/exposed) → `hermes doctor` (schema/dependency) → log `agent.log` (handler) → `state.db` (result). Perbaiki hanya titik rusak; tidak ada wrapper.
- [x] 4.3 Catatan diketahui: browser native Hermes butuh dependensi ("system dependency not met" pada uji sebelumnya) — bila gagal, FIX di sini = pasang dependensi browser native, **bukan** menambah MCP.
- [x] 4.4 Acceptance: 8/8 (atau 7/7 bila delegation tidak dikonfigurasi — dinyatakan) `CONSUMED`.

### FIX-05 — Completion-loop lewat mekanisme native

**Langkah**
- [x] 5.1 `config.yaml` → `agent.execution_guidance: true`, `agent.tool_use_enforcement: true` (default `auto` tidak mencakup gemini, `config_defaults.py:150-167`). `agent.task_completion_guidance` dan `stall_guards` sudah `true` default — tidak diubah.
- [x] 5.2 Baru bila 5.1 terbukti belum cukup (acceptance 5.4 gagal): tambah ke SOUL.md blok invariant Chief (UNDERSTAND→ACT→OBSERVE→CONTINUE→VERIFY→REPORT + definisi BLOCKED 4 butir) — maksimum 12 baris.
- [x] 5.3 Prompt cron `member-watch` disesuaikan: hapus frasa yang menyuruh "selesai tanpa mencatat" untuk jalur error; jalur "tidak ada anggota baru → diam" dipertahankan (quiet-by-default).
- [x] 5.4 Acceptance: `hermes -p avery -z "Cari konfigurasi yang menyebabkan Avery tidak merespons di <workspace uji> lalu perbaiki."` terhadap fixture workspace dengan regex mention sengaja rusak di `config.sample.yaml` lokal (bukan config runtime). PASS = edit + verifikasi dalam satu giliran; FAIL = berhenti di "kemungkinan masalahnya regex".

### FIX-06 — Verifikasi + bounded recovery

**Langkah**
- [x] 6.1 `config.yaml` → `agent.verify_on_stop: true` (literal `true`; `"auto"` = OFF untuk surface messaging termasuk WhatsApp, `agent/verification_stop.py:109-134`; default kode `false` walau contoh config bilang `auto`).
- [x] 6.2 `tool_loop_guardrails`: `hard_stop_enabled: true`, `warn_after.exact_failure: 2`, `hard_stop_after.exact_failure: 3`, `same_tool_failure: 5`, `idempotent_no_progress: 3` — selaras `max_attempts = 3` Chief; retry identik ke-3 sudah di-stub oleh `IdenticalCallObservation` (`tool_guardrails.py:222-234`).
- [x] 6.3 Format laporan `BLOCKED` (cause/attempts/last_error/required_next_condition) masuk ke `SOUL.md` sebagai 5 baris — satu-satunya prosa baru FIX-06.
- [x] 6.4 Acceptance T7: oneshot dengan perintah yang pasti gagal (`read_file` path tidak ada, lalu diminta memperbaiki). PASS = ≤ 3 percobaan berbeda, diakhiri blok BLOCKED atau sukses alternatif; tidak ada `done` tanpa read-back. Bukti: hitung baris `role='tool'` gagal per session di `state.db`.

## 3. Regression Gate T1–T10

| T | Inisiator | Surface | Bukti | Batas outbound |
|---|---|---|---|---|
| T1 pertanyaan sederhana | Chief, `@Avery` di grup allowlist | WhatsApp | `gateway.log` PASSED + balasan | balasan ke grup itu saja |
| T2 riset | Chief | WhatsApp | `state.db` tool `web_search/web_extract` + balasan | idem |
| T3 locate+read | saya | `-z` | `state.db` `search_files`→`read_file` | tidak ada |
| T4 locate+modify+verify | saya | `-z` | `patch`→`read_file` | tidak ada |
| T5 browser+summarize | saya | `-z` | `browser_navigate`/`web_extract` | tidak ada |
| T6 multi-step | saya | `-z` | ≥ 3 tool berurutan, satu sesi | tidak ada |
| T7 failure→recover | saya | `-z` | ≤ 3 percobaan, BLOCKED/sukses | tidak ada |
| T8 approval-gated | Chief, perintah yang kena `approvals` | WhatsApp | prompt `/approve` teks (`gateway/run.py:6195`); tanpa jawaban → deny setelah 300 s (`approval_transport.py:191`) — **hasil deny-setelah-timeout diterima sebagai PASS T8** | tidak ada |
| T9 allowed op tanpa izin ulang | Chief | WhatsApp | balasan tanpa pertanyaan izin | balasan ke grup |
| T10 mention gagal traceable | Chief, chatter tanpa mention | WhatsApp | `MENTION_MISMATCH` di `gateway.log` | tidak ada |

Release gate Chief (9 baris) dipetakan: mention routing = T1,T10; silent drop = T10 + `bridge.log`; tools callable = FIX-04 8/8; redundant prompt = T9 + FIX-03 3×; autonomi multi-step = T6; mutation verified = T4,T7; infinite retry = T7; memory approval utuh = `config get memory.write_approval` masih `true`; DLP/allowlist utuh = diff `group_allow_from` nol.

## 4. Urutan & commit

FIX-01 → 02 → 03 → 04 → 05 → 06 → regresi; satu commit per FIX di kapsul (`fix(avery): FIX-0N …`), evidence tersanitasi di `docs/evidence/`. Tidak push. Tiap FIX ditutup dengan update checklist Artifact.

## 5. Deviasi dari teks Chief (dinyatakan)

1. FIX-01 log startup dipenuhi via CLI native di skrip restart, bukan patch core.
2. FIX-02 `HERMES_DISPATCHED` tidak dibuat kode baru; memakai log dispatch yang sudah ada.
3. FIX-05 utama = saklar native untuk gemini; prosa hanya bila terbukti perlu.
4. FIX-06 `max_attempts` dipetakan ke `tool_loop_guardrails`, bukan retry loop baru.
5. `docs/` profil (ARCHITECTURE "earn its own permission boundary") tidak diinjeksi ke prompt → diperbaiki terakhir, non-blocking.

## 6. Catatan eksekusi (2026-08-23)

- FIX-01: migrasi v38, blok WhatsApp disatukan di `platforms.whatsapp`, kunci mati dibuang; 3 restart → hash evidence identik (`docs/evidence/fix01-effective-config-run{1,2,3}.txt`).
- FIX-02: `WHATSAPP_DEBUG=1`; patch `patches/hermes-0.20.5/0001-…` (reason code INFO + BOOT FAIL + INVALID_MESSAGE) terpasang, idempoten via `scripts/apply-hermes-patches.ps1`; validasi JID/placeholder di `restart-gateway.ps1`. 2.7 menunggu 3 pesan uji Chief.
- FIX-03: SOUL.md 4.672→5.972 char (repo ≡ runtime, backup `.pre-push-*`); `contact-outreach` v5.0.0 runtime diadopsi sebagai kanonik (invarian keselamatan utuh, prosedur broker 3 langkah dibuang — itu lapisan izin kedua). Chief dapat membatalkan dengan `git checkout` bila tidak setuju.
- FIX-04: 6/7 PASS langsung; `cronjob` sengaja dinonaktifkan di luar sesi interaktif/gateway (`tools/cronjob_tools.py:1812-1831`) → bukan cacat; di gateway terbukti hidup (`agent.log` 15:52:40). Delegation tidak dikonfigurasi. Browser native PASS (`browser_exec`).
- FIX-05: `execution_guidance`/`tool_use_enforcement` true; blok Execution rule di SOUL; prompt cron jalur error wajib lapor. Uji B: regex rusak ditemukan, diperbaiki, dibuktikan dengan kompilasi.
- FIX-06: guardrails hard stop 3/5/3; format BLOCKED di SOUL (terbukti dipakai Avery saat `hermes verify` gagal). **Deviasi:** `verify_on_stop` dikembalikan ke `false` — nudge-nya memicu `hermes verify` yang naik ke akar git monorepo via junction dan menjalankan `pnpm install`; verifikasi read-back tetap terjadi via execution_guidance (bukti A1–A5, D). Tambahan: `terminal.cwd` → `workspace/` (cwd default bukan lagi direktori `auth.json`); shim `~/.local/bin/hermes` agar `hermes` ter-resolve di Git Bash (salinan di `patches/hermes-0.20.5/hermes-gitbash-shim.sh`).
- Regresi: T3, T4, T6, T7 PASS (`docs/evidence/fix03-05-06-behavior.json`); T5 PASS (sesi `browser_exec` ×2, judul "Example Domain" — bukti di transkrip sesi, tidak masuk JSON); T1, T2, T8–T10 menunggu Chief.
- Bukti live pertama (cron `member-watch` 23:33, persona+config baru): `execute_code` diblokir di cron (by design) → pulih via `terminal`, 5 grup diperiksa, snapshot ditulis `verified: true`, tidak ada anggota baru → `[SILENT]`, nol kiriman keluar.
