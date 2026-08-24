# Project Capsule Router — Avery

## Inheritance

Read the repository root `AGENTS.md` first. This file narrows project-local context and never weakens root SAFRS or security controls.

## Objective and ownership

- Project: `avery`
- Objective: Menjalankan dan merawat Avery, agen Hermes milik Sentra, sebagai konfigurasi terversi — dari laptop sampai VPS — sehingga penambahan agen baru cukup lewat konfigurasi, bukan pemasangan ulang.
- Human owner: Chief (dr. Ferdi Iskandar)
- Default risk: `R1`; use root policy and sensitive-path registry for escalation.

## Owned scope

- `projects/healthcare/avery/**`
- Explicitly approved shared packages only.

## Required context

1. `docs/spds/read_first.md` (SPDS 1.0 entry) and `PROJECT_GENOME.yaml`
2. `README.md`
3. `docs/architecture.md`
4. `docs/data.md`
5. `docs/testing.md`

## Commands

Proyek ini konfigurasi, skrip operasional, dan satu paket Python kecil (`src/avery_outbound`, pustaka standar saja). Runtime-nya adalah Hermes Studio yang terpasang terpisah.

- Build: `not-applicable` — tidak ada artefak yang dikompilasi.
- Lint: `not-applicable` — belum ada linter yang dipasang untuk paket ini.
- Type check: `not-applicable` — belum ada pemeriksa tipe yang dipasang.
- Test: `pwsh -NoProfile -File projects/healthcare/avery/scripts/test.ps1` (dari akar monorepo; `unittest` pustaka standar). Verifikasi gateway hidup tetap manual, lihat `docs/testing.md`.

## Batas data — wajib

Yang **tidak boleh** masuk ke repositori ini:

- `auth.json` dan kredensial penyedia model apa pun.
- Direktori sesi WhatsApp (`platforms/whatsapp/session/`) — `creds.json` di dalamnya setara kunci akses nomor.
- Berkas `.env` yang sudah terisi.
- `state.db`, `kanban.db`, dan basis data runtime lain.
- `memories/` — berisi catatan pribadi tentang orang sungguhan.
- Aplikasi Hermes Studio yang terpasang (sekitar 641 MB binary).

Yang **boleh** masuk: persona (`SOUL.md`), skills, contoh konfigurasi tanpa nilai rahasia, berkas deploy, dan skrip operasional.

## Prohibited actions

- Do not modify other projects or shared packages without recording scope expansion.
- Do not use production credentials or production data.
- Do not bypass root verification, risk classification, or human authorization requirements.
- Jangan menulis ulang `ai/profiles/avery/SOUL.md` tanpa persetujuan Chief; berkas itu menentukan perilaku agen yang sedang melayani grup sungguhan.
