#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
from textwrap import dedent

ROOT = Path(__file__).resolve().parent
ADR = ROOT / "ADR"
DATE = "2026-08-25"


def front(doc_id: str, title: str, klass: str, sot: str = "true") -> str:
    return dedent(f"""\
    ---
    document_id: "{doc_id}"
    title: "{title}"
    status: active
    authority: Chief
    owner: dr. Ferdi Iskandar
    version: "1.0.0"
    created: "{DATE}"
    last_verified: "{DATE}"
    applies_to: projects/healthcare/avery
    source_of_truth: {sot}
    supersedes: []
    related_requirements: []
    related_decisions: []
    related_evidence: []
    agent_readable: true
    agent_editable: false
    human_approval_required: true
    classification: {klass}
    review_trigger: material change to purpose, architecture, runtime, or evidence
    ---

    """)


def write(name: str, doc_id: str, title: str, klass: str, body: str, sot: str = "true") -> None:
    path = ROOT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(front(doc_id, title, klass, sot) + f"# {title}\n\n" + dedent(body).strip() + "\n", encoding="utf-8")


COMMON = """
## Classification note

Avery is an **institutional executive agent**, not software as a medical device. Healthcare overlay documents in this set exist to **prevent clinical overclaim**, not to register a device.

## Epistemic discipline

Separate FACT, DECISION, ASSUMPTION, HYPOTHESIS, UNKNOWN, DISPUTED, and SUPERSEDED. Chat and Git history are context, not operational truth.

## Authority

Chief (dr. Ferdi Iskandar) is the human authority of record. Agents execute inside `autonomy_envelope.md`.
"""


def pack(purpose: str, content: str) -> str:
    return f"## Function\n\n{purpose}\n\n{COMMON}\n{content}\n"


# --- catalog: (file, id, title, class, purpose, content) ---
ITEMS: list[tuple[str, str, str, str, str, str]] = []


def add(file: str, id_: str, title: str, klass: str, purpose: str, content: str) -> None:
    ITEMS.append((file, id_, title, klass, purpose, content))


add("read_first.md", "01", "Read First", "CORE",
    "Single entry point for humans and agents.",
    """
## Start order

1. Capsule root `PROJECT_GENOME.yaml`
2. `purpose_contract.md`
3. `current_state_snapshot.md`
4. `context_handoff_packet.md`
5. `autonomy_envelope.md`
6. Capsule `AGENTS.md` then `ai/profiles/avery/SOUL.md` before behavior changes

## Hierarchy

PROJECT_GENOME → PURPOSE CONTRACT → AUTHORITY/DECISIONS → REQUIREMENTS → ARCHITECTURE → IMPLEMENTATION → VERIFICATION EVIDENCE → CURRENT STATE → OUTCOME.

## Legacy

`docs/1-human`, `docs/2-agent`, `docs/3-governance`, `docs/architecture.md`, `docs/data.md`, and `docs/testing.md` remain operational references. If they conflict with this SPDS set, record the conflict in `project_drift_ledger.md` and follow SPDS plus inspectable runtime evidence.
""")

add("document_index.md", "00", "SPDS Document Index", "SENTRA",
    "Index of the Avery SPDS 1.0 set.",
    """
This directory is the Avery implementation of **Sentra Project Documentation Standard (SPDS) 1.0 — 2026**.

The standard definition itself is `spds.md`. Machine identity is `../../PROJECT_GENOME.yaml`.

All CORE, CONDITIONAL, AI, agentic, operations, legal/supply-chain, healthcare overlay, and Sentra intelligence-layer documents listed in Chief's SPDS brief are present in this directory (ADRs under `ADR/`).
""")

add("project_charter.md", "02", "Project Charter", "CORE",
    "Official mandate.",
    """
## Mandate

Version, operate, and harden Avery as Sentra's persistent WhatsApp-native executive agent: profile, skills, operational scripts, outbound library, living console, deploy templates, tests that never ingest secrets, and evidence-bearing documentation.

Runtime cognition is **Hermes** (external install). This capsule does not vendor the full engine.

## Sponsor

Chief — dr. Ferdi Iskandar, Founder & CEO, Sentra Artificial Intelligence.

## Success of charter

Capsule remains configuration-plus-ops portable; Avery serves authorized WhatsApp surfaces; human authority remains final for institutional, legal, financial, and clinical claims.
""")

add("purpose_and_outcomes.md", "03", "Purpose and Outcomes", "CORE",
    "Why Avery exists.",
    """
## Problem

Institutional work happens in WhatsApp. Context, decisions, and follow-through fragment. Unbounded bots create noise or unaccountable action.

## Purpose

Preserve context, know verified responsibilities, mobilize the minimum useful people, and convert conversation into next steps under human authority.

## Intended outcomes

Authorized resumption of work; separation of IDEA / PROPOSAL / DECISION / ACTION / RISK / OPEN QUESTION; traceable high-impact actions; group silence by default; no substitution for licensed clinical, legal, or financial authority.

## Non-outcomes

Entertainment chatbot; public spokesperson; diagnostic engine; silent institutional-memory rewriter.
""")

add("success_criteria.md", "04", "Success Criteria", "CORE",
    "Verifiable success.",
    """
Avery succeeds when **all** of the following are true:

| ID | Criterion | Evidence |
|---|---|---|
| S1 | Authorized WhatsApp surfaces receive correct, bounded responses (mention/allowlist rules honored) | gateway logs, live checks (`docs/testing.md`) |
| S2 | Repository tests for outbound/policy code pass without touching runtime secrets | `scripts/test.ps1` / unittest |
| S3 | Secrets, sessions, and memories are absent from git | ignore rules + sync scanners |
| S4 | High-impact external commitments are not invented by the agent | SOUL.md instinct 10; skill policy |
| S5 | Documentation matches inspectable state or records drift | this SPDS set + `project_drift_ledger.md` |

Passing unit tests alone is **not** product success.
""")

add("scope_and_boundaries.md", "05", "Scope and Boundaries", "CORE",
    "In, out, non-goals.",
    """
## In scope

`ai/profiles/avery/**` (persona, skills, example config), `scripts/`, `src/avery_outbound`, `console/`, `deploy/`, `docs/`, capsule tests, Hermes patch notes that belong to this capsule.

## Out of scope

Monorepo control-plane packages as runtime dependencies; other capsules; production credential stores; rewriting Hermes upstream product.

## Non-goals

IEC 62304 medical device; always-on group chatter; unconstrained tool use; replacing Chief's authority.
""")

add("stakeholder_map.md", "06", "Stakeholder Map", "CORE",
    "Who cares and why.",
    """
| Stakeholder | Interest | Authority |
|---|---|---|
| Chief (dr. Ferdi Iskandar) | Mandate, persona, production WhatsApp policy | Final |
| Founding Core (named in SOUL.md) | Correct address, privacy, useful coordination | Consulted / informed |
| Operators of the Windows/VPS host | Uptime, backups, secrets | Delegated ops |
| Hermes upstream | Engine behavior | External vendor/community |
| Model providers (e.g. OpenRouter) | Inference | External |
| WhatsApp users outside allowlist | None — must be ignored | None |

Do not invent additional stakeholders as if they were authorized.
""")

