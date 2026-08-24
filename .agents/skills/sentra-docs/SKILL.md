---
name: sentra-docs
description: >-
  Create or refresh a complete Sentra Project Documentation Standard (SPDS 1.0)
  set for any project capsule. Use when the user says /sentra-docs, asks for
  Sentra project docs, SPDS, project genome, purpose contract, epistemic ledger,
  autonomy envelope, or a full professional documentation pack (charter, PRD,
  architecture, V&V, risk, AI, agent, healthcare overlay). Reusable across
  software, systems, AI, agentic, healthcare, research, and enterprise capsules.
---

# /sentra-docs

Generate a **purpose-oriented, evidence-bearing, human-authoritative** documentation
set for one project capsule. Do not dump empty ISO templates. Every file must
AUTHORIZE, DEFINE, DECIDE, GUIDE, VERIFY, or PRESERVE.

Communicate with Chief in **Bahasa Indonesia**. Write the documents themselves in
**professional English**. Keep identifiers, paths, and commands in English.

Reference instance (already filled, not a copy-paste source of Avery facts):
`projects/healthcare/avery/docs/spds/`.

Load next:

1. `references/catalog.json` — required files and `when` conditions.
2. `references/frontmatter.md` — YAML header.
3. `references/overlays.md` — AI / agent / healthcare activation rules.

## Parse

```
/sentra-docs
/sentra-docs <capsule-path>
/sentra-docs <capsule-path> --refresh
/sentra-docs <capsule-path> --overlay healthcare,ai,agent
```

| Form | Meaning |
| ------ | --------- |
| no path | Use the capsule in the current task / HANDOFF / open workspace path |
| path | Capsule root (directory that should own `PROJECT_GENOME.yaml`) |
| `--refresh` | Update existing SPDS from inspectable evidence; do not wipe unknown-but-true content |
| `--overlay` | Force overlays. If omitted, **infer** from evidence (folder name is not enough) |

If the capsule path is ambiguous, stop and ask Chief once.

## Non-negotiable rules

1. **Inspect before write.** Read capsule `AGENTS.md`, README, config examples, tests, capabilities, and existing docs. Claims need evidence or an explicit UNKNOWN/ASSUMPTION tag.
2. **Filenames lowercase** (`read_first.md`, `purpose_contract.md`). Exception: keep `docs/README.md` as `README.md`. Never use Windows reserved device names as filenames.
3. **Output layout**
   - `<capsule>/PROJECT_GENOME.yaml`
   - `<capsule>/docs/spds/*.md`
   - `<capsule>/docs/spds/adr/adr-0001.md` (+ more if decisions exist)
   - Point `docs/README.md`, capsule `README.md`, and capsule `AGENTS.md` at `docs/spds/read_first.md`
4. **Do not invent** certifications, live runtime health, secrets, phone numbers, or medical-device status.
5. **Healthcare folder ≠ medical device.** If the product is not SaMD, H01–H10 must **classify non-applicability**, not fake a 62304 file.
6. **Do not commit, push, or deploy** unless Chief ordered it in this session.
7. Secrets, PHI, WhatsApp sessions, and live `.env` stay out of git and out of these docs.
8. Conflicting sources stay DISPUTED in `epistemic_ledger.md`. Do not collapse them into a fake FACT.

## Workflow

### 1. Classify the project

From evidence, set flags:

| Flag | True when |
| ------ | ----------- |
| `software_behavior` | Code or configured runtime exists |
| `stores_or_moves_data` | Files, DB, memory, logs, or third-party data |
| `material_ai` | LLM, model API, or material ML |
| `agentic` | Tools, autonomy, or delegated actions |
| `healthcare_overlay` | Health software, clinical workflow, SaMD **or** a healthcare-domain capsule that must bound clinical overclaim |
| `operated_system` | Long-running service, gateway, or bot |
| `regulated_or_contracted` | Legal/compliance obligations named in repo |

Write CORE + SENTRA always. Write CONDITIONAL/DOMAIN only when the flag matches, **unless** Chief asked for the full catalog — then write skipped overlays as short **Not applicable** documents with the reason (still useful; not bureaucracy if they DEFINE non-scope).

When Chief says “all documents above” / full standard: emit the **entire catalog** in `catalog.json`, using Not applicable stubs where the condition is false.

### 2. Write genome first

`PROJECT_GENOME.yaml` is the machine root: identity, purpose, owners, lifecycle, authority hierarchy, agent entry points, constraints, evidence locations. Humans still start at `read_first.md`.

Authority order to encode:

```text
PROJECT_GENOME
  → PURPOSE CONTRACT
  → AUTHORITY / DECISIONS
  → REQUIREMENTS
  → ARCHITECTURE
  → IMPLEMENTATION
  → VERIFICATION EVIDENCE
  → CURRENT STATE
  → OUTCOME
```

### 3. Fill documents from evidence

For each catalog file:

- YAML frontmatter from `references/frontmatter.md`
- `# Title`
- `## Function` (one sentence)
- Body tied to **this** capsule
- `FACT` / `DECISION` / `ASSUMPTION` / `UNKNOWN` where certainty matters
- Pointers to tests, scripts, and existing operational docs instead of duplicating them

Minimum ADR set: one real decision (`adr/adr-0001.md`) plus `adr_index.md`. Add more only for decisions you can evidence.

### 4. Wire the capsule

Update (do not rewrite unrelated prose):

- `docs/README.md` — SPDS entry + note that legacy docs yield to current state + evidence
- Capsule `AGENTS.md` required-context list — `docs/spds/read_first.md` first
- Capsule README — one short pointer

### 5. Report to Chief

In Bahasa Indonesia, list:

- Capsule path
- Overlays applied
- File counts (CORE / CONDITIONAL / DOMAIN / SENTRA)
- Honest UNKNOWN / DISPUTED items
- What was not verified (e.g. live runtime)

## Quality bar

- English is professional, concise, and specific.
- No motivational filler. No “best practice says this file must exist” with empty sections.
- “Tests passed” is not “project succeeded” — `goal_to_evidence_matrix.md` must say so.
- Agent docs separate **human authority**, **delegated authority**, and **execution freedom** (`autonomy_envelope.md`).

## Reference overlays

Read `references/overlays.md` before writing AI, agent, or healthcare files.
