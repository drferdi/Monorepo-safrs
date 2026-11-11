/**
 * Shared date/time formatters for `id-ID` locale.
 * Each export preserves the exact output format of the caller that previously inlined it.
 */

export function formatDateTimeFull(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function formatDateDM(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()}/${d.getMonth() + 1}`
}