add("authority_and_decision_rights.md", "07", "Authority and Decision Rights", "CORE",
    "Who may decide what.",
    """
| Class | Decider | Agent role |
|---|---|---|
| Purpose, persona (`SOUL.md`), group/DM policy, FULL AUTO vs gated writes | Chief only | Propose |
| Capsule engineering within envelope | Agents / implementers | Execute |
| Institutional statements, pricing, legal, clinical claims, external commitments | Chief | Never originate |
| Memory/skill file writes | Per live `config.yaml` (see CURRENT_STATE) | Propose or apply only as configured |
| Production deploy | Chief | Prepare only |

R3 actions (production credentials, production deploy, irreversible real-data mutation) require explicit Chief authorization in the session that executes them.
""")

add("roles_and_responsibilities.md", "08", "Roles and Responsibilities", "CORE",
    "Accountability.",
    """
| Role | Accountable for |
|---|---|
| Chief | Purpose, authority, production risk, persona |
| Capsule maintainer (human or agent under envelope) | Config, scripts, tests, SPDS accuracy |
| Avery (runtime agent) | Bounded execution on WhatsApp; fail closed on stale memory replace |
| Hermes runtime | Tool loop, gateway, bridges |
| Host operator | Process supervision, backups, secret hygiene |
""")

add("glossary.md", "09", "Glossary", "CONDITIONAL",
    "Authoritative terms.",
    """
| Term | Meaning |
|---|---|
| Avery | This capsule's agent; Autonous Virtual Executive Resource for Your-team |
| Hermes | External agent runtime (gateway, tools, WhatsApp bridge) |
| Capsule | Independently operable project tree under `projects/` |
| Chief | Human authority of record |
| NO_REPLY | Valid group behavior: no outbound message |
| SPDS | Sentra Project Documentation Standard |
| SaMD | Software as a Medical Device — **Avery is not SaMD** |
| FACT / DECISION / ASSUMPTION / UNKNOWN | Epistemic classes in `epistemic_ledger.md` |
""")

add("project_status.md", "10", "Project Status", "CORE",
    "Lifecycle state.",
    """
**Lifecycle:** operating / maintenance (not greenfield).

**FACT:** Capsule contains profile, 18 skill packages under `ai/profiles/avery/skills`, outbound Python package, Electron console, deploy templates, and tests.

**FACT:** Runtime is a separately installed Hermes; live `config.yaml` is not in git.

**UNKNOWN (this workspace):** whether a given host's gateway is up at the moment a reader opens this file. Verify with local scripts, not this paragraph.

**ASSUMPTION:** WhatsApp allowlists and FULL AUTO flags described in `docs/handoff-2026-08-24.md` still reflect Chief's last applied runtime unless Chief changed them off-repo.
""")

add("product_brief.md", "11", "Product Brief", "CORE",
    "Short product concept.",
    """
Avery is a **WhatsApp-native executive agent** for Sentra's founding team: quiet by default, execution-oriented, approval-aware, and institutionally bounded.

It is not a clinic EMR, not a public copilot, and not a medical device.
""")

add("prd.md", "12", "Product Requirements Document", "CORE",
    "Product requirements.",
    """
## Users

Founding Core members on authorized WhatsApp DMs/groups; Chief as operator.

## Jobs to be done

Orient, retrieve canonical Sentra knowledge, separate decisions from chatter, prepare outreach/onboarding, run bounded tools, schedule follow-up, refuse clinical/legal/financial origination.

## Requirements (product)

- PR-1 Mention/allowlist gating on groups.
- PR-2 Indonesian operational language with defined honorifics.
- PR-3 Skill-first institutional answers (`skill_view` before recall).
- PR-4 No tool narration in WhatsApp.
- PR-5 Memory writes follow live approval policy.
- PR-6 Secrets never in repository.
- PR-7 Outbound high-impact sends follow `src/avery_outbound` policy where that path is used.
""")

add("system_requirements.md", "13", "System Requirements", "CORE",
    "System/software requirements.",
    """
- SR-1 Windows or Linux host capable of running Hermes gateway + Node WhatsApp bridge.
- SR-2 Python 3.12+ for capsule tests and optional control center.
- SR-3 Persistent disk for Hermes profile (session, sqlite, logs) **outside git**.
- SR-4 Network to model provider; optional VPS (Hostinger KVM class) for 24/7.
- SR-5 Loopback-only dashboards unless tunneled; no LAN-trust assumption (RFC1918 is untrusted).
""")

add("functional_requirements.md", "14", "Functional Requirements", "CONDITIONAL",
    "Behaviors.",
    """
| ID | Behavior |
|---|---|
| FR-1 | Ingest WhatsApp via Baileys bridge; honor DM/group policies |
| FR-2 | Load profile SOUL + skills |
| FR-3 | Tool use: filesystem, terminal, browser-use, web search, kanban, cron, as enabled |
| FR-4 | Memory propose/apply per config |
| FR-5 | Control center / console: status and allowlisted script actions |
| FR-6 | CI-ish local checks: unittest + secret scan scripts |
""")

add("quality_requirements.md", "15", "Quality Requirements", "CORE",
    "ISO 25010-aligned qualities.",
    """
| Quality | Requirement |
|---|---|
| Reliability | Fail closed on stale memory replace; restart via capsule scripts on Windows |
| Security | Secrets out of git; control-center CSRF/origin checks |
| Usability | Quiet groups; honorifics; no melodrama |
| Maintainability | Capsule-local scripts; do not couple to monorepo runtime |
| Compatibility | Hermes version documented in SBOM / gate-0 audit; patches re-applied after update |
""")

add("use_cases.md", "16", "Use Cases", "CONDITIONAL",
    "Use cases.",
    """
- UC-1 Chief greets Avery in DM → warm bounded reply.
- UC-2 Group chatter without mention → NO_REPLY.
- UC-3 Member asks "where are we on X?" → load sentra skills, answer from canonical sources.
- UC-4 Chief: "handle this" → execute within envelope, verify mutations, report.
- UC-5 Clinical question about a patient → refuse diagnosis; route to clinician.
- UC-6 Unknown DM → ignore per policy.
""")

add("user_journeys.md", "17", "User Journeys", "CONDITIONAL",
    "End-to-end journeys.",
    """
**Journey A — Resume work:** member mentions Avery → identity workflow → skill load → structured next steps → optional memory proposal.

**Journey B — Operate host:** operator runs restart script → health endpoints → no WhatsApp spam on restart (`NO_REPLY` on gateway recovery notes).

**Journey C — Harden:** maintainer runs tests and secret scan → updates SPDS current state if runtime changed.
""")

add("acceptance_criteria.md", "18", "Acceptance Criteria", "CORE",
    "Verifiable completion.",
    """
A change is acceptable when: it preserves purpose; it does not add secrets; affected tests pass; group/DM policy is not silently widened; SOUL.md is untouched unless Chief asked; SPDS drift is updated if behavior changed.
""")

add("requirements_traceability_matrix.md", "19", "Requirements Traceability Matrix", "CORE",
    "Requirement to verification.",
    """
See also `goal_to_evidence_matrix.md` (purpose→outcome).

| Req | Implementation | Verification |
|---|---|---|
| PR-1 | config.example.yaml whatsapp.* ; live config.yaml | live log + gate-0 |
| PR-2 | SOUL.md | review + live chat |
| PR-6 | .gitignore, sync scanners | ci-checks / test.ps1 scanners |
| FR-5 | console/, control_center.py | documented smoke in handoff |
| Outbound policy | src/avery_outbound, tests | unittest |
""")

