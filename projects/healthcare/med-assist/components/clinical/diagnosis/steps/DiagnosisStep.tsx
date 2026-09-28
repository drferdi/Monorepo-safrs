import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState, type ReactNode } from 'react';

import { BedsideCheck } from '../BedsideCheck';
import { findingChoicesFor } from '../bedsideFindings';
import {
  cleanClinicalSummary,
  formatClinicalText,
  formatShortDate,
  getVisibleErrorMessage,
  isGenericDiagnosisUiText,
} from '../diagnosisDisplayUtils';
import type {
  DiagnosisEnginePlanView,
  DiagnosisNextBestActionView,
  DiagnosisPageProps,
} from '../diagnosisPageProps';
import { PixelLoader } from '../PixelLoader';
import { PANEL_CLOSE, PANEL_OPEN, ReasonTimeline, type ReasonGroup } from '../ReasonTimeline';
import { diseaseNoteFor, useDiseaseNotes, type DiseaseNote } from '../useDiseaseNotes';
import type { DiagnosisCandidateView, DiagnosisPageViewModel } from '../diagnosisViewModel';

import type { BedsideFindingRecord } from '@/types/api';

/** Differential cards on the page (Chief, 2026-09-28: "cukup dua saja"); the rest is not shown. */
const MAX_BANDING = 2;
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
  | 'enginePlan'
  | 'onRecordBedsideFinding'
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

// Engine notes that say nothing practical, or belong to another step (therapy is Terapi's).
const GENERIC_NOTE = /^(terapi ppk\b|lakukan pemeriksaan fisik terarah|correlate with examination)/i;
const trailingPunctuation = (value: string) => value.replace(/[\s.,;:]+$/, '');

/**
 * Catatan in practical words (Chief, 2026-09-28: not just "review faring"). When the knowledge
 * base has the disease: what to look for at the bedside (`pemeriksaan_fisik`) and when to refer
 * (`kriteria_rujukan`). Otherwise the engine's own notes, minus generic lines, therapy lines and
 * anything already listed under Data kurang.
 */
function practicalNotes(card: DiagnosisCandidateView, note: DiseaseNote | null): string[] {
  const fromKb = [
    ...(note && note.exam.length > 0
      ? [`Cari saat pemeriksaan: ${note.exam.map(trailingPunctuation).join('; ')}.`]
      : []),
    ...(note?.referral ? [`Rujuk bila: ${note.referral.replace(/^rujuk (jika|bila)\s*/i, '')}`] : []),
  ];
  if (fromKb.length > 0) return fromKb;
  const missing = new Set(card.missing.map((item) => cleanClinicalSummary(item).toLowerCase()));
  return card.review
    .map(cleanClinicalSummary)
    .filter((item) => item && !GENERIC_NOTE.test(item) && !isGenericDiagnosisUiText(item) && !missing.has(item.toLowerCase()));
}

/** The reasons of an ordinary card, top to bottom: the history rule, then the evidence. */
function reasonGroups(card: DiagnosisCandidateView, note: DiseaseNote | null): ReasonGroup[] {
  const rule = historyLine(card);
  return [
    ...(rule ? [{ key: 'history', title: 'Riwayat', items: [rule] }] : []),
    { key: 'supports', title: 'Mendukung', items: card.supports },
    { key: 'against', title: 'Menentang', items: card.against },
    { key: 'missing', title: 'Data kurang', items: card.missing },
    { key: 'review', title: 'Catatan', items: practicalNotes(card, note) },
  ];
}

/**
 * Why a MUST NOT MISS card matters, answering its "Mengapa perlu dipertimbangkan" button without
 * repeating it: the findings that point to it, what missing it risks, and what is still unknown
 * (the card's own gaps plus what MIRA says it lacks).
 */
function mustNotMissGroups(card: DiagnosisCandidateView, note: DiseaseNote | null, planMissing: string[]): ReasonGroup[] {
  const seen = new Set(card.missing.map((item) => cleanClinicalSummary(item).toLowerCase()));
  const extra = planMissing.filter((item) => !seen.has(cleanClinicalSummary(item).toLowerCase()));
  return [
    { key: 'supports', title: 'Temuan yang relevan', items: card.supports },
    { key: 'why', title: 'Bila terlewat', items: note?.complications ?? [] },
    { key: 'missing', title: 'Data kurang', items: [...card.missing, ...extra] },
  ];
}

