import { AnimatePresence, motion } from 'framer-motion';
import { useState, type ReactNode } from 'react';

import {
  cleanClinicalSummary,
  formatClinicalText,
  formatShortDate,
  getVisibleErrorMessage,
} from '../diagnosisDisplayUtils';
import type { DiagnosisPageProps } from '../diagnosisPageProps';
import { PixelLoader } from '../PixelLoader';
import { ReasonTimeline, type ReasonGroup } from '../ReasonTimeline';
import { diseaseNoteFor, useDiseaseNotes, type DiseaseNote } from '../useDiseaseNotes';
import type { DiagnosisCandidateView, DiagnosisPageViewModel } from '../diagnosisViewModel';

/** Cards on the page: the primary plus the differentials; the rest waits behind "Lainnya". */
const MAX_CARDS = 3;
/** `windowMonths` default in lib/clinical/recurrent-diagnosis.ts; shown so the rule is visible. */
const HISTORY_WINDOW_MONTHS = 12;

// Motion after lab.xevrion.dev: cards arrive one after another ("Reorder list"), sink slightly
// under the finger ("Keycap hint"); the reasons open as the "Activity timeline" (ReasonTimeline).
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
  | 'nextBestAction'
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

const ENGINE_TAG = /\s·\s(MIRA(?: · jangan terlewat)?)$/;
// `MIRA_CANNOT_MISS_TAG` in lib/diagnosis-engine/run-diagnosis.ts; not imported, so the side
// panel does not pull the background's engine modules in.
const CANNOT_MISS_TAG = 'MIRA · jangan terlewat';

function engineTagOf(card: DiagnosisCandidateView): string | null {
  return formatClinicalText(card.displayLabel).match(ENGINE_TAG)?.[1] ?? null;
}

/** A card MIRA marks as cannot-miss, including a history card merged with that engine row. */
function hasCannotMissTag(card: DiagnosisCandidateView): boolean {
  return engineTagOf(card) === CANNOT_MISS_TAG;
}