add("system_context.md", "20", "System Context", "CORE",
    "System-of-interest and environment.",
    """
System-of-interest: Avery capsule + Hermes runtime + WhatsApp bridge.

Environment actors: WhatsApp, model provider, Chief/operator, Founding Core, host OS, optional VPS, optional MCP/studio ports.

Trust boundary: anything off-box (Meta, LLM vendor, DNS) is untrusted. Loopback dashboards are trusted only on loopback.
""")

add("architecture.md", "21", "Architecture", "CORE",
    "Authoritative architecture description.",
    """
Canonical narrative remains `../architecture.md`. SPDS restates the topology:

WhatsApp → Baileys Node bridge (local HTTP) → Hermes gateway (Python: routing, memory, skills, cron, MCP) → model provider. Side surfaces: Python dashboard (loopback auth exemption), Node web UI (always auth), Electron living console, optional control center.

Avery does not compile a unique cognitive engine; it configures one.
""")

add("architecture_views.md", "22", "Architecture Views", "CONDITIONAL",
    "Views.",
    """
**Logical:** profile, skills, outbound store, console.

**Runtime:** gateway process, node bridge, optional dashboards.

**Data:** sqlite state/kanban, MEMORY.md/USER.md off-repo, session creds off-repo.

**Deployment:** laptop default; `deploy/` Docker compose for gateway+dashboard; Hostinger runbook.

**Security:** allowlists, origin checks, secret ignore, fail-closed replace.
""")

add("adr_index.md", "23", "ADR Index", "CORE",
    "Index of architecture decisions.",
    """
| ADR | Title | Status |
|---|---|---|
| ADR-0001 | WhatsApp-native executive agent on Hermes | accepted |
| ADR-0002 | Unofficial Baileys transport | accepted with risk |
| ADR-0003 | Capsule configures; engine is external | accepted |
| ADR-0004 | Not a medical device | accepted |
| ADR-0005 | Group mention/allowlist over open-by-default | accepted |
""")

add("data_architecture.md", "25", "Data Architecture", "CONDITIONAL",
    "Data domains.",
    """
Domains: (1) versioned persona/skills, (2) runtime secrets/session, (3) episodic memory, (4) conversation sqlite, (5) task/kanban sqlite, (6) pending approval JSON, (7) logs.

Ownership: Chief for policy; operator for runtime files; git for (1) only.
""")

add("interface_contracts.md", "26", "Interface Contracts", "CONDITIONAL",
    "Interfaces.",
    """
See `../2-agent/api-contracts.md` for port 3000 health/send, dashboard 9119, web UI JWT, MCP tools. Treat that file as operational detail; if ports in a live install differ, CURRENT_STATE wins after inspection.
""")

add("api_specification.md", "27", "API Specification", "CONDITIONAL",
    "API behavior.",
    """
No public internet API is in-scope as a product. Internal APIs: bridge `/health` `/send`; control center `/api/status` `/api/action` with origin + `X-Avery-Control` (+ optional token). Do not publish these to the internet.
""")

add("deployment_architecture.md", "28", "Deployment Architecture", "CONDITIONAL",
    "Runtime topology.",
    """
Default: single Windows workstation. Target: KVM VPS with persistent volume for Hermes home. Compose: gateway + dashboard. WhatsApp session is a secret volume. Do not use shared hosting.
""")

add("dependency_architecture.md", "29", "Dependency Architecture", "CONDITIONAL",
    "Critical dependencies.",
    """
Hermes Agent/Studio, Node for Baileys, CPython, SQLite, Electron (console), model HTTP API, WhatsApp network. Capsule Python outbound library uses stdlib only. Console uses Electron from workspace catalog when installed in-monorepo — extraction must still run capsule scripts without requiring Sentra root packages at runtime of the agent.
""")

add("engineering_plan.md", "30", "Engineering Plan", "CORE",
    "How engineering proceeds.",
    """
Smallest reversible change in capsule. Do not rewrite SOUL.md without Chief. Prefer scripts already in `scripts/`. After Hermes upgrade, re-apply capsule patches. Keep SPDS current state honest.
""")

add("implementation_plan.md", "31", "Implementation Plan", "CORE",
    "What to implement vs already present.",
    """
**Present:** profile, skills, ops scripts, outbound package, console, deploy sketches, tests.

**Not present as product:** Maestro control plane, rate limiting, result-validation framework, multi-channel (see `capabilities.json` `not_yet`).

Do not implement `not_yet` items unless Chief assigns them.
""")

add("delivery_roadmap.md", "32", "Delivery Roadmap", "CORE",
    "Roadmap.",
    """
Now: operate and harden. Next (Chief-gated): group_policy open + WHATSAPP_ALLOW_ALL_USERS if desired; VPS cutover; Hermes patch discipline. Later: official WhatsApp Cloud API if Baileys risk becomes unacceptable.
""")

add("release_strategy.md", "33", "Release Strategy", "CONDITIONAL",
    "Releases.",
    """
Capsule "release" = git revision of config/skills/scripts. Runtime release = Hermes version + patches. Do not conflate. Production WhatsApp cutover is R3-adjacent: Chief only.
""")

add("configuration_management.md", "34", "Configuration Management", "CORE",
    "Config management.",
    """
Git holds `config.example.yaml` and persona. Live `config.yaml` and `.env` stay on the host. Precedence traps (top-level `whatsapp:` vs `extra`) are documented in the example file — follow that, not folklore.
""")

add("change_management.md", "35", "Change Management", "CORE",
    "How change is governed.",
    """
Material change uses `change_impact_packet.md` questions. Persona changes require Chief. Security-relevant config (allowlists, write_approval) requires explicit record in DECISION_PROVENANCE and CURRENT_STATE.
""")

add("dependency_policy.md", "36", "Dependency Policy", "CONDITIONAL",
    "Dependencies.",
    """
No new production dependencies without Chief approval (capsule history). Prefer stdlib. Electron remains console-only. Never add GPL into a production bundle without legal review.
""")

add("build_and_release.md", "37", "Build and Release", "CONDITIONAL",
    "Build.",
    """
No compiled agent artifact. Console: `electron .`. Tests: PowerShell unittest runner. Docker: `deploy/` compose. Do not claim CI green without running the commands.
""")

add("definition_of_ready.md", "38", "Definition of Ready", "CONDITIONAL",
    "Ready to start work.",
    """
Ready when: purpose impact is stated; files in scope listed; secrets not required in repo; test approach known; Chief approval present if SOUL, allowlist, or production is involved.
""")

add("definition_of_done.md", "39", "Definition of Done", "CORE",
    "Done.",
    """
Done when: behavior matches request; tests for touched Python pass; no secrets added; SPDS current state/drift updated if operational truth changed; HANDOFF updated for repo-wide coordination only if this session owns it.
""")

add("quality_plan.md", "40", "Quality Plan", "CORE",
    "Quality.",
    """
Quality is purpose-fitness: correct silence, correct honorifics, no PHI in git, fail-closed writes, honest docs. Tools: unittest, secret scanners, live gateway checks.
""")

add("verification_and_validation_plan.md", "41", "Verification and Validation Plan", "CORE",
    "V&V.",
    """
Verification: tests and config inspection. Validation: live WhatsApp on authorized chats (Chief). Agents must not claim live validation they did not perform.
""")

add("test_strategy.md", "42", "Test Strategy", "CORE",
    "Test strategy.",
    """
Layer 1: stdlib unittest (policy, store, sender, watchers, dry-run). Layer 2: py_compile / node --check. Layer 3: live gateway. Tests never use `runtime/` WhatsApp session or `.env`.
""")

