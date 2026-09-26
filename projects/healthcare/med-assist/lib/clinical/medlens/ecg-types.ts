export const MEDLENS_ECG_ACCEPTED_FILE_EXTENSIONS = ['jpg', 'jpeg', 'png'] as const;
export const MEDLENS_ECG_ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png'] as const;
export const MEDLENS_ECG_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MEDLENS_ECG_DISCLAIMER =
  'This MedLens output is a waveform-first physician-review packet and must be reviewed by a clinician.';
export const MEDLENS_ECG_FAIL_CLOSED_MESSAGE =
  'MedLens cannot produce ECG review output because waveform evidence is incomplete.';
export const MEDLENS_WAVEFORM_NOT_IMPLEMENTED_REASON = 'WAVEFORM_EXTRACTION_NOT_IMPLEMENTED';

export type EcgSourceType =
  | 'machine_report_text'
  | 'ecg_image_with_printed_result'
  | 'waveform_only'
  | 'unknown';

export type EcgExtractionMethod = 'native_text' | 'ocr' | 'waveform' | 'manual_user_text' | 'unsupported';

export interface EcgEvidenceLocation {
  page?: number;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  regionLabel?: string;
}

export interface EcgEvidence {
  sourceFileId: string;
  sourceHash: string;
  sourceType: EcgSourceType;
  extractionMethod: EcgExtractionMethod;
  rawText: string;
  normalizedFinding: string | null;
  confidence: number;
  evidenceLocation?: EcgEvidenceLocation;
}

export interface EcgClinicalOutput {
  status:
    | 'source_grounded'
    | 'insufficient_evidence'
    | 'unsupported_source'
    | 'extraction_failed';
  findings: EcgEvidence[];
  redFlags: EcgEvidence[];
  limitations: string[];
  clinicianReviewRequired: true;
}

export interface MedlensEcgImageQuality {
  readable: boolean;
  status?: 'readable' | 'limited' | 'unreadable';
  issues: string[];
}

export interface MedlensEcgOcrMetadata {
  ocr_source: 'crop' | 'full_image' | 'unavailable';
  selected_region: string | null;
  region_score: number;
  candidate_count: number;
  full_image_ocr_used: boolean;
}

export interface MedlensEcgSourceFile {
  sourceFileId: string;
  sourceHash: string;
  sourceType: EcgSourceType;
  fileName?: string | null;
}

export interface MedlensEcgAuditLog {
  uploadedSourceHash: string | null;
  extractionMethod: EcgExtractionMethod;
  rawExtractedText: string[];
  rejectedLlmAdditions: string[];
  finalRenderedOutput: {
    status: EcgClinicalOutput['status'];
    findingsCount: number;
    redFlagsCount: number;
  };
  outputPassedEvidenceGate: boolean;
}

export type MedlensWaveformLeadName =
  | 'I'
  | 'II'
  | 'III'
  | 'aVR'
  | 'aVL'
  | 'aVF'
  | 'V1'
  | 'V2'
  | 'V3'
  | 'V4'
  | 'V5'
  | 'V6'
  | 'RHYTHM_II';

export type MedlensWaveformQualityStatus = 'readable' | 'limited' | 'unreadable';
export type MedlensWaveformConfidence = 'high' | 'medium' | 'low';

export interface MedlensSourceImageEvidence {
  sha256: string;
  mimeType?: string;
  widthPx?: number;
  heightPx?: number;
}

export interface MedlensWaveformImageQualityEvidence {
  status: MedlensWaveformQualityStatus;
  issues: string[];
}

export interface MedlensGridCalibrationEvidence {
  calibrated: boolean;
  paperSpeedMmPerSec?: 25 | 50;
  gainMmPerMv?: 10 | 5 | 20;
  pixelsPerSmallBox?: number;
  confidence: MedlensWaveformConfidence;
}

export interface MedlensLeadRegionEvidence {
  lead: MedlensWaveformLeadName;
  boundingBoxPx: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  labelDetectedBy: 'ocr' | 'layout' | 'manual';
  confidence: MedlensWaveformConfidence;
}

export interface MedlensWaveformTraceEvidence {
  lead: MedlensWaveformLeadName;
  traceExtracted: boolean;
  signalSamples?: number[];
  baselineSamples?: number[];
  confidence: MedlensWaveformConfidence;
  failureReason?: string;
}

