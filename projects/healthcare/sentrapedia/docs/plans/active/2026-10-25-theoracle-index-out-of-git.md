# Proposal: stop carrying the generated TheOracle vectors in git history

Status: **awaiting Gaffer's decision**. Nothing is implemented. Risk tier **R2** (install and deploy boundary).
Written 2026-10-25 from the open item left by the 2026-10-25 publish (`.agents/HANDOFF.md`, top entry).

## Recommendation in one line

Take **`theoracle/index/vectors.f32` out of git** and fetch it as a pinned artefact that is verified by SHA-256
against the `manifest.json` that stays in git — the same pattern `scripts/install-theoracle-model.mjs` already uses
for the 1.2 GB embedding model (option A below). Keep `chunks.jsonl` in git; it is not a generated file (see
"Correction 2"). The beta server's normal update path does not change at all.

## The problem, as measured in this session

| Fact | Measured |
| --- | --- |
| `theoracle/index/vectors.f32` on disk | 52.4 MB, Git LFS (`.gitattributes` line 2) |
| Versions of it in this repository's history | 18 distinct LFS objects (about 950 MB) |
| Local LFS object store (`.git/lfs`) | 1.5 GB |
| Included GitHub Git LFS quota, **per account, not per repository** | 10 GiB storage + 10 GiB bandwidth a month (Free and Pro) |
| Cost of one `npm run knowledge:build` that is committed | one whole new 53 MB object; LFS stores no deltas |
| Runway at that rate | about 190 rebuilds, then a 0 USD budget blocks LFS |

Two aggravating details, both from GitHub's own billing document: storage is metered hourly over *all* objects
whatever their upload date, so the 18 objects already published keep occupying about 9% of the quota permanently;
and deleting objects mid-month does not recalculate that month. This proposal **stops the growth from here on**. It
does not recover what is already published, and it must not: no history rewrite, no force-push.

Bandwidth is being spent too, which the handoff entry did not count. Every CI run pulls LFS in **both** jobs
(`check` and `docker`), so a new index version costs about 106 MB of bandwidth on its first run after the cache
misses; and `deploy/beta/setup-server.sh` installs `git-lfs` with `git lfs install --system`, so the server's
routine `git pull --ff-only` in `update.sh` *also* downloads the 53 MB object — even though the running container
gets its index from the Docker image, not from the checkout.

## Two corrections to the premise, which change the cost table

**Correction 1 — the beta server does not build by default, so "the server needs the index at build time" is only
true in the fallback.** `deploy/beta/update.sh` has done `git pull --ff-only` plus `docker pull
ghcr.io/drferdi/sentrapedia-beta:sha-<commit>` since 2026-10-20; CI builds the image. The 12-18 minute build and the
memory squeeze beside medboard only happen under `SENTRAPEDIA_BUILD=local`. **The consumer that genuinely needs the
index at image-build time is CI**, which has a 45-minute timeout and already caches the 1.2 GB model.

A rebuild on the server is off the table in every option, and the reason is concrete: the build loads the pinned
fp32 model whose `onnx/model.onnx_data` alone is 1,234,521,088 bytes (1.15 GiB) and then embeds 17,871 chunks on
2 vCPU. The container cap is 2500m beside medboard on a 4 GB server. It cannot even load the model. No duration for
a full CPU re-embed is recorded anywhere in git — I am not going to invent one — but `--device dml` (GPU) and
`--append` exist in `scripts/build-theoracle-index.mjs` precisely because a full CPU rebuild is long.

**Correction 2 — `chunks.jsonl` is not a generated file, and it is cheap in git. Only the vectors should move.**
`scripts/build-theoracle-chunks.mjs` line 66 reads the guideline library *out of the current `chunks.jsonl`*, and
its own comment says so: "The library is read from the current chunks.jsonl, so a title dropped here comes back only
from git history."

So 15,586 of the 17,871 chunks have no other source: the SSOT regenerates only the 2,285 SSOT rows. `chunks.jsonl`
is a **primary source**, and git history is its backup. It is also cheap, because it is plain text and not LFS: the
18 versions in history pack down to **11.3 MB in total** (measured here with `git pack-objects`). It stays tracked.

The loader verifies both files against the manifest (`src/lib/theoracle-grounding.ts`, `loadIndex`), so whatever is
chosen, chunks and vectors must always arrive as a matched pair.

