# Security Model

## Core rule
The model decides what to *recommend*. The control plane decides what may *execute*.

## Never store in the repository
- passwords
- API keys
- OAuth refresh tokens
- session cookies
- private keys
- patient or customer production data
- live internal URLs when repository sharing would expose them

## Production controls expected outside prompts
- scoped service accounts / OAuth scopes
- connector allowlists
- capability-level authorization
- environment/tenant isolation
- network egress controls where appropriate
- human approval service
- immutable or independently protected audit logs
- secrets manager
- rate limiting and anomaly detection

## Mandatory review areas
1. prompt injection and tool confused-deputy paths
2. excessive functionality, permission, or autonomy
3. cross-bot/shared-session exposure
4. destructive/irreversible operations
5. financial and legal commitment paths
6. production infrastructure changes
7. personal and sensitive data
8. healthcare / patient-safety workflows
9. public/regulatory communications
10. audit-trail integrity

## Vulnerability handling
Before production deployment, replace this starter's local-only process with your organization's security disclosure and incident-response process. Treat policy bypass, unexpected write access, approval bypass, source exfiltration, and audit suppression as security events.
