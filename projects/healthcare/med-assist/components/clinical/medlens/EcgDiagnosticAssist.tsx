import { medlensClient } from '@/lib/api/medlens-client';
import type { MedlensRuntimeStatus } from '@/lib/api/medlens-client';
import type {
  MedlensLeadMeasurementEvidence,
  MedlensEcgAnalyzeResponse,
  MedlensWaveformOutput,
} from '@/lib/clinical/medlens/ecg-types';
import {
  MEDLENS_ECG_DISCLAIMER,
  MEDLENS_ECG_FAIL_CLOSED_MESSAGE,
  MEDLENS_WAVEFORM_NOT_IMPLEMENTED_REASON,
} from '@/lib/clinical/medlens/ecg-types';
import { Clipboard, FileUp, Loader2 } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

const MEDLENS_LABEL_CLASS = 'sentra-section-label';
const MEDLENS_SECTION_TITLE_CLASS = 'sentra-autosens-title';
const MEDLENS_NOTE_CLASS = 'sentra-footer-note text-left not-italic';
const MEDLENS_HINT_CLASS = 'sentra-autosens-hint not-italic';

function formatNullable(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'Not available';
  return String(value);
}

function formatBoolean(value: boolean): string {
  return value ? 'Yes' : 'No';
}

function buildErrorState(error: string): { title: string; guidance: string } {
  if (/sesi|login ulang/i.test(error)) {
    return {
      title: 'Koneksi MedLens belum aktif',
      guidance: 'Hubungi admin untuk mengaktifkan akses MedLens pada sesi ini.',
    };
  }

  if (/belum tersedia|belum dapat dijangkau|tidak tersedia/i.test(error)) {
    return {
      title: 'MedLens belum tersedia',
      guidance: 'Coba lagi nanti atau hubungi admin.',
    };
  }

  if (/tidak didukung/i.test(error)) {
    return {
      title: 'File belum didukung',
      guidance: 'Gunakan file ECG printout berformat PNG, JPG, atau JPEG.',
    };
  }

  return {
    title: 'Analisis belum dapat diproses',
    guidance: 'Periksa ulang file ECG printout lalu coba lagi.',
  };
}

function buildRuntimeState(
  runtimeStatus: MedlensRuntimeStatus | null | undefined
): { title: string; guidance: string } | null {
  if (!runtimeStatus || runtimeStatus.readiness === 'ready') {
    return null;
  }

  if (runtimeStatus.readiness === 'auth_required') {
    return {
      title: 'Koneksi MedLens belum aktif',
      guidance: 'Hubungi admin untuk mengaktifkan akses MedLens pada sesi ini.',
    };
  }

  if (runtimeStatus.readiness === 'unavailable') {
    return {
      title: 'MedLens belum tersedia',
      guidance: 'Coba lagi nanti atau hubungi admin.',
    };
  }

  if (runtimeStatus.readiness === 'server_unreachable') {
    return {
      title: 'Server MedLens belum terjangkau',
      guidance: 'Periksa koneksi workspace lalu coba lagi.',
    };
  }

  return {
    title: 'Verifikasi MedLens belum berhasil',
    guidance: 'Coba cek ulang koneksi MedLens sebelum menganalisis file.',
  };
}

function humanizeFailedAssertion(assertion: string): string {
  switch (assertion) {
    case 'MISSING_OR_INVALID_SOURCE_IMAGE_HASH':
      return 'source image hash';
    case 'MISSING_RAW_OCR_TEXT':
      return 'raw OCR text';
    case 'IMAGE_UNREADABLE':
      return 'readable image quality';
    case 'MISSING_GRID_CALIBRATION':
    case 'GRID_NOT_CALIBRATED':
      return 'grid calibration';
    case 'INSUFFICIENT_12_LEAD_REGION_DETECTION':
      return 'lead segmentation';
    case 'INSUFFICIENT_WAVEFORM_TRACE_EXTRACTION':
      return 'waveform trace extraction';
    case 'MISSING_LEAD_LEVEL_WAVEFORM_MEASUREMENTS':
      return 'lead-level measurements';
    case 'TEXT_ONLY_OCR_CANNOT_SUPPORT_CLINICAL_OUTPUT':
      return 'text-only OCR cannot be used as primary evidence';
    case 'UNSAFE_LEGACY_FIELD_DETECTED':
      return 'legacy clinical summary path blocked';
    case 'RHYTHM_STRIP_UNAVAILABLE_FOR_RHYTHM_CLAIM':
      return 'rhythm strip evidence';
    case 'UNSUPPORTED_ST_CLAIM_WITHOUT_BASELINE_OR_J_POINT_EVIDENCE':
      return 'baseline and J-point evidence for ST claim';
    default:
      return assertion;
  }
}