const NOT_FOUND = 'Tidak ditemukan';

/**
 * What "Apa yang perlu diperiksa" offers on a MUST NOT MISS card (Chief, 2026-09-28: it had no
 * data). The knowledge base's bedside findings for the code, ticked as found, when it has them;
 * otherwise the rest of MIRA's plan (its first step is the page's Next best step and is not
 * repeated). MIRA's plan is for the whole differential, not for this card alone.
 */
function checksFor(note: DiseaseNote | null, plan: DiagnosisEnginePlanView | null | undefined) {
  if (note && note.exam.length > 0) {
    return {
      findings: { options: [NOT_FOUND, ...note.exam.map(trailingPunctuation)], normal: NOT_FOUND, single: false },
      actions: [] as DiagnosisNextBestActionView[],
    };
  }
  return { findings: null, actions: plan?.actions.slice(1) ?? [] };
}

/**
 * One step to take: its name, why, and "Masukkan hasil" opening its tick list. The button and
 * the list share one child of the column, so opening adds no gap at once.
 */
function StepToTake({
  action,
  onRecord,
}: {
  action: DiagnosisNextBestActionView;
  onRecord: (record: BedsideFindingRecord) => void;
}) {
  const [entering, setEntering] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <div className="diagnosis-row-title">{formatClinicalText(action.item)}</div>
      {action.reason ? <div className="diagnosis-row-meta">{formatClinicalText(action.reason)}</div> : null}
      <div>
        <div className="flex">
          <button
            type="button"
            className="btn-ac-inline btn-ac-inline--sharp"
            aria-expanded={entering}
            onClick={() => setEntering((value) => !value)}
          >
            Masukkan hasil
          </button>
        </div>
        <AnimatePresence initial={false}>
          {entering ? (
            <BedsideCheck
              key="check"
              step={action}
              choice={findingChoicesFor(action)}
              onSave={(record) => {
                setEntering(false);
                onRecord(record);
              }}
              onCancel={() => setEntering(false)}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** The panel under "Apa yang perlu diperiksa" on a MUST NOT MISS card. */
function MustNotMissChecks({
  title,
  checks,
  onRecord,
  onClose,
}: {
  title: string;
  checks: ReturnType<typeof checksFor>;
  onRecord: (record: BedsideFindingRecord) => void;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();
  if (checks.findings) {
    return (
      <BedsideCheck
        step={{ kind: 'exam', item: `Pemeriksaan ${title}` }}
        choice={checks.findings}
        onSave={(record) => {
          onClose();
          onRecord(record);
        }}
        onCancel={onClose}
      />
    );
  }
  return (
    <motion.div
      className="overflow-hidden"
      initial={{ height: 0, opacity: 0 }}
      animate={{
        height: 'auto',
        opacity: 1,
        transition: reduceMotion ? { duration: 0.2 } : { height: PANEL_OPEN, opacity: { duration: 0.25 } },
      }}
      exit={{
        height: 0,
        opacity: 0,
        transition: reduceMotion ? { duration: 0.15 } : { height: PANEL_CLOSE, opacity: { duration: 0.18 } },
      }}
    >
      <div className="flex flex-col gap-3 pt-2">
        {checks.actions.map((action) => (
          <StepToTake key={action.item} action={action} onRecord={onRecord} />
        ))}
      </div>
    </motion.div>
  );
}

function Card({
  card,
  index,
  note,
  mustNotMiss = false,
  selectionKey,
  plan,
  onToggle,
  onRecord,
}: {
  card: DiagnosisCandidateView;
  index: number;
  /** Changes only when the chosen diagnosis changes: the one time cards move on the page. */
  selectionKey: string;
  /** The knowledge base's notes for this code: explanation, Catatan and, for MUST NOT MISS, the complications and bedside findings. */
  note: DiseaseNote | null;
  mustNotMiss?: boolean;
  /** MIRA's plan, for a MUST NOT MISS card's Data kurang and "Apa yang perlu diperiksa". */
  plan: DiagnosisEnginePlanView | null | undefined;
  onToggle: (id: string) => void;
  onRecord: (record: BedsideFindingRecord) => void;
}) {
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const title = formatClinicalText(card.displayLabel).replace(
    /\s·\s(MIRA(?: · jangan terlewat)?|Kronis|Berulang)$/,
    ''
  );
  const chip = chipFor(card);
  const toggleLabel = mustNotMiss ? 'Mengapa perlu dipertimbangkan' : 'Lihat alasan';
  const checks = mustNotMiss ? checksFor(note, plan) : null;
  const hasChecks = checks !== null && (checks.findings !== null || checks.actions.length > 0);
  // The select control and the reasons button are siblings: a role="button" element's
  // children are presentational, so a nested button would be unreachable for assistive tech.
  // The column behaves like a console (Chief, 2026-09-28): opening the reasons grows only this
  // card's reasons panel. Cards animate position only when the chosen diagnosis changes
  // (`layoutDependency`), never because a card above grew, and only the select control sinks
  // under a tap, so pressing "Lihat alasan" does not shrink the card.
  return (
    <motion.div
      layout="position"
      layoutId={`dx-card-${card.id}`}
      layoutDependency={selectionKey}
      className="neu-select diagnosis-candidate-row"
      custom={index}
      variants={cardEnter}
      initial="hidden"
      animate="shown"
    >
      <motion.div
        whileTap={card.isSelectionBlocked ? undefined : { scale: 0.985 }}
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
      </motion.div>
      {/* One grid child for the button and its reasons: a reasons panel added as its own child
          would add the card's 8 px grid gap at once on open and drop it at once on close. */}
      <div>
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
              groups={mustNotMiss ? mustNotMissGroups(card, note, plan?.missing ?? []) : reasonGroups(card, note)}
              footer={
                checks && hasChecks ? (
                  <div className="flex-1">
                    <div className="flex">
                      <button
                        type="button"
                        className="diagnosis-text-button inline-flex items-center gap-1"
                        aria-expanded={checking}
                        onClick={() => setChecking((value) => !value)}
                      >
                        Apa yang perlu diperiksa
                        <motion.span
                          aria-hidden="true"
                          className="inline-block"
                          animate={{ rotate: checking ? 180 : 0 }}
                          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                        >
                          ⌄
                        </motion.span>
                      </button>
                    </div>
                    <AnimatePresence initial={false}>
                      {checking ? (
                        <MustNotMissChecks
                          key="checks"
                          title={title}
                          checks={checks}
                          onRecord={onRecord}
                          onClose={() => setChecking(false)}
                        />
                      ) : null}
                    </AnimatePresence>
                  </div>
                ) : undefined
              }
            />
          ) : null}
        </AnimatePresence>
      </div>
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
  enginePlan,
  onRecordBedsideFinding,
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
  const notes = useDiseaseNotes();

  const sortedCards = sortHistoryFirst(viewModel.candidates.filter((candidate) => candidate.code !== 'R69'));
  const selectionKey = sortedCards.filter((candidate) => candidate.isSelected).map((candidate) => candidate.id).join('|');
  const { primary, rest } = splitPrimary(sortedCards);
  // Cannot-miss cards never count against the cap: every one stands in MUST NOT MISS.
  const mustNotMiss = rest.filter(hasCannotMissTag);
  const differentials = rest.filter((card) => !hasCannotMissTag(card)).slice(0, MAX_BANDING);
  const visibleNotice = getVisibleErrorMessage(errorMessage);
  const nextBestAction = enginePlan?.actions[0] ?? null;
  const card = (candidate: DiagnosisCandidateView, index: number, isMustNotMiss = false) => (
    <Card
      card={candidate}
      index={index}
      note={diseaseNoteFor(notes, candidate.code)}
      mustNotMiss={isMustNotMiss}
      selectionKey={selectionKey}
      plan={enginePlan}
      onToggle={onToggleCandidate}
      onRecord={onRecordBedsideFinding}
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

          {differentials.length > 0 ? (
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
            </Section>
          ) : null}

          {nextBestAction ? (
            <Section label="Next best step" testId="dx-flow-next-label" divider>
              <StepToTake key={nextBestAction.item} action={nextBestAction} onRecord={onRecordBedsideFinding} />
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
