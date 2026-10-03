# Visit summary PDF (2026-10-03) — Design

Status: approved by Chief on 2026-10-03 (chat, then the written spec); implemented on 2026-10-03.
Branch `feat/sidepanel-ui-batch` (from `cd7b7795`). Deviations found against the code are listed
in DECISIONS 2026-10-03 "The visit summary is a Swiss Style PDF"; Chief's colour and content
redesign (Oxford band, red orange signals, Edukasi, Tindak lanjut) in the entry above it.

## Intent

Chief asked for the Assist result as a downloadable PDF in Swiss Style: a strict grid, sans-serif
type (Helvetica), generous white space, an asymmetric layout, and the Sentra logo at the top of
the first page. The document is a visit summary (Chief picked "Ringkasan kunjungan") for the
archive or as an attachment to the medical record. Success: one "Unduh PDF" button on the
Diagnosis page saves a legible, aligned A4 PDF built from the visit on screen, with every capsule
gate green and no patient name in the file.

Out of scope: a PDF of the STATS report, a PDF of the Diagnosis page alone, any change to
diagnosis ranking, therapy, triage or trajectory logic, sending the PDF anywhere.

## Approvals recorded (Chief, chat, 2026-10-03)

- Content: "Ringkasan kunjungan" (identity block, TTV and triage, chosen diagnoses, therapy,
  alerts, Tren TTV).
- Protected file `entrypoints/sidepanel/main.tsx`: one prop pass-through to `ClinicalDifferential`
  ("Lengkap, ubah main.tsx"); no new state or logic there. No patient name in the PDF, RM only.
- New dependency `pdf-lib` (MIT, 1.17.1, last published 2022; deps `@pdf-lib/standard-fonts`,
  `@pdf-lib/upng`, `pako`, `tslib`) — choosing option A approved it. Not chosen: jsPDF (larger,
  optional html2canvas / dompurify / canvg), a print page (no one-click file).
- Logo: the black logomark only. No "Sentra AI" wordmark, because the brand face is Archivo and
  embedding it would need `@pdf-lib/fontkit`.

## Data — `VisitSummaryModel`

Assembled in `components/clinical/ClinicalDifferential.tsx` by a pure builder
(`lib/report/visit-summary-model.ts`) from props it already has plus one new prop.

