import {
  attachWaveformEvidenceGate,
  buildMedLensWaveformReviewOutput,
  MEDLENS_WAVEFORM_GATE_VERSION,
} from '@/lib/clinical/medlens/ecg-output-gate';
import {
  MEDLENS_ECG_DISCLAIMER,
  type EcgClinicalOutput,
  type MedlensEcgAnalyzeResponse,
  type MedlensWaveformEvidencePacket,
  type MedlensWaveformOutput,
} from '@/lib/clinical/medlens/ecg-types';

const BASE_SOURCE_HASH = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const BASE_SOURCE_FILE_ID = `ecg-${BASE_SOURCE_HASH.slice(0, 12)}`;
const BASE_RAW_ECG_LINES = [
  'Ventricular rate 82 bpm',
  'PR interval 164 ms',
  'QRS duration 96 ms',
  'QT/QTc 376/428 ms',
  'Machine interpretation: Nonspecific ST abnormality',
] as const;
const LEADS = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;

type MedlensFixtureOverrides = Partial<MedlensEcgAnalyzeResponse> & {
  image_quality?: Partial<MedlensEcgAnalyzeResponse['image_quality']>;
  source_file?: Partial<MedlensEcgAnalyzeResponse['source_file']>;
  ocr_metadata?: Partial<MedlensEcgAnalyzeResponse['ocr_metadata']>;
  ecg_clinical_output?: Partial<EcgClinicalOutput>;
  waveform_evidence_packet?: Partial<MedlensWaveformEvidencePacket>;
  waveform_review_output?: Partial<MedlensWaveformOutput>;
  audit_log?: Partial<MedlensEcgAnalyzeResponse['audit_log']>;
};

function buildDefaultWaveformPacket(
  response: {
    image_quality: MedlensEcgAnalyzeResponse['image_quality'];
    source_file: MedlensEcgAnalyzeResponse['source_file'];
    raw_ecg_relevant_text: string[];
  },
  overrides?: Partial<MedlensWaveformEvidencePacket>
): MedlensWaveformEvidencePacket {
  const defaultImageStatus: MedlensWaveformEvidencePacket['imageQuality']['status'] = response
    .image_quality.readable
    ? 'readable'
    : 'unreadable';
  const packet: MedlensWaveformEvidencePacket = {
    packetType: 'medlens.ecg.waveform.evidence_packet.v1' as const,
    sourceImage: {
      sha256: response.source_file.sourceHash,
      mimeType: 'image/png',
      widthPx: 1200,
      heightPx: 800,
      ...overrides?.sourceImage,
    },
    imageQuality: {
      status: defaultImageStatus,
      issues: response.image_quality.issues,
      ...overrides?.imageQuality,
    },
    gridCalibration: {
      calibrated: true,
      paperSpeedMmPerSec: 25 as const,
      gainMmPerMv: 10 as const,
      pixelsPerSmallBox: 8,
      confidence: 'high' as const,
      ...overrides?.gridCalibration,
    },
    leadRegions:
      overrides?.leadRegions ??
      LEADS.map((lead, index) => ({
        lead,
        boundingBoxPx: { x: index * 10, y: 0, width: 10, height: 10 },
        labelDetectedBy: 'layout' as const,
        confidence: 'medium' as const,
      })),
    waveformTraces: overrides?.waveformTraces ?? [
      ...LEADS.map((lead) => ({
        lead,
        traceExtracted: true,
        signalSamples: [0, 1, 0, -1, 0],
        baselineSamples: [0, 0, 0, 0, 0],
        confidence: 'medium' as const,
      })),
      {
        lead: 'RHYTHM_II' as const,
        traceExtracted: true,
        signalSamples: [0, 1, 0, -1, 0],
        baselineSamples: [0, 0, 0, 0, 0],
        confidence: 'medium' as const,
      },
    ],
    fiducials:
      overrides?.fiducials ??
      LEADS.map((lead) => ({
        lead,
        qrsOnsetMs: 120,
        jPointMs: 180,
        tEndMs: 260,
        confidence: 'medium' as const,
      })),
    leadMeasurements:
      overrides?.leadMeasurements ??
      LEADS.map((lead) => ({
        lead,
        stDeviationMm: 0,
        qrsPolarity: 'unknown' as const,
        tWavePattern: 'unknown' as const,
        confidence: 'medium' as const,
        evidenceRef: `waveform:${lead}`,
      })),
    rhythmEvidence: overrides?.rhythmEvidence ?? {
      rhythmStripLead: 'RHYTHM_II',
      regularity: 'regular' as const,
      estimatedRateBpm: 82,
      pBeforeQrs: 'not_assessable' as const,
      confidence: 'medium' as const,
      evidenceRef: 'waveform:RHYTHM_II',
    },
    secondaryOcr: overrides?.secondaryOcr ?? {
      rawText: response.raw_ecg_relevant_text.join('\n'),
      printedMachineInterpretation: 'Nonspecific ST abnormality',
    },
    audit: {
      pipelineVersion: 'medlens-waveform-fixture-v1',
      evidenceGateVersion: MEDLENS_WAVEFORM_GATE_VERSION,
      timestampIso: new Date().toISOString(),
      ...overrides?.audit,
    },
  };

  return attachWaveformEvidenceGate(packet, []);
}

