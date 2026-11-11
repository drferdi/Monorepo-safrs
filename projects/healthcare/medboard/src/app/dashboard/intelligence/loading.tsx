function LoadingBlock({ height, width }: { height: number; width?: string }): React.JSX.Element {
  return (
    <div
      style={{
        height,
        width: width ?? '100%',
        borderRadius: 4,
        border: '1px solid var(--line-base)',
        background: 'var(--bg-card)',
        animation: 'pulse 2s ease-in-out infinite',
      }}
    />
  )
}

export default function IntelligenceDashboardLoading(): React.JSX.Element {
  return (
    <div style={{ width: '100%', maxWidth: 1400, padding: '0 0 64px' }}>
      {/* Header skeleton */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          <LoadingBlock height={12} width="140px" />
          <LoadingBlock height={28} width="400px" />
          <LoadingBlock height={16} width="520px" />
        </div>
      </div>

      {/* Status strip skeleton */}
      <div style={{ marginBottom: 24 }}>
        <LoadingBlock height={56} />
      </div>

      {/* Safety alert skeleton */}
      <div style={{ marginBottom: 24 }}>
        <LoadingBlock height={80} />
      </div>

      {/* Patient Queue */}
      <div
        style={{
          borderRadius: 6,
          border: '1px solid var(--line-base)',
          background: 'var(--bg-card)',
          padding: 20,
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <LoadingBlock height={10} width="100px" />
          <LoadingBlock height={20} width="160px" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <LoadingBlock height={80} />
          <LoadingBlock height={80} />
          <LoadingBlock height={80} />
        </div>
      </div>

      {/* Insights + Operational */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
        <div
          style={{
            borderRadius: 6,
            border: '1px solid var(--line-base)',
            background: 'var(--bg-card)',
            padding: 20,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            <LoadingBlock height={10} width="120px" />
            <LoadingBlock height={20} width="140px" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <LoadingBlock height={100} />
            <LoadingBlock height={100} />
          </div>
        </div>

        <div
          style={{
            borderRadius: 6,
            border: '1px solid var(--line-base)',
            background: 'var(--bg-card)',
            padding: 20,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            <LoadingBlock height={10} width="80px" />
            <LoadingBlock height={20} width="180px" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <LoadingBlock height={96} />
            <LoadingBlock height={96} />
            <LoadingBlock height={96} />
            <LoadingBlock height={96} />
          </div>
        </div>
      </div>
    </div>
  )
}
