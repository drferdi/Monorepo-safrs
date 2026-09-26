import { ImageResponse } from 'next/og'

export const alt = 'Sentra AI — Clinical Decision Support'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    <div
      style={{
        background: '#1e1e1e',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px 80px',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex' }}>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#b7ab98',
          }}
        >
          SENTRA · HEALTHCARE AI
        </span>
      </div>

      {/* Headline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div
          style={{
            fontSize: '72px',
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '-0.03em',
            lineHeight: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span>DIAGNOSA.</span>
          <span>TERAPI. REPEAT.</span>
        </div>
        <div style={{ display: 'flex' }}>
          <span
            style={{
              fontSize: '22px',
              color: '#b7ab98',
              maxWidth: '720px',
              lineHeight: 1.5,
            }}
          >
            AI-powered Clinical Decision Support — mengurangi misdiagnosis 40% untuk layanan
            kesehatan Indonesia.
          </span>
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'flex',
          gap: '48px',
          borderTop: '1px solid rgba(183,171,152,0.15)',
          paddingTop: '32px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '36px', fontWeight: 900, color: '#eb5939' }}>40%</span>
          <span style={{ fontSize: '14px', color: '#b7ab98' }}>Reduksi Misdiagnosis</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '36px', fontWeight: 900, color: '#eb5939' }}>3×</span>
          <span style={{ fontSize: '14px', color: '#b7ab98' }}>Keputusan Lebih Cepat</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '36px', fontWeight: 900, color: '#eb5939' }}>97,2%</span>
          <span style={{ fontSize: '14px', color: '#b7ab98' }}>Akurasi Triase</span>
        </div>
      </div>
    </div>,
    { ...size }
  )
}
