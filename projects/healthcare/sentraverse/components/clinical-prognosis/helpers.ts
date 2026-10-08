export function scoreColor(v: number): string {
  if (v >= 75) return 'rgba(239,68,68,0.9)'
  if (v >= 50) return 'rgba(249,115,22,0.88)'
  if (v >= 25) return 'rgba(234,179,8,0.84)'
  return 'rgba(16,185,129,0.84)'
}

export function solidScoreColor(v: number): string {
  if (v >= 75) return '#ef4444'
  if (v >= 50) return '#f97316'
  if (v >= 25) return '#eab308'
  return '#10b981'
}

export function survivalColor(p: number): string {
  if (p <= 55) return '#ef4444'
  if (p <= 72) return '#f97316'
  if (p <= 85) return '#eab308'
  return 'rgba(120,168,132,0.9)'
}

export function radarPolygon(values: number[], cx: number, cy: number, maxR: number): string {
  const n = values.length
  return values
    .map((val, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2
      const r = (val / 100) * maxR
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
    })
    .join(' ')
}

export function radarAxis(
  cx: number,
  cy: number,
  maxR: number,
  index: number,
  total: number
): [number, number] {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2
  return [cx + maxR * Math.cos(angle), cy + maxR * Math.sin(angle)]
}
