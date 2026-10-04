import type { TrendRow, VisitSummaryModel } from './visit-summary-model';
import { toWinAnsi } from './winansi';

// The approved template (Chief, 2026-10-04, Clinical_Visit_Summary_Template.docx): A4, 1 cm
// margins, a red tab over the title, ten numbered blocks in Arial bold, a two-part footer. Every
// size, colour, letter spacing and column width below is the template's (twips / 20 = pt). Every
// y is measured from the page top: a text's y is its baseline, a rect's or the logo's its top.
export const PAGE = { width: 595.28, height: 841.89 } as const;
export const MARGIN = { top: 28.35, right: 28.35, bottom: 25.5, left: 28.35 } as const;
export const CONTENT_WIDTH = PAGE.width - MARGIN.left - MARGIN.right;
/** The lowest point content may reach; the footer sits below it. */
export const CONTENT_BOTTOM = PAGE.height - MARGIN.bottom - 6;
export const FOOTER_Y = PAGE.height - 10;

export const COLOR = {
  ink: '#111111',
  label: '#666666',
  footer: '#777777',
  red: '#E31B23',
  divider: '#B6B6B6',
  rule: '#8B8B8B',
  ruleStrong: '#777777',
  row: '#D7D7D7',
  trendFill: '#F1F1F1',
  alarmFill: '#F8E9EA',
} as const;

/** The triage box takes the zone's colour; kuning is the template's own sample. */
export const TRIAGE_FILL: Record<string, string> = {
  merah: '#F4B6B9',
  kuning: '#F7E98B',
  hijau: '#BFE3C6',
  biru: '#BCD7F2',
};

const pt = (twips: number): number => twips / 20;
/** Arial's ascent and Word's line height for these paragraphs, as a share of the type size. */
const ASCENT = 0.905;
const LEADING = 1.2;
const CELL_PAD = pt(55);
const SECTION_NUMBER_WIDTH = pt(567);

export type Measure = (text: string, size: number, spacing?: number) => number;

export type DrawOp =
  | {
      kind: 'text';
      x: number;
      y: number;
      text: string;
      size: number;
      color: string;
      /** Letter spacing in pt, as the template tracks its captions. */
      spacing: number;
      align: 'left' | 'right' | 'center';
    }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; width: number; color: string }
  | { kind: 'rect'; x: number; y: number; width: number; height: number; color: string }
  | { kind: 'logo'; x: number; y: number; size: number };

export interface VisitSummaryLayout {
  pages: DrawOp[][];
}

/** A piece of a column that never splits across pages. */
interface Block {
  height: number;
  draw: (x: number, top: number) => DrawOp[];
}

interface Column {
  /** Offset of the cell from the content's left edge, and its width (both in pt). */
  offset: number;
  width: number;
  /** The template's grey rule on the cell's left edge. */
  divider: boolean;
  blocks: Block[];
}

interface Band {
  columns: Column[];
  /** The rule under the band, when the template draws one. */
  rule: { width: number; color: string } | null;
}

type Style = { size: number; color?: string; spacing?: number; align?: 'left' | 'right' | 'center' };

function text(x: number, y: number, value: string, style: Style): DrawOp {
  return {
    kind: 'text',
    x,
    y,
    text: toWinAnsi(value),
    size: style.size,
    color: style.color ?? COLOR.ink,
    spacing: style.spacing ?? 0,
    align: style.align ?? 'left',
  };
}

const lineHeight = (size: number): number => size * LEADING;

function breakWord(word: string, width: number, style: Style, measure: Measure): string[] {
  const parts: string[] = [];
  let part = '';
  for (const char of Array.from(word)) {
    if (part && measure(part + char, style.size, style.spacing) > width) {
      parts.push(part);
      part = char;
    } else {
      part += char;
    }
  }
  return part ? [...parts, part] : parts;
}

function wrap(value: string, width: number, style: Style, measure: Measure): string[] {
  const words = toWinAnsi(value)
    .split(' ')
    .filter(Boolean)
    .flatMap((word) =>
      measure(word, style.size, style.spacing) > width ? breakWord(word, width, style, measure) : [word]
    );
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next, style.size, style.spacing) > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  return line ? [...lines, line] : lines.length > 0 ? lines : [''];
}