function buildBlockedPanelState(
  output: MedlensWaveformOutput | null | undefined
): {
  title: string;
  guidance: string;
  requiredEvidence: string[];
  warnings: string[];
} | null {
  if (!output || output.status !== 'blocked') {
    return null;
  }

  const requiredEvidence = Array.from(
    new Set(output.failedAssertions.map(humanizeFailedAssertion).filter(Boolean))
  );
  const warnings = Array.from(new Set(output.warnings.filter(Boolean)));

  return {
    title: 'Waveform Evidence Incomplete',
    guidance:
      output.reason === MEDLENS_WAVEFORM_NOT_IMPLEMENTED_REASON
        ? `${MEDLENS_ECG_FAIL_CLOSED_MESSAGE} Waveform extraction pipeline belum diimplementasikan pada runtime ini.`
        : MEDLENS_ECG_FAIL_CLOSED_MESSAGE,
    requiredEvidence,
    warnings,
  };
}

function buildClipboardSummary(result: MedlensEcgAnalyzeResponse): string {
  const waveformOutput = result.waveform_review_output;
  const waveformPacket = result.waveform_evidence_packet;

  if (waveformOutput.status === 'blocked') {
    return [
      'MedLens blocked',
      MEDLENS_ECG_FAIL_CLOSED_MESSAGE,
      `Reason: ${waveformOutput.reason}`,
      'Required missing evidence:',
      ...waveformOutput.failedAssertions.map((item) => `- ${humanizeFailedAssertion(item)}`),
      waveformPacket.secondaryOcr?.rawText
        ? `Secondary OCR (not used for clinical interpretation):\n${waveformPacket.secondaryOcr.rawText}`
        : null,
    ]
      .filter(Boolean)
      .join('\n');
  }

  return [
    'MedLens physician-review packet',
    `Source image hash: ${waveformOutput.sourceImageHash}`,
    ...waveformOutput.leadMeasurements.map(
      (measurement) =>
        `${measurement.lead}: ST=${formatNullable(measurement.stDeviationMm)} mm, QRS=${formatNullable(
          measurement.qrsPolarity
        )}, T=${formatNullable(measurement.tWavePattern)}`
    ),
  ].join('\n');
}

function FieldCard({
  label,
  value,
}: {
  label: string;
  value: string | number | boolean | null | undefined;
}): JSX.Element {
  const formatted = formatNullable(value);
  const isEmpty = formatted === 'Not available';

  return (
    <div className="rounded-lg border border-[var(--sentra-border)] bg-[var(--neu-inset-bg)] p-3 shadow-light-soft-inset">
      <div className={MEDLENS_LABEL_CLASS}>{label}</div>
      <div
        className={`mt-1 font-[var(--font-field)] text-[12px] ${
          isEmpty ? 'text-[var(--text-muted)]' : 'text-[var(--text-main)]'
        }`}
      >
        {formatted}
      </div>
    </div>
  );
}

function ReviewBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="rounded-lg border border-[var(--sentra-border)] bg-[var(--neu-inset-bg)] p-3 shadow-light-soft-inset">
      <h3 className={MEDLENS_SECTION_TITLE_CLASS}>{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function LeadMeasurementCard({
  measurement,
}: {
  measurement: MedlensLeadMeasurementEvidence;
}): JSX.Element {
  return (
    <div className="rounded-lg border border-[var(--sentra-border)] bg-[var(--sentra-card)] p-3 shadow-light-soft">
      <div className={MEDLENS_LABEL_CLASS}>Lead {measurement.lead}</div>
      <div className={`${MEDLENS_NOTE_CLASS} mt-2`}>ST deviation: {formatNullable(measurement.stDeviationMm)} mm</div>
      <div className={MEDLENS_NOTE_CLASS}>QRS polarity: {formatNullable(measurement.qrsPolarity)}</div>
      <div className={MEDLENS_NOTE_CLASS}>T-wave pattern: {formatNullable(measurement.tWavePattern)}</div>
      <div className={MEDLENS_NOTE_CLASS}>Q wave present: {formatNullable(measurement.qWavePresent)}</div>
      <div className={MEDLENS_NOTE_CLASS}>Evidence ref: {measurement.evidenceRef}</div>
    </div>
  );
}

export function EcgDiagnosticAssist({
  runtimeStatus,
  onRetryRuntimeStatus,
}: {
  runtimeStatus?: MedlensRuntimeStatus | null;
  onRetryRuntimeStatus?: () => void;
}): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [result, setResult] = useState<MedlensEcgAnalyzeResponse | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const uploadLabel = useMemo(() => {
    if (!file) return 'Drag gambar ke sini atau klik untuk pilih file';
    return `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`;
  }, [file]);
  const errorState = error ? buildErrorState(error) : null;
  const runtimeState = buildRuntimeState(runtimeStatus);
  const analyzeDisabled = isLoading;
  const waveformOutput = result?.waveform_review_output ?? null;
  const waveformPacket = result?.waveform_evidence_packet ?? null;
  const blockedPanelState = buildBlockedPanelState(waveformOutput);

  useEffect(() => {
    if (!file || typeof URL.createObjectURL !== 'function') {
      setPreviewUrl('');
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [file]);

  async function handleAnalyze(): Promise<void> {
    if (!file) {
      setError('Pilih gambar EKG terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await medlensClient.analyzeEcgImage(file);
      setResult(response);
    } catch (requestError) {
      setResult(null);
      setError(
        requestError instanceof Error ? requestError.message : 'Analisis MedLens ECG gagal.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function copyText(value: string): Promise<void> {
    await navigator.clipboard.writeText(value);
  }

  return (
    <div className="flex flex-col gap-3 text-[var(--text-main)]" data-testid="ekg-diagnostic-assist">
      <section className="rounded-xl border border-[var(--sentra-border)] bg-[var(--sentra-card)] p-4 shadow-light-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className={MEDLENS_LABEL_CLASS}>CardioLens</div>
            <div className={MEDLENS_LABEL_CLASS}>EKG Diagnostic Assist</div>
          </div>
          <div className="max-w-[168px] pt-0.5">
            <span className={`${MEDLENS_NOTE_CLASS} block text-right leading-4`}>
              Physician verification required
            </span>
          </div>
        </div>

        <label className="mt-4 block cursor-pointer rounded-xl border border-dashed border-[var(--sentra-border)] bg-[var(--neu-inset-bg)] p-4 text-center shadow-light-soft-inset transition-all hover:border-[var(--accent-border-mid)]">
          <input
            aria-label="Upload gambar EKG"
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            className="sr-only"
            onChange={(event) => {
              const selected = event.target.files?.[0] ?? null;
              setFile(selected);
              setError('');
            }}
          />
          <FileUp className="mx-auto h-5 w-5 text-[var(--accent-med)]" />
          <div className="mt-2 font-[var(--font-field)] text-[11px] font-medium text-[var(--text-main)]">
            {uploadLabel}
          </div>
          <div className={`${MEDLENS_HINT_CLASS} mt-1 text-center`}>Format: PNG, JPG, JPEG</div>
        </label>

        <button
          type="button"
          onClick={() => void handleAnalyze()}
          disabled={analyzeDisabled}
          className="engine-btn engine-btn--primary mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[11px] disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {isLoading ? 'Analyzing...' : 'Analyze ECG Image'}
        </button>

        <p className={`${MEDLENS_NOTE_CLASS} mt-3`}>
          MedLens ECG sekarang bersifat waveform-first. Jika evidence waveform belum lengkap,
          hasil akan fail-closed tanpa interpretasi klinis.
        </p>

        {runtimeStatus && runtimeState ? (
          <div className="mt-3 rounded-lg border border-[var(--sentra-border)] bg-[var(--neu-inset-bg)] p-3 shadow-light-soft-inset">
            <div className={MEDLENS_LABEL_CLASS}>{runtimeState.title}</div>
            <div className="mt-1 font-[var(--font-field)] text-[12px] text-[var(--text-main)]">
              {runtimeStatus.message}
            </div>
            <p className={`${MEDLENS_NOTE_CLASS} mt-2`}>{runtimeState.guidance}</p>
            {onRetryRuntimeStatus ? (
              <button
                type="button"
                onClick={onRetryRuntimeStatus}
                className="engine-btn mt-3 rounded-lg px-3 py-2 text-[10px]"
              >
                Cek Ulang MedLens
              </button>
            ) : null}
          </div>
        ) : null}

        {error && errorState ? (
          <div className="mt-3 rounded-lg border border-[var(--sentra-border)] bg-[var(--neu-inset-bg)] p-3 shadow-light-soft-inset">
            <div className={MEDLENS_LABEL_CLASS}>{errorState.title}</div>
            <div className="mt-1 font-[var(--font-field)] text-[12px] text-[var(--text-main)]">
              {error}
            </div>
            <p className={`${MEDLENS_NOTE_CLASS} mt-2`}>{errorState.guidance}</p>
          </div>
        ) : null}
      </section>

      {result && waveformOutput && waveformPacket ? (
        <>
          <section
            className="rounded-xl border border-[var(--sentra-border)] bg-[var(--sentra-card)] p-4 shadow-light-soft"
            data-testid="medlens-ecg-review-surface"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className={MEDLENS_SECTION_TITLE_CLASS}>Waveform-First ECG Review Gate</h2>
              <div className={`${MEDLENS_NOTE_CLASS} text-right`}>
                Gate {result.audit_log.outputPassedEvidenceGate ? 'passed' : 'blocked'}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
              <FieldCard label="Output status" value={waveformOutput.status} />
              <FieldCard label="Clinical output allowed" value={formatBoolean(waveformOutput.clinicalOutputAllowed)} />
              <FieldCard label="Image quality" value={waveformPacket.imageQuality.status} />
              <FieldCard label="Grid calibrated" value={formatBoolean(waveformPacket.gridCalibration.calibrated)} />
            </div>

            {previewUrl ? (
              <div className="mt-3 rounded-lg border border-[var(--sentra-border)] bg-[var(--neu-inset-bg)] p-3 shadow-light-soft-inset">
                <div className={MEDLENS_LABEL_CLASS}>Input ECG Image Used</div>
                <img
                  src={previewUrl}
                  alt="ECG image used for MedLens analysis"
                  className="mt-2 max-h-72 w-full rounded-md border border-[var(--sentra-border)] object-contain"
                />
              </div>
            ) : null}

            {blockedPanelState ? (
              <ReviewBlock title={blockedPanelState.title}>
                <p className={`${MEDLENS_NOTE_CLASS} text-[var(--text-main)]`}>
                  {blockedPanelState.guidance}
                </p>
                <div className="mt-3">
                  <div className={MEDLENS_LABEL_CLASS}>Required missing evidence</div>
                  <ul className={`${MEDLENS_NOTE_CLASS} mt-2 space-y-1`}>
                    {blockedPanelState.requiredEvidence.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
                {blockedPanelState.warnings.length > 0 ? (
                  <div className="mt-3">
                    <div className={MEDLENS_LABEL_CLASS}>Warnings</div>
                    <ul className={`${MEDLENS_NOTE_CLASS} mt-2 space-y-1`}>
                      {blockedPanelState.warnings.map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </ReviewBlock>
            ) : (
              <>
                <ReviewBlock title="Physician-Review Packet">
                  <div className="grid grid-cols-1 gap-3">
                    {waveformOutput.status === 'ready_for_physician_review'
                      ? waveformOutput.leadMeasurements.map((measurement) => (
                          <LeadMeasurementCard
                            key={`${measurement.lead}-${measurement.evidenceRef}`}
                            measurement={measurement}
                          />
                        ))
                      : null}
                  </div>
                </ReviewBlock>

                {waveformOutput.status === 'ready_for_physician_review' &&
                waveformOutput.rhythmEvidence ? (
                  <ReviewBlock title="Rhythm Review">
                    <div className={`${MEDLENS_NOTE_CLASS} space-y-1 text-[var(--text-main)]`}>
                      <div>Lead: {waveformOutput.rhythmEvidence.rhythmStripLead}</div>
                      <div>Regularity: {formatNullable(waveformOutput.rhythmEvidence.regularity)}</div>
                      <div>Estimated rate: {formatNullable(waveformOutput.rhythmEvidence.estimatedRateBpm)}</div>
                      <div>P before QRS: {formatNullable(waveformOutput.rhythmEvidence.pBeforeQrs)}</div>
                    </div>
                  </ReviewBlock>
                ) : null}
              </>
            )}

            <ReviewBlock title="Waveform Packet">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <FieldCard label="Source image hash" value={waveformPacket.sourceImage.sha256} />
                <FieldCard label="Lead regions detected" value={waveformPacket.leadRegions.length} />
                <FieldCard
                  label="Waveform traces extracted"
                  value={waveformPacket.waveformTraces.filter((trace) => trace.traceExtracted).length}
                />
                <FieldCard label="Lead measurements" value={waveformPacket.leadMeasurements.length} />
              </div>
            </ReviewBlock>

            {waveformPacket.secondaryOcr?.rawText ? (
              <ReviewBlock title="Secondary OCR Support">
                <p className={`${MEDLENS_NOTE_CLASS} text-[var(--text-main)]`}>
                  OCR di bawah ini hanya bukti sekunder. OCR tidak dipakai sebagai sumber utama
                  interpretasi ECG.
                </p>
                <div className="mt-3 font-mono text-[11px] text-[var(--text-main)] whitespace-pre-wrap">
                  {waveformPacket.secondaryOcr.rawText}
                </div>
              </ReviewBlock>
            ) : null}

            <ReviewBlock title="Warning">
              <p className={`${MEDLENS_NOTE_CLASS} text-[var(--text-main)]`}>
                {result.disclaimer || MEDLENS_ECG_DISCLAIMER}
              </p>
            </ReviewBlock>

            <ReviewBlock title="Limitations">
              <ul className={`${MEDLENS_NOTE_CLASS} space-y-1`}>
                {result.ecg_clinical_output.limitations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </ReviewBlock>

            <ReviewBlock title="Audit Gate">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <FieldCard label="Uploaded source hash" value={result.audit_log.uploadedSourceHash} />
                <FieldCard
                  label="Evidence gate passed"
                  value={formatBoolean(result.audit_log.outputPassedEvidenceGate)}
                />
              </div>
              {result.audit_log.rejectedLlmAdditions.length > 0 ? (
                <div className="mt-3">
                  <div className={MEDLENS_LABEL_CLASS}>Rejected additions</div>
                  <ul className={`${MEDLENS_NOTE_CLASS} mt-1 space-y-1`}>
                    {result.audit_log.rejectedLlmAdditions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </ReviewBlock>
          </section>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void copyText(buildClipboardSummary(result))}
              className="engine-btn flex items-center justify-center gap-1 rounded-lg px-2 py-2"
            >
              <Clipboard className="h-3 w-3" />
              Copy Evidence
            </button>
            <button
              type="button"
              onClick={() => void copyText(JSON.stringify(result, null, 2))}
              className="engine-btn flex items-center justify-center gap-1 rounded-lg px-2 py-2"
            >
              <Clipboard className="h-3 w-3" />
              Copy JSON
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default EcgDiagnosticAssist;
