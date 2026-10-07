// The /legal tabs, shared by the legal page and the footer links that open them by hash.

export type LegalTab = 'disclaimer' | 'privacy' | 'terms' | 'security'

export const LEGAL_TABS: { key: LegalTab; label: string }[] = [
  { key: 'disclaimer', label: 'Disclaimer AI' },
  { key: 'privacy', label: 'Privasi data' },
  { key: 'terms', label: 'Ketentuan' },
  { key: 'security', label: 'Keamanan' },
]

export function tabFromHash(hash: string): LegalTab | null {
  return LEGAL_TABS.find((tab) => `#${tab.key}` === hash)?.key ?? null
}
