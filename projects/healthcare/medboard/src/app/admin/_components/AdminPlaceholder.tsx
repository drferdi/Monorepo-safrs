'use client'

export default function AdminPlaceholder({
  section,
  description,
  prerequisites,
}: {
  section: string
  description: string
  prerequisites: string[]
}) {
  return (
    <div
      style={{
        padding: '60px 40px',
        textAlign: 'center',
        borderRadius: 10,
        border: '1px solid var(--line-base)',
        background: 'var(--bg-nav)',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 10,
          letterSpacing: '0.2em',
          color: 'rgba(230,126,34,0.5)',
          fontWeight: 600,
        }}
      >
        COMING SOON
      </p>
      <h2
        style={{
          margin: '10px 0 8px',
          fontSize: 20,
          fontWeight: 600,
          color: 'var(--text-main)',
        }}
      >
        {section}
      </h2>
      <p
        style={{
          margin: '0 auto 24px',
          maxWidth: 460,
          fontSize: 12,
          color: 'var(--text-muted)',
          lineHeight: 1.6,
        }}
      >
        {description}
      </p>
      {prerequisites.length > 0 && (
        <div
          style={{
            display: 'inline-block',
            textAlign: 'left',
            padding: '14px 20px',
            borderRadius: 8,
            border: '1px solid var(--line-base)',
            background: 'var(--bg-canvas)',
          }}
        >
          <p
            style={{
              margin: '0 0 8px',
              fontSize: 9,
              letterSpacing: '0.15em',
              color: 'var(--text-muted)',
              fontWeight: 600,
            }}
          >
            PREREQUISITES
          </p>
          {prerequisites.map((p, i) => (
            <p
              key={i}
              style={{
                margin: '4px 0',
                fontSize: 11,
                color: 'var(--text-muted)',
                opacity: 0.7,
              }}
            >
              {i + 1}. {p}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
