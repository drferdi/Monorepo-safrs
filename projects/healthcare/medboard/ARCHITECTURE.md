# File: ARCHITECTURE.md | App: intelligenceBoard | Repo: Drferdi-plus/intelligenceboard | Updated: 2026-04-15
# Architected and built by Drferdi.

# Architecture — IntelligenceBoard

> AADI — AI-Assisted Diagnosis Interface
> Deployed live: UPTD Puskesmas PONED Balowerti, Kota Kediri

---

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 16.2.3 |
| Runtime | React | 19.2.3 |
| Language | TypeScript | 5.9.3 (strict) |
| Styling | Tailwind CSS | 4.2.1 |
| WebSocket | Socket.IO | 4.8.3 |
| ORM | Prisma | 6.16.1 |
| Database | PostgreSQL (via pg) | 8.19.0 |
| AI Primary | DeepSeek Reasoner | via API |
| AI Secondary | Deterministic local fallback | built-in |
| Voice AI | Disabled during Google exit | endpoints return 503 |
| Video | LiveKit | livekit-client 2.17.2 |
| Monitoring | Sentry | @sentry/nextjs 10.43.0 |
| Deploy | Railway (Nixpacks, Node 22) | railway.toml |

---

## Custom Server Architecture

App **tidak** menggunakan `next start` biasa. Server custom (`server.ts`) dijalankan via `tsx`:

```
tsx --conditions react-server server.ts
```

Server custom menggabungkan:
1. **Next.js HTTP handler** — SSR/App Router standar
2. **Socket.IO server** — WebSocket untuk realtime features
3. **Voice placeholder** — route voice dipertahankan untuk compatibility, tetapi sementara nonaktif

### Socket.IO Namespaces

| Namespace | Tujuan |
|-----------|--------|
| `/` (default) | Crew presence, EMR triage relay, chat, Audrey voice |
| `/intelligence` | Intelligence Dashboard — encounters, alerts, e-klaim, CDSS events |

### CORS Origins (Production)
- `https://puskesmasbalowerti.com`
- `https://www.puskesmasbalowerti.com`
- `https://crew.puskesmasbalowerti.com`
- `https://intelligenceboard-production.up.railway.app`

---

## Application Structure

```
intelligenceBoard/
├── server.ts                         Custom HTTP + Socket.IO server
├── src/
│   ├── app/                          Next.js App Router pages
│   │   ├── api/                      API route handlers
│   │   │   ├── cdss/                 CDSS: diagnose, autocomplete, symptoms, red-flag-ack
│   │   │   ├── emr/                  EMR bridge: auto-fill ePuskesmas via Playwright
│   │   │   ├── dashboard/intelligence/ Intelligence Dashboard API
│   │   │   ├── telemedicine/         Telemedicine: appointments, slots, LiveKit token
│   │   │   ├── auth/                 Crew access auth (login, logout, session, register)
│   │   │   ├── admin/                Admin: users, registrations, NOTAM, institutions
│   │   │   ├── icdx/                 ICD-10 lookup
│   │   │   ├── report/               Clinical report + LB1 automation
│   │   │   ├── voice/                Voice chat + TTS
│   │   │   └── perplexity/           Perplexity AI integration
│   │   ├── dashboard/intelligence/   Intelligence Dashboard UI (real-time)
│   │   ├── emr/                      EMR transfer UI
│   │   ├── telemedicine/             Telemedicine video consultation UI
│   │   ├── calculator/               Medical calculators
│   │   ├── icdx/                     ICD-10 lookup UI
│   │   ├── admin/                    Admin panel
│   │   ├── chat/                     Crew chat
│   │   ├── hub/                      Crew roster hub
│   │   ├── report/                   Report automation UI
│   │   ├── acars/                    ACARS monitoring
│   │   └── voice/                    Audrey voice UI
│   ├── lib/
│   │   ├── cdss/                     CDSS Iskandar Engine V2 (core clinical logic)
│   │   ├── clinical/                 Clinical utilities (trajectory, formulary, therapy)
│   │   ├── emr/                      EMR Playwright auto-fill engine
│   │   ├── intelligence/             Intelligence Dashboard (Langfuse, Sentry, observability)
│   │   ├── lb1/                      LB1 reporting engine (ICD-10 2010)
│   │   ├── telemedicine/             Telemedicine session + RBAC logic
│   │   ├── audrey-persona.ts         Audrey voice persona + profession-based addressing
│   │   ├── crew-access.ts            Crew auth types (professions, institutions, roles)
│   │   └── icd/                      ICD-10 dynamic DB + online API
│   ├── components/                   UI components
│   ├── hooks/                        Custom React hooks
│   └── types/                        TypeScript types (abyss/)
├── prisma/                           Prisma schema + seed
├── database/                         DB utilities
├── dashboard/                        Dashboard assets
├── scripts/                          Test scripts + git guardrails installer
└── website/                          Website assets
```

