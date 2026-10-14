# Sentrapedia public site subsystem

Read `../../AGENTS.md`, `../../.agents/HANDOFF.md`, `../../.agents/CONTEXT.md`, `../../.agents/DECISIONS.md`, and `docs/spds/read_first.md` before changing this site. `SITE_GENOME.yaml` is the machine-readable site record. The Sentrapedia capsule, healthcare domain, and monorepo instructions continue to apply.

This directory owns the public marketing surface within the same Sentrapedia product capsule as the clinical workspace. Site code may use only its local closure or explicitly governed capsule-local interfaces. Use synthetic examples, keep physician decision authority explicit, and do not activate a production contact service during local verification.

## Commands

From this site root with Node.js 22+:

- `node --run install:check`: validate local, dependency-free inputs.
- `node --run build`: regenerate the served site from local source.
- `node --run lint`: syntax-check authored JavaScript without rewriting it.
- `node --run test`: run local site and migration-boundary tests.
- `node --run verify`: validate presentation integrity, local resources, media, and HTTP range delivery.
- `node --run docs:verify`: validate the SPDS inventory, frontmatter, and healthcare non-device boundary.
- `node --run start`: preview at `http://127.0.0.1:3401` unless `PORT` is set.
- `node --run deploy:dry-run`: read-only artifact check; it does not publish.

No package installation is required for this static runtime. The parent capsule lifecycle invokes the site gates through `../../package.json`. Optional Remotion authoring remains in the independent source repository and is not part of this site lifecycle. Do not run automatic formatters or lint fixers. Before any migration change, update `docs/migration-manifest.json` from an explicitly reviewed source checkout and verify every carried file by hash.
