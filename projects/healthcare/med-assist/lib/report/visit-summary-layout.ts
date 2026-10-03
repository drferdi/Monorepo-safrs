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

/** Wrapped text in columns from..to, one baseline per line. */
function paragraph(value: string, measure: Measure, style: TextStyle = {}, from = 4, to = 12): Row {
  const lines = wrap(value, spanWidth(from, to), measure, style.weight, style.size);
  return {
    lines: lines.length,
    draw: (top) => lines.map((line, i) => text(columnX(from), top + BASELINE * (i + 1), line, style)),
  };
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
