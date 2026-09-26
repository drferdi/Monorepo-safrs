import {
  assertNoLegacyClinicalContract,
  attachWaveformEvidenceGate,
  buildFailClosedClinicalOutput,
  buildMedLensWaveformReviewOutput,
  buildSourceFileIdFromHash,
  buildWaveformNotImplementedTraces,
  deriveWaveformQualityStatus,
  sanitizeEcgTextLine,
  waveformOutputAllowsClinicalReview,
  MEDLENS_WAVEFORM_GATE_VERSION,
} from './ecg-output-gate';
import type {
  MedlensEcgAnalyzeResponse,
  MedlensEcgAuditLog,
  MedlensEcgImageQuality,
  MedlensEcgOcrMetadata,
  MedlensEcgSourceFile,
  MedlensFiducialEvidence,
  MedlensGridCalibrationEvidence,
  MedlensLeadMeasurementEvidence,
  MedlensLeadRegionEvidence,
  MedlensRhythmEvidence,
  MedlensWaveformConfidence,
  MedlensWaveformEvidencePacket,
  MedlensWaveformLeadName,
  MedlensWaveformOutput,
  MedlensWaveformTraceEvidence,
} from './ecg-types';
import {
  MEDLENS_ECG_DISCLAIMER,
  MEDLENS_ECG_FAIL_CLOSED_MESSAGE,
} from './ecg-types';

export { MEDLENS_ECG_DISCLAIMER, MEDLENS_ECG_FAIL_CLOSED_MESSAGE };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(sanitizeEcgTextLine).filter(Boolean);
}

function readFiniteNumber(value: unknown): number | undefined {
  return Number.isFinite(value) ? Number(value) : undefined;
}

function readNumberArray(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const numbers = value
    .map((entry) => (Number.isFinite(entry) ? Number(entry) : null))
    .filter((entry): entry is number => entry !== null);
  return numbers.length > 0 ? numbers : undefined;
}

function preserveRawOcrText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .split(/\r?\n/)
    .map(sanitizeEcgTextLine)
    .filter(Boolean)
    .join('\n');
}

function normalizeImageQuality(value: unknown): MedlensEcgImageQuality {
  if (!isRecord(value)) {
    return { readable: false, status: 'unreadable', issues: [] };
  }

  const readable = Boolean(value.readable);
  const issues = readStringArray(value.issues);
  const status =
    value.status === 'readable' || value.status === 'limited' || value.status === 'unreadable'
      ? value.status
      : readable
        ? issues.length > 0
          ? 'limited'
          : 'readable'
        : 'unreadable';

  return {
    readable,
    status,
    issues,
  };
}

function normalizeOcrMetadata(value: unknown): MedlensEcgOcrMetadata {
  if (!isRecord(value)) {
    return {
      ocr_source: 'unavailable',
      selected_region: null,
      region_score: 0,
      candidate_count: 0,
      full_image_ocr_used: false,
    };
  }

  const legacyFullImageFlag = value.fallback_used;
  return {
    ocr_source:
      value.ocr_source === 'crop' ||
      value.ocr_source === 'full_image' ||
      value.ocr_source === 'unavailable'
        ? value.ocr_source
        : 'unavailable',
    selected_region:
      typeof value.selected_region === 'string' && value.selected_region.trim()
        ? value.selected_region.trim()
        : null,
    region_score: Number.isFinite(value.region_score) ? Number(value.region_score) : 0,
    candidate_count: Number.isFinite(value.candidate_count) ? Number(value.candidate_count) : 0,
    full_image_ocr_used: Boolean(value.full_image_ocr_used ?? legacyFullImageFlag),
  };
}

function inferExtractionMethod(value: unknown, ocrMetadata: MedlensEcgOcrMetadata) {
  if (
    value === 'native_text' ||
    value === 'ocr' ||
    value === 'waveform' ||
    value === 'manual_user_text' ||
    value === 'unsupported'
  ) {
    return value;
  }

  if (ocrMetadata.ocr_source === 'crop' || ocrMetadata.ocr_source === 'full_image') {
    return 'ocr' as const;
  }

  return 'unsupported' as const;
}

