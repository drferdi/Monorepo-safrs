# project-standalone

**Path:** `tools/project-standalone/`
**CLI:** `node tools/project-standalone/src/cli.mjs`

```text
pnpm project:status
pnpm project:status academic/academic-smartboard
pnpm project:verify product/kediri-history
```

`status` lists capsules that have a `project.contract.json`. `verify` requires a `domain/capsule` selector.

Implementation: `src/verify.mjs` (empirical extraction), `src/contract.mjs` (schema), default structural checker `tools/safrs/check_project_independence.py`.

This tool is how I-06 (executable evidence) is operationalized. Passing prose in a README is not standalone proof.

## Related

- [Standalone verification](../verification/standalone.md)
- [Capsule sovereignty](../governance/capsule-sovereignty.md)
