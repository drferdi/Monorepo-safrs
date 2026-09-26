import type { Metadata } from 'next'

import { ScreeningLogbook } from './ScreeningLogbook'

export const metadata: Metadata = {
  title: 'Logbook Audit Skrining | Sentra Intelligence',
  description: 'Catatan pengiriman hasil skrining ke dokter',
}

export default function AuditLogbookPage() {
  return (
    <main style={{
      display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div>
        <h1 style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.01em', color: '#EDEDED', margin: 0 }}>
          Logbook Audit Skrining
        </h1>
        <p style={{ fontSize: '13px', color: '#737373', marginTop: '6px', marginBottom: 0 }}>
          Setiap pengiriman hasil skrining ASSIST ke dokter dicatat di sini secara real-time.
        </p>
      </div>
      <ScreeningLogbook />
    </main>
  )
}