function inferSourceType(
  value: unknown,
  rawLines: string[],
  imageQuality: MedlensEcgImageQuality
) {
  if (
    value === 'machine_report_text' ||
    value === 'ecg_image_with_printed_result' ||
    value === 'waveform_only' ||
    value === 'unknown'
  ) {
    return value;
  }

  if (rawLines.length > 0) {
    return 'ecg_image_with_printed_result' as const;
  }

  return imageQuality.readable ? ('unknown' as const) : ('unknown' as const);
}

function normalizeSourceFile(
  value: unknown,
  rawLines: string[],
  imageQuality: MedlensEcgImageQuality,
  auditSourceHash: string | null,
  trustedSourceHash: string | null
): MedlensEcgSourceFile {
  const record = isRecord(value) ? value : {};
  const sourceHash =
    typeof record.sourceHash === 'string' && record.sourceHash.trim()
      ? record.sourceHash.trim()
      : auditSourceHash || trustedSourceHash || '';
  const sourceType = inferSourceType(record.sourceType, rawLines, imageQuality);
  const sourceFileId =
    typeof record.sourceFileId === 'string' && record.sourceFileId.trim()
      ? record.sourceFileId.trim()
      : buildSourceFileIdFromHash(sourceHash);

  return {
    sourceFileId,
    sourceHash,
    sourceType,
    fileName:
      typeof record.fileName === 'string' && record.fileName.trim() ? record.fileName.trim() : null,
  };
}

function confidenceFromUnknown(
  value: unknown,
  fallback: MedlensWaveformConfidence = 'low'
): MedlensWaveformConfidence {
  return value === 'high' || value === 'medium' || value === 'low' ? value : fallback;
}

function leadFromUnknown(value: unknown): MedlensWaveformLeadName | null {
  return value === 'I' ||
    value === 'II' ||
    value === 'III' ||
    value === 'aVR' ||
    value === 'aVL' ||
    value === 'aVF' ||
    value === 'V1' ||
    value === 'V2' ||
    value === 'V3' ||
    value === 'V4' ||
    value === 'V5' ||
    value === 'V6' ||
    value === 'RHYTHM_II'
    ? value
    : null;
}

function normalizeGridCalibration(value: unknown): MedlensGridCalibrationEvidence {
  if (!isRecord(value)) {
    return {
      calibrated: false,
      confidence: 'low',
    };
  }

  return {
    calibrated: Boolean(value.calibrated),
    paperSpeedMmPerSec: value.paperSpeedMmPerSec === 25 || value.paperSpeedMmPerSec === 50
      ? value.paperSpeedMmPerSec
      : undefined,
    gainMmPerMv:
      value.gainMmPerMv === 10 || value.gainMmPerMv === 5 || value.gainMmPerMv === 20
        ? value.gainMmPerMv
        : undefined,
    pixelsPerSmallBox: readFiniteNumber(value.pixelsPerSmallBox),
    confidence: confidenceFromUnknown(value.confidence),
  };
}

function normalizeLeadRegions(value: unknown): MedlensLeadRegionEvidence[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((candidate) => {
      if (!isRecord(candidate)) return null;
      const lead = leadFromUnknown(candidate.lead);
      const bbox = isRecord(candidate.boundingBoxPx)
        ? {
            x: readFiniteNumber(candidate.boundingBoxPx.x),
            y: readFiniteNumber(candidate.boundingBoxPx.y),
            width: readFiniteNumber(candidate.boundingBoxPx.width),
            height: readFiniteNumber(candidate.boundingBoxPx.height),
          }
        : null;

      if (
        !lead ||
        !bbox ||
        bbox.x === undefined ||
        bbox.y === undefined ||
        bbox.width === undefined ||
        bbox.height === undefined
      ) {
        return null;
      }

      return {
        lead,
        boundingBoxPx: {
          x: bbox.x,
          y: bbox.y,
          width: bbox.width,
          height: bbox.height,
        },
        labelDetectedBy:
          candidate.labelDetectedBy === 'ocr' ||
          candidate.labelDetectedBy === 'layout' ||
          candidate.labelDetectedBy === 'manual'
            ? candidate.labelDetectedBy
            : 'manual',
        confidence: confidenceFromUnknown(candidate.confidence),
      };
    })
    .filter((entry): entry is MedlensLeadRegionEvidence => entry !== null);
}

