import { useState } from 'react';

import {
  cleanClinicalSummary,
  formatClinicalText,
  formatShortDate,
  getVisibleErrorMessage,
} from '../diagnosisDisplayUtils';
import type { DiagnosisPageProps } from '../diagnosisPageProps';
import type { DiagnosisCandidateView, DiagnosisPageViewModel } from '../diagnosisViewModel';

const MAX_CARDS = 3;
const ICD_IN_TEXT = /\(([A-Z]\d{2}(?:\.\d+)?)\)/i;

type Props = Pick<
  DiagnosisPageProps,
  | 'viewModel'
  | 'phase'
  | 'errorMessage'
  | 'recurrentOnlyMessage'
  | 'showManualDiagnosisInput'
  | 'manualIcd'
  | 'manualName'
  | 'onToggleCandidate'
  | 'onToggleManualDiagnosisInput'
  | 'onManualIcdChange'
  | 'onManualNameChange'
  | 'onSubmitManualDiagnosis'
  | 'onCompleteData'
>;

export function diagnosisSummary(viewModel: DiagnosisPageViewModel): string {
  return viewModel.selectedDiagnoses[0]?.displayLabel ?? '';
}

function historyLine(card: DiagnosisCandidateView): string | null {
  if (!card.history) return null;
  const base = `${card.history.count} dari ${card.history.visitsConsidered} kunjungan · terakhir ${formatShortDate(card.history.lastSeen)}`;
  if (!card.history.engineAgrees) return base;
  return `${base} · ${card.history.engineSource === 'mira' ? 'MIRA setuju' : 'engine setuju'}`;
}

function tallyLine(card: DiagnosisCandidateView): string {
  return [`mendukung ${card.supports.length}`, `tidak ${card.against.length}`, `? ${card.missing.length}`].join(' · ');
}

const ENGINE_TAG = /\s·\s(MIRA(?: · jangan terlewat)?)$/;
// `MIRA_CANNOT_MISS_TAG` in lib/diagnosis-engine/run-diagnosis.ts; not imported, so the side
// panel does not pull the background's engine modules in.
const CANNOT_MISS_TAG = 'MIRA · jangan terlewat';

function engineTagOf(card: DiagnosisCandidateView): string | null {
  return formatClinicalText(card.displayLabel).match(ENGINE_TAG)?.[1] ?? null;
}

function chipFor(card: DiagnosisCandidateView): string | null {
  if (card.history) return card.history.label;
  return engineTagOf(card);
}

/** A card MIRA marks as cannot-miss, including a history card merged with that engine row. */
function isCannotMiss(card: DiagnosisCandidateView): boolean {
  return engineTagOf(card) === CANNOT_MISS_TAG;
}

function sortHistoryFirst(candidates: DiagnosisCandidateView[]): DiagnosisCandidateView[] {
  return [...candidates].sort((a, b) => (a.history ? 0 : 1) - (b.history ? 0 : 1));
}

function List({
  title,
  items,
  tone = 'default',
}: {
  title: string;
  items: string[];
  tone?: 'default' | 'warning' | 'danger';
}) {
  const safeItems = items.map(cleanClinicalSummary).filter(Boolean);
  if (safeItems.length === 0) return null;

  return (
    <div
      className={`neu-textarea neu-textarea--symptom diagnosis-readonly-field diagnosis-readonly-field--${tone}`}
    >
      <div className="diagnosis-list-title">{title}</div>
      <ul className="diagnosis-line-list">
        {safeItems.map((item) => (
          <li key={`${title}-${item}`}>{formatClinicalText(item)}</li>
        ))}
      </ul>
    </div>
  );
}

function Card({ card, onToggle }: { card: DiagnosisCandidateView; onToggle: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const title = formatClinicalText(card.displayLabel).replace(
    /\s·\s(MIRA(?: · jangan terlewat)?|Kronis|Berulang)$/,
    ''
  );
  const chip = chipFor(card);
  // The select control and the "alasan" button are siblings: a role="button" element's
  // children are presentational, so a nested button would be unreachable for assistive tech.
  return (
    <div className="dx-flow-card">
      <div
        className="dx-flow-card__select"
        data-testid="dx-flow-card"
        role="button"
        tabIndex={0}
        aria-pressed={card.isSelected}
        aria-disabled={card.isSelectionBlocked || undefined}
        onClick={() => {
          if (card.isSelectionBlocked) return;
          onToggle(card.id);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (card.isSelectionBlocked) return;
            onToggle(card.id);
          }
        }}
      >
        <div className="dx-flow-card__head">
          <p className="dx-flow-card__title">{title}</p>
          {chip ? <span className="dx-flow-chip">{chip}</span> : null}
        </div>
        <p className="dx-flow-muted">{historyLine(card) ?? tallyLine(card)}</p>
      </div>
      <button
        type="button"
        className="dx-flow-link"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        alasan
      </button>
      {open ? (
        <div className="diagnosis-evidence-grid">
          <List title="Mendukung" items={card.supports} />
          <List title="Yang tidak mendukung" items={card.against} />
          <List title="Data kurang" items={card.missing} />
          <List title="Catatan" items={card.review} />
        </div>
      ) : null}
    </div>
  );
}

