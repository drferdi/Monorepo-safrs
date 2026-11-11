/* global Buffer, process, console */

import { createHash } from 'node:crypto';

import sharp from 'sharp';

import { extractWaveformPacketFromImage } from './ecg-waveform.mjs';

const ACCEPTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png']);
const ACCEPTED_MIME_TYPES = new Set(['image/jpeg', 'image/png']);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const PHYSICIAN_DISCLAIMER =
  'This MedLens output is a waveform-first physician-review packet and must be reviewed by a clinician.';
const FAIL_CLOSED_MESSAGE =
  'MedLens cannot produce ECG review output because waveform evidence is incomplete.';
const WAVEFORM_NOT_IMPLEMENTED_REASON = 'WAVEFORM_EXTRACTION_NOT_IMPLEMENTED';
const MEDLENS_WAVEFORM_GATE_VERSION = 'medlens-waveform-gate-v1.0.0';
const IDENTIFIER_PATTERNS = [
  /\bpatient\s*name\b/i,
  /\bname\b\s*:/i,
  /\bmrn\b/i,
  /\bmedical\s*record\b/i,
  /\bdob\b/i,
  /\bdate\s+of\s+birth\b/i,
  /\baddress\b/i,
  /\bphone\b/i,
  /\bmobile\b/i,
  /\bmember\s*id\b/i,
  /\bid\b\s*:/i,
];
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

export class MedlensInputError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'MedlensInputError';
    this.statusCode = statusCode;
  }
}

function getFileExtension(fileName) {
  const parts = String(fileName || '').toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

function isAcceptedImageFile(file) {
  const extension = getFileExtension(file.name);
  const mimeType = String(file.type || '').toLowerCase();
  const extensionAccepted = ACCEPTED_EXTENSIONS.has(extension);
  const mimeAccepted = !mimeType || ACCEPTED_MIME_TYPES.has(mimeType);
  return extensionAccepted && mimeAccepted;
}

function buildQualityAssessment(metadata) {
  const issues = [];
  const width = metadata.autoOrient?.width ?? metadata.width ?? 0;
  const height = metadata.autoOrient?.height ?? metadata.height ?? 0;
  let readable = true;
  let status = 'readable';

  if (!width || !height) {
    readable = false;
    status = 'unreadable';
    issues.push('Dimensi gambar tidak dapat dibaca dari file yang diunggah.');
  } else if (width < 480 || height < 480) {
    readable = false;
    status = 'unreadable';
    issues.push('Low image quality prevents reliable ECG extraction evidence.');
  } else if (width < 900 || height < 600) {
    status = 'limited';
    issues.push('Image quality is limited; verify the original ECG source directly.');
  }

  if (metadata.format && !ACCEPTED_EXTENSIONS.has(metadata.format)) {
    readable = false;
    status = 'unreadable';
    issues.push('Format metadata gambar tidak sesuai dengan format ECG yang didukung.');
  }

  return { readable, status, issues };
}

function quantile(values, percentile) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((first, second) => first - second);
  return sorted[Math.floor((sorted.length - 1) * percentile)];
}

