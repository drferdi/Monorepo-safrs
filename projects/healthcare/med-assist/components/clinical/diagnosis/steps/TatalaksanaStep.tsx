import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { formatClinicalText, formatShortDate, isInsufficientDiagnosisLabel } from '../diagnosisDisplayUtils';
import type { DiagnosisManualMedicationDraftView, DiagnosisPageProps } from '../diagnosisPageProps';
import type { DiagnosisMedicationView, DiagnosisPageViewModel } from '../diagnosisViewModel';
import { HoldButton, PenCheck } from '../labMotion';
import { PixelLoader } from '../PixelLoader';
import {
  ROLE_ORDER,
  allergyMatches,
  explainInteraction,
  interactionsFor,
  nameBesideDose,
  reviewSafety,
  roleOf,
  searchStock,
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

/**
 * One part of the page. Steady like a console (Chief, 2026-09-29: "gak suka ... gerak gerak kaya
 * karet"): what opens appears in place and what closes is gone; nothing grows, slides or springs.
 */
function Part({
  label,
  count,
  loader,
  testId,
  divider = true,
  children,
}: {
  label: string;
  count?: number;
  loader?: ReactNode;
  testId: string;
  divider?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2" data-testid={testId}>
      {divider ? <div className="console-divider dx-tx-divider" aria-hidden="true" /> : null}
      <div className="flex items-center gap-2">
        {loader}
        <span className="ttv-label">{label}</span>
        {count !== undefined ? (
          <span className="ttv-label dx-tx-count">{count}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function Kv({ rows }: { rows: Array<{ term: string; value: ReactNode; tone?: 'warning' }> }) {
  return (
    <dl className="dx-tx-kv">
      {rows.map((row, index) => (
        <div key={`${row.term}-${index}`} className="contents">
          <dt className="diagnosis-row-meta">{row.term}</dt>
          <dd className={row.tone === 'warning' ? 'diagnosis-row-meta dx-tx-warning' : 'diagnosis-row-meta'}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

type TherapyStepKey = 'obat' | 'dosis' | 'indikasi' | 'ddi' | 'kontra';

const STEP_ICONS: Record<TherapyStepKey, string> = {
  obat: 'M3.4 9.2l5.8-5.8a2.9 2.9 0 0 1 4.1 4.1l-5.8 5.8a2.9 2.9 0 0 1-4.1-4.1ZM6.3 6.3l3.4 3.4',
  dosis: 'M8 4.5V8l2.2 1.4M13.25 8a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z',
  indikasi: 'M4 4.5h8M4 8h8M4 11.5h5',
  ddi: 'M6.5 5.2a2.8 2.8 0 1 0 0 5.6M9.5 5.2a2.8 2.8 0 1 1 0 5.6M6.5 8h3',
  kontra: 'M8 5.5v3.2M8 11h.01M7.1 2.6 1.9 11.6a1 1 0 0 0 .9 1.5h10.4a1 1 0 0 0 .9-1.5L8.9 2.6a1 1 0 0 0-1.8 0Z',
};

/** `tone` reds the node and the value; `ownTone` reds the node only (the value colours its parts). */
type TherapyStepRow = { key: TherapyStepKey; label?: string; value: ReactNode; tone?: 'warning'; ownTone?: boolean };

/**
 * A therapy card as the "Activity timeline" of lab.xevrion.dev (Chief, 2026-09-29): name, dose,
 * (indication,) DDI and contraindication are nodes joined by a hairline, drawn at once (no motion,
 * Chief's console rule of the same day).
 */
function TherapyTimeline({ rows }: { rows: TherapyStepRow[] }) {
  return (
    <ol className="dx-timeline dx-tx-timeline">
      {rows.map((row, index) => (
        <li key={row.key} className="dx-timeline__item" data-step={row.key}>
          {index < rows.length - 1 ? <span aria-hidden="true" className="dx-timeline__line" /> : null}
          <span aria-hidden="true" className={row.tone === 'warning' ? 'dx-timeline__node dx-tx-node--warning' : 'dx-timeline__node'}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d={STEP_ICONS[row.key]} />
            </svg>
          </span>
          {row.label ? (
            <div className="dx-tx-step min-w-0 flex-1">
              <span className="diagnosis-row-meta dx-tx-step-label">{row.label}</span>
              <span className={row.tone === 'warning' && !row.ownTone ? 'diagnosis-row-meta dx-tx-warning min-w-0' : 'diagnosis-row-meta dx-tx-step-value min-w-0'}>
                {row.value}
              </span>
            </div>
          ) : (
            <div className="dx-tx-step-head min-w-0 flex-1">{row.value}</div>
          )}
        </li>
      ))}
    </ol>
  );
}

const NO_PAIRS: Set<string> = new Set();

const isSerious = (interaction: DrugInteraction) => interaction.severity === 'major' || interaction.severity === 'contraindicated';

/** One key per drug pair, whichever side it is read from. */
const pairKey = (interaction: DrugInteraction) => [interaction.drug_a, interaction.drug_b].sort().join(' + ');

/**
 * The DDI node: each partner drug with its severity and, on the one card that explains the pair
 * (`explains`), why and what to do (Chief, 2026-09-29: "DDI : beri penjelasan kenapa"). The pair
 * is explained once on the page; the other card names the partner only.
 */
function DdiValue({
  name,
  interactionCheck,
  explains,
}: {
  name: string;
  interactionCheck: DiagnosisPageProps['interactionCheck'];
  explains: Set<string>;
}) {
  if (interactionCheck.state === 'checking') return <>memeriksa…</>;
  if (interactionCheck.state === 'unavailable') return <>tidak dapat dicek</>;
  const own = interactionsFor(name, interactionCheck.interactions);
  if (own.length === 0) return <>tidak ada</>;
  return (
    <span className="flex flex-col gap-1">
      {own.map((interaction) => {
        const key = pairKey(interaction);
        const why = explains.has(key) ? explainInteraction(interaction) : null;
        return (
          <span key={key} className="flex flex-col" data-ddi-reason={why ? key : undefined}>
            <span className={isSerious(interaction) ? 'dx-tx-warning' : undefined}>
              {`${interaction.drug_a === name ? interaction.drug_b : interaction.drug_a} (${interaction.severity})`}
            </span>
            {why ? (
              <>
                <span className="diagnosis-row-meta">{why.reason ?? 'Mekanisme tidak tercatat di DDInter.'}</span>
                {why.advice ? <span className="diagnosis-row-meta">{`Saran: ${why.advice}`}</span> : null}
              </>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}

function hasSeriousInteraction(name: string, interactions: DrugInteraction[]): boolean {
  return interactionsFor(name, interactions).some(isSerious);
}

function ChronicCard({
  medication,
  interactionCheck,
  allergies,
  explains,
}: {
  medication: ChronicMedicationView;
  interactionCheck: DiagnosisPageProps['interactionCheck'];
  allergies: string[];
  explains: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const allergy = allergyMatches(medication.name, allergies);
  return (
    <div className="neu-select diagnosis-candidate-row" data-testid="dx-tx-chronic">
      <TherapyTimeline
        rows={[
          {
            key: 'obat',
            value: (
              <div className="diagnosis-row-head">
                <div className="diagnosis-row-title">{nameBesideDose(medication.name, medication.doseLine)}</div>
                <button
                  type="button"
                  className="diagnosis-text-button inline-flex items-center gap-1"
                  aria-expanded={open}
                  onClick={() => setOpen((value) => !value)}
                >
                  Review
                  <span aria-hidden="true">{open ? '⌃' : '⌄'}</span>
                </button>
              </div>
            ),
          },
          { key: 'dosis', label: 'Dosis', value: medication.doseLine || 'tidak tercatat' },
          { key: 'indikasi', label: 'Indikasi', value: medication.indication || 'tidak tercatat' },
          {
            key: 'ddi',
            label: 'DDI',
            value: <DdiValue name={medication.name} interactionCheck={interactionCheck} explains={explains} />,
            tone: hasSeriousInteraction(medication.name, interactionCheck.interactions) ? 'warning' : undefined,
            ownTone: true,
          },
          {
            key: 'kontra',
            label: 'Kontraindikasi',
            value: allergy.length > 0 ? allergy.map((item) => `alergi ${item}`).join(', ') : 'tidak terdeteksi',
            tone: allergy.length > 0 ? 'warning' : undefined,
          },
        ]}
      />
      {open ? (
        <div data-testid="dx-tx-chronic-review">
          {medication.visits.length > 0 ? (
            // Muted like the timeline labels (Chief, 2026-09-29): history, not today's prescription.
            <ul className="dx-tx-review">
              {medication.visits.map((visit, index) => (
                <li key={`${visit.date}-${index}`} className="dx-tx-review-row">
                  <span className="diagnosis-row-meta dx-tx-step-label">{formatShortDate(visit.date)}</span>
                  {/* Dose and diagnosis each stay whole; a narrow panel breaks between them. */}
                  <span className="diagnosis-row-meta min-w-0">
                    <span className="whitespace-nowrap">{visit.dose}</span>
                    {visit.dose && visit.diagnosis ? ' · ' : null}
                    <span className="whitespace-nowrap">{visit.diagnosis}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="diagnosis-row-meta">Riwayat kunjungan tidak mencatat obat ini.</p>
          )}
        </div>
      ) : null}
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
  // The name field searches the Puskesmas stock as it is typed; a pick fills the name and closes.
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const matches = open ? searchStock(draft.nama_obat) : [];
  // The prescription takes a medicine only with its dose; the button says so instead of failing silently.
  const complete = draft.nama_obat.trim() !== '' && draft.dosis.trim() !== '';
  const pick = (name: string) => {
    onChange('nama_obat', name);
    setOpen(false);
  };
  return (
    <div className="diagnosis-form-grid pt-2" data-testid="dx-tx-med-form">
      <div className="history-dropdown">
        <input
          value={draft.nama_obat}
          onChange={(event) => {
            onChange('nama_obat', event.target.value);
            setOpen(true);
            setActive(0);
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={(event) => {
            if (matches.length === 0) return;
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              const step = event.key === 'ArrowDown' ? 1 : matches.length - 1;
              setActive((index) => (index + step) % matches.length);
            } else if (event.key === 'Enter') {
              event.preventDefault();
              pick(matches[active].name);
            } else if (event.key === 'Escape') {
              setOpen(false);
            }
          }}
          placeholder="Nama obat"
          className="neu-select diagnosis-input"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={matches.length > 0}
          aria-controls={listId}
        />
        {matches.length > 0 ? (
          <div id={listId} role="listbox" aria-label="Stok obat Puskesmas" className="history-dropdown__panel option-grid option-grid--single">
            {matches.map((match, index) => (
              <button
                key={match.name}
                type="button"
                role="option"
                aria-selected={index === active}
                className={`option-item option-item--single${index === active ? ' option-item--selected' : ''}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(match.name)}
              >
                <span className="min-w-0 flex-1">{match.name}</span>
                <span className="diagnosis-row-meta">{match.available ? `${match.stock} ${match.unit}` : 'habis'}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
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
      <button type="button" className="btn-ac-inline btn-ac-inline--sharp" disabled={!complete} onClick={onSubmit}>
        {submitLabel}
      </button>
      {complete ? null : <p className="diagnosis-row-meta">Isi nama obat dan dosis.</p>}
    </div>
  );
}

function VisitCard({
  medication,
  interactionCheck,
  allergies,
  replacing,
  form,
  explains,
  onToggle,
  onReplace,
  onRemove,
}: {
  medication: DiagnosisMedicationView;
  interactionCheck: DiagnosisPageProps['interactionCheck'];
  allergies: string[];
  explains: Set<string>;
  replacing: boolean;
  form: ReactNode;
  onToggle: () => void;
  onReplace: () => void;
  onRemove: () => void;
}) {
  const allergy = allergyMatches(medication.name, allergies);
  const contraindications = [...allergy.map((item) => `alergi ${item}`), ...medication.contraindications];
  const serious = hasSeriousInteraction(medication.name, interactionCheck.interactions);
  return (
    <div className="neu-select diagnosis-candidate-row">
      <div
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
        <TherapyTimeline
          rows={[
            {
              key: 'obat',
              value: (
                <>
                  <div className="diagnosis-row-head">
                    <div className="diagnosis-row-title">{nameBesideDose(medication.name, medication.doseLine)}</div>
                    <PenCheck checked={medication.isSelected} seedText={medication.key} />
                  </div>
                  {medication.sourceLabel === 'MANUAL' ? <div className="diagnosis-row-meta">input dokter</div> : null}
                </>
              ),
            },
            { key: 'dosis', label: 'Dosis', value: formatClinicalText(medication.doseLine) },
            {
              key: 'ddi',
              label: 'DDI',
              value: <DdiValue name={medication.name} interactionCheck={interactionCheck} explains={explains} />,
              tone: serious ? 'warning' : undefined,
              ownTone: true,
            },
            {
              key: 'kontra',
              label: 'Kontraindikasi',
              value: contraindications.length > 0 ? contraindications.join(', ') : 'tidak terdeteksi',
              tone: contraindications.length > 0 ? 'warning' : undefined,
            },
          ]}
        />
      </div>
      <div>
        <div className="flex items-center gap-4">
          <button type="button" className="diagnosis-text-button" aria-expanded={replacing} onClick={onReplace}>
            {replacing ? 'Batal ganti' : 'Ganti'}
          </button>
          <HoldButton label={`Tahan untuk menghapus ${medication.name}`} onComplete={onRemove}>
            Hapus
          </HoldButton>
        </div>
        {replacing ? form : null}
      </div>
    </div>
  );
}

function SafetyPart({
  review,
  interactionCheck,
}: {
  review: SafetyReview;
  interactionCheck: DiagnosisPageProps['interactionCheck'];
}) {
  // The reason is written once, on the card; "Lihat detail" takes the doctor there.
  const showDetail = () => {
    const key = review.interactions[0] ? pairKey(review.interactions[0]) : null;
    const target = [...document.querySelectorAll('[data-ddi-reason]')].find((element) => element.getAttribute('data-ddi-reason') === key);
    if (!(target instanceof HTMLElement)) return;
    target.scrollIntoView?.({ block: 'center' });
  };
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
      label="Keamanan terapi"
      testId="dx-tx-safety"
      // No pixel check when the interaction check could not run: nothing was checked to tick.
      loader={
        interactionCheck.state === 'unavailable' ? undefined : (
          <PixelLoader tone={findings > 0 ? 'warning' : 'accent'} done={!checking} />
        )
      }
    >
      {checking ? (
        <p className="diagnosis-row-meta">Memeriksa interaksi obat…</p>
      ) : (
        <>
          <ul className="flex flex-col gap-1" data-testid="dx-tx-safety-lines">
            {lines.map((line) => (
                <li key={line.key} className="flex items-center gap-2 text-small">
                  <PenCheck checked={line.ok} seedText={line.text} tone={line.ok ? 'accent' : 'warning'} />
                  <span className={line.ok ? '' : 'dx-tx-warning'}>{line.text}</span>
                </li>
              ))}
          </ul>
          {findings > 0 ? (
            <div
              className="neu-textarea neu-textarea--symptom diagnosis-readonly-field diagnosis-readonly-field--warning"
              data-testid="dx-tx-safety-warning"
            >
              <div className="diagnosis-row-head">
                <div className="diagnosis-list-title">⚠ Perlu review</div>
                {review.interactions.length > 0 ? (
                  <button type="button" className="diagnosis-text-button" onClick={showDetail}>
                    Lihat detail
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
            </div>
          ) : null}
        </>
      )}
    </Part>
  );
}

function EducationPart({
  education,
  onToggleEducation,
}: {
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
    <Part label="Edukasi" count={given.length} testId="dx-tx-education">
      {education.length === 0 ? (
        <p className="diagnosis-row-meta">Basis pengetahuan belum punya edukasi untuk diagnosis ini.</p>
      ) : (
        <>
          {given.length > 0 ? (
            <ol className="flex flex-col gap-1" data-testid="dx-tx-education-given">
              {given.map((item, index) => (
                <li key={item.key} className="flex items-start gap-2 text-small">
                  <span className="ttv-label dx-tx-index">{pad(index + 1)}</span>
                  <span className="min-w-0 flex-1">{item.text}</span>
                  {editing ? (
                    <button type="button" className="diagnosis-text-button" onClick={() => onToggleEducation(item.key)}>
                      hapus
                    </button>
                  ) : null}
                </li>
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
          {adding ? (
            <div className="flex flex-col gap-1" data-testid="dx-tx-education-picker">
              {rest.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="neu-select diagnosis-medication-row"
                  data-testid="dx-flow-education-item"
                  aria-pressed={false}
                  onClick={() => onToggleEducation(item.key)}
                >
                  <span className="text-small min-w-0 text-left">{item.text}</span>
                  <PenCheck checked={false} seedText={item.key} />
                </button>
              ))}
            </div>
          ) : null}
        </>
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
  // Where the manual form is open: under "+ Tambah obat", or under the card being replaced.
  const [formFor, setFormFor] = useState<string | null>(null);
  const safetyRef = useRef<HTMLDivElement>(null);

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
  // Each interacting pair is explained on the first card on the page that holds either drug.
  const explained = new Map<string, Set<string>>();
  const pageOrder = [...chronicMedications.map((medication) => medication.name), ...slots.flatMap((slot) => slot.items.map((medication) => medication.name))];
  for (const interaction of interactionCheck.interactions) {
    const owner = pageOrder.find((name) => name === interaction.drug_a || name === interaction.drug_b);
    if (owner) explained.set(owner, new Set([...(explained.get(owner) ?? []), pairKey(interaction)]));
  }
  const explainsFor = (name: string) => explained.get(name) ?? NO_PAIRS;

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

  return (
    <section className="ct-v2-panel flex flex-col gap-3" aria-label="Tatalaksana">
      <div className="ct-v2-panel-head">
        <h2 className="ttv-section-title">Tatalaksana</h2>
        <span className="ttv-label">3 / 4</span>
      </div>

      <Part label="Terapi kronis" count={chronicMedications.length} testId="dx-tx-chronic-part" divider={false}>
        {chronicMedications.length > 0 ? (
          <div className="diagnosis-list">
            {chronicMedications.map((medication) => (
              <ChronicCard
                key={medication.key}
                medication={medication}
                interactionCheck={interactionCheck}
                allergies={allergies}
                explains={explainsFor(medication.name)}
              />
            ))}
          </div>
        ) : (
          <p className="diagnosis-row-meta">Tidak ada terapi kronis dalam riwayat kunjungan.</p>
        )}
      </Part>

      <Part label="Terapi kunjungan ini" count={chosen.length} testId="dx-tx-visit-part">
        {slots.map((slot) => (
          <div key={slot.role} className="flex flex-col gap-1" data-testid={`dx-tx-slot-${slot.role}`}>
            <span className="ttv-label">{`${slot.number} · ${ROLE_LABEL[slot.role]}`}</span>
            <div className="diagnosis-list">
              {slot.items.map((medication) => (
                  <VisitCard
                    key={medication.key}
                    medication={medication}
                    interactionCheck={interactionCheck}
                    explains={explainsFor(medication.name)}
                    allergies={allergies}
                    replacing={formFor === medication.key}
                    form={form('Ganti obat')}
                    onToggle={() => onToggleMedication(medication.key)}
                    onReplace={() => setFormFor((current) => (current === medication.key ? null : medication.key))}
                    onRemove={() => remove(medication)}
                  />
                ))}
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
          {formFor === 'add' ? form('Tambah obat') : null}
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
              safetyRef.current?.scrollIntoView?.({ block: 'start' });
            }}
          >
            Lanjut tanpa terapi tambahan
          </button>
        </div>
      </Part>

      <div ref={safetyRef}>
        <SafetyPart review={review} interactionCheck={interactionCheck} />
      </div>

      <EducationPart education={education} onToggleEducation={onToggleEducation} />

      <Part label="Tindak lanjut" testId="dx-tx-follow-up">
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

      <Part label="Safety net" testId="dx-tx-safety-net">
        {safetyNet.length > 0 ? (
          <div className="neu-textarea neu-textarea--symptom diagnosis-readonly-field diagnosis-readonly-field--warning">
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

      <Part label="Ringkasan" testId="dx-tx-summary">
        <Kv
          rows={[
            { term: 'Diagnosis', value: viewModel.selectedDiagnoses.map((diagnosis) => diagnosis.displayLabel).join(', ') || '-' },
            { term: 'Terapi kronis', value: `${chronicMedications.length} obat` },
            {
              term: 'Terapi kunjungan',
              value: skipped && chosen.length === 0 ? 'tanpa terapi tambahan' : `${chosen.length} obat`,
            },
            { term: 'Edukasi', value: `${given} poin` },
            // A count, not the text again: Tindak lanjut above already says it (one page, one telling).
            {
              term: 'Tindak lanjut',
              value:
                followUp.visit.length + followUp.routine.length > 0
                  ? `${followUp.visit.length + followUp.routine.length} jadwal kontrol`
                  : '-',
            },
            {
              term: 'Safety check',
              value:
                interactionCheck.state === 'checking'
                  ? 'memeriksa…'
                  : findings > 0
                    ? `⚠ ${findings} perlu review`
                    : '✓ Aman',
              tone: findings > 0 ? 'warning' : undefined,
            },
          ]}
        />
        <div className="flex">
          <button
            type="button"
            className="btn-ac-inline btn-ac-inline--sharp"
            data-testid="dx-tx-finish"
            disabled={!decided}
            onClick={onConfirm}
          >
            Selesai
          </button>
        </div>
        {!decided ? (
          <p className="diagnosis-row-meta">Pilih obat kunjungan ini, atau lanjut tanpa terapi tambahan.</p>
        ) : null}
      </Part>
    </section>
  );
}
