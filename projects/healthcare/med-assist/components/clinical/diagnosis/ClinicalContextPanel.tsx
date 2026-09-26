import type { ReactNode } from 'react';

import {
  cleanClinicalSummary,
  dedupeSignals,
  formatClinicalText,
  shortenClinicalSignal,
} from './diagnosisDisplayUtils';
import type { DiagnosisPageViewModel } from './diagnosisViewModel';

const MAX_CLINICAL_SIGNAL_ITEMS = 10;

const CLINICAL_SIGNAL_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  // "darah tinggi" tidak boleh menangkap frasa "gula darah tinggi" (itu sinyal DM).
  { label: 'HT', pattern: /\b(ht|hipertensi|(?<!gula\s)darah tinggi|tensi tinggi)\b/i },
  // "gula darah" saja bukan diagnosis DM — hasil cek GDS di anamnesis ikut
  // menyebut frasa itu pada pasien non-DM. Wajib ada kualifikasi tinggi/naik.
  { label: 'DM', pattern: /\b(dm|diabetes|kencing manis|gula darah (tinggi|naik))\b/i },
  { label: 'Pusing', pattern: /\bpusing\b|nyeri kepala|sakit kepala/i },
  { label: 'Demam', pattern: /\bdemam\b|febris|panas badan/i },
  { label: 'Batuk', pattern: /\bbatuk\b/i },
  { label: 'Sesak', pattern: /\bsesak\b|napas berat|nafas berat/i },
  { label: 'Nyeri dada', pattern: /nyeri dada|dada sakit/i },
  { label: 'Nyeri kaki', pattern: /nyeri\s*kaki|kaki nyeri|sakit kaki/i },
  { label: 'Nyeri perut', pattern: /nyeri perut|sakit perut/i },
  { label: 'Mual', pattern: /\bmual\b/i },
  { label: 'Muntah', pattern: /\bmuntah\b/i },
  { label: 'Diare', pattern: /\bdiare\b|mencret/i },
  { label: 'Lemas', pattern: /\blemas\b/i },
  { label: 'Nafsu makan turun', pattern: /nafsu makan (menurun|turun|berkurang)/i },
];

export function ClinicalContextPanel({
  viewModel,
  complaintSummary,
  secondaryComplaint,
}: {
  viewModel: DiagnosisPageViewModel;
  complaintSummary: string;
  secondaryComplaint?: string;
}) {
  return (
    <section className="form-group diagnosis-block" aria-label="Konteks Klinis">
      <SectionHeader title="Konteks Klinis" />
      <ReadOnlyPanel>
        <strong>Pasien</strong>
        <span>{formatClinicalText(viewModel.context.patientSummary)}</span>
      </ReadOnlyPanel>
      <ClinicalSignalPanel
        complaintSummary={complaintSummary}
        secondaryComplaint={secondaryComplaint}
        allergySummary={viewModel.context.allergySummary}
        chronicDiagnosisSummary={viewModel.context.chronicDiagnosisSummary}
      />
    </section>
  );
}

function ClinicalSignalPanel({
  complaintSummary,
  secondaryComplaint,
  allergySummary,
  chronicDiagnosisSummary,
}: {
  complaintSummary: string;
  secondaryComplaint?: string;
  allergySummary: string;
  chronicDiagnosisSummary: string;
}) {
  const signals = buildClinicalSignals({
    complaintSummary,
    secondaryComplaint,
    allergySummary,
    chronicDiagnosisSummary,
  });

  return (
    <ReadOnlyPanel>
      <strong>Sinyal klinis</strong>
      <div className="diagnosis-context__grid" data-testid="diagnosis-clinical-signals">
        {signals.map((signal) => (
          <span key={signal} className="diagnosis-chip">
            {signal}
          </span>
        ))}
      </div>
    </ReadOnlyPanel>
  );
}

function buildClinicalSignals({
  complaintSummary,
  secondaryComplaint,
  allergySummary,
  chronicDiagnosisSummary,
}: {
  complaintSummary: string;
  secondaryComplaint?: string;
  allergySummary: string;
  chronicDiagnosisSummary: string;
}): string[] {
  const sourceText =
    `${complaintSummary} ${secondaryComplaint || ''} ${chronicDiagnosisSummary}`.trim();
  const signals: string[] = [];

  for (const item of CLINICAL_SIGNAL_PATTERNS) {
    if (item.pattern.test(sourceText)) {
      signals.push(item.label);
    }
  }

  const cleanedAllergy = cleanClinicalSummary(allergySummary);
  if (cleanedAllergy && !/tidak ada alergi/i.test(cleanedAllergy)) {
    signals.push(`Alergi: ${cleanedAllergy}`);
  }

  const cleanedChronicDiagnosis = cleanClinicalSummary(chronicDiagnosisSummary);
  if (cleanedChronicDiagnosis) {
    for (const diagnosis of cleanedChronicDiagnosis.split(',')) {
      const signal = shortenClinicalSignal(formatClinicalText(diagnosis));
      if (signal) signals.push(signal);
    }
  }

  if (signals.length === 0 && sourceText) {
    signals.push(shortenClinicalSignal(formatClinicalText(sourceText)));
  }

  return dedupeSignals(signals).slice(0, MAX_CLINICAL_SIGNAL_ITEMS);
}

function SectionHeader({ title, status }: { title: string; status?: string }) {
  return (
    <div className="form-group-header form-group-header--cta">
      <div className="form-group-header__title-block">
        <div className="console-label console-label-prominent">{title}</div>
      </div>
      {status ? <span className="field-extracted-indicator">{status}</span> : null}
    </div>
  );
}

function ReadOnlyPanel({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'primary' | 'warning' | 'danger';
}) {
  return (
    <div
      className={`neu-textarea neu-textarea--symptom diagnosis-readonly-field diagnosis-readonly-field--${tone}`}
    >
      {children}
    </div>
  );
}