async function detectVisibleEcgWaveformPresence(inputBuffer, metadata) {
  const width = metadata.autoOrient?.width ?? metadata.width ?? 0;
  const height = metadata.autoOrient?.height ?? metadata.height ?? 0;

  if (width < 1000 || height < 600) {
    return false;
  }

  let raw;
  try {
    raw = await sharp(inputBuffer, { limitInputPixels: false })
      .rotate()
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
  } catch {
    return false;
  }

  const imageWidth = raw.info.width;
  const imageHeight = raw.info.height;
  const channels = raw.info.channels;
  const data = raw.data;
  const leadLayout = [
    ['I', 0, 0],
    ['aVR', 1, 0],
    ['V1', 2, 0],
    ['V4', 3, 0],
    ['II', 0, 1],
    ['aVL', 1, 1],
    ['V2', 2, 1],
    ['V5', 3, 1],
    ['III', 0, 2],
    ['aVF', 1, 2],
    ['V3', 2, 2],
    ['V6', 3, 2],
  ];

  function isDarkTracePixel(x, y) {
    const index = (y * imageWidth + x) * channels;
    return data[index] < 90 && data[index + 1] < 90 && data[index + 2] < 90;
  }

  function analyzeLead(column, row) {
    const x0 = Math.round((column * imageWidth) / 4) + 25;
    const x1 = Math.round(((column + 1) * imageWidth) / 4) - 25;
    const y0 = Math.round(row * imageHeight * 0.235) + 45;
    const y1 = Math.round((row + 1) * imageHeight * 0.235) - 8;
    const samples = [];

    for (let x = x0; x < x1; x += 1) {
      const ys = [];
      for (let y = y0; y < y1; y += 1) {
        if (isDarkTracePixel(x, y)) {
          ys.push(y);
        }
      }

      if (ys.length > 0 && ys.length < 15) {
        ys.sort((first, second) => first - second);
        samples.push(ys[Math.floor(ys.length / 2)]);
      }
    }

    if (samples.length < 80) {
      return false;
    }

    const baseline = quantile(samples, 0.55);
    const up90 = quantile(samples.map((y) => baseline - y), 0.9);
    const down90 = quantile(samples.map((y) => y - baseline), 0.9);
    return up90 > 4 || down90 > 4;
  }

  return leadLayout.every(([, column, row]) => analyzeLead(column, row));
}

export function isMedlensEcgOcrEnabled(environment = process.env) {
  return String(environment?.MEDLENS_ECG_OCR_ENABLED || 'true').toLowerCase() !== 'false';
}

function sanitizeLine(rawLine) {
  return String(rawLine || '').replace(/\s+/g, ' ').trim();
}

function formatMsValue(value) {
  return value ? `${value} ms` : null;
}

function formatAxisValue(value) {
  return value ? `${value} deg` : null;
}

function isPatientIdentifierLine(line) {
  return IDENTIFIER_PATTERNS.some((pattern) => pattern.test(line));
}

function isEcgRelevantLine(line) {
  return [
    /\b(?:heart|ventricular|vent\.?|hr)\s*rate\b/i,
    /\b(?:pr|p-r)\s*(?:interval|int)?\b/i,
    /\bqrs(?:\s*(?:duration|dur))?\b/i,
    /\bqt(?:c)?\b/i,
    /\b(?:p\/qrs\/t|p\/r\/t|p-r-t)\s*ax(?:is|es)\b/i,
    /\b(?:sinus|atrial|junctional|paced|rhythm|fibrillation|flutter|tachycardia|bradycardia)\b/i,
    /\b(?:machine\s*)?interpret(?:ation)?\b/i,
    /\bdiagnos(?:is|tic)\b/i,
    /\bborderline ecg\b/i,
    /\bnormal ecg\b/i,
    /\bunconfirmed report\b/i,
    /\bnonspecific\b/i,
  ].some((pattern) => pattern.test(line));
}