add("test_specification.md", "43", "Test Specification", "CONDITIONAL",
    "What tests must cover.",
    """
See `../testing.md` table (policy, store, sender, member watch, powershell dry-run). Additional tests exist for smoke evidence and corrupt store per 2026-08-24 handoff — treat that handoff as evidence of intent; re-run to confirm.
""")

add("test_cases.md", "44", "Test Cases", "CONDITIONAL",
    "Cases.",
    """
Canonical cases live in `tests/` as unittest. Do not duplicate them here. This file points maintainers to execute `scripts/test.ps1` from the capsule/monorepo path documented in AGENTS.md.
""")

add("evaluation_plan.md", "45", "Evaluation Plan", "CONDITIONAL",
    "Product evaluation.",
    """
Evaluate on: mention discipline, honorific accuracy, refusal of clinical origination, tool-use without WhatsApp narration, restart silence. Sample live chats only with Chief (PHI risk).
""")

add("evaluation_report.md", "46", "Evaluation Report", "CONDITIONAL",
    "Latest evaluation.",
    """
**Status:** no sealed formal evaluation campaign is filed as a single signed report in this capsule.

**Partial evidence:** `docs/gate-0-reality-audit.md` (2026-08-23), `docs/handoff-2026-08-24.md`, `docs/evidence/`.

Do not treat partial evidence as a completed ISO-style evaluation report.
""")

add("acceptance_report.md", "47", "Acceptance Report", "CORE",
    "Acceptance.",
    """
Chief's operational acceptance is implied by continued production use of the WhatsApp agent. A formal signed acceptance protocol is **not** on file. UNKNOWN: date of original production pairing.
""")

add("verification_evidence_index.md", "48", "Verification Evidence Index", "SENTRA",
    "Index to actual evidence.",
    """
| Claim | Evidence pointer | As of |
|---|---|---|
| Unittest suite exists | `scripts/test.ps1`, `tests/` | inspect now |
| Gate 0 audit | `../gate-0-reality-audit.md` | 2026-08-23 |
| FIX evidence | `../evidence/` | 2026-08-23+ |
| Tech-debt actions | `../tech-debt-2026-08-24.md`, `../handoff-2026-08-24.md` | 2026-08-24 |
| Live gateway health | host logs / health scripts | must re-inspect |

**No evidence, no verified claim.**
""")

add("risk_management_plan.md", "50", "Risk Management Plan", "CORE",
    "Risk process.",
    """
Identify → classify (availability, confidentiality, integrity, autonomy, clinical-overclaim) → treat (avoid/mitigate/accept) → record in RISK_REGISTER → review on Hermes upgrade, transport incident, or policy change.
""")

add("risk_register.md", "51", "Risk Register", "CORE",
    "Risks.",
    """
| ID | Risk | Treatment |
|---|---|---|
| R-WA | Baileys/unofficial WhatsApp ban or break | Accept for now; Cloud API option |
| R-UP | Hermes update drops patches | Re-apply patches; pin notes |
| R-WIN | Gateway restart race | Use capsule restart scripts |
| R-KEY | Session/creds leak | gitignore + scanners |
| R-LLM | 429/outage | fallback model policy |
| R-CLIN | Agent gives medical advice | SOUL + skills refuse |
| R-DOC | Docs claim stale approval gates | SPDS current state |
""")

add("threat_model.md", "52", "Threat Model", "CONDITIONAL",
    "Threats.",
    """
Assets: WhatsApp session, API keys, MEMORY.md, host. Adversaries: stolen session, prompt injection via WhatsApp, CSRF on control center, LAN attacker against bound dashboards. Mitigations: ignore unauthorized DMs, origin headers, loopback trust model, no PHI in git, mention gates.
""")

add("security_architecture.md", "53", "Security Architecture", "CONDITIONAL",
    "Security architecture.",
    """
Defense in depth: transport allowlists → persona refusals → approval gates (as configured) → OS file permissions → git ignore → sync regex scanners → control-center allowlisted scripts.
""")

add("security_requirements.md", "54", "Security Requirements", "CONDITIONAL",
    "Security requirements.",
    """
SEC-1 No secrets in git. SEC-2 Unauthorized DMs ignored. SEC-3 Dashboards not exposed to LAN without auth. SEC-4 Control actions CSRF-protected. SEC-5 Logs without PHI. SEC-6 Fail closed on stale memory replace.
""")

add("secure_development_plan.md", "55", "Secure Development Plan", "CONDITIONAL",
    "SSDF-aligned practices.",
    """
Least privilege tools; no eval; validate outbound drafts; never log creds; Chief review for persona; scanners on sync; do not weaken tests to pass.
""")

add("vulnerability_management.md", "56", "Vulnerability Management", "CONDITIONAL",
    "Vuln management.",
    """
Track Hermes CVEs and Baileys breaks. Capsule npm/electron: when installed, audit high/critical. No automated production patching. Record accepted risk in RISK_REGISTER.
""")

add("incident_response_plan.md", "57", "Incident Response Plan", "CONDITIONAL",
    "Incidents.",
    """
If session leak: unpair WhatsApp, rotate model keys, treat number as compromised. If prompt-injection: snapshot logs (redact), tighten allowlist, notify Chief. If clinical overclaim: halt feature, correct SOUL/skills, notify Chief.
""")

add("business_continuity_plan.md", "58", "Business Continuity Plan", "CONDITIONAL",
    "Continuity.",
    """
Avery is not a life-support system. Continuity target is **team coordination**, not clinical care. If WhatsApp dies, humans use other channels. Restore from encrypted backup of Hermes home (excluding publishing to git).
""")

add("disaster_recovery_plan.md", "59", "Disaster Recovery Plan", "CONDITIONAL",
    "DR.",
    """
Backup Hermes home (secrets included) to Chief-controlled encrypted store. Rebuild: install Hermes, restore profile, re-pair only if session invalid, re-apply patches, verify health. Capsule git restore does **not** restore the number.
""")

add("data_governance.md", "60", "Data Governance", "CONDITIONAL",
    "Governance.",
    """
Chief is data controller for operational agent data. Canonical institutional knowledge lives in skills/references, not in MEMORY.md. MEMORY.md is not the corporate database (SOUL.md).
""")

add("data_inventory.md", "61", "Data Inventory", "CONDITIONAL",
    "Inventory.",
    """
See `../data.md` and `../3-governance/data-privacy-by-design.md`. Categories: persona, skills, example config, session, env, memories, sqlite, pending JSON, logs.
""")

add("data_flow_map.md", "62", "Data Flow Map", "CONDITIONAL",
    "Flows.",
    """
Inbound WhatsApp → bridge → gateway → LLM vendor (prompts) → tools (filesystem/network) → optional memory files → outbound WhatsApp. Sync script copies **sanitized** profile fragments repo-ward. Secrets must not cross into git.
""")

add("data_classification.md", "63", "Data Classification", "CONDITIONAL",
    "Classification.",
    """
Public: README marketing. Internal: skills, architecture. Confidential: memories, chats, kanban. Secret: creds.json, API keys, .env. Restricted/PHI: if any health data appears in chats — do not commit; minimize; do not log.
""")

add("privacy_impact_assessment.md", "64", "Privacy Impact Assessment", "CONDITIONAL",
    "PIA.",
    """
Processing: messages of real people; possible incidental health talk in a healthcare-adjacent org. Lawful basis: Chief's operational instruction as organization operator. Risk: LLM vendor sees prompts; unofficial WhatsApp client. Mitigation: allowlists, redaction features where enabled, no git of chats, clinical non-role.
""")

