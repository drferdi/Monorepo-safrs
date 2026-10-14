# Migration report

Date: 2026-10-14
Source: active `Sentrapediasite/sentrapedia-transformation` checkout, including Gaffer-approved uncommitted work.

The initial copy carried 136 byte-verified files (130.09 MiB) under `source/`, `assets/`, `site/`, `scripts/`, and `reference/design-integrity.json`. `docs/migration-manifest.json` records SHA-256 for each carried file. The copy excludes `.git`, environment files, cookies, Retriever archives, authoring captures and dependencies, and historical screenshots. No source dataset was deleted.

The site subsystem's `.gitattributes` is configured to preserve the carried closure's original bytes in Git; the monorepo's default LF normalization would otherwise change some mirrored CRLF files and invalidate the migration hashes after a fresh checkout. The complete 136-file closure is staged, including the one path affected by the root ignore rule.

Git staging exposed a repository ignore collision: the root `.gitignore` pattern `dist/` excludes the mirrored Bootstrap path `site/vendor/cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css`. That exact file was force-added without broadening the ignore policy, and `git ls-files --stage` confirmed it is present in the index. Jev stopped a second staged-hash implementation after an earlier policy rejection, so the repository relies on the passing migration verifier, byte-preserving attributes, complete staged path inventory, and post-commit checkout proof.

## Verification

The following commands passed with exit code 0 from the site subsystem root on Node.js 24.18.0: `node --run install:check`, `node --run build`, `node --run lint` (syntax checks for 22 maintained JavaScript files), `node --run test` (13/13), `node --run verify` (23 protected presentation files unchanged, 48 local targets, 0 errors), and `node --run deploy:dry-run`. `node --run start` served the site with HTTP 200 and the expected hero markup.

A fresh copy of this site subsystem at `C:\Users\drfer\AppData\Local\Temp\sentrapedia-website-extraction-20261014-final` passed the same install, build, lint, test (13/13), verify, dry-run, and HTTP smoke checks (hero and token CSS returned 200). It resolved no monorepo-root dependency. A focused migration test also passed after an empty `.git` directory was added to that disposable copy, proving a future standalone Git checkout is accepted. Structural checks `check_topology.py` and `check_project_independence.py` passed; the latter still reports one pre-existing non-conforming capsule elsewhere in the repository.

The latest root `pnpm governance` run reached 13 of 14 checks. Topology and project independence passed; `check_sensitive_changes.py` failed against the inherited branch-wide diff base, which contains 7,969 unrelated changed files and stale integrity review state. After the topology correction, website state is recorded in the parent Sentrapedia handoff. The first `pnpm project:status` attempt failed because the test script's shell glob was interpreted as a missing capsule path; the script now uses `node --test`, and direct site tests and independence checks pass. That aggregate CLI was not repeated after Jev's stop-retry decision.

## Open checks

The direct video play/pause browser interaction was inconclusive after its locator failed; reduced-motion fallback, responsive layout, keyboard workflow expansion, navigation, CTA routing, and single-source video behavior passed browser checks. Contact delivery remains unverified; no live message was sent. Root governance remains partially blocked by the inherited sensitive-change baseline, and aggregate project status was not repeated. Independent R2 review found no critical boundary defect and identified the root handoff collision, Git checkout test, HTTPS origin, token provenance, and asset license inventory. Git inclusion and HTTPS origin are fixed; token and asset provenance are recorded in `docs/design-tokens.md`. Root handoff ownership, post-commit checkout proof, broader token conformity, and third-party distribution rights remain open.

The 2026-10-14 hero follow-up replaced the stage's GSAP sequence with CSS keyframes so the neuron enters before the wordmark even when Chrome throttles a background tab. The source and capsule CSS/JS bytes and manifest hashes were updated together. Local capsule build, lint, test (13/13), and verify passed with exit code 0; Chrome observed the intended order and a fully visible reduced-motion fallback. The earlier fresh extraction proof predates this follow-up and was not rerun for this visual-only change.

Gaffer's later 2026-10-14 correction removed the generic benefit copy and CTA from the hero. The centered neuron and Sentrapedia `h1` are its only content. Authored and generated site files match; the 136-file migration manifest has zero hash mismatches. Site build, lint, test (13/13), and verify passed with exit code 0. Chrome preview confirmed the logo loaded, the hero contained only Sentrapedia text, and 390 px and 320 px widths had no horizontal overflow. The ignored Bootstrap path is tracked; post-migration full-capsule extraction proof remains open.

On 2026-10-14 Gaffer superseded the temporary sibling-capsule placement. The complete website closure moved with Git history to `projects/healthcare/sentrapedia/apps/site`; nested capsule contract and agent state were removed, and the parent Sentrapedia lifecycle now invokes the site gates.
