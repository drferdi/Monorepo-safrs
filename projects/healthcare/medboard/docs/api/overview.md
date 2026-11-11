# HTTP & WebSocket API Reference — MedBoard

Endpoint specifications, request/response models, authentication headers, and real-time Socket.IO event catalog for MedBoard.

Machine-readable OpenAPI 3.1 specification is available at [`openapi.yaml`](openapi.yaml).

---

## Authentication & Staff Access — `/api/auth/`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Staff authentication (username + password) → signs and sets HTTP-only session cookie |
| `POST` | `/api/auth/logout` | Session revocation, clears authentication cookies |
| `GET` | `/api/auth/session` | Inspect current session context (username, role, profession, institution) |
| `POST` | `/api/auth/register` | Submit new staff registration request (queued for admin approval) |
| `GET` | `/api/auth/profile` | Retrieve active staff profile and access rights |

---

## Clinical Decision Support (CDSS) — `/api/cdss/`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/cdss/diagnose` | Submit clinical case to Iskandar Engine V2 → returns ranked differential diagnoses. *Legacy route returns 503 `{ error, retired: true }` unless `LEGACY_CDSS_ENGINE_ENABLED=true`.* |
| `GET` | `/api/cdss/diagnose` | Engine health & operational readiness probe: `{ enabled, message }` |
| `GET` | `/api/cdss/symptoms` | Autocomplete matching clinical symptoms |
| `POST` | `/api/cdss/autocomplete` | Autocomplete diagnosis names and symptom synonyms |
| `POST` | `/api/cdss/red-flag-ack` | Acknowledge emergency or urgent vital sign red flag alert |
| `POST` | `/api/cdss/suggestion-selected` | Record physician's selected diagnostic suggestion for calibration audit |
| `POST` | `/api/cdss/outcome-feedback` | Capture clinical outcome feedback to evaluate diagnostic accuracy |
| `GET` | `/api/cdss/quality-dashboard` | Aggregate CDSS quality metrics, precision, and latency statistics |

### Diagnostic Query Schema (`POST /api/cdss/diagnose`)
```typescript
// Request Body
{
  keluhan_utama: string           // Chief complaint
  keluhan_tambahan?: string       // Additional symptoms
  usia: number                    // Age in years
  jenis_kelamin: "L" | "P"        // Gender (L = Male, P = Female)
  vital_signs?: {
    systolic?: number             // mmHg
    diastolic?: number            // mmHg
    heart_rate?: number           // bpm
    spo2?: number                 // %
    temperature?: number          // °C
    respiratory_rate?: number     // breaths/min
  }
  chronic_diseases?: string[]     // Co-morbid ICD-10 codes
  allergies?: string[]
  current_drugs?: string[]
  is_pregnant?: boolean
  assessment_conclusion?: string  // Attending doctor's clinical synthesis
}

// Response Body
{
  suggestions: ValidatedSuggestion[]   // Ranked differential diagnoses
  red_flags: CDSSRedFlag[]             // Deterministic vital flags + LLM danger flags
  alerts: CDSSAlert[]                  // Actionable clinical warnings
  processing_time_ms: number
  source: "ai" | "error"
  model_version: string                // "IDE-V2 (deepseek-reasoner)" or local fallback
  validation_summary: ValidationSummary
  next_best_questions: string[]
}
```

---

## EMR Auto-Fill Automation — `/api/emr/`

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/emr/bridge` | Inspect and manage local EMR bridge queue |
| `GET` | `/api/emr/bridge/[id]` | Retrieve execution status of a specific bridge transaction |
| `POST` | `/api/emr/transfer/run` | Trigger automated transfer into ePuskesmas via Playwright automation |
| `GET` | `/api/emr/transfer/status` | Active transfer progress monitor |
| `GET` | `/api/emr/transfer/history` | Historical audit log of EMR sync runs |
| `POST` | `/api/emr/patient-sync` | Synchronize de-identified patient encounter vitals |

---

## Intelligence Dashboard — `/api/dashboard/intelligence/`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard/intelligence/encounters` | List active patient encounters across clinic rooms |
| `GET` | `/api/dashboard/intelligence/metrics` | Retrieve operational clinical and throughput metrics |
| `GET` | `/api/dashboard/intelligence/observability` | Retrieve telemetry metrics (Langfuse & Sentry aggregates) |
| `POST` | `/api/dashboard/intelligence/alerts/acknowledge` | Acknowledge patient deterioration or triage alert |
| `POST` | `/api/dashboard/intelligence/override` | Physician override of automated triage classification |

---

