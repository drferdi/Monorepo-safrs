import { AnimatePresence, motion } from 'framer-motion';
import { useState, type ReactNode } from 'react';

import {
  cardTitle,
  compareAssessments,
  placeLabel,
  snapshotAssessment,
  type CardChange,
} from '../assessmentDelta';
import { BedsideCheck } from '../BedsideCheck';
import { findingChoicesFor, recordedFindingLines, type FindingChoice } from '../bedsideFindings';
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
import { ReasonTimeline, type ReasonGroup } from '../ReasonTimeline';
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
  | 'previousAssessment'
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

/** A MUST NOT MISS card's unknowns: its own gaps plus what MIRA says it lacks, deduplicated. */
function mustNotMissMissing(card: DiagnosisCandidateView, planMissing: string[]): string[] {
  const seen = new Set(card.missing.map((item) => cleanClinicalSummary(item).toLowerCase()));
  return [...card.missing, ...planMissing.filter((item) => !seen.has(cleanClinicalSummary(item).toLowerCase()))];
}

const hasExam = (note: DiseaseNote | null) => (note?.exam.length ?? 0) > 0;

/**
 * Why a MUST NOT MISS card matters, answering its "Mengapa perlu dipertimbangkan" button without
 * repeating it: the findings that point to it, what missing it risks, and what is still unknown.
 * Without a knowledge-base exam the unknowns are what "Apa yang perlu diperiksa" lists to tick,
 * so they are not listed here as well.
 */
function mustNotMissGroups(card: DiagnosisCandidateView, note: DiseaseNote | null, missing: string[]): ReasonGroup[] {
  return [
    { key: 'supports', title: 'Temuan yang relevan', items: card.supports },
    { key: 'why', title: 'Bila terlewat', items: note?.complications ?? [] },
    { key: 'missing', title: 'Data kurang', items: hasExam(note) ? missing : [] },
  ];
}

/**
 * What "Apa yang perlu diperiksa" offers to tick on a MUST NOT MISS card (Chief, 2026-09-28: it
 * had no data): the knowledge base's bedside findings for the code when it has them, otherwise
 * the card's own unknowns. Both are for this card only; MIRA's plan for the whole differential is
 * the page's Next best step, the one "Masukkan hasil" on the page.
 */
function checksFor(note: DiseaseNote | null, missing: string[]): FindingChoice | null {
  const items = hasExam(note)
    ? (note?.exam ?? []).map(trailingPunctuation)
    : missing.map(cleanClinicalSummary).filter(Boolean);
  return items.length > 0 ? { type: 'list', findings: items } : null;
}

/**
 * One step to take: its name, why, and "Masukkan hasil" opening its tick list. The button and
 * the list share one child of the column, so opening adds no gap at once.
 */