add("data_retention_policy.md", "65", "Data Retention Policy", "CONDITIONAL",
    "Retention.",
    """
Runtime sqlite/logs: operator-defined; not in git. Pending approvals: expire per outbound store rules (e.g. 15 minutes in tests). Memories: keep until Chief deletes. Backups: encrypted, Chief-owned. No retention of PHI in repository — retention period is **zero**.
""")

add("data_processing_register.md", "66", "Data Processing Register", "CONDITIONAL",
    "Processing register.",
    """
| Processing | System | Recipients |
|---|---|---|
| Message inference | Hermes + LLM API | Model vendor |
| Messaging | Baileys / WhatsApp | Meta / counterparties |
| Local state | SQLite, markdown memory | Host only |
| Repo sync | git | Git host (sanitized only) |
""")

add("data_quality_plan.md", "67", "Data Quality Plan", "CONDITIONAL",
    "Quality of knowledge.",
    """
Institutional facts: skills + knowledge-governance skill (CONFIRMED / IN REVIEW / WORKING ASSUMPTION / GAP). Do not reconcile conflicts silently. Puskesmas name constraint in SOUL.md is an example of canonical integrity.
""")

add("ai_system_card.md", "70", "AI System Card", "DOMAIN",
    "AI system card.",
    """
**Name:** Avery. **Type:** LLM agent with tools. **Surface:** WhatsApp. **Runtime:** Hermes. **Primary model (example config):** google/gemini-2.5-flash via OpenRouter — live model may differ. **Human oversight:** Chief. **Not:** diagnostic SaMD.
""")

add("ai_intended_use.md", "71", "AI Intended Use", "DOMAIN",
    "Intended use.",
    """
Intended: executive coordination, knowledge routing, bounded tool execution for Sentra team communications.

Reasonably foreseeable misuse: medical advice, legal advice, unofficial WhatsApp spam, social engineering. Controls: SOUL, allowlists, mention gates.
""")

add("ai_system_architecture.md", "72", "AI System Architecture", "DOMAIN",
    "AI architecture.",
    """
LLM + tool loop inside Hermes; skills as markdown programs; memory files; optional MCP. No Sentra-trained weights in this capsule. Model is a service dependency.
""")

add("model_card.md", "73", "Model Card", "CONDITIONAL",
    "Model card.",
    """
This capsule does **not** train a foundation model. The model card of the live routed model is the vendor's. Record the **currently configured** model in live config (not git). Example: Gemini flash via OpenRouter. UNKNOWN without inspecting the host.
""")

add("dataset_datasheet.md", "74", "Dataset Datasheet", "CONDITIONAL",
    "Datasets.",
    """
No training dataset is shipped. Skills/references are curated institutional documents. They are not a research dataset for redistribution. Do not scrape chats into a training set without a separate Chief-authorized program.
""")

add("ai_risk_assessment.md", "75", "AI Risk Assessment", "DOMAIN",
    "AI risks.",
    """
Hallucinated institutional facts; prompt injection; over-autonomy; clinical overclaim; data leakage to vendors; WhatsApp policy violation. Residual risk accepted for internal team use under Chief, not for patient-facing clinical automation.
""")

add("ai_impact_assessment.md", "76", "AI Impact Assessment", "DOMAIN",
    "Impact.",
    """
Positive: coordination, memory of decisions. Negative if failed: noisy groups, incorrect tasking, leaked context. Affected persons: Founding Core and anyone in allowlisted groups. Severity limited by non-clinical role — unless humans wrongly rely on Avery as a clinician, which is prohibited.
""")

add("ai_evaluation_plan.md", "77", "AI Evaluation Plan", "DOMAIN",
    "AI eval.",
    """
Qualitative: mention discipline, refusal tests, honorifics. Quantitative: unittest for outbound. No published benchmark harness in-capsule as of this writing.
""")

add("ai_evaluation_report.md", "78", "AI Evaluation Report", "DOMAIN",
    "AI eval report.",
    """
No complete scored eval report is on file. Point to gate-0 and handoff evidence. Status: **incomplete as a formal AI eval dossier**.
""")

add("ai_limitations.md", "79", "AI Limitations", "DOMAIN",
    "Limits.",
    """
Cannot guarantee factual correctness; cannot see chats it is not in; cannot replace licensed professionals; unofficial WhatsApp may break; tools may fail; context windows truncate; group silence may miss distress unless DM policy says otherwise (SOUL: do not chime into distress publicly).
""")

add("human_oversight_plan.md", "80", "Human Oversight Plan", "DOMAIN",
    "Oversight.",
    """
Chief defines persona and allowlists. Humans remain accountable for institutional acts. Agents must escalate instinct-10 class actions. Oversight is **not** per-message approval for already delegated execution.
""")

add("model_change_management.md", "81", "Model Change Management", "CONDITIONAL",
    "Model changes.",
    """
Changing default model is a material change: record in DECISION_PROVENANCE, re-check 429 behavior, update CURRENT_STATE. Do not switch to `:free` SKUs for production chat (documented 429/403).
""")

add("ai_monitoring_plan.md", "82", "AI Monitoring Plan", "DOMAIN",
    "Monitoring.",
    """
gateway.log, errors.log, health scripts, ingress counters where implemented. No PHI in exported metrics. UNKNOWN: whether a hosted metrics backend exists — do not assume.
""")

add("ai_incident_plan.md", "83", "AI Incident Plan", "DOMAIN",
    "AI incidents.",
    """
Harmful outbound: stop gateway, preserve redacted logs, notify Chief, tighten policy. Model jailbreak: same. Wrong clinical advice: treat as safety incident even though product is not SaMD.
""")

add("ai_decommissioning_plan.md", "84", "AI Decommissioning Plan", "CONDITIONAL",
    "Decommission.",
    """
Unpair WhatsApp, revoke API keys, destroy session dir, archive encrypted backup if Chief wants, leave sanitized git capsule. Do not leave a live number attached to an unmaintained agent.
""")

add("agent_charter.md", "90", "Agent Charter", "DOMAIN",
    "Agent mandate.",
    """
Avery is Sentra's home/executive agent. Execute delegated work. Preserve human authority. Stay quiet in groups unless called. Never originate institutional commitments. Never diagnose.
""")

add("agent_capabilities.md", "91", "Agent Capabilities", "DOMAIN",
    "Capabilities.",
    """
See `../../capabilities.json` (conversational-response, relevance-gating, group-participation, local Kediri knowledge, kanban, cron, approval-gated memory, browser-use, web search, terminal, etc.). `not_yet`: maestro-control-plane, rate-limiting, result-validation, monitoring, multi-channel.
""")

add("agent_authority.md", "92", "Agent Authority", "DOMAIN",
    "Delegated authority.",
    """
Delegated: coordination, retrieval, bounded tools, drafts, scheduling within config. Not delegated: purpose changes, allowlist widening, SOUL rewrites, production credential use, clinical/legal/financial origination.
""")

add("autonomy_envelope.md", "93", "Autonomy Envelope", "SENTRA",
    "Human vs agent vs execution freedom.",
    """
## Human authority only

Purpose, persona, production deploy, secrets, group/DM policy flags that widen access, medical-device claims, institutional commitments.

## Agent authority (delegated)

Routine engineering inside the capsule; using tools to complete Chief-assigned tasks; proposing memory; executing already approved outbound drafts via the outbound library.

## Execution freedom

Inside a delegated task, choose implementation details that are reversible, tested, and secret-free. Do not expand scope to other capsules. Do not ask permission for `git status` or unittest. Do ask (or stop) at R3 and SOUL edits.
""")