function normalizeWaveformTraces(value: unknown): MedlensWaveformTraceEvidence[] {
  if (!Array.isArray(value)) return [];

  const traces: Array<MedlensWaveformTraceEvidence | null> = value.map((candidate) => {
      if (!isRecord(candidate)) return null;
      const lead = leadFromUnknown(candidate.lead);
      if (!lead) return null;

      return {
        lead,
        traceExtracted: candidate.traceExtracted === true,
        signalSamples: readNumberArray(candidate.signalSamples),
        baselineSamples: readNumberArray(candidate.baselineSamples),
        confidence: confidenceFromUnknown(candidate.confidence),
        failureReason:
          typeof candidate.failureReason === 'string' && candidate.failureReason.trim()
            ? candidate.failureReason.trim()
            : undefined,
      };
    });

  return traces.filter((entry): entry is MedlensWaveformTraceEvidence => entry !== null);
}

function normalizeFiducials(value: unknown): MedlensFiducialEvidence[] {
  if (!Array.isArray(value)) return [];

  const fiducials: Array<MedlensFiducialEvidence | null> = value.map((candidate) => {
      if (!isRecord(candidate)) return null;
      const lead = leadFromUnknown(candidate.lead);
      if (!lead) return null;

      return {
        lead,
        pOnsetMs: readFiniteNumber(candidate.pOnsetMs),
        qrsOnsetMs: readFiniteNumber(candidate.qrsOnsetMs),
        jPointMs: readFiniteNumber(candidate.jPointMs),
        tEndMs: readFiniteNumber(candidate.tEndMs),
        confidence: confidenceFromUnknown(candidate.confidence),
      };
    });

  return fiducials.filter((entry): entry is MedlensFiducialEvidence => entry !== null);
}

function normalizeLeadMeasurements(value: unknown): MedlensLeadMeasurementEvidence[] {
  if (!Array.isArray(value)) return [];

  const measurements: Array<MedlensLeadMeasurementEvidence | null> = value.map((candidate) => {
      if (!isRecord(candidate)) return null;
      const lead = leadFromUnknown(candidate.lead);
      if (!lead) return null;

      return {
        lead,
        stDeviationMm: readFiniteNumber(candidate.stDeviationMm),
        qrsPolarity:
          candidate.qrsPolarity === 'positive' ||
          candidate.qrsPolarity === 'negative' ||
          candidate.qrsPolarity === 'biphasic' ||
          candidate.qrsPolarity === 'unknown'
            ? candidate.qrsPolarity
            : undefined,
        tWavePattern:
          candidate.tWavePattern === 'upright' ||
          candidate.tWavePattern === 'inverted' ||
          candidate.tWavePattern === 'hyperacute' ||
          candidate.tWavePattern === 'flat' ||
          candidate.tWavePattern === 'unknown'
            ? candidate.tWavePattern
            : undefined,
        qWavePresent: typeof candidate.qWavePresent === 'boolean' ? candidate.qWavePresent : undefined,
        confidence: confidenceFromUnknown(candidate.confidence),
        evidenceRef:
          typeof candidate.evidenceRef === 'string' && candidate.evidenceRef.trim()
            ? candidate.evidenceRef.trim()
            : `waveform:${lead}`,
      };
    });

  return measurements.filter((entry): entry is MedlensLeadMeasurementEvidence => entry !== null);
}

