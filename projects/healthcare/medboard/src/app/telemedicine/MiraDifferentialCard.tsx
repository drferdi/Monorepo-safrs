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
        borderRadius: 8,
        padding: '10px 14px',
        marginBottom: 12,
        border: '1px solid var(--line-base)',
        background: 'rgba(255,255,255,0.03)',
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
            fontSize: 10,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Diferensial MIRA
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          dari Assist · {formatGeneratedAt(differential.generated_at)}
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
        Saran pendukung keputusan dari MIRA; keputusan klinis tetap pada dokter.
      </div>

      <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
        {differential.items.map(item => (
          <li key={`${item.rank}-${item.icd10}`} style={{ fontSize: 12, color: 'var(--text-main)' }}>
            <span style={{ fontWeight: 600 }}>{item.nama}</span>{' '}
            <span style={{ color: 'var(--text-muted)' }}>
              ({item.icd10}) · {Math.round(item.confidence * 100)}%
            </span>
            {item.cannot_miss && (
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 999,
                  border: '1px solid var(--line-base)',
                }}
              >
                Jangan terlewat
              </span>
            )}
            {item.rationale && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.rationale}</div>
            )}
          </li>
        ))}
      </ol>

      {differential.next_best_actions.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>
            Langkah berikutnya
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: 'var(--text-main)' }}>
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
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>
            Data yang belum ada
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: 'var(--text-main)' }}>
            {differential.missing_information.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