## Option A — pinned artefact outside git, verified by SHA-256 (recommended)

`vectors.f32` becomes an untracked, gitignored build output, exactly like `theoracle/model/`. A new
`scripts/install-theoracle-index.mjs`, modelled line for line on `install-theoracle-model.mjs`, reads the tracked
`theoracle/index/manifest.json`, downloads `vectors-<indexSha256>.f32` and accepts it only if its SHA-256 equals
`manifest.vectors.sha256`. **The manifest is the pin** — it already carries `chunks.sha256`, `vectors.sha256` and
`indexSha256`, it is 1.9 KB of reviewable text, and a knowledge commit therefore still records exactly which index
version it belongs to. A `SENTRAPEDIA_SKIP_INDEX=1` escape mirrors the existing `SENTRAPEDIA_SKIP_MODEL=1`.

Where the artefact lives — the one thing I need Gaffer to confirm:

- **A1 (my pick): a GitHub release asset on the private `drferdi/Sentrapedia`.** GitHub's documentation puts release
  assets at 2 GiB per file with "no limit on the total size of a release, nor bandwidth usage", and the Git LFS
  billing page does not mention release assets at all, so they sit outside the 10 GiB quota. CI needs **no new
  secret**: the built-in `github.token` can download a release asset from its own repository. This assumes
  `drferdi/Sentrapedia` itself stays private and the public code tree is a separate mirror, which is how
  `.github/workflows/ci.yml` already describes it ("The public code mirror never publishes"). If that assumption is
  wrong, A1 is wrong, because a release on a repository that later goes public would expose the private database.
- **A2: Cloudflare R2** (Gaffer already runs Cloudflare Tunnel and Access): 10 GB free, no egress fees, and the
  database never touches GitHub. Costs one new service plus credentials in three places (CI, Gaffer's machine, the
  server fallback).
- **Rejected: a sibling private data repository with LFS.** `scripts/private-data.mjs` already points
  `theoracle/index/` at that repository, and `export-split.mjs` even writes it a `.gitattributes` LFS rule — but the
  LFS quota is **per account**. Moving the file to another repository under `drferdi` moves the growth into the same
  10 GiB and fixes nothing.
- **Rejected: GHCR as an OCI artefact.** The credential already exists on both sides, but private Packages storage
  is already a metered, paid line in this project (`deploy/beta/README.md`: 500 MB free against roughly 1.8 GB
  images), so 53 MB per rebuild would be billed rather than free.

Cost on the beta server: **none on the normal path** — it pulls the image CI built, and the index is already baked
into its own layer by the Dockerfile. Under `SENTRAPEDIA_BUILD=local` the fallback runs the installer instead of
`git lfs pull`: the same 53 MB download, no rebuild, no memory pressure. It needs one new read-only credential there
(a fine-grained `contents: read` token for A1), because the existing SSH deploy key and the `read:packages` PAT do
not cover release assets. In exchange, the routine `git pull` stops downloading 53 MB.

