# DECISIONS

Append-only, newest first. Record only durable decisions that concern this capsule. Each entry
has a dated heading, the decision, a short rationale, and its evidence.

## 2026-08-21 - Sentra Bot capsule CURRENT docs match wired auth and web host

Migrated from root .agents/DECISIONS.md (original date kept).

Capsule documentation was realigned to implementation: Better Auth is mounted at `/api/auth/[...all]` (signup still closed by default), `@safrs/api` is mounted same-origin at `/api/sentrabot` on sentrabot-web, Electron is in the root catalog with IPC tests (no signed artifact), Playwright e2e lives in `apps/web`, and the product landing is `apps/web` `/` (`home.html`). `apps/site` remains a Cora Vite shell, not the product origin. Pin `d17a138` stays blocked. Evidence: `projects/sentrabot/AGENTS.md`, `projects/sentrabot/README.md`, `projects/sentrabot/docs/release-parity.md`.

## 2026-08-21 - Sentra Bot Webflow marketing HTML is excluded from Biome

Migrated from root .agents/DECISIONS.md (original date kept).

Imported Webflow snapshots under `projects/sentrabot/apps/web/src/content/marketing/` stay byte-faithful to the source design (inline minified JS/CSS). Biome must not lint or reformat them — hundreds of false positives (`noAssignInExpressions`, a11y on SVG, `!important`, etc.) are expected vendor noise, not product defects. Exclude via root `biome.jsonc` `files.includes` negation (`!!…/content/marketing`), same pattern as kayyisa. Do not “fix” the HTML to silence the linter. Evidence: `biome.jsonc`, IDE diagnostics cleared on `intake.html`.

## 2026-08-21 - Sentra Bot capsule docs follow Diátaxis and a lean AGENTS.md

Migrated from root .agents/DECISIONS.md (original date kept).

Late documentation scaffold for `projects/sentrabot/` is the SSOT for humans and agents: Diátaxis map in `docs/README.md`, OpenSSF-style community files at the capsule root, C4/STRIDE/API reference as explanation and lookup, and a command-first nested `AGENTS.md` (Always / Ask First / Never). No nested Cursor rules, skills, GitHub templates, MkDocs, or claimed OpenSSF/SLSA badges. Evidence: `projects/sentrabot/docs/README.md`, `projects/sentrabot/AGENTS.md`.

## 2026-08-21 - Sentra Bot intake remains pinned and blocked

Migrated from root .agents/DECISIONS.md (original date kept).

Sentra Bot is established as the official capsule at `projects/sentrabot/` with the Monorepo stack, a private worker control plane, closed self-host signup, per-user BYOK/OAuth, and a staged public-source/self-hosted release train. The requested source snapshot remains exactly `D:/DEV/Sentraverse/sentrabot@d17a138`; the available source refs expose `origin/main@7f08da5`, so `HEAD` is not substituted and no source files or runtime data are copied. Evidence: `docs/adrs/0004-sentrabot-public-release.md`, `projects/sentrabot/docs/provenance.md`, and `projects/sentrabot/docs/migration-ledger.md`.

Chief instructed end-to-end continuation. Therefore `7f08da5` is the provisional technical-port baseline, while `d17a138` remains the locked acceptance pin and its absence remains a release blocker.

## 2026-09-25 - Capsule token gate as a ratchet; security overrides in package.json

- Token gate: `scripts/check-tokens.mjs` (run by `lint`) applies the root raw-value rule to `apps/web/src`. The root gate never passed on this path (1277 raw values at `main` 481801fc), so the 1268 existing values are recorded per file in `scripts/token-baseline.json`. A file above its baseline, or a new file with raw values, fails; `--lower-baseline` only records reductions. Migrating the legacy values to tokens is open UI work.
- Security: `pnpm.overrides` in `package.json` pins `deepmerge-ts >=8.0.1`, `mysql2 ^3.22.0`, `fast-uri ^3.1.6`, `sharp >=0.35.4` (high advisories via prisma 7.10.0). pnpm 9.15.0 ignores `overrides` in `pnpm-workspace.yaml`, so the existing `react`, `react-dom`, and `better-auth` overrides there have no effect.
- Evidence: `pnpm audit` 0 high (3 moderate: uuid via @testcontainers/postgresql, decode-uri-component); gate negative test fails on one added `#123456`.

## 2026-09-26 - All pnpm overrides in package.json

- Decision (Chief): the `react` 19.2.3, `react-dom` 19.2.3, `better-auth` 1.6.27 overrides move from `pnpm-workspace.yaml` to `package.json` `pnpm.overrides`, so every override is in the one place pnpm 9.15.0 reads.
- Evidence: lockfile keeps all 2833 resolved package entries; only react/react-dom/better-auth specifiers and peer ranges change.