## Telemedicine & Consultations — `/api/telemedicine/`

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/telemedicine/appointments` | List scheduled appointments or book a new clinical consultation |
| `GET/PUT/DELETE` | `/api/telemedicine/appointments/[id]` | Inspect, update, or cancel appointment records |
| `POST` | `/api/telemedicine/appointments/[id]/diagnosis` | Record post-consultation diagnosis and clinical notes |
| `POST` | `/api/telemedicine/appointments/[id]/prescription` | Dispatch structured electronic prescription |
| `GET/PUT` | `/api/telemedicine/doctor-status` | Query or update physician online availability |
| `GET` | `/api/telemedicine/slots` | Fetch available clinic consultation time slots |
| `POST` | `/api/telemedicine/request` | Submit new urgent tele-consultation request |
| `POST` | `/api/telemedicine/request/[id]/handled` | Mark tele-consultation request as attended |
| `POST` | `/api/telemedicine/token` | Issue secure, time-bounded LiveKit video room token |
| `GET` | `/api/telemedicine/join/[token]` | Validate one-time patient consultation access token |
| `POST` | `/api/consult` | Ingest consultation case from Assist extension (relays `mira_differential` to doctor) |
| `POST` | `/api/consult/accept` | Physician accepts incoming consultation handoff |
| `POST` | `/api/consult/transfer-to-emr` | Queue consultation outcome for automatic transfer into ePuskesmas |

---

## ICD-10 Coding — `/api/icdx/`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/icdx/lookup` | Fast lookup of ICD-10 diagnostic codes, descriptions, and colloquial aliases |

---

## Epidemiological & Clinical Reporting — `/api/report/`

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/report` | List existing reports or generate new report instances |
| `POST` | `/api/report/clinical` | Compile structured clinical encounter report |
| `GET` | `/api/report/clinical/[id]/pdf` | Stream generated PDF clinical summary |
| `POST` | `/api/report/automation/run` | Execute monthly LB1 reporting automation pipeline |
| `GET` | `/api/report/automation/status` | Query active status of LB1 compilation |
| `POST` | `/api/report/automation/preflight` | Pre-flight validation of input spreadsheets and mapping files |
| `GET` | `/api/report/automation/history` | Historical archive of generated LB1 reports |
| `GET` | `/api/report/files` | Enumerate compiled report deliverables |
| `GET` | `/api/report/files/download` | Secure download endpoint for generated report spreadsheets |

---

## Administration & Staff Governance — `/api/admin/`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/overview` | Platform-wide operational statistics and user counts |
| `GET/POST` | `/api/admin/users` | Enumerate staff users or provision accounts |
| `GET/PUT` | `/api/admin/users/[username]/profile` | Inspect or update staff profile and assignments |
| `POST` | `/api/admin/users/[username]/deactivate` | Revoke staff access |
| `POST` | `/api/admin/users/[username]/reactivate` | Re-enable staff access |
| `POST` | `/api/admin/users/[username]/reset-password` | Administrative password reset |
| `GET` | `/api/admin/users/[username]/logbook` | Retrieve user audit trail and activity logbook |
| `GET/POST` | `/api/admin/registrations` | List pending staff self-registration requests |
| `POST` | `/api/admin/registrations/[id]/approve` | Approve registration request and provision role |
| `POST` | `/api/admin/registrations/[id]/reject` | Deny registration request |
| `GET/POST` | `/api/admin/notam` | Broadcast NOTAM (Notice to All Members) clinic announcements |
| `GET/PUT/DELETE` | `/api/admin/notam/[id]` | Manage specific NOTAM notices |
| `GET/POST` | `/api/admin/institutions` | Manage associated healthcare institutions and clinics |
| `GET/POST` | `/api/admin/dev-updates` | Track platform release logs and technical notes |

---

## WebSocket Events — Root Namespace `/` (Staff Presence & Clinic Chat)

| Event Name | Direction | Description |
|---|---|---|
| `user:join` | Client → Server | Announce staff presence upon successful login |
| `users:online` | Server → Client | Broadcast updated list of online staff members |
| `emr:triage-send` | Client → Server | Nurse relays triaged patient vitals to target physician |
| `emr:triage-receive` | Server → Client | Attending doctor receives relayed triage payload |
| `room:join` | Client → Server | Join clinical communication room or department channel |
| `message:send` | Client → Server | Send clinical coordination message |
| `message:receive` | Server → Client | Receive incoming room message |
| `typing:start/stop` | Client ↔ Server | Live typing indicators |
| `voice:*` | Client ↔ Server | Audrey voice assistant events (*temporarily disabled, responds with disabled status*) |

---

## WebSocket Events — Namespace `/intelligence` (Clinical Telemetry)

| Event Name | Direction | Description |
|---|---|---|
| `encounter:updated` | Server → Client | Real-time update to active patient encounter state |
| `alert:critical` | Server → Client | High-priority vital deterioration or NEWS2 red-alert |
| `eklaim:status-changed` | Server → Client | BPJS claim validation status change |
| `cdss:suggestion-ready` | Server → Client | Diagnostic reasoning pipeline completion notification |

---

<sub>Architected and built by Drferdi — 2026 · Sentra Healthcare Artificial Intelligence</sub>
