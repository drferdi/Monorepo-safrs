import { ImageResponse } from 'next/og'

export const alt = 'Our Story — Sentra Healthcare AI'
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
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '13px', color: '#b7ab98' }}>SENTRA HEALTHCARE AI</span>
        <span style={{ color: '#eb5939', fontSize: '13px' }}>→</span>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#eb5939',
            letterSpacing: '0.1em',
          }}
        >
          OUR STORY
        </span>
      </div>

      {/* Headline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: '64px',
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
          }}
        >
          <span>Dibangun oleh Dokter,</span>
          <span>untuk Dokter.</span>
        </div>
        <div style={{ display: 'flex' }}>
          <span
            style={{
              fontSize: '20px',
              color: '#b7ab98',
              maxWidth: '700px',
              lineHeight: 1.6,
            }}
          >
            Dr. Ferdi Iskandar — 15+ tahun pengalaman klinis, 10+ tahun CEO rumah sakit — membangun
            Sentra untuk menyelesaikan krisis keselamatan pasien Indonesia.
          </span>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          borderTop: '1px solid rgba(183,171,152,0.15)',
          paddingTop: '32px',
        }}
      >
        <span style={{ fontSize: '14px', color: '#b7ab98' }}>sentrahai.com/story</span>
      </div>
    </div>,
    { ...size }
  )
}
