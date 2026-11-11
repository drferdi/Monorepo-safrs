# Operational Readiness Plan

Status: scaffold baseline
Date: 2026-07-16

## Purpose

Define operational readiness requirements for running Sentra MANTRA safely across development, staging, and production phases.

## Current runtime

- Bench root: `apps/healthcare/mantra` on Windows host; `/workspace` inside dev container.
- Dev container image: `docker.io/frappe/bench:latest`.
- Services: MariaDB 11.8, Redis cache, Redis queue, Frappe container.
- Main command: `bench start`.
- Ports: web `8000`, socket.io `9000`, watcher `6787`.
- Default site: `mantra.localhost`.

## Startup

Inside dev container:

```bash
bench start
```

From Windows helper BAT created on Desktop:

```text
C:\Users\drfer\Desktop\Start Sentra MANTRA Server.bat
```

## Operational commands

```bash
bench --site mantra.localhost migrate
bench --site mantra.localhost list-apps
bench --site mantra.localhost console
bench build
bench --site mantra.localhost run-tests --app sentra_mantra_indonesia
```

## Backup/restore readiness

Before staging and production, record:

- Backup command used.
- Restore command used.
- Backup location.
- Encryption/protection method.
- Restore result.
- Data scope.
- Operator.
- Date/time.

Secrets must never be passed literally on command line.

## Monitoring/logging readiness

Current logs exist under `logs/`, but onboarding and AI tooling must avoid quoting raw logs because they may contain PHI/PII. Before production:

- Define log retention.
- Define log access roles.
- Configure error monitoring.
- Confirm logs do not contain secrets.
- Define audit log review process.

## Environment gates

### Development

Allowed with current Docker Compose and dev-only plaintext root password. No real patient data.

### Staging

Requires:

- SOPS+age or equivalent staging secrets process.
- Backup/restore evidence.
- Access-control matrix.
- Validation records for enabled workflows.

### Production

Requires:

- KMS/Vault-equivalent secrets manager.
- Formal incident response.
- Privacy procedure and breach notification workflow.
- Clinical-safety risk acceptance.
- Monitoring, backup, restore, and disaster recovery evidence.

## Current status

Development operation is documented. Staging and production readiness controls are not complete.
