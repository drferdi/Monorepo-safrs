# Agent memory

Root memory lives in `.agents/`. It is not runtime.

| File | Role |
| --- | --- |
| `HANDOFF.md` | Current state. Overwrite each session. Keep under ~1k tokens. |
| `DECISIONS.md` | Durable decisions, append when needed |
| `PROGRESS.md` | Area tracker |
| `CONTEXT.md` | Additional context (SHOULD) |
| `BOUNDARIES.md` | Push/publish/visibility gates |
| `knowledge/00_READ_FIRST.md` … `12_LESSONS.md` | Routed knowledge |
| `knowledge/12_LESSONS.md` | Real repeated mistakes only |

Read order is generated from `.safrs/document-registry.json` into `AGENTS.md`.

Kediri owns capsule-local `.agents/` (`projects/product/kediri-history/.agents/`). Do not copy its phase board into root HANDOFF.

## Related

- [Multi-agent protocol](../governance/multi-agent.md)
- [Document lifecycle](../governance/document-lifecycle.md)