function visibleDoNotMissItems(doNotMiss: string[], cardCodes: Set<string>): string[] {
  return doNotMiss
    .map(cleanClinicalSummary)
    .filter(Boolean)
    .filter((item) => {
      const match = item.match(ICD_IN_TEXT);
      return !match || !cardCodes.has(match[1].toUpperCase());
    });
}

export function DiagnosisStep({
  viewModel,
  phase,
  errorMessage,
  recurrentOnlyMessage,
  showManualDiagnosisInput,
  manualIcd,
  manualName,
  onToggleCandidate,
  onToggleManualDiagnosisInput,
  onManualIcdChange,
  onManualNameChange,
  onSubmitManualDiagnosis,
  onCompleteData,
}: Props) {
  const [showAll, setShowAll] = useState(false);

  const sortedCards = sortHistoryFirst(viewModel.candidates.filter((candidate) => candidate.code !== 'R69'));
  // Cannot-miss cards are never capped and never hidden behind "Lainnya".
  const cannotMissCards = sortedCards.filter(isCannotMiss);
  const otherCards = sortedCards.filter((card) => !isCannotMiss(card));
  const cappedCards = otherCards.slice(0, MAX_CARDS);
  const moreCards = otherCards.slice(MAX_CARDS);
  const visibleCards = [...cappedCards, ...cannotMissCards, ...(showAll ? moreCards : [])];
  const cardCodes = new Set(visibleCards.map((candidate) => candidate.code.toUpperCase()));
  const doNotMissItems = visibleDoNotMissItems(viewModel.evidence.doNotMiss, cardCodes);
  const visibleNotice = getVisibleErrorMessage(errorMessage);

  return (
    <section className="dx-flow-step" aria-label="Diagnosis" aria-live="polite">
      <h2 className="dx-flow-step__heading">Apa diagnosis utama hari ini?</h2>

      {phase === 'loading' ? (
        <>
          <span className="sr-only">Menyusun diagnosis banding...</span>
          <div className="diagnosis-skeleton" aria-hidden="true">
            {[0, 1].map((index) => (
              <div key={index} className="diagnosis-skeleton__card">
                <span className="diagnosis-skeleton__bar diagnosis-skeleton__bar--title" />
                <span className="diagnosis-skeleton__bar diagnosis-skeleton__bar--tally" />
                <span className="diagnosis-skeleton__bar diagnosis-skeleton__bar--button" />
              </div>
            ))}
          </div>
        </>
      ) : null}

      {phase === 'error' ? (
        <div className="neu-textarea neu-textarea--symptom diagnosis-readonly-field diagnosis-readonly-field--danger">
          {errorMessage || 'Terjadi kesalahan saat memuat data.'}
        </div>
      ) : null}

      {phase === 'ready' ? (
        <>
          {recurrentOnlyMessage ? <p className="dx-flow-muted">{recurrentOnlyMessage}</p> : null}
          {visibleNotice ? <p className="dx-flow-muted">{visibleNotice}</p> : null}

          {viewModel.primary.isInsufficient ? (
            <>
              <p className="dx-flow-muted">Data belum cukup untuk menetapkan diagnosis utama</p>
              {viewModel.primary.safestNextAction ? (
                <p className="dx-flow-muted">{formatClinicalText(viewModel.primary.safestNextAction)}</p>
              ) : null}
              <List title="Perlu dilengkapi" items={viewModel.primary.missingEvidence} tone="warning" />
              <button
                type="button"
                className="btn-ac-inline btn-ac-inline--sharp"
                data-testid="dx-flow-complete-data"
                onClick={onCompleteData}
              >
                {viewModel.primary.primaryCtaLabel}
              </button>
            </>
          ) : null}

          <div className="diagnosis-list">
            {visibleCards.map((card) => (
              <Card key={card.id} card={card} onToggle={onToggleCandidate} />
            ))}
          </div>

          {!showAll && moreCards.length > 0 ? (
            <button type="button" className="dx-flow-link" onClick={() => setShowAll(true)}>
              {`Lainnya (${moreCards.length})`}
            </button>
          ) : null}

          {doNotMissItems.map((item) => (
            <p key={item} className="dx-flow-muted">{`Jangan terlewat: ${item}`}</p>
          ))}

          <div className="dx-flow-links">
            <button type="button" className="dx-flow-link" onClick={onToggleManualDiagnosisInput}>
              {showManualDiagnosisInput ? 'Tutup diagnosis manual' : 'Diagnosis manual ›'}
            </button>
          </div>

          {showManualDiagnosisInput ? (
            <div className="diagnosis-form-grid">
              <input
                value={manualIcd}
                onChange={(event) => onManualIcdChange(event.target.value)}
                placeholder="ICD-X manual (contoh: I10)"
                className="neu-select diagnosis-input"
              />
              <input
                value={manualName}
                onChange={(event) => onManualNameChange(event.target.value)}
                placeholder="Nama diagnosis manual (opsional)"
                className="neu-select diagnosis-input"
              />
              <button
                type="button"
                className="btn-ac-inline btn-ac-inline--sharp"
                onClick={onSubmitManualDiagnosis}
              >
                Gunakan diagnosis manual
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