add("tool_and_action_policy.md", "94", "Tool and Action Policy", "DOMAIN",
    "Tools.",
    """
Use tools to finish work; do not narrate them on WhatsApp. Terminal/browser are dual-use: no attacks, no credential printing. `send_message` may be intentionally unregistered as an agent tool in some Hermes builds — outbound then uses cron/CLI/MCP. Verify live tool list with `hermes doctor` on the host.
""")

add("memory_architecture.md", "95", "Memory Architecture", "CONDITIONAL",
    "Memory.",
    """
MEMORY.md / USER.md; delimiter `\\n§\\n`; char limits 2200; replace is exact substring; stale snapshot fails closed. Persistent memory is not canonical Sentra knowledge.
""")

add("delegation_policy.md", "96", "Delegation Policy", "CONDITIONAL",
    "Delegation.",
    """
Chief short orders ("handle this") authorize the stated objective. `delegate_task` is noted as unused in tech-debt — do not assume multi-agent delegation works until configured and tested.
""")

add("multi_agent_protocol.md", "97", "Multi-Agent Protocol", "CONDITIONAL",
    "Multi-agent.",
    """
Not an active multi-agent product. If Hermes A2A/delegation is enabled later, this document must be rewritten with evidence. Current protocol: **single Avery agent**.
""")

add("agent_evaluation.md", "98", "Agent Evaluation", "DOMAIN",
    "Agent eval.",
    """
Behavioral tests via live WhatsApp (Chief). Automated: outbound unittest. Skill `avery-self-check` exists to verify skill visibility at runtime.
""")

add("agent_failure_modes.md", "99", "Agent Failure Modes", "DOMAIN",
    "Failure modes.",
    """
Silent group drop (policy/config trap); orphan whatsapp-bridge holding session dir; 429 model; stale memory replace; pid-file double gateway; prompt injection; hallucinated org facts; restart apology spam (forbidden by SOUL).
""")

add("agent_handoff_protocol.md", "100", "Agent Handoff Protocol", "DOMAIN",
    "Handoff between agents/humans.",
    """
Use `context_handoff_packet.md`. Do not require a successor to read all chats. Prohibit assuming undocumented allowlist changes. Next evidence: live `hermes doctor` + test.ps1.
""")

add("operations_plan.md", "110", "Operations Plan", "CONDITIONAL",
    "Ops.",
    """
Operate on a dedicated host. Restart only via capsule scripts on Windows. Monitor bridge health on port 3000. Keep HERMES_HOME backed up. Do not enable `verify_on_stop` if it triggers destructive monorepo pnpm install (historical incident).
""")

add("runbook.md", "111", "Runbook", "CONDITIONAL",
    "Runbook.",
    """
Start/restart: capsule `scripts/restart-gateway.ps1` (or documented bat/sh). Pairing: Hermes WhatsApp flow. Logs: profile `logs/`. Group silent: check group_policy, mention_patterns quoting, extra vs top-level whatsapp keys, orphan bridge. See `../whatsapp-group-fix.md`.
""")

add("observability_plan.md", "112", "Observability Plan", "CONDITIONAL",
    "Observability.",
    """
Logs over metrics. Health HTTP on bridge. Optional health-check.ps1 ingress counts. No centralized APM claimed.
""")

add("sli_slo.md", "113", "SLI and SLO", "CONDITIONAL",
    "SLI/SLO.",
    """
No contractual SLO. Informal: replies on authorized chats in tens of seconds when models are healthy (gate-0 observed 3–28s historically). Availability target is best-effort for an internal agent.
""")

add("alerting_policy.md", "114", "Alerting Policy", "CONDITIONAL",
    "Alerting.",
    """
Do not spam WhatsApp on gateway restart. Human alerts: process down, bridge disconnected, repeated 429. No on-call rotation documented.
""")

add("backup_and_recovery.md", "115", "Backup and Recovery", "CONDITIONAL",
    "Backup.",
    """
Backup Hermes home including session (encrypted). Capsule git is not a session backup. Test restore on a spare host before disaster.
""")

add("incident_runbook.md", "116", "Incident Runbook", "CONDITIONAL",
    "Incident runbook.",
    """
1. Stop extra gateway instances. 2. Snapshot logs (redact). 3. Check bridge health. 4. If creds suspected leaked, unpair. 5. Notify Chief. 6. Write postmortem using template.
""")

add("postmortem_template.md", "117", "Postmortem Template", "CONDITIONAL",
    "Postmortem template.",
    """
Title / date / severity / timeline / FACT vs ASSUMPTION / blast radius / detection gap / fix / follow-up owners / evidence links / what not to change.
""")

add("maintenance_plan.md", "118", "Maintenance Plan", "CONDITIONAL",
    "Maintenance.",
    """
Re-apply Hermes patches after upgrade. Refresh example config when live policy changes. Run tests after outbound/policy edits. Review SPDS last_verified quarterly or on incident.
""")

add("deprecation_plan.md", "119", "Deprecation Plan", "CONDITIONAL",
    "Deprecation.",
    """
Deprecated: broker-as-second-permission-layer on contact-outreach (historical). When deprecating a skill, remove from runtime profile and SPDS capabilities in the same change set.
""")

add("retirement_plan.md", "120", "Retirement Plan", "CONDITIONAL",
    "Retirement.",
    """
Same as AI_DECOMMISSIONING_PLAN plus archive SPDS as historical. Do not leave healthcare overlay implying a retired agent is still a clinical system.
""")

add("compliance_matrix.md", "130", "Compliance Matrix", "CONDITIONAL",
    "Compliance.",
    """
| Framework | Posture |
|---|---|
| SAFRS | Capsule under monorepo policy |
| ISO 27001 | Aligned practices, not certified |
| ISO 42001 | Aligned AI docs, not certified |
| ISO 13485 / 14971 / IEC 62304 | **Not applicable as device QMS** — overlay explains non-applicability |
| HIPAA | Not a US covered entity product; still no PHI in git |
""")

add("regulatory_requirements.md", "131", "Regulatory Requirements", "CONDITIONAL",
    "Regulatory.",
    """
WhatsApp/Meta terms apply to unofficial clients (risk). Indonesian PDP principles: minimize, purpose limitation, security. Medical device regs **do not apply** while intended use remains non-clinical. If intended use becomes clinical, stop and re-classify before coding.
""")

add("license_register.md", "132", "License Register", "CONDITIONAL",
    "Licenses.",
    """
Hermes/Baileys typically MIT (verify upstream). Capsule skills: proprietary Sentra. Console: UNLICENSED. Do not combine GPL into proprietary skills distribution without counsel.
""")

add("ip_register.md", "133", "IP Register", "CONDITIONAL",
    "IP.",
    """
Sentra owns SOUL, skills, SPDS instance, outbound policy code, console branding. Hermes remains upstream IP. Do not copy third-party skills into the capsule without license.
""")

add("third_party_register.md", "134", "Third-Party Register", "CONDITIONAL",
    "Third parties.",
    """
NousResearch/Hermes lineage, WhiskeySockets Baileys, Google/OpenRouter (example), Meta WhatsApp, Electron, Hostinger (if used), Git host.
""")

add("software_bill_of_materials.md", "135", "Software Bill of Materials", "CONDITIONAL",
    "SBOM pointer.",
    """
Narrative SBOM: `../3-governance/software-bill-of-materials.md`. Generate a machine CycloneDX only if Chief asks; do not invent hashes.
""")

