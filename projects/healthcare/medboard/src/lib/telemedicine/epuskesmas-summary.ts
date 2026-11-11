// The consultation summary in the shape of the ePuskesmas pages (Chief 2026-10-07: "AI akan
// meringkas ke dalam bentuk yang sama dengan susunan ePuskesmas"). Anamnesa, Diagnosa and Resep are
// separate pages there, so they stay separate here; field names follow AnamnesaFillPayload and
// DiagnosaFillPayload (src/lib/emr/types.ts) so a later RME fill can take them as they are.

import { z } from 'zod'

export interface TranscriptLine {
  speaker: 'dokter' | 'pasien'
  text: string
  /** ISO time the utterance started. */
  at: string
}

const text = z.string().catch('')
const count = z.number().catch(0)
const list = z.array(z.string()).catch([])
const objectOrEmpty = (value: unknown) => (value && typeof value === 'object' ? value : {})

const Summary = z.object({
  anamnesa: z.preprocess(
    objectOrEmpty,
    z.object({
      keluhan_utama: text,
      keluhan_tambahan: text,
      lama_sakit: z.preprocess(objectOrEmpty, z.object({ thn: count, bln: count, hr: count })),
      riwayat_penyakit: z.preprocess(objectOrEmpty, z.object({ sekarang: text, dahulu: text, keluarga: text })),
      alergi: z.preprocess(objectOrEmpty, z.object({ obat: list, makanan: list, udara: list, lainnya: list })),
      lainnya: z.preprocess(
        objectOrEmpty,
        z.object({ terapi: text, terapi_non_obat: text, edukasi: text, rencana_tindakan: text })
      ),
    })
  ),
  diagnosa: z
    .array(
      z.object({
        icd_x: text,
        nama: text,
        jenis: z.enum(['PRIMER', 'SEKUNDER']).catch('PRIMER'),
        kasus: z.enum(['BARU', 'LAMA']).catch('BARU'),
      })
    )
    .catch([]),
  resep: z.array(z.object({ nama_obat: text, signa: text, jumlah: count })).catch([]),
})

export type EpuskesmasSummary = z.infer<typeof Summary>
export type SummarySection = 'anamnesa' | 'diagnosa' | 'resep'

export const SUMMARY_SYSTEM_PROMPT = `Anda menyusun rekam medis dari transkrip konsultasi telemedicine di Puskesmas, mengikuti halaman ePuskesmas.
Tulis dalam bahasa Indonesia baku dan ringkas. Isi hanya hal yang benar-benar diucapkan dokter atau pasien; kosongkan ("", [] atau 0) bila tidak disebut.
Diagnosa dan resep hanya bila dokter menyatakannya; jangan menambah diagnosis atau obat sendiri. icd_x berisi kode ICD-10 versi 2010 bila yakin, selain itu kosong.
Dosis ditulis frekuensi x kekuatan per minum tanpa spasi, misalnya 3x500mg.
Jawab hanya JSON dengan bentuk:
{"anamnesa":{"keluhan_utama":"","keluhan_tambahan":"","lama_sakit":{"thn":0,"bln":0,"hr":0},"riwayat_penyakit":{"sekarang":"","dahulu":"","keluarga":""},"alergi":{"obat":[],"makanan":[],"udara":[],"lainnya":[]},"lainnya":{"terapi":"","terapi_non_obat":"","edukasi":"","rencana_tindakan":""}},"diagnosa":[{"icd_x":"","nama":"","jenis":"PRIMER","kasus":"BARU"}],"resep":[{"nama_obat":"","signa":"","jumlah":0}]}`

/** Long digit runs (NIK, BPJS number, phone) never leave the server. */
export function redactNumbers(value: string): string {
  return value.replace(/\d[\d\s-]{4,}\d/g, '[angka dihapus]')
}

const SPEAKER = { dokter: 'Dokter', pasien: 'Pasien' } as const

export function buildSummaryPrompt(lines: ReadonlyArray<TranscriptLine>): string {
  const ordered = [...lines].sort((a, b) => a.at.localeCompare(b.at))
  return [
    'Transkrip konsultasi:',
    ...ordered.map((line) => `${SPEAKER[line.speaker]}: ${redactNumbers(line.text.trim())}`),
    'Berikan jawaban dalam format json.',
  ].join('\n')
}

/** Reads the AI answer; ICD codes missing from the 2010 catalogue are dropped. Null when unreadable. */
export function parseSummary(content: string, known: (code: string) => boolean): EpuskesmasSummary | null {
  const json = content.match(/\{[\s\S]*\}/)?.[0]
  if (!json) return null
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return null
  }
  const parsed = Summary.safeParse(raw)
  if (!parsed.success) return null
  const summary = parsed.data
  return {
    ...summary,
    diagnosa: summary.diagnosa
      .map((item) => {
        const code = item.icd_x.trim().toUpperCase()
        return { ...item, icd_x: code && known(code) ? code : '' }
      })
      .filter((item) => item.nama.trim() || item.icd_x),
    resep: summary.resep.filter((item) => item.nama_obat.trim()),
  }
}

function duration({ thn, bln, hr }: EpuskesmasSummary['anamnesa']['lama_sakit']): string {
  return [thn && `${thn} tahun`, bln && `${bln} bulan`, hr && `${hr} hari`].filter(Boolean).join(' ')
}

/** One ePuskesmas page as plain text, for copying into that page. */
export function sectionText(summary: EpuskesmasSummary, section: SummarySection): string {
  if (section === 'diagnosa') {
    return summary.diagnosa
      .map((item) => `${item.icd_x ? `${item.icd_x} ` : ''}${item.nama} (${item.jenis.toLowerCase()}, ${item.kasus.toLowerCase()})`)
      .join('\n')
  }
  if (section === 'resep') {
    return summary.resep
      .map((item) => `${item.nama_obat} ${item.signa}${item.jumlah ? ` · jumlah ${item.jumlah}` : ''}`.trim())
      .join('\n')
  }
  const a = summary.anamnesa
  const rows: Array<[string, string]> = [
    ['Keluhan utama', a.keluhan_utama],
    ['Keluhan tambahan', a.keluhan_tambahan],
    ['Lama sakit', duration(a.lama_sakit)],
    ['Riwayat penyakit sekarang', a.riwayat_penyakit.sekarang],
    ['Riwayat penyakit dahulu', a.riwayat_penyakit.dahulu],
    ['Riwayat penyakit keluarga', a.riwayat_penyakit.keluarga],
    ['Alergi obat', a.alergi.obat.join(', ')],
    ['Alergi makanan', a.alergi.makanan.join(', ')],
    ['Alergi udara', a.alergi.udara.join(', ')],
    ['Alergi lainnya', a.alergi.lainnya.join(', ')],
    ['Terapi', a.lainnya.terapi],
    ['Terapi non obat', a.lainnya.terapi_non_obat],
    ['Edukasi', a.lainnya.edukasi],
    ['Rencana tindakan', a.lainnya.rencana_tindakan],
  ]
  return rows
    .filter(([, value]) => value.trim())
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n')
}
