# Security Model

## Threat model summary

This plugin can touch: repository files (read), test/build commands (execute, approval-gated), reports (write), and stdout/stderr (transcript). It must never: exfiltrate data, print/persist/transmit secrets, mutate production, or bypass human approval for high-impact actions.

## Trust boundaries

| Boundary | Definition |
|---|---|
| Plugin code | Trusted by construction: manifest, skills, commands, droid prompts, hooks. |
| Repository content | **Untrusted data**, never instructions (per repo AGENTS.md policy). |
| User chat input | Untrusted; validated for secret patterns (warn only). |
| Filesystem | Read for reviews; write only to explicitly named report targets. |
| Network | Unused: zero MCP servers, no hook network calls, no external services. |

## Least privilege

- **Droids**: `repository-auditor` read-only; `security-reviewer` read-only + WebSearch; `test-engineer` and `release-verifier` limited execute (approval-gated); `documentation-engineer` read + doc-scoped edit — no general shell.
- **Hooks**: PowerShell scripts with no parameters that mutate anything, no downloads, no network; they inspect stdin only.
- **Commands**: read-only by default; test/build steps require approval.

## Secret handling

Rules enforced across the package:

1. No secrets are stored in the plugin (zero API keys, tokens, passwords).
2. `block-secret-output` (PreToolUse/Read) refuses to open secret-sensitive paths: `.env*`, `*.pem`, `*.p12`, `*.pfx`, `*.key`, `*.keyring`, `id_rsa`/`id_ed25519`/`id_ecdsa`/`id_dsa`, `.ssh/`, `auth.v2.key`, `credentials*`, `secrets*`, `tokens.*`.
3. `validate-context` (UserPromptSubmit) warns when a prompt contains likely secret patterns (GitHub/GitLab PAT, AWS key, `sk-`, Slack, Google, Factory `fk-`, private key headers, inline `key=...` assignments). **Warning only; never blocks input.**
4. If a secret is encountered during review, describe location and format, recommend rotation — never print the value.
5. Droid Shield remains enabled for git commit/push protection (built-in; not modified by this plugin).

## Hook failure behavior

| Hook | Failure mode | Impact |
|---|---|---|
| `block-secret-output` | Exits 2 (block + reason) for secret paths | Safe default: refuses to read |
| `block-secret-output` | Parse error / no input / no path | **Fail-open** (exit 0) so it never breaks sessions |
| `validate-context` | Any error | Never blocks; warning only |
| `verify-before-finish` | Any error incl. log write failure | Non-blocking reminder only; exit 0 always |
| All hooks | `SENTRA_HOOKS_DISABLE=1` | Fully bypassed |

## Why hooks cannot exfiltrate

- No network calls (`Invoke-WebRequest`, `curl`, sockets are absent).
- No subprocess execution in hooks.
- Optional logging writes one line to a path the user chooses (`SENTRA_VERIFY_LOG`) and never includes prompt/file contents beyond a timestamp and log size.
- Hooks receive only the hook input JSON on stdin.

## Human approval gates

High-impact actions (push, deploy, merge, publish, tag, credential changes, production mutations, large deletions) are **never** auto-approved in this package: skills, commands, and droids all require explicit human authorization for such actions.

## Known risks & mitigations

| Risk | Mitigation |
|---|---|
| False positive in secret-blocking (reads a legitimately named file) | List of strong patterns only; env kill-switch; documented false-positive path |
| False positive in prompt warning | Warning only, never blocking |
| Repo politeness (`.droid` inside a monorepo) | Package is a standalone directory; no root files touched |
| Hook overhead per Read/Stop event | Single small PowerShell process, 30s timeout, exit fast on no input |

## Limitations (honest)

- Hooks cannot detect *all* secret formats; they complement (not replace) Droid Shield.
- `block-secret-output` covers `Read`; other tools that surface file content (e.g. `Execute` cat) are not blocked — Droid Shield and review practices cover the rest.
- This is a detection/warning layer, not a sandbox.
