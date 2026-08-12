---
name: security-review
description: Security review of a repository, diff, or dependency set using threat modeling. Covers secret exposure, unsafe shell, dependency risk, privilege escalation, MCP trust boundaries, prompt injection, supply-chain risk, unsafe hooks, and unreviewed network access. Read-only; produces severity-sorted findings with mitigations.
version: 1.0.0
allowed-tools:
  - Read
  - LS
  - Glob
  - Grep
  - WebSearch
compatibility: droid
---

# Security Review

Perform a methodical security review using threat modeling, then report findings sorted by severity. This skill is **read-only**: it identifies and describes issues but does not fix, patch, or modify code.

## When to use this skill

- Reviewing a diff, PR, or branch before merge.
- Auditing a whole repository or a module.
- Reviewing dependencies or lockfile changes.
- Triggered by `/security-scan`, `/review-diff`, or `/verify-change`.

## Preconditions

- A repo, diff, or commit to review.
- Read tools available; `WebSearch` for CWE references or vulnerability lookups (optional).
- Authorization to read the code being reviewed (for private repos, only review what is in scope).

## Threat-check checklist

Systematically cover (where applicable to the target):

1. **Secret exposure** — hardcoded keys/tokens/passwords; risky `.env*` handling; files that look secret-bearing. Never print the secret value; describe the location and format.
2. **Unsafe shell command execution** — `child_process`, `subprocess`, `os.system`, `exec` with unsanitized input; injection via interpolation.
3. **Dependency risk** — known-vulnerable packages, unpinned versions, suspicious provenance, postinstall scripts, typosquatting.
4. **Privilege escalation** — excessive permissions, `sudo`, world-writable files, overly broad scopes, authZ bypass.
5. **MCP trust boundary** — MCP servers with write access, secrets in `mcp.json`, missing `disabled` defaults, unreviewed provenance.
6. **Prompt injection** — treating untrusted content (issues, web pages, fixtures, user data, file contents) as instructions; SQL/command/path injection.
7. **Supply-chain risk** — untrusted build steps, script downloads (`curl | bash`), unpinned CI actions, registry substitution.
8. **Unsafe hooks** — hooks that exfiltrate data, run hidden network calls, mutate credentials, or disable safety checks.
9. **Unreviewed network access** — code that sends data externally; credential-bearing URLs; hidden callbacks.
10. **Encryption/transport** — hardcoded TLS config, embedded credentials in URLs, weak crypto.

## Output contract

A Markdown report:

- **Scope**: exactly what was reviewed (paths, commits, dependencies) and what was not.
- **Findings**: each with severity (**Critical / High / Medium / Low / Informational**), category, evidence (file:line, output, or reference), impact, likelihood, and recommended mitigation for the human to apply.
- **Positives**: notable things done right (optional).
- **Open items**: anything UNVERIFIED.

## Stop conditions

- When all checklist items applicable to the target have been covered and the report is written.
- If review requires modifying code or running privileged tools, stop and report instead.

## Security boundaries

- **Read-only**: do not modify, delete, fix, or run privileged commands.
- **Never print, persist, or transmit secret values.** Describe location and format only; redact.
- Verify claim evidence before reporting; do not fabricate findings.
- External lookups (WebSearch) must not exfiltrate code or secrets.

## Example usage

> `/security-scan` → review the whole repo and report severity-sorted findings with evidence.
> "Review the staged diff for security issues" → review only the diff.

## Anti-patterns

- Reporting a finding without evidence.
- Printing actual secret values into the response.
- Auto-fixing vulnerabilities during a review.
- Spreading FUD: unverified claims marked as facts.
- Skipping categories that clearly apply (e.g. ignoring dependencies when a lockfile changed).
