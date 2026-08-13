# Project wizard

## Purpose

`pnpm project:new` (implemented in `tools/project-wizard/src/cli.mjs`) scaffolds a new SAFRS project capsule under `projects/<slug>/` from the repository template `projects/_template/`. A capsule is the governance contract for a project — `AGENTS.md`, `README.md`, `docs/architecture.md`, `docs/data.md`, `docs/testing.md`, `src/README.md`, `tests/README.md` — with placeholders resolved to the wizard's answers. It creates **no application code**: implementation is a separate, authorized task.

## Key source files

| File | Purpose |
| --- | --- |
| `tools/project-wizard/src/cli.mjs` | CLI: argument parsing, prompting, preview/apply, locked publication |
| `tools/project-wizard/src/model.mjs` | Normalizes untrusted answers into the bounded SAFRS project model |
| `tools/project-wizard/src/render.mjs` | Renders the capsule files deterministically from the template |
| `tools/project-wizard/package.json` | Package metadata (`@safrs/project-wizard`); tests via `node --test` |
| `projects/_template/` | The template capsule every new project is rendered from |

## How it works

### Model normalization (`tools/project-wizard/src/model.mjs`)

Untrusted wizard answers are normalized into a bounded model. `normalizeProjectAnswers`:

- validates `name` (non-empty, no control characters), `problem`, and `kind` (`web` | `desktop` | `extension`);
- slugifies the name (NFKD → lowercase → `[a-z0-9-]`), rejects reserved Windows device names (`con`, `prn`, …) and unsafe slug sources (paths, `..`, control/URL-decoded tricks);
- normalizes `capabilities` and `sensitiveDomains` choice lists (deduped, slugified, sorted);
- validates `appBinding` as a bounded path below `apps/` (default `apps/<kind>`);
- computes the minimum risk from declared fields — any term matching healthcare/finance/auth/payments/migrations/shared-package keywords, or a shared-package impact, forces at least **R2**; the declared risk can only raise it further.

### Rendering (`tools/project-wizard/src/render.mjs`)

`renderProjectCapsule` copies each template file through `safeTemplateText` — a symlink- and TOCTOU-hardened read that rejects any template path that is a symlink or escapes the template root — substitutes the model values, appends generated capsule context to the docs (app binding, capabilities, sensitive domains, computed risk, topology check command), and fails if any template placeholder marker remains.

### Applying (`tools/project-wizard/src/cli.mjs`)

`applyProjectCapsule` publishes with **one exclusive per-slug lock** and **no replacement**:

1. acquires a per-slug `wx` lock with a UUID marker in `projects/`,
2. writes the rendered files into an owned staging directory (with random-UUID ownership markers),
3. re-validates the `projects/` root and the staging identity before publishing,
4. moves the staged capsule into `projects/<slug>/` without clobbering an existing directory, and
5. quarantines anything that changed identity mid-operation instead of deleting it.

## CLI usage

```bash
pnpm project:new                     # interactive prompts (Nama proyek, masalah, jenis, kemampuan, domain sensitif)
pnpm project:new --preview           # render + print preview without writing
pnpm project:new --apply             # render, confirm, and write
pnpm project:new --input answers.json --apply
pnpm project:new --input answers.json --preview --confirm "CREATE <slug>"
```

Confirmation must exactly equal `CREATE <slug>` before anything is written.

## Integration points

- **`projects/_template/`** is the single template source; `check_topology.py` verifies every created capsule still satisfies the required capsule layout.
- **`tools/capabilities`** operates on the capsule's `capabilities.json` afterwards.
- **`tools/safrs/check_topology.py`** validates the produced capsules (required files, no unresolved `<replace-…>` placeholders).

## Verification

```bash
node --test tools/project-wizard/test/*.test.mjs
pnpm run doctor          # read-only diagnostics before running the wizard
```

## Related pages

- [Tools overview](index.md)
- [Capabilities](capabilities.md) — add optional capabilities to a generated capsule
- [SAFRS governance checkers](safrs.md) — `check_topology.py` validates capsules
- [Project capsules](../../docs/governance/SAFRS_PROJECT_CAPSULES.md) — the capsule convention
