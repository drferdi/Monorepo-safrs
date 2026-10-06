// "dr. Budi Santoso, Sp.PD" -> "BS": degrees after the comma and dotted titles are skipped.
export function initials(name: string): string {
  const words = name
    .replace(/,.*$/, '')
    .split(/\s+/)
    .filter((word) => word.length > 0 && !word.endsWith('.'))
  if (words.length === 0) return '?'
  const first = words[0][0]
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return `${first}${last}`.toUpperCase()
}
