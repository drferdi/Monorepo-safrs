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

Urutan otoritas dan urutan baca **tidak didefinisikan di sini** — sumber tunggalnya adalah section Priority dan blok Read order (generated) di root `AGENTS.md`, yang diturunkan dari `.safrs/document-registry.json`. File ini hanya identitas repo.

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

## Protected Areas & Risk Tiers

Sumber tunggal: `.safrs/sensitive-paths.json` (pola R2/R3, machine-enforced) dan section Risk handling di `AGENTS.md`. Jangan duplikasi tabelnya di sini. Pengingat non-mesin yang tetap berlaku: `.env` tidak boleh dibaca/diprint/di-commit/dikirim; `.agents/knowledge/` jangan diubah tanpa persetujuan Chief.

## Golden-Path Baseline

Sumber tunggal: section Golden-path baseline di `AGENTS.md` dan [ADR 0001](docs/adrs/0001-solo-developer-golden-path.md).

## Environment & Conventions

- Shell: PowerShell di Windows.
- Line endings: git menyimpan LF (`.gitattributes`: `* text=auto eol=lf`); `.ps1/.bat/.cmd` tetap CRLF. Jangan ubah `.gitattributes` sembarangan.
- Diagnostik agent berbahasa Indonesia; nama command, kode, dan identifier dalam English.
- Repo lama (`D:\Devops\abyss-monorepo`): sumber migrasi saja. **Jangan baca `.env`-nya** (berisi credential live), jangan copy `node_modules`, `.env`, `.next`, atau lockfile-nya ke sini.

## AI Agent Knowledge

Read order: ikuti blok Read order (generated) di `AGENTS.md` — jangan definisikan urutan di sini.

Jangan gunakan ChatGPT Memory atau percakapan lama sebagai SSOT repo — kebenaran ada di file repo.
