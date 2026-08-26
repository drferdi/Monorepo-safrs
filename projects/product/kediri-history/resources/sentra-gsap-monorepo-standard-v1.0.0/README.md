# Sentra-GSAP Standard v1.0.0

Repository-level GSAP execution standard for Sentra projects.

## What Chief needs to know

After installation, the intended interface is simply:

```text
/Sentra-GSAP
Build/redesign <what you want>.
```

The coding agent—not the operator—is responsible for GSAP architecture, plugin decisions, responsive motion, cleanup, performance, accessibility, browser QA, and the final quality gate.

## What the package installs

```text
.agents/skills/sentra-gsap/          canonical standard
.claude/skills/sentra-gsap/          Claude adapter
.claude/commands/Sentra-GSAP.md      exact slash alias compatibility
scripts/sentra-gsap/                 installer + verifier + browser QA
tests/sentra-gsap/                   standard infrastructure tests
docs/standards/sentra-gsap/          human governance docs
sentra-gsap.config.mjs               created only if absent
AGENTS.md / CLAUDE.md                managed block inserted, never replaced
```

## Installation for a coding agent

From the unpacked package, run:

```bash
node scripts/sentra-gsap/install.mjs --repo <MONOREPO_ROOT>
```

Use `--dry-run` first when desired. The installer is idempotent and preserves existing root instructions/configuration outside its marked blocks.

Then run:

```bash
<package-manager> run sentra:gsap:test-standard
```

Ensure the repository has `@playwright/test` and installed browser binaries for browser QA.

## First project configuration

Review `sentra-gsap.config.mjs`:
- point `scanPaths` at frontend source;
- map non-standard typecheck/lint/test/build commands;
- list application routes;
- add route-transition journeys for multi-route experiences;
- provide the running/preview URL through `SENTRA_GSAP_URL`, config, or `--url`.

Do not disable required gates merely because configuration is incomplete. Configure them.

## Verification

```bash
<package-manager> run sentra:gsap:verify -- --url http://localhost:3000
```

A required gate that is not run is a FAIL. See `docs/standards/sentra-gsap/QA.md`.
