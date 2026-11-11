export const DEMO_VISITS = [
  { label: '12/09', sbp: 140, dbp: 88, hr: 78, gds: 210 },
  { label: '15/10', sbp: 148, dbp: 92, hr: 82, gds: 238 },
  { label: '22/11', sbp: 155, dbp: 94, hr: 88, gds: 262 },
  { label: 'HARI INI', sbp: 168, dbp: 98, hr: 92, gds: 284 },
]

export const VITAL_PARAMS = [
  {
    label: 'SBP',
    value: 168,
    unit: 'mmHg',
    risk: 'high' as const,
    note: 'Tren naik +28 mmHg dalam 3 kunjungan',
  },
  {
    label: 'DBP',
    value: 98,
    unit: 'mmHg',
    risk: 'moderate' as const,
    note: 'Mendekati hipertensi stage 2',
  },
  { label: 'HR', value: 92, unit: 'bpm', risk: 'low' as const, note: 'Dalam batas normal' },
  {
    label: 'RR',
    value: 22,
    unit: 'x/min',
    risk: 'moderate' as const,
    note: 'Sedikit di atas normal',
  },
  { label: 'TEMP', value: 36.8, unit: '°C', risk: 'low' as const, note: 'Normal' },
  {
    label: 'GDS',
    value: 284,
    unit: 'mg/dL',
    risk: 'critical' as const,
    note: 'Hiperglikemia signifikan',
  },
]

export const ACUTE_RISKS = [
  { label: 'Krisis Hipertensi', value: 72 },
  { label: 'Stroke / ACS', value: 58 },
  { label: 'Krisis Glikemik', value: 45 },
  { label: 'Sepsis-like', value: 12 },
  { label: 'Syok Dekompensasi', value: 8 },
]

export const DRIVERS = [
  'Tekanan darah stage 2 dengan tren kenaikan progresif',
  'Hiperglikemia tidak terkontrol (GDS >250 mg/dL)',
  'Riwayat DM Tipe 2 + Hipertensi — risiko kardiovaskular meningkat',
  'Frekuensi kunjungan meningkat — kemungkinan deteriorasi',
]

export const RECOMMENDATIONS = [
  { priority: 'high' as const, text: 'Evaluasi segera risiko end-organ damage' },
  { priority: 'high' as const, text: 'Kontrol GDS — pertimbangkan insulin sliding scale' },
  { priority: 'medium' as const, text: 'EKG 12 lead untuk evaluasi iskemia' },
]

export const RISK_COLORS: Record<string, string> = {
  low: '#10b981',
  moderate: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
}

export const SLIDE_LABELS = ['Trajectory', 'Prognosis']

export function riskBarColor(value: number): string {
  if (value >= 70) return '#ef4444'
  if (value >= 45) return '#f97316'
  return '#10b981'
}

export function buildPolyline(
  data: number[],
  min: number,
  max: number,
  width: number,
  height: number
): string {
  const pad = 8
  const w = width - pad * 2
  const h = height - pad * 2
  return data
    .map((val, i) => {
      const x = pad + (i / (data.length - 1)) * w
      const y = pad + h - ((val - min) / (max - min)) * h
      return `${x},${y}`
    })
    .join(' ')
}
