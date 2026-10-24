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
| `aadi-step-request.schema.json` | `48b78a529c57cdd7ecb8bcf338ffeb7b5807cc5eb40cb366dc5376d6dfe9ea5c` |
| `aadi-step-response.schema.json` | `5594dec0a998219d6bbdc6c4a83cb6fee5dfde42bb4f6016ec8d4078eca17e78` |
| `examples/aadi-step-request.example.json` | `b5be590734e7cbb01be30abef776d17bf791c27b60b826849a05987e31826ba3` |
| `examples/aadi-step-response.example.json` | `787d11fbcb737faac6ddcdbb9b1bea5709b887b50bf882b73b93ad063511fadd` |

`aadi-step-response.schema.json` differs from the Med Assist source by one optional property,
`therapy` (2026-10-09, Sentrapedia extension, filled only with `AADI_FAST_THERAPY=true`). Med Assist's
source is unchanged, so `test_vendored_contract_matches_med_assist` reports that file until Med Assist
adopts the property. Source SHA-256 before the extension: `6bb903b94fc7d3b55a33cd230f2e44e9f295128eaaecd0c3547d5701f8d3bde4`.

`aadi-step-request.schema.json` adds the optional `grounding` envelope (2026-10-10,
Sentrapedia Oracle II extension approved by Gaffer including this local service).
This capability-gated service extension preserves all legacy v1 case fields and required
properties; it is not an identical copy of the Med Assist source. The request source
SHA-256 before this extension was `84eba75c9810b794d1875dde77fc204dd5515b879056a8b47c60eef398e607dc`.
The current hashes above describe the local service contracts. Med Assist adoption is
a separate work item; do not modify its contract as part of this implementation.
On 2026-10-11 Gaffer made TheOracle the single source of truth for Sentra knowledge: the
envelope is now `theoracle-grounding-v1` with corpus name `TheOracle` (was
`oracle-grounding-v1` / `Oracle II`).
On 2026-10-11 Gaffer approved the vector-only TheOracle (local EmbeddingGemma-300m): the
envelope is now `theoracle-grounding-v2`. The corpus carries `indexSha256` and `embeddingModel`
(id, revision, dtype, dims); each evidence item carries `similarity` and a `source` of `title`,
`docSource`, `origin` and `textSha256`. PDF page, Drive URL and extraction fields were removed.
On 2026-10-11 the request gained the optional boolean `omitTherapy` (Sentrapedia extension): the step skips its therapy part, and therapy is requested from `/v1/therapy/step`, whose request is built from this schema in `contract.py`.
On 2026-10-20 the response gained three optional Sentrapedia extensions for the clinical report (Gaffer): `reasoningNote` on the result, `discriminators` and `status` on each differential entry, and `indication` on each `nextBestActions` entry. Since then the capsule owns this file (`owner: capsule` in `aadi/SOURCE.json`); contract version `1` is unchanged, and a response without the fields stays valid. Response SHA-256 before these extensions: `b5048ad8fa750886dd7780435e1e09aabfb8299bbb1b49d0f1ca753154aef171`.
On 2026-10-20 MIRA was renamed AADI in the capsule (Gaffer): the two schema files are named `aadi-step-*.schema.json` and their titles and descriptions say AADI, so both differ from the Med Assist source by more than the extensions above; the `$id` values keep the source contract identity, and the examples are unchanged apart from their file names.
