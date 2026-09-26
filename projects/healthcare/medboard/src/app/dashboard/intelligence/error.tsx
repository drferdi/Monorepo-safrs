'use client'

type IntelligenceDashboardErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function IntelligenceDashboardError({
  error,
  reset,
}: IntelligenceDashboardErrorProps): React.JSX.Element {
  return (
    <div style={{ width: '100%', maxWidth: 1400, padding: '0 0 64px' }}>
      <div className="page-header">
        <div className="page-title">Intelligence Monitor</div>
        <div className="page-subtitle">Panel belum bisa dimuat</div>
      </div>

      <div
        style={{
          border: '1px solid var(--line-base)',
          borderRadius: 6,
          background: 'var(--bg-card)',
          padding: '32px 24px',
          maxWidth: 600,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--c-critical)',
            marginBottom: 12,
          }}
        >
          Error
        </div>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: 'var(--text-muted)',
            marginBottom: 16,
          }}
        >
          Terjadi gangguan saat menyiapkan route intelligence. Tidak ada data pasien yang
          ditampilkan pada state ini. Silakan muat ulang panel untuk mencoba kembali.
        </p>

        <div
          style={{
            borderRadius: 4,
            border: '1px dashed var(--line-base)',
            padding: '8px 14px',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            marginBottom: 20,
            opacity: 0.6,
          }}
        >
          Ref: {error.digest ?? 'temporary-state'}
        </div>

        <button
          type="button"
          onClick={reset}
          style={{
            borderRadius: 4,
            border: '1px solid var(--line-base)',
            padding: '8px 16px',
            fontSize: 13,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-main)',
            background: 'transparent',
            cursor: 'pointer',
            letterSpacing: '0.05em',
            transition: 'border-color 0.2s',
          }}
        >
          Coba lagi
        </button>
      </div>
    </div>
  )
}
