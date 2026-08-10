# CONTEXT — SAFRS Monorepo Identity

Update jarang. Menjawab: repo ini apa, apa yang penting, apa yang tidak boleh diubah sembarangan.

Last updated: 2026-08-11

---

## Project

- **Nama:** SAFRS Monorepo (`safrs-monorepo`, private)
- **Root:** `D:\DEV\Monorepo`
- **Owner:** Dr. Ferdi Iskandar (solo developer, non-coding operator)
- **Postur:** Repository agent-first — manusia memberi intent, agent mengeksekusi, mesin memverifikasi. Fokus utama: kenyamanan operator solo non-coding.
- **Standar:** SAFRS v1.1 — `SAFRS_SPEC.md` adalah rujukan normatif tertinggi di dalam repo.
- **Package manager:** `pnpm@11.21.0` (selalu — jangan npm/yarn)
- **Runtime baseline:** Windows 11, PowerShell 7, Node >= 24.18 (< 25), TypeScript strict, Turborepo, Biome
- **Database:** PostgreSQL via Docker Compose (`pnpm db:start`). Prisma di `packages/database`.
- **Branch utama:** `main`
- **GitHub remote:** repo lama (`abyss-monorepo`) berbeda — jangan pernah mencampur keduanya. Repo lama read-only untuk migrasi.

## Authority Chain

1. `SAFRS_SPEC.md` + Constitution SAFRS — aturan tertinggi, tidak boleh diubah agent.
2. Root `AGENTS.md` — router dan aturan operasional repo.
3. `HANDOFF.md` — state sesi terkini (baca pertama setiap sesi).
4. `.agents/knowledge/` — knowledge base bernomor (routing ada di `AGENTS.md`; **jangan ganggu hasil re-routing ini**).
5. `DECISIONS.md` + `docs/adrs/` — keputusan durable.
6. `PROGRESS.md` — tracker area dan milestone.
7. Nested `AGENTS.md` per project/package — detail lokal.

## Repository Shape

```
projects/
  golden-path/         ← Demonstrator baseline (Next.js + Hono API + Prisma)
  _template/           ← Kerangka project baru (via pnpm project:new)
  <product>/           ← (akan datang) hasil migrasi dari abyss-monorepo
packages/
  api/ schemas/ env/ database/ ui/ config/ design-tokens/
  ← shared boundaries; jangan impor kode server/db ke komponen browser
tools/
  safrs/ doctor/ project-wizard/ capabilities/
  ← tooling dev murni, tidak di-deploy
scripts/               ← setup, dev, test, safrs-verify
tests/                 ← cross-cutting contract tests
docs/
  adrs/ evidence/ governance/ plans/ superpowers/ bootstrap/
.agents/knowledge/     ← knowledge base bernomor 00–11 + 99 (hasil re-routing docs)
.safrs/                ← kebijakan machine-readable (policy.json, roles)
```

## Protected Areas

| Area | Aturan |
|---|---|
| `SAFRS_SPEC.md`, `.safrs/` | Constitution & kebijakan — modifikasi hanya oleh manusia |
| `.agents/knowledge/` | Hasil re-routing docs — **jangan diubah/diganggu** tanpa persetujuan Chief |
| `.github/` workflows & CODEOWNERS | R2 — tidak boleh dilemahkan agar task lulus |
| `packages/**` (shared) | Perubahan = R2, butuh review |
| Database schema/migrations | R2 — review eksplisit |
| `.env` / secrets | Tidak boleh dibaca, diprint, di-commit, atau dikirim |

## Risk Tiers (ringkas)

- **R0** — baca/analisis. Langsung jalan.
- **R1** — perubahan lokal reversibel dalam scope task.
- **R2** — boundary: shared packages, schema DB, dependency, CI, auth. Wajib review manusia.
- **R3** — produksi, credentials, deploy, logika healthcare-kritis. Wajib otorisasi eksplisit.

## Golden-Path Baseline

- Stack default produk: **Next.js + Hono RPC + Zod + PostgreSQL + Prisma**.
- `projects/golden-path/apps/web` mount Hono API di bawah `/api`.
- Electron, WXT, Stripe, email, AI, Python = **capability pack opsional**, bukan dependency baseline. Aktifkan lewat workflow `pnpm capability:add` + review risiko.

## Environment & Conventions

- Shell: PowerShell di Windows.
- Line endings: git menyimpan LF (`.gitattributes`: `* text=auto eol=lf`); `.ps1/.bat/.cmd` tetap CRLF. Jangan ubah `.gitattributes` sembarangan.
- Diagnostik agent berbahasa Indonesia; nama command, kode, dan identifier dalam English.
- Repo lama (`D:\Devops\abyss-monorepo`): sumber migrasi saja. **Jangan baca `.env`-nya** (berisi credential live), jangan copy `node_modules`, `.env`, `.next`, atau lockfile-nya ke sini.

## AI Agent Knowledge

**Read order:** `AGENTS.md` → `HANDOFF.md` → `.agents/knowledge/00_READ_FIRST.md` → nested `AGENTS.md` terdekat untuk task.

Jangan gunakan ChatGPT Memory atau percakapan lama sebagai SSOT repo — kebenaran ada di file repo.