function normalizeRhythmEvidence(value: unknown): MedlensRhythmEvidence | undefined {
  if (!isRecord(value)) return undefined;
  const rhythmStripLead = leadFromUnknown(value.rhythmStripLead);
  if (!rhythmStripLead) return undefined;

  return {
    rhythmStripLead,
    regularity:
      value.regularity === 'regular' ||
      value.regularity === 'irregular' ||
      value.regularity === 'irregularly_irregular' ||
      value.regularity === 'unknown'
        ? value.regularity
        : undefined,
    estimatedRateBpm: readFiniteNumber(value.estimatedRateBpm),
    pBeforeQrs:
      value.pBeforeQrs === 'consistent' ||
      value.pBeforeQrs === 'inconsistent' ||
      value.pBeforeQrs === 'not_assessable'
        ? value.pBeforeQrs
        : undefined,
    confidence: confidenceFromUnknown(value.confidence),
    evidenceRef:
      typeof value.evidenceRef === 'string' && value.evidenceRef.trim()
        ? value.evidenceRef.trim()
        : `waveform:${rhythmStripLead}`,
  };
}

function extractPrintedMeasurements(input: Record<string, unknown>): Record<string, string> | undefined {
  const values = isRecord(input.ocr_extracted_values) ? input.ocr_extracted_values : null;
  if (!values) return undefined;

  const printedMeasurements = Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) => [key, sanitizeEcgTextLine(value)] as const)
      .filter(([, value]) => Boolean(value))
  );

  return Object.keys(printedMeasurements).length > 0 ? printedMeasurements : undefined;
}

function extractPrintedMachineInterpretation(
  input: Record<string, unknown>,
  rawLines: string[]
): string | undefined {
  const values = isRecord(input.ocr_extracted_values) ? input.ocr_extracted_values : null;
  const explicit = sanitizeEcgTextLine(values?.machine_interpretation_text);
  if (explicit) {
    return explicit;
  }

  const interpretationLine = rawLines.find((line) => /machine interpretation|diagnosis/i.test(line));
  return interpretationLine ? sanitizeEcgTextLine(interpretationLine) : undefined;
}

function buildSecondaryOcr(
  input: Record<string, unknown>,
  packetInput: Record<string, unknown>,
  rawLines: string[]
) {
  const provided = isRecord(packetInput.secondaryOcr) ? packetInput.secondaryOcr : null;
  const rawText =
    preserveRawOcrText(provided?.rawText) || rawLines.join('\n').trim();
  const leadLabels = Array.isArray(provided?.leadLabels)
    ? provided.leadLabels.map(sanitizeEcgTextLine).filter(Boolean)
    : undefined;
  const printedMeasurements =
    isRecord(provided?.printedMeasurements)
      ? Object.fromEntries(
          Object.entries(provided.printedMeasurements)
            .map(([key, value]) => [key, sanitizeEcgTextLine(value)] as const)
            .filter(([, value]) => Boolean(value))
        )
      : extractPrintedMeasurements(input);
  const printedMachineInterpretation =
    sanitizeEcgTextLine(provided?.printedMachineInterpretation) ||
    extractPrintedMachineInterpretation(input, rawLines);

  if (!rawText && !printedMachineInterpretation && !printedMeasurements && !leadLabels?.length) {
    return undefined;
  }

  return {
    rawText,
    leadLabels: leadLabels?.length ? leadLabels : undefined,
    printedMeasurements,
    printedMachineInterpretation,
  };
}

function collectRejectedLegacyClinicalText(input: Record<string, unknown>): string[] {
  const rejected: string[] = [];

  const clinicalSupport = isRecord(input.clinical_support) ? input.clinical_support : null;
  if (clinicalSupport) {
    const summary = sanitizeEcgTextLine(clinicalSupport.summary);
    if (summary) {
      rejected.push(summary);
    }
    rejected.push(...readStringArray(clinicalSupport.red_flags));
  }

  const extractedObservations = isRecord(input.extracted_observations) ? input.extracted_observations : null;
  if (extractedObservations) {
    rejected.push(...readStringArray(extractedObservations.notable_findings));
    rejected.push(...readStringArray(extractedObservations.st_t_changes));
  }

  const providedClinicalOutput = isRecord(input.ecg_clinical_output) ? input.ecg_clinical_output : null;
  if (providedClinicalOutput) {
    const findings = Array.isArray(providedClinicalOutput.findings)
      ? providedClinicalOutput.findings
      : [];
    for (const candidate of findings) {
      if (!isRecord(candidate)) continue;
      const normalized = sanitizeEcgTextLine(candidate.normalizedFinding);
      if (normalized) {
        rejected.push(normalized);
      }
    }
  }

  return Array.from(new Set(rejected.map(sanitizeEcgTextLine).filter(Boolean)));
}