// A cannot-miss card stands under the MUST NOT MISS label, which already says it; its chip
// would repeat that (Chief, 2026-09-28), so only a history label can show there.
function chipFor(card: DiagnosisCandidateView): string | null {
  if (card.history) return card.history.label;
  if (hasCannotMissTag(card)) return null;
  return engineTagOf(card);
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

/** The reasons of an ordinary card, top to bottom: the history rule, then the evidence. */
function reasonGroups(card: DiagnosisCandidateView): ReasonGroup[] {
  const rule = historyLine(card);
  return [
    ...(rule ? [{ key: 'history', title: 'Riwayat', items: [rule] }] : []),
    { key: 'supports', title: 'Mendukung', items: card.supports },
    { key: 'against', title: 'Menentang', items: card.against },
    { key: 'missing', title: 'Data kurang', items: card.missing },
    { key: 'review', title: 'Catatan', items: card.review },
  ];
}

/**
 * Why a MUST NOT MISS card matters, answering its "Mengapa perlu dipertimbangkan" button without
 * repeating it: the findings that point to it, what missing it risks, and what is still unknown.
 */
function mustNotMissGroups(card: DiagnosisCandidateView, note: DiseaseNote | null): ReasonGroup[] {
  return [
    { key: 'supports', title: 'Temuan yang relevan', items: card.supports },
    { key: 'why', title: 'Bila terlewat', items: note?.complications ?? [] },
    { key: 'missing', title: 'Data kurang', items: card.missing },
  ];
}

function Card({
  card,
  index,
  note,
  mustNotMiss = false,
  onToggle,
  onCheck,
}: {
  card: DiagnosisCandidateView;
  index: number;
  /** The knowledge base's notes for this code: the clamped explanation and, for MUST NOT MISS, the complications. */
  note: DiseaseNote | null;
  mustNotMiss?: boolean;
  onToggle: (id: string) => void;
  /** "Apa yang perlu diperiksa →" on a MUST NOT MISS card. */
  onCheck: () => void;
}) {
  const [open, setOpen] = useState(false);
  const title = formatClinicalText(card.displayLabel).replace(
    /\s·\s(MIRA(?: · jangan terlewat)?|Kronis|Berulang)$/,
    ''
  );
  const chip = chipFor(card);
  const toggleLabel = mustNotMiss ? 'Mengapa perlu dipertimbangkan' : 'Lihat alasan';
  // The select control and the reasons button are siblings: a role="button" element's
  // children are presentational, so a nested button would be unreachable for assistive tech.
  return (
    <motion.div
      // Position only: the card's height change is animated by the reasons timeline itself, and
      // a size layout animation would scale the card (and distort that measurement) meanwhile.
      layout="position"
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
        {note?.definition ? <div className="diagnosis-row-meta line-clamp-3">{note.definition}</div> : null}
        <div className="diagnosis-row-meta flex flex-wrap gap-x-3" data-testid="dx-flow-tally">
          <span>{`✓ Mendukung ${card.supports.length}`}</span>
          <span>{`− Menentang ${card.against.length}`}</span>
          <span>{`? Data kurang ${card.missing.length}`}</span>
        </div>
      </div>
      <div className="flex">
        <button
          type="button"
          className="diagnosis-text-button inline-flex items-center gap-1"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {toggleLabel}
          <motion.span
            aria-hidden="true"
            className="inline-block"
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          >
            ⌄
          </motion.span>
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open ? (
          <ReasonTimeline
            key="reasons"
            groups={mustNotMiss ? mustNotMissGroups(card, note) : reasonGroups(card)}
            footer={
              mustNotMiss ? (
                <button type="button" className="diagnosis-text-button" onClick={onCheck}>
                  Apa yang perlu diperiksa →
                </button>
              ) : undefined
            }
          />
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * One part of the Diagnosis step, after a hairline when another part precedes it. A part whose
 * items carry their own labels (the numbered banding cards) takes no title of its own.
 */
function Section({
  label,
  testId,
  divider,
  children,
}: {
  label?: string;
  testId?: string;
  divider: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {divider ? <div className="console-divider" aria-hidden="true" /> : null}
      <div className="flex flex-col gap-2">
        {label ? (
          <span className="ttv-label" data-testid={testId}>
            {label}
          </span>
        ) : null}
        {children}
      </div>
    </>
  );
}

/**
 * The primary is the chosen diagnosis; before the doctor agrees it is the strongest proposal
 * (the patient's own recurrent diagnosis first, else the engine's top card) and is labelled as a
 * proposal. Cannot-miss cards stand in MUST NOT MISS; everything else is the differential list.
 * Order on the page (Chief's mockup, 2026-09-28): primary, MUST NOT MISS, Diagnosis banding,
 * NEXT BEST STEP.
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
  nextBestAction,
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
  const notes = useDiseaseNotes();

  const sortedCards = sortHistoryFirst(viewModel.candidates.filter((candidate) => candidate.code !== 'R69'));
  const { primary, rest } = splitPrimary(sortedCards);
  // Cannot-miss cards never count against the cap and are never hidden behind "Lainnya".
  const mustNotMiss = rest.filter(hasCannotMissTag);
  const cappable = rest.filter((card) => !hasCannotMissTag(card));
  const differentialCap = Math.max(MAX_CARDS - (primary && !hasCannotMissTag(primary) ? 1 : 0), 0);
  const moreCards = cappable.slice(differentialCap);
  const differentials = [...cappable.slice(0, differentialCap), ...(showAll ? moreCards : [])];
  const visibleNotice = getVisibleErrorMessage(errorMessage);
  const card = (candidate: DiagnosisCandidateView, index: number, isMustNotMiss = false) => (
    <Card
      card={candidate}
      index={index}
      note={diseaseNoteFor(notes, candidate.code)}
      mustNotMiss={isMustNotMiss}
      onToggle={onToggleCandidate}
      onCheck={onCompleteData}
    />
  );

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

          {primary ? (
            <div className="flex flex-col gap-2">
              <span className="ttv-label" data-testid="dx-flow-primary-label">
                {primary.isSelected ? 'Diagnosis utama' : 'Usulan diagnosis utama'}
              </span>
              {card(primary, 0)}
            </div>
          ) : null}

          {/* The MUST NOT MISS label is the only cannot-miss marker; these cards carry no cannot-miss chip. */}
          {mustNotMiss.length > 0 ? (
            <Section label="Must not miss" testId="dx-flow-mnm-label" divider={primary !== null}>
              <div className="diagnosis-list">
                {mustNotMiss.map((candidate, index) => (
                  <div key={candidate.id}>{card(candidate, index + 1, true)}</div>
                ))}
              </div>
            </Section>
          ) : null}

          {differentials.length > 0 || moreCards.length > 0 ? (
            // "Diagnosis banding N" on each card names this part; a section title would repeat it.
            <Section divider={primary !== null || mustNotMiss.length > 0}>
              <div className="diagnosis-list">
                {differentials.map((candidate, index) => (
                  <div key={candidate.id} className="flex flex-col gap-1">
                    <span className="ttv-label" data-testid="dx-flow-differential-label">
                      {`Diagnosis banding ${index + 1}`}
                    </span>
                    {card(candidate, mustNotMiss.length + index + 1)}
                  </div>
                ))}
              </div>
              {!showAll && moreCards.length > 0 ? (
                <div className="flex">
                  <button
                    type="button"
                    className="diagnosis-text-button inline-flex items-center gap-1"
                    onClick={() => setShowAll(true)}
                  >
                    {`Lainnya (${moreCards.length})`}
                    <span aria-hidden="true">⌄</span>
                  </button>
                </div>
              ) : null}
            </Section>
          ) : null}

          {nextBestAction ? (
            <Section label="Next best step" testId="dx-flow-next-label" divider>
              <div className="diagnosis-row-title">{formatClinicalText(nextBestAction.item)}</div>
              {nextBestAction.reason ? (
                <div className="diagnosis-row-meta">{formatClinicalText(nextBestAction.reason)}</div>
              ) : null}
              <div className="flex">
                <button type="button" className="btn-ac-inline btn-ac-inline--sharp" onClick={onCompleteData}>
                  Masukkan hasil
                </button>
              </div>
            </Section>
          ) : null}

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
