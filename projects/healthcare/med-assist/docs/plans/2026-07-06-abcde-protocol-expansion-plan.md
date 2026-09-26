# ABCDE Protocol Expansion (13 New Protocols) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Append 13 new `ActionProtocol` entries (transcribed from Chief's clinical specification) to `lib/emergency-detector/action-protocols.ts`, plus a new optional `contraindications?: string[]` field on the type, with full regression coverage proving the 9 existing protocols are untouched.

**Architecture:** Pure data addition — no logic changes. One new optional interface field, 13 new plain-object array entries appended after the existing 9, one new test file asserting every one of the resulting 22 protocol ids is retrievable via the existing `getActionProtocol(id)` lookup function.

**Tech Stack:** TypeScript (strict), Vitest.

## Global Constraints

- No change to any of the 9 existing `ActionProtocol` entries (`PROTO_RESP_FAILURE`, `PROTO_SHOCK`, `PROTO_SEPSIS`, `PROTO_ANAPHYLAXIS`, `PROTO_ACS`, `PROTO_STROKE`, `PROTO_DKA_HHS`, `PROTO_HYPOGLYCEMIA`, `PROTO_CARDIAC_ARREST`).
- No change to `lib/emergency-detector/clinical-patterns.ts`, `htn-classifier.ts`, or `vital-guardrails.ts` (out of scope per spec).
- `contraindications` is optional (`?:`) — only the 13 new protocols set it; the 9 existing ones are left exactly as they are (no empty-array additions).
- Every new protocol's `source` field is a plain citation string (guideline body name), matching this file's existing convention — no markdown links.
- File header comment in `action-protocols.ts` already states: "DO NOT modify thresholds or clinical recommendations without dr. Ferdi review." Chief (dr. Ferdi Iskandar) authored this content directly in-session — this satisfies that review requirement for the 13 new entries. Do not alter the wording of the 13 protocols' clinical content beyond fixing an obvious transcription typo.

---

### Task 1: Add `contraindications` field + regression snapshot of the 9 existing protocols

**Files:**

- Create: `lib/emergency-detector/action-protocols.test.ts`
- Modify: `lib/emergency-detector/action-protocols.ts:32-46` (the `ActionProtocol` interface)

**Interfaces:**

- Consumes: `ACTION_PROTOCOLS`, `getActionProtocol`, `ActionProtocol`, `ActionStep`, `ABCDEPhase` — all already exported from `lib/emergency-detector/action-protocols.ts`.
- Produces: the `contraindications?: string[]` field on `ActionProtocol`, which every later task's new protocol objects use.

- [ ] **Step 1: Write the regression-snapshot test (guards the 9 existing protocols before any new ones are added)**

```ts
// Designed and constructed by Drferdi.
import { describe, expect, it } from 'vitest';

import { ACTION_PROTOCOLS, getActionProtocol } from './action-protocols';

describe('action-protocols regression snapshot (existing 9, must stay untouched)', () => {
  const EXISTING_PROTOCOLS: Array<{ id: string; name: string; stepCount: number }> = [
    { id: 'PROTO_RESP_FAILURE', name: 'Gagal Napas Akut', stepCount: 9 },
    { id: 'PROTO_SHOCK', name: 'Syok', stepCount: 7 },
    { id: 'PROTO_SEPSIS', name: 'Sepsis Berat / Early Sepsis', stepCount: 7 },
    { id: 'PROTO_ANAPHYLAXIS', name: 'Anafilaksis', stepCount: 7 },
    { id: 'PROTO_ACS', name: 'ACS / Infark Miokard', stepCount: 6 },
    { id: 'PROTO_STROKE', name: 'Stroke', stepCount: 7 },
    { id: 'PROTO_DKA_HHS', name: 'DKA / HHS', stepCount: 6 },
    { id: 'PROTO_HYPOGLYCEMIA', name: 'Hipoglikemia Sedang-Berat', stepCount: 7 },
    { id: 'PROTO_CARDIAC_ARREST', name: 'Cardiac Arrest / Nyaris Henti', stepCount: 4 },
  ];

  it.each(EXISTING_PROTOCOLS)(
    '$id keeps its original name and step count',
    ({ id, name, stepCount }) => {
      const protocol = getActionProtocol(id);
      expect(protocol).toBeDefined();
      expect(protocol?.name).toBe(name);
      expect(protocol?.steps).toHaveLength(stepCount);
    }
  );

  it('none of the 9 existing protocols has a contraindications field yet', () => {
    for (const { id } of EXISTING_PROTOCOLS) {
      const protocol = getActionProtocol(id);
      expect(protocol?.contraindications).toBeUndefined();
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it passes against the current (unmodified) file**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts`
Expected: PASS (9 tests + 1 = 10 passed) — this is a snapshot guard, not a RED step; it must pass immediately since nothing has changed yet.

- [ ] **Step 3: Add the `contraindications` field to the `ActionProtocol` interface**

In `lib/emergency-detector/action-protocols.ts`, find:

```ts
/** A complete emergency action protocol. */
export interface ActionProtocol {
  /** Unique protocol ID */
  id: string;
  /** Protocol name */
  name: string;
  /** Clinical condition this protocol addresses */
  condition: string;
  /** Ordered ABCDE steps */
  steps: ActionStep[];
  /** Criteria for referral to RS (hospital) */
  referralCriteria: string[];
  /** Evidence/guideline source */
  source: string;
}
```

Replace with:

```ts
/** A complete emergency action protocol. */
export interface ActionProtocol {
  /** Unique protocol ID */
  id: string;
  /** Protocol name */
  name: string;
  /** Clinical condition this protocol addresses */
  condition: string;
  /** Ordered ABCDE steps */
  steps: ActionStep[];
  /** "Do not do" warnings, kept separate from positive steps */
  contraindications?: string[];
  /** Criteria for referral to RS (hospital) */
  referralCriteria: string[];
  /** Evidence/guideline source */
  source: string;
}
```