function isCredibleEcgEvidenceLine(line) {
  return [
    /\b(?:heart|ventricular|vent\.?|hr)\s*rate(?:\s*bpm)?[:=\s]*[0-9]{2,3}(?:\s*bpm)?/i,
    /\b(?:pr|p-r)\s*(?:interval|int)\b[:=\s]*[0-9]{2,4}(?:\s*ms)?/i,
    /\bqrs(?:\s*(?:duration|dur))?\b[:=\s]*[0-9]{2,4}(?:\s*ms)?/i,
    /\bqt\s*\/\s*qtc(?:\s*ms)?[:\s]*[0-9]{2,4}\s*[/|]\s*[0-9]{2,4}(?:\s*ms)?/i,
    /\bqt[:=\s]*[0-9]{2,4}(?:\s*ms)?\b/i,
    /\bqtc[:=\s]*[0-9]{2,4}(?:\s*ms)?\b/i,
    /\b(?:p\/qrs\/t|p\/r\/t|p-r-t)\s*ax(?:is|es)[:=\s]*(-?[0-9]{1,3})[\s/,]+(-?[0-9]{1,3})[\s/,]+(-?[0-9]{1,3})/i,
    /\b(?:p|qrs|t)\s*axis[:=\s]*-?[0-9]{1,3}(?:\s*deg)?\b/i,
    /^(?:(?:machine\s*)?interpret(?:ation)?|diagnos(?:is|tic))\b[:\s-]*[A-Za-z0-9]/i,
    /\b(?:sinus rhythm|sinus tachycardia|sinus bradycardia|atrial fibrillation|atrial flutter|junctional rhythm|paced rhythm|supraventricular tachycardia|ventricular tachycardia|borderline ecg|normal ecg|nonspecific ST abnormality|ST elevation|STEMI)\b/i,
    /\b(?:25|50)\s*mm\s*\/?\s*sec\b/i,
    /\b(?:1|5|10|20)\s*cm\s*\/?\s*m[vV]\b/i,
  ].some((pattern) => pattern.test(line));
}

function isRhythmStatementLine(line) {
  return [
    /\bsinus rhythm\b/i,
    /\bsinus tachycardia\b/i,
    /\bsinus bradycardia\b/i,
    /\batrial fibrillation\b/i,
    /\batrial flutter\b/i,
    /\bjunctional rhythm\b/i,
    /\bpaced rhythm\b/i,
    /\bsupraventricular tachycardia\b/i,
    /\bventricular tachycardia\b/i,
    /\brhythm\b/i,
  ].some((pattern) => pattern.test(line));
}

function matchMachineInterpretationHeader(line) {
  return line.match(/^(?:(?:machine\s*)?interpret(?:ation)?|diagnos(?:is|tic))\b[:\s-]*(.*)$/i);
}

function isMachineInterpretationContinuationLine(line) {
  return [
    /\bborderline\b/i,
    /\bnormal\s+ecg\b/i,
    /\botherwise\s+normal\b/i,
    /\babnormal\b/i,
    /\bnonspecific\b/i,
    /\bunconfirmed\b/i,
    /\breport\b/i,
    /\bischemi/i,
    /\binfarct/i,
    /\bhypertrophy\b/i,
    /\bblock\b/i,
    /\bwave\b/i,
    /\bst\b/i,
    /\bt\s*wave\b/i,
    /\becg\b/i,
    /\bsinus\b/i,
    /\batrial\b/i,
    /\bflutter\b/i,
    /\bfibrillation\b/i,
  ].some((pattern) => pattern.test(line));
}

function uniquePush(list, value) {
  if (!value || list.includes(value)) return;
  list.push(value);
}

