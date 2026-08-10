# PROGRESS — Milestones and Area Status

Legend: [x] done, [~] in progress, [ ] not started, [!] blocked

Last updated: 2026-08-11 | Branch: `main`

> Ini papan status area. Log kerja detail masuk `docs/plans/active/` → `completed/`.
> Keputusan durable masuk `DECISIONS.md`. State sesi terkini masuk `HANDOFF.md`.

---

## 🟢 Fase 0 — SAFRS Scaffold & Golden Path

- [x] Repo bootstrap SAFRS v1.1 (six layers, policy.json, roles, sensitive-paths)
- [x] Golden-path demonstrator: Next.js + Hono API di `projects/golden-path/apps/web`
- [x] Shared packages: api, schemas, env, database, ui, config, design-tokens
- [x] Tooling: safrs, doctor, project-wizard, capabilities
- [x] Contract tests + `pnpm test:contracts`
- [x] Capability packs aktif: email + Stripe (commit 72e08d9)
- [x] ADR 0001 diterima (golden path)

## 🟡 Fase 1 — DX Solo-Developer

- [x] Knowledge base re-route → `.agents/knowledge/` (commit `de1410f`, pushed)
- [~] DX friction fixes (9 item) — **sedang dikerjakan Claude**
      (`docs/superpowers/plans/2026-08-11-solo-dev-dx-friction-fixes.md`)
- [x] Lima file memori agent (CONTEXT/DECISIONS/HANDOFF/PROGRESS/12_LESSONS) — terdaftar di
      registry, masuk read-order generated `AGENTS.md`, HANDOFF machine-enforced (Chief GO 2026-08-11)
- [ ] `.env.example` lengkap + dokumentasi capability variables
- [ ] Python prerequisite terdokumentasi (INSTALL.md) + deteksi di setup

## ⚪ Fase 2 — Migrasi Project dari abyss-monorepo

- [x] Project mapping selesai (22 → 14 aktif) + keputusan stack per project
- [x] Desain multi-tenant + demo pattern (smartboard sebagai referensi)
- [ ] Persiapan repo: policy.json, pnpm-workspace, AGENTS.md menerima `projects/` produk
- [ ] Pilot: `ferdiiskandar` → `projects/ferdiiskandar/`
- [ ] Smartboard rewrite (FastAPI+Mongo+CRA → Next+Hono+Postgres)
- [ ] Tier 1 Next.js: assistverse, medboard, sentraverse
- [ ] Tier 2: med-assist (R3 klinis), referralink, sidelab
- [ ] Tier 3: socialmedia (Python)
- [ ] Studio: unicom, dataset-studio, sentra-prompt, wikirepo, sentrahub

## 🔴 Blocked / Deferred

- [!] Smartboard Phase B/C — menunggu Chief GO (backup + migration dry-run dulu)
- [~] semayot — tunda (hapus / pindah tempat lain)
- [ ] 8 skeleton projects (skripsipintar, smartboard-docs-only, clinical-copilot,
      healthsphere, hoamanagement, mantra, melinda, rag-dashboard) — skip

## Guardrails

- Perubahan shared packages / database schema / CI = R2, wajib review.
- Jangan melemahkan SAFRS governance demi meluluskan task.
- `.agents/knowledge/` jangan diganggu (hasil re-routing).
