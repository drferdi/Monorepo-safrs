# Vendored contract

These files are copies. The contract is owned by Med Assist; change it there first, then copy it
here and update this table. `tests/test_contract.py` compares the copies with the source when
`MED_ASSIST_CONTRACT_DIR` points at `med-assist/lib/diagnosis-engine/contract`.

- Source repository: Med Assist capsule `projects/healthcare/med-assist` in the Sentra Monorepo
- Source path: `lib/diagnosis-engine/contract/`
- Source commit: `4d3e8b65a9dd73a5eb91542bd2ea1154db7af645` (2026-09-27, branch
  `feat/diagnosis-engine-interface`)
- Contract version: `1`

| File | SHA-256 |
| --- | --- |
| `mira-step-request.schema.json` | `7e58f2f440ce682831ac97a7894246a717ec92a86865cc4b6fa8146ee887df01` |
| `mira-step-response.schema.json` | `b5048ad8fa750886dd7780435e1e09aabfb8299bbb1b49d0f1ca753154aef171` |
| `examples/mira-step-request.example.json` | `b5be590734e7cbb01be30abef776d17bf791c27b60b826849a05987e31826ba3` |
| `examples/mira-step-response.example.json` | `787d11fbcb737faac6ddcdbb9b1bea5709b887b50bf882b73b93ad063511fadd` |

`mira-step-response.schema.json` differs from the Med Assist source by one optional property,
`therapy` (2026-10-09, Sentrapedia extension, filled only with `MIRA_FAST_THERAPY=true`). Med Assist's
source is unchanged, so `test_vendored_contract_matches_med_assist` reports that file until Med Assist
adopts the property. Source SHA-256 before the extension: `6bb903b94fc7d3b55a33cd230f2e44e9f295128eaaecd0c3547d5701f8d3bde4`.

`mira-step-request.schema.json` adds the optional `grounding` envelope (2026-10-10,
Sentrapedia Oracle II extension approved by Gaffer including this local service).
This capability-gated service extension preserves all legacy v1 case fields and required
properties; it is not an identical copy of the Med Assist source. The request source
SHA-256 before this extension was `84eba75c9810b794d1875dde77fc204dd5515b879056a8b47c60eef398e607dc`.
The current hashes above describe the local service contracts. Med Assist adoption is
a separate work item; do not modify its contract as part of this implementation.
