# DECISIONS — Durable Choices

Append-only, newest first. Each entry: date, decision, brief rationale, evidence/status.
Major architectural decisions also get an ADR in `docs/adrs/`.
Never delete entries — reversals are new entries ("supersedes ...").

---

## 2026-08-11 - All repo docs in English, maximally concise

Chief's standing preference: every doc in this repo is written in English and kept as short as
possible without losing meaning. Agent chat diagnostics remain in Bahasa Indonesia.
Historical archives (docs/bootstrap, docs/evidence, docs/superpowers) keep their original text.

## 2026-08-11 - Memory routing: registry-driven, HANDOFF machine-enforced

Five memory files registered in `.safrs/document-registry.json` with `normativity`/`scope`/`read_order`;
the `AGENTS.md` Read order block is generated from the registry (`tools/safrs/generate_routing.py`).
MUST-always (~2k tokens): 00_READ_FIRST → HANDOFF → 02 → 03 → 04 → 12_LESSONS.
`SAFRS_SPEC.md` demoted to SHOULD (token budget; operative rules mirrored in `AGENTS.md`).
`check_handoff.py` in `safrs-verify.sh` requires a HANDOFF update on any non-trivial change set.
Router duplication removed from `00_READ_FIRST`/`CONTEXT.md` — one source of read order.
Pattern references: Cline Memory Bank, AGENTS.md 2026 conventions.

## 2026-08-11 - Agent memory files: CONTEXT / DECISIONS / HANDOFF / PROGRESS / 12_LESSONS

Five memory files adopted, all under `.agents/`: `CONTEXT.md` (identity), `DECISIONS.md` (this file),
`HANDOFF.md` (session state), `PROGRESS.md` (area tracker), `knowledge/12_LESSONS.md` (reusable
corrections). Replaces the monolithic `.agent/` pattern from `abyss-monorepo` — pattern adopted,
old content NOT migrated. Supersedes the legacy `.agent/` approach.

## 2026-08-11 - `.agents/knowledge/` is the knowledge base location

Numbered KB (00_READ_FIRST … 11_RESPONSE_STANDARDS, 12_LESSONS, 99_SELF_AUDIT) re-routed from
root via `docs/knowledge-base/` to `.agents/knowledge/`. `AGENTS.md` routes there. Do not modify
without Chief's approval.

## 2026-08-11 - Migration from abyss-monorepo: selective copy, never lift-and-shift

Source: `D:\Devops\abyss-monorepo\apps`. Target: `projects/<name>/` per `projects/_template` +
`docs/governance/SAFRS_PROJECT_CAPSULES.md`. Hard bans: reading the old `.env` (live credentials);
copying `node_modules`, `.env`, `.next`, `.turbo`, lockfiles. Everything enters as new, reviewed code.

## 2026-08-10 - Golden path: Next.js + Hono RPC + Zod + PostgreSQL + Prisma

Set by [ADR 0001](docs/adrs/0001-solo-developer-golden-path.md) (ACCEPTED, R2, Chief-approved).
Demonstrator: `projects/golden-path/apps/web`. Electron, WXT, Stripe, email, AI, Python are
optional capability packs, not baseline.

## 2026-08-10 - Monorepo topology: projects / packages / tools / tests / docs

Product work in `projects/<project>/`; product-neutral code in `packages/`; dev tooling in `tools/`;
cross-project tests in `tests/`. New projects start from the template + SAFRS capsule.
Supersedes the legacy `apps/{healthcare,internal,academic,...}` topology.

## Baseline

- SAFRS v1.1 (`SAFRS_SPEC.md`) is the highest normative authority. Corporate PDFs are explanatory;
  on conflict, the spec wins.
- Language: agent diagnostics in Bahasa Indonesia; docs/code/commands/identifiers in English.
- Line endings: LF in git (`.gitattributes`); `.ps1/.bat/.cmd` CRLF.
- Package manager: always `pnpm`. Node >= 24.18 < 25.