Cost to `export:split`: real, and it must be handled in the same change. Once untracked, `git ls-files` no longer
lists the vectors, so `<out>/data` would silently lose them and the generated `data/README.md` instruction ("copy
this folder's contents over a checkout") would become false. The fix is small: copy the installed vectors from the
working tree explicitly, keep the LFS-pointer guard for everything else, and drop the now-dead `vectors.f32` line
from the generated `data/.gitattributes`.

Files it touches: `.gitattributes` (remove the vectors LFS line) · `.gitignore` (add `theoracle/index/vectors.f32`)
· one `git rm --cached theoracle/index/vectors.f32` commit (history keeps the old blobs; nothing rewritten) ·
**new** `scripts/install-theoracle-index.mjs` · **new** publish step for the artefact (a script, or a documented
`gh release upload` after `knowledge:build`) · `package.json` (`postinstall`) · `scripts/export-split.mjs` ·
`.github/workflows/ci.yml` (both jobs: fetch and cache keyed on `indexSha256`, in place of the index's LFS pull) ·
`deploy/beta/update.sh` and `deploy/beta/README.md` · `deploy/beta/setup-server.sh` (the token) ·
`tests/export-split.node-test.mjs` · `tests/scripts.node-test.mjs:262` ("the **committed** index" becomes
"installed") · `docs/data.md` · `.agents/AGENT-CONTEXT.md` (publish check 3 and the private-data section) ·
`.agents/DECISIONS.md`. No `Dockerfile` change: the index is fetched into the checkout before `docker build`, and
`.dockerignore` does not exclude it. `tests/lfs-media.node-test.mjs` is unaffected — it covers mp4, webm and webp.

Growth after this: **zero**. A knowledge session adds a 1.9 KB manifest and a few hundred KB of `chunks.jsonl` delta.

## Option B — keep LFS, but commit the vectors only at publish points (smallest change)

Nothing moves out of git. A guard refuses a commit that changes `vectors.f32` unless the commit is a deliberate
knowledge release, so the intermediate rebuilds of a working session collapse into one committed version.

Cost on the beta server: **nothing changes anywhere** — not CI, not the Dockerfile, not `update.sh`, not
`export:split`. That is the whole appeal. Files touched: a new hook (the repository has `.husky/pre-push` only, so
this would be a `pre-commit` or a test), `docs/data.md`, `.agents/AGENT-CONTEXT.md`.

What it does not do: it does not solve the problem, it divides it. The 2026-10-25 publish carried 17 rebuilds, so
this is roughly a 17-fold reduction — about 53 MB per published knowledge release instead of per rebuild, and the
runway moves from about 190 rebuilds to about 190 releases. The quota is still consumed in one direction only, and
the LFS clause of publish check 3 still goes red on every knowledge release. Worth taking only as a stop-gap, or if
Gaffer wants no new moving parts at all before the beta opens.

## Option C — keep LFS, split the vector file by layer (cheap, but it touches the clinical path)

The 15,586 guideline-library vectors are byte-stable across rebuilds (the handoff archive records min cosine
0.99999994 against the previous index); only the 2,285 SSOT rows actually change. `build-theoracle-chunks.mjs`
already writes SSOT rows first and library rows second, so the vector file is already partitioned. Split it into a
`vectors-library.f32` (about 45.6 MB, changes almost never) and a `vectors-ssot.f32` (about 6.7 MB, changes every
rebuild).

Growth drops to about 6.7 MB per rebuild, roughly 8 times less — about 1,500 rebuilds of runway — with no new
service, no new credential, and no change to CI, the Dockerfile, `update.sh` or `export:split`.

The reason I do not recommend it: it is the only option that changes the manifest format and
`src/lib/theoracle-grounding.ts`, that is, the retrieval path that feeds the therapy evidence gate. Options A and B
touch install and deploy plumbing, where a mistake fails loudly at build time. A mistake in the row-offset
arithmetic here could silently pair a passage with the wrong vector, which is a clinical-content risk, and it would
need a fresh benchmark run to rule out. Cheaper on quota, dearer in risk.

## Summary

| | A: artefact outside git | B: commit at publish points | C: split the vector file |
| --- | --- | --- | --- |
| Growth per rebuild | 0 | about 53 MB per *release* | about 6.7 MB |
| Beta server, normal path | unchanged | unchanged | unchanged |
| Beta server, local-build fallback | installer replaces `git lfs pull`; one new read-only token | unchanged | unchanged |
| Index rebuilt on the server | never | never | never |
| `export:split` | must copy the untracked vectors into `data/` | unchanged | unchanged |
| CI | fetch and cache on `indexSha256` | unchanged | unchanged |
| Touches the retrieval path | no | no | **yes** |
| New external dependency | a release asset (A1) or R2 (A2) | none | none |

**Recommended: A1**, with `chunks.jsonl` staying in git. It is the only option that actually stops the growth, it
reuses two patterns the capsule already owns (`install-theoracle-model.mjs` for the pinned fetch, `manifest.json`
for the hashes), and it leaves the clinical retrieval path untouched.

**One question before implementation:** is `drferdi/Sentrapedia` staying private, with the public code tree
published as a separate mirror? If yes, A1 as written. If that repository itself is to become public, the artefact
must go to R2 instead (A2), because its releases would become public with it.

## What happens next

No code changes until Gaffer picks. On his word: one branch, the change in the order above (installer and publish
step first, so the artefact exists before anything stops tracking the file), `npm run test:all` plus `npm run build`
and `npm run deploy:dry-run` as evidence, and a documented rollback — re-adding `vectors.f32` to git restores
today's behaviour exactly, since the artefact and the git blob are byte-identical by construction.
