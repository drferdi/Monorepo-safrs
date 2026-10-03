import type { TrendRow, VisitSummaryModel } from './visit-summary-model';
import { toWinAnsi } from './winansi';

// Swiss grid (spec 2026-10-03): A4, 12 columns, 12 pt gutter, 12 pt baselines from the top margin.
// Every y is measured from the page top: a text's y is its baseline, a rect's or the logo's its top.
// Colour (Chief, 2026-10-03): an Oxford blue band opens page 1, red orange marks numbers and signals.
export const PAGE = { width: 595.28, height: 841.89 } as const;
export const MARGIN = { top: 48, right: 40, bottom: 56, left: 40 } as const;
export const COLUMNS = 12;
export const GUTTER = 12;
export const BASELINE = 12;
export const COLUMN_WIDTH =
  (PAGE.width - MARGIN.left - MARGIN.right - GUTTER * (COLUMNS - 1)) / COLUMNS;
export const SIZE = { title: 36, figure: 16, body: 9, label: 7 } as const;
/** The lowest baseline content may use, and the footer's baseline. */
export const CONTENT_BOTTOM = MARGIN.top + BASELINE * 61;
export const FOOTER_Y = MARGIN.top + BASELINE * 64;
const HELVETICA_CAP_HEIGHT = 0.718;
const TITLE_FIRST = MARGIN.top + BASELINE * 3;
const TITLE_SECOND = TITLE_FIRST + SIZE.title;
const LATER_PAGE_TOP = MARGIN.top + BASELINE * 3;
const SIGNAL_RULE = 3;
const CHART_HEIGHT = 24;

export type FontWeight = 'regular' | 'bold';
/** ink and muted on paper; oxford for structure; signal (red orange) for numbers and alarms. */
export type Tone = 'ink' | 'muted' | 'oxford' | 'signal' | 'paper' | 'tint' | 'band';
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
  /** Only Tatalaksana may continue on the next page while it would fit on a fresh one. */
  splits: boolean;
}

type TextStyle = { weight?: FontWeight; size?: number; tone?: Tone; align?: 'left' | 'right' };

const CAPTION: TextStyle = { weight: 'bold', size: SIZE.label, tone: 'muted' };

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

function wrap(
  value: string,
  width: number,
  measure: Measure,
  weight: FontWeight = 'regular',
  size: number = SIZE.body
): string[] {
  const words = toWinAnsi(value)
    .split(' ')
    .filter(Boolean)
    .flatMap((word) =>
      measure(word, weight, size) > width ? breakWord(word, width, weight, size, measure) : [word]
    );
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

/** Wrapped text in columns from..to, one row per line, so a long text continues on the next page. */
function paragraph(value: string, measure: Measure, style: TextStyle = {}, from = 4, to = 12): Row[] {
  return wrap(value, spanWidth(from, to), measure, style.weight, style.size).map((line) => ({
    lines: 1,
    draw: (top) => [text(columnX(from), top + BASELINE, line, style)],
  }));
}

/** A numbered list: the red-orange number in column 4, the text in columns 5-12. */
function numbered(items: string[], measure: Measure): Row[] {
  return items.flatMap((item, index) =>
    paragraph(item, measure, {}, 5, 12).map((row, line) =>
      line === 0
        ? {
            lines: 1,
            draw: (top: number) => [
              text(columnX(4), top + BASELINE, String(index + 1), { weight: 'bold', tone: 'signal' }),
              ...row.draw(top),
            ],
          }
        : row
    )
  );
}

/** Cells laid side by side, each wrapped in its own columns; the row is as tall as its tallest cell. */
function cells(
  measure: Measure,
  items: Array<{ value: string; from: number; to: number; style?: TextStyle }>
): Row {
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

/** Three vitals as large Oxford figures over their captions. */
function vitalsRow(items: VisitSummaryModel['vitals']): Row {
  return {
    lines: 3,
    draw: (top) =>
      items.flatMap((item, i) => {
        const x = columnX(4 + i * 3);
        return [
          text(x, top + BASELINE * 2, item.value, { weight: 'bold', size: SIZE.figure, tone: 'oxford' }),
          text(x, top + BASELINE * 3, item.label.toUpperCase(), CAPTION),
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
      const ops: DrawOp[] = [text(columnX(2), top + BASELINE, row.label)];
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
            if (run.length > 1) ops.push({ kind: 'polyline', points: run, tone: 'oxford' });
            run = [];
            return;
          }
          const point: [number, number] = [x(i), y(value)];
          run.push(point);
          // The latest visit is the one this summary is about: red orange.
          const size = i === line.values.length - 1 ? 3 : 2;
          ops.push({
            kind: 'rect',
            x: point[0] - size / 2,
            y: point[1] - size / 2,
            width: size,
            height: size,
            tone: size === 3 ? 'signal' : 'oxford',
          });
        });
        if (run.length > 1) ops.push({ kind: 'polyline', points: run, tone: 'oxford' });
      }
      ops.push(text(columnRight(12), top + BASELINE, row.last, { weight: 'bold', tone: 'oxford', align: 'right' }));
      return ops;
    },
  };
}