export function extractEcgTextSupportFromVisibleText(rawText) {
  const values = {
    heart_rate_or_ventricular_rate: null,
    pr_interval: null,
    qrs_duration: null,
    qt: null,
    qtc: null,
    p_axis: null,
    r_axis: null,
    t_axis: null,
    rhythm_statement: null,
    machine_interpretation_text: null,
  };
  const rawEcgRelevantText = [];
  const machineInterpretationLines = [];
  let ignoredOrRedactedIdentifiersDetected = false;
  let captureMachineInterpretation = false;

  for (const rawLine of String(rawText || '').split(/\r?\n/)) {
    const line = sanitizeLine(rawLine);
    if (!line) continue;

    if (isPatientIdentifierLine(line)) {
      ignoredOrRedactedIdentifiersDetected = true;
      continue;
    }

    if (captureMachineInterpretation) {
      if (isMachineInterpretationContinuationLine(line) && isCredibleEcgEvidenceLine(line)) {
        uniquePush(machineInterpretationLines, line);
        uniquePush(rawEcgRelevantText, line);
        if (!values.rhythm_statement && isRhythmStatementLine(line)) {
          values.rhythm_statement = line;
        }
        continue;
      }

      captureMachineInterpretation = false;
    }

    if (!isEcgRelevantLine(line)) {
      continue;
    }

     if (!isCredibleEcgEvidenceLine(line)) {
      continue;
    }

    uniquePush(rawEcgRelevantText, line);

    const rateMatch = line.match(
      /\b(?:heart|ventricular|vent\.?|hr)\s*rate(?:\s*bpm)?[:=\s]*([0-9]{2,3})(?:\s*bpm)?/i
    );
    if (rateMatch && !values.heart_rate_or_ventricular_rate) {
      values.heart_rate_or_ventricular_rate = `${rateMatch[1]} bpm`;
    }

    const prMatch = line.match(/\b(?:pr|p-r)\s*(?:interval|int)?[:=\s]*([0-9]{2,4})(?:\s*ms)?/i);
    if (prMatch && !values.pr_interval) {
      values.pr_interval = formatMsValue(prMatch[1]);
    }

    const qrsMatch = line.match(/\bqrs(?:\s*(?:duration|dur))?[:=\s]*([0-9]{2,4})(?:\s*ms)?/i);
    if (qrsMatch && !values.qrs_duration) {
      values.qrs_duration = formatMsValue(qrsMatch[1]);
    }

    const qtMatch = line.match(
      /\bqt\s*\/\s*qtc(?:\s*ms)?[:\s]*([0-9]{2,4})\s*[/|]\s*([0-9]{2,4})(?:\s*ms)?/i
    );
    if (qtMatch) {
      values.qt ||= formatMsValue(qtMatch[1]);
      values.qtc ||= formatMsValue(qtMatch[2]);
    }

    const qtOnlyMatch = line.match(/\bqt[:=\s]*([0-9]{2,4})(?:\s*ms)?\b/i);
    if (qtOnlyMatch && !values.qt) {
      values.qt = formatMsValue(qtOnlyMatch[1]);
    }

    const qtcOnlyMatch = line.match(/\bqtc[:=\s]*([0-9]{2,4})(?:\s*ms)?\b/i);
    if (qtcOnlyMatch && !values.qtc) {
      values.qtc = formatMsValue(qtcOnlyMatch[1]);
    }

    const axisMatch = line.match(
      /\b(?:p\/qrs\/t|p\/r\/t|p-r-t)\s*ax(?:is|es)[:=\s]*(-?[0-9]{1,3})[\s/,]+(-?[0-9]{1,3})[\s/,]+(-?[0-9]{1,3})/i
    );
    if (axisMatch) {
      values.p_axis ||= formatAxisValue(axisMatch[1]);
      values.r_axis ||= formatAxisValue(axisMatch[2]);
      values.t_axis ||= formatAxisValue(axisMatch[3]);
    }

    const pAxisMatch = line.match(/\bp\s*axis[:=\s]*(-?[0-9]{1,3})(?:\s*deg)?\b/i);
    if (pAxisMatch && !values.p_axis) {
      values.p_axis = formatAxisValue(pAxisMatch[1]);
    }

    const qrsAxisMatch = line.match(/\bqrs\s*axis[:=\s]*(-?[0-9]{1,3})(?:\s*deg)?\b/i);
    if (qrsAxisMatch && !values.r_axis) {
      values.r_axis = formatAxisValue(qrsAxisMatch[1]);
    }

    const tAxisMatch = line.match(/\bt\s*axis[:=\s]*(-?[0-9]{1,3})(?:\s*deg)?\b/i);
    if (tAxisMatch && !values.t_axis) {
      values.t_axis = formatAxisValue(tAxisMatch[1]);
    }

    const machineInterpretationMatch = matchMachineInterpretationHeader(line);
    if (machineInterpretationMatch) {
      const firstLine = machineInterpretationMatch[1].trim();
      captureMachineInterpretation = true;
      if (firstLine) {
        uniquePush(machineInterpretationLines, firstLine);
      }
      values.machine_interpretation_text = machineInterpretationLines.join(' | ') || null;
      continue;
    }

    if (!values.rhythm_statement && isRhythmStatementLine(line)) {
      values.rhythm_statement = line;
    }
  }

  if (!values.machine_interpretation_text && machineInterpretationLines.length > 0) {
    values.machine_interpretation_text = machineInterpretationLines.join(' | ');
  }

  const limitations = [
    'Only source-grounded printed ECG text is surfaced.',
    'Every surfaced ECG finding must be reviewed by a clinician.',
  ];

  if (rawEcgRelevantText.length === 0) {
    limitations.unshift('No ECG-relevant printed text could be extracted from the uploaded source.');
  }

  return {
    ocr_extracted_values: values,
    raw_ecg_relevant_text: rawEcgRelevantText,
    ignored_or_redacted_identifiers_detected: ignoredOrRedactedIdentifiersDetected,
    limitations,
    physician_verification_required: true,
  };
}

