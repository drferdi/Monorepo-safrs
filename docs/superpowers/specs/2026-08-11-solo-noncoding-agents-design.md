# Solo Non-Coding Cursor Agents — Design (2026-08-11)

## Goal

Ship seven Cursor subagents that help a solo Chief with non-coding work: onboarding
context, triage, product briefs, SOTA research, decisions, docs audit, and release
communication — without weakening SAFRS or duplicating canonical policy.

## Constraints

- Adapters only under `.cursor/agents/`; canonical policy stays in `AGENTS.md` + routed docs.
- English agent bodies and bootstrap file; chat diagnostics may stay Bahasa Indonesia.
- Do not modify `.agents/knowledge/` without Chief approval.
- No Claude mirror in this change set.
- No auto-commit / push from any agent.
- Risk: **R2** (`.cursor/**` agent adapters + bootstrap path under `.agents/`). Designated review before merge.

## Decisions locked

| Topic | Choice |
| --- | --- |
| Approach | Flat `.cursor/agents/<name>.md` (match existing reviewer style) |
| Write posture | Hybrid: five read-only; two hybrid-write |
| Write allowlist | `.agents/HANDOFF.md`, append `.agents/DECISIONS.md`, `.agents/PROGRESS.md` (area status), `.agents/CONTEXT_BOOTSTRAP.md` |
| Apply gate | Hybrid agents draft in chat first; write only after user/parent says apply |
| Placement | Cursor only + update `docs/bootstrap/CURSOR_SETUP.md` |
| `context-management-agent` | Onboarding bootstrap for new or reinstalled agents (not a general token router) |

## Agent inventory

| Agent | Mode | Purpose |
| --- | --- | --- |
| `triage-chief` | Read-only | From HANDOFF/PROGRESS: top 3 next actions, deferrals, R2/R3 flags |
| `product-brief` | Read-only | Idea → one-page brief (problem, user, non-goals, AC, risk) |
| `research-sota` | Read-only (+ web if available) | Current-practice research with sources, recommendation, uncertainty |
| `docs-auditor` | Read-only | Stale/conflicting docs report; no large rewrites |
| `release-communicator` | Read-only | Human summary + test plan from diff/PR |
| `decision-steward` | Hybrid write | Durable DECISIONS/PROGRESS/HANDOFF after apply |
| `context-management-agent` | Hybrid write | Bootstrap briefing + optional `CONTEXT_BOOTSTRAP.md` after apply |

## Write rules (hybrid agents only)

Allowed paths only (above). Append-only for `DECISIONS.md`. HANDOFF overwrite stays under ~1k tokens. `CONTEXT_BOOTSTRAP.md` is a short pointer pack to canonical docs — not a second policy tree. Never touch `knowledge/`, `.safrs/`, hooks, MCP, secrets, or verification controls.

## Typical solo flow

```text
context-management-agent (new/reinstall)
  → triage-chief
  → product-brief → research-sota (optional)
  → [Plan / coding / technical reviewers]
  → decision-steward → release-communicator
  → docs-auditor (when docs drift suspected)
```

## File format

YAML frontmatter `name` + `description` (trigger-friendly), then English sections:
Read first / Procedure / Output / Prohibited — same shape as `security-reviewer.md`.

## Non-goals

- Claude `.claude/agents/` mirror
- Orchestrator skill (`/solo-ops`)
- Changing root/nested `AGENTS.md` or `.safrs/policy.json`
- Replacing existing technical reviewers (`security-reviewer`, `safrs-boundary-reviewer`)

## Docs delta

Extend the Subagents table in `docs/bootstrap/CURSOR_SETUP.md` with the seven agents,
hybrid write allowlist, and pointer to `.agents/CONTEXT_BOOTSTRAP.md`.
Do not commit an empty bootstrap file; create it on first successful apply of
`context-management-agent`.

## Approval

Chief approved Approach 1 (flat agents), hybrid write option C, and Cursor-only ship on 2026-08-11.
