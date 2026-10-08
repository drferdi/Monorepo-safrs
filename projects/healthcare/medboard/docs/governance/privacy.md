# Privacy & Data Handling — MedBoard

Architectural safeguards, data minimization principles, PHI protection, and regulatory compliance standards for MedBoard.

---

## Core Privacy Architecture

MedBoard is engineered around **zero persistence of Protected Health Information (PHI)** across its primary analytics and clinical engines. Diagnostic workflows, clinical trajectories, and intelligence summaries operate on de-identified and ephemeral records by design.

---

## Technical Implementations of PHI-Free Design

### 1. `CDSSEngineInput` — Anonymized Type Contracts
```typescript
interface CDSSEngineInput {
  keluhan_utama: string
  usia: number                     // Numeric age only — no date of birth
  jenis_kelamin: "L" | "P"        // Gender enum — no patient names
  vital_signs?: VitalSigns        // Anonymized physiological measurements
  chronic_diseases?: string[]     // Anonymized ICD-10 condition codes
  // Excluded: Name, National ID (NIK), phone number, address, DOB
}
```

### 2. CDSS Diagnostic Audit Logging (Numeric Metrics Only)
`writeCDSSAuditEntry()` records operational metrics without clinical text:
- `sessionId` (Ephemeral session UUID, never a patient ID)
- `validationStatus`, `modelVersion`, `latencyMs`
- `outputSummary`: Suggestion counts, red flag counts — **zero diagnostic or textual medical data**

### 3. Security Audit Logging (Hashed Identifiers)
Implemented in `src/lib/server/security-audit.ts`:
- `userId` is irreversibly hashed using SHA-256 before storage
- IP addresses are sourced strictly from trusted reverse proxy headers (`x-forwarded-for` from Caddy)
- Zero patient metadata is attached to security audit trails

### 4. Sentry Automated PHI Scrubber
Configured in `src/lib/intelligence/sentry.config.ts`:

Sensitive fields are stripped before telemetry payloads leave the server:
```
patientId, patientName, patientLabel, fullName, displayName,
medicalRecordNumber, mrn, nik
```

Redaction patterns:
- 16-digit Indonesian National IDs (NIK) → `[REDACTED-NIK]`
- Medical Record Number formats (MRN) → `[REDACTED-MRN]`

Session replay is disabled across environments:
```typescript
replaysSessionSampleRate: 0,
replaysOnErrorSampleRate: 0,
```

### 5. Socket.IO Session Verification
All real-time clinical events derive user identities directly from cryptographically signed server session cookies:
```typescript
senderId: session.username,      // Sourced from verified cookie
senderName: session.displayName, // Sourced from verified cookie
```
Client-side payloads cannot forge sender identity.

### 6. Telemedicine Appointment Scheduling
The `TelemedicineAppointment` entity in Prisma is the only persistence surface storing contact coordinates:
- `patientId`: Internal staff account reference
- `patientPhone`: Optional contact number used strictly for transactional appointment notifications
- `patientJoinToken`: Single-use, time-bounded ephemeral token for secure video access

---

## Regulatory Compliance

### Indonesian Personal Data Protection Act (UU No. 27/2022 - UU PDP)
- **Data Minimization:** Processing is strictly limited to clinical variables necessary for diagnosis support.
- **Lawful Basis:** Clinical support for public healthcare delivery in Puskesmas facilities.
- **Retention & Segregation:** Diagnostic inferences are ephemeral and not retained in secondary data stores.

### Ministry of Health Standards (Permenkes)
- Medical record handling complies with national digital health standards.
- EMR auto-fill scripts route structured clinical data directly into certified municipal ePuskesmas instances.

---

## Privacy Incident Response Protocol

If unintended PHI exposure or leakage is identified:
1. Immediately disable impacted endpoints or integration channels.
2. Escalate to the Chief Medical Officer and Data Protection Officer within 1 hour.
3. Conduct statutory impact assessment within 72 hours per Indonesian PDPA requirements.
4. Record root cause and containment steps in operational security logs.

---

<sub>Architected and built by Drferdi — 2026 · Sentra Healthcare Artificial Intelligence</sub>
