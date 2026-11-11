# Data Model — Sentra AI (sentra-main)

_Architected and built by Drferdi — Sentra Healthcare Solutions © 2025–2026_

---

## Overview

`sentra-main` has no database and stores no persistent data. The only "data
models" are TypeScript interfaces for static content and demo datasets used in
showcase components.

---

## Article — `app/insights/data.ts`

The primary content model. All published articles live in a single `articles`
array.

```typescript
export interface Article {
  slug: string // URL identifier: /insights/[slug]
  title: string
  description: string // Used in article card + <meta> description
  date: string // ISO date string: "YYYY-MM-DD"
  readTime: string // Human-readable: "6 menit"
  category: string // Badge text: "Clinical AI" | "Healthcare Technology" | "Patient Safety"
  content: string // Full article body — Markdown-like template literal
}
```

Published articles at v1.0.0:

| Slug                                    | Category              | Date       | Read Time |
| --------------------------------------- | --------------------- | ---------- | --------- |
| `ai-diagnosis-klinis-indonesia`         | Clinical AI           | 2026-03-01 | 6 menit   |
| `clinical-decision-support-vs-emr`      | Healthcare Technology | 2026-02-15 | 5 menit   |
| `keselamatan-pasien-era-digital-health` | Patient Safety        | 2026-02-01 | 7 menit   |

Helper functions:

```typescript
getArticle(slug: string): Article | undefined
formatDate(dateStr: string): string  // → "1 Maret 2026" (id-ID locale)
```

---

## SentraSim Simulation Data — `components/SentraSim.tsx`

Typed simulation data structures powering the interactive CDSS demo.

```typescript
type VitalSign = {
  label: string
  value: string
  unit: string
  critical?: boolean
}

type EntityTag = { text: string; type: string }

type LabRecommendation = { name: string; status: string }

type LabResult = {
  name: string
  value: string
  interpretation: string
  alert?: boolean
}

type ClinicalReasoning = {
  title: string
  type: string
  summary: string
  tone: 'primary' | 'warning' | 'muted'
}

type ManagementStep = {
  title: string
  detail: string
  tone: 'urgent' | 'primary' | 'supportive'
}

type MedicationOrder = {
  name: string
  regimen: string
  note: string
  tone: 'urgent' | 'primary' | 'supportive'
}
```

Demo case — CAP (Community-Acquired Pneumonia), Female 46 years, RM-88492-A:

| Data Type                | Count               |
| ------------------------ | ------------------- |
| Vital signs              | 7 parameters        |
| Anamnesis entity tags    | 4 tags              |
| Lab recommendations      | 3 items             |
| Lab results              | 3 items             |
| Clinical reasoning nodes | — (branch-specific) |
| Management steps         | — (branch-specific) |
| Medication orders        | — (branch-specific) |

**Simulation status machine — 10 states:**

```typescript
type SimulationStatus =
  | 'LIVE CASE: IDLE'
  | 'STRUCTURING CHIEF COMPLAINT...'
  | 'RETRIEVING HISTORY, ALLERGY, AND COMORBID'
  | 'TRIAGE CONTEXT VERIFIED'
  | 'REQUESTING DIAGNOSTIC WORKUP...'
  | 'FUSING LAB AND RADIOLOGY EVIDENCE...'
  | 'MONITORING CLINICAL RESPONSE...'
  | 'RANKING DIFFERENTIAL DIAGNOSES...'
  | 'BUILDING INITIAL MANAGEMENT PLAN...'
  | 'CASE SIMULATION COMPLETE'
```

---

## ClinicalTrajectory Demo Data — `components/ClinicalTrajectory.tsx`

Visit history dataset for a patient with HTN + DM Type 2:

```typescript
const DEMO_VISITS = [
  { label: '12/09', sbp: 140, dbp: 88, hr: 78, gds: 210 },
  { label: '15/10', sbp: 148, dbp: 92, hr: 82, gds: 238 },
  { label: '22/11', sbp: 155, dbp: 94, hr: 88, gds: 262 },
  { label: 'HARI INI', sbp: 168, dbp: 98, hr: 92, gds: 284 },
]
```

Vital parameters with risk classification:

```typescript
type VitalParam = {
  label: string
  value: number
  unit: string
  risk: 'low' | 'moderate' | 'high' | 'critical'
  note: string
}
```

Risk probability bars (acute risks):

```typescript
// { label: string, value: number (0-100) }
Krisis Hipertensi: 72, Stroke/ACS: 58, Krisis Glikemik: 45,
Sepsis-like: 12, Syok Dekompensasi: 8
```

---

## ClinicalPrognosis Demo Data — `components/ClinicalPrognosis.tsx`

```typescript
// Survival curve data points
const SURVIVAL_DATA = [
  { label: "24 jam", prob: 91.2, lower: 83.2, upper: 99.2 },
  { label: "72 jam", prob: 84.8, lower: 76.8, upper: 92.8 },
  { label: "7 hari", prob: 76.4, lower: 68.4, upper: 84.4 },
  { label: "30 hari", prob: 68.1, lower: 60.1, upper: 76.1 },
];

// Radar chart — 6 clinical domains
const RADAR_DATA = [
  { label: "Hemodinamik", value: 72 },
  { label: "Infeksi", value: 12 },
  { label: "Metabolik", value: 58 },
  { label: "Neuro/ACS", value: 45 },
  { label: "Deteriorasi", value: 64 },
  { label: "Warning", value: 38 },
];

// KPI cards
KPI_CARDS: Urgensi Klinis "Urgent <6 Jam", Mortalitas Proxy "Menengah",
           Confidence "72%", Tier Review "HIGH"
```

---

## Navigation Data — `lib/site-links.ts`

```typescript
export const siteLinks = {
  home: '#top',
  about: '#about',
  contact: '#contact',
  insights: '/insights',
  services: '#services',
  audrey: '#audrey',
  privacy: '/privacy',
  terms: '/terms',
  story: '/story',
  faq: '#faq',
} as const

// TypeScript derives the type:
type SiteLinks = typeof siteLinks
type SiteLinkKey = keyof SiteLinks // "home" | "about" | "contact" | ...
```

---

## Story Page Team Data — `app/story/page.tsx`

4 core team members: | Name | Role | |------|------| | Dr. Ferdi Iskandar, S.H.,
M.Kn., CMDC, CLM | Founder, CEO & Clinical Steward | | dr. Dibya Arfianda, Sp.OG
| Clinical Advisor, Maternal & Fetal Medicine | | dr. Boyong Baskoro, Sp.OG |
Clinical Advisor, Obstetrics & Gynecology | | Nathanael Kevin Susanto, BIT,
M.Tech | Software Engineer, Visa Worldwide |

7 administrative team members — see `app/story/page.tsx` for full list.

---

> ⚠️ All demo datasets in `SentraSim`, `ClinicalTrajectory`, and
> `ClinicalPrognosis` are **simulated clinical scenarios** for illustration
> only. They do not contain or derive from real patient data.

---

_Architected and built by Drferdi — Sentra Healthcare Solutions © 2025–2026_
