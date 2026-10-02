# Visit Summary PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One "Unduh PDF" button on the Diagnosis page's RME Terapi step saves the visit as a Swiss Style A4 PDF (12-column grid, Helvetica, black logomark on page 1, no patient name).

**Architecture:** A pure model builder turns the page's data into `VisitSummaryModel`; a pure layout turns the model into absolute draw ops on a 12-column / 12 pt baseline grid with pagination; a thin pdf-lib renderer draws the ops. The download module (pdf-lib and all) is loaded with a dynamic `import()` on click, so the side panel's first load is unchanged.

**Tech Stack:** TypeScript 5.9, React 18, WXT MV3, Vitest (jsdom; `// @vitest-environment node` for the pdf-lib files), pdf-lib 1.17.1.

**Spec:** `docs/specs/2026-10-03-visit-summary-pdf-design.md`

## Global Constraints

- Gates through the wrapper only: `node scripts/pnpm.mjs run lint | typecheck | test | test:e2e`, `node scripts/pnpm.mjs exec wxt build --mode development`, `node scripts/pnpm.mjs run run:check`, `node scripts/pnpm.mjs run build` last. Root (`D:\DEV\monorepo`): `pnpm run governance | check:tokens | lint | typecheck | test | build`.
- Single test file: `node scripts/pnpm.mjs exec vitest run <path>`.
- New dependency: exactly `pdf-lib@1.17.1` (Chief approved); nothing else.
- `entrypoints/sidepanel/main.tsx` (protected): only the `visitSummaryContext` prop on `<ClinicalDifferential>`.
- `lib/iskandar-diagnosis-engine/**`, `lib/emergency-detector/**`: import only, no edit.
- `entrypoints/sidepanel/style.css`: append-only (`git diff main --numstat` shows 0 deleted); this plan needs no CSS.
- No patient name, date of birth, kelurahan, BPJS status, or history doctor/nurse/therapy text in the PDF.
- `lib/**` does not import from `components/**`; dose notation is applied by the caller.
- No `@ts-ignore`, no `eslint-disable`, no silent casts, no implicit `any`.
- Do not touch another session's uncommitted files: `lib/api/sentra-api.ts`, `lib/api/sentra-api.recommend-prescription.test.ts`, `tests/e2e/zz-verify-kb-rx.spec.ts`, root `.agents/HANDOFF.md`.
- Tests are written first and seen failing first; a migrated assertion is named in the commit body.

## Review Focus

- Long free text (a pasted complaint, a drug name without spaces) → wraps inside its columns, never past column 12 (Task 3, `breaks a word wider than its columns`).
- Text outside WinAnsi (`≥`, `SpO₂`, an emoji) → mapped or `?`, never a pdf-lib throw (Task 1, Task 3 `every text … encodable`).
- Many medications → Tatalaksana continues on the next page with its label, no baseline below the content bottom, pages numbered n/N (Task 3).
- Visit history with a missing vital or an unreadable date → a gap in the line and no `NaN` text (Task 2 `skips visits without a readable date`, Task 3 trend markers).
- Logo fetch or render failure → one error line, no download, button usable again (Task 5 download test and panel test).

---

### Task 1: pdf-lib and the WinAnsi text guard

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml` (via the wrapper)
- Create: `lib/report/winansi.ts`
- Test: `lib/report/winansi.test.ts`

**Interfaces:**
- Produces: `WINANSI_MAP: Readonly<Record<string, string>>`, `isWinAnsi(char: string): boolean`, `toWinAnsi(text: string): string`.

- [ ] **Step 1: Add the dependency**

Run: `node scripts/pnpm.mjs add pdf-lib@1.17.1`
Expected: `package.json` dependencies gain `"pdf-lib": "1.17.1"` (or `^1.17.1`), lockfile updated, exit 0.

- [ ] **Step 2: Write the failing test** — `lib/report/winansi.test.ts`

```ts
// @vitest-environment node
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { WINANSI_MAP, toWinAnsi } from './winansi';

