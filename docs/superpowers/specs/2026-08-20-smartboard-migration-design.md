# Smartboard Migration Design

- **Status:** APPROVED (Chief, 2026-08-20, in-session)
- **Sumber:** `D:\Devops\abyss-monorepo\apps\academic\smartboard` (arsip, read-only)
- **Tujuan:** `projects/academic-smartboard/` di monorepo SAFRS ini
- **Plan implementasi:** `docs/plans/active/2026-08-20-smartboard-migration.md`

## 1. Keputusan yang sudah disetujui

| # | Keputusan | Alasan |
|---|---|---|
| D1 | Capsule tunggal `projects/academic-smartboard/` — domain jadi prefix nama, bukan folder perantara | `pnpm-workspace.yaml` (`projects/*/apps/*`), `tools/safrs/check_topology.py`, dan `scripts/check-tokens.mjs` semuanya mengasumsikan capsule tepat satu level di bawah `projects/`. Folder domain (`projects/academic/smartboard/`) memaksa edit tiga kontrol governance sekaligus. Ditunda sampai ada 4–5 produk dan ADR tersendiri. |
| D2 | Semua permukaan produk smartboard dalam satu capsule: `apps/web` (aplikasi utama), `apps/site` (website promo/publik), `apps/api` (backend), `apps/demo` (konfigurasi demo) | Permintaan Chief: satu produk = satu folder, semua urusan smartboard berkumpul. |
| D3 | Kayyisa di `projects/academic-smartboard/ai/kayyisa/`, bukan capsule/package terpisah | Aturan capsule (`docs/governance/safrs_project_capsules.md` Rule 3): naik ke `packages/` hanya setelah konsumen kedua nyata. Saat ini hanya smartboard yang memakai. |
| D4 | Port bertahap ke stack golden-path, bukan lift-and-shift | Frontend sumber (CRA + craco + yarn + ~50 `resolutions` CVE manual) dan backend (FastAPI + MongoDB) tidak bisa masuk katalog pnpm tanpa melubangi gate supply-chain, token, dan `pnpm check`. |
| D5 | `apps/api` di-port ke Hono 4 + Prisma 7 + Postgres, per modul di belakang facade | 24 modul `routes_*.py` tidak jatuh bersamaan; skema bertipe menggantikan dokumen Mongo bebas bentuk; `pip` dan MongoDB tidak masuk boundary repo. |
| D6 | Demo = environment, bukan fork kode | Kode sama + flag runtime + seed sintetis + target deploy dan kredensial terpisah. Repo publik `smartboard-demo` / `smartboard-landing` berhenti jadi sumber; kalau tetap publik, isinya output CI satu arah. |
| D7 | Migrasi = snapshot, bukan graft riwayat git | Riwayat abyss-monorepo bisa mengandung secret lama; graft membawanya permanen. Repo lama tetap arsip. |
| D8 | `raw_data/` dikarantina permanen | Data pribadi asli (nama siswa, email tentor, gaji). Klasifikasi R3. Tidak masuk repo target dalam bentuk apa pun tanpa konfirmasi tertulis Chief. |

## 2. Struktur target

```text
projects/academic-smartboard/
├── AGENTS.md  README.md  capabilities.json
├── apps/
│   ├── web/          Next.js 16 + catalog:        ← port dari frontend/ (146 file, ~30,6k LOC, 37 halaman)
│   ├── site/         Next.js 16 static export     ← port dari landing/ (Vite 8, 7 halaman)
│   ├── api/          Hono 4 + Prisma 7 + Postgres ← port dari backend/ (24 routes_*.py, ~21,1k LOC)
│   └── demo/         config + seed, TANPA kode    ← gantikan demo/app + demo/landing
├── ai/kayyisa/
│   ├── manifest.json  .agent-ingest.json  CHANGELOG.md  README.md
│   ├── config/       agent_policies.csv, data_dictionary.csv, persona/, runtime/
│   ├── runtime/      knowledge/*.jsonl, resolver/
│   ├── sources/official/
│   ├── tests/persona/
│   └── tools/validate_agent_kayyisa.py
├── data/
│   ├── curriculum/   curriculum_master.{csv,json}, curriculum_hierarchy.json,
│   │                 learning_objectives.csv, learning_outcomes.csv, subject_matrix.csv
│   ├── reference/    license_registry.csv, source_registry.{csv,json},
│   │                 document_relationships.csv
│   └── synthetic/    seed dummy untuk demo (dibuat baru, bukan disalin)
├── docs/architecture.md  docs/data.md  docs/testing.md
├── src/  tests/  scripts/
```

## 3. Karantina — TIDAK PERNAH disalin

- `raw_data/**` (R3 — data pribadi asli)
- Semua `.env*`: `backend/.env`, `backend/.env.bak`, `backend/.env.example` (nilai asli), `frontend/.env`, `landing/.env`, `landing/.env.local`, `demo/_keep/*.env`, `demo/landing/.env*`, `backend/scripts/cloud_tokens.env`
- `demo/app/.git/`, `demo/landing/.git/` (repo git tersarang)
- `backend/agent/` (duplikat `agent/` root)
- `node_modules/`, `.venv/`, `__pycache__/`, `build/`, `dist/`, `.pytest_cache/`, `.turbo/`
- Artefak sesi: `_console_*.{out,err}`, `.uvicorn-*.log`, `preview-{out,err}.txt`, `_e2e_*.py`, `_prep_two_inst.py`, `_run_console_*.ps1`
- `agent/operations/` (artefak proses repo lama), `agent/docs/` (plan lama)
- `.agent/`, `.claude/`, `.cursor/`, `.github/badges/` milik repo lama

## 4. Urutan fase

1. **Fondasi** (plan ini): claim task SAFRS, ADR, scaffold capsule via `pnpm project:new`, registrasi sensitive paths, impor `data/` + `ai/kayyisa/`, isi docs capsule, verifikasi hijau.
2. **Port `apps/site`** — plan terpisah. Paling kecil; kalibrasi token gate.
3. **Port `apps/web`** — plan terpisah. Paling besar (37 halaman).
4. **Port `apps/api`** — plan terpisah. Per modul di belakang facade; 26 file test Python jadi acuan perilaku untuk Vitest.
5. **`apps/demo` + realihkan repo publik** — plan terpisah. Butuh keputusan Chief soal postur repo publik.

## 5. Kriteria sukses fase fondasi

- `bash scripts/safrs-verify.sh` PASS
- `pnpm check` PASS
- `find projects/academic-smartboard -name "*.env*"` kosong
- Tidak ada file dari `raw_data/` di repo (nama file dicek eksplisit)
- Capsule lolos `check_topology.py` tanpa placeholder tersisa
