---
name: abyss-review
description: Deep-dive read-only review of the SAFRS Monorepo (d:\DEV\Monorepo) to understand what actually exists before proposing new ideas, migrations, or refactors. Use when the user asks to "review ulang", "audit", "inspect", "rehydrate", "lihat apa yang ada", or before proposing any new capability/package/project, to avoid duplicating work that is already implemented, planned, or locked by decision. Always address the user as Chief in chat. Output in Bahasa Indonesia; code/paths/identifiers in English.
disable-model-invocation: true
---

# Abyss Review

Workflow untuk meninjau SAFRS Monorepo secara mendalam sebelum mengajukan ide baru. Tujuan: tidak pernah mengajukan ide yang duplikasi pekerjaan yang sudah ada, sudah direncanakan, atau sudah dikunci oleh keputusan.

Nama "abyss" merujuk ke `abyss-monorepo` (repo legacy pra-migrasi) — pengingat bahwa klaim "sudah ada" harus diverifikasi dari disk, bukan dari ingatan atau wiki.

## Kapan dipakai

Panggil manual via `/abyss-review` saat:
- Chief minta "review ulang", "lihat apa yang ada", "audit monorepo"
- Sebelum mengajukan ide/arsitektur/capability/package baru
- Sebelum migrasi project dari abyss-monorepo
- Saat ragu apakah sesuatu sudah diimplementasi

## Aturan tak ternegosiasi

1. **Read-only.** Tidak modifikasi file, tidak install package, tidak ubah git state, tidak jalankan autofixer.
2. **Bukti dari disk, bukan klaim.** Verifikasi path file ada + baca isinya sebelum menyimpulkan "sudah ada".
3. **Akui keputusan terkunci.** Jangan proposal yang melanggar `.agents/DECISIONS.md` atau `docs/governance/PLATFORM_ACTIVATION.md`.
4. **Akui plan yang sudah ada.** Cek `docs/plans/active/` + `docs/superpowers/plans/` sebelum menyatakan ide "baru".
5. **Address user sebagai Chief.** Bahasa Indonesia di chat; English di code/path/identifier.
6. **Tidak print credentials.** Termasuk `DATABASE_URL`, `.env`, kunci API.

## Workflow

### Phase 1 — Rehidrasi konteks wajib

Baca berurutan (MUST read order dari `AGENTS.md`):

1. `AGENTS.md` (root router)
2. `.agents/HANDOFF.md` (state saat ini, blocker terbukti)
3. `.agents/knowledge/00_READ_FIRST.md`
4. `.agents/knowledge/02_OBJECTIVES.md`
5. `.agents/knowledge/03_ARCHITECTURE.md`
6. `.agents/knowledge/04_CONTEXT.md`
7. `.agents/knowledge/12_LESSONS.md`

Lalu baca sekali:
- `.agents/DECISIONS.md` (keputusan terkunci — jangan langgar)
- `.agents/PROGRESS.md` (milestone + area status)
- `docs/feature-inventory.md` (klaim fitur — verifikasi vs disk)

### Phase 2 — Deep-dive paralel via explore subagent

Jalankan 4 subagent `explore` paralel (very thorough). Setiap subagent dilaporkan: file path + line number untuk export/CLI/route utama, status real vs stub, test coverage, TODO/FIXME, keputusan desain.

