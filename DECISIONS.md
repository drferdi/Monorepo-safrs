# DECISIONS — Durable Choices

Append-only. Keputusan terbaru di atas. Setiap entri: tanggal, keputusan, alasan singkat, bukti/status.
Keputusan arsitektural besar sebaiknya juga punya ADR di `docs/adrs/`.
Jangan menghapus entri lama — keputusan yang dibatalkan dicatat sebagai entri baru ("supersedes ...").

---

## 2026-08-11 - Routing memori: registry-driven, HANDOFF machine-enforced

Lima file memori terdaftar di `.safrs/document-registry.json` dengan `normativity`/`scope`/`read_order`;
blok Read order `AGENTS.md` di-generate dari registry (`tools/safrs/generate_routing.py`).
MUST-always (±2k token): 00_READ_FIRST → HANDOFF → 02 → 03 → 04 → 12_LESSONS.
`SAFRS_SPEC.md` turun ke SHOULD (token budget; aturan operatif dicermin `AGENTS.md`).
`check_handoff.py` di `safrs-verify.sh` mewajibkan update `HANDOFF.md` pada change set non-trivial.
Duplikasi router di `00_READ_FIRST`/`CONTEXT.md` dihapus — satu sumber urutan baca.
Referensi pola: Cline Memory Bank, standar AGENTS.md 2026.

## 2026-08-11 - File operasional agent: CONTEXT / DECISIONS / HANDOFF / PROGRESS / 12_LESSONS

Repo mengadopsi lima file memori agent: `CONTEXT.md` (identitas), `DECISIONS.md` (file ini),
`HANDOFF.md` (state sesi), `PROGRESS.md` (tracker area), dan `.agents/knowledge/12_LESSONS.md`
(koreksi reusable). Pola ini menggantikan `.agent/` monolitik dari `abyss-monorepo` — isi lama
TIDAK dipindah; hanya polanya yang diadopsi. Supersedes: kebutuhan `.agent/` ala repo lama.

## 2026-08-11 - `.agents/knowledge/` adalah lokasi knowledge base — hasil re-routing docs

Knowledge base bernomor (00_READ_FIRST … 11_RESPONSE_STANDARDS, 99_SELF_AUDIT) telah
di-re-route dari `docs/knowledge-base/` ke `.agents/knowledge/`. `AGENTS.md` sudah menunjuk
ke sana. Area ini TIDAK BOLEH diganggu/diubah tanpa persetujuan Chief.

## 2026-08-11 - Migrasi project dari abyss-monorepo: salin selektif, bukan copy-paste

Source: `D:\Devops\abyss-monorepo\apps`. Target: `projects/<name>/` mengikuti
`projects/_template` + `docs/governance/SAFRS_PROJECT_CAPSULES.md`.
Pantangan keras: membaca `.env` lama (credential live), menyalin `node_modules`, `.env`,
`.next`, `.turbo`, dan lockfile. Semua project masuk sebagai kode baru yang direview, bukan lift-and-shift.

## 2026-08-10 - Golden path: Next.js + Hono RPC + Zod + PostgreSQL + Prisma

Ditetapkan lewat [ADR 0001](docs/adrs/0001-solo-developer-golden-path.md) (ACCEPTED, R2,
Chief-approved). Demonstrator: `projects/golden-path/apps/web`. Electron, WXT, Stripe, email,
AI, Python = capability pack opsional, bukan baseline.

## 2026-08-10 - Topologi monorepo: projects / packages / tools / tests / docs

Kerja produk & layanan di `projects/<project>/`; kode netral-produk di `packages/`;
tooling dev di `tools/`; test lintas-project di `tests/`. Project baru wajib mulai dari
template & kapsul SAFRS. Supersedes: topologi lama `apps/{healthcare,internal,academic,...}`.

## Baseline

- SAFRS v1.1 (`SAFRS_SPEC.md`) = otoritas normatif tertinggi. PDF korporat = eksplanatori saja;
  jika bertentangan, spec yang menang.
- Bahasa: diagnostik agent dalam Bahasa Indonesia; kode/command/identifier dalam English.
- Line endings: LF di git (`.gitattributes`); skrip `.ps1/.bat/.cmd` CRLF.
- Package manager: `pnpm` selalu. Node >= 24.18 < 25.
