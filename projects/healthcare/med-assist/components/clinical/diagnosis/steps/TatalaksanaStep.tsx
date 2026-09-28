import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { formatClinicalText, formatShortDate, isInsufficientDiagnosisLabel } from '../diagnosisDisplayUtils';
import type { DiagnosisManualMedicationDraftView, DiagnosisPageProps } from '../diagnosisPageProps';
import type { DiagnosisMedicationView, DiagnosisPageViewModel } from '../diagnosisViewModel';
import { HoldButton, PenCheck, RollingNumber } from '../labMotion';
import { PixelLoader } from '../PixelLoader';
import { PANEL_CLOSE, PANEL_OPEN } from '../ReasonTimeline';
import {
  ROLE_ORDER,
  allergyMatches,
  interactionsFor,
  reviewSafety,
  roleOf,
  type ChronicMedicationView,
  type SafetyReview,
} from '../tatalaksana';

import type { DrugInteraction } from '@/types/api';

type Props = Pick<
  DiagnosisPageProps,
  | 'viewModel'
  | 'manualMedicationDraft'
  | 'manualMedicationOptions'
  | 'onSelectAllMedications'
  | 'onClearMedications'
  | 'onManualMedicationDraftChange'
  | 'onAddManualMedication'
  | 'onToggleMedication'
  | 'onRemoveManualMedication'
  | 'education'
  | 'onToggleEducation'
  | 'chronicMedications'
  | 'interactionCheck'
  | 'allergies'
  | 'followUp'
  | 'safetyNet'
  | 'onDismissMedication'
> & {
  /** "Lanjut tanpa terapi tambahan" was chosen; cleared by the flow when a medication is chosen. */
  skipped: boolean;
  onSkip: () => void;
  onConfirm: () => void;
};

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const ROLE_LABEL = { utama: 'Utama', adjuvant: 'Adjuvant', vitamin: 'Vitamin' } as const;
const pad = (n: number) => String(n).padStart(2, '0');

function selectedMedications(viewModel: DiagnosisPageViewModel): DiagnosisMedicationView[] {
  return visitMedications(viewModel).filter((medication) => medication.isSelected);
}

function visitMedications(viewModel: DiagnosisPageViewModel): DiagnosisMedicationView[] {
  if (viewModel.primary.isInsufficient) return [];
  const seen = new Set<string>();
  return viewModel.therapy.groups
    .filter((group) => !isInsufficientDiagnosisLabel(group.diagnosisLabel))
    .flatMap((group) => group.medications)
    .filter((medication) => (seen.has(medication.key) ? false : (seen.add(medication.key), true)));
}

/** The receipt line once the page is done: the visit medications (or none) and the education given. */
export function tatalaksanaSummary(
  viewModel: DiagnosisPageViewModel,
  education: DiagnosisPageProps['education'],
  skipped: boolean
): string {
  const names = selectedMedications(viewModel).map((medication) => medication.name);
  const head =
    names.length === 0
      ? skipped
        ? 'tanpa terapi tambahan'
        : 'belum ada obat'
      : names.length > 2
        ? `${names.slice(0, 2).join(', ')}, +${names.length - 2}`
        : names.join(', ');
  const given = education.filter((item) => item.isSelected).length;
  return given > 0 ? `${head} · edukasi ${given} poin` : head;
}

/** Height-and-fade panel, the accordion springs of the diagnosis cards. */
function Collapse({ children, testId }: { children: ReactNode; testId?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="overflow-hidden"
      data-testid={testId}
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
      {children}
    </motion.div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <motion.span
      aria-hidden="true"
      className="inline-block"
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
    >
      ⌄
    </motion.span>
  );
}

/**
 * One part of the page. Parts rise in once, one after another, when the page opens; after that
 * only what the doctor opens moves (the console rule, Chief 2026-09-28).
 */