add("vendor_risk_register.md", "136", "Vendor Risk Register", "CONDITIONAL",
    "Vendors.",
    """
| Vendor | Risk |
|---|---|
| LLM API | outage, data in prompts |
| WhatsApp/Baileys | ban, protocol break |
| VPS | availability, seizure |
| Git host | public leak if mis-added files |
""")

add("contractual_requirements.md", "137", "Contractual Requirements", "CONDITIONAL",
    "Contracts.",
    """
No customer SaaS contract is attached to this capsule. Internal: Avery must not create contracts. Provider ToS bind the operator (Chief).
""")

add("intended_medical_use.md", "H01", "Intended Medical Use", "DOMAIN",
    "Medical intended use — none.",
    """
**Intended medical use: none.** Avery is not intended to diagnose, treat, mitigate, or prevent disease. It may discuss general publicly available medical literature only as routing support to licensed clinicians. Individual lab interpretation and prescribing are prohibited.
""")

add("clinical_requirements.md", "H02", "Clinical Requirements", "DOMAIN",
    "Clinical requirements.",
    """
CR-0: Do not act as a clinician. CR-1: Route clinical questions to humans named in SOUL (e.g. dr. Novi). CR-2: No patient identifiers in git or logs. CR-3: If a future product becomes clinical, freeze Avery executive scope and start a new regulated capsule.
""")

add("clinical_safety_plan.md", "H03", "Clinical Safety Plan", "DOMAIN",
    "Clinical safety.",
    """
Hazard: users treat Avery as a doctor. Control: explicit refusals, honorific routing, documentation of non-device status. Residual risk: user non-compliance. This is not an IEC 62304 safety case.
""")

add("medical_risk_management_file.md", "H04", "Medical Risk Management File", "DOMAIN",
    "ISO 14971-style file — bounded.",
    """
This is a **lightweight analog**, not a certified 14971 file. Foreseeable hazard: delayed care from relying on the agent. Mitigations: refusals + human clinicians. Residual: accepted for non-device software.
""")

add("software_safety_classification.md", "H05", "Software Safety Classification", "DOMAIN",
    "IEC 62304 classification.",
    """
**Not classified under IEC 62304** because Avery is not medical device software. If reclassified, halt operations and engage regulatory counsel. Do not self-assign Class A/B/C as a workaround.
""")

add("clinical_evaluation_plan.md", "H06", "Clinical Evaluation Plan", "DOMAIN",
    "Clinical evaluation.",
    """
Not applicable to current intended use. Plan if ever applicable: separate protocol, licensed investigators, no use of production WhatsApp dumps without ethics review.
""")

add("clinical_evaluation_report.md", "H07", "Clinical Evaluation Report", "DOMAIN",
    "Clinical evaluation report.",
    """
**None.** There is no clinical evaluation report because there is no clinical intended use.
""")

add("usability_engineering_file.md", "H08", "Usability Engineering File", "DOMAIN",
    "Usability (IEC 62366 analog).",
    """
Not a 62366 file. UX principles that matter for safety-adjacent misuse: silence in groups, no fake clinical confidence, no tool dump, clear BLOCKED format. Formal formative/summative studies: not performed.
""")

add("benefit_risk_analysis.md", "H09", "Benefit-Risk Analysis", "DOMAIN",
    "Benefit-risk.",
    """
Benefit: faster team coordination. Risk: over-reliance, privacy, unofficial messenger. Conclusion: acceptable for internal executive use; **not** acceptable as a care-delivery system.
""")

add("post_market_monitoring_plan.md", "H10", "Post-Market Monitoring Plan", "DOMAIN",
    "Post-market.",
    """
Not a medical post-market plan. Operational analog: watch logs for clinical overclaim, WhatsApp disconnects, and policy misses; Chief reviews incidents.
""")

add("purpose_contract.md", "S02", "Purpose Contract", "SENTRA",
    "Purpose → outcome → non-outcome → principles → evidence.",
    """
## Purpose

WhatsApp-native executive intelligence for Sentra under human authority.

## Desired outcome

Verified coordination: context preserved, decisions structured, work executed within envelope.

## Non-outcome

Chatbot entertainment; silent high-impact autonomy; clinical replacement; documentation theater.

## Immutable principles

Purpose before process. Authority before autonomy. Evidence before assertion. Current state before history. Outcomes before activity. Capability never implies permission.

## Success evidence

See success_criteria.md and goal_to_evidence_matrix.md.

Material changes must show a link to this contract or they are **project drift**.
""")

add("epistemic_ledger.md", "S03", "Epistemic Ledger", "SENTRA",
    "FACT vs DECISION vs ASSUMPTION vs UNKNOWN.",
    """
## FACT

- Capsule path `projects/healthcare/avery` exists with profile, skills, scripts, tests, console.
- `capabilities.json` version 0.2.0 lists capabilities and `not_yet`.
- SOUL.md forbids clinical origination and restart apologies to WhatsApp.
- Older docs and HANDOFF may disagree on `write_approval` / FULL AUTO — do not collapse that disagreement into a single fake fact.

## DECISION

- Avery is not SaMD (Chief / this SPDS set).
- Baileys transport accepted with risk.
- Group widening (`group_policy: open`) was explicitly not applied in 2026-08-24 handoff.

## ASSUMPTION

- Example config still approximately matches production keys (values in example are placeholders).

## HYPOTHESIS

- Official Cloud API would reduce ban risk (not implemented).

## UNKNOWN

- Live gateway up/down at read time.
- Exact live model id.
- Exact live write_approval boolean without reading host config.yaml.

## DISPUTED

- Memory write_approval true (older governance docs) vs FULL AUTO false (handoff 2026-08-24). **Resolve by inspecting live config.yaml.**

## SUPERSEDED

- Contact-outreach broker as second permission layer (noted as dropped in monorepo HANDOFF for Avery).
""")

add("current_state_snapshot.md", "S04", "Current State Snapshot", "SENTRA",
    "What exists now.",
    """
Inspected from the capsule tree on 2026-08-25 (repository), not from a live Hermes process.

**Present in git:** persona, 18 skills, config.example.yaml, capabilities.json, docs (legacy layers + this SPDS), scripts, src/avery_outbound, Electron console, deploy templates, evidence folders.

**Not in git (by design):** live config.yaml, .env, WhatsApp session, MEMORY.md, sqlite.

**Divergence:** Layer-3 permission-broker still describes `write_approval: true` as configuration; 2026-08-24 operational handoff describes FULL AUTO with approvals false. Operational truth is the **host file**.

**Outstanding:** VPS cutover unverified from this session; WhatsApp live tests require Chief.
""")

add("project_drift_ledger.md", "S05", "Project Drift Ledger", "SENTRA",
    "Expected vs actual.",
    """
| Expected | Actual | Impact | Action |
|---|---|---|---|
| Single current-state narrative | Legacy docs + handoff + SOUL | Agents guess | SPDS CURRENT_STATE is now canonical; update legacy or mark superseded |
| write_approval documented consistently | Conflicting files | Wrong autonomy | Inspect host; then edit example/docs together |
| capabilities monitoring | `not_yet` includes monitoring | Overclaim | Do not claim APM |
| Medical documentation if health folder | Must not imply SaMD | Regulatory risk | H01–H10 classify non-device |
""")

