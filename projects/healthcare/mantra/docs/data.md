# Data

- System of record: the bench's MariaDB database for `mantra.localhost`. It is never part of
  this folder; backups follow `docs/operations/backup-restore.md`.
- Secrets (database password, Administrator password, SATUSEHAT client credentials) live in a
  git-ignored `.env` inside the bench and are named, never stored, here (ADR-0002;
  `docs/secrets-rotation-log.md` records events only).
- `.devcontainer/docker-compose.yml` requires `MARIADB_ROOT_PASSWORD` from the environment.
- Test data: synthetic `e2e-*@mantra.test` accounts seeded by `e2e/seed.sh`; passwords come
  from `MANTRA_ADMIN_PASSWORD` and `MANTRA_E2E_PASSWORD`.
- Staff and patient data, spreadsheets, and database dumps never enter this folder.
