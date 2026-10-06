// Screen text is never all caps (Chief 2026-10-06): a status value shows as "High", not "HIGH".
export function sentenceCase(value: string): string {
  const words = value.replace(/_/g, ' ').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}
