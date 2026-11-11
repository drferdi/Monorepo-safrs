---
name: capsule-extract
description: Check that a project capsule survives standalone extraction and a subtree split — the Git-level gaps (root .gitattributes, root .gitignore, line endings) that the working-tree extraction verifier misses. Use before declaring a capsule standalone or splitting it into its own repository.
---

# Capsule extraction check

Process authority stays in root `AGENTS.md` (Known Non-Conformance & Remediation, Completion &
Verification Gate) and `docs/governance/CAPSULE_SOVEREIGNTY.md`. This skill only adds the
checks those documents leave implicit.

## Why

`pnpm project:verify` copies **working-tree** files into the extraction. A subtree split exports
**Git blobs** and only the capsule's own `.gitattributes` and `.gitignore`. Sentrapedia passed in
the monorepo and failed standalone three times. See "Standalone extraction after the site move -
2026-10-14" in `projects/healthcare/sentrapedia/.agents/HANDOFF.md` (fixes `2506cdee`,
`21d633d9`, `b6e33cec` on `codex/sentrapedia-website-docs`).

## Sequence

`<capsule>` is `projects/<domain>/<name>`; `<id>` is `<domain>/<name>`.

1. **Verifier.** `pnpm project:status <id>`, then `pnpm project:verify <id>`. If install or tests
   miss files, read `<capsule>/project.contract.json`: `artifacts` and `mutableStatePaths` are
   left out of the extraction, so they must never list tracked inputs that install, tests, or
   build read (Sentrapedia lost 68 tracked site files this way; its `artifacts` is now
   `.next/BUILD_ID` only).
2. **Root-only attributes.** `git ls-files <capsule> | git check-attr --stdin filter eol` shows
   each file's effective attributes. Every attribute that comes from the root `.gitattributes`
   must be repeated in `<capsule>/.gitattributes`, above all `filter: lfs`. Otherwise clones
   of the split get LFS pointer text instead of files.
3. **Root-ignored inputs.** `git ls-files --others --ignored --exclude-standard --directory <capsule>`
   lists ignored paths that exist only locally. Skip build output and `node_modules`. Any file a
   manifest, contract, or test expects (vendored bundles under `dist/`, for example) must be
   tracked.
4. **Line endings.** `git ls-files --eol <capsule>` and look for `i/lf w/crlf` next to
   `attr/... eol=lf`. That is a local-checkout artifact, not a repository defect: a fresh clone
   passes. Record it in the capsule HANDOFF and do not rewrite the blob. Only `i/crlf` under
   `eol=lf` needs `git add --renormalize`.
5. **Split proof (before publishing).** `git subtree split --prefix=<capsule> -b <capsule>-split`,
   then clone that branch into a temporary directory and run its install, lint, typecheck, and
   test there. This tests Git content, not the smudged working tree.

Record the commands and exit codes in `<capsule>/.agents/HANDOFF.md`.

## Never

- Push a split branch or create the standalone repository without Gaffer's explicit approval.
- Edit `tools/project-standalone/**` or the contract schema to make a capsule pass: they are
  verification controls.
