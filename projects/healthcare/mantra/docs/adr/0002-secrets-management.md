# ADR-0002: Secrets Management Policy

## Status

Accepted — 2026-07-15

## Context

The backup/restore drill (Tahap 0 exit gate) surfaced the current state of secrets handling:

- Site `db_password` was rotated manually earlier and lives in `.env`, which is git-ignored — acceptable.
- MariaDB root password for the dev container is a plaintext value (`123`) written directly in `.devcontainer/docker-compose.yml` — acceptable for local dev only.
- The restore command during the drill passed `--db-root-password` as a literal value on the command line, which risks the value leaking into shell history and process listings (`ps aux`, `docker top`) even for a low-stakes dev password. This habit must not carry forward once real credentials are involved.
- No formal secrets manager (Vault, SOPS, cloud KMS) exists yet. This is appropriate for the current pre-production, no-real-patient-data stage, but must not remain the state once Tahap 7 (SATUSEHAT/BPJS integration) introduces real external API credentials, and once real patient data exists anywhere in the system.

## Decision

Secrets handling is tiered by environment phase, not solved with a single mechanism up front:

| Phase | Mechanism | Rationale |
|---|---|---|
| Dev (current) | `.env` (git-ignored); dev-only plaintext root password in compose file | Already working, low risk, no real data |
| Staging / pre-prod | SOPS + age, secrets file kept in a separate ops repository (not the application repo) | Lightweight, git-diffable, no new infrastructure to run, appropriate for a solo-founder team |
| Production, mandatory before Tahap 7 (SATUSEHAT/BPJS) begins | Cloud KMS (if deploying to a cloud provider) or self-hosted Vault (if on-prem) | Real external API credentials and real patient data change the stakes; this must exist before those integrations are built, not after |

### Hard rules, effective immediately

1. No secret value is ever passed literally on a command line. Always reference an environment variable (e.g. `--db-root-password "$DB_ROOT_PW"`), even for low-stakes dev passwords — the habit must be correct before the stakes are high.
2. Any custom DocType field that stores an API key or credential (e.g. future SATUSEHAT/BPJS client config) must use Frappe's `Password` field type (encrypted at rest), never `Data`.
3. Rotation events must be logged (who, when, why). A minimal append-only record is acceptable before this is formalized further. **Implemented 2026-07-15:** `docs/secrets-rotation-log.md` (bench repo) — event metadata only, never secret values.

## Consequences

- Positive: matches actual risk at each phase instead of over-engineering secrets tooling for a solo-founder, pre-revenue, pre-production stage.
- Negative / trade-off: staging credential handling is still manual until SOPS + age is actually adopted — this must be scheduled as a concrete task before a staging environment is stood up, not assumed to happen automatically.
- This ADR does not cover UU PDP data-subject-rights workflows (data access requests, breach notification) — that is tracked as a separate compliance gate, not folded into secrets management.

## Exit Criteria (closes the Tahap 0 "secrets" item)

- [x] Policy documented (this ADR).
- [x] Command-line plaintext secret rule enforced going forward (closes drill review finding #1).
- [ ] SOPS + age adopted in a separate ops repo before a staging environment is created.
- [ ] Cloud KMS or self-hosted Vault adopted before Tahap 7 (SATUSEHAT/BPJS) implementation begins.

## Alternatives Considered

- **Vault from day one** — rejected: operational overhead disproportionate to a solo-founder, pre-production stage with no external integrations yet.
- **Plaintext `.env` carried into staging/production** — rejected: unacceptable once real patient data or real external API credentials exist, given the clinical/regulated nature of the system.
