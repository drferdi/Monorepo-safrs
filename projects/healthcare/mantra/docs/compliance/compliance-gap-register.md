# Compliance Gap Register

Status: scaffold baseline
Date: 2026-07-16

| ID | Gap | Severity | Required before | Owner | Closure evidence |
|---|---|---|---|---|---|
| GAP-001 | Formal clinical-safety risk records are scaffolded but not executed for each workflow. | High | Real clinical use | Clinical + technical owner | Approved risk records for Home, clinical workspace, patient workflows, integrations. |
| GAP-002 | Staging/production secrets manager not implemented. | High | Staging / Tahap 7 | Technical owner | SOPS+age for staging; KMS/Vault for production. |
| GAP-003 | No formal access-control matrix for roles and DocTypes. | High | Real patient data | Technical owner | Role-to-permission matrix and review sign-off. |
| GAP-004 | No formal validation records for workspace setup and dashboard behavior. | Medium | Staging | Developer/reviewer | Completed validation records under `docs/validation/records/`. |
| GAP-005 | No SBOM/dependency risk review. | Medium | Staging | Technical owner | SBOM artifact and dependency review report. |
| GAP-006 | No incident response and breach-notification drill evidence. | High | Production | Operator/privacy owner | Incident drill record and approved runbook. |
| GAP-007 | No formal backup/restore evidence stored as controlled record in this scaffold. | High | Staging | Operator | Backup/restore drill record with timestamp and outcome. |
| GAP-008 | Future SATUSEHAT/BPJS interface control documents not yet written. | High | Tahap 7 implementation | Integration owner | Approved ICD, credential plan, retry/reconciliation design. |
| GAP-009 | WCAG 2.2 AA/accessibility validation not yet executed. | Medium | Portal / broad user rollout | UI owner | Accessibility checklist and test evidence. |
| GAP-010 | Regulatory classification not formally decided. | High | Production planning | Product/clinical owner | Classification memo and external counsel/regulatory review if required. |

## Rule

Do not mark a gap closed without linking concrete evidence in the repository or an approved external controlled record.
