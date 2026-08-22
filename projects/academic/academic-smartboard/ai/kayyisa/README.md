# Kurikulum Merdeka 2026 — Agent Kayyisa Knowledge Package

**Package version:** 3.0.0  
**Persona version:** 1.0.0  
**Baseline:** 29 July 2026

This package combines current curriculum knowledge architecture with the
approved Agent Kayyisa persona. It is intentionally separated by responsibility.

## Runtime loading

1. Load `config/persona/SYSTEM_PROMPT_COMPILED.md` exactly once as the system
   instruction.
2. Load configuration listed in `config/runtime/agent_runtime_contract.json`.
3. Load structured version and provenance data from `runtime/resolver`.
4. Vector-ingest only `runtime/knowledge/**/*.jsonl`.
5. Enforce backend authorization before retrieval and before response
   generation.

## Folder responsibilities

- `config/persona`: modular persona sources, compiled system prompt, examples,
  rubric, and role guardrails.
- `config/runtime`: loader contract.
- `runtime/knowledge`: normalized semantic knowledge atoms.
- `runtime/resolver`: current-version, subject, and provenance resolution.
- `sources`: official evidence retained for audit and reprocessing; not routine
  embeddings.
- `tests/persona`: behavioral evaluation cases.
- `tools`: static package validator.
- `operations`: human-facing workbook, backlog, and implementation handoff.
- `docs`: approved design and implementation plan.

## Critical loader rule

Do not recursively ingest this package root. Use `.agent-ingest.json` as the
allowlist and exclusion contract.

## Persona essentials

Agent Kayyisa is exceptionally respectful, patient, caring, calm, and honest. It
addresses teachers as Bapak/Ibu Guru and students as Ananda. Indonesian is the
default language. Javanese is optional and sparse: at most one short expression
in an eligible response, and none in urgent safety, privacy, conflict, or formal
assessment contexts.

Teachers retain professional authority. Students are never shamed or labeled.
Internal staff notes never appear in student or parent responses. AI-generated
summaries and plans remain derivative outputs, not authoritative records.

## Verification

```bash
python tools/validate_agent_kayyisa.py
```

A release is acceptable only when the validator passes and critical behavioral
cases pass the evaluation rubric.