function synthesizeWaveformPacket(
  input: Record<string, unknown>,
  sourceFile: MedlensEcgSourceFile,
  imageQuality: MedlensEcgImageQuality,
  rawLines: string[],
  auditInput: Record<string, unknown> | null
): MedlensWaveformEvidencePacket {
  const packetInput = isRecord(input.waveform_evidence_packet) ? input.waveform_evidence_packet : {};
  const sourceImageInput = isRecord(packetInput.sourceImage) ? packetInput.sourceImage : {};
  const auditPacket = isRecord(packetInput.audit) ? packetInput.audit : {};
  const packet = {
    packetType: 'medlens.ecg.waveform.evidence_packet.v1' as const,
    sourceImage: {
      sha256:
        sanitizeEcgTextLine(sourceImageInput.sha256) || sourceFile.sourceHash,
      mimeType:
        typeof sourceImageInput.mimeType === 'string' && sourceImageInput.mimeType.trim()
          ? sourceImageInput.mimeType.trim()
          : undefined,
      widthPx: readFiniteNumber(sourceImageInput.widthPx),
      heightPx: readFiniteNumber(sourceImageInput.heightPx),
    },
    imageQuality: {
      status: deriveWaveformQualityStatus(imageQuality),
      issues: Array.from(new Set(imageQuality.issues.map(sanitizeEcgTextLine).filter(Boolean))),
    },
    gridCalibration: normalizeGridCalibration(packetInput.gridCalibration),
    leadRegions: normalizeLeadRegions(packetInput.leadRegions),
    waveformTraces: normalizeWaveformTraces(packetInput.waveformTraces),
    fiducials: normalizeFiducials(packetInput.fiducials),
    leadMeasurements: normalizeLeadMeasurements(packetInput.leadMeasurements),
    rhythmEvidence: normalizeRhythmEvidence(packetInput.rhythmEvidence),
    secondaryOcr: buildSecondaryOcr(input, packetInput, rawLines),
    audit: {
      pipelineVersion:
        typeof auditPacket.pipelineVersion === 'string' && auditPacket.pipelineVersion.trim()
          ? auditPacket.pipelineVersion.trim()
          : 'medlens-waveform-repair-v1',
      evidenceGateVersion:
        typeof auditPacket.evidenceGateVersion === 'string' &&
        auditPacket.evidenceGateVersion.trim()
          ? auditPacket.evidenceGateVersion.trim()
          : MEDLENS_WAVEFORM_GATE_VERSION,
      timestampIso:
        typeof auditPacket.timestampIso === 'string' && auditPacket.timestampIso.trim()
          ? auditPacket.timestampIso.trim()
          : typeof auditInput?.timestampIso === 'string' && auditInput.timestampIso.trim()
            ? auditInput.timestampIso.trim()
            : new Date().toISOString(),
    },
  };

  if (packet.waveformTraces.length === 0) {
    packet.waveformTraces = buildWaveformNotImplementedTraces();
  }

  return packet;
}

function buildLegacyQuarantineOutput(output: MedlensWaveformOutput) {
  if (output.status === 'blocked') {
    return buildFailClosedClinicalOutput('insufficient_evidence', [
      MEDLENS_ECG_FAIL_CLOSED_MESSAGE,
      'Legacy ecg_clinical_output is quarantined. Use waveform_review_output only.',
      output.reason,
      ...output.failedAssertions,
      ...output.warnings,
    ]);
  }

  return buildFailClosedClinicalOutput('insufficient_evidence', [
    'Legacy ecg_clinical_output is quarantined. Use waveform_review_output only.',
  ]);
}