---

## CDSS — Iskandar Diagnosis Engine V2

**File:** `src/lib/cdss/engine.ts`

Architecture LLM-first dengan hybrid retrieval:

```
Input (keluhan, vital signs, chronic diseases, allergies)
  ↓
1. Hardcoded Vital Signs Red Flag Check
   (SpO2 < 90%, Sistolik ≥ 180 atau < 90, HR > 140 atau < 45,
    Suhu ≥ 40°C, RR > 30 atau < 8) — TIDAK butuh LLM
  ↓
2. Candidate Retrieval (Hybrid)
   ├── Keyword pre-filter → penyakit.json (159 penyakit KKI)
   └── Semantic embedding filter (jika embedding ready)
       → Merged + deduplicated (max 18 candidates)
  ↓
3. LLM Reasoning (Structured JSON output)
   ├── Primary: DeepSeek Reasoner (deepseek-reasoner)
   └── Fallback: deterministic local safety path
  ↓
4. Validation + Hybrid Decisioning
   (validateLLMSuggestions → applyHybridDecisioning)
  ↓
5. Output: CDSSEngineResult
   - suggestions[] (ranked differentials, ICD-10, confidence 0-1)
   - red_flags[] (severity: emergency/urgent/warning)
   - alerts[] (red_flag, vital_sign, low_confidence, guideline)
   - validation_summary
   - next_best_questions[]
```

**Knowledge Base:** 159 penyakit Kompendium Klinisi Indonesia (KKI) di `penyakit.json`

---

## Audrey — Voice Surface (temporarily disabled)

**File:** `src/lib/audrey-persona.ts` + `src/app/api/voice/*`

- Status: route voice/chat/token/tts mengembalikan `503` selama exit Google total
- Mode target berikutnya: pengganti voice stack akan diputuskan setelah jalur Google benar-benar bersih
- Addressing: Profession-based (Dokter X, Bu Bidan X, Bu Nurse X, Pak Perawat X)
- Context: UPTD Puskesmas PONED Balowerti — capabilities & limitations hardcoded di system prompt
- Audio streaming nonaktif pada branch ini

---

## EMR Auto-Fill Engine

**File:** `src/lib/emr/engine.ts`

- Menggunakan Playwright untuk auto-fill data ke sistem ePuskesmas
- Session management: browser state di-cache 30 menit
- Flow: Login ePuskesmas → Navigate → RMETransferOrchestrator → Emit progress via socket
- Handlers terpisah untuk: anamnesa, diagnosa, resep

---

## Intelligence Dashboard

**File:** `src/app/dashboard/intelligence/`

- Real-time via Socket.IO namespace `/intelligence`
- Events: `encounter:updated`, `alert:critical`, `eklaim:status-changed`, `cdss:suggestion-ready`
- Observability: Langfuse (LLM tracing) + Sentry (error monitoring)
- Auth: Hanya crew dengan session valid yang bisa connect ke namespace

---

## Crew Access Auth

**File:** `src/lib/crew-access.ts`, `src/lib/server/crew-access-auth.ts`

- Cookie-based session (tidak menggunakan NextAuth)
- Profesi didukung: Dokter, Dokter Gigi, Perawat, Bidan, Apoteker, Triage Officer
- Institusi: Puskesmas Balowerti Kota Kediri, RSIA Melinda DHAI (+ dynamic via JSON)
- Socket middleware: semua koneksi Socket.IO di-verify cookie session

---

## Design Tokens

| Token | Value |
|-------|-------|
| Background | `#0d0d0d` |
| Foreground | `#b7ab98` |
| Accent | `#eb5939` |
| Audrey Amber | `#C4956A` |
| Audrey Teal | `#6B9B8A` |
| Typography | IBM Plex Sans + IBM Plex Mono |

---

<sub>Architected and built by Drferdi — 2026 · Sentra Healthcare Artificial Intelligence</sub>