describe('toWinAnsi', () => {
  it('spells every mapped character as text the standard Helvetica encodes', async () => {
    const font = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
    for (const [char, spelled] of Object.entries(WINANSI_MAP)) {
      expect(toWinAnsi(char)).toBe(spelled);
      expect(() => font.encodeText(toWinAnsi(`a${char}b`))).not.toThrow();
    }
  });

  it('keeps the WinAnsi characters a clinical note uses', () => {
    const note = 'Suhu 37,5 °C · 1x10mg – µg × 2 “catatan”';
    expect(toWinAnsi(note)).toBe(note);
  });

  it('turns line breaks into spaces and an unknown character into ?', () => {
    expect(toWinAnsi('SpO₂ ≥ 95\nbaik 🙂')).toBe('SpO2 >= 95 baik ?');
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `node scripts/pnpm.mjs exec vitest run lib/report/winansi.test.ts`
Expected: FAIL, `Failed to resolve import "./winansi"`.

- [ ] **Step 4: Implement** — `lib/report/winansi.ts`

```ts
/**
 * The standard PDF Helvetica encodes WinAnsi (Windows-1252) only, and pdf-lib throws on anything
 * else. Every text the visit summary draws passes through `toWinAnsi`: a known character becomes
 * an encodable spelling, any other unencodable one `?`.
 */
const WINANSI_HIGH = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';

export const WINANSI_MAP: Readonly<Record<string, string>> = {
  '≥': '>=',
  '≤': '<=',
  '→': '->',
  '←': '<-',
  '≈': '~',
  '−': '-',
  '\u2010': '-',
  '\u2011': '-',
  '₂': '2',
  '\u2009': ' ',
  '\u202f': ' ',
  '\u200b': '',
};

export function isWinAnsi(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WINANSI_HIGH.includes(char);
}

export function toWinAnsi(text: string): string {
  return Array.from(text.normalize('NFC').replace(/[\t\r\n]+/g, ' '))
    .map((char) => WINANSI_MAP[char] ?? (isWinAnsi(char) ? char : '?'))
    .join('');
}
```

- [ ] **Step 5: Run it to see it pass**

Run: `node scripts/pnpm.mjs exec vitest run lib/report/winansi.test.ts`
Expected: PASS, 3 tests.

### Task 2: the visit summary model

**Files:**
- Create: `lib/report/visit-summary-model.ts`
- Create: `lib/report/visit-summary.fixtures.ts`
- Test: `lib/report/visit-summary-model.test.ts`

**Interfaces:**
- Consumes: `TriageZone` (`@/lib/emergency-detector/triage-verdict`), `NORMAL_RANGES` (`@/lib/iskandar-diagnosis-engine/trajectory-analyzer`), `VisitRecord` (`@/lib/iskandar-diagnosis-engine/visit-history-store`).
- Produces: `VisitSummaryContext`, `VisitSummaryInput`, `TrendRow`, `VisitSummaryModel`, `buildVisitSummaryModel(input: VisitSummaryInput): VisitSummaryModel`; fixtures `syntheticVisitSummaryInput`, `longVisitSummaryInput` (45 medications), `syntheticVisit(date, vitals)`.

- [ ] **Step 1: Write the fixtures** — `lib/report/visit-summary.fixtures.ts` (synthetic only)

```ts
import type { VisitSummaryInput } from './visit-summary-model';

import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

type Vitals = VisitRecord['vitals'];

/** A past visit as the scraper keeps it, with clinician names and therapy the PDF must not print. */
export function syntheticVisit(date: string, vitals: Vitals): VisitRecord {
  return {
    patient_id: 'RM-00-12-34',
    encounter_id: `enc-${date}`,
    timestamp: `${date}T09:00:00`,
    vitals,
    keluhan_utama: 'Kontrol',
    terapi_obat: 'Obat Rahasia 1x1',
    dokter_penanganan: 'dr. Rahasia',
    perawat_penanganan: 'Ns. Rahasia',
    source: 'scrape',
  };
}

export const syntheticVisitSummaryInput: VisitSummaryInput = {
  rm: 'RM-00-12-34',
  age: 54,
  gender: 'P',
  keluhanUtama: 'Nyeri kepala tengkuk sejak 3 hari, memberat saat sore',
  keluhanTambahan: 'Pusing berputar ringan',
  allergies: ['Amoksisilin'],
  pregnant: false,
  vitals: { sbp: 152, dbp: 96, hr: 88, rr: 20, temp: 37.2, glucose: 142 },
  diagnoses: [
    { icd: 'I10', name: 'Hipertensi esensial' },
    { icd: 'R51', name: 'Nyeri kepala' },
  ],
  medications: [
    { name: 'Amlodipin', dose: '1x10mg', use: 'Sesudah makan', duration: '30 hari' },
    { name: 'Parasetamol', dose: '3x500mg', use: 'Jika diperlukan', duration: '3 hari' },
  ],
  alerts: [
    {
      severity: 'high',
      title: 'Tekanan darah tinggi',
      message: 'TD ≥ 140/90 pada dua kunjungan; evaluasi kepatuhan obat.',
    },
    { severity: 'info', title: 'Edukasi garam', message: 'Batasi garam < 5 g/hari.' },
  ],
  context: {
    facilityName: 'Puskesmas Sintetis',
    triage: { zone: 'kuning', headline: 'Hipertensi derajat 2' },
    spo2: 98,
    visitHistory: [
      syntheticVisit('2026-06-12', { sbp: 148, dbp: 94, hr: 84, rr: 18, temp: 36.8, glucose: 130 }),
      syntheticVisit('2026-07-10', { sbp: 156, dbp: 98, hr: 90, rr: 20, temp: 37, glucose: 150 }),
      syntheticVisit('2026-08-14', { sbp: 150, dbp: 95, hr: 86, rr: 19, temp: 36.9, glucose: 138 }),
      syntheticVisit('2026-09-11', { sbp: 158, dbp: 100, hr: 92, rr: 20, temp: 37.1, glucose: 160 }),
    ],
  },
  printedAt: new Date(2026, 9, 3, 14, 20),
};

/** Enough medications to push Tatalaksana over a page. */
export const longVisitSummaryInput: VisitSummaryInput = {
  ...syntheticVisitSummaryInput,
  medications: Array.from({ length: 45 }, (_, index) => ({
    name: `Obat Sintetis ${index + 1}`,
    dose: '2x250mg',
    use: 'Sesudah makan',
    duration: '5 hari',
  })),
};
```

- [ ] **Step 2: Write the failing test** — `lib/report/visit-summary-model.test.ts`

```ts
import { describe, expect, it } from 'vitest';

import { buildVisitSummaryModel } from './visit-summary-model';
import { syntheticVisit, syntheticVisitSummaryInput as input } from './visit-summary.fixtures';

describe('buildVisitSummaryModel', () => {
  it('heads the summary with identity-free fields only', () => {
    expect(buildVisitSummaryModel(input).head).toEqual({
      rm: 'RM-00-12-34',
      age: '54 th',
      sex: 'Perempuan',
      facility: 'Puskesmas Sintetis',
      printedAt: '03-10-2026 14:20',
      date: '2026-10-03',
    });
  });

  it('never carries the history’s clinicians or therapy text', () => {
    const text = JSON.stringify(buildVisitSummaryModel(input));
    expect(text).not.toContain('Rahasia');
  });

  it('writes the vitals with units, a missing one as -, SpO2 from the context', () => {
    const model = buildVisitSummaryModel({ ...input, vitals: { ...input.vitals, glucose: 0 } });
    expect(model.vitals).toEqual([
      { label: 'TD', value: '152/96 mmHg' },
      { label: 'Nadi', value: '88 x/mnt' },
      { label: 'Napas', value: '20 x/mnt' },
      { label: 'Suhu', value: '37,2 °C' },
      { label: 'SpO2', value: '98 %' },
      { label: 'GDS', value: '-' },
    ]);
  });

  it('keeps the triage only past standby', () => {
    expect(buildVisitSummaryModel(input).triage).toEqual({ zone: 'kuning', headline: 'Hipertensi derajat 2' });
    const standby = { ...input.context!, triage: { zone: 'standby' as const, headline: null } };
    expect(buildVisitSummaryModel({ ...input, context: standby }).triage).toBeNull();
  });

  it('names the pregnancy status for women only', () => {
    expect(buildVisitSummaryModel(input).pregnancy).toBe('Tidak hamil');
    expect(buildVisitSummaryModel({ ...input, pregnant: null }).pregnancy).toBe('Belum dikonfirmasi');
    expect(buildVisitSummaryModel({ ...input, gender: 'L' }).pregnancy).toBeNull();
  });

  it('marks the first diagnosis PRIMER and the others SEKUNDER', () => {
    expect(buildVisitSummaryModel(input).diagnoses.map((d) => d.role)).toEqual(['PRIMER', 'SEKUNDER']);
  });

  it('flags emergency and high alerts as urgent and drops a repeated alert', () => {
    const repeated = [...input.alerts, input.alerts[0]];
    expect(buildVisitSummaryModel({ ...input, alerts: repeated }).alerts.map((a) => a.urgent)).toEqual([true, false]);
  });

  it('trends the past visits then this one, with the normal limits', () => {
    const trend = buildVisitSummaryModel(input).trend;
    expect(trend?.dates).toEqual(['12-06', '10-07', '14-08', '11-09', '03-10']);
    expect(trend?.rows.map((row) => row.label)).toEqual(['Tensi', 'Nadi', 'Napas', 'Suhu']);
    expect(trend?.rows[0].lines[0]).toEqual({ values: [148, 156, 150, 158, 152], range: { min: 90, max: 139 } });
    expect(trend?.rows[0].last).toBe('152/96 mmHg');
  });

  it('keeps the last 8 visits and leaves a gap where a visit lacks a vital', () => {
    // Ten monthly visits in 2025; the latest past one has no pulse.
    const history = Array.from({ length: 10 }, (_, i) =>
      syntheticVisit(`2025-${String(i + 1).padStart(2, '0')}-15`, {
        sbp: 140,
        dbp: 90,
        hr: i === 9 ? 0 : 80,
        rr: 18,
        temp: 36.8,
        glucose: 120,
      })
    );
    const trend = buildVisitSummaryModel({ ...input, context: { ...input.context!, visitHistory: history } }).trend;
    expect(trend?.dates).toHaveLength(8);
    expect(trend?.dates[0]).toBe('15-04');
    expect(trend?.rows[1].lines[0].values).toEqual([80, 80, 80, 80, 80, 80, null, 88]);
  });

  it('skips visits without a readable date', () => {
    const bad = { ...syntheticVisit('2026-05-01', input.vitals), timestamp: 'bukan tanggal' };
    const trend = buildVisitSummaryModel({
      ...input,
      context: { ...input.context!, visitHistory: [bad, ...input.context!.visitHistory] },
    }).trend;
    expect(trend?.dates).toHaveLength(5);
    expect(JSON.stringify(trend)).not.toContain('NaN');
  });

  it('has no trend with fewer than two visits', () => {
    expect(buildVisitSummaryModel({ ...input, context: { ...input.context!, visitHistory: [] } }).trend).toBeNull();
    expect(buildVisitSummaryModel({ ...input, context: undefined }).trend).toBeNull();
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `node scripts/pnpm.mjs exec vitest run lib/report/visit-summary-model.test.ts`
Expected: FAIL, `Failed to resolve import "./visit-summary-model"`.

- [ ] **Step 4: Implement** — `lib/report/visit-summary-model.ts`

```ts
import type { TriageZone } from '@/lib/emergency-detector/triage-verdict';
import { NORMAL_RANGES } from '@/lib/iskandar-diagnosis-engine/trajectory-analyzer';
import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

/** What the side panel adds beyond the Diagnosis page's own props (set in main.tsx). */
export interface VisitSummaryContext {
  facilityName: string;
  triage: { zone: TriageZone; headline: string | null };
  spo2: number | null;
  visitHistory: VisitRecord[];
}

type Vitals = VisitRecord['vitals'];

export interface VisitSummaryInput {
  rm: string;
  age: number;
  gender: 'L' | 'P';
  keluhanUtama: string;
  keluhanTambahan: string;
  allergies: string[];
  pregnant: boolean | null;
  vitals: Vitals;
  /** Chosen diagnoses, the primary first. */
  diagnoses: Array<{ icd: string; name: string }>;
  /** The medications going to the resep, the dose already in Chief's notation ("1x10mg"). */
  medications: Array<{ name: string; dose: string; use: string; duration: string }>;
  alerts: Array<{ severity: string; title: string; message: string }>;
  context: VisitSummaryContext | undefined;
  printedAt: Date;
}

export interface TrendRow {
  label: string;
  /** One line per measure (Tensi draws sistolik and diastolik); null where a visit lacks it. */
  lines: Array<{ values: Array<number | null>; range: { min: number; max: number } }>;
  last: string;
}

export interface VisitSummaryModel {
  head: { rm: string; age: string; sex: string; facility: string; printedAt: string; date: string };
  complaint: { main: string; extra: string };
  vitals: Array<{ label: string; value: string }>;
  triage: { zone: TriageZone; headline: string | null } | null;
  allergies: string;
  pregnancy: string | null;
  diagnoses: Array<{ icd: string; name: string; role: 'PRIMER' | 'SEKUNDER' }>;
  medications: VisitSummaryInput['medications'];
  alerts: Array<{ title: string; message: string; urgent: boolean }>;
  /** Null with fewer than two visits. */
  trend: { dates: string[]; rows: TrendRow[] } | null;
}

const MAX_TREND_VISITS = 8;

const pad = (n: number): string => String(n).padStart(2, '0');
const present = (n: number | null | undefined): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n > 0;
const shown = (n: number | null | undefined, unit: string): string =>
  present(n) ? `${String(n).replace('.', ',')} ${unit}` : '-';
const pressure = (vitals: Vitals): string =>
  present(vitals.sbp) && present(vitals.dbp) ? `${vitals.sbp}/${vitals.dbp} mmHg` : '-';

export function buildVisitSummaryModel(input: VisitSummaryInput): VisitSummaryModel {
  const { vitals, context, printedAt } = input;
  const day = `${pad(printedAt.getDate())}-${pad(printedAt.getMonth() + 1)}-${printedAt.getFullYear()}`;
  const seenAlerts = new Set<string>();
  return {
    head: {
      rm: input.rm,
      age: `${input.age} th`,
      sex: input.gender === 'L' ? 'Laki-laki' : 'Perempuan',
      facility: context?.facilityName ?? '',
      printedAt: `${day} ${pad(printedAt.getHours())}:${pad(printedAt.getMinutes())}`,
      date: `${printedAt.getFullYear()}-${pad(printedAt.getMonth() + 1)}-${pad(printedAt.getDate())}`,
    },
    complaint: { main: input.keluhanUtama, extra: input.keluhanTambahan },
    vitals: [
      { label: 'TD', value: pressure(vitals) },
      { label: 'Nadi', value: shown(vitals.hr, 'x/mnt') },
      { label: 'Napas', value: shown(vitals.rr, 'x/mnt') },
      { label: 'Suhu', value: shown(vitals.temp, '°C') },
      { label: 'SpO2', value: shown(context?.spo2, '%') },
      { label: 'GDS', value: shown(vitals.glucose, 'mg/dL') },
    ],
    triage: context && context.triage.zone !== 'standby' ? context.triage : null,
    allergies: input.allergies.length > 0 ? input.allergies.join(', ') : 'Tidak ada alergi tercatat',
    pregnancy:
      input.gender === 'L'
        ? null
        : input.pregnant === null
          ? 'Belum dikonfirmasi'
          : input.pregnant
            ? 'Hamil'
            : 'Tidak hamil',
    diagnoses: input.diagnoses.map(
      (diagnosis, index): VisitSummaryModel['diagnoses'][number] => ({
        ...diagnosis,
        role: index === 0 ? 'PRIMER' : 'SEKUNDER',
      })
    ),
    medications: input.medications,
    alerts: input.alerts
      .filter((alert) => {
        const key = `${alert.title}|${alert.message}`;
        if (seenAlerts.has(key)) return false;
        seenAlerts.add(key);
        return true;
      })
      .map((alert) => ({
        title: alert.title,
        message: alert.message,
        urgent: alert.severity === 'emergency' || alert.severity === 'high',
      })),
    trend: buildTrend(context?.visitHistory ?? [], vitals, printedAt),
  };
}

function buildTrend(history: VisitRecord[], current: Vitals, printedAt: Date): VisitSummaryModel['trend'] {
  const visits = history
    .filter((visit) => !Number.isNaN(Date.parse(visit.timestamp)))
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .map((visit) => ({ at: new Date(visit.timestamp), vitals: visit.vitals }))
    .concat({ at: printedAt, vitals: current })
    .slice(-MAX_TREND_VISITS);
  if (visits.length < 2) return null;

  const series = (key: keyof Vitals): Array<number | null> =>
    visits.map((visit) => (present(visit.vitals[key]) ? visit.vitals[key] : null));
  const line = (key: keyof typeof NORMAL_RANGES): TrendRow['lines'][number] => ({
    values: series(key),
    range: { min: NORMAL_RANGES[key].min, max: NORMAL_RANGES[key].max },
  });

  return {
    dates: visits.map((visit) => `${pad(visit.at.getDate())}-${pad(visit.at.getMonth() + 1)}`),
    rows: [
      { label: 'Tensi', lines: [line('sbp'), line('dbp')], last: pressure(current) },
      { label: 'Nadi', lines: [line('hr')], last: shown(current.hr, 'x/mnt') },
      { label: 'Napas', lines: [line('rr')], last: shown(current.rr, 'x/mnt') },
      { label: 'Suhu', lines: [line('temp')], last: shown(current.temp, '°C') },
    ],
  };
}
```

- [ ] **Step 5: Run it to see it pass**

Run: `node scripts/pnpm.mjs exec vitest run lib/report/visit-summary-model.test.ts`
Expected: PASS, 11 tests.

### Task 3: the Swiss grid layout

**Files:**
- Create: `lib/report/visit-summary-layout.ts`
- Create: `lib/report/visit-summary-pdf.ts` (only `embedHelvetica` in this task; the renderer in Task 4)
- Test: `lib/report/visit-summary-layout.test.ts`

**Interfaces:**
- Consumes: `VisitSummaryModel`, `TrendRow` (Task 2); `toWinAnsi` (Task 1).
- Produces: `PAGE`, `MARGIN`, `BASELINE`, `SIZE`, `CONTENT_BOTTOM`, `FOOTER_Y`, `columnX(n)`, `columnRight(n)`, types `FontWeight`, `Tone`, `Measure`, `DrawOp`, `VisitSummaryLayout`, `layoutVisitSummary(model, measure): VisitSummaryLayout`; `embedHelvetica(doc: PDFDocument): Promise<{ fonts: Record<FontWeight, PDFFont>; measure: Measure }>`.

- [ ] **Step 1: Write the failing test** — `lib/report/visit-summary-layout.test.ts`

```ts
// @vitest-environment node
import { PDFDocument, type PDFFont } from 'pdf-lib';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  BASELINE,
  CONTENT_BOTTOM,
  FOOTER_Y,
  MARGIN,
  columnRight,
  columnX,
  layoutVisitSummary,
  type DrawOp,
  type FontWeight,
  type Measure,
} from './visit-summary-layout';
import { buildVisitSummaryModel } from './visit-summary-model';
import { embedHelvetica } from './visit-summary-pdf';
import { longVisitSummaryInput, syntheticVisitSummaryInput } from './visit-summary.fixtures';

type TextOp = Extract<DrawOp, { kind: 'text' }>;

let measure: Measure;
let fonts: Record<FontWeight, PDFFont>;
beforeAll(async () => {
  ({ measure, fonts } = await embedHelvetica(await PDFDocument.create()));
});

const texts = (ops: DrawOp[]): TextOp[] => ops.filter((op): op is TextOp => op.kind === 'text');
const lefts = Array.from({ length: 12 }, (_, i) => columnX(i + 1));
const rights = Array.from({ length: 12 }, (_, i) => columnRight(i + 1));
const layout = (input = syntheticVisitSummaryInput) => layoutVisitSummary(buildVisitSummaryModel(input), measure);

describe('layoutVisitSummary', () => {
  it('sets every text on a column edge and on the 12 pt baseline grid', () => {
    for (const op of layout().pages.flatMap(texts)) {
      expect(op.align === 'left' ? lefts : rights).toContain(op.x);
      expect((op.y - MARGIN.top) % BASELINE).toBe(0);
    }
  });

  it('keeps columns 1-3 for labels and orders the sections', () => {
    const page = layout().pages[0];
    const labels = texts(page).filter((op) => op.x < columnX(4)).map((op) => op.text);
    expect(labels).toEqual([
      'KELUHAN',
      'TTV / TRIASE',
      'ALERGI',
      'DIAGNOSIS',
      'TATALAKSANA',
      'TREN TTV',
      'Tensi',
      'Nadi',
      'Napas',
      'Suhu',
    ]);
  });

  it('draws the logo once, at column 1 of page 1', () => {
    const logos = layout(longVisitSummaryInput).pages.map((ops) => ops.filter((op) => op.kind === 'logo'));
    expect(logos[0]).toEqual([expect.objectContaining({ x: columnX(1), size: 28 })]);
    expect(logos.slice(1).flat()).toEqual([]);
  });

  it('continues Tatalaksana on the next page by medication rows and numbers the pages', () => {
    const { pages } = layout(longVisitSummaryInput);
    expect(pages).toHaveLength(2);
    const footers = pages.map((ops) => texts(ops).find((op) => op.text.startsWith('Halaman'))?.text);
    expect(footers).toEqual(['Halaman 1/2', 'Halaman 2/2']);
    for (const ops of pages) {
      expect(texts(ops).some((op) => op.text === 'TATALAKSANA')).toBe(true);
      for (const op of texts(ops).filter((t) => t.y !== FOOTER_Y)) expect(op.y).toBeLessThanOrEqual(CONTENT_BOTTOM);
    }
    const names = pages.flatMap(texts).map((op) => op.text).filter((text) => text.startsWith('Obat Sintetis'));
    expect(names).toHaveLength(45);
    expect(new Set(names).size).toBe(45);
  });

  it('breaks a word wider than its columns inside them', () => {
    const word = 'Natriumdiklofenakkaliumhidroklorida'.repeat(3);
    const ops = layout({ ...syntheticVisitSummaryInput, keluhanUtama: word }).pages[0];
    const complaint = texts(ops).filter((op) => op.x === columnX(4) && op.text.length > 3 && word.includes(op.text));
    expect(complaint.length).toBeGreaterThan(1);
    for (const op of complaint) expect(op.x + measure(op.text, op.weight, op.size)).toBeLessThanOrEqual(columnRight(12));
  });

  it('writes one line instead of a trend with fewer than two visits', () => {
    const input = { ...syntheticVisitSummaryInput, context: undefined };
    const all = layout(input).pages.flatMap(texts).map((op) => op.text);
    expect(all).toContain('Riwayat kunjungan belum cukup untuk tren');
    expect(all).not.toContain('Tensi');
  });

  it('draws only text the standard Helvetica can encode, without a ?', () => {
    for (const op of layout().pages.flatMap(texts)) {
      expect(op.text).not.toContain('?');
      expect(() => fonts[op.weight].encodeText(op.text)).not.toThrow();
    }
  });

  it('never prints a name from the visit history', () => {
    expect(layout().pages.flatMap(texts).map((op) => op.text).join(' ')).not.toContain('Rahasia');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node scripts/pnpm.mjs exec vitest run lib/report/visit-summary-layout.test.ts`
Expected: FAIL, `Failed to resolve import "./visit-summary-layout"`.

- [ ] **Step 3: Implement the font helper** — `lib/report/visit-summary-pdf.ts`

```ts
import { PDFDocument, StandardFonts, type PDFFont } from 'pdf-lib';

import type { FontWeight, Measure } from './visit-summary-layout';

/** The two standard Helvetica weights, and widths measured with them. */
export async function embedHelvetica(
  doc: PDFDocument
): Promise<{ fonts: Record<FontWeight, PDFFont>; measure: Measure }> {
  const fonts: Record<FontWeight, PDFFont> = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  return { fonts, measure: (text, weight, size) => fonts[weight].widthOfTextAtSize(text, size) };
}
```

- [ ] **Step 4: Implement the layout** — `lib/report/visit-summary-layout.ts`

```ts
import type { TrendRow, VisitSummaryModel } from './visit-summary-model';
import { toWinAnsi } from './winansi';

// Swiss grid (spec 2026-10-03): A4, 12 columns, 12 pt gutter, 12 pt baselines from the top margin.
// Every y is measured from the page top: a text's y is its baseline, a rect's or the logo's its top.
export const PAGE = { width: 595.28, height: 841.89 } as const;
export const MARGIN = { top: 48, right: 40, bottom: 56, left: 40 } as const;
export const COLUMNS = 12;
export const GUTTER = 12;
export const BASELINE = 12;
export const COLUMN_WIDTH =
  (PAGE.width - MARGIN.left - MARGIN.right - GUTTER * (COLUMNS - 1)) / COLUMNS;
export const SIZE = { title: 24, body: 9, label: 7 } as const;
export const LOGO_SIZE = 28;
/** The lowest baseline content may use, and the footer's baseline. */
export const CONTENT_BOTTOM = MARGIN.top + BASELINE * 61;
export const FOOTER_Y = MARGIN.top + BASELINE * 64;
const HELVETICA_CAP_HEIGHT = 0.718;
const FIRST_PAGE_TITLE = MARGIN.top + BASELINE * 2;
const LATER_PAGE_TOP = MARGIN.top + BASELINE * 3;
const CHART_HEIGHT = 24;

export type FontWeight = 'regular' | 'bold';
export type Tone = 'ink' | 'muted' | 'accent' | 'band';
export type Measure = (text: string, weight: FontWeight, size: number) => number;

export type DrawOp =
  | {
      kind: 'text';
      x: number;
      y: number;
      text: string;
      weight: FontWeight;
      size: number;
      tone: Tone;
      align: 'left' | 'right';
    }
  | { kind: 'rule'; x1: number; x2: number; y: number }
  | { kind: 'rect'; x: number; y: number; width: number; height: number; tone: Tone }
  | { kind: 'polyline'; points: Array<[number, number]>; tone: Tone }
  | { kind: 'logo'; x: number; y: number; size: number };

export interface VisitSummaryLayout {
  pages: DrawOp[][];
}

/** Left edge of column n (1-based). */
export function columnX(n: number): number {
  return MARGIN.left + (n - 1) * (COLUMN_WIDTH + GUTTER);
}

/** Right edge of column n (1-based). */
export function columnRight(n: number): number {
  return columnX(n) + COLUMN_WIDTH;
}

const spanWidth = (from: number, to: number): number => columnRight(to) - columnX(from);

/** A unit that never splits across pages; its first baseline is one BASELINE below `top`. */
interface Row {
  lines: number;
  draw: (top: number) => DrawOp[];
}

interface Section {
  label: string;
  rows: Row[];
  /** Only Tatalaksana may continue on the next page, between its rows. */
  splits: boolean;
}

type TextStyle = { weight?: FontWeight; size?: number; tone?: Tone; align?: 'left' | 'right' };

function text(x: number, y: number, value: string, style: TextStyle = {}): DrawOp {
  return {
    kind: 'text',
    x,
    y,
    text: toWinAnsi(value),
    weight: style.weight ?? 'regular',
    size: style.size ?? SIZE.body,
    tone: style.tone ?? 'ink',
    align: style.align ?? 'left',
  };
}

function breakWord(word: string, width: number, weight: FontWeight, size: number, measure: Measure): string[] {
  const parts: string[] = [];
  let part = '';
  for (const char of Array.from(word)) {
    if (part && measure(part + char, weight, size) > width) {
      parts.push(part);
      part = char;
    } else {
      part += char;
    }
  }
  return part ? [...parts, part] : parts;
}

function wrap(value: string, width: number, measure: Measure, weight: FontWeight = 'regular', size: number = SIZE.body): string[] {
  const words = toWinAnsi(value)
    .split(' ')
    .filter(Boolean)
    .flatMap((word) => (measure(word, weight, size) > width ? breakWord(word, width, weight, size, measure) : [word]));
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next, weight, size) > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  return line ? [...lines, line] : lines.length > 0 ? lines : [''];
}

/** Wrapped text in columns from..to, one baseline per line. */
function paragraph(value: string, measure: Measure, style: TextStyle = {}, from = 4, to = 12): Row {
  const lines = wrap(value, spanWidth(from, to), measure, style.weight, style.size);
  return {
    lines: lines.length,
    draw: (top) => lines.map((line, i) => text(columnX(from), top + BASELINE * (i + 1), line, style)),
  };
}

/** Cells laid side by side, each wrapped in its own columns; the row is as tall as its tallest cell. */
function cells(measure: Measure, items: Array<{ value: string; from: number; to: number; style?: TextStyle }>): Row {
  const wrapped = items.map((item) => ({
    ...item,
    lines: wrap(item.value, spanWidth(item.from, item.to), measure, item.style?.weight, item.style?.size),
  }));
  return {
    lines: Math.max(...wrapped.map((item) => item.lines.length)),
    draw: (top) =>
      wrapped.flatMap((item) =>
        item.lines.map((line, i) => text(columnX(item.from), top + BASELINE * (i + 1), line, item.style))
      ),
  };
}

function vitalsRow(items: VisitSummaryModel['vitals']): Row {
  return {
    lines: 3,
    draw: (top) =>
      items.flatMap((item, i) => {
        const x = columnX(4 + i * 3);
        return [
          text(x, top + BASELINE, item.label.toUpperCase(), { weight: 'bold', size: SIZE.label, tone: 'muted' }),
          text(x, top + BASELINE * 2, item.value),
        ];
      }),
  };
}

function trendRow(row: TrendRow, count: number): Row {
  return {
    lines: 3,
    draw: (top) => {
      const chartTop = top + 3;
      const chartBottom = chartTop + CHART_HEIGHT;
      const values = row.lines.flatMap((line) => line.values.filter((v): v is number => v !== null));
      const bounds = row.lines.flatMap((line) => [line.range.min, line.range.max]);
      const low = Math.min(...values, ...bounds);
      const high = Math.max(...values, ...bounds);
      const span = high - low || 1;
      const y = (v: number) => chartBottom - ((v - low) / span) * CHART_HEIGHT;
      const x = (i: number) => columnX(4) + (spanWidth(4, 9) * i) / Math.max(count - 1, 1);
      const ops: DrawOp[] = [text(columnX(1), top + BASELINE, row.label)];
      for (const line of row.lines) {
        ops.push({
          kind: 'rect',
          x: columnX(4),
          y: y(line.range.max),
          width: spanWidth(4, 9),
          height: y(line.range.min) - y(line.range.max),
          tone: 'band',
        });
      }
      for (const line of row.lines) {
        let run: Array<[number, number]> = [];
        line.values.forEach((value, i) => {
          if (value === null) {
            if (run.length > 1) ops.push({ kind: 'polyline', points: run, tone: 'ink' });
            run = [];
            return;
          }
          const point: [number, number] = [x(i), y(value)];
          run.push(point);
          ops.push({ kind: 'rect', x: point[0] - 1, y: point[1] - 1, width: 2, height: 2, tone: 'ink' });
        });
        if (run.length > 1) ops.push({ kind: 'polyline', points: run, tone: 'ink' });
      }
      ops.push(text(columnRight(12), top + BASELINE, row.last, { align: 'right' }));
      return ops;
    },
  };
}

function sections(model: VisitSummaryModel, measure: Measure): Section[] {
  const complaint = [paragraph(model.complaint.main || '-', measure)];
  if (model.complaint.extra) complaint.push(paragraph(`Tambahan: ${model.complaint.extra}`, measure));

  const vitals = [vitalsRow(model.vitals.slice(0, 3)), vitalsRow(model.vitals.slice(3))];
  if (model.triage) {
    vitals.push(
      cells(measure, [
        {
          value: model.triage.zone.toUpperCase(),
          from: 4,
          to: 5,
          style: { weight: 'bold', tone: model.triage.zone === 'merah' ? 'accent' : 'ink' },
        },
        { value: model.triage.headline ?? '', from: 6, to: 12 },
      ])
    );
  }

  const allergy = [paragraph(model.allergies, measure)];
  if (model.pregnancy) allergy.push(paragraph(`Status hamil: ${model.pregnancy}`, measure));

  const diagnoses =
    model.diagnoses.length > 0
      ? model.diagnoses.map((diagnosis) =>
          cells(measure, [
            { value: diagnosis.icd, from: 4, to: 5, style: { weight: 'bold' } },
            { value: diagnosis.name, from: 6, to: 10 },
            { value: diagnosis.role, from: 11, to: 12, style: { size: SIZE.label, tone: 'muted' } },
          ])
        )
      : [paragraph('Belum ada diagnosis terpilih', measure)];

  const therapy =
    model.medications.length > 0
      ? model.medications.map((medication) =>
          cells(measure, [
            { value: medication.name, from: 4, to: 6, style: { weight: 'bold' } },
            { value: medication.dose, from: 7, to: 8 },
            { value: medication.use, from: 9, to: 10 },
            { value: medication.duration, from: 11, to: 12 },
          ])
        )
      : [paragraph('Belum ada obat terpilih untuk resep', measure)];
  for (const alert of model.alerts) {
    const title = paragraph(alert.title, measure, { weight: 'bold', tone: alert.urgent ? 'accent' : 'ink' });
    const message = paragraph(alert.message, measure);
    therapy.push({
      lines: title.lines + message.lines,
      draw: (top) => [...title.draw(top), ...message.draw(top + BASELINE * title.lines)],
    });
  }

  const trend = model.trend;
  const trendRows: Row[] = trend
    ? [
        {
          lines: 1,
          draw: (top) => [
            text(columnX(4), top + BASELINE, trend.dates[0], { size: SIZE.label, tone: 'muted' }),
            text(columnRight(9), top + BASELINE, trend.dates[trend.dates.length - 1], {
              size: SIZE.label,
              tone: 'muted',
              align: 'right',
            }),
          ],
        },
        ...trend.rows.map((row) => trendRow(row, trend.dates.length)),
      ]
    : [paragraph('Riwayat kunjungan belum cukup untuk tren', measure)];

  return [
    { label: 'KELUHAN', rows: complaint, splits: false },
    { label: 'TTV / TRIASE', rows: vitals, splits: false },
    { label: 'ALERGI', rows: allergy, splits: false },
    { label: 'DIAGNOSIS', rows: diagnoses, splits: false },
    { label: 'TATALAKSANA', rows: therapy, splits: true },
    { label: 'TREN TTV', rows: trendRows, splits: false },
  ];
}

function sectionHead(label: string, top: number): DrawOp[] {
  return [
    { kind: 'rule', x1: columnX(1), x2: columnRight(12), y: top },
    text(columnX(1), top + BASELINE, label, { weight: 'bold', size: SIZE.label }),
  ];
}

const fits = (top: number, lines: number): boolean => top + BASELINE * lines <= CONTENT_BOTTOM;

export function layoutVisitSummary(model: VisitSummaryModel, measure: Measure): VisitSummaryLayout {
  const meta = wrap(
    [`RM ${model.head.rm}`, model.head.age, model.head.sex, model.head.facility, model.head.printedAt]
      .filter(Boolean)
      .join(' · '),
    spanWidth(4, 12),
    measure
  );
  const first: DrawOp[] = [
    {
      kind: 'logo',
      x: columnX(1),
      y: FIRST_PAGE_TITLE - SIZE.title * HELVETICA_CAP_HEIGHT,
      size: LOGO_SIZE,
    },
    text(columnX(4), FIRST_PAGE_TITLE, 'Ringkasan Kunjungan', { weight: 'bold', size: SIZE.title }),
    ...meta.map((line, i) => text(columnX(4), FIRST_PAGE_TITLE + BASELINE * (2 + i), line)),
  ];
  const pages: DrawOp[][] = [first];
  let pageTop = FIRST_PAGE_TITLE + BASELINE * (meta.length + 3);
  let top = pageTop;

  const openPage = (): number => {
    pages.push([
      text(columnX(4), MARGIN.top + BASELINE, `Ringkasan Kunjungan · RM ${model.head.rm}`, {
        size: SIZE.label,
        tone: 'muted',
      }),
    ]);
    pageTop = LATER_PAGE_TOP;
    return pageTop;
  };
  const current = (): DrawOp[] => pages[pages.length - 1];

  for (const section of sections(model, measure)) {
    const total = section.rows.reduce((sum, row) => sum + row.lines, 0);
    const needed = section.splits ? section.rows[0].lines : total;
    if (!fits(top, needed) && top > pageTop) top = openPage();
    let cursor = top;
    let headTop = cursor;
    current().push(...sectionHead(section.label, cursor));
    for (const row of section.rows) {
      if (!fits(cursor, row.lines) && cursor > headTop) {
        cursor = openPage();
        headTop = cursor;
        current().push(...sectionHead(section.label, cursor));
      }
      current().push(...row.draw(cursor));
      cursor += BASELINE * row.lines;
    }
    top = cursor + BASELINE * 2;
  }

  pages.forEach((ops, i) => {
    ops.push(
      text(columnX(4), FOOTER_Y, `Sentra Med Assist · RM ${model.head.rm} · dicetak ${model.head.printedAt}`, {
        size: SIZE.label,
        tone: 'muted',
      }),
      text(columnRight(12), FOOTER_Y, `Halaman ${i + 1}/${pages.length}`, {
        size: SIZE.label,
        tone: 'muted',
        align: 'right',
      })
    );
  });
  return { pages };
}
```

- [ ] **Step 5: Run it to see it pass**

Run: `node scripts/pnpm.mjs exec vitest run lib/report/visit-summary-layout.test.ts`
Expected: PASS, 8 tests. If `toHaveLength(2)` fails because 45 rows land on a different page count, print `pages.length` and the Tatalaksana baselines; adjust the fixture count (not the assertion's meaning: "continues on a second page") and say so in the commit body.

### Task 4: the pdf-lib renderer and the logo

**Files:**
- Create: `public/brand/sentra-logomark-black.png` (copy of `D:\DEV\monorepo\docs\brand\01-logo-master\sentra-logomark-master-black-512.png`)
- Modify: `lib/report/visit-summary-pdf.ts`
- Test: `lib/report/visit-summary-pdf.test.ts`

**Interfaces:**
- Consumes: `layoutVisitSummary`, `PAGE`, `DrawOp`, `Tone` (Task 3); `VisitSummaryModel` (Task 2).
- Produces: `renderVisitSummaryPdf(model: VisitSummaryModel, logoPng: Uint8Array): Promise<Uint8Array<ArrayBuffer>>`.

- [ ] **Step 1: Copy the logo**

Run: `mkdir -p public/brand && cp /d/DEV/monorepo/docs/brand/01-logo-master/sentra-logomark-master-black-512.png public/brand/sentra-logomark-black.png`
Expected: `file public/brand/sentra-logomark-black.png` → `PNG image data, 512 x 512`.

- [ ] **Step 2: Write the failing test** — `lib/report/visit-summary-pdf.test.ts`

```ts
// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { PDFDict, PDFDocument, PDFName, type PDFPage } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { buildVisitSummaryModel } from './visit-summary-model';
import { renderVisitSummaryPdf } from './visit-summary-pdf';
import { longVisitSummaryInput, syntheticVisitSummaryInput } from './visit-summary.fixtures';

const logo = new Uint8Array(
  readFileSync(fileURLToPath(new URL('../../public/brand/sentra-logomark-black.png', import.meta.url)))
);
const images = (page: PDFPage): number =>
  page.node.Resources()?.lookupMaybe(PDFName.of('XObject'), PDFDict)?.keys().length ?? 0;

describe('renderVisitSummaryPdf', () => {
  it('writes an A4 PDF titled for the visit, with the logo on page 1', async () => {
    const doc = await PDFDocument.load(
      await renderVisitSummaryPdf(buildVisitSummaryModel(syntheticVisitSummaryInput), logo)
    );
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getPage(0).getSize()).toEqual({ width: 595.28, height: 841.89 });
    expect(doc.getTitle()).toBe('Ringkasan Kunjungan');
    expect(doc.getCreator()).toBe('Sentra Med Assist');
    expect(doc.getAuthor()).toBeUndefined();
    expect(images(doc.getPage(0))).toBe(1);
  });

  it('keeps the logo off the later pages', async () => {
    const doc = await PDFDocument.load(
      await renderVisitSummaryPdf(buildVisitSummaryModel(longVisitSummaryInput), logo)
    );
    expect(doc.getPageCount()).toBe(2);
    expect(images(doc.getPage(1))).toBe(0);
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `node scripts/pnpm.mjs exec vitest run lib/report/visit-summary-pdf.test.ts`
Expected: FAIL, `renderVisitSummaryPdf is not a function` (or not exported).

- [ ] **Step 4: Implement** — replace `lib/report/visit-summary-pdf.ts` with

```ts
import { PDFDocument, StandardFonts, rgb, type PDFFont, type RGB } from 'pdf-lib';

import { PAGE, layoutVisitSummary, type FontWeight, type Measure, type Tone } from './visit-summary-layout';
import type { VisitSummaryModel } from './visit-summary-model';

// Black on white, 55 % grey for captions, one red accent (triage merah, urgent CDSS alerts).
const TONES: Record<Tone, RGB> = {
  ink: rgb(0, 0, 0),
  muted: rgb(0.45, 0.45, 0.45),
  accent: rgb(0.85, 0.11, 0.11),
  band: rgb(0.92, 0.92, 0.92),
};
const HAIRLINE = 0.5;
const TREND_LINE = 0.75;

/** The two standard Helvetica weights, and widths measured with them. */
export async function embedHelvetica(
  doc: PDFDocument
): Promise<{ fonts: Record<FontWeight, PDFFont>; measure: Measure }> {
  const fonts: Record<FontWeight, PDFFont> = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  return { fonts, measure: (text, weight, size) => fonts[weight].widthOfTextAtSize(text, size) };
}

export async function renderVisitSummaryPdf(
  model: VisitSummaryModel,
  logoPng: Uint8Array
): Promise<Uint8Array<ArrayBuffer>> {
  const doc = await PDFDocument.create();
  doc.setTitle('Ringkasan Kunjungan');
  doc.setCreator('Sentra Med Assist');
  doc.setProducer('Sentra Med Assist');
  const { fonts, measure } = await embedHelvetica(doc);
  const logo = await doc.embedPng(logoPng);
  const fromBottom = (top: number): number => PAGE.height - top;

  for (const ops of layoutVisitSummary(model, measure).pages) {
    const page = doc.addPage([PAGE.width, PAGE.height]);
    for (const op of ops) {
      switch (op.kind) {
        case 'text': {
          const font = fonts[op.weight];
          const x = op.align === 'right' ? op.x - font.widthOfTextAtSize(op.text, op.size) : op.x;
          page.drawText(op.text, { x, y: fromBottom(op.y), size: op.size, font, color: TONES[op.tone] });
          break;
        }
        case 'rule':
          page.drawLine({
            start: { x: op.x1, y: fromBottom(op.y) },
            end: { x: op.x2, y: fromBottom(op.y) },
            thickness: HAIRLINE,
            color: TONES.ink,
          });
          break;
        case 'rect':
          page.drawRectangle({
            x: op.x,
            y: fromBottom(op.y + op.height),
            width: op.width,
            height: op.height,
            color: TONES[op.tone],
          });
          break;
        case 'polyline':
          op.points.slice(1).forEach(([x, y], i) => {
            const [fromX, fromY] = op.points[i];
            page.drawLine({
              start: { x: fromX, y: fromBottom(fromY) },
              end: { x, y: fromBottom(y) },
              thickness: TREND_LINE,
              color: TONES[op.tone],
            });
          });
          break;
        case 'logo':
          page.drawImage(logo, { x: op.x, y: fromBottom(op.y + op.size), width: op.size, height: op.size });
          break;
      }
    }
  }
  return new Uint8Array(await doc.save());
}
```

- [ ] **Step 5: Run Task 3 and Task 4 tests to see them pass**

Run: `node scripts/pnpm.mjs exec vitest run lib/report`
Expected: PASS, all `lib/report` tests (3 + 11 + 8 + 2).

### Task 5: download and the "Unduh PDF" button

**Files:**
- Create: `lib/report/download-visit-summary.ts`
- Test: `lib/report/download-visit-summary.test.ts`
- Modify: `components/clinical/diagnosis/diagnosisPageProps.ts` (two props after `onCancelTransfer`)
- Modify: `components/clinical/diagnosis/RMETransferPanel.tsx`
- Modify: `components/clinical/diagnosis/steps/RmeStep.tsx`
- Modify: `components/clinical/ClinicalDifferential.tsx` (prop, state, handler, two props to the page)
- Modify: `entrypoints/sidepanel/main.tsx` (one prop; protected, approved)
- Test: `components/clinical/diagnosis/RMETransferPanel.test.tsx` (factory gains the two props; two new tests)
- Test: `components/clinical/diagnosis/DiagnosisStepFlow.test.tsx` (factory gains the two props)
- Test: `components/clinical/ClinicalDifferential.rme-transfer.e2e.test.tsx` (one new test)

**Interfaces:**
- Consumes: `renderVisitSummaryPdf` (Task 4), `buildVisitSummaryModel`, `VisitSummaryContext` (Task 2).
- Produces: `LOGO_PATH = '/brand/sentra-logomark-black.png'`, `visitSummaryFileName(model): string`, `downloadVisitSummaryPdf(model): Promise<void>`; `DiagnosisPageProps.onDownloadPdf: () => void`, `DiagnosisPageProps.pdfError: string`; `ClinicalDifferentialProps.visitSummaryContext?: VisitSummaryContext`.

- [ ] **Step 1: Write the failing download test** — `lib/report/download-visit-summary.test.ts`

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import { downloadVisitSummaryPdf, visitSummaryFileName } from './download-visit-summary';
import { buildVisitSummaryModel } from './visit-summary-model';
import { syntheticVisitSummaryInput } from './visit-summary.fixtures';

const { renderMock } = vi.hoisted(() => ({ renderMock: vi.fn() }));
vi.mock('./visit-summary-pdf', () => ({ renderVisitSummaryPdf: renderMock }));

const model = buildVisitSummaryModel(syntheticVisitSummaryInput);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  renderMock.mockReset();
});

describe('downloadVisitSummaryPdf', () => {
  it('names the file after the RM and the day, without anything else from the patient', () => {
    expect(visitSummaryFileName(model)).toBe('ringkasan-kunjungan-RM-00-12-34-2026-10-03.pdf');
    expect(visitSummaryFileName({ ...model, head: { ...model.head, rm: ' 12/34 ' } })).toBe(
      'ringkasan-kunjungan-12-34-2026-10-03.pdf'
    );
  });

  it('saves the rendered PDF with the logo it fetched', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([1, 2, 3]))));
    renderMock.mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:pdf');
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const saved: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      saved.push(this.download);
    });

    await downloadVisitSummaryPdf(model);

    expect(renderMock).toHaveBeenCalledWith(model, new Uint8Array([1, 2, 3]));
    expect(saved).toEqual(['ringkasan-kunjungan-RM-00-12-34-2026-10-03.pdf']);
    expect(createObjectURL.mock.calls[0][0].type).toBe('application/pdf');
  });

  it('saves nothing when the logo cannot be read', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    await expect(downloadVisitSummaryPdf(model)).rejects.toThrow('/brand/sentra-logomark-black.png');
    expect(click).not.toHaveBeenCalled();
    expect(renderMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node scripts/pnpm.mjs exec vitest run lib/report/download-visit-summary.test.ts`
Expected: FAIL, `Failed to resolve import "./download-visit-summary"`.

- [ ] **Step 3: Implement** — `lib/report/download-visit-summary.ts`

```ts
import type { VisitSummaryModel } from './visit-summary-model';
import { renderVisitSummaryPdf } from './visit-summary-pdf';

/** The logomark under `public/`; the side panel and the harness both serve it from the root. */
export const LOGO_PATH = '/brand/sentra-logomark-black.png';

export function visitSummaryFileName(model: VisitSummaryModel): string {
  const rm = model.head.rm.trim().replace(/[^A-Za-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'tanpa-rm';
  return `ringkasan-kunjungan-${rm}-${model.head.date}.pdf`;
}

/** Renders the visit summary and saves it the way "Unduh CSV" saves the daily report. */
export async function downloadVisitSummaryPdf(model: VisitSummaryModel): Promise<void> {
  const response = await fetch(LOGO_PATH);
  if (!response.ok) throw new Error(`Logo ${LOGO_PATH}: ${response.status}`);
  const bytes = await renderVisitSummaryPdf(model, new Uint8Array(await response.arrayBuffer()));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = visitSummaryFileName(model);
  anchor.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `node scripts/pnpm.mjs exec vitest run lib/report/download-visit-summary.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Write the failing panel tests** — in `components/clinical/diagnosis/RMETransferPanel.test.tsx`, add `'onDownloadPdf' | 'pdfError'` to both `Pick<…>` unions of `makeProps`, add `onDownloadPdf: vi.fn(), pdfError: '',` to its returned object, add `onDownloadPdf={vi.fn()} pdfError=""` beside `onCancelTransfer={vi.fn()}` at the other `RMETransferPanel` render (line ~249), and add inside the main `describe`:

```tsx
  it('offers Unduh PDF once a diagnosis is chosen and calls it on click', () => {
    const onDownloadPdf = vi.fn();
    const { container: panel } = render(<RMETransferPanel {...makeProps({ onDownloadPdf })} />);
    fireEvent.click(within(panel).getByRole('button', { name: 'Unduh PDF' }));
    expect(onDownloadPdf).toHaveBeenCalledTimes(1);

    const { container: early } = render(
      <RMETransferPanel {...makeProps({}, makeViewModel({ diagnosisReady: false }))} />
    );
    expect(within(early).getByRole('button', { name: 'Unduh PDF' })).toBeDisabled();
  });

  it('says why the PDF could not be made and keeps the button usable', () => {
    const { container: panel } = render(
      <RMETransferPanel {...makeProps({ pdfError: 'PDF gagal dibuat. Coba lagi.' })} />
    );
    expect(within(panel).getByText('PDF gagal dibuat. Coba lagi.')).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Unduh PDF' })).toBeEnabled();
  });
```

In `components/clinical/diagnosis/DiagnosisStepFlow.test.tsx`, add `onDownloadPdf: vi.fn(),` and `pdfError: '',` after `onCancelTransfer: vi.fn(),` (line 176).

- [ ] **Step 6: Write the failing wiring test** — in `components/clinical/ClinicalDifferential.rme-transfer.e2e.test.tsx`

Add beside the other hoisted mocks:

```ts
const { downloadMock } = vi.hoisted(() => ({ downloadMock: vi.fn(async () => undefined) }));
vi.mock('@/lib/report/download-visit-summary', () => ({ downloadVisitSummaryPdf: downloadMock }));
```

Add to the `import` lines: `import { syntheticVisit } from '@/lib/report/visit-summary.fixtures';`

Add inside the `describe`:

```tsx
  it('saves the visit on screen as the PDF summary, without the history’s clinicians', async () => {
    render(
      <ClinicalDifferential
        keluhanUtama="Nyeri tenggorokan dan demam"
        patientAge={28}
        patientGender="L"
        patientRM="RM-J02"
        allergies={[]}
        confirmedPregnancyStatus={false}
        vitals={{ sbp: 118, dbp: 76, hr: 88, rr: 18, temp: 38, glucose: 0 }}
        hasVisitHistory
        visitSummaryContext={{
          facilityName: 'Puskesmas Sintetis',
          triage: { zone: 'hijau', headline: null },
          spo2: 98,
          visitHistory: [syntheticVisit('2026-09-01', { sbp: 120, dbp: 80, hr: 84, rr: 18, temp: 37, glucose: 0 })],
        }}
        onBack={() => undefined}
      />
    );

    const closestOrThrow = (element: HTMLElement, selector: string): Element => {
      const found = element.closest(selector);
      if (!found) throw new Error(`${selector} not found`);
      return found;
    };
    fireEvent.click(closestOrThrow(await screen.findByText('J02 - Faringitis akut'), '[data-testid="dx-flow-card"]'));
    fireEvent.click(await screen.findByRole('button', { name: 'Isi diagnosis ke RME' }));
    await screen.findByRole('heading', { name: 'Tatalaksana' });
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut tanpa terapi tambahan' }));
    fireEvent.click(screen.getByTestId('dx-tx-finish'));
    fireEvent.click(await screen.findByRole('button', { name: 'ubah Tatalaksana' }));
    fireEvent.click(closestOrThrow(await screen.findByText('Amoksisilin'), '[data-testid="dx-tx-visit-med"]'));
    await waitFor(() => expect(screen.getByTestId('dx-tx-finish')).toBeEnabled());
    fireEvent.click(screen.getByTestId('dx-tx-finish'));

    fireEvent.click(await screen.findByRole('button', { name: 'Unduh PDF' }));

    await waitFor(() => expect(downloadMock).toHaveBeenCalledTimes(1));
    const model = downloadMock.mock.calls[0][0];
    expect(model.head).toEqual(expect.objectContaining({ rm: 'RM-J02', facility: 'Puskesmas Sintetis' }));
    expect(model.diagnoses).toEqual([expect.objectContaining({ icd: 'J02', role: 'PRIMER' })]);
    expect(model.medications).toEqual([
      { name: 'Amoksisilin', dose: '3x500mg', use: 'sesudah makan', duration: '5 hari' },
    ]);
    expect(model.trend?.dates).toHaveLength(2);
    expect(JSON.stringify(model)).not.toContain('Rahasia');
  });
```

- [ ] **Step 7: Run them to see them fail**

Run: `node scripts/pnpm.mjs exec vitest run components/clinical/diagnosis/RMETransferPanel.test.tsx components/clinical/ClinicalDifferential.rme-transfer.e2e.test.tsx`
Expected: FAIL — `Unable to find an accessible element with the role "button" and name "Unduh PDF"` (and the type error on `visitSummaryContext` under typecheck).

- [ ] **Step 8: Implement the props and the button**

`components/clinical/diagnosis/diagnosisPageProps.ts`, after `onCancelTransfer: () => void;`:

```ts
  /** Saves the visit summary as a PDF ("Unduh PDF"). */
  onDownloadPdf: () => void;
  /** Why the last PDF could not be made, or ''. */
  pdfError: string;
```

`components/clinical/diagnosis/RMETransferPanel.tsx`: add `onDownloadPdf` and `pdfError` to the destructured props and to the `Pick<…>` union; after the `resultSummary` panel add

```tsx
      {pdfError ? <ReadOnlyPanel tone="danger">{pdfError}</ReadOnlyPanel> : null}
```

and inside `.diagnosis-transfer-primary`, after the "Isi anamnesa ke RME" button:

```tsx
        <button
          type="button"
          className="action-btn action-btn--secondary"
          disabled={!transfer.diagnosisReady}
          onClick={onDownloadPdf}
        >
          Unduh PDF
        </button>
```

`components/clinical/diagnosis/steps/RmeStep.tsx`: add `| 'onDownloadPdf' | 'pdfError'` to `Props`, destructure both, pass `onDownloadPdf={onDownloadPdf} pdfError={pdfError}` to `<RMETransferPanel>`.

- [ ] **Step 9: Implement the wiring in `ClinicalDifferential.tsx`**

Imports (with the other `@/lib` imports; `nameBesideDose` beside the existing `formatDose` import from `./diagnosis/tatalaksana`):

```ts
import { buildVisitSummaryModel, type VisitSummaryContext } from '@/lib/report/visit-summary-model';
```

`ClinicalDifferentialProps`, after `chronicTherapies?: string[];`:

```ts
  /** Facility, triage, SpO2 and past visits for the PDF summary (from the side panel). */
  visitSummaryContext?: VisitSummaryContext;
```

Destructure `visitSummaryContext,` after `chronicTherapies = EMPTY_CHRONIC_THERAPIES,`. Beside the other `useState` calls: `const [pdfError, setPdfError] = useState('');`. After `const candidateMedicationCount = …;`:

```ts
  const handleDownloadPdf = (): void => {
    setPdfError('');
    const model = buildVisitSummaryModel({
      rm: patientRM,
      age: patientAge,
      gender: patientGender,
      keluhanUtama,
      keluhanTambahan: keluhanTambahan ?? '',
      allergies,
      pregnant: confirmedPregnancyStatus ?? null,
      vitals,
      diagnoses: selectedDiagnoses.map((diagnosis) => ({ icd: diagnosis.icd_x, name: humanize(diagnosis.nama) })),
      medications: selectedTransferMedications.map((medication) => {
        const dose = formatDose(medication.nama_obat, medication.dosis);
        return {
          name: nameBesideDose(medication.nama_obat, dose),
          dose,
          use: medication.aturan_pakai,
          duration: medication.durasi ?? '',
        };
      }),
      alerts: therapyByDiagnosis.flatMap((result) => result.alerts),
      context: visitSummaryContext,
      printedAt: new Date(),
    });
    // pdf-lib loads on the first click, not with the side panel.
    void import('@/lib/report/download-visit-summary')
      .then(({ downloadVisitSummaryPdf }) => downloadVisitSummaryPdf(model))
      .catch(() => setPdfError('PDF gagal dibuat. Coba lagi.'));
  };
```

At the page props (after `onCancelTransfer={…}`):

```tsx
        onDownloadPdf={handleDownloadPdf}
        pdfError={pdfError}
```

If `vitals` (type `DifferentialVitals`) is not assignable to `VisitRecord['vitals']`, pass `{ sbp: vitals.sbp, dbp: vitals.dbp, hr: vitals.hr, rr: vitals.rr, temp: vitals.temp, glucose: vitals.glucose }` (no cast).

- [ ] **Step 10: Pass the context from `main.tsx`** (protected; this prop only), after `chronicTherapies={chronicTherapyNames}`:

```tsx
                            visitSummaryContext={{
                              facilityName: clinicalContext.facilityName,
                              triage: {
                                zone: triageVerdict.zone,
                                headline: triageVerdict.headlineAlert?.title ?? null,
                              },
                              spo2: parseIntOrUndefined(ttvState.spo2) ?? null,
                              visitHistory: prefetchedVisitHistory?.visits ?? [],
                            }}
```

- [ ] **Step 11: Run the tests and typecheck to see them pass**

Run: `node scripts/pnpm.mjs exec vitest run components/clinical/diagnosis components/clinical/ClinicalDifferential.rme-transfer.e2e.test.tsx lib/report`
Expected: PASS.
Run: `node scripts/pnpm.mjs run typecheck`
Expected: exit 0.

### Task 6: preview, gates, records, commit

**Files:**
- Create (scratchpad harness, not the repo): `pdf.html`, `pdf-main.tsx` beside `traj.html` in the stats-harness directory named in `.claude/launch.json`
- Modify: `.agents/HANDOFF.md`, `.agents/DECISIONS.md` (CRLF; edit with `newline=''`), `docs/specs/2026-10-03-visit-summary-pdf-design.md` (status line)

- [ ] **Step 1: Harness page** — `pdf-main.tsx`

```tsx
import { LOGO_PATH } from '@/lib/report/download-visit-summary';
import { buildVisitSummaryModel } from '@/lib/report/visit-summary-model';
import { renderVisitSummaryPdf } from '@/lib/report/visit-summary-pdf';
import { longVisitSummaryInput, syntheticVisitSummaryInput } from '@/lib/report/visit-summary.fixtures';

// ?long shows the two-page case (45 medications). Synthetic data only.
const input = new URLSearchParams(location.search).has('long') ? longVisitSummaryInput : syntheticVisitSummaryInput;
const logo = new Uint8Array(await (await fetch(LOGO_PATH)).arrayBuffer());
const bytes = await renderVisitSummaryPdf(buildVisitSummaryModel(input), logo);
const frame = document.getElementById('pdf') as HTMLIFrameElement;
frame.src = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
```

`pdf.html`: same shell as `traj.html`, title "PDF harness", body `<iframe id="pdf" style="width:100%;height:100vh;border:0"></iframe>` and `<script type="module" src="/pdf-main.tsx"></script>`. Open with `preview_start {name: "stats-harness"}`, navigate to `/pdf.html`, screenshot; then `/pdf.html?long`. If the pane cannot show a PDF inside an iframe, open the blob URL in the tab directly.

- [ ] **Step 2: Capsule gates** (raw exit codes into the report)

```bash
node scripts/pnpm.mjs run lint
node scripts/pnpm.mjs run typecheck
node scripts/pnpm.mjs run test
node scripts/pnpm.mjs run test:e2e
node scripts/pnpm.mjs exec wxt build --mode development
node scripts/pnpm.mjs run run:check
git diff main --numstat -- entrypoints/sidepanel/style.css
```

Expected: lint red only for the known `tests/e2e/zz-verify-kb-rx.spec.ts` / `platform-api-client.test.ts`; everything else 0; style.css untouched. Check the dev build output for a separate chunk holding pdf-lib (`grep -l "PDFDocument" .output/chrome-mv3-dev/chunks/*`) and that `sidepanel` entry chunks do not contain it.

- [ ] **Step 3: Records** — HANDOFF current state (what shipped, the harness pages, pending live test of "Unduh PDF"); DECISIONS entry 2026-10-03 "Visit summary PDF" (Chief's five choices, pdf-lib approved, no name, logomark only, deviations below); spec status "approved … implemented".

Deviations from the spec, to record in the spec and in DECISIONS:
- Tren TTV rows are Tensi, Nadi, Napas, Suhu: the visit history carries no SpO2. At most the last 8 visits.
- The axis widens to every value instead of clamping, so no point leaves its chart.
- Tatalaksana prints the medications going to the resep (one list), then the CDSS alerts.
- The triage zone is its word in bold (red for merah), no square.
- "Unduh PDF" sits on the RME Terapi step beside the RME buttons, enabled once a diagnosis is chosen.
- Dose notation is applied in `ClinicalDifferential` (`lib/**` does not import `components/**`).

- [ ] **Step 4: Root gates** (in `D:\DEV\monorepo`, HANDOFF already updated)

```bash
pnpm run governance
pnpm run check:tokens
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
```

Expected: governance red only for the root `.agents/HANDOFF.md` owner, lint red only in `tools/automation/src/gaffer/*`, test red only for PostgreSQL 127.0.0.1:54329; the rest 0.

- [ ] **Step 5: Production build last**

Run: `node scripts/pnpm.mjs run build`
Expected: exit 0.

- [ ] **Step 6: Commit (explicit paths)**

```bash
git add package.json pnpm-lock.yaml public/brand/sentra-logomark-black.png lib/report components/clinical/diagnosis/diagnosisPageProps.ts components/clinical/diagnosis/RMETransferPanel.tsx components/clinical/diagnosis/RMETransferPanel.test.tsx components/clinical/diagnosis/DiagnosisStepFlow.test.tsx components/clinical/diagnosis/steps/RmeStep.tsx components/clinical/ClinicalDifferential.tsx components/clinical/ClinicalDifferential.rme-transfer.e2e.test.tsx entrypoints/sidepanel/main.tsx .agents/HANDOFF.md .agents/DECISIONS.md docs/specs/2026-10-03-visit-summary-pdf-design.md
git commit -m "feat(med-assist): visit summary as a Swiss Style PDF" -m "<body: what, gates with exit codes, test factories that gained onDownloadPdf/pdfError (no assertion changed)>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
