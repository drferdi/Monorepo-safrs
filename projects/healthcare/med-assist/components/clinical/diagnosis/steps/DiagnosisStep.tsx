import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

import {
  cleanClinicalSummary,
  formatClinicalText,
  formatShortDate,
  getVisibleErrorMessage,
} from '../diagnosisDisplayUtils';
import type { DiagnosisPageProps } from '../diagnosisPageProps';
import { PixelLoader } from '../PixelLoader';
import { definitionFor, useDiseaseDefinitions } from '../useDiseaseDefinitions';
import type { DiagnosisCandidateView, DiagnosisPageViewModel } from '../diagnosisViewModel';

/** Cards on the page: the primary plus the differentials; the rest waits behind "Lainnya". */
const MAX_CARDS = 3;
const ICD_IN_TEXT = /\(([A-Z]\d{2}(?:\.\d+)?)\)/i;
/** `windowMonths` default in lib/clinical/recurrent-diagnosis.ts; shown so the rule is visible. */
const HISTORY_WINDOW_MONTHS = 12;

// Motion after lab.xevrion.dev: cards arrive one after another ("Reorder list"), sink slightly
// under the finger ("Keycap hint"), and the reasons unfold under their card ("Accordion").
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const cardEnter = {
  hidden: { opacity: 0, y: 10 },
  shown: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: EASE_OUT, delay: index * 0.06 },
  }),
};

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