function buildEmptyTextSupport() {
  return extractEcgTextSupportFromVisibleText('');
}

function buildUnavailableOcrMetadata() {
  return {
    ocr_source: 'unavailable',
    selected_region: null,
    region_score: 0,
    candidate_count: 0,
    full_image_ocr_used: false,
  };
}

function _buildWaveformEvidencePacket({
  sourceHash,
  file,
  metadata,
  imageQuality,
  textSupport,
}) {
  return {
    packetType: 'medlens.ecg.waveform.evidence_packet.v1',
    sourceImage: {
      sha256: sourceHash,
      mimeType: file.type || undefined,
      widthPx: metadata.autoOrient?.width ?? metadata.width ?? undefined,
      heightPx: metadata.autoOrient?.height ?? metadata.height ?? undefined,
    },
    imageQuality: {
      status: imageQuality.status,
      issues: [...imageQuality.issues],
    },
    gridCalibration: {
      calibrated: false,
      confidence: 'low',
    },
    leadRegions: [],
    waveformTraces: [
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
      'RHYTHM_II',
    ].map((lead) => ({
      lead,
      traceExtracted: false,
      confidence: 'low',
      failureReason: WAVEFORM_NOT_IMPLEMENTED_REASON,
    })),
    fiducials: [],
    leadMeasurements: [],
    secondaryOcr:
      textSupport.raw_ecg_relevant_text.length > 0
        ? {
            rawText: textSupport.raw_ecg_relevant_text.join('\n'),
            printedMeasurements: Object.fromEntries(
              Object.entries(textSupport.ocr_extracted_values)
                .map(([key, value]) => [key, sanitizeLine(value)])
                .filter(([, value]) => Boolean(value))
            ),
            printedMachineInterpretation:
              sanitizeLine(textSupport.ocr_extracted_values.machine_interpretation_text) || undefined,
          }
        : undefined,
    audit: {
      pipelineVersion: 'medlens-waveform-repair-v1',
      evidenceGateVersion: MEDLENS_WAVEFORM_GATE_VERSION,
      timestampIso: new Date().toISOString(),
    },
  };
}