- [ ] **Step 4: Run typecheck and the test again**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts`
Expected: PASS (still 10 passed — the field is optional, so existing entries are unaffected).

- [ ] **Step 5: Commit**

```bash
git add lib/emergency-detector/action-protocols.ts lib/emergency-detector/action-protocols.test.ts
git commit -m "feat(med-assist): add contraindications field to ActionProtocol + regression snapshot"
```

---

### Task 2: PROTO_HTN_EMERGENCY

**Files:**

- Modify: `lib/emergency-detector/action-protocols.ts:461` (insert before the closing `] as const;` of `ACTION_PROTOCOLS`)
- Test: `lib/emergency-detector/action-protocols.test.ts`

**Interfaces:**

- Consumes: `ActionProtocol`, `ActionStep` (Task 1).
- Produces: `PROTO_HTN_EMERGENCY` retrievable via `getActionProtocol('PROTO_HTN_EMERGENCY')`.

- [ ] **Step 1: Write the failing test**

Add to `lib/emergency-detector/action-protocols.test.ts`:

```ts
describe('PROTO_HTN_EMERGENCY', () => {
  it('is retrievable with non-empty steps and referralCriteria', () => {
    const protocol = getActionProtocol('PROTO_HTN_EMERGENCY');
    expect(protocol).toBeDefined();
    expect(protocol?.steps.length).toBeGreaterThan(0);
    expect(protocol?.referralCriteria.length).toBeGreaterThan(0);
    expect(protocol?.contraindications?.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts -t PROTO_HTN_EMERGENCY`
Expected: FAIL — `protocol` is `undefined`.

- [ ] **Step 3: Add the protocol object**

In `lib/emergency-detector/action-protocols.ts`, find the closing line of `ACTION_PROTOCOLS`:

```ts
] as const;
```

Replace with (inserting the new entry before the closing bracket):

```ts
  // ═══════════════════════════════════════════════════════════════════════════
  // 10. HIPERTENSI EMERGENSI
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_HTN_EMERGENCY',
    name: 'Hipertensi Emergensi',
    condition: 'Krisis hipertensi bertahap — TD sangat tinggi dengan atau tanpa kerusakan organ target',
    steps: [
      { phase: 'A', action: 'Pastikan jalan napas terbuka.' },
      { phase: 'B', action: 'Oksigen bila SpO2 rendah atau distress.' },
      {
        phase: 'C',
        action:
          'Ukur ulang TD dengan teknik benar; identifikasi gejala organ target — nyeri dada (ACS/diseksi), defisit neurologis (stroke), edema paru, tanda AKI, kehamilan/preeklampsia.',
      },
      {
        phase: 'other',
        action:
          'Bila ada gejala organ target di atas: MERAH — siapkan rujuk untuk terapi antihipertensi IV terpantau.',
      },
      {
        phase: 'other',
        action:
          'Bila asimtomatik tanpa bukti kerusakan organ: JANGAN turunkan TD cepat di triase. Nilai kepatuhan obat, atur ulang pengukuran dan follow-up/rujukan sesuai SOP.',
      },
    ],
    contraindications: [
      'Jangan menurunkan TD secara cepat/agresif pada pasien asimtomatik tanpa bukti kerusakan organ target.',
    ],
    referralCriteria: [
      'Nyeri dada ACS/diseksi aorta',
      'Defisit neurologis akut / stroke',
      'Ensefalopati hipertensif',
      'Edema paru akut',
      'Tanda AKI (acute kidney injury)',
      'Kehamilan dengan TD ≥160/110 atau gejala preeklampsia berat',
    ],
    source: 'AHA 2024 Hypertensive Emergency Guidelines',
  },
] as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts -t PROTO_HTN_EMERGENCY`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/emergency-detector/action-protocols.ts lib/emergency-detector/action-protocols.test.ts
git commit -m "feat(med-assist): add PROTO_HTN_EMERGENCY stabilization protocol"
```

---

### Task 3: PROTO_PREECLAMPSIA_ECLAMPSIA

**Files:**

- Modify: `lib/emergency-detector/action-protocols.ts` (append before `] as const;`, after `PROTO_HTN_EMERGENCY`)
- Test: `lib/emergency-detector/action-protocols.test.ts`

**Interfaces:**

- Consumes: `ActionProtocol`, `ActionStep` (Task 1).
- Produces: `PROTO_PREECLAMPSIA_ECLAMPSIA` retrievable via `getActionProtocol()`.

- [ ] **Step 1: Write the failing test**

Add to `lib/emergency-detector/action-protocols.test.ts`:

```ts
describe('PROTO_PREECLAMPSIA_ECLAMPSIA', () => {
  it('is retrievable with non-empty steps and referralCriteria', () => {
    const protocol = getActionProtocol('PROTO_PREECLAMPSIA_ECLAMPSIA');
    expect(protocol).toBeDefined();
    expect(protocol?.steps.length).toBeGreaterThan(0);
    expect(protocol?.referralCriteria.length).toBeGreaterThan(0);
    expect(protocol?.contraindications?.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts -t PROTO_PREECLAMPSIA_ECLAMPSIA`
Expected: FAIL — `protocol` is `undefined`.

- [ ] **Step 3: Add the protocol object**

In `lib/emergency-detector/action-protocols.ts`, insert immediately after the `PROTO_HTN_EMERGENCY` entry added in Task 2 (still before `] as const;`):

```ts
  // ═══════════════════════════════════════════════════════════════════════════
  // 11. PREEKLAMPSIA BERAT / EKLAMSIA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_PREECLAMPSIA_ECLAMPSIA',
    name: 'Preeklampsia Berat / Eklamsia',
    condition:
      'Kehamilan + TD tinggi ± gejala berat (nyeri kepala hebat, gangguan visual, nyeri epigastrium/RUQ, sesak/edema paru, kejang, oliguria)',
    steps: [
      {
        phase: 'A',
        action: 'Miringkan pasien ke kiri bila kejang, pastikan jalan napas, pasang OPA jika kejang aktif.',
      },
      { phase: 'B', action: 'Oksigen.' },
      { phase: 'C', action: 'Ukur ulang TD dengan teknik benar; pasang akses IV.' },
      {
        phase: 'D',
        action:
          'Nilai gejala berat: nyeri kepala hebat, gangguan visual, nyeri epigastrium/RUQ, kejang, oliguria; cek trombosit/SGOT bila tersedia.',
      },
      {
        phase: 'other',
        action:
          'Bila TD berat (≥160/110) atau ada gejala berat: MERAH — berikan MgSO4 untuk profilaksis/terapi kejang sesuai SOP, berikan antihipertensi yang aman untuk kehamilan (nifedipin/metildopa) sesuai SOP, rujuk ke FKRTL setelah stabilisasi awal.',
      },
    ],
    contraindications: [
      'Jangan menunda pemberian MgSO4 pada eklamsia/preeklampsia berat dengan alasan menunggu hasil lab.',
      'Jangan gunakan antihipertensi yang tidak aman untuk kehamilan.',
    ],
    referralCriteria: [
      'TD sistolik ≥160 atau diastolik ≥110 pada kehamilan',
      'Kejang (eklamsia)',
      'Gejala berat: nyeri kepala hebat, gangguan visual, nyeri epigastrium, sesak/edema paru, oliguria',
    ],
    source: 'Kemenkes RI (Pedoman Hipertensi dalam Kehamilan)',
  },
] as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts -t PROTO_PREECLAMPSIA_ECLAMPSIA`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/emergency-detector/action-protocols.ts lib/emergency-detector/action-protocols.test.ts
git commit -m "feat(med-assist): add PROTO_PREECLAMPSIA_ECLAMPSIA stabilization protocol"
```

---

### Task 4: PROTO_DENGUE_SHOCK

**Files:**

- Modify: `lib/emergency-detector/action-protocols.ts` (append after `PROTO_PREECLAMPSIA_ECLAMPSIA`)
- Test: `lib/emergency-detector/action-protocols.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
describe('PROTO_DENGUE_SHOCK', () => {
  it('is retrievable with non-empty steps and referralCriteria', () => {
    const protocol = getActionProtocol('PROTO_DENGUE_SHOCK');
    expect(protocol).toBeDefined();
    expect(protocol?.steps.length).toBeGreaterThan(0);
    expect(protocol?.referralCriteria.length).toBeGreaterThan(0);
    expect(protocol?.contraindications?.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts -t PROTO_DENGUE_SHOCK`
Expected: FAIL.

- [ ] **Step 3: Add the protocol object**

```ts
  // ═══════════════════════════════════════════════════════════════════════════
  // 12. DENGUE BERAT / SYOK DENGUE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_DENGUE_SHOCK',
    name: 'Dengue Berat / Syok Dengue',
    condition: 'Demam + tanda perdarahan + tanda syok, curiga dengue berat',
    steps: [
      { phase: 'A', action: 'Pastikan jalan napas terbuka.' },
      { phase: 'B', action: 'Oksigen.' },
      {
        phase: 'C',
        action:
          'Pasang akses IV, berikan cairan kristaloid isotonik secara hati-hati sesuai fase penyakit dan respons klinis, pantau nadi/TD/CRT/diuresis ketat.',
      },
      { phase: 'other', action: 'Rujuk ke RS dengan kemampuan tata laksana dengue berat.' },
    ],
    contraindications: [
      'Hindari NSAID dan aspirin (risiko perdarahan).',
      'Hindari pemberian cairan berlebihan tanpa pemantauan ketat (risiko overload saat fase kebocoran plasma reda).',
    ],
    referralCriteria: [
      'Tanda syok (TD turun, nadi cepat lemah, CRT memanjang)',
      'Perdarahan bermakna',
      'Diuresis menurun',
      'Tidak respons terhadap resusitasi cairan awal',
    ],
    source: 'WHO Dengue Guidelines / PAHO-WHO Dengue Management Algorithm',
  },
] as const;
```

(Insert before `] as const;`, after `PROTO_PREECLAMPSIA_ECLAMPSIA`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts -t PROTO_DENGUE_SHOCK`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/emergency-detector/action-protocols.ts lib/emergency-detector/action-protocols.test.ts
git commit -m "feat(med-assist): add PROTO_DENGUE_SHOCK stabilization protocol"
```

---

### Task 5: PROTO_MENINGITIS_MENINGOCOCCAL_SEPSIS

**Files:**

- Modify: `lib/emergency-detector/action-protocols.ts` (append after `PROTO_DENGUE_SHOCK`)
- Test: `lib/emergency-detector/action-protocols.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
describe('PROTO_MENINGITIS_MENINGOCOCCAL_SEPSIS', () => {
  it('is retrievable with non-empty steps and referralCriteria', () => {
    const protocol = getActionProtocol('PROTO_MENINGITIS_MENINGOCOCCAL_SEPSIS');
    expect(protocol).toBeDefined();
    expect(protocol?.steps.length).toBeGreaterThan(0);
    expect(protocol?.referralCriteria.length).toBeGreaterThan(0);
    expect(protocol?.contraindications?.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts -t PROTO_MENINGITIS_MENINGOCOCCAL_SEPSIS`
Expected: FAIL.

- [ ] **Step 3: Add the protocol object**

```ts
  // ═══════════════════════════════════════════════════════════════════════════
  // 13. MENINGITIS / SEPSIS MENINGOKOKUS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_MENINGITIS_MENINGOCOCCAL_SEPSIS',
    name: 'Meningitis / Sepsis Meningokokus',
    condition: 'Demam + kaku kuduk/penurunan kesadaran, atau demam + petekie + toksik',
    steps: [
      { phase: 'A', action: 'Terapkan isolasi droplet bila dicurigai meningokokus.' },
      { phase: 'B', action: 'Oksigen bila diperlukan.' },
      { phase: 'C', action: 'Pasang akses IV.' },
      { phase: 'D', action: 'Koreksi hipoglikemia dan kejang bila ada.' },
      {
        phase: 'other',
        action:
          'Berikan antibiotik parenteral segera bila tersedia sesuai SOP — jangan menunggu hasil pemeriksaan penunjang untuk memulai terapi.',
      },
      { phase: 'other', action: 'Rujuk segera ke RS.' },
    ],
    contraindications: [
      'Jangan menunda pemberian antibiotik untuk menunggu hasil laboratorium/pencitraan.',
    ],
    referralCriteria: [
      'Semua kasus suspek meningitis/sepsis meningokokus harus dirujuk segera',
      'Petekie yang meluas, tanda syok, atau penurunan kesadaran progresif',
    ],
    source: 'WHO 2025 Meningitis Guidelines (target antibiotik dalam 1 jam)',
  },
] as const;
```

(Insert before `] as const;`, after `PROTO_DENGUE_SHOCK`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts -t PROTO_MENINGITIS_MENINGOCOCCAL_SEPSIS`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/emergency-detector/action-protocols.ts lib/emergency-detector/action-protocols.test.ts
git commit -m "feat(med-assist): add PROTO_MENINGITIS_MENINGOCOCCAL_SEPSIS stabilization protocol"
```

---

### Task 6: PROTO_ASTHMA_COPD_EXACERBATION

**Files:**

- Modify: `lib/emergency-detector/action-protocols.ts` (append after `PROTO_MENINGITIS_MENINGOCOCCAL_SEPSIS`)
- Test: `lib/emergency-detector/action-protocols.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
describe('PROTO_ASTHMA_COPD_EXACERBATION', () => {
  it('is retrievable with non-empty steps and referralCriteria', () => {
    const protocol = getActionProtocol('PROTO_ASTHMA_COPD_EXACERBATION');
    expect(protocol).toBeDefined();
    expect(protocol?.steps.length).toBeGreaterThan(0);
    expect(protocol?.referralCriteria.length).toBeGreaterThan(0);
    expect(protocol?.contraindications?.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts -t PROTO_ASTHMA_COPD_EXACERBATION`
Expected: FAIL.

- [ ] **Step 3: Add the protocol object**

```ts
  // ═══════════════════════════════════════════════════════════════════════════
  // 14. EKSASERBASI ASMA / COPD
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_ASTHMA_COPD_EXACERBATION',
    name: 'Eksaserbasi Asma / COPD',
    condition: 'Sesak + wheezing/silent chest, riwayat asma atau COPD, RR/SpO2 abnormal',
    steps: [
      { phase: 'A', action: 'Posisikan pasien duduk tegak.' },
      {
        phase: 'B',
        action:
          'Untuk asma berat: SABA inhalasi/nebulisasi berulang, tambahkan ipratropium, oksigen terkontrol, kortikosteroid sistemik diberikan dini.',
      },
      {
        phase: 'B',
        action:
          'Untuk COPD: bronkodilator kerja pendek, oksigen terkontrol (hati-hati target SpO2 88-92% bila risiko retensi CO2), steroid sistemik/antibiotik sesuai indikasi dan SOP.',
      },
      {
        phase: 'other',
        action: 'Rujuk bila berat, respons buruk terhadap terapi awal, silent chest, mengantuk, atau bingung.',
      },
    ],
    contraindications: [
      'Jangan memberikan oksigen tanpa target/tanpa titrasi pada pasien COPD berisiko retensi CO2 — gunakan target saturasi konservatif sesuai SOP.',
    ],
    referralCriteria: [
      'Silent chest',
      'Mengantuk berat atau bingung (tanda kelelahan napas)',
      'Tidak respons terhadap bronkodilator + steroid awal',
      'SpO2 tetap rendah setelah terapi',
    ],
    source: 'GINA 2025 (Global Initiative for Asthma), GOLD 2026 (COPD)',
  },
] as const;
```

(Insert before `] as const;`, after `PROTO_MENINGITIS_MENINGOCOCCAL_SEPSIS`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts -t PROTO_ASTHMA_COPD_EXACERBATION`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/emergency-detector/action-protocols.ts lib/emergency-detector/action-protocols.test.ts
git commit -m "feat(med-assist): add PROTO_ASTHMA_COPD_EXACERBATION stabilization protocol"
```

---

### Task 7: PROTO_UPPER_AIRWAY_OBSTRUCTION

**Files:**

- Modify: `lib/emergency-detector/action-protocols.ts` (append after `PROTO_ASTHMA_COPD_EXACERBATION`)
- Test: `lib/emergency-detector/action-protocols.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
describe('PROTO_UPPER_AIRWAY_OBSTRUCTION', () => {
  it('is retrievable with non-empty steps and referralCriteria', () => {
    const protocol = getActionProtocol('PROTO_UPPER_AIRWAY_OBSTRUCTION');
    expect(protocol).toBeDefined();
    expect(protocol?.steps.length).toBeGreaterThan(0);
    expect(protocol?.referralCriteria.length).toBeGreaterThan(0);
    expect(protocol?.contraindications?.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts -t PROTO_UPPER_AIRWAY_OBSTRUCTION`
Expected: FAIL.

- [ ] **Step 3: Add the protocol object**

```ts
  // ═══════════════════════════════════════════════════════════════════════════
  // 15. EPIGLOTITIS / OBSTRUKSI LARING
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_UPPER_AIRWAY_OBSTRUCTION',
    name: 'Epiglotitis / Obstruksi Laring',
    condition: 'Sulit napas + suara serak/stridor, curiga obstruksi jalan napas atas',
    steps: [
      {
        phase: 'A',
        action:
          'JANGAN memaksa pemeriksaan tenggorok. Biarkan pasien pada posisi paling nyaman baginya — jangan dibaringkan bila memperburuk gejala.',
      },
      { phase: 'B', action: 'Berikan oksigen tanpa memprovokasi pasien.' },
      { phase: 'other', action: 'Siapkan rujukan emergensi dengan notifikasi RS tujuan terlebih dahulu.' },
    ],
    contraindications: [
      'Jangan memeriksa tenggorok secara paksa (dapat memicu spasme laring total).',
      'Jangan memaksa posisi berbaring bila pasien merasa lebih nyaman duduk/tegak.',
    ],
    referralCriteria: [
      'Semua kasus suspek epiglotitis/obstruksi laring harus dirujuk emergensi dengan notifikasi RS',
    ],
    source: 'Praktik klinis standar tata laksana jalan napas atas darurat',
  },
] as const;
```

(Insert before `] as const;`, after `PROTO_ASTHMA_COPD_EXACERBATION`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts -t PROTO_UPPER_AIRWAY_OBSTRUCTION`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/emergency-detector/action-protocols.ts lib/emergency-detector/action-protocols.test.ts
git commit -m "feat(med-assist): add PROTO_UPPER_AIRWAY_OBSTRUCTION stabilization protocol"
```

---

### Task 8: PROTO_PE_AORTIC_DISSECTION

**Files:**

- Modify: `lib/emergency-detector/action-protocols.ts` (append after `PROTO_UPPER_AIRWAY_OBSTRUCTION`)
- Test: `lib/emergency-detector/action-protocols.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
describe('PROTO_PE_AORTIC_DISSECTION', () => {
  it('is retrievable with non-empty steps and referralCriteria', () => {
    const protocol = getActionProtocol('PROTO_PE_AORTIC_DISSECTION');
    expect(protocol).toBeDefined();
    expect(protocol?.steps.length).toBeGreaterThan(0);
    expect(protocol?.referralCriteria.length).toBeGreaterThan(0);
    expect(protocol?.contraindications?.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts -t PROTO_PE_AORTIC_DISSECTION`
Expected: FAIL.

- [ ] **Step 3: Add the protocol object**

```ts
  // ═══════════════════════════════════════════════════════════════════════════
  // 16. EMBOLI PARU / DISEKSI AORTA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_PE_AORTIC_DISSECTION',
    name: 'Emboli Paru / Diseksi Aorta',
    condition:
      'Nyeri dada non-ACS yang berpotensi mematikan — sesak mendadak (curiga PE) atau nyeri dada/punggung robek mendadak (curiga diseksi aorta)',
    steps: [
      { phase: 'A', action: 'Pastikan jalan napas terbuka.' },
      { phase: 'B', action: 'Oksigen; EKG 12 sadapan bila tersedia.' },
      {
        phase: 'C',
        action:
          'Nilai tanda syok, hipotensi, atau hipertensi berat; nilai defisit nadi/neurologis (diseksi) atau faktor risiko PE (postpartum, hemoptisis, unilateral leg swelling).',
      },
      {
        phase: 'other',
        action:
          'JANGAN menunda rujukan untuk menunggu pemeriksaan penunjang lokal. Analgesia sesuai SOP untuk diseksi aorta. Rujuk emergensi.',
      },
    ],
    contraindications: [
      'Hindari bolus cairan agresif pada dugaan diseksi aorta kecuali pasien syok.',
      'Jangan menunda rujukan untuk mengejar kepastian diagnosis di fasilitas primer.',
    ],
    referralCriteria: [
      'Hipotensi atau sinkop dengan dugaan PE',
      'SpO2 rendah dengan dugaan PE',
      'Nyeri dada/punggung robek mendadak dengan defisit nadi/neurologis',
      'Hipertensi berat dengan nyeri dada/punggung mendadak hebat',
    ],
    source: 'AHA/ACC Guidelines (Acute Aortic Syndrome, Pulmonary Embolism)',
  },
] as const;
```

(Insert before `] as const;`, after `PROTO_UPPER_AIRWAY_OBSTRUCTION`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts -t PROTO_PE_AORTIC_DISSECTION`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/emergency-detector/action-protocols.ts lib/emergency-detector/action-protocols.test.ts
git commit -m "feat(med-assist): add PROTO_PE_AORTIC_DISSECTION stabilization protocol"
```

---

### Task 9: PROTO_NEURO_RED_FLAG

**Files:**

- Modify: `lib/emergency-detector/action-protocols.ts` (append after `PROTO_PE_AORTIC_DISSECTION`)
- Test: `lib/emergency-detector/action-protocols.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
describe('PROTO_NEURO_RED_FLAG', () => {
  it('is retrievable with non-empty steps and referralCriteria', () => {
    const protocol = getActionProtocol('PROTO_NEURO_RED_FLAG');
    expect(protocol).toBeDefined();
    expect(protocol?.steps.length).toBeGreaterThan(0);
    expect(protocol?.referralCriteria.length).toBeGreaterThan(0);
    expect(protocol?.contraindications?.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts -t PROTO_NEURO_RED_FLAG`
Expected: FAIL.

- [ ] **Step 3: Add the protocol object**

```ts
  // ═══════════════════════════════════════════════════════════════════════════
  // 17. RED FLAG NEUROLOGIS (SAH / CEDERA KEPALA BERAT)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_NEURO_RED_FLAG',
    name: 'Red Flag Neurologis (SAH / Cedera Kepala Berat)',
    condition:
      "Nyeri kepala thunderclap mendadak, atau cedera kepala dengan tanda peningkatan TIK (Cushing's Triad)",
    steps: [
      { phase: 'A', action: 'Imobilisasi servikal bila ada riwayat trauma.' },
      { phase: 'B', action: 'Oksigen.' },
      { phase: 'C', action: 'Elevasi kepala tempat tidur bila pasien tidak hipotensi.' },
      { phase: 'D', action: 'Kontrol kejang dan muntah sesuai SOP.' },
      { phase: 'other', action: 'Rujuk emergensi segera.' },
    ],
    contraindications: ['Jangan mengelevasi kepala bila pasien hipotensi/syok.'],
    referralCriteria: [
      'Semua kasus suspek SAH (nyeri kepala thunderclap) atau cedera kepala berat harus dirujuk emergensi',
    ],
    source: 'NICE Head Injury Guideline',
  },
] as const;
```

(Insert before `] as const;`, after `PROTO_PE_AORTIC_DISSECTION`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts -t PROTO_NEURO_RED_FLAG`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/emergency-detector/action-protocols.ts lib/emergency-detector/action-protocols.test.ts
git commit -m "feat(med-assist): add PROTO_NEURO_RED_FLAG stabilization protocol"
```

---

### Task 10: PROTO_CAUDA_EQUINA

**Files:**

- Modify: `lib/emergency-detector/action-protocols.ts` (append after `PROTO_NEURO_RED_FLAG`)
- Test: `lib/emergency-detector/action-protocols.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
describe('PROTO_CAUDA_EQUINA', () => {
  it('is retrievable with non-empty steps and referralCriteria', () => {
    const protocol = getActionProtocol('PROTO_CAUDA_EQUINA');
    expect(protocol).toBeDefined();
    expect(protocol?.steps.length).toBeGreaterThan(0);
    expect(protocol?.referralCriteria.length).toBeGreaterThan(0);
    expect(protocol?.contraindications?.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts -t PROTO_CAUDA_EQUINA`
Expected: FAIL.

- [ ] **Step 3: Add the protocol object**

```ts
  // ═══════════════════════════════════════════════════════════════════════════
  // 18. CAUDA EQUINA SYNDROME
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_CAUDA_EQUINA',
    name: 'Cauda Equina Syndrome',
    condition:
      'Retensi/inkontinensia urin baru, gangguan BAB, saddle anesthesia, kelemahan tungkai bilateral progresif, nyeri radikular berat',
    steps: [
      {
        phase: 'other',
        action:
          'Dokumentasikan onset gejala dan temuan neurologis secara rinci (kekuatan motorik, sensasi saddle, tonus sfingter bila memungkinkan).',
      },
      { phase: 'other', action: 'Berikan analgesia yang aman sesuai SOP.' },
      {
        phase: 'other',
        action:
          'Rujuk segera untuk MRI dan evaluasi bedah saraf/ortopedi — ini bukan kasus observasi di Puskesmas.',
      },
    ],
    contraindications: [
      'Jangan menahan pasien untuk observasi di Puskesmas — ini kondisi time-critical yang butuh MRI dan bedah saraf/ortopedi segera.',
    ],
    referralCriteria: ['Semua kasus dengan kecurigaan cauda equina syndrome harus dirujuk segera'],
    source: 'GIRFT (Getting It Right First Time) Cauda Equina Syndrome Pathway 2026',
  },
] as const;
```

(Insert before `] as const;`, after `PROTO_NEURO_RED_FLAG`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts -t PROTO_CAUDA_EQUINA`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/emergency-detector/action-protocols.ts lib/emergency-detector/action-protocols.test.ts
git commit -m "feat(med-assist): add PROTO_CAUDA_EQUINA stabilization protocol"
```

---

### Task 11: PROTO_OBSTETRIC_ABDOMEN_BLEEDING

**Files:**

- Modify: `lib/emergency-detector/action-protocols.ts` (append after `PROTO_CAUDA_EQUINA`)
- Test: `lib/emergency-detector/action-protocols.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
describe('PROTO_OBSTETRIC_ABDOMEN_BLEEDING', () => {
  it('is retrievable with non-empty steps and referralCriteria', () => {
    const protocol = getActionProtocol('PROTO_OBSTETRIC_ABDOMEN_BLEEDING');
    expect(protocol).toBeDefined();
    expect(protocol?.steps.length).toBeGreaterThan(0);
    expect(protocol?.referralCriteria.length).toBeGreaterThan(0);
    expect(protocol?.contraindications?.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts -t PROTO_OBSTETRIC_ABDOMEN_BLEEDING`
Expected: FAIL.

- [ ] **Step 3: Add the protocol object**

```ts
  // ═══════════════════════════════════════════════════════════════════════════
  // 19. KEGAWATAN ABDOMEN OBSTETRI (KET / ABORTUS)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_OBSTETRIC_ABDOMEN_BLEEDING',
    name: 'Kegawatan Abdomen Obstetri (KET / Abortus)',
    condition: 'Hamil (atau dugaan hamil) + nyeri perut + perdarahan',
    steps: [
      { phase: 'A', action: 'Pastikan jalan napas terbuka.' },
      { phase: 'B', action: 'Oksigen bila diperlukan.' },
      {
        phase: 'C',
        action:
          'Lakukan tes kehamilan bila status belum jelas; nilai tanda syok/perdarahan; pasang akses IV; berikan cairan bila hemodinamik tidak stabil.',
      },
      { phase: 'other', action: 'Rujuk untuk USG dan evaluasi lanjutan.' },
    ],
    contraindications: [
      'Jangan menunda rujukan untuk menunggu USG/lab lokal bila pasien syok, nyeri hebat, sinkop, atau perdarahan aktif.',
    ],
    referralCriteria: [
      'Tanda syok atau hemodinamik tidak stabil',
      'Nyeri perut hebat',
      'Sinkop',
      'Perdarahan aktif bermakna',
    ],
    source: 'Praktik klinis standar kegawatan obstetri-ginekologi',
  },
] as const;
```

(Insert before `] as const;`, after `PROTO_CAUDA_EQUINA`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts -t PROTO_OBSTETRIC_ABDOMEN_BLEEDING`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/emergency-detector/action-protocols.ts lib/emergency-detector/action-protocols.test.ts
git commit -m "feat(med-assist): add PROTO_OBSTETRIC_ABDOMEN_BLEEDING stabilization protocol"
```

---

### Task 12: PROTO_TOX_RESP_DEPRESSION

**Files:**

- Modify: `lib/emergency-detector/action-protocols.ts` (append after `PROTO_OBSTETRIC_ABDOMEN_BLEEDING`)
- Test: `lib/emergency-detector/action-protocols.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
describe('PROTO_TOX_RESP_DEPRESSION', () => {
  it('is retrievable with non-empty steps and referralCriteria', () => {
    const protocol = getActionProtocol('PROTO_TOX_RESP_DEPRESSION');
    expect(protocol).toBeDefined();
    expect(protocol?.steps.length).toBeGreaterThan(0);
    expect(protocol?.referralCriteria.length).toBeGreaterThan(0);
    expect(protocol?.contraindications?.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts -t PROTO_TOX_RESP_DEPRESSION`
Expected: FAIL.

- [ ] **Step 3: Add the protocol object**

```ts
  // ═══════════════════════════════════════════════════════════════════════════
  // 20. DEPRESI NAPAS AKIBAT OBAT / OVERDOSIS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_TOX_RESP_DEPRESSION',
    name: 'Depresi Napas Akibat Obat / Overdosis',
    condition: 'RR rendah/borderline + mengantuk berat, curiga overdosis obat',
    steps: [
      { phase: 'A', action: 'Posisikan jalan napas terbuka; posisi miring bila risiko muntah.' },
      {
        phase: 'B',
        action: 'Berikan bantuan napas dengan bag-valve-mask bila ventilasi tidak adekuat; oksigen.',
      },
      {
        phase: 'D',
        action: 'Cek gula darah sewaktu; berikan nalokson bila curiga overdosis opioid dan tersedia, sesuai SOP.',
      },
      { phase: 'other', action: 'Observasi ketat, rujuk.' },
    ],
    contraindications: [
      'Jangan mengandalkan nalokson tunggal tanpa terus memantau jalan napas — efeknya bisa lebih pendek dari opioid penyebab (risiko relaps depresi napas).',
    ],
    referralCriteria: [
      'Ventilasi tidak adekuat meski sudah dibantu',
      'Tidak respons terhadap nalokson (bila diberikan)',
      'Penurunan kesadaran menetap',
    ],
    source: 'Praktik BLS/toksikologi klinis standar',
  },
] as const;
```

(Insert before `] as const;`, after `PROTO_OBSTETRIC_ABDOMEN_BLEEDING`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts -t PROTO_TOX_RESP_DEPRESSION`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/emergency-detector/action-protocols.ts lib/emergency-detector/action-protocols.test.ts
git commit -m "feat(med-assist): add PROTO_TOX_RESP_DEPRESSION stabilization protocol"
```

---

### Task 13: PROTO_GERIATRIC_OCCULT_RISK

**Files:**

- Modify: `lib/emergency-detector/action-protocols.ts` (append after `PROTO_TOX_RESP_DEPRESSION`)
- Test: `lib/emergency-detector/action-protocols.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
describe('PROTO_GERIATRIC_OCCULT_RISK', () => {
  it('is retrievable with non-empty steps and referralCriteria', () => {
    const protocol = getActionProtocol('PROTO_GERIATRIC_OCCULT_RISK');
    expect(protocol).toBeDefined();
    expect(protocol?.steps.length).toBeGreaterThan(0);
    expect(protocol?.referralCriteria.length).toBeGreaterThan(0);
    expect(protocol?.contraindications?.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts -t PROTO_GERIATRIC_OCCULT_RISK`
Expected: FAIL.

- [ ] **Step 3: Add the protocol object**

```ts
  // ═══════════════════════════════════════════════════════════════════════════
  // 21. RISIKO TERSEMBUNYI PADA LANSIA (ORTOSTATIK / FRAILTY)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_GERIATRIC_OCCULT_RISK',
    name: 'Risiko Tersembunyi pada Lansia (Ortostatik / Frailty)',
    condition:
      'Hipotensi ortostatik, atau frailty dengan tanda vital naik perlahan — tidak boleh dianggap "hijau" hanya karena angka tidak ekstrem',
    steps: [
      { phase: 'C', action: 'Cek tekanan darah/nadi ortostatik bila aman untuk dilakukan.' },
      { phase: 'D', action: 'Cek gula darah sewaktu.' },
      {
        phase: 'other',
        action:
          'Nilai hidrasi, obat-obatan yang dikonsumsi, kemungkinan infeksi tersembunyi, delirium, riwayat jatuh, dan asupan makan/minum.',
      },
    ],
    contraindications: [
      'Jangan menyimpulkan "stabil/aman" hanya berdasarkan angka vital yang belum mencapai ambang ekstrem pada pasien lansia frail.',
    ],
    referralCriteria: [
      'Pasien frail yang tinggal sendiri',
      'Delirium baru',
      'Hipotensi atau takikardia bermakna',
      'Dehidrasi atau asupan makan/minum gagal',
      'Caregiver menyatakan kekhawatiran signifikan',
    ],
    source: 'Praktik kedokteran gawat darurat geriatri standar',
  },
] as const;
```

(Insert before `] as const;`, after `PROTO_TOX_RESP_DEPRESSION`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts -t PROTO_GERIATRIC_OCCULT_RISK`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/emergency-detector/action-protocols.ts lib/emergency-detector/action-protocols.test.ts
git commit -m "feat(med-assist): add PROTO_GERIATRIC_OCCULT_RISK stabilization protocol"
```

---

### Task 14: PROTO_SAFETY_NET_CLINICAL_CONCERN

**Files:**

- Modify: `lib/emergency-detector/action-protocols.ts` (append after `PROTO_GERIATRIC_OCCULT_RISK`)
- Test: `lib/emergency-detector/action-protocols.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
describe('PROTO_SAFETY_NET_CLINICAL_CONCERN', () => {
  it('is retrievable with non-empty steps and referralCriteria', () => {
    const protocol = getActionProtocol('PROTO_SAFETY_NET_CLINICAL_CONCERN');
    expect(protocol).toBeDefined();
    expect(protocol?.steps.length).toBeGreaterThan(0);
    expect(protocol?.referralCriteria.length).toBeGreaterThan(0);
    expect(protocol?.contraindications?.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts -t PROTO_SAFETY_NET_CLINICAL_CONCERN`
Expected: FAIL.

- [ ] **Step 3: Add the protocol object**

```ts
  // ═══════════════════════════════════════════════════════════════════════════
  // 22. SAFETY-NET UNTUK KEKHAWATIRAN KLINIS / KODE MERAH OTOMATIS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_SAFETY_NET_CLINICAL_CONCERN',
    name: 'Safety-Net untuk Kekhawatiran Klinis / Kode Merah Otomatis',
    condition:
      'Kode merah otomatis dari sistem, deteriorasi progresif, vital borderline, nyeri hebat, atau kekhawatiran klinis umum tanpa diagnosis pasti',
    steps: [
      { phase: 'other', action: 'Ulangi pengukuran tanda vital.' },
      { phase: 'other', action: 'Jangan pulangkan pasien sebelum dilakukan reassessment.' },
      { phase: 'other', action: 'Cari kemungkinan diagnosis time-critical yang mungkin terlewat.' },
      {
        phase: 'other',
        action:
          'Rujuk bila nyeri hebat, pasien tampak toksik, tren vital memburuk, pasien/keluarga tampak sangat khawatir, atau data yang ada tidak cukup untuk menyatakan pasien aman.',
      },
    ],
    contraindications: [
      'Jangan memulangkan pasien hanya berdasarkan satu kali pengukuran vital yang tampak normal bila ada kekhawatiran klinis yang jelas.',
    ],
    referralCriteria: [
      'Tren vital memburuk meski belum mencapai ambang kritis',
      'Kekhawatiran klinis kuat dari nakes atau keluarga tanpa diagnosis pasti',
      'Data tidak cukup untuk menyatakan pasien aman dipulangkan',
    ],
    source: 'Prinsip keselamatan pasien umum (clinical safety-netting)',
  },
] as const;
```

(Insert before `] as const;`, after `PROTO_GERIATRIC_OCCULT_RISK`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts -t PROTO_SAFETY_NET_CLINICAL_CONCERN`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/emergency-detector/action-protocols.ts lib/emergency-detector/action-protocols.test.ts
git commit -m "feat(med-assist): add PROTO_SAFETY_NET_CLINICAL_CONCERN stabilization protocol"
```

---

### Task 15: Final verification (22-protocol count + full suite)

**Files:**

- Test: `lib/emergency-detector/action-protocols.test.ts`

**Interfaces:**

- Consumes: `ACTION_PROTOCOLS` (all 22 entries from Tasks 1-14).

- [ ] **Step 1: Add the final count assertion**

Add to `lib/emergency-detector/action-protocols.test.ts`:

```ts
describe('ACTION_PROTOCOLS total count', () => {
  it('has exactly 22 protocols (9 existing + 13 new)', () => {
    expect(ACTION_PROTOCOLS).toHaveLength(22);
  });

  it('has no duplicate ids', () => {
    const ids = ACTION_PROTOCOLS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 2: Run the full test file**

Run: `npx vitest run lib/emergency-detector/action-protocols.test.ts`
Expected: PASS — all tests across all 15 tasks (10 snapshot + 13 protocol + 2 count = 25 tests) pass.

- [ ] **Step 3: Run typecheck, lint, and the full med-assist test suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx eslint lib/emergency-detector/action-protocols.ts lib/emergency-detector/action-protocols.test.ts`
Expected: no errors.

Run: `npx vitest run`
Expected: all files passed, zero regressions (baseline before this plan: 760 passed / 9 skipped — expect 760 + 25 = 785 passed / 9 skipped).

- [ ] **Step 4: Commit**

```bash
git add lib/emergency-detector/action-protocols.test.ts
git commit -m "test(med-assist): verify all 22 ABCDE protocols present with no duplicate ids"
```

---

## Self-Review Notes

- **Spec coverage:** All 13 protocols from the spec transcribed with identical clinical content (steps, contraindications, referralCriteria, source). `contraindications` field added per spec's Architecture section. Regression snapshot for the 9 existing protocols added per spec's Testing Plan. Final 22-count + no-duplicate-ids assertions added per spec's Testing Plan.
- **Placeholder scan:** No TBD/TODO. Every step shows exact, complete code — no "same as Task N" shorthand (each protocol's full object is written out in its own task, even though the shape repeats).
- **Type consistency:** All protocol objects use the same field names/types as the existing 9 entries (`id`, `name`, `condition`, `steps: {phase, action}[]`, `contraindications?: string[]`, `referralCriteria: string[]`, `source`) — no naming drift across tasks.
- **Out-of-scope guard:** No task touches `clinical-patterns.ts`, `htn-classifier.ts`, `vital-guardrails.ts`, or any UI file (`main.tsx`, `TTVInferenceUI.tsx`, `SidePanelHeader.tsx`) — sub-projects B/C/D remain untouched, matching the spec's scope boundary.
