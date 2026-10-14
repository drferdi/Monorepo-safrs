# Sentrapedia website capsule

Read `docs/spds/read_first.md`, `.agents/HANDOFF.md`, `.agents/CONTEXT.md`, and `.agents/DECISIONS.md` before changing this capsule. `PROJECT_GENOME.yaml` is the machine authority root. The monorepo root and healthcare domain instructions apply when this checkout is inside the monorepo.

This capsule owns the public Sentrapedia marketing website only. The clinical application at `projects/healthcare/sentrapedia` is independent. Do not import it or its configuration. Use synthetic examples, keep physician decision authority explicit, and do not activate a production contact service during local verification.

## Commands

From this capsule root with Node.js 22+:

- `node --run install:check`: validate local, dependency-free inputs.
- `node --run build`: regenerate the served site from local source.
- `node --run lint`: syntax-check authored JavaScript without rewriting it.
- `node --run test`: run local site and migration-boundary tests.
- `node --run verify`: validate presentation integrity, local resources, media, and HTTP range delivery.
- `node --run docs:verify`: validate the SPDS inventory, frontmatter, and healthcare non-device boundary.
- `node --run start`: preview at `http://127.0.0.1:3401` unless `PORT` is set.
- `node --run deploy:dry-run`: read-only artifact check; it does not publish.

No package installation is required for this static runtime. Optional Remotion authoring remains in the independent source repository and is not part of this capsule lifecycle. Do not run automatic formatters or lint fixers. Before any migration change, update `docs/migration-manifest.json` from an explicitly reviewed source checkout and verify every carried file by hash.