**Subagent A — Packages** (`d:\DEV\Monorepo\packages\`)
Untuk setiap package (`schemas`, `env`, `database`, `api`, `ui`, `telemetry`, `config`, `token`):
- Glob `src/**/*.{ts,tsx,css,json}`
- Baca `index.ts`, file kunci (`client.ts`, `app.ts`, `server.ts`, `schema.prisma`, `tokens.css`, dll.), AGENTS.md, test files
- Laporkan: public exports, real vs stub, test breadth, desain desisi

**Subagent B — Tools** (`d:\DEV\Monorepo\tools\`)
Untuk setiap tool (`codegen`, `project-wizard`, `deps-graph`, `doctor`, `capabilities`, `automation`, `status`, `task`):
- Glob `src/**/*.{mjs,ts,js}`
- Baca CLI entry + logika utama + AGENTS.md
- Laporkan: subcommand/flag, real vs stub, file I/O, integrasi repo

**Subagent C — Projects + Capabilities**
- `projects/golden-path/apps/web`: glob `src/**/*.{ts,tsx}` + `e2e/**`, baca page/layout/route/demo-form/server-data/instrumentation/next.config/e2e spec. Laporkan route, form behavior, capability pack wiring, telemetry, e2e assertions.
- `projects/control-center/apps/web`: glob `src/**/*.{ts,tsx}`, baca control-center.ts/page.ts/registry.ts/catalog.ts/library.ts/git.ts/root.ts/exec/*. Laporkan section dashboard, evidence algorithm, allowlist command, read-only vs mutating.
- Capability packs: baca `tools/capabilities/manifests/*.json` + `tools/capabilities/src/cli.mjs`. Laporkan manifest mana yang active (ada di `projects/*/capabilities.json`) vs available.

**Subagent D — Governance + Docs + Plans**
- `docs/governance/*.md` (12 file) + root `SAFRS_SPEC.md` + `SECURITY.md`
- `sentrawiki/**/*.md` — baca halaman kunci (`packages/database.md`, `packages/telemetry.md`, `reference/dependencies.md`)
- `docs/plans/active/*.md` + `docs/superpowers/plans/*.md` — status setiap plan
- `.safrs/policy.json`, `.safrs/document-registry.json`, `.agents/DECISIONS.md`, `.agents/PROGRESS.md`, `docs/feature-inventory.md`
- Laporkan: kontrol enforced vs aspirational, wiki vs kode kontradiksi, plan active/completed/abandoned, keputusan terkunci, gap aman untuk ide baru

### Phase 3 — Sintesis

Susun laporan terstruktur:

1. **Apa yang sebenarnya sudah ada** — per area (packages, tools, projects, capabilities, governance). Bukan klaim `package.json`/AGENTS.md, tapi verifikasi dari disk.
2. **Yang sudah terencana/terkunci** — tabel: ide vs sumber plan/decision. Tandai "jangan duplikasi".
3. **Safe gaps** — ide yang benar-benar baru (tidak ada plan, tidak diblokir keputusan terkunci).
4. **Koreksi diri** — akui jika asumsi awal salah setelah deep-dive.

### Phase 4 — Ajukan ide

Untuk setiap safe gap, berikan:
- Nama ide + klasifikasi risiko (R0-R3 dari `.safrs/policy.json`)
- Teknologi terbaru (verifikasi via WebSearch bila relevan — Chief minta SOTA)
- Value ke misi Sentra (AI ecosystem, digital factory)
- Bentuk MVP konkret (file path, package, route)
- Apakah ini ide baru vs lanjutan/revisi plan existing

Jangan ajukan ide yang:
- Sudah ada di `docs/plans/active/` atau `docs/superpowers/plans/` (kecuali revisi eksplisit)
- Melanggar `.agents/DECISIONS.md`
- Dilarang non-goal di nested `AGENTS.md` (mis. auth di golden-path)
- Dilarang feature-inventory §8 (second design system)

## Output format

```markdown
## Apa yang sebenarnya sudah ada
[per area, dengan file path + line number]

## Yang sudah terencana/terkunci
[tabel ide → sumber]

## Safe gaps — ide yang benar-benar baru
[per ide: nama, risiko, teknologi, value, MVP]

## Koreksi diri
[akui asumsi awal yang salah]

Chief, mau saya jadikan plan detail yang mana?
```

## Anti-pattern (jangan lakukan)

- Mengajukan "AI pack" tanpa cek `tools/capabilities/manifests/ai.json` sudah ada
- Mengajukan "Corpus merge" tanpa cek `docs/superpowers/plans/2026-08-11-corpus-engine-poc.md` sudah ada
- Mengajukan "MCP untuk Prisma/Postgres" — DECISIONS 2026-08-11: defer
- Mengajukan "second design system" — feature-inventory §8 melarang
- Mengajukan "auth di golden-path" — non-goal di `projects/golden-path/AGENTS.md`
- Klaim "sudah ada" tanpa baca file (cukup `package.json` tidak cukup)
- Klaim "belum ada" tanpa cek `docs/plans/active/` + `docs/superpowers/plans/`
- Print `DATABASE_URL` / `.env` / kunci API

## Verifikasi

Sebelum melapor selesai, pastikan:
- [ ] Setiap klaim "sudah ada" disertai file path + line number
- [ ] Setiap klaim "belum ada" sudah dicek di `docs/plans/active/` + `docs/superpowers/plans/` + `.agents/DECISIONS.md`
- [ ] Tidak ada ide yang melanggar keputusan terkunci
- [ ] Tidak ada credentials ter-print
- [ ] Bahasa Indonesia di chat, English di code/path