function StepToTake({
  action,
  changedAfter,
  onRecord,
}: {
  action: DiagnosisNextBestActionView;
  /** The findings recorded just before the engine changed this step; said as timing, not cause. */
  changedAfter?: string[];
  onRecord: (record: BedsideFindingRecord) => void;
}) {
  const [entering, setEntering] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <div className="diagnosis-row-title">{formatClinicalText(action.item)}</div>
      {action.reason ? <div className="diagnosis-row-meta">{formatClinicalText(action.reason)}</div> : null}
      {changedAfter && changedAfter.length > 0 ? (
        <div className="flex flex-col" data-testid="dx-flow-next-changed">
          <div className="diagnosis-row-meta">Berubah setelah:</div>
          {changedAfter.map((line) => (
            <div key={line} className="diagnosis-row-meta">
              {line}
            </div>
          ))}
        </div>
      ) : null}
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

/** Where the engine had this card before the last recorded finding, when that changed. */
function moveLine(change: CardChange | undefined): string | null {
  if (!change || change.move === 'same') return null;
  if (change.move === 'new' || !change.before) return 'Baru muncul';
  const arrow = change.move === 'up' ? '↑ ' : change.move === 'down' ? '↓ ' : '';
  return `${arrow}sebelumnya ${placeLabel(change.before)}`;
}

/** At most two new evidence lines per side; the rest is in the reasons. */
function NewEvidence({ sign, items, caption }: { sign: string; items: string[]; caption: string }) {
  if (items.length === 0) return null;
  return (
    <>
      {items.slice(0, 2).map((item) => (
        <div key={item} className="diagnosis-row-meta">
          {`${sign} ${formatClinicalText(cleanClinicalSummary(item))}`}
        </div>
      ))}
      <div className="diagnosis-row-meta">{caption}</div>
    </>
  );
}

function Card({
  card,
  index,
  note,
  mustNotMiss = false,
  selectionKey,
  plan,
  change,
  onToggle,
  onRecord,
}: {
  card: DiagnosisCandidateView;
  index: number;
  /** What changed for this card since the last recorded finding; absent when nothing to compare. */
  change?: CardChange;
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
  const title = cardTitle(card);
  const chip = chipFor(card);
  const moved = moveLine(change);
  const missingNow = card.missing.length;
  const missingChanged = change?.missingBefore != null && change.missingBefore !== missingNow;
  const toggleLabel = mustNotMiss ? 'Mengapa perlu dipertimbangkan' : 'Lihat alasan';
  const missing = mustNotMiss ? mustNotMissMissing(card, plan?.missing ?? []) : [];
  const checks = mustNotMiss ? checksFor(note, missing) : null;
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
        {moved ? (
          <div className="diagnosis-row-meta" data-testid="dx-flow-change-place">
            {moved}
          </div>
        ) : null}
        {note?.definition ? <div className="diagnosis-row-meta line-clamp-3">{note.definition}</div> : null}
        <div className="diagnosis-row-meta flex flex-wrap gap-x-3" data-testid="dx-flow-tally">
          <span>{`✓ Mendukung ${card.supports.length}`}</span>
          <span>{`− Menentang ${card.against.length}`}</span>
          <span>{missingChanged ? `? Data kurang ${change?.missingBefore} → ${missingNow}` : `? Data kurang ${missingNow}`}</span>
        </div>
        {change && (change.newSupports.length > 0 || change.newAgainst.length > 0) ? (
          <div className="flex flex-col" data-testid="dx-flow-change-evidence">
            <NewEvidence sign="+" items={change.newSupports} caption="Temuan baru yang mendukung" />
            <NewEvidence sign="−" items={change.newAgainst} caption="Temuan baru yang menentang" />
          </div>
        ) : null}
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
              groups={mustNotMiss ? mustNotMissGroups(card, note, missing) : reasonGroups(card, note)}
              footer={
                checks ? (
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
                        <BedsideCheck
                          key="checks"
                          step={{ kind: 'exam', item: `Pemeriksaan ${title}` }}
                          choice={checks}
                          onSave={(record) => {
                            setChecking(false);
                            onRecord(record);
                          }}
                          onCancel={() => setChecking(false)}
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
  tone,
  divider,
  children,
}: {
  label?: string;
  testId?: string;
  tone?: 'accent' | 'danger';
  divider: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {divider ? <div className="console-divider" aria-hidden="true" /> : null}
      <div className="flex flex-col gap-2">
        {/* A named section carries the same pixel loader as the Diagnosis title (Chief, 2026-09-28). */}
        {label ? (
          <div className="flex items-center gap-2" data-testid={testId}>
            <PixelLoader tone={tone} />
            <span className="ttv-label">{label}</span>
          </div>
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
function arrangeCards(candidates: DiagnosisCandidateView[], choiceOffPage = false) {
  const sorted = sortHistoryFirst(candidates.filter((candidate) => candidate.code !== 'R69'));
  // An engine cannot-miss card is a warning, not a proposal: it is never promoted on its own.
  // A choice with no card (manual, or no longer listed) holds the primary slot itself.
  const primary =
    sorted.find((card) => card.isSelected) ??
    (choiceOffPage ? null : (sorted.find((card) => card.history || !hasCannotMissTag(card)) ?? null));
  const rest = sorted.filter((card) => card !== primary);
  return {
    primary,
    // Cannot-miss cards never count against the cap: every one stands in MUST NOT MISS.
    mustNotMiss: rest.filter(hasCannotMissTag),
    differentials: rest.filter((card) => !hasCannotMissTag(card)).slice(0, MAX_BANDING),
  };
}

const isMiraCard = (card: DiagnosisCandidateView) => engineTagOf(card) !== null || card.history?.engineSource === 'mira';

export function DiagnosisStep({
  viewModel,
  phase,
  errorMessage,
  recurrentOnlyMessage,
  enginePlan,
  previousAssessment,
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

  const selectionKey = viewModel.candidates.filter((candidate) => candidate.isSelected).map((candidate) => candidate.id).join('|');
  // The doctor's choice and the engine's recommendation are kept apart: the page is arranged
  // around the choice, the change indicators and "MIRA sekarang menyarankan" read the engine's own.
  const chosen = viewModel.selectedDiagnoses[0] ?? null;
  const chosenOnPage = viewModel.candidates.some((candidate) => candidate.isSelected);
  const { primary, mustNotMiss, differentials } = arrangeCards(viewModel.candidates, chosen !== null && !chosenOnPage);
  const recommended = arrangeCards(viewModel.candidates.map((candidate) => ({ ...candidate, isSelected: false })));
  const visibleNotice = getVisibleErrorMessage(errorMessage);
  const nextBestAction = enginePlan?.actions[0] ?? null;
  const shown = snapshotAssessment(recommended, nextBestAction?.item ?? null);
  // No comparison against a fallback list: an engine notice means this is not MIRA's answer.
  const delta = previousAssessment && !visibleNotice ? compareAssessments(previousAssessment.snapshot, shown) : null;
  const chosenCodes = viewModel.selectedDiagnoses.map((diagnosis) => formatClinicalText(diagnosis.displayLabel).split(' - ')[0].trim());
  const miraSuggests =
    chosen && recommended.primary && isMiraCard(recommended.primary) && !chosenCodes.includes(recommended.primary.code)
      ? cardTitle(recommended.primary)
      : null;
  const record = (finding: BedsideFindingRecord) => onRecordBedsideFinding(finding, shown);
  // Places are MIRA's; once the doctor has chosen, the page is arranged around the choice, so a
  // place mark could contradict the label above the card. Evidence and Data kurang marks stay, and
  // "MIRA sekarang menyarankan" carries MIRA's primary.
  const changeFor = (code: string): CardChange | undefined => {
    const change = delta?.cards[code];
    return change && chosen ? { ...change, move: 'same' } : change;
  };
  const onPage = new Set([primary, ...mustNotMiss, ...differentials].map((candidate) => candidate?.code));
  const gone = delta?.gone.filter((entry) => !onPage.has(entry.code)) ?? [];
  const card = (candidate: DiagnosisCandidateView, index: number, isMustNotMiss = false) => (
    <Card
      card={candidate}
      index={index}
      note={diseaseNoteFor(notes, candidate.code)}
      mustNotMiss={isMustNotMiss}
      selectionKey={selectionKey}
      plan={enginePlan}
      change={changeFor(candidate.code)}
      onToggle={onToggleCandidate}
      onRecord={record}
    />
  );

  return (
    <section className="ct-v2-panel flex flex-col gap-3" aria-label="Diagnosis" aria-live="polite">
      <div className="ct-v2-panel-head">
        <div className="flex items-center gap-2">
          <PixelLoader tone="accent" />
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

          {primary || chosen ? (
            <div className="flex flex-col gap-2">
              <span className="ttv-label" data-testid="dx-flow-primary-label">
                {primary && !primary.isSelected ? 'Usulan diagnosis utama' : 'Diagnosis utama'}
              </span>
              {primary ? (
                card(primary, 0)
              ) : chosen ? (
                <div className="neu-select diagnosis-candidate-row" data-testid="dx-flow-chosen">
                  <div className="diagnosis-row-title">{formatClinicalText(chosen.displayLabel)}</div>
                </div>
              ) : null}
              {miraSuggests ? (
                <div className="diagnosis-row-meta" data-testid="dx-flow-mira-suggests">
                  {`MIRA sekarang menyarankan: ${miraSuggests}`}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* The MUST NOT MISS label is the only cannot-miss marker; these cards carry no cannot-miss chip. */}
          {mustNotMiss.length > 0 ? (
            <Section label="Must not miss" testId="dx-flow-mnm-label" tone="danger" divider={primary !== null || chosen !== null}>
              <div className="diagnosis-list">
                {mustNotMiss.map((candidate, index) => (
                  <div key={candidate.id}>{card(candidate, index + 1, true)}</div>
                ))}
              </div>
            </Section>
          ) : null}

          {differentials.length > 0 ? (
            // "Diagnosis banding N" on each card names this part; a section title would repeat it.
            <Section divider={primary !== null || chosen !== null || mustNotMiss.length > 0}>
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

          {gone.length > 0 ? (
            <p className="diagnosis-row-meta" data-testid="dx-flow-gone">
              {`Tidak lagi disarankan: ${gone.map((entry) => `${entry.label} (sebelumnya ${placeLabel(entry.before)})`).join('; ')}`}
            </p>
          ) : null}

          {nextBestAction ? (
            <Section label="Next best step" testId="dx-flow-next-label" divider>
              <StepToTake
                key={nextBestAction.item}
                action={nextBestAction}
                changedAfter={delta?.nextStep && previousAssessment ? recordedFindingLines(previousAssessment.finding) : undefined}
                onRecord={record}
              />
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
