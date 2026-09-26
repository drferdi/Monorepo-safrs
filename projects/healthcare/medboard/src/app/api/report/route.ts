import { NextResponse } from 'next/server'
import { isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

const MONTH_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
]

function periodLabel(year: number, month: number) {
  return `${MONTH_ID[Math.max(0, month - 1)]} '${String(year).slice(-2)}`
}

export async function GET(request: Request) {
  if (!isCrewAuthorizedRequest(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [{ loadLatestSummary }, { readRunHistory }] = await Promise.all([
      import('@/lib/lb1/engine'),
      import('@/lib/lb1/history'),
    ])

    // Coba load summary dari file output terbaru
    const summary = await loadLatestSummary()

    if (summary) {
      const period = periodLabel(summary.periodYear, summary.periodMonth)
      return NextResponse.json({
        source: 'lb1-summary',
        summary: [
          {
            label: 'Total Kunjungan',
            value: String(summary.totalKunjungan),
            unit: period,
          },
          {
            label: 'Rawat Jalan',
            value: String(summary.rawatJalan),
            unit: 'pasien',
          },
          {
            label: 'Rawat Inap',
            value: String(summary.rawatInap),
            unit: 'pasien',
          },
          { label: 'Rujukan', value: String(summary.rujukan), unit: 'kasus' },
        ],
        rows:
          summary.unmappedDx.length > 0
            ? summary.unmappedDx.slice(0, 8).map((code, i) => ({
                rm: `DX-${i + 1}`,
                nama: 'Unmapped Diagnosis',
                tanggal: period,
                diagnosis: `Kode ICD belum termapping: ${code}`,
                icd: code,
                dokter: 'LB1 Engine',
                status: 'RUJUK',
              }))
            : [
                {
                  rm: '-',
                  nama: 'Semua diagnosis terpetakan',
                  tanggal: period,
                  diagnosis: 'Generate LB1 untuk melihat data kunjungan',
                  icd: '-',
                  dokter: 'LB1 Engine',
                  status: 'SELESAI',
                },
              ],
      })
    }

    // Fallback ke history
    const history = await readRunHistory(8)
    if (history.length > 0) {
      const h = history[0]
      const period = periodLabel(h.year, h.month)
      return NextResponse.json({
        source: 'lb1-history',
        summary: [
          {
            label: 'Total Kunjungan',
            value: String(h.validRows + h.invalidRows),
            unit: period,
          },
          {
            label: 'Rawat Jalan',
            value: String(h.rawatJalan ?? h.validRows),
            unit: 'pasien',
          },
          {
            label: 'Rawat Inap',
            value: String(h.rawatInap ?? 0),
            unit: 'pasien',
          },
          {
            label: 'Rujukan',
            value: String(history.filter(x => x.status === 'failed').length),
            unit: 'kasus',
          },
        ],
        rows: history.slice(0, 8).map((entry, i) => ({
          rm: `RUN-${String(i + 1).padStart(3, '0')}`,
          nama: 'Automasi LB1',
          tanggal: new Date(entry.timestamp).toLocaleDateString('id-ID'),
          diagnosis:
            entry.status === 'success'
              ? `Selesai: ${entry.validRows} valid, ${entry.invalidRows} invalid`
              : entry.error || 'Gagal',
          icd: entry.status === 'success' ? 'OK' : 'ERR',
          dokter: 'LB1 Engine',
          status: entry.status === 'success' ? 'SELESAI' : 'RAWAT INAP',
        })),
      })
    }

    // Default kosong
    return NextResponse.json({
      source: 'default',
      summary: [
        { label: 'Total Kunjungan', value: '0', unit: '-' },
        { label: 'Rawat Jalan', value: '0', unit: 'pasien' },
        { label: 'Rawat Inap', value: '0', unit: 'pasien' },
        { label: 'Rujukan', value: '0', unit: 'kasus' },
      ],
      rows: [
        {
          rm: '-',
          nama: 'Belum ada data',
          tanggal: '-',
          diagnosis: 'Klik GENERATE LB1 untuk memuat data kunjungan',
          icd: '-',
          dokter: 'LB1 Engine',
          status: 'SELESAI',
        },
      ],
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to load report',
      },
      { status: 500 }
    )
  }
}