function buildLegacyQuarantinedClinicalOutput(
  overrides?: Partial<EcgClinicalOutput>
): EcgClinicalOutput {
  return {
    status: 'insufficient_evidence',
    findings: [],
    redFlags: [],
    limitations: ['Legacy ecg_clinical_output is quarantined. Use waveform_review_output only.'],
    clinicianReviewRequired: true,
    ...overrides,
  };
}

export function makeMedlensEcgAnalyzeResponse(
  overrides: MedlensFixtureOverrides = {}
): MedlensEcgAnalyzeResponse {
  const responseBase = {
    status: overrides.status ?? ('ok' as const),
    module: overrides.module ?? ('ecg' as const),
    image_quality: {
      readable: true,
      status: 'readable' as const,
      issues: [],
      ...overrides.image_quality,
    },
    source_file: {
      sourceFileId: BASE_SOURCE_FILE_ID,
      sourceHash: BASE_SOURCE_HASH,
      sourceType: 'ecg_image_with_printed_result' as const,
      fileName: 'ekg.png',
      ...overrides.source_file,
    },
    extraction_method: overrides.extraction_method ?? ('ocr' as const),
    ocr_metadata: {
      ocr_source: 'crop' as const,
      selected_region: 'structured-ecg',
      region_score: 18,
      candidate_count: 3,
      full_image_ocr_used: false,
      ...overrides.ocr_metadata,
    },
    raw_ecg_relevant_text: overrides.raw_ecg_relevant_text ?? Array.from(BASE_RAW_ECG_LINES),
    ignored_or_redacted_identifiers_detected:
      overrides.ignored_or_redacted_identifiers_detected ?? false,
    physician_verification_required: true as const,
  };

  const waveformEvidencePacket = buildDefaultWaveformPacket(
    responseBase,
    overrides.waveform_evidence_packet
  );
  const waveformReviewOutput = {
    ...buildMedLensWaveformReviewOutput(waveformEvidencePacket, []),
    ...overrides.waveform_review_output,
  } as MedlensWaveformOutput;
  const ecgClinicalOutput = buildLegacyQuarantinedClinicalOutput(overrides.ecg_clinical_output);
  const auditLog = {
    uploadedSourceHash:
      overrides.audit_log?.uploadedSourceHash ?? responseBase.source_file.sourceHash,
    extractionMethod: overrides.audit_log?.extractionMethod ?? responseBase.extraction_method,
    rawExtractedText: overrides.audit_log?.rawExtractedText ?? responseBase.raw_ecg_relevant_text,
    rejectedLlmAdditions: overrides.audit_log?.rejectedLlmAdditions ?? [],
    finalRenderedOutput: overrides.audit_log?.finalRenderedOutput ?? {
      status:
        waveformReviewOutput.status === 'ready_for_physician_review'
          ? 'source_grounded'
          : 'insufficient_evidence',
      findingsCount:
        waveformReviewOutput.status === 'ready_for_physician_review'
          ? waveformEvidencePacket.leadMeasurements.length
          : 0,
      redFlagsCount: 0,
    },
    outputPassedEvidenceGate:
      overrides.audit_log?.outputPassedEvidenceGate ??
      (waveformReviewOutput.status === 'ready_for_physician_review' &&
        waveformReviewOutput.clinicalOutputAllowed === true),
  };

  return {
    ...responseBase,
    ecg_clinical_output: ecgClinicalOutput,
    waveform_evidence_packet: waveformEvidencePacket,
    waveform_review_output: waveformReviewOutput,
    audit_log: auditLog,
    disclaimer: overrides.disclaimer ?? MEDLENS_ECG_DISCLAIMER,
  };
}
