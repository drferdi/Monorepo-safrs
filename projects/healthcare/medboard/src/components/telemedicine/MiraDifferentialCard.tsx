import type { MiraDifferential } from '@/lib/telemedicine/mira-differential'

const NEXT_ACTION_LABEL = { question: 'Tanyakan', exam: 'Pemeriksaan', test: 'Penunjang' } as const

function formatGeneratedAt(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  })
}

/** MIRA's differential as Assist sent it with the consult; MedBoard shows it, it does not rank it. */
export function MiraDifferentialCard({ differential }: { differential: MiraDifferential }) {
  return (
    <div
      style={{
        padding: 'var(--gap-lg) 0 0',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 6,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
          }}
        >
          Diferensial MIRA
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          dari Assist · {formatGeneratedAt(differential.generated_at)}
        </span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
        Saran pendukung keputusan dari MIRA; keputusan klinis tetap pada dokter.
      </div>

      <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
        {differential.items.map(item => (
          <li key={`${item.rank}-${item.icd10}`} style={{ fontSize: 14, color: 'var(--text)' }}>
            <span style={{ fontWeight: 600 }}>{item.nama}</span>{' '}
            <span style={{ color: 'var(--text-secondary)' }}>
              ({item.icd10}) · {Math.round(item.confidence * 100)}%
            </span>
            {item.cannot_miss && (
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'var(--critical-tint)',
                  color: 'var(--critical)',
                }}
              >
                Jangan terlewat
              </span>
            )}
            {item.rationale && (
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{item.rationale}</div>
            )}
          </li>
        ))}
      </ol>

      {differential.next_best_actions.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>
            Langkah berikutnya
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: 'var(--text)' }}>
            {differential.next_best_actions.map(action => (
              <li key={`${action.kind}-${action.item}`}>
                {NEXT_ACTION_LABEL[action.kind]}: {action.item} — {action.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {differential.missing_information.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>
            Data yang belum ada
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: 'var(--text)' }}>
            {differential.missing_information.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
