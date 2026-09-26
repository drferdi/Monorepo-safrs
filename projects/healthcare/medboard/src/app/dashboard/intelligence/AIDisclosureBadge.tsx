import { AI_DISCLOSURE_LABEL } from '@/lib/intelligence/disclosure'

export function AIDisclosureBadge(): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--c-asesmen)]/40 bg-[var(--c-asesmen)]/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--c-asesmen)]">
      <span>{AI_DISCLOSURE_LABEL}</span>
      <span className="text-[var(--text-main)]">Perlu verifikasi klinisi</span>
    </span>
  )
}