export interface MedlensFiducialEvidence {
  lead: MedlensWaveformLeadName;
  pOnsetMs?: number;
  qrsOnsetMs?: number;
  jPointMs?: number;
  tEndMs?: number;
  confidence: MedlensWaveformConfidence;
}

export interface MedlensLeadMeasurementEvidence {
  lead: MedlensWaveformLeadName;
  stDeviationMm?: number;
  qrsPolarity?: 'positive' | 'negative' | 'biphasic' | 'unknown';
  tWavePattern?: 'upright' | 'inverted' | 'hyperacute' | 'flat' | 'unknown';
  qWavePresent?: boolean;
  confidence: MedlensWaveformConfidence;
  evidenceRef: string;
}

export interface MedlensRhythmEvidence {
  rhythmStripLead: MedlensWaveformLeadName;
  regularity?: 'regular' | 'irregular' | 'irregularly_irregular' | 'unknown';
  estimatedRateBpm?: number;
  pBeforeQrs?: 'consistent' | 'inconsistent' | 'not_assessable';
  confidence: MedlensWaveformConfidence;
  evidenceRef: string;
}

export interface MedlensWaveformEvidenceGate {
  passed: boolean;
  failedAssertions: string[];
  warnings: string[];
}

export interface MedlensWaveformEvidencePacket {
  packetType: 'medlens.ecg.waveform.evidence_packet.v1';
  sourceImage: MedlensSourceImageEvidence;
  imageQuality: MedlensWaveformImageQualityEvidence;
  gridCalibration: MedlensGridCalibrationEvidence;
  leadRegions: MedlensLeadRegionEvidence[];
  waveformTraces: MedlensWaveformTraceEvidence[];
  fiducials: MedlensFiducialEvidence[];
  leadMeasurements: MedlensLeadMeasurementEvidence[];
  rhythmEvidence?: MedlensRhythmEvidence;
  secondaryOcr?: {
    rawText: string;
    leadLabels?: string[];
    printedMeasurements?: Record<string, string>;
    printedMachineInterpretation?: string;
  };
  evidenceGate?: MedlensWaveformEvidenceGate;
  audit: {
    pipelineVersion: string;
    evidenceGateVersion: string;
    timestampIso: string;
  };
}

export interface MedlensBlockedWaveformOutput {
  outputType: 'medlens.ecg.waveform.physician_review_output.v1';
  status: 'blocked';
  failClosed: true;
  clinicalOutputAllowed: false;
  reason: string;
  failedAssertions: string[];
  warnings: string[];
  physicianActionRequired: true;
}

export interface MedlensWaveformPhysicianReviewOutput {
  outputType: 'medlens.ecg.waveform.physician_review_output.v1';
  status: 'ready_for_physician_review';
  failClosed: false;
  clinicalOutputAllowed: true;
  sourceImageHash: string;
  imageQuality: MedlensWaveformImageQualityEvidence;
  gridCalibration: MedlensGridCalibrationEvidence;
  leadMeasurements: MedlensLeadMeasurementEvidence[];
  rhythmEvidence?: MedlensRhythmEvidence;
  reviewScope: 'waveform_evidence_review_only';
  reviewNote: string;
  warnings: string[];
  audit: MedlensWaveformEvidencePacket['audit'];
}

export type MedlensWaveformOutput =
  | MedlensBlockedWaveformOutput
  | MedlensWaveformPhysicianReviewOutput;

export interface MedlensEcgAnalyzeResponse {
  status: 'ok';
  module: 'ecg';
  image_quality: MedlensEcgImageQuality;
  source_file: MedlensEcgSourceFile;
  extraction_method: EcgExtractionMethod;
  ocr_metadata: MedlensEcgOcrMetadata;
  raw_ecg_relevant_text: string[];
  ignored_or_redacted_identifiers_detected: boolean;
  physician_verification_required: true;
  ecg_clinical_output: EcgClinicalOutput;
  waveform_evidence_packet: MedlensWaveformEvidencePacket;
  waveform_review_output: MedlensWaveformOutput;
  audit_log: MedlensEcgAuditLog;
  disclaimer: string;
}
