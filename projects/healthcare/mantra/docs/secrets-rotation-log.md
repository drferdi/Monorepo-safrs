# Secrets Rotation Log

> Append-only record required by ADR-0002 (rule 3). Newest entry at the bottom.
> NEVER write secret values here — only the event (who, when, what, why).

| Date | Who | Secret | Action | Why |
|---|---|---|---|---|
| 2026-07-15 | Chief (manual) | `mantra.localhost` site `db_password` | Rotated; stored in git-ignored `.env` | Tahap 0 hardening before backup/restore drill (exact rotation date was shortly before the drill; logged retroactively when this log was created) |
| 2026-07-15 | Chief (manual) | `mantra.localhost` Administrator password | Rotated; stored in git-ignored `.env` | Same Tahap 0 hardening event as above |
| 2026-07-22 | Chief (via Cowork) | SATUSEHAT Production Client Secret (RSIA Melinda, Org 100027810) | Stored in git-ignored `.env` as `MANTRA_SATUSEHAT_*` | Enable SATUSEHAT FHIR integration; rotate recommended after wiring (value transited chat) |
