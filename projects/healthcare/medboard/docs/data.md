# Data

MedBoard is a clinical intelligence dashboard (Puskesmas Dashboard). Privacy rules and the
PHI-free design are documented in [`governance/privacy.md`](./governance/privacy.md) and
[`../DATA_PRIVACY.md`](../DATA_PRIVACY.md); this page maps where data lives.

## Stores

- **PostgreSQL via Prisma** (`prisma/schema.prisma`, `DATABASE_URL`). Model groups:
  - Staff and access: `User`, `Passkey`, `Staff`, `DoctorStatus`, `CrewActivityDay`.
  - Telemedicine: `TelemedicineAppointment`, `TelemedicineSession`, `TelemedicineParticipant`,
    `TelemedicineAttachment`, `TelemedicineRequest`, `TelemedicineAuditLog`.
  - Clinical support and audit: `CDSSAuditLog`, `CDSSOutcomeFeedback`, `ClinicalReport`,
    `ConsultLog`, `ClinicalCaseAuditEvent`, `ScreeningAuditLog`, `VitalRecord`.
  - Assistant knowledge: `AssistantKnowledgeEntry`.
- **Reference data** in `database/`: ICD-10 catalog (`icd10.json`, `icdx-extensions.json`) and
  assistant knowledge texts. These are reference material, not patient records.
- **Local files** configured by environment variables: crew access records
  (`CREW_ACCESS_*`), LB1 report inputs and outputs (`LB1_*`), and the EMR session store
  (`EMR_SESSION_STORAGE_PATH`).

## External services

Declared by environment-variable name in `.env.example`; values are never committed.

- LiveKit (video consults), WhatsApp Cloud API (messaging), Resend (email), Sentry (errors).
- LLM providers: DeepSeek, OpenRouter, and a local Ollama endpoint; optional MONAI service.
- EMR bridge (`EMR_*`) for the facility's electronic medical record.

## Rules

- Minimize PHI. CDSS inputs use anonymized type contracts; CDSS audit logs store numeric
  metrics only; security logs use hashed identifiers; Sentry events pass a PHI scrubber.
- Use synthetic or fictional data in development and tests.
- Never commit `.env`, `.env.local`, exported reports, or EMR session files.
