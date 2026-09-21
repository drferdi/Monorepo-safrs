# Avery

**Path:** `projects/healthcare/avery/`
**Canonical:** `docs/spds/read_first.md` and `PROJECT_GENOME.yaml`
**Posture:** configuration capsule for Hermes Studio. It does not compile a product binary.

Avery is Sentra's Hermes agent: WhatsApp ingress, gateway, skills, memory. Adding another agent should be configuration, not a reinstall.

## Runtime (not in this repo as the engine)

```text
WhatsApp  →  whatsapp-bridge (Baileys, Node :3000)
                 →  gateway (Python: routing, session, memory, cron, skills, MCP)
                        →  dashboard (Python :9119, loopback auth exception)
                        →  Hermes Studio web UI (Node, always login)
```

Documented in `projects/healthcare/avery/docs/architecture.md`.

## What the capsule owns

Versioned persona (`SOUL.md`), skills, example config, deploy compose, operational scripts, a small Python package (`src/avery_outbound`).

## What must never be committed

From capsule `AGENTS.md`: `auth.json`, WhatsApp session dirs, filled `.env`, `state.db` / `kanban.db`, `memories/`, the Hermes Studio binary.

## Healthcare overlay

The `healthcare/` domain is a compliance grouping. It is **not** a claim that Avery is SaMD or a medical device. SPDS healthcare files must classify non-applicability where that is the fact. Do not infer Regulated conformance from this folder.

## Related

- Capsule `docs/spds/`
- [Security](../security.md)