/** One block per wrapped line, so a long text continues on the next page. */
function paragraph(value: string, width: number, style: Style, measure: Measure, before = 0): Block[] {
  return wrap(value, width, style, measure).map((line, index) => {
    const gap = index === 0 ? before : 0;
    return {
      height: gap + lineHeight(style.size),
      draw: (x, top) => {
        const at = style.align === 'right' ? x + width : style.align === 'center' ? x + width / 2 : x;
        return [text(at, top + gap + style.size * ASCENT, line, style)];
      },
    };
  });
}

/** The red block number (15 pt) and its tracked caption (7 pt), on one baseline. */
function sectionHead(number: number, label: string): Block {
  const height = lineHeight(15) + 2;
  return {
    height,
    draw: (x, top) => [
      text(x, top + 15 * ASCENT, String(number).padStart(2, '0'), { size: 15, color: COLOR.red }),
      text(x + SECTION_NUMBER_WIDTH, top + 15 * ASCENT, label, { size: 7, spacing: pt(35) }),
    ],
  };
}

/** A caption over a value: the template's labelled field. */
function field(
  label: string,
  value: string,
  width: number,
  measure: Measure,
  labelStyle: Style,
  valueStyle: Style
): Block {
  const lines = wrap(value, width, valueStyle, measure);
  const labelHeight = lineHeight(labelStyle.size);
  return {
    height: labelHeight + lines.length * lineHeight(valueStyle.size),
    draw: (x, top) => [
      text(x, top + labelStyle.size * ASCENT, label, { color: COLOR.label, ...labelStyle }),
      ...lines.map((line, i) =>
        text(x, top + labelHeight + i * lineHeight(valueStyle.size) + valueStyle.size * ASCENT, line, valueStyle)
      ),
    ],
  };
}

/** Cells side by side, each wrapped in its own width; the row is as tall as its tallest cell. */
function tableRow(
  cells: Array<{ value: string; width: number; style: Style; fill?: string; arrow?: TrendRow['direction'] }>,
  measure: Measure,
  separator: string | null
): Block {
  const wrapped = cells.map((cell) => ({ ...cell, lines: wrap(cell.value, cell.width - CELL_PAD * 2, cell.style, measure) }));
  const height =
    Math.max(...wrapped.map((cell) => cell.lines.length * lineHeight(cell.style.size))) + pt(30) + pt(27);
  return {
    height,
    draw: (x, top) => {
      const ops: DrawOp[] = [];
      let left = x;
      for (const cell of wrapped) {
        if (cell.fill) ops.push({ kind: 'rect', x: left, y: top, width: cell.width, height, color: cell.fill });
        if (cell.arrow) ops.push(...arrow(left + cell.width / 2, top + height / 2, cell.arrow));
        cell.lines.forEach((line, i) => {
          if (cell.arrow) return;
          const baseline = top + pt(30) + i * lineHeight(cell.style.size) + cell.style.size * ASCENT;
          ops.push(text(left + CELL_PAD, baseline, line, cell.style));
        });
        left += cell.width;
      }
      if (separator) ops.push({ kind: 'line', x1: x, y1: top + height, x2: left, y2: top + height, width: 0.25, color: separator });
      return ops;
    },
  };
}

/** The template's trend arrow (→, ↑, ↓): the text stays in WinAnsi, which has no arrow, so it is drawn. */
function arrow(cx: number, cy: number, direction: Exclude<TrendRow['direction'], null>): DrawOp[] {
  const half = 3.5;
  const head = 2;
  const line = (x1: number, y1: number, x2: number, y2: number): DrawOp => ({
    kind: 'line',
    x1,
    y1,
    x2,
    y2,
    width: 0.8,
    color: direction === 'flat' ? COLOR.label : COLOR.ink,
  });
  if (direction === 'flat') {
    return [line(cx - half, cy, cx + half, cy), line(cx + half - head, cy - head, cx + half, cy), line(cx + half - head, cy + head, cx + half, cy)];
  }
  const sign = direction === 'up' ? -1 : 1;
  const tip = cy + sign * half;
  return [
    line(cx, cy - sign * half, cx, tip),
    line(cx - head, tip - sign * head, cx, tip),
    line(cx + head, tip - sign * head, cx, tip),
  ];
}