function Part({
  order,
  label,
  count,
  loader,
  testId,
  divider = true,
  children,
}: {
  order: number;
  label: string;
  count?: number;
  loader?: ReactNode;
  testId: string;
  divider?: boolean;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="flex flex-col gap-2"
      data-testid={testId}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: EASE_OUT, delay: order * 0.06 }}
    >
      {divider ? <div className="console-divider dx-tx-divider" aria-hidden="true" /> : null}
      <div className="flex items-center gap-2">
        {loader}
        <span className="ttv-label">{label}</span>
        {count !== undefined ? (
          <span className="ttv-label dx-tx-count">
            <RollingNumber value={count} />
          </span>
        ) : null}
      </div>
      {children}
    </motion.div>
  );
}

function Kv({ rows }: { rows: Array<{ term: string; value: ReactNode; tone?: 'danger' }> }) {
  return (
    <dl className="dx-tx-kv">
      {rows.map((row, index) => (
        <div key={`${row.term}-${index}`} className="contents">
          <dt className="diagnosis-row-meta">{row.term}</dt>
          <dd className={row.tone === 'danger' ? 'diagnosis-row-meta dx-tx-danger' : 'diagnosis-row-meta'}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function interactionText(name: string, interactions: DrugInteraction[], state: DiagnosisPageProps['interactionCheck']['state']): string {
  if (state === 'checking') return 'memeriksa…';
  if (state === 'unavailable') return 'tidak dapat dicek';
  const own = interactionsFor(name, interactions);
  if (own.length === 0) return 'tidak ada';
  return own.map((interaction) => `${interaction.drug_a === name ? interaction.drug_b : interaction.drug_a} (${interaction.severity})`).join(', ');
}

function hasSeriousInteraction(name: string, interactions: DrugInteraction[]): boolean {
  return interactionsFor(name, interactions).some((interaction) => interaction.severity === 'major' || interaction.severity === 'contraindicated');
}

function ChronicCard({
  medication,
  interactionCheck,
  allergies,
}: {
  medication: ChronicMedicationView;
  interactionCheck: DiagnosisPageProps['interactionCheck'];
  allergies: string[];
}) {
  const [open, setOpen] = useState(false);
  const allergy = allergyMatches(medication.name, allergies);
  return (
    <div className="neu-select diagnosis-candidate-row" data-testid="dx-tx-chronic">
      <div className="flex flex-col gap-1">
        <div className="diagnosis-row-head">
          <div className="diagnosis-row-title">{medication.name}</div>
          <button
            type="button"
            className="diagnosis-text-button inline-flex items-center gap-1"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            Review
            <Chevron open={open} />
          </button>
        </div>
        {medication.doseLine ? <div className="diagnosis-row-meta">{medication.doseLine}</div> : null}
        <Kv
          rows={[
            { term: 'Indikasi', value: medication.indication || 'tidak tercatat' },
            {
              term: 'DDI',
              value: interactionText(medication.name, interactionCheck.interactions, interactionCheck.state),
              tone: hasSeriousInteraction(medication.name, interactionCheck.interactions) ? 'danger' : undefined,
            },
            {
              term: 'Kontraindikasi',
              value: allergy.length > 0 ? allergy.map((item) => `alergi ${item}`).join(', ') : 'tidak terdeteksi',
              tone: allergy.length > 0 ? 'danger' : undefined,
            },
          ]}
        />
      </div>
      <AnimatePresence initial={false}>
        {open ? (
          <Collapse key="review" testId="dx-tx-chronic-review">
            {medication.visits.length > 0 ? (
              <ul className="diagnosis-line-list">
                {medication.visits.map((visit, index) => (
                  <li key={`${visit.date}-${index}`}>
                    {[formatShortDate(visit.date), visit.dose, visit.diagnosis].filter(Boolean).join(' · ')}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="diagnosis-row-meta">Riwayat kunjungan tidak mencatat obat ini.</p>
            )}
          </Collapse>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ManualMedicationForm({
  draft,
  options,
  submitLabel,
  onChange,
  onSubmit,
}: {
  draft: DiagnosisManualMedicationDraftView;
  options: string[];
  submitLabel: string;
  onChange: (field: keyof DiagnosisManualMedicationDraftView, value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="diagnosis-form-grid pt-2" data-testid="dx-tx-med-form">
      <input
        value={draft.nama_obat}
        onChange={(event) => onChange('nama_obat', event.target.value)}
        placeholder="Nama obat"
        className="neu-select diagnosis-input"
      />
      <input
        value={draft.dosis}
        onChange={(event) => onChange('dosis', event.target.value)}
        placeholder="Dosis (contoh: 3x1)"
        className="neu-select diagnosis-input"
      />
      <select
        value={draft.aturan_pakai}
        onChange={(event) => onChange('aturan_pakai', event.target.value)}
        className="neu-select diagnosis-input"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <input
        value={draft.durasi}
        onChange={(event) => onChange('durasi', event.target.value)}
        placeholder="Durasi (contoh: 3 hari)"
        className="neu-select diagnosis-input"
      />
      <button type="button" className="btn-ac-inline btn-ac-inline--sharp" onClick={onSubmit}>
        {submitLabel}
      </button>
    </div>
  );
}

function VisitCard({
  medication,
  interactionCheck,
  allergies,
  replacing,
  form,
  onToggle,
  onReplace,
  onRemove,
}: {
  medication: DiagnosisMedicationView;
  interactionCheck: DiagnosisPageProps['interactionCheck'];
  allergies: string[];
  replacing: boolean;
  form: ReactNode;
  onToggle: () => void;
  onReplace: () => void;
  onRemove: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const allergy = allergyMatches(medication.name, allergies);
  const contraindications = [...allergy.map((item) => `alergi ${item}`), ...medication.contraindications];
  const serious = hasSeriousInteraction(medication.name, interactionCheck.interactions);
  return (
    <motion.div
      layout="position"
      className="neu-select diagnosis-candidate-row"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease: EASE_OUT } }}
      exit={
        reduceMotion
          ? { opacity: 0, transition: { duration: 0.15 } }
          : { opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0, transition: { height: PANEL_CLOSE, opacity: { duration: 0.14 } } }
      }
    >
      <motion.div
        whileTap={{ scale: 0.985 }}
        className="flex flex-col gap-1"
        data-testid="dx-tx-visit-med"
        role="button"
        tabIndex={0}
        aria-pressed={medication.isSelected}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="diagnosis-row-head">
          <div className="diagnosis-row-title">{medication.name}</div>
          <PenCheck checked={medication.isSelected} seedText={medication.key} />
        </div>
        <div className="diagnosis-row-meta">{formatClinicalText(medication.doseLine)}</div>
        {medication.sourceLabel === 'MANUAL' ? <div className="diagnosis-row-meta">input dokter</div> : null}
        <Kv
          rows={[
            {
              term: 'DDI',
              value: interactionText(medication.name, interactionCheck.interactions, interactionCheck.state),
              tone: serious ? 'danger' : undefined,
            },
            {
              term: 'Kontraindikasi',
              value: contraindications.length > 0 ? contraindications.join(', ') : 'tidak terdeteksi',
              tone: contraindications.length > 0 ? 'danger' : undefined,
            },
          ]}
        />
      </motion.div>
      <div>
        <div className="flex items-center gap-4">
          <button type="button" className="diagnosis-text-button" aria-expanded={replacing} onClick={onReplace}>
            {replacing ? 'Batal ganti' : 'Ganti'}
          </button>
          <HoldButton label={`Tahan untuk menghapus ${medication.name}`} onComplete={onRemove}>
            Hapus
          </HoldButton>
        </div>
        <AnimatePresence initial={false}>{replacing ? <Collapse key="replace">{form}</Collapse> : null}</AnimatePresence>
      </div>
    </motion.div>
  );
}

function SafetyPart({
  order,
  review,
  interactionCheck,
}: {
  order: number;
  review: SafetyReview;
  interactionCheck: DiagnosisPageProps['interactionCheck'];
}) {
  const [detail, setDetail] = useState(false);
  const checking = interactionCheck.state === 'checking';
  const findings = review.duplicates.length + review.interactions.length + review.contraindications.length;
  // A check that passed is ticked; one that found something is listed in the warning instead.
  // An interaction check that could not run is said plainly, never ticked.
  const lines = [
    review.duplicates.length === 0 ? { key: 'dup', ok: true, text: 'Tidak ada duplikasi terapi' } : null,
    interactionCheck.state === 'unavailable'
      ? { key: 'ddi', ok: false, text: 'Interaksi obat tidak dapat dicek saat ini' }
      : review.interactions.length === 0
        ? { key: 'ddi', ok: true, text: 'Tidak ada interaksi mayor' }
        : null,
    review.contraindications.length === 0
      ? { key: 'ci', ok: true, text: 'Tidak ada kontraindikasi yang terdeteksi' }
      : null,
  ].filter((line): line is { key: string; ok: boolean; text: string } => line !== null);
  return (
    <Part
      order={order}
      label="Keamanan terapi"
      testId="dx-tx-safety"
      // No pixel check when the interaction check could not run: nothing was checked to tick.
      loader={
        interactionCheck.state === 'unavailable' ? undefined : (
          <PixelLoader tone={findings > 0 ? 'danger' : 'accent'} done={!checking} />
        )
      }
    >
      {checking ? (
        <p className="diagnosis-row-meta">Memeriksa interaksi obat…</p>
      ) : (
        <>
          <ul className="flex flex-col gap-1" data-testid="dx-tx-safety-lines">
            {lines.map((line, index) => (
                <li key={line.key} className="flex items-center gap-2 text-small">
                  <PenCheck checked={line.ok} seedText={line.text} delayMs={180 + index * 140} tone={line.ok ? 'accent' : 'danger'} />
                  <span className={line.ok ? '' : 'dx-tx-danger'}>{line.text}</span>
                </li>
              ))}
          </ul>
          {findings > 0 ? (
            <div
              className="neu-textarea neu-textarea--symptom diagnosis-readonly-field diagnosis-readonly-field--danger"
              data-testid="dx-tx-safety-warning"
            >
              <div className="diagnosis-row-head">
                <div className="diagnosis-list-title">⚠ Perlu review</div>
                {review.interactions.length > 0 ? (
                  <button
                    type="button"
                    className="diagnosis-text-button inline-flex items-center gap-1"
                    aria-expanded={detail}
                    onClick={() => setDetail((value) => !value)}
                  >
                    Lihat detail
                    <Chevron open={detail} />
                  </button>
                ) : null}
              </div>
              <ul className="diagnosis-line-list">
                {review.interactions.map((interaction) => (
                  <li key={`${interaction.drug_a}+${interaction.drug_b}`}>
                    {`Interaksi ${interaction.severity}: ${interaction.drug_a} + ${interaction.drug_b}`}
                  </li>
                ))}
                {review.duplicates.map((group) => (
                  <li key={group}>{`Duplikasi: ${group}`}</li>
                ))}
                {review.contraindications.map((entry) => (
                  <li key={`${entry.drug}-${entry.reason}`}>{`Kontraindikasi: ${entry.drug} (${entry.reason})`}</li>
                ))}
              </ul>
              <AnimatePresence initial={false}>
                {detail ? (
                  <Collapse key="detail" testId="dx-tx-safety-detail">
                    <ul className="diagnosis-line-list">
                      {review.interactions.map((interaction) => (
                        <li key={`${interaction.drug_a}+${interaction.drug_b}`}>
                          {[interaction.description, interaction.recommendation].filter(Boolean).join(' ')}
                        </li>
                      ))}
                    </ul>
                  </Collapse>
                ) : null}
              </AnimatePresence>
            </div>
          ) : null}
        </>
      )}
    </Part>
  );
}

function EducationPart({
  order,
  education,
  onToggleEducation,
}: {
  order: number;
  education: DiagnosisPageProps['education'];
  onToggleEducation: (key: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const given = education.filter((item) => item.isSelected);
  const rest = education.filter((item) => !item.isSelected);
  useEffect(() => {
    if (rest.length === 0) setAdding(false);
    if (given.length === 0) setEditing(false);
  }, [rest.length, given.length]);

  return (
    <Part order={order} label="Edukasi" count={given.length} testId="dx-tx-education">
      {education.length === 0 ? (
        <p className="diagnosis-row-meta">Basis pengetahuan belum punya edukasi untuk diagnosis ini.</p>
      ) : (
        // A point moves from the list below into the numbered list: one shared layout per point.
        <LayoutGroup id="dx-tx-education">
          {given.length > 0 ? (
            <ol className="flex flex-col gap-1" data-testid="dx-tx-education-given">
              {given.map((item, index) => (
                <motion.li key={item.key} layoutId={`dx-edu-${item.key}`} className="flex items-start gap-2 text-small">
                  <span className="ttv-label dx-tx-index">{pad(index + 1)}</span>
                  <span className="min-w-0 flex-1">{item.text}</span>
                  {editing ? (
                    <button type="button" className="diagnosis-text-button" onClick={() => onToggleEducation(item.key)}>
                      hapus
                    </button>
                  ) : null}
                </motion.li>
              ))}
            </ol>
          ) : (
            <p className="diagnosis-row-meta">Belum ada edukasi yang diberikan.</p>
          )}
          <div className="flex flex-wrap gap-4">
            {rest.length > 0 ? (
              <button
                type="button"
                className="diagnosis-text-button"
                aria-expanded={adding}
                onClick={() => setAdding((value) => !value)}
              >
                + Tambah edukasi
              </button>
            ) : null}
            {given.length > 0 ? (
              <button
                type="button"
                className="diagnosis-text-button"
                aria-pressed={editing}
                onClick={() => setEditing((value) => !value)}
              >
                {editing ? 'selesai ubah' : 'ubah'}
              </button>
            ) : null}
          </div>
          <AnimatePresence initial={false}>
            {adding ? (
              <Collapse key="picker" testId="dx-tx-education-picker">
                <div className="flex flex-col gap-1">
                  {rest.map((item) => (
                    <motion.button
                      key={item.key}
                      layoutId={`dx-edu-${item.key}`}
                      type="button"
                      className="neu-select diagnosis-medication-row"
                      data-testid="dx-flow-education-item"
                      aria-pressed={false}
                      onClick={() => onToggleEducation(item.key)}
                    >
                      <span className="text-small min-w-0 text-left">{item.text}</span>
                      <PenCheck checked={false} seedText={item.key} />
                    </motion.button>
                  ))}
                </div>
              </Collapse>
            ) : null}
          </AnimatePresence>
        </LayoutGroup>
      )}
    </Part>
  );
}

/**
 * Tatalaksana (Chief's layout, 2026-09-29): chronic therapy, this visit's therapy, its safety,
 * education, follow-up, safety net and a summary, then "Selesai". Motion after lab.xevrion.dev.
 */
export function TatalaksanaStep({
  viewModel,
  manualMedicationDraft,
  manualMedicationOptions,
  onSelectAllMedications,
  onClearMedications,
  onManualMedicationDraftChange,
  onAddManualMedication,
  onToggleMedication,
  onRemoveManualMedication,
  education,
  onToggleEducation,
  chronicMedications,
  interactionCheck,
  allergies,
  followUp,
  safetyNet,
  onDismissMedication,
  skipped,
  onSkip,
  onConfirm,
}: Props) {
  const reduceMotion = useReducedMotion();
  // Where the manual form is open: under "+ Tambah obat", or under the card being replaced.
  const [formFor, setFormFor] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const safetyRef = useRef<HTMLDivElement>(null);
  // "Selesai" morphs into its check first ("Morphing button"), then the page closes.
  const confirm = useRef(onConfirm);
  confirm.current = onConfirm;
  useEffect(() => {
    if (!finishing) return undefined;
    const id = setTimeout(() => confirm.current(), 420);
    return () => clearTimeout(id);
  }, [finishing]);

  const medications = visitMedications(viewModel);
  const manualKeys = medications
    .filter((medication) => medication.sourceLabel === 'MANUAL')
    .map((medication) => medication.key)
    .join('|');
  // A valid manual entry adds a manual medication; that ends the form, and "Ganti" drops the card it replaces.
  const manualCount = useRef(manualKeys ? manualKeys.split('|').length : 0);
  useEffect(() => {
    const keys = manualKeys ? manualKeys.split('|') : [];
    if (keys.length > manualCount.current && formFor) {
      if (formFor !== 'add') {
        if (keys.includes(formFor)) onRemoveManualMedication(formFor);
        else onDismissMedication(formFor);
      }
      setFormFor(null);
    }
    manualCount.current = keys.length;
  }, [manualKeys, formFor, onDismissMedication, onRemoveManualMedication]);

  const proposals = medications.filter((medication) => medication.sourceLabel === 'PROPOSAL');
  const noProposal =
    (viewModel.therapy.state === 'ready' || viewModel.therapy.state === 'error') && proposals.length === 0;
  const chosen = medications.filter((medication) => medication.isSelected);
  const review = reviewSafety({
    chronic: chronicMedications.map((medication) => medication.name),
    visit: chosen.map((medication) => ({ name: medication.name, contraindications: medication.contraindications })),
    interactions: interactionCheck.interactions,
    allergies,
  });
  const findings = review.duplicates.length + review.interactions.length + review.contraindications.length;
  const given = education.filter((item) => item.isSelected).length;
  const decided = chosen.length > 0 || skipped;
  const slots = ROLE_ORDER.map((role, index) => ({
    role,
    number: pad(index + 1),
    items: medications.filter((medication) => roleOf(medication.name, medication.role) === role),
  })).filter((slot) => slot.items.length > 0);

  const form = (submitLabel: string) => (
    <ManualMedicationForm
      draft={manualMedicationDraft}
      options={manualMedicationOptions}
      submitLabel={submitLabel}
      onChange={onManualMedicationDraftChange}
      onSubmit={onAddManualMedication}
    />
  );
  const remove = (medication: DiagnosisMedicationView) =>
    medication.sourceLabel === 'MANUAL' ? onRemoveManualMedication(medication.key) : onDismissMedication(medication.key);

  let order = 0;
  return (
    <section className="ct-v2-panel flex flex-col gap-3" aria-label="Tatalaksana">
      <div className="ct-v2-panel-head">
        <h2 className="ttv-section-title">Tatalaksana</h2>
        <span className="ttv-label">3 / 4</span>
      </div>

      <Part order={order++} label="Terapi kronis" count={chronicMedications.length} testId="dx-tx-chronic-part" divider={false}>
        {chronicMedications.length > 0 ? (
          <div className="diagnosis-list">
            {chronicMedications.map((medication) => (
              <ChronicCard key={medication.key} medication={medication} interactionCheck={interactionCheck} allergies={allergies} />
            ))}
          </div>
        ) : (
          <p className="diagnosis-row-meta">Tidak ada terapi kronis dalam riwayat kunjungan.</p>
        )}
      </Part>

      <Part order={order++} label="Terapi kunjungan ini" count={chosen.length} testId="dx-tx-visit-part">
        {slots.map((slot) => (
          <div key={slot.role} className="flex flex-col gap-1" data-testid={`dx-tx-slot-${slot.role}`}>
            <span className="ttv-label">{`${slot.number} · ${ROLE_LABEL[slot.role]}`}</span>
            <div className="diagnosis-list">
              <AnimatePresence initial={false}>
                {slot.items.map((medication) => (
                  <VisitCard
                    key={medication.key}
                    medication={medication}
                    interactionCheck={interactionCheck}
                    allergies={allergies}
                    replacing={formFor === medication.key}
                    form={form('Ganti obat')}
                    onToggle={() => onToggleMedication(medication.key)}
                    onReplace={() => setFormFor((current) => (current === medication.key ? null : medication.key))}
                    onRemove={() => remove(medication)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
        {noProposal ? <p className="diagnosis-row-meta">Tidak ada usulan obat dari layanan resep.</p> : null}
        <div>
          <button
            type="button"
            className="diagnosis-text-button"
            aria-expanded={formFor === 'add'}
            onClick={() => setFormFor((current) => (current === 'add' ? null : 'add'))}
          >
            + Tambah obat
          </button>
          <AnimatePresence initial={false}>
            {formFor === 'add' ? <Collapse key="add">{form('Tambah obat')}</Collapse> : null}
          </AnimatePresence>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* With no proposal there is nothing to use: only the other decision is offered. */}
          {proposals.length > 0 ? (
            <>
              <button
                type="button"
                className="btn-ac-inline btn-ac-inline--sharp"
                disabled={proposals.every((medication) => medication.isSelected)}
                onClick={onSelectAllMedications}
              >
                Gunakan semua usulan
              </button>
              <span className="diagnosis-row-meta">atau</span>
            </>
          ) : null}
          <button
            type="button"
            className="diagnosis-text-button"
            aria-pressed={skipped}
            onClick={() => {
              onClearMedications();
              onSkip();
              safetyRef.current?.scrollIntoView?.({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
            }}
          >
            Lanjut tanpa terapi tambahan
          </button>
        </div>
      </Part>

      <div ref={safetyRef}>
        <SafetyPart order={order++} review={review} interactionCheck={interactionCheck} />
      </div>

      <EducationPart order={order++} education={education} onToggleEducation={onToggleEducation} />

      <Part order={order++} label="Tindak lanjut" testId="dx-tx-follow-up">
        {followUp.visit.length > 0 || followUp.routine.length > 0 ? (
          <Kv
            rows={[
              ...followUp.visit.map((text) => ({ term: 'Kontrol', value: text })),
              ...followUp.routine.map((entry) => ({ term: `Kontrol rutin · ${entry.name}`, value: entry.text })),
            ]}
          />
        ) : (
          <p className="diagnosis-row-meta">Basis pengetahuan belum punya jadwal kontrol untuk diagnosis ini.</p>
        )}
      </Part>

      <Part order={order++} label="Safety net" testId="dx-tx-safety-net">
        {safetyNet.length > 0 ? (
          <div className="neu-textarea neu-textarea--symptom diagnosis-readonly-field diagnosis-readonly-field--danger">
            <div className="diagnosis-list-title">Segera kembali / rujuk bila</div>
            <ul className="diagnosis-line-list">
              {safetyNet.map((flag) => (
                <li key={flag}>{formatClinicalText(flag)}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="diagnosis-row-meta">Basis pengetahuan belum mencatat kapan pasien harus segera kembali.</p>
        )}
      </Part>

      <Part order={order++} label="Ringkasan" testId="dx-tx-summary">
        <Kv
          rows={[
            { term: 'Diagnosis', value: viewModel.selectedDiagnoses.map((diagnosis) => diagnosis.displayLabel).join(', ') || '-' },
            { term: 'Terapi kronis', value: <><RollingNumber value={chronicMedications.length} /> obat</> },
            {
              term: 'Terapi kunjungan',
              value: skipped && chosen.length === 0 ? 'tanpa terapi tambahan' : <><RollingNumber value={chosen.length} /> obat</>,
            },
            { term: 'Edukasi', value: <><RollingNumber value={given} /> poin</> },
            // A count, not the text again: Tindak lanjut above already says it (one page, one telling).
            {
              term: 'Tindak lanjut',
              value:
                followUp.visit.length + followUp.routine.length > 0 ? (
                  <><RollingNumber value={followUp.visit.length + followUp.routine.length} /> jadwal kontrol</>
                ) : (
                  '-'
                ),
            },
            {
              term: 'Safety check',
              value:
                interactionCheck.state === 'checking'
                  ? 'memeriksa…'
                  : findings > 0
                    ? `⚠ ${findings} perlu review`
                    : '✓ Aman',
              tone: findings > 0 ? 'danger' : undefined,
            },
          ]}
        />
        <div className="flex">
          <motion.button
            type="button"
            layout
            className="btn-ac-inline btn-ac-inline--sharp"
            data-testid="dx-tx-finish"
            disabled={!decided || finishing}
            onClick={() => {
              if (reduceMotion) {
                onConfirm();
                return;
              }
              setFinishing(true);
            }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {finishing ? (
                <motion.span
                  key="done"
                  className="inline-flex items-center gap-1"
                  initial={{ opacity: 0, y: 8, filter: 'blur(2px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.22, ease: EASE_OUT }}
                >
                  ✓ Selesai
                </motion.span>
              ) : (
                <motion.span
                  key="finish"
                  initial={false}
                  exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
                  transition={{ duration: 0.16 }}
                >
                  Selesai
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
        {!decided ? (
          <p className="diagnosis-row-meta">Pilih obat kunjungan ini, atau lanjut tanpa terapi tambahan.</p>
        ) : null}
      </Part>
    </section>
  );
}