function buildAuditLog(
  extractionMethod: MedlensEcgAnalyzeResponse['extraction_method'],
  rawLines: string[],
  rejectedLlmAdditions: string[],
  waveformPacket: MedlensWaveformEvidencePacket,
  waveformReviewOutput: MedlensWaveformOutput
): MedlensEcgAuditLog {
  return {
    uploadedSourceHash: waveformPacket.sourceImage.sha256 || null,
    extractionMethod,
    rawExtractedText: rawLines,
    rejectedLlmAdditions: Array.from(
      new Set(rejectedLlmAdditions.map(sanitizeEcgTextLine).filter(Boolean))
    ),
    finalRenderedOutput: {
      status: waveformOutputAllowsClinicalReview(waveformReviewOutput)
        ? 'source_grounded'
        : 'insufficient_evidence',
      findingsCount: waveformOutputAllowsClinicalReview(waveformReviewOutput)
        ? waveformPacket.leadMeasurements.length
        : 0,
      redFlagsCount: 0,
    },
    outputPassedEvidenceGate: waveformOutputAllowsClinicalReview(waveformReviewOutput),
  };
}

function resolvePreservedRawLines(
  rawLines: string[],
  waveformPacket: MedlensWaveformEvidencePacket
): string[] {
  if (rawLines.length > 0) {
    return rawLines;
  }

  const secondaryText = preserveRawOcrText(waveformPacket.secondaryOcr?.rawText);
  if (!secondaryText) {
    return [];
  }

  return secondaryText
    .split(/\r?\n/)
    .map(sanitizeEcgTextLine)
    .filter(Boolean);
}

export function normalizeMedlensEcgAnalyzeResponse(
  response: unknown,
  options?: {
    trustedSourceHash?: string | null;
  }
): MedlensEcgAnalyzeResponse {
  const input = isRecord(response) ? response : {};
  const imageQuality = normalizeImageQuality(input.image_quality);
  const rawLines = readStringArray(input.raw_ecg_relevant_text);
  const ocrMetadata = normalizeOcrMetadata(input.ocr_metadata);
  const extractionMethod = inferExtractionMethod(input.extraction_method, ocrMetadata);
  const auditInput = isRecord(input.audit_log) ? input.audit_log : null;
  const sourceFile = normalizeSourceFile(
    input.source_file,
    rawLines,
    imageQuality,
    typeof auditInput?.uploadedSourceHash === 'string' ? auditInput.uploadedSourceHash : null,
    typeof options?.trustedSourceHash === 'string' ? options.trustedSourceHash : null
  );

  const legacyViolations = assertNoLegacyClinicalContract(input);
  const waveformPacket = attachWaveformEvidenceGate(
    synthesizeWaveformPacket(input, sourceFile, imageQuality, rawLines, auditInput),
    legacyViolations
  );
  const waveformReviewOutput = buildMedLensWaveformReviewOutput(waveformPacket, legacyViolations);
  const ecgClinicalOutput = buildLegacyQuarantineOutput(waveformReviewOutput);
  const preservedRawLines = resolvePreservedRawLines(rawLines, waveformPacket);
  const auditLog = buildAuditLog(
    extractionMethod,
    preservedRawLines,
    [...collectRejectedLegacyClinicalText(input), ...legacyViolations],
    waveformPacket,
    waveformReviewOutput
  );

  return {
    status: 'ok',
    module: 'ecg',
    image_quality: imageQuality,
    source_file: sourceFile,
    extraction_method: extractionMethod,
    ocr_metadata: ocrMetadata,
    raw_ecg_relevant_text: preservedRawLines,
    ignored_or_redacted_identifiers_detected: Boolean(
      input.ignored_or_redacted_identifiers_detected
    ),
    physician_verification_required: true,
    ecg_clinical_output: ecgClinicalOutput,
    waveform_evidence_packet: waveformPacket,
    waveform_review_output: waveformReviewOutput,
    audit_log: auditLog,
    disclaimer: MEDLENS_ECG_DISCLAIMER,
  };
}