const spacer = (height: number): Block => ({ height, draw: () => [] });

function bands(model: VisitSummaryModel, measure: Measure): Band[] {
  const rule = { width: pt(5) / 8, color: COLOR.rule };
  const half = (offset: number, width: number, divider: boolean, blocks: Block[]): Column => ({
    offset,
    width,
    divider,
    blocks,
  });
  const inner = (width: number): number => width - CELL_PAD * 2;

  // Head: the title, and the RM, age, sex and time on the right.
  const titleWidth = pt(6236);
  const metaWidth = pt(4535);
  // The template's 3 × 1795-twip grids are wider than their 4535-twip cell; Word fits them to it.
  const metaCell = inner(pt(4535)) / 3;
  const title: Block = {
    height: lineHeight(34) * 2 + lineHeight(13) + 4,
    draw: (x, top) => {
      const first = top + 34 * ASCENT;
      const second = first + lineHeight(34);
      const brand = second + lineHeight(13) + 4;
      const brandWidth = measure('Sentra Asisten Medis', 13);
      return [
        text(x, first, 'Clinical', { size: 34 }),
        text(x, second, 'Visit Summary', { size: 34 }),
        text(x, brand, 'Sentra Asisten Medis', { size: 13 }),
        text(x + brandWidth + measure('   ', 13), brand, 'Prototype', { size: 9, color: COLOR.red }),
        // Chief, 2026-10-04: the Sentra logomark added without moving anything, at the title's
        // right end, as tall as the "Clinical" line.
        { kind: 'logo', x: x + inner(titleWidth) - 34 * ASCENT, y: top + 2, size: 34 * ASCENT },
      ];
    },
  };
  const metaRow: Block = {
    height: lineHeight(6) + lineHeight(8.5) + 4,
    draw: (x, top) =>
      [
        ['USIA', model.head.age],
        ['JENIS KELAMIN', model.head.sex],
        ['TANGGAL & WAKTU', `${model.head.day} ${model.head.time}`],
      ].flatMap(([label, value], i) =>
        field(label, value, metaCell - CELL_PAD, measure, { size: 6, spacing: pt(15) }, { size: 8.5 }).draw(
          x + i * metaCell,
          top + 4
        )
      ),
  };
  const head: Band = {
    columns: [
      half(0, titleWidth, false, [title]),
      half(titleWidth, metaWidth, true, [
        field('NO. REKAM MEDIS', `RM ${model.head.rm}`, inner(metaWidth), measure, { size: 6, spacing: pt(20) }, { size: 12 }),
        metaRow,
      ]),
    ],
    rule: { width: pt(7) / 8, color: COLOR.ruleStrong },
  };

  // 01 Keluhan · 02 Tanda vital / triase.
  const leftWidth = pt(6236);
  const rightWidth = pt(4535);
  const complaint = [
    sectionHead(1, 'KELUHAN UTAMA & RINGKASAN KLINIS'),
    ...paragraph(model.complaint.main || '-', inner(leftWidth), { size: 10 }, measure),
    ...(model.complaint.extra ? paragraph(model.complaint.extra, inner(leftWidth), { size: 7 }, measure, pt(40)) : []),
    // The template's "Temuan penting / observasi / faktor risiko relevan": the alerts.
    ...model.alerts.flatMap((alert, index) =>
      paragraph(`${alert.title}: ${alert.message}`, inner(leftWidth), { size: 7, color: alert.urgent ? COLOR.red : COLOR.ink }, measure, index === 0 ? pt(40) : 0)
    ),
  ];
  const vitalRow = (items: VisitSummaryModel['vitals']): Block => ({
    height: lineHeight(6) + lineHeight(16) + lineHeight(6.5) + 2,
    draw: (x, top) =>
      items.flatMap((item, i) => {
        const left = x + i * metaCell;
        return [
          text(left, top + 6 * ASCENT, item.label, { size: 6, color: COLOR.label }),
          text(left, top + lineHeight(6) + 16 * ASCENT, item.value, { size: 16 }),
          text(left, top + lineHeight(6) + lineHeight(16) + 6.5 * ASCENT, item.unit, { size: 6.5 }),
        ];
      }),
  });
  const triage = model.triage;
  const triageRow = tableRow(
    [
      {
        value: triage ? triage.zone.toUpperCase() : '-',
        width: pt(1587),
        style: { size: 8.5 },
        fill: triage ? (TRIAGE_FILL[triage.zone] ?? COLOR.trendFill) : COLOR.trendFill,
      },
      { value: triage?.headline ?? '', width: pt(2835), style: { size: 6.5 } },
    ],
    measure,
    null
  );
  const triageBlock: Block = {
    height: triageRow.height + lineHeight(5.5) + 4,
    draw: (x, top) => [
      ...triageRow.draw(x, top + 4 + lineHeight(5.5)).map((op) =>
        op.kind === 'rect' ? { ...op, y: top + 4, height: op.height + lineHeight(5.5) } : op
      ),
      text(x + CELL_PAD, top + 4 + 5.5 * ASCENT + 2, 'TRIASE', { size: 5.5, color: COLOR.label }),
    ],
  };
  const vitals = [sectionHead(2, 'TANDA VITAL / TRIASE'), vitalRow(model.vitals.slice(0, 3)), vitalRow(model.vitals.slice(3)), triageBlock];

  // 03 Alergi · 04 Diagnosis.
  const allergyWidth = pt(4819);
  const diagnosisWidth = pt(5953);
  const allergy = [
    sectionHead(3, 'ALERGI'),
    ...paragraph(model.allergies, inner(allergyWidth), { size: 8.5 }, measure),
    ...(model.pregnancy ? paragraph(`Status hamil: ${model.pregnancy}`, inner(allergyWidth), { size: 7 }, measure, pt(40)) : []),
  ];
  const diagnosisRow = (diagnosis: VisitSummaryModel['diagnoses'][number]): Block => {
    const primary = diagnosis.role === 'PRIMER';
    const icdSize = primary ? 22 : 12;
    const nameLines = wrap(diagnosis.name, pt(3175) - CELL_PAD, { size: 10.5 }, measure);
    const height = Math.max(lineHeight(icdSize), nameLines.length * lineHeight(10.5)) + 2;
    return {
      height,
      draw: (x, top) => [
        text(x, top + icdSize * ASCENT, diagnosis.icd, { size: icdSize }),
        ...nameLines.map((line, i) => text(x + pt(2041), top + 10.5 * ASCENT + i * lineHeight(10.5) + (primary ? 4 : 0), line, { size: 10.5 })),
        text(x + pt(2041) + pt(3175) + pt(737) - CELL_PAD * 2, top + 6.5 * ASCENT + (primary ? 6 : 1), diagnosis.role, {
          size: 6.5,
          color: primary ? COLOR.red : COLOR.label,
          align: 'right',
        }),
      ],
    };
  };
  const diagnoses = [
    sectionHead(4, 'DIAGNOSIS'),
    ...(model.diagnoses.length > 0
      ? model.diagnoses.map(diagnosisRow)
      : paragraph('Belum ada diagnosis terpilih', inner(diagnosisWidth), { size: 10.5, color: COLOR.label }, measure)),
  ];

  // 05 Tatalaksana / obat: the template's five columns, one row per medication.
  const medWidths = [567, 4989, 1701, 2268, 1247].map(pt);
  const headStyle: Style = { size: 5.5, color: COLOR.label, spacing: pt(12) };
  const medHead = tableRow(
    ['NO', 'OBAT', 'DOSIS', 'ATURAN PAKAI', 'DURASI'].map((value, i) => ({ value, width: medWidths[i], style: headStyle })),
    measure,
    COLOR.rule
  );
  const medRows =
    model.medications.length > 0
      ? model.medications.map((medication, index) =>
          tableRow(
            [String(index + 1), medication.name, medication.dose, medication.use, medication.duration].map((value, i) => ({
              value,
              width: medWidths[i],
              style: { size: 6.5 },
            })),
            measure,
            COLOR.row
          )
        )
      : paragraph('Belum ada obat terpilih untuk resep', CONTENT_WIDTH, { size: 6.5, color: COLOR.label }, measure, 3);
  const therapy = [sectionHead(5, 'TATALAKSANA / OBAT'), medHead, ...medRows];

  // 06 Edukasi · 07 Tindak lanjut.
  const educationWidth = pt(5839);
  const followWidth = pt(4932);
  const education = [
    sectionHead(6, 'EDUKASI'),
    ...(model.education.length > 0
      ? model.education.flatMap((item, index) => paragraph(`${index + 1}. ${item}`, inner(educationWidth), { size: 7.5 }, measure))
      : paragraph('Tidak ada edukasi yang dipilih', inner(educationWidth), { size: 7.5, color: COLOR.label }, measure)),
  ];
  const followUp = [
    sectionHead(7, 'TINDAK LANJUT'),
    ...paragraph(model.followUp || 'Tidak ada jadwal kontrol', inner(followWidth), { size: 9.5, color: model.followUp ? COLOR.ink : COLOR.label }, measure),
  ];

  // 08 Tren tanda vital · 09 Segera kembali bila · 10 Verifikasi.
  const trendWidth = pt(5896);
  const alarmWidth = pt(4876);
  const trendWidths = [1814, 1134, 1134, 1814].map(pt);
  const trendHeadStyle: Style = { size: 5.5, color: COLOR.label, spacing: pt(8) };
  const trend = [
    sectionHead(8, 'TREN TANDA VITAL'),
    tableRow(
      ['PARAMETER', 'SEBELUM', 'HARI INI', 'TREND'].map((value, i) => ({ value, width: trendWidths[i], style: trendHeadStyle })),
      measure,
      COLOR.rule
    ),
    ...model.trend.map((row) =>
      tableRow(
        [
          { value: row.label, width: trendWidths[0], style: { size: 6 } },
          { value: row.before, width: trendWidths[1], style: { size: 6 } },
          { value: row.today, width: trendWidths[2], style: { size: 6 } },
          { value: row.direction ? '' : '-', width: trendWidths[3], style: { size: 6 }, fill: COLOR.trendFill, arrow: row.direction },
        ],
        measure,
        COLOR.row
      )
    ),
  ];
  const alarmText = pt(3969) - CELL_PAD * 2;
  const alarmItems = model.safetyNet.length > 0 ? model.safetyNet : ['Tidak ada tanda bahaya tercatat'];
  const alarmLines = alarmItems.map((item) => wrap(item, alarmText - 10, { size: 6.5 }, measure));
  const alarmBody = alarmLines.reduce((sum, lines) => sum + lines.length * lineHeight(6.5), 0);
  const alarm: Block = {
    height: Math.max(alarmBody, lineHeight(19)) + pt(60) * 2,
    draw: (x, top) => {
      const height = Math.max(alarmBody, lineHeight(19)) + pt(60) * 2;
      const ops: DrawOp[] = [
        { kind: 'rect', x, y: top, width: pt(794) + pt(3969), height, color: COLOR.alarmFill },
        text(x + pt(794) / 2, top + height / 2 + 19 * 0.36, '!', { size: 19, color: COLOR.red, align: 'center' }),
      ];
      let y = top + pt(60);
      alarmLines.forEach((lines, index) => {
        lines.forEach((line, i) => {
          const baseline = y + 6.5 * ASCENT;
          if (i === 0 && model.safetyNet.length > 0) {
            ops.push(text(x + pt(794) + CELL_PAD, baseline, String(index + 1), { size: 6.5, color: COLOR.red }));
          }
          ops.push(text(x + pt(794) + CELL_PAD + 10, baseline, line, { size: 6.5, color: model.safetyNet.length > 0 ? COLOR.ink : COLOR.label }));
          y += lineHeight(6.5);
        });
      });
      return ops;
    },
  };
  const signerWidth = pt(2381);
  const signers: Block = {
    height: lineHeight(5) + lineHeight(6) * 2 + 4,
    draw: (x, top) =>
      [
        ['DPJP', model.signers.dpjp],
        ['VERIFIKATOR', model.signers.verifier],
      ].flatMap(([label, name], i) =>
        field(label, name, signerWidth - CELL_PAD, measure, { size: 5, spacing: pt(5) }, { size: 6 }).draw(x + i * signerWidth, top + 2)
      ),
  };
  const verification: Block[] = [
    {
      height: 8,
      draw: (x, top) => [{ kind: 'line', x1: x, y1: top + 4, x2: x + inner(alarmWidth), y2: top + 4, width: 0.5, color: COLOR.rule }],
    },
    sectionHead(10, 'VERIFIKASI'),
    signers,
  ];

  return [
    head,
    { columns: [half(0, leftWidth, false, complaint), half(leftWidth, rightWidth, true, vitals)], rule },
    { columns: [half(0, allergyWidth, false, allergy), half(allergyWidth, diagnosisWidth, true, diagnoses)], rule },
    { columns: [half(0, CONTENT_WIDTH, false, therapy)], rule },
    { columns: [half(0, educationWidth, false, education), half(educationWidth, followWidth, true, followUp)], rule },
    {
      columns: [
        half(0, trendWidth, false, trend),
        half(trendWidth, alarmWidth, true, [sectionHead(9, 'SEGERA KEMBALI BILA'), alarm, spacer(4), ...verification]),
      ],
      rule: null,
    },
  ];
}

