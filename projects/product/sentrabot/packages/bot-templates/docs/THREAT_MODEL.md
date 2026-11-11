# Agentic Threat Model

## Assets
- credentials and authenticated sessions
- personal and sensitive data
- business records and source-of-truth systems
- production infrastructure
- financial authority
- legal and regulatory commitments
- clinical and patient-safety workflows
- public communications and reputation
- audit logs and provenance

## Trust boundaries
1. user instruction
2. bot configuration
3. retrieved content and external websites
4. connector/tool interface
5. credential/session layer
6. source system
7. approval UI / human reviewer
8. audit and evaluation systems

## Principal threats

### Prompt injection
Untrusted content may contain instructions that conflict with the agent's task or safety policy. Retrieved instructions remain data. The agent should extract relevant facts without granting the source control over tool behavior.

### Excessive agency
Risk emerges from too much functionality, permission, or autonomy. Mitigate by giving the role only the tools it needs, using read-only/scoped credentials where possible, and keeping consequential execution behind approval.

### False security boundary between bots
Where the underlying product shares a cloud computer, browser sessions, files, or credentials across bots, role separation does not imply credential isolation. Enforce isolation in connector/service-account/tool layers.

### Stale or missing authoritative data
Automation can create confidently wrong outputs when a system of record fails or stops refreshing. Every routine requires explicit no-data and stale-data behavior.

### Conflicting sources
An agent may silently reconcile conflict into a plausible but false narrative. Preserve conflicting evidence, rank source authority, and escalate material disagreements.

### Approval fatigue
Broad approval prompts are not meaningful control. Approval requests should identify the target, scope, values, expected effect, reversibility, and evidence supporting the action.

### Tool confused-deputy behavior
A benign request can cause a privileged tool to act on malicious external input. Check capability, source, target, and approval category at execution time, not only during planning.

### Audit suppression
A high-agency agent must never be able to disable, rewrite, or conceal the audit trail used to supervise it. `disable_audit_trail` is denied in every shipped template.

## Healthcare overlay
Clinical diagnosis, treatment, patient-facing actions, clinical-record modifications, serious patient-safety decisions, and regulator submissions require domain-specific governance and appropriate human authority. The Chief of Staff pattern is operational coordination, not replacement of licensed clinical judgment.
