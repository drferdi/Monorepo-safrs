import type {
  EcgClinicalOutput,
  EcgEvidence,
  EcgEvidenceLocation,
  EcgExtractionMethod,
  EcgSourceType,
  MedlensEcgImageQuality,
  MedlensWaveformEvidenceGate,
  MedlensWaveformEvidencePacket,
  MedlensWaveformLeadName,
  MedlensWaveformOutput,
  MedlensWaveformTraceEvidence,
} from './ecg-types';
import {
  MEDLENS_ECG_FAIL_CLOSED_MESSAGE,
  MEDLENS_WAVEFORM_NOT_IMPLEMENTED_REASON,
} from './ecg-types';

export const MEDLENS_WAVEFORM_GATE_VERSION = 'medlens-waveform-gate-v1.0.0';

const RED_FLAG_PATTERNS = [
  /\bst elevation\b/i,
  /\bstemi\b/i,
  /\bacute myocardial infarction\b/i,
  /\binferior myocardial infarction\b/i,
  /\bventricular tachycardia\b/i,
  /\bventricular fibrillation\b/i,
  /\bcomplete heart block\b/i,
  /\btorsades\b/i,
  /\basystole\b/i,
];
const SHA256_REGEX = /^[a-f0-9]{64}$/i;
const REQUIRED_TWELVE_LEADS: MedlensWaveformLeadName[] = [
  'I',
  'II',
  'III',
  'aVR',
  'aVL',
  'aVF',
  'V1',
  'V2',
  'V3',
  'V4',
  'V5',
  'V6',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function sanitizeEcgTextLine(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function normalizeEvidenceLocation(value: unknown): EcgEvidenceLocation | undefined {
  if (!isRecord(value)) return undefined;

  const bboxValue = value.bbox;
  const bbox =
    isRecord(bboxValue) &&
    Number.isFinite(bboxValue.x) &&
    Number.isFinite(bboxValue.y) &&
    Number.isFinite(bboxValue.width) &&
    Number.isFinite(bboxValue.height)
      ? {
          x: Number(bboxValue.x),
          y: Number(bboxValue.y),
          width: Number(bboxValue.width),
          height: Number(bboxValue.height),
        }
      : undefined;

  const location: EcgEvidenceLocation = {};
  if (Number.isFinite(value.page)) {
    location.page = Number(value.page);
  }
  if (bbox) {
    location.bbox = bbox;
  }
  if (typeof value.regionLabel === 'string' && value.regionLabel.trim()) {
    location.regionLabel = value.regionLabel.trim();
  }

  return Object.keys(location).length > 0 ? location : undefined;
}

function clampConfidence(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function buildSourceFileIdFromHash(sourceHash: string): string {
  const normalized = sourceHash.trim();
  return normalized ? `ecg-${normalized.slice(0, 12)}` : '';
}

export function normalizeFindingFromRawText(rawText: string): string | null {
  const line = sanitizeEcgTextLine(rawText);
  if (!line) return null;

  const machineInterpretationMatch = line.match(
    /^(?:(?:machine\s*)?interpret(?:ation)?|diagnos(?:is|tic))\b[:\s-]*(.*)$/i
  );
  if (machineInterpretationMatch) {
    const finding = sanitizeEcgTextLine(machineInterpretationMatch[1]);
    return finding || null;
  }

  if (/^(?:machine\s*)?interpret(?:ation)?$/i.test(line)) {
    return null;
  }

  return line;
}

export function isGroundedNormalizedFinding(
  rawText: string,
  normalizedFinding: string | null
): boolean {
  if (!normalizedFinding) return true;

  const raw = sanitizeEcgTextLine(rawText).toLowerCase();
  const normalized = sanitizeEcgTextLine(normalizedFinding).toLowerCase();
  if (!raw || !normalized) return false;

  if (raw === normalized || raw.includes(normalized)) {
    return true;
  }

  const deterministic = normalizeFindingFromRawText(rawText);
  return deterministic?.toLowerCase() === normalized;
}

export function buildEvidenceFromRawLines({
  rawLines,
  sourceFileId,
  sourceHash,
  sourceType,
  extractionMethod,
  regionLabel,
  confidence,
}: {
  rawLines: string[];
  sourceFileId: string;
  sourceHash: string;
  sourceType: EcgSourceType;
  extractionMethod: EcgExtractionMethod;
  regionLabel?: string | null;
  confidence: number;
}): EcgEvidence[] {
  const unique = new Set<string>();
  const findings: EcgEvidence[] = [];

  for (const rawLine of rawLines) {
    const sanitized = sanitizeEcgTextLine(rawLine);
    if (!sanitized || unique.has(sanitized)) {
      continue;
    }

    const normalizedFinding = normalizeFindingFromRawText(sanitized);
    if (!normalizedFinding) {
      continue;
    }

    unique.add(sanitized);
    findings.push({
      sourceFileId,
      sourceHash,
      sourceType,
      extractionMethod,
      rawText: sanitized,
      normalizedFinding,
      confidence: clampConfidence(confidence, 0),
      evidenceLocation: regionLabel ? { regionLabel } : undefined,
    });
  }

  return findings;
}

export function deriveDeterministicRedFlags(findings: EcgEvidence[]): EcgEvidence[] {
  return findings.filter((finding) =>
    RED_FLAG_PATTERNS.some((pattern) =>
      pattern.test(`${finding.normalizedFinding || ''} ${finding.rawText}`)
    )
  );
}

export function normalizeEvidenceCandidate(
  value: unknown,
  defaults: {
    sourceFileId: string;
    sourceHash: string;
    sourceType: EcgSourceType;
    extractionMethod: EcgExtractionMethod;
    confidence: number;
    regionLabel?: string | null;
  }
): EcgEvidence | null {
  if (!isRecord(value)) return null;

  const rawText = sanitizeEcgTextLine(value.rawText);
  if (!rawText) return null;

  const normalizedFindingValue =
    typeof value.normalizedFinding === 'string'
      ? sanitizeEcgTextLine(value.normalizedFinding)
      : normalizeFindingFromRawText(rawText);

  return {
    sourceFileId:
      typeof value.sourceFileId === 'string' && value.sourceFileId.trim()
        ? value.sourceFileId.trim()
        : defaults.sourceFileId,
    sourceHash:
      typeof value.sourceHash === 'string' && value.sourceHash.trim()
        ? value.sourceHash.trim()
        : defaults.sourceHash,
    sourceType:
      value.sourceType === 'machine_report_text' ||
      value.sourceType === 'ecg_image_with_printed_result' ||
      value.sourceType === 'waveform_only' ||
      value.sourceType === 'unknown'
        ? value.sourceType
        : defaults.sourceType,
    extractionMethod:
      value.extractionMethod === 'native_text' ||
      value.extractionMethod === 'ocr' ||
      value.extractionMethod === 'waveform' ||
      value.extractionMethod === 'manual_user_text' ||
      value.extractionMethod === 'unsupported'
        ? value.extractionMethod
        : defaults.extractionMethod,
    rawText,
    normalizedFinding: normalizedFindingValue || null,
    confidence: clampConfidence(value.confidence, defaults.confidence),
    evidenceLocation:
      normalizeEvidenceLocation(value.evidenceLocation) ??
      (defaults.regionLabel ? { regionLabel: defaults.regionLabel } : undefined),
  };
}

export function buildFailClosedClinicalOutput(
  status: EcgClinicalOutput['status'],
  limitations: string[]
): EcgClinicalOutput {
  const deduped = Array.from(new Set(limitations.map(sanitizeEcgTextLine).filter(Boolean)));
  return {
    status,
    findings: [],
    redFlags: [],
    limitations: deduped.length > 0 ? deduped : [MEDLENS_ECG_FAIL_CLOSED_MESSAGE],
    clinicianReviewRequired: true,
  };
}

export function getEvidenceGateFailureReasons(output: EcgClinicalOutput): string[] {
  const reasons: string[] = [];

  if (output.status !== 'source_grounded') {
    reasons.push(`ECG output status is ${output.status}.`);
  }

  if (output.clinicianReviewRequired !== true) {
    reasons.push('Clinician review requirement is missing.');
  }

  if (!Array.isArray(output.findings) || output.findings.length === 0) {
    reasons.push('No source-grounded ECG findings were produced.');
  }

  for (const finding of output.findings) {
    if (!sanitizeEcgTextLine(finding.rawText)) {
      reasons.push('A finding is missing raw extracted text.');
    }
    if (!sanitizeEcgTextLine(finding.sourceHash)) {
      reasons.push('A finding is missing source hash.');
    }
    if (!sanitizeEcgTextLine(finding.sourceFileId)) {
      reasons.push('A finding is missing source file id.');
    }
    if (!Number.isFinite(finding.confidence) || finding.confidence <= 0) {
      reasons.push('A finding is missing usable confidence.');
    }
  }

  return Array.from(new Set(reasons));
}

export function outputPassesEvidenceGate(output: EcgClinicalOutput): boolean {
  return getEvidenceGateFailureReasons(output).length === 0;
}

export function deriveWaveformQualityStatus(
  imageQuality: MedlensEcgImageQuality
): 'readable' | 'limited' | 'unreadable' {
  if (
    imageQuality.status === 'readable' ||
    imageQuality.status === 'limited' ||
    imageQuality.status === 'unreadable'
  ) {
    return imageQuality.status;
  }

  if (!imageQuality.readable) {
    return 'unreadable';
  }

  return imageQuality.issues.length > 0 ? 'limited' : 'readable';
}

export function buildWaveformNotImplementedTraces(): MedlensWaveformTraceEvidence[] {
  const waveformLeads: MedlensWaveformLeadName[] = [...REQUIRED_TWELVE_LEADS, 'RHYTHM_II'];

  return waveformLeads.map((lead): MedlensWaveformTraceEvidence => ({
    lead,
    traceExtracted: false,
    confidence: 'low',
    failureReason: MEDLENS_WAVEFORM_NOT_IMPLEMENTED_REASON,
  }));
}

function hasUsableRhythmTrace(packet: Partial<MedlensWaveformEvidencePacket>): boolean {
  if (!packet.rhythmEvidence) {
    return true;
  }

  return Boolean(
    packet.waveformTraces?.some(
      (trace) =>
        trace.lead === packet.rhythmEvidence?.rhythmStripLead && trace.traceExtracted === true
    )
  );
}

function hasUsableRawOcrText(packet: Partial<MedlensWaveformEvidencePacket>): boolean {
  return Boolean(sanitizeEcgTextLine(packet.secondaryOcr?.rawText));
}

function hasUnsupportedStClaim(packet: Partial<MedlensWaveformEvidencePacket>): boolean {
  if (
    !packet.leadMeasurements?.some((measurement) => typeof measurement.stDeviationMm === 'number')
  ) {
    return false;
  }

  return packet.leadMeasurements.some((measurement) => {
    if (typeof measurement.stDeviationMm !== 'number') {
      return false;
    }

    const matchingTrace = packet.waveformTraces?.find(
      (trace) => trace.lead === measurement.lead && trace.traceExtracted === true
    );
    const matchingFiducial = packet.fiducials?.find(
      (fiducial) => fiducial.lead === measurement.lead && Number.isFinite(fiducial.jPointMs)
    );

    return !matchingTrace?.baselineSamples?.length || !matchingFiducial;
  });
}

export function assertNoLegacyClinicalContract(input: unknown): string[] {
  const unsafeKeys = [
    'clinicalSummary',
    'syntheticSummary',
    'diagnosis',
    'impression',
    'interpretation',
    'ocrSummary',
    'fallbackSummary',
    'legacyResult',
  ];
  const violations: string[] = [];

  function scan(value: unknown, path: string): void {
    if (!value || typeof value !== 'object') return;

    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (unsafeKeys.includes(key)) {
        violations.push(`UNSAFE_LEGACY_FIELD:${currentPath}`);
      }

      if (currentPath === 'clinical_support.summary' && sanitizeEcgTextLine(child)) {
        violations.push(`UNSAFE_LEGACY_FIELD:${currentPath}`);
      }

      scan(child, currentPath);
    }
  }

  scan(input, '');
  return Array.from(new Set(violations));
}

export function runMedLensWaveformEvidenceGate(
  packet: Partial<MedlensWaveformEvidencePacket>,
  legacyViolations: string[] = []
): MedlensWaveformEvidenceGate {
  const failedAssertions: string[] = [];
  const warnings: string[] = [];

  if (packet.packetType !== 'medlens.ecg.waveform.evidence_packet.v1') {
    failedAssertions.push('INVALID_PACKET_TYPE');
  }

  if (!packet.sourceImage?.sha256 || !SHA256_REGEX.test(packet.sourceImage.sha256)) {
    failedAssertions.push('MISSING_OR_INVALID_SOURCE_IMAGE_HASH');
  }

  if (!packet.imageQuality) {
    failedAssertions.push('MISSING_IMAGE_QUALITY');
  } else if (packet.imageQuality.status === 'unreadable') {
    failedAssertions.push('IMAGE_UNREADABLE');
  } else if (packet.imageQuality.status === 'limited') {
    warnings.push('IMAGE_QUALITY_LIMITED');
  }

  if (!packet.gridCalibration) {
    failedAssertions.push('MISSING_GRID_CALIBRATION');
  } else if (!packet.gridCalibration.calibrated) {
    failedAssertions.push('GRID_NOT_CALIBRATED');
  }

  const uniqueLeadRegions = new Set(packet.leadRegions?.map((region) => region.lead) ?? []);
  if (uniqueLeadRegions.size < REQUIRED_TWELVE_LEADS.length) {
    failedAssertions.push('INSUFFICIENT_12_LEAD_REGION_DETECTION');
  }

  const extractedTraces =
    packet.waveformTraces?.filter((trace) => trace.traceExtracted).length ?? 0;
  if (extractedTraces < REQUIRED_TWELVE_LEADS.length) {
    failedAssertions.push('INSUFFICIENT_WAVEFORM_TRACE_EXTRACTION');
  }

  if (!packet.leadMeasurements || packet.leadMeasurements.length === 0) {
    failedAssertions.push('MISSING_LEAD_LEVEL_WAVEFORM_MEASUREMENTS');
  }

  if (!hasUsableRawOcrText(packet)) {
    failedAssertions.push('MISSING_RAW_OCR_TEXT');
  }

  if (packet.secondaryOcr?.printedMachineInterpretation && extractedTraces === 0) {
    failedAssertions.push('TEXT_ONLY_OCR_CANNOT_SUPPORT_CLINICAL_OUTPUT');
  }

  if (!hasUsableRhythmTrace(packet)) {
    failedAssertions.push('RHYTHM_STRIP_UNAVAILABLE_FOR_RHYTHM_CLAIM');
  }

  if (hasUnsupportedStClaim(packet)) {
    failedAssertions.push('UNSUPPORTED_ST_CLAIM_WITHOUT_BASELINE_OR_J_POINT_EVIDENCE');
  }

  if (legacyViolations.length > 0) {
    failedAssertions.push('UNSAFE_LEGACY_FIELD_DETECTED');
  }

  if (
    packet.waveformTraces?.some(
      (trace) => trace.failureReason === MEDLENS_WAVEFORM_NOT_IMPLEMENTED_REASON
    )
  ) {
    warnings.push(MEDLENS_WAVEFORM_NOT_IMPLEMENTED_REASON);
  }

  return {
    passed: failedAssertions.length === 0,
    failedAssertions: Array.from(new Set(failedAssertions)),
    warnings: Array.from(new Set(warnings)),
  };
}

function blockedReason(
  packet: Partial<MedlensWaveformEvidencePacket>,
  legacyViolations: string[],
  gate: MedlensWaveformEvidenceGate
): string {
  if (legacyViolations.length > 0) {
    return 'UNSAFE_LEGACY_FIELD_DETECTED';
  }

  if (
    packet.waveformTraces?.some(
      (trace) => trace.failureReason === MEDLENS_WAVEFORM_NOT_IMPLEMENTED_REASON
    )
  ) {
    return MEDLENS_WAVEFORM_NOT_IMPLEMENTED_REASON;
  }

  if (gate.failedAssertions.includes('TEXT_ONLY_OCR_CANNOT_SUPPORT_CLINICAL_OUTPUT')) {
    return 'TEXT_ONLY_OCR_CANNOT_SUPPORT_CLINICAL_OUTPUT';
  }

  return 'WAVEFORM_EVIDENCE_GATE_FAILED';
}

export function buildBlockedWaveformOutput(
  packet: Partial<MedlensWaveformEvidencePacket>,
  legacyViolations: string[],
  gate: MedlensWaveformEvidenceGate
): MedlensWaveformOutput {
  return {
    outputType: 'medlens.ecg.waveform.physician_review_output.v1',
    status: 'blocked',
    failClosed: true,
    clinicalOutputAllowed: false,
    reason: blockedReason(packet, legacyViolations, gate),
    failedAssertions: gate.failedAssertions,
    warnings: gate.warnings,
    physicianActionRequired: true,
  };
}

export function buildMedLensWaveformReviewOutput(
  packet: Partial<MedlensWaveformEvidencePacket>,
  legacyViolations: string[] = []
): MedlensWaveformOutput {
  const gate = runMedLensWaveformEvidenceGate(packet, legacyViolations);

  if (!gate.passed) {
    return buildBlockedWaveformOutput(packet, legacyViolations, gate);
  }

  const safePacket = packet as MedlensWaveformEvidencePacket;
  return {
    outputType: 'medlens.ecg.waveform.physician_review_output.v1',
    status: 'ready_for_physician_review',
    failClosed: false,
    clinicalOutputAllowed: true,
    sourceImageHash: safePacket.sourceImage.sha256,
    imageQuality: safePacket.imageQuality,
    gridCalibration: safePacket.gridCalibration,
    leadMeasurements: safePacket.leadMeasurements,
    rhythmEvidence: safePacket.rhythmEvidence,
    reviewScope: 'waveform_evidence_review_only',
    reviewNote:
      'Waveform-derived ECG evidence is ready for physician review. This output is not an autonomous diagnosis and must be interpreted by a qualified clinician in clinical context.',
    warnings: gate.warnings,
    audit: safePacket.audit,
  };
}

export function attachWaveformEvidenceGate(
  packet: MedlensWaveformEvidencePacket,
  legacyViolations: string[] = []
): MedlensWaveformEvidencePacket {
  return {
    ...packet,
    evidenceGate: runMedLensWaveformEvidenceGate(packet, legacyViolations),
  };
}

export function waveformOutputAllowsClinicalReview(output: MedlensWaveformOutput): boolean {
  return output.status === 'ready_for_physician_review' && output.clinicalOutputAllowed === true;
}