const BAND_PAD = 7;
/** The red tab over the title: 907 × 91 twips. */
const RED_TAB = { width: pt(907), height: pt(91) };

export function layoutVisitSummary(model: VisitSummaryModel, measure: Measure): VisitSummaryLayout {
  const pages: DrawOp[][] = [[{ kind: 'rect', x: MARGIN.left, y: MARGIN.top, width: RED_TAB.width, height: RED_TAB.height, color: COLOR.red }]];
  let y = MARGIN.top + RED_TAB.height + 6;
  const current = (): DrawOp[] => pages[pages.length - 1];
  const newPage = (): void => {
    pages.push([]);
    y = MARGIN.top;
  };

  for (const band of bands(model, measure)) {
    const next = band.columns.map(() => 0);
    const remaining = (): boolean => band.columns.some((column, i) => next[i] < column.blocks.length);
    // Keep each column's first two blocks (the block head and its first line) together.
    const opening = Math.max(
      ...band.columns.map((column) => column.blocks.slice(0, 2).reduce((sum, block) => sum + block.height, 0))
    );
    if (y + BAND_PAD + opening > CONTENT_BOTTOM && y > MARGIN.top) newPage();
    while (remaining()) {
      const top = y;
      let bottom = top;
      let placed = false;
      band.columns.forEach((column, i) => {
        const x = MARGIN.left + column.offset + (column.offset > 0 ? CELL_PAD : 0);
        let cursor = top + BAND_PAD;
        while (next[i] < column.blocks.length) {
          const block = column.blocks[next[i]];
          // A block taller than a whole page is placed anyway, so the layout always ends.
          if (cursor + block.height > CONTENT_BOTTOM && !(cursor === top + BAND_PAD && top === MARGIN.top)) break;
          current().push(...block.draw(x, cursor));
          cursor += block.height;
          next[i] += 1;
          placed = true;
        }
        bottom = Math.max(bottom, cursor);
      });
      bottom += BAND_PAD;
      for (const column of band.columns) {
        if (!column.divider) continue;
        const x = MARGIN.left + column.offset;
        current().push({ kind: 'line', x1: x, y1: top + 3, x2: x, y2: bottom - 3, width: 0.5, color: COLOR.divider });
      }
      if (remaining() || !placed) {
        newPage();
      } else {
        y = bottom;
      }
    }
    if (band.rule) {
      current().push({ kind: 'line', x1: MARGIN.left, y1: y, x2: MARGIN.left + CONTENT_WIDTH, y2: y, width: band.rule.width, color: band.rule.color });
    }
  }

  const left = 'Sentra Asisten Medis  ·  Clinical Visit Summary (Prototype)';
  pages.forEach((ops, i) => {
    const right = `RM ${model.head.rm}  ·  dicetak ${model.head.printedAt}${pages.length > 1 ? `  ·  ${i + 1}/${pages.length}` : ''}`;
    ops.push(
      text(MARGIN.left, FOOTER_Y, left, { size: 5.5, color: COLOR.footer }),
      text(MARGIN.left + CONTENT_WIDTH, FOOTER_Y, right, { size: 5.5, color: COLOR.footer, align: 'right' })
    );
  });
  return { pages };
}