| Block | Fields | Source |
|---|---|---|
| Head | RM, age, sex, facility, printed at | existing props; `facilityName` new |
| Complaint | keluhan utama, keluhan tambahan | existing props |
| TTV / triage | SBP/DBP, pulse, RR, temperature, glucose, SpO2; triage zone and headline alert | `vitals`; `spo2`, `triage` new |
| Allergy / pregnancy | allergy list, pregnancy status | existing props |
| Diagnosis | up to 2 chosen (ICD-10, name, PRIMER/SEKUNDER) | `ClinicalDifferential` state |
| Tatalaksana | per diagnosis: medication, dose (Chief's notation), aturan pakai, duration; CDSS alerts | `DiagnosisTherapyResult` state |
| Tren TTV | K1..Kn per vital with normal limits | `visitHistory` new + current vitals; limits `NORMAL_RANGES` |

Never printed: patient name, date of birth, kelurahan, BPJS status, doctor and nurse names from
the visit history, engine rationale or explainability text.

New prop on `ClinicalDifferential` (set in `main.tsx`):

```ts
visitSummaryContext?: {
  facilityName: string;
  triage: { zone: TriageZone; headline: string | null };
  spo2: number | null;
  visitHistory: VisitRecord[];
};
```

Tren TTV uses the raw vitals per visit, not the trajectory engine's scores: the paper records
facts; projections stay on screen. Nothing under `lib/iskandar-diagnosis-engine/**` is edited,
only imported (`NORMAL_RANGES`, `VisitRecord`).

## Layout — `lib/report/visit-summary-layout.ts` (pure)

Input `VisitSummaryModel`, output `VisitSummaryLayout = { pages: DrawOp[][] }`, where a `DrawOp`
is `text | rule | rect | polyline | image` with absolute coordinates, font, size and colour.

- Page: A4 595.28 × 841.89 pt. Margins: top 48, bottom 56, left 40, right 40.
- Grid: 12 columns, 12 pt gutter (column ≈ 31.94 pt). Baseline grid 12 pt from the top margin.
  Every text op's x is a column start (or a column end for right-aligned values); every baseline
  y is on the 12 pt grid.
- Asymmetry: columns 1–3 hold section labels only; content starts at column 4 and runs to 12.
- Type: Helvetica and Helvetica-Bold; four sizes — title 24, subhead 11, body 9 on 12 leading,
  label / caption 7 (Bold, upper case). Black on white; captions 55% grey; one accent, red, for
  triage "merah" and CDSS alerts. Yellow and green triage are a small black square plus the zone
  word.
- Rules: 0.5 pt full-width hairline above each section.
- Page 1 head: logomark 28 × 28 pt at column 1, top aligned to the title's cap height; title
  "Ringkasan Kunjungan" at column 4; meta line (RM · age · sex · facility · printed at) beneath.
  Later pages: a small running head "Ringkasan Kunjungan · RM <rm>" and no logo.
- Footer on every page: "Sentra Med Assist · RM <rm> · dicetak <dd-mm-yyyy hh:mm>" at column 4,
  "Halaman n/N" right-aligned at column 12.
- Tren TTV: small multiples, one row per vital (Tensi, Nadi, Napas, Suhu, SpO2). Label columns
  1–3, a 0.75 pt polyline over a light-grey normal band in columns 4–9, the last value
  right-aligned in 10–12. SpO2 has no band. Fewer than 2 visits: one line "Riwayat kunjungan
  belum cukup untuk tren".
- Pagination: a section moves whole to the next page when it does not fit; only Tatalaksana
  splits, between medication rows, and its continuation keeps its label in columns 1–3.

## Text encoding — `lib/report/winansi.ts`

The standard Helvetica in a PDF encodes WinAnsi only. An explicit map turns known characters into
encodable text (`≥`→`>=`, `≤`→`<=`, `→`→`->`, `₂`→`2`, typographic quotes to straight quotes);
anything still unencodable becomes `?`. `°`, `µ`, `×`, `–` and `·` are WinAnsi and stay.

## Renderer — `lib/report/visit-summary-pdf.ts`

`renderVisitSummaryPdf(layout, logoPng: Uint8Array): Promise<Uint8Array>` maps ops to pdf-lib
calls (`drawText`, `drawLine`, `drawRectangle`, `drawImage`; a polyline is drawn as `drawLine` segments) and
sets metadata: title "Ringkasan Kunjungan", creator and producer "Sentra Med Assist", no name.
The logo is `public/brand/sentra-logomark-black.png`, copied from
`docs/brand/01-logo-master/sentra-logomark-master-black-512.png` (the capsule never reads the
monorepo's `docs/brand`).

## UI — `ClinicalDifferential.tsx`

One "Unduh PDF" button (`action-btn`) on the Diagnosis page, shown only when the therapy state is
ready. Click: dynamic `import()` of the report modules (so pdf-lib stays out of the side panel's first load) → build model → layout → render → blob → `<a download>` (as "Unduh CSV" in STATS; no
new extension permission). File name `ringkasan-kunjungan-<RM>-<yyyy-mm-dd>.pdf`. A failure shows
one line in the existing result area; no retry loop. `style.css` is append-only if a class is
needed at all.

## Testing

Written first, seen failing first.

- Model: name, date of birth and kelurahan never reach the model; dose notation follows Chief's
  format; empty therapy gives an empty Tatalaksana block, not a crash.
- Layout: every text x is on a column edge and every baseline on the 12 pt grid; section order;
  labels only in columns 1–3; logo only on page 1; 12 medications paginate to 2 pages with
  "Halaman 1/2" and "Halaman 2/2"; fewer than 2 visits gives the no-trend line.
- Encoding: every text op from the synthetic fixtures passes `encodeText` of the standard
  Helvetica with zero `?`; the map's entries each have a case.
- Renderer: `PDFDocument.load` of the bytes gives the page count, A4 size, title metadata and one
  embedded image.
- UI: the button is absent before therapy is ready and present after; clicking produces a blob
  with the PDF file name.
- Preview: `pdf.html` in the stats-harness renders the PDF from synthetic data in an iframe in
  the Browser pane.

Gates: capsule lint, typecheck, test, e2e, dev build, run:check, build last; root governance,
check:tokens, lint, typecheck, test, build with HANDOFF updated before the commit.

## Risks

- `pdf-lib` is unmaintained since 2022; it is stable and pure JS, but a security fix would need a
  fork or a swap.
- WinAnsi: names or notes with characters outside the map print `?`.
- Bundle size grows by pdf-lib (inference: a few hundred kB unminified), in a chunk loaded only on
  click.
- The visit history may hold a vital in a unit the trend does not expect; values outside the axis
  are clamped to the chart area's edges and the printed number stays exact.