add("goal_to_evidence_matrix.md", "S06", "Goal to Evidence Matrix", "SENTRA",
    "Purpose to outcome evidence.",
    """
Purpose (executive WhatsApp agent)
→ Outcome (bounded, useful, silent when needed)
→ Requirements PR-1..PR-7
→ Architecture (Hermes + bridge + profile)
→ Implementation (SOUL, skills, scripts)
→ Tests (unittest + live)
→ Runtime evidence (logs, health)
→ Outcome evidence (Chief-accepted operation)

A green unittest run does **not** by itself prove outcome S1.
""")

add("decision_provenance.md", "S07", "Decision Provenance", "SENTRA",
    "Decisions with authority and alternatives.",
    """
| Decision | Authority | Evidence then | Alternatives | Depends on |
|---|---|---|---|---|
| Hermes + WhatsApp | Chief | operating agent | Cloud API, Slack | Baileys risk |
| Non-SaMD | Chief | intended use | Regulated product | H01 |
| Allowlist groups | Chief | silent-group incidents | open groups | env flags |
| Skills as markdown programs | Chief/engineering | Hermes skill model | compiled tools | runtime |
""")

add("change_impact_packet.md", "S09", "Change Impact Packet", "SENTRA",
    "Template for material change.",
    """
Fill for every material change:

Why? What changes? Which purpose/requirement? What is invalidated? Which dependencies? What evidence must be regenerated? What new risk? Which assumption dies?

Until filled, treat the change as incomplete documentation even if the code merged.
""")

add("context_handoff_packet.md", "S10", "Context Handoff Packet", "SENTRA",
    "Takeover packet.",
    """
**Purpose:** WhatsApp executive agent under Chief.

**Current state:** see current_state_snapshot.md.

**Active decisions:** non-SaMD; Baileys; allowlist (open group not enabled per 2026-08-24).

**Unresolved:** live write_approval; VPS; Cloud API; monitoring.

**Active risks:** R-WA, R-UP, R-DOC.

**Current task:** SPDS 1.0 documentation set (this directory).

**Authoritative sources:** PROJECT_GENOME.yaml, purpose_contract.md, SOUL.md, live config on host.

**Prohibited assumptions:** Avery is a medical device; tests imply production health; example YAML is the live secret-bearing config.

**Next evidence required:** `scripts/test.ps1` result; optional `hermes doctor` on host.
""")

add("failure_boundary_map.md", "S11", "Failure Boundary Map", "SENTRA",
    "Failures before they happen.",
    """
| Failure | Blast radius | Degraded | Recovery owner | Auto recover | Escalate | Unacceptable |
|---|---|---|---|---|---|---|
| Model 429 | no replies | wait/fallback | operator | partial | if persistent | silent forever without alert |
| Bridge death | no WhatsApp | other UIs maybe up | operator | no (restart script) | immediately | orphan process + false unpaired |
| Session leak | account takeover | isolate number | Chief | no | immediately | continued operation |
| Clinical answer | patient harm via reliance | refuse + correct | Chief | no | immediately | any diagnostic pose |
""")


def main() -> None:
    ADR.mkdir(parents=True, exist_ok=True)
    for file, id_, title, klass, purpose, content in ITEMS:
        write(file, id_, title, klass, pack(purpose, content))

    write(
        "ADR/adr-0001.md",
        "24",
        "ADR-0001 WhatsApp-native executive agent on Hermes",
        "CORE",
        pack(
            "Record architecture decision.",
            """
## Decision

Build Avery as a Hermes-configured WhatsApp agent, not as a greenfield engine.

## Reason

Team already works in WhatsApp; Hermes provides tools, memory, gateway.

## Alternatives

Custom bot; Cloud API-only; Slack-first.

## Consequences

Unofficial transport risk; external runtime dependency; capsule is configuration-plus-ops.
""",
        ),
    )
    write(
        "ADR/adr-0002.md",
        "24",
        "ADR-0002 Baileys unofficial transport",
        "CORE",
        pack(
            "Record transport decision.",
            """
## Decision

Use Baileys bridge.

## Reason

Works for a dedicated bot number without Cloud API onboarding.

## Alternatives

Official Cloud API.

## Consequences

Ban/IP risk; accepted (RISK_REGISTER R-WA).
""",
        ),
    )
    write(
        "ADR/adr-0003.md",
        "24",
        "ADR-0003 Capsule configures an external engine",
        "CORE",
        pack(
            "Record boundary decision.",
            """
## Decision

Do not vendor the full Hermes engine inside the capsule as the product.

## Reason

Standalone capsule contract: ops scripts + profile; engine is an installed dependency.

## Alternatives

Fork-and-vendor Hermes.

## Consequences

Patch re-apply after upgrades.
""",
        ),
    )
    write(
        "ADR/adr-0004.md",
        "24",
        "ADR-0004 Avery is not a medical device",
        "CORE",
        pack(
            "Record regulatory classification.",
            """
## Decision

Healthcare folder placement does not create SaMD.

## Reason

Intended use is executive coordination.

## Alternatives

IEC 62304 program.

## Consequences

H01–H10 document non-applicability; clinical origination forbidden.
""",
        ),
    )
    write(
        "ADR/adr-0005.md",
        "24",
        "ADR-0005 Mention and allowlist gating",
        "CORE",
        pack(
            "Record group policy decision.",
            """
## Decision

Default to mention/allowlist; do not silently open all groups.

## Reason

Silence-by-design; historical silent-drop bugs from bad policy values.

## Alternatives

`group_policy: open` + allow-all env (Chief-gated).

## Consequences

New groups must be registered; scripts exist to find unregistered groups.
""",
        ),
    )

    spds = front("SPDS", "Sentra Project Documentation Standard 1.0", "SENTRA")
    (ROOT / "spds.md").write_text(
        spds
        + dedent(
            """\
            # Sentra Project Documentation Standard (SPDS) 1.0 — 2026

            **Status:** Adopted for Avery as the first Sentra project instance (Chief-directed).  
            **Positioning:** SPDS is a purpose-oriented, evidence-bearing, human-authoritative documentation architecture for modern software, systems, AI, and agentic projects.

            ## Philosophy

            Documentation is not an archive. It is:

            **Purpose → Decision → Requirement → Implementation → Evidence → Outcome**

            A project must make it possible for a human or an AI agent to understand why it exists, what success is, who decides, what was decided, what is true now, what is unknown, what must be built, how to prove it, which risks are accepted, and how it changed.

            ## Core rule

            Every document must AUTHORIZE, DEFINE, DECIDE, GUIDE, VERIFY, or PRESERVE. If it does none, it is bureaucracy.

            ## Difference from traditional docs

            Traditional: which documents did we produce?  
            SPDS: what must be true, who decided it, why is it true, what exists now, where is the evidence?

            Traditional traceability: Requirement → Test.  
            SPDS: Purpose → Decision → Requirement → Architecture → Implementation → Evidence → Outcome.

            Traditional AI governance: policy + model card.  
            SPDS agent governance: Human Authority → Autonomy Envelope → Action → Evidence → Accountability.

            ## Metadata

            Authoritative documents use the YAML header in this directory.

            ## This instance

            Avery's filled documents live alongside this file. The machine root is `../../PROJECT_GENOME.yaml`.

            Core principle: Purpose before process. Authority before autonomy. Evidence before assertion. Current state before history. Outcomes before activity.
            """
        ),
        encoding="utf-8",
    )
    print(f"wrote {len(list(ROOT.rglob('*.md')))} markdown files under {ROOT}")


if __name__ == "__main__":
    main()
