import type { DiagnosisPageProps } from '../diagnosisPageProps';

type Props = Pick<DiagnosisPageProps, 'education' | 'onToggleEducation'> & { onConfirm: () => void };

export function educationSummary(education: DiagnosisPageProps['education']): string {
  const given = education.filter((item) => item.isSelected).length;
  return given > 0 ? `${given} poin diberikan` : 'tanpa edukasi';
}

/**
 * Edukasi, with Terapi on the second page (Chief, 2026-09-29): the knowledge base's patient
 * education for the diagnosis chosen on the first page. The doctor ticks what was given; only
 * that goes to the RME.
 */
export function EducationStep({ education, onToggleEducation, onConfirm }: Props) {
  return (
    <section className="ct-v2-panel flex flex-col gap-3" aria-label="Edukasi">
      <div className="ct-v2-panel-head">
        <h2 className="ttv-section-title">Edukasi</h2>
        <span className="ttv-label">4 / 5</span>
      </div>

      {education.length > 0 ? (
        <div className="diagnosis-list">
          {education.map((item) => (
            <button
              key={item.key}
              type="button"
              className="neu-select diagnosis-medication-row"
              data-testid="dx-flow-education-item"
              aria-pressed={item.isSelected}
              onClick={() => onToggleEducation(item.key)}
            >
              <span className="text-small min-w-0 text-left">{item.text}</span>
              {item.isSelected ? <span className="diagnosis-rank-label">diberikan</span> : null}
            </button>
          ))}
        </div>
      ) : (
        <p className="diagnosis-row-meta">Basis pengetahuan belum punya edukasi untuk diagnosis ini.</p>
      )}

      <div className="flex">
        <button type="button" className="btn-ac-inline btn-ac-inline--sharp" onClick={onConfirm}>
          Lanjut
        </button>
      </div>
    </section>
  );
}