function sections(model: VisitSummaryModel, measure: Measure): Section[] {
  const complaint = paragraph(model.complaint.main || '-', measure);
  if (model.complaint.extra) complaint.push(...paragraph(`Tambahan: ${model.complaint.extra}`, measure));

  const vitals = [vitalsRow(model.vitals.slice(0, 3)), vitalsRow(model.vitals.slice(3))];
  if (model.triage) {
    vitals.push(
      { lines: 1, draw: () => [] },
      cells(measure, [
        {
          value: model.triage.zone.toUpperCase(),
          from: 4,
          to: 5,
          style: { weight: 'bold', tone: model.triage.zone === 'merah' ? 'signal' : 'oxford' },
        },
        { value: model.triage.headline ?? '', from: 6, to: 12 },
      ])
    );
  }

  const allergy = paragraph(model.allergies, measure);
  if (model.pregnancy) allergy.push(...paragraph(`Status hamil: ${model.pregnancy}`, measure));

  const diagnoses =
    model.diagnoses.length > 0
      ? model.diagnoses.map((diagnosis) =>
          cells(measure, [
            { value: diagnosis.icd, from: 4, to: 5, style: { weight: 'bold', tone: 'oxford' } },
            { value: diagnosis.name, from: 6, to: 10 },
            {
              value: diagnosis.role,
              from: 11,
              to: 12,
              style: { ...CAPTION, tone: diagnosis.role === 'PRIMER' ? 'signal' : 'muted' },
            },
          ])
        )
      : paragraph('Belum ada diagnosis terpilih', measure, { tone: 'muted' });

  const therapy: Row[] =
    model.medications.length > 0
      ? [
          cells(measure, [
            { value: 'OBAT', from: 4, to: 6, style: CAPTION },
            { value: 'DOSIS', from: 7, to: 8, style: CAPTION },
            { value: 'ATURAN PAKAI', from: 9, to: 10, style: CAPTION },
            { value: 'DURASI', from: 11, to: 12, style: CAPTION },
          ]),
          ...model.medications.map((medication) =>
            cells(measure, [
              { value: medication.name, from: 4, to: 6, style: { weight: 'bold' } },
              { value: medication.dose, from: 7, to: 8 },
              { value: medication.use, from: 9, to: 10 },
              { value: medication.duration, from: 11, to: 12 },
            ])
          ),
        ]
      : paragraph('Belum ada obat terpilih untuk resep', measure, { tone: 'muted' });
  for (const alert of model.alerts) {
    therapy.push(
      ...paragraph(alert.title, measure, { weight: 'bold', tone: alert.urgent ? 'signal' : 'oxford' }),
      ...paragraph(alert.message, measure)
    );
  }

  const education =
    model.education.length > 0
      ? numbered(model.education, measure)
      : paragraph('Tidak ada edukasi yang dipilih', measure, { tone: 'muted' });

  const followUp = model.followUp
    ? paragraph(model.followUp, measure, { weight: 'bold', tone: 'oxford' })
    : paragraph('Tidak ada jadwal kontrol', measure, { tone: 'muted' });
  if (model.safetyNet.length > 0) {
    followUp.push(
      { lines: 1, draw: () => [] },
      ...paragraph('SEGERA KEMBALI BILA', measure, CAPTION),
      ...numbered(model.safetyNet, measure)
    );
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
    : paragraph('Riwayat kunjungan belum cukup untuk tren', measure, { tone: 'muted' });

  return [
    { label: 'KELUHAN', rows: complaint, splits: false },
    { label: 'TTV / TRIASE', rows: vitals, splits: false },
    { label: 'ALERGI', rows: allergy, splits: false },
    { label: 'DIAGNOSIS', rows: diagnoses, splits: false },
    { label: 'TATALAKSANA', rows: therapy, splits: true },
    { label: 'EDUKASI', rows: education, splits: false },
    { label: 'TINDAK LANJUT', rows: followUp, splits: false },
    { label: 'TREN TTV', rows: trendRows, splits: false },
  ];
}

/** Oxford hairline, the red-orange number in column 1, the Oxford label in columns 2-3. */
function sectionHead(number: number, label: string, top: number): DrawOp[] {
  return [
    { kind: 'rule', x1: columnX(1), x2: columnRight(12), y: top },
    text(columnX(1), top + BASELINE, String(number).padStart(2, '0'), { weight: 'bold', tone: 'signal' }),
    text(columnX(2), top + BASELINE, label, { weight: 'bold', size: SIZE.label, tone: 'oxford' }),
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
  const metaFirst = TITLE_SECOND + BASELINE * 2;
  const bandHeight = metaFirst + BASELINE * (meta.length - 1) + BASELINE * 2;
  const capTop = TITLE_FIRST - SIZE.title * HELVETICA_CAP_HEIGHT;
  const first: DrawOp[] = [
    { kind: 'rect', x: 0, y: 0, width: PAGE.width, height: bandHeight, tone: 'oxford' },
    { kind: 'rect', x: 0, y: bandHeight, width: PAGE.width, height: SIGNAL_RULE, tone: 'signal' },
    // The logomark spans the two title lines, from the cap height of the first to the baseline of the second.
    { kind: 'logo', x: columnX(1), y: capTop, size: TITLE_SECOND - capTop },
    text(columnX(4), TITLE_FIRST, 'RINGKASAN', { weight: 'bold', size: SIZE.title, tone: 'paper' }),
    text(columnX(4), TITLE_SECOND, 'KUNJUNGAN', { weight: 'bold', size: SIZE.title, tone: 'paper' }),
    ...meta.map((line, i) => text(columnX(4), metaFirst + BASELINE * i, line, { tone: 'tint' })),
  ];
  const pages: DrawOp[][] = [first];
  let pageTop = bandHeight + BASELINE * 2;
  let top = pageTop;

  const openPage = (): number => {
    pages.push([
      text(columnX(4), MARGIN.top + BASELINE, `RINGKASAN KUNJUNGAN · RM ${model.head.rm}`, {
        weight: 'bold',
        size: SIZE.label,
        tone: 'oxford',
      }),
    ]);
    pageTop = LATER_PAGE_TOP;
    return pageTop;
  };
  const current = (): DrawOp[] => pages[pages.length - 1];

  sections(model, measure).forEach((section, index) => {
    const total = section.rows.reduce((sum, row) => sum + row.lines, 0);
    const needed = section.splits ? section.rows[0].lines : total;
    if (!fits(top, needed) && top > pageTop) top = openPage();
    let cursor = top;
    let headTop = cursor;
    current().push(...sectionHead(index + 1, section.label, cursor));
    for (const row of section.rows) {
      if (!fits(cursor, row.lines) && cursor > headTop) {
        cursor = openPage();
        headTop = cursor;
        current().push(...sectionHead(index + 1, section.label, cursor));
      }
      current().push(...row.draw(cursor));
      cursor += BASELINE * row.lines;
    }
    top = cursor + BASELINE * 2;
  });

  pages.forEach((ops, i) => {
    ops.push(
      text(columnX(4), FOOTER_Y, `Sentra Med Assist · RM ${model.head.rm} · dicetak ${model.head.printedAt}`, {
        size: SIZE.label,
        tone: 'muted',
      }),
      text(columnRight(12), FOOTER_Y, `Halaman ${i + 1}/${pages.length}`, {
        weight: 'bold',
        size: SIZE.label,
        tone: 'oxford',
        align: 'right',
      })
    );
  });
  return { pages };
}
