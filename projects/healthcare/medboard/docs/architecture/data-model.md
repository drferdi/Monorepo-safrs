# Data Model & Type Contracts — MedBoard

TypeScript domain interfaces, clinical types, Socket.IO message payloads, and database schema conventions.

> ⚠️ **Zero-PHI Architecture Notice:** Protected Health Information (PHI) is not persisted in the database or log stores. Clinical and diagnostic sessions are de-identified and ephemeral.

---

## Clinical Decision Support Types

**Path:** `src/types/abyss/clinical.ts` + `src/lib/cdss/types.ts`

### `CDSSEngineInput`
De-identified clinical observation payload submitted to the diagnostic engine:

```typescript
interface CDSSEngineInput {
  keluhan_utama: string           // Chief complaint
  keluhan_tambahan?: string       // Secondary symptoms
  usia: number                    // Numeric age in years (no date of birth)
  jenis_kelamin: "L" | "P"        // Gender indicator (L = Male, P = Female)
  vital_signs?: {
    systolic?: number             // mmHg (Emergency threshold: ≥180 or <90)
    diastolic?: number            // mmHg
    heart_rate?: number           // bpm (Urgent threshold: >140 or <45)
    spo2?: number                 // % (Emergency threshold: <90)
    temperature?: number          // °C (Urgent threshold: ≥40)
    respiratory_rate?: number     // breaths/min (Urgent: >30, Emergency: <8)
  }
  chronic_diseases?: string[]     // Co-morbid ICD-10 codes
  allergies?: string[]            // Known pharmacological or environmental allergies
  current_drugs?: string[]        // Current medication regimens
  is_pregnant?: boolean           // Pregnancy indicator for contraindication checking
  assessment_conclusion?: string  // Physician's preliminary synthesis
}
```

### `ValidatedSuggestion`
Ranked diagnostic candidate returned following clinical compendium validation:

```typescript
interface ValidatedSuggestion {
  rank: number                    // Final sorted diagnostic priority
  llm_rank: number                // Raw LLM priority before heuristic weighting
  icd10_code: string              // Validated code from KKI compendium
  diagnosis_name: string          // Clinical disease name
  confidence: number              // Calibrated confidence score (0.0 to 1.0)
  reasoning: string               // Clinical justification summary
  key_reasons: string[]           // Supporting pathophysiological observations
  missing_information: string[]   // Recommended diagnostic criteria to verify
  red_flags: string[]             // Associated danger signs
  recommended_actions: string[]   // Initial treatment / stabilization guidance
  rag_verified: boolean           // True if cross-referenced against the local knowledge base
}
```

### `CDSSRedFlag`
```typescript
interface CDSSRedFlag {
  severity: "emergency" | "urgent" | "warning"
  condition: string               // Danger condition label (e.g. "Severe Hypoxia")
  action: string                  // Immediate clinical stabilization instruction
  criteria_met: string[]          // Triggering physiological thresholds
  icd_codes?: string[]
}
```

### `CDSSAlert`
```typescript
interface CDSSAlert {
  id: string                      // Unique identifier: "alert-{timestamp}-{counter}"
  type: "red_flag" | "vital_sign" | "low_confidence" | "guideline" | "validation_warning"
  severity: "emergency" | "high" | "medium" | "info"
  title: string
  message: string
  icd_codes?: string[]
  action?: string
}
```

---

## Authentication & Staff Access Types

**Path:** `src/lib/crew-access.ts`

```typescript
type CrewAccessProfession =
  | "Dokter" | "Dokter Gigi" | "Perawat"
  | "Bidan" | "Apoteker" | "Triage Officer"

type CrewAccessServiceArea =
  | "KIA" | "USG" | "IGD" | "PONED"
  | "VCT HIV" | "JIWA" | "Lainnya"

interface CrewAccessSession {
  username: string
  displayName: string
  role: string
  profession: CrewAccessProfession
  institution: CrewAccessInstitution
}
```

---

## Real-Time Intelligence & Dashboard Events

**Path:** `src/lib/intelligence/types.ts`

```typescript
type IntelligenceEventName =
  | "encounter:updated"
  | "alert:critical"
  | "eklaim:status-changed"
  | "cdss:suggestion-ready"

interface IntelligenceEventPayload {
  encounterId: string
  status: IntelligenceEventStatus
  timestamp: string
  data: Record<string, unknown>
}

interface IntelligenceSocketState {
  isConnected: boolean
  isReconnecting: boolean
  lastEncounterUpdate: IntelligenceEventPayload | null
  lastCriticalAlert: IntelligenceEventPayload | null
  lastEklaimStatus: IntelligenceEventPayload | null
  lastCdssSuggestion: IntelligenceEventPayload | null
}
```

---

## EMR Auto-Fill Automation Types

**Path:** `src/lib/emr/types.ts`

```typescript
interface EMRTransferConfig {
  storagePath: string     // Path to Playwright persistent browser state
  baseUrl: string         // Base URL of the target ePuskesmas instance
  username: string
  password: string
}

interface RMETransferPayload {
  anamnesa?: object
  diagnosa?: { icd10: string; nama: string }[]
  resep?: object[]
}

interface EMRProgressEvent {
  step: string
  status: "pending" | "running" | "done" | "error"
  message: string
  timestamp: string
}
```

---

## Presence & Communication Models

```typescript
type UserPresence = {
  userId: string         // Server-validated username from session cookie
  name: string           // Staff display name
  role: string
  profession: string
  institution: string
  socketId: string
}

type ServerMessagePayload = {
  id: string             // Server-generated unique ID (${Date.now()}-${random})
  roomId: string
  senderId: string       // Enforced from session cookie
  senderName: string     // Enforced from session cookie
  text: string           // Sanitized message content (max 5,000 characters)
  time: string           // Server-generated ISO 8601 timestamp
}
```

---

## Abyss Platform Shared Types

**Directory:** `src/types/abyss/`

| File | Scope & Contents |
|---|---|
| `api.ts` | Unified HTTP API response wrappers and error envelopes |
| `clinical.ts` | Shared clinical domain entities and vital signs types |
| `common.ts` | Generic utility types, pagination models, and status unions |
| `compliance.ts` | Regulatory tracking and compliance metadata types |
| `dashboard.ts` | High-level clinical and operational dashboard view models |
| `guardrails.ts` | Input assertion models and safety-net policy types |
| `validators.ts` | Zod runtime assertion schemas for client inputs |

---

## Database Schemas & Persistence

- **ORM Schema:** `prisma/schema.prisma`
- **Seed Scripts:** `prisma/seed.ts`
- **Driver:** PostgreSQL 16 via `@prisma/adapter-pg`

```bash
pnpm run db:migrate    # Apply migrations in development
pnpm run db:studio     # Launch Prisma Studio web GUI
pnpm run db:seed       # Seed initial administrative institutions and users
```

---

<sub>Architected and built by Drferdi — 2026 · Sentra Healthcare Artificial Intelligence</sub>