function _buildWaveformReviewOutput(waveformEvidencePacket) {
  const failedAssertions = [];
  const warnings = [WAVEFORM_NOT_IMPLEMENTED_REASON];

  if (!waveformEvidencePacket.sourceImage?.sha256) {
    failedAssertions.push('MISSING_OR_INVALID_SOURCE_IMAGE_HASH');
  }
  if (waveformEvidencePacket.imageQuality.status === 'unreadable') {
    failedAssertions.push('IMAGE_UNREADABLE');
  }
  if (!waveformEvidencePacket.gridCalibration.calibrated) {
    failedAssertions.push('GRID_NOT_CALIBRATED');
  }
  if (waveformEvidencePacket.leadRegions.length < 12) {
    failedAssertions.push('INSUFFICIENT_12_LEAD_REGION_DETECTION');
  }
  if (
    waveformEvidencePacket.waveformTraces.filter((trace) => trace.traceExtracted).length < 12
  ) {
    failedAssertions.push('INSUFFICIENT_WAVEFORM_TRACE_EXTRACTION');
  }
  if (waveformEvidencePacket.leadMeasurements.length === 0) {
    failedAssertions.push('MISSING_LEAD_LEVEL_WAVEFORM_MEASUREMENTS');
  }
  if (
    waveformEvidencePacket.secondaryOcr?.printedMachineInterpretation &&
    waveformEvidencePacket.waveformTraces.every((trace) => trace.traceExtracted !== true)
  ) {
    failedAssertions.push('TEXT_ONLY_OCR_CANNOT_SUPPORT_CLINICAL_OUTPUT');
  }

  waveformEvidencePacket.evidenceGate = {
    passed: false,
    failedAssertions,
    warnings,
  };

  return {
    outputType: 'medlens.ecg.waveform.physician_review_output.v1',
    status: 'blocked',
    failClosed: true,
    clinicalOutputAllowed: false,
    reason: WAVEFORM_NOT_IMPLEMENTED_REASON,
    failedAssertions,
    warnings,
    physicianActionRequired: true,
  };
}

function normalizeFindingFromRawText(rawText) {
  const line = sanitizeLine(rawText);
  const match = line.match(/^(?:(?:machine\s*)?interpret(?:ation)?|diagnos(?:is|tic))\b[:\s-]*(.*)$/i);
  if (!match) return line || null;
  return sanitizeLine(match[1]) || null;
}

function _inferEvidenceConfidence(imageQuality, ocrMetadata) {
  if (!imageQuality.readable) return 0.35;
  if (ocrMetadata.ocr_source === 'crop' && ocrMetadata.region_score >= 12 && !ocrMetadata.full_image_ocr_used) {
    return 0.92;
  }
  if (ocrMetadata.ocr_source === 'full_image') return 0.65;
  return 0.72;
}

function _buildEvidenceFromRawLines({
  rawLines,
  sourceFileId,
  sourceHash,
  sourceType,
  extractionMethod,
  regionLabel,
  confidence,
}) {
  const findings = [];
  const seen = new Set();

  for (const rawLine of rawLines) {
    const sanitized = sanitizeLine(rawLine);
    if (!sanitized || seen.has(sanitized)) {
      continue;
    }
    const normalizedFinding = normalizeFindingFromRawText(sanitized);
    if (!normalizedFinding) {
      continue;
    }

    seen.add(sanitized);
    findings.push({
      sourceFileId,
      sourceHash,
      sourceType,
      extractionMethod,
      rawText: sanitized,
      normalizedFinding,
      confidence,
      evidenceLocation: regionLabel ? { regionLabel } : undefined,
    });
  }

  return findings;
}

function _deriveDeterministicRedFlags(findings) {
  return findings.filter((finding) =>
    RED_FLAG_PATTERNS.some((pattern) =>
      pattern.test(`${finding.normalizedFinding || ''} ${finding.rawText}`)
    )
  );
}

function _outputPassesEvidenceGate(output) {
  return (
    output.status === 'source_grounded' &&
    output.clinicianReviewRequired === true &&
    Array.isArray(output.findings) &&
    output.findings.length > 0 &&
    output.findings.every(
      (finding) =>
        sanitizeLine(finding.rawText) &&
        sanitizeLine(finding.sourceHash) &&
        sanitizeLine(finding.sourceFileId) &&
        Number.isFinite(finding.confidence) &&
        finding.confidence > 0
    )
  );
}