// The rule that put a history card on the page; whether an engine agrees is not repeated here
// (Chief, 2026-09-28: "tidak perlu ada MIRA setuju").
function historyLine(card: DiagnosisCandidateView): string | null {
  if (!card.history) return null;
  return `${card.history.count}× dalam ${HISTORY_WINDOW_MONTHS} bulan · terakhir ${formatShortDate(card.history.lastSeen)}`;
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
function hasCannotMissTag(card: DiagnosisCandidateView): boolean {
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

function Card({
  card,
  index,
  definition,
  onToggle,
}: {
  card: DiagnosisCandidateView;
  index: number;
  /** The knowledge base's short explanation of the disease, clamped to three lines. */
  definition: string | null;
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const title = formatClinicalText(card.displayLabel).replace(
    /\s·\s(MIRA(?: · jangan terlewat)?|Kronis|Berulang)$/,
    ''
  );
  const chip = chipFor(card);
  // The select control and the "Tap here" button are siblings: a role="button" element's
  // children are presentational, so a nested button would be unreachable for assistive tech.
  return (
    <motion.div
      layout
      layoutId={`dx-card-${card.id}`}
      className="neu-select diagnosis-candidate-row"
      custom={index}
      variants={cardEnter}
      initial="hidden"
      animate="shown"
      whileTap={card.isSelectionBlocked ? undefined : { scale: 0.985 }}
    >
      <div
        className="flex flex-col gap-1"
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
        <div className="diagnosis-row-head">
          <div className="diagnosis-row-title">{title}</div>
          {chip ? <span className="diagnosis-rank-label">{chip}</span> : null}
        </div>
        {definition ? <div className="diagnosis-row-meta line-clamp-3">{definition}</div> : null}
        <div className="diagnosis-row-meta">{historyLine(card) ?? tallyLine(card)}</div>
      </div>
      <div className="flex">
        <button
          type="button"
          className="diagnosis-text-button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          Tap here
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="reasons"
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: EASE_OUT }}
          >
            <div className="diagnosis-evidence-grid">
              <List title="Mendukung" items={card.supports} />
              <List title="Yang tidak mendukung" items={card.against} />
              <List title="Data kurang" items={card.missing} />
              <List title="Catatan" items={card.review} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
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

/**
 * The primary is the chosen diagnosis; before the doctor agrees it is the strongest proposal
 * (the patient's own recurrent diagnosis first, else the engine's top card) and is labelled as a
 * proposal. Everything else is the differential list. On the page the differentials come first,
 * numbered, and the primary slot follows them as the outcome (Chief's order: Temuan, Diagnosis
 * banding 1, Diagnosis banding 2, Diagnosis).
 */
function splitPrimary(cards: DiagnosisCandidateView[]): {
  primary: DiagnosisCandidateView | null;
  rest: DiagnosisCandidateView[];
} {
  // An engine cannot-miss card is a warning, not a proposal: it is never promoted on its own.
  const primary =
    cards.find((card) => card.isSelected) ??
    cards.find((card) => card.history || !hasCannotMissTag(card)) ??
    null;
  return { primary, rest: cards.filter((card) => card !== primary) };
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
  const definitions = useDiseaseDefinitions();

  const sortedCards = sortHistoryFirst(viewModel.candidates.filter((candidate) => candidate.code !== 'R69'));
  const { primary, rest } = splitPrimary(sortedCards);
  // Cannot-miss cards never count against the cap and are never hidden behind "Lainnya": a
  // history card tagged cannot-miss stays with the history group, an engine one closes the list.
  const cappable = rest.filter((card) => !hasCannotMissTag(card));
  const differentialCap = Math.max(MAX_CARDS - (primary && !hasCannotMissTag(primary) ? 1 : 0), 0);
  const differentials = cappable.slice(0, differentialCap);
  const moreCards = cappable.slice(differentialCap);
  const historyCannotMiss = rest.filter((card) => card.history && hasCannotMissTag(card));
  const engineCannotMiss = rest.filter((card) => !card.history && hasCannotMissTag(card));
  const visibleDifferentials = [
    ...differentials,
    ...historyCannotMiss,
    ...engineCannotMiss,
    ...(showAll ? moreCards : []),
  ];
  const visibleCards = [...(primary ? [primary] : []), ...visibleDifferentials];
  const cardCodes = new Set(visibleCards.map((candidate) => candidate.code.toUpperCase()));
  const doNotMissItems = visibleDoNotMissItems(viewModel.evidence.doNotMiss, cardCodes);
  const visibleNotice = getVisibleErrorMessage(errorMessage);

  return (
    <section className="ct-v2-panel flex flex-col gap-3" aria-label="Diagnosis" aria-live="polite">
      <div className="ct-v2-panel-head">
        <div className="flex items-center gap-2">
          <PixelLoader />
          <h2 className="ttv-section-title">Diagnosis</h2>
        </div>
        <span className="ttv-label">2 / 4</span>
      </div>

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
          {recurrentOnlyMessage ? <p className="text-small text-muted">{recurrentOnlyMessage}</p> : null}
          {visibleNotice ? <p className="text-small text-muted">{visibleNotice}</p> : null}

          {viewModel.primary.isInsufficient ? (
            <>
              <p className="text-small text-muted">Data belum cukup untuk menetapkan diagnosis utama</p>
              {viewModel.primary.safestNextAction ? (
                <p className="text-small text-muted">{formatClinicalText(viewModel.primary.safestNextAction)}</p>
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

          {visibleDifferentials.length > 0 ? (
            <div className="diagnosis-list">
              {visibleDifferentials.map((card, index) => (
                <div key={card.id} className="flex flex-col gap-1">
                  <span className="ttv-label" data-testid="dx-flow-differential-label">
                    {`Diagnosis banding ${index + 1}`}
                  </span>
                  <Card card={card} index={index} definition={definitionFor(definitions, card.code)} onToggle={onToggleCandidate} />
                </div>
              ))}
            </div>
          ) : null}

          {!showAll && moreCards.length > 0 ? (
            <div className="flex">
              <button type="button" className="diagnosis-text-button" onClick={() => setShowAll(true)}>
                {`Lainnya (${moreCards.length})`}
              </button>
            </div>
          ) : null}

          {primary ? (
            <div className="flex flex-col gap-1">
              <span className="ttv-label" data-testid="dx-flow-primary-label">
                {primary.isSelected ? 'Diagnosis utama' : 'Usulan diagnosis utama'}
              </span>
              <Card
                card={primary}
                index={visibleDifferentials.length}
                definition={definitionFor(definitions, primary.code)}
                onToggle={onToggleCandidate}
              />
            </div>
          ) : null}

          {doNotMissItems.map((item) => (
            <p key={item} className="text-small ct-v2-danger-text">{`Jangan terlewat: ${item}`}</p>
          ))}

          <div className="flex flex-wrap gap-3">
            <button type="button" className="diagnosis-text-button" onClick={onToggleManualDiagnosisInput}>
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
