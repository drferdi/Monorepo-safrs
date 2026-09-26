# File: docs/DATA_MODEL.md | App: intelligenceBoard | Repo: abyss-monorepo | Updated: 2026-03-16
# Architected and built by Drferdi.

# Data Model — IntelligenceBoard

> ⚠️ PHI tidak pernah disimpan. Semua session bersifat ephemeral.

---

## CDSS Types — `src/types/abyss/clinical.ts` + `src/lib/cdss/types.ts`

### CDSSEngineInput
```typescript
interface CDSSEngineInput {
  keluhan_utama: string
  keluhan_tambahan?: string
  usia: number
  jenis_kelamin: "L" | "P"
  vital_signs?: {
    systolic?: number      // mmHg — threshold: ≥180 emergency, <90 emergency
    diastolic?: number     // mmHg
    heart_rate?: number    // bpm — threshold: >140 urgent, <45 urgent
    spo2?: number          // % — threshold: <90 emergency
    temperature?: number   // °C — threshold: ≥40 urgent
    respiratory_rate?: number  // x/mnt — threshold: >30 urgent, <8 emergency
  }
  chronic_diseases?: string[]
  allergies?: string[]
  current_drugs?: string[]
  is_pregnant?: boolean
  assessment_conclusion?: string
}
```

### ValidatedSuggestion
```typescript
interface ValidatedSuggestion {
  rank: number
  llm_rank: number
  icd10_code: string           // Dari penyakit.json KKI
  diagnosis_name: string       // Dari penyakit.json KKI
  confidence: number           // 0.0 – 1.0
  reasoning: string
  key_reasons: string[]
  missing_information: string[]
  red_flags: string[]
  recommended_actions: string[]
  rag_verified: boolean        // True jika ICD-10 ditemukan di KB
}
```

### CDSSRedFlag
```typescript
interface CDSSRedFlag {
  severity: "emergency" | "urgent" | "warning"
  condition: string
  action: string
  criteria_met: string[]
  icd_codes?: string[]
}
```

### CDSSAlert
```typescript
interface CDSSAlert {
  id: string    // "alert-{timestamp}-{counter}"
  type: "red_flag" | "vital_sign" | "low_confidence" | "guideline" | "validation_warning"
  severity: "emergency" | "high" | "medium" | "info"
  title: string
  message: string
  icd_codes?: string[]
  action?: string
}
```

---

## Crew Access Types — `src/lib/crew-access.ts`

```typescript
// Profesi yang didukung
type CrewAccessProfession =
  | "Dokter" | "Dokter Gigi" | "Perawat"
  | "Bidan" | "Apoteker" | "Triage Officer"

// Area pelayanan
type CrewAccessServiceArea =
  | "KIA" | "USG" | "IGD" | "PONED"
  | "VCT HIV" | "JIWA" | "Lainnya"

// Institusi (dynamic + seed)
// Seed: "Puskesmas Balowerti Kota Kediri", "RSIA Melinda DHAI"
```

### CrewAccessSession
```typescript
interface CrewAccessSession {
  username: string
  displayName: string
  role: string
  profession: CrewAccessProfession
  institution: CrewAccessInstitution
}
```

---

## Intelligence Dashboard Types — `src/lib/intelligence/types.ts`

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

## EMR Types — `src/lib/emr/types.ts`

```typescript
interface EMRTransferConfig {
  storagePath: string     // Playwright browser session state path
  baseUrl: string         // ePuskesmas base URL
  username: string
  password: string
}

interface RMETransferPayload {
  // Data yang akan di-auto-fill ke ePuskesmas
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

## Presence & Chat Types

```typescript
type UserPresence = {
  userId: string       // username (server-verified dari session)
  name: string         // fullName dari crew profile
  role: string
  profession: string
  institution: string
  socketId: string
}
```

**Message Schema (server-generated):**
```typescript
{
  id: `${Date.now()}-${randomString}`  // Server-generated, tidak dipercaya dari client
  roomId: string
  senderId: string     // Server-verified username
  senderName: string   // Server-verified displayName
  text: string         // max 5000 chars
  time: string         // ISO timestamp, server-generated
}
```

---

## Abyss API Types — `src/types/abyss/`

| File | Isi |
|------|-----|
| `api.ts` | API response wrapper types |
| `clinical.ts` | Clinical data types |
| `common.ts` | Common utility types |
| `compliance.ts` | Compliance/governance types |
| `dashboard.ts` | Dashboard data types |
| `guardrails.ts` | Guardrails enforcement types |
| `validators.ts` | Input validation schemas |

---

## Database (Prisma + PostgreSQL)

Schema: `prisma/schema.prisma`
Seed: `prisma/seed.ts`

Commands:
```bash
pnpm db:migrate    # npx prisma migrate dev
pnpm db:studio     # npx prisma studio
pnpm db:seed       # npx prisma db seed
```

---

<sub>Architected and built by Drferdi — 2026 · Sentra Healthcare Artificial Intelligence</sub>