function buildClinicalOutput({
  imageQuality,
  sourceType,
  extractionMethod: _extractionMethod,
  ocrMetadata: _ocrMetadata,
  textSupport,
  ocrFailureReason,
  waveformReady,
}) {
  const baseLimitations = [
    ...imageQuality.issues,
    ...textSupport.limitations,
  ]
    .map(sanitizeLine)
    .filter(Boolean);

  const limitations = waveformReady
    ? Array.from(
        new Set(
          [
            ...baseLimitations,
            !imageQuality.readable
              ? 'Low image quality prevents reliable ECG extraction evidence.'
              : null,
            ocrFailureReason || null,
            'Waveform physician-review packet generated separately; no autonomous ECG diagnosis is emitted.',
          ].filter(Boolean)
        )
      )
    : Array.from(
        new Set(
          [
            FAIL_CLOSED_MESSAGE,
            WAVEFORM_NOT_IMPLEMENTED_REASON,
            ...baseLimitations,
            !imageQuality.readable
              ? 'Low image quality prevents reliable ECG extraction evidence.'
              : null,
            ocrFailureReason || null,
            'Legacy OCR-based clinical ECG output is disabled until waveform evidence is available.',
          ].filter(Boolean)
        )
      );

  return {
    status: !imageQuality.readable
      ? 'insufficient_evidence'
      : waveformReady
        ? 'insufficient_evidence'
        : ocrFailureReason
        ? 'extraction_failed'
        : sourceType === 'waveform_only'
          ? 'unsupported_source'
          : 'insufficient_evidence',
    findings: [],
    redFlags: [],
    limitations,
    clinicianReviewRequired: true,
  };
}

async function loadLocalOcrRecognizer() {
  const module = await import('./ecg-ocr.mjs');
  return module.recognizeEcgTextFromImageBuffer;
}

