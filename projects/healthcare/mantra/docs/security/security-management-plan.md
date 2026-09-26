# Security Management Plan

Status: scaffold baseline
Date: 2026-07-16

## Purpose

Define security controls for Sentra MANTRA development and operation, aligned with ISO/IEC 27001:2022, ISO/IEC 27002:2022, ISO/IEC 27005:2022, ISO 27799, and OWASP secure development principles.

## Current security-relevant architecture

- Frappe Framework handles authentication, permissions, Desk routing, DocType access, and RPC methods.
- MariaDB stores site data.
- Redis supports cache, queue, and socket.io.
- Dev environment runs in Docker Dev Container.
- `sentra_mantra_indonesia.ws_common.can` uses `frappe.has_permission` before aggregating workspace data.
- `ADR-0002` defines secrets-management rules.

## Security requirements

| Control | Requirement | Current status |
|---|---|---|
| Secrets | No secret literal on command line; no secrets in logs/docs/source | Documented in ADR-0002; operational enforcement needed. |
| Credentials | Future API credential fields use Frappe `Password` type | Required before integrations. |
| Access control | Least privilege by role and DocType | Frappe model available; matrix needed. |
| Audit logging | Critical access/actions should be auditable | Frappe has activity/version mechanisms; project-specific audit review needed. |
| Secure coding | No `ignore_permissions` in user-facing data APIs unless justified | Current workspace common docstring forbids it. |
| Dependency management | Pin/review dependencies and upstream app commits | `sites/apps.json` records versions/commits. |
| Environment separation | Dev/staging/prod secrets and data isolated | Dev exists; staging/prod plan incomplete. |
| Backup security | Backup files protected and not committed | Procedure/evidence needed. |
| Incident response | Security incident workflow documented/tested | Scaffold needed before production. |

## Secure development checklist

For every change:

- Does it expose new RPC/HTTP endpoint?
- Does it read patient, employee, financial, credential, or integration data?
- Does it use `ignore_permissions`?
- Does it log values from user records, patient records, credentials, or config?
- Does it add dependency or external service?
- Does it alter roles, permissions, sessions, authentication, or DocType access?
- Does it require a risk record, validation record, or ADR?

## Current mandatory actions before staging

1. Add secret scanning to local/CI workflow.
2. Generate SBOM or equivalent dependency inventory.
3. Create role/access-control matrix.
4. Define backup encryption/storage handling.
5. Record boundary-check and test results for each release candidate.

## Current mandatory actions before production

1. Adopt KMS/Vault-equivalent production secrets manager.
2. Complete security risk assessment.
3. Run penetration/security review for public-facing portal/API surfaces.
4. Complete incident response and breach notification drill.
5. Complete audit log and retention review.
