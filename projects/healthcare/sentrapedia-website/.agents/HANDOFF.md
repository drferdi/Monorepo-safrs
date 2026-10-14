# Sentrapedia website handoff

## Current state - 2026-10-14

- Capsule: `projects/healthcare/sentrapedia-website`; public marketing website, separate from the Sentrapedia clinical application.
- Visual direction: centered neuron enters first, followed by the Sentrapedia wordmark; no generic benefit copy or CTA in the hero.
- Authority: `PROJECT_GENOME.yaml` and `docs/spds/read_first.md`. SPDS contains 96 active documents: CORE 31, CONDITIONAL 43, DOMAIN 10, SENTRA 12, plus the genome.
- Healthcare boundary: no intended medical use, no IEC 62304 safety class, no AI runtime, and no autonomous-agent function. Examples remain synthetic and physician authority must stay explicit.
- Migration closure carries 136 byte-verified files from the approved source checkout. `docs/migration-manifest.json` and `docs/migration-report.md` record the source and evidence.
- Open production gates: approved host/domain/TLS, sender and real delivery proof, lawful basis and retention, telemetry/rollback/on-call, and third-party redistribution rights.
- Git boundary: root `.gitignore` pattern `dist/` ignores the required mirrored Bootstrap asset. The exact file was force-added and confirmed in the index without broadening the ignore policy.
- Verification: capsule install check, build, SPDS verification (96 documents), lint (23 authored JavaScript files), tests (13/13), presentation verification (23 protected files and 48 local targets), and deploy dry-run passed with exit code 0. Topology passed. Root governance reached 13/14 and stopped only at inherited branch-wide sensitive-change review.
- Git staging: the complete capsule and healthcare registration are staged; the ignored Bootstrap file was force-added and confirmed in the index. Preserved third-party/minified whitespace is covered by byte-preserving attributes and migration hashes.
- No push, deployment, live contact submission, production credential use, or clinical logic change is authorized.