export async function analyzeEcgImageFile(file, options = {}) {
  if (!file) {
    throw new MedlensInputError(400, 'Field file wajib diisi.');
  }

  if (!isAcceptedImageFile(file)) {
    throw new MedlensInputError(
      415,
      'Format gambar EKG tidak didukung. Gunakan PNG, JPG, atau JPEG.'
    );
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw new MedlensInputError(400, 'Ukuran file EKG tidak valid.');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new MedlensInputError(413, 'Ukuran file EKG melebihi batas 10 MB.');
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const sourceHash = createHash('sha256').update(inputBuffer).digest('hex');
  const sourceFileId = `ecg-${sourceHash.slice(0, 12)}`;
  let metadata;

  try {
    metadata = await sharp(inputBuffer).metadata();
  } catch {
    throw new MedlensInputError(422, 'File gambar EKG tidak dapat diproses.');
  }

  const imageQuality = buildQualityAssessment(metadata);
  const detectWaveformPresence =
    options.detectWaveformPresence ??
    (async (buffer) => detectVisibleEcgWaveformPresence(buffer, metadata));
  const waveformPresenceHint = Boolean(await detectWaveformPresence(inputBuffer, metadata));
  const ocrEnabled = options.ocrEnabled ?? isMedlensEcgOcrEnabled();
  let textSupport = buildEmptyTextSupport();
  let ocrMetadata = buildUnavailableOcrMetadata();
  let extractionMethod = 'unsupported';
  let ocrFailureReason = null;

  if (ocrEnabled) {
    try {
      const recognizeTextFromImageBuffer =
        options.recognizeTextFromImageBuffer ?? (await loadLocalOcrRecognizer());
      const recognitionResult = await recognizeTextFromImageBuffer(inputBuffer, {
        regionPresets: options.ocrRegionPresets,
      });
      const recognizedText =
        typeof recognitionResult === 'string' ? recognitionResult : recognitionResult.text;
      extractionMethod = 'ocr';
      ocrMetadata =
        typeof recognitionResult === 'object' && recognitionResult
          ? {
              ocr_source: recognitionResult.source === 'full-image' ? 'full_image' : 'crop',
              selected_region:
                recognitionResult.source === 'full-image'
                  ? 'full_image'
                  : recognitionResult.regionId || null,
              region_score: Number.isFinite(recognitionResult.score) ? recognitionResult.score : 0,
              candidate_count: Number.isFinite(recognitionResult.candidateCount)
                ? recognitionResult.candidateCount
                : 0,
              full_image_ocr_used: Boolean(recognitionResult.fallbackUsed),
            }
          : buildUnavailableOcrMetadata();
      textSupport = extractEcgTextSupportFromVisibleText(recognizedText);
      if (
        typeof recognitionResult === 'object' &&
        recognitionResult &&
        recognitionResult.identifierDetected
      ) {
        textSupport.ignored_or_redacted_identifiers_detected = true;
      }
    } catch {
      extractionMethod = 'ocr';
      textSupport = buildEmptyTextSupport();
      ocrFailureReason = 'OCR failure prevented reliable ECG extraction from the uploaded source.';
    }
  }

  const waveformResult = await extractWaveformPacketFromImage({
    inputBuffer,
    sourceHash,
    file,
    metadata,
    imageQuality,
    textSupport,
  });
  const waveformEvidencePacket = waveformResult.packet;
  const waveformReviewOutput = waveformResult.reviewOutput;
  const extractedWaveformCount = waveformEvidencePacket.waveformTraces.filter(
    (trace) => trace.traceExtracted === true
  ).length;
  const waveformDetected = extractedWaveformCount >= 12 || waveformPresenceHint;
  const waveformReady =
    waveformReviewOutput.status === 'ready_for_physician_review' &&
    waveformReviewOutput.clinicalOutputAllowed === true;

  const sourceType =
    textSupport.raw_ecg_relevant_text.length > 0
      ? 'ecg_image_with_printed_result'
      : waveformDetected
        ? 'waveform_only'
        : 'unknown';

  ocrMetadata = {
    ...ocrMetadata,
    source_hash: sourceHash,
    source_file_id: sourceFileId,
  };

  if (waveformReady) {
    extractionMethod = 'waveform';
  }

  const ecgClinicalOutput = buildClinicalOutput({
    imageQuality,
    sourceType,
    extractionMethod,
    ocrMetadata,
    textSupport,
    ocrFailureReason,
    waveformReady,
  });

  const auditLog = {
    uploadedSourceHash: sourceHash,
    extractionMethod,
    rawExtractedText: textSupport.raw_ecg_relevant_text,
    rejectedLlmAdditions: [],
    finalRenderedOutput: {
      status: ecgClinicalOutput.status,
      findingsCount: ecgClinicalOutput.findings.length,
      redFlagsCount: ecgClinicalOutput.redFlags.length,
    },
    outputPassedEvidenceGate:
      waveformReviewOutput.status === 'ready_for_physician_review' &&
      waveformReviewOutput.clinicalOutputAllowed === true,
  };

  console.warn(
    '[MedLens][ECG][Audit]',
    JSON.stringify({
      sourceHash,
      extractionMethod,
      rawExtractedText: textSupport.raw_ecg_relevant_text,
      rejectedLlmAdditions: [],
      finalRenderedOutput: auditLog.finalRenderedOutput,
      outputPassedEvidenceGate: auditLog.outputPassedEvidenceGate,
    })
  );

  return {
    status: 'ok',
    module: 'ecg',
    image_quality: imageQuality,
    source_file: {
      sourceFileId,
      sourceHash,
      sourceType,
      fileName: file.name || null,
    },
    extraction_method: extractionMethod,
    ocr_metadata: {
      ocr_source: ocrMetadata.ocr_source,
      selected_region: ocrMetadata.selected_region,
      region_score: ocrMetadata.region_score,
      candidate_count: ocrMetadata.candidate_count,
      full_image_ocr_used: ocrMetadata.full_image_ocr_used,
    },
    raw_ecg_relevant_text: textSupport.raw_ecg_relevant_text,
    ignored_or_redacted_identifiers_detected:
      textSupport.ignored_or_redacted_identifiers_detected,
    physician_verification_required: true,
    ecg_clinical_output: ecgClinicalOutput,
    waveform_evidence_packet: waveformEvidencePacket,
    waveform_review_output: waveformReviewOutput,
    audit_log: auditLog,
    disclaimer: PHYSICIAN_DISCLAIMER,
  };
}
