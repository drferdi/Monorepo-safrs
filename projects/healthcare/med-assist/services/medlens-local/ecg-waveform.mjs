import sharp from 'sharp';

const LEAD_LAYOUT = [
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

const REQUIRED_TWELVE_LEADS = LEAD_LAYOUT.map(([lead]) => lead);

function quantile(values, percentile) {
  if (!values.length) return 0;
  const sorted = [...values].sort((first, second) => first - second);
  return sorted[Math.floor((sorted.length - 1) * percentile)];
}

function median(values) {
  return quantile(values, 0.5);
}

function clampConfidence(value) {
  if (value >= 0.85) return 'high';
  if (value >= 0.55) return 'medium';
  return 'low';
}

function isGridPixel(data, index) {
  const red = data[index];
  const green = data[index + 1];
  const blue = data[index + 2];
  const brightness = (red + green + blue) / 3;
  const spread = Math.max(red, green, blue) - Math.min(red, green, blue);
  const coloredGrid = red > 150 && red > green + 18 && red > blue + 18;
  const grayscaleGrid = spread <= 18 && brightness >= 150 && brightness <= 245;
  return coloredGrid || grayscaleGrid;
}

function isDarkTracePixel(data, index) {
  const red = data[index];
  const green = data[index + 1];
  const blue = data[index + 2];
  return red < 120 && green < 120 && blue < 120;
}

function buildLeadBoxes(width, height) {
  return LEAD_LAYOUT.map(([lead, column, row]) => {
    const x0 = Math.round((column * width) / 4) + 24;
    const x1 = Math.round(((column + 1) * width) / 4) - 24;
    const y0 = Math.round(row * height * 0.235) + 44;
    const y1 = Math.round((row + 1) * height * 0.235) - 12;
    return {
      lead,
      box: {
        x: x0,
        y: y0,
        width: Math.max(20, x1 - x0),
        height: Math.max(20, y1 - y0),
      },
    };
  });
}

function buildRhythmBox(width, height) {
  const x0 = 24;
  const x1 = width - 24;
  const y0 = Math.round(height * 0.74);
  const y1 = height - 24;
  return {
    lead: 'RHYTHM_II',
    box: {
      x: x0,
      y: y0,
      width: Math.max(20, x1 - x0),
      height: Math.max(20, y1 - y0),
    },
  };
}

function detectDominantSpacing(projection, minimumSpacing, maximumSpacing) {
  if (!projection.length) return null;
  const peakThreshold = Math.max(6, quantile(projection, 0.985) * 0.55);
  const peaks = [];

  for (let index = 0; index < projection.length; index += 1) {
    if (projection[index] < peakThreshold) {
      continue;
    }

    const runStart = index;
    let runPeakIndex = index;
    let runPeakValue = projection[index];

    while (index + 1 < projection.length && projection[index + 1] >= peakThreshold) {
      index += 1;
      if (projection[index] > runPeakValue) {
        runPeakValue = projection[index];
        runPeakIndex = index;
      }
    }

    const runEnd = index;
    peaks.push(Math.round((runStart + runEnd + runPeakIndex) / 3));
  }

  if (peaks.length < 4) return null;

  const counts = new Map();
  for (let index = 1; index < peaks.length; index += 1) {
    const gap = peaks[index] - peaks[index - 1];
    if (gap >= minimumSpacing && gap <= maximumSpacing) {
      const roundedGap = Math.round(gap);
      counts.set(roundedGap, (counts.get(roundedGap) || 0) + 1);
    }
  }

  let bestGap = null;
  let bestCount = 0;
  for (const [gap, count] of counts.entries()) {
    if (count > bestCount) {
      bestGap = gap;
      bestCount = count;
    }
  }

  if (!bestGap || bestCount < 6) {
    return null;
  }

  return bestGap;
}

function detectGridCalibration(rawImage) {
  const width = rawImage.info.width;
  const height = rawImage.info.height;
  const channels = rawImage.info.channels;
  const data = rawImage.data;
  const xProjection = new Array(width).fill(0);
  const yProjection = new Array(height).fill(0);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * channels;
      if (!isGridPixel(data, index)) {
        continue;
      }

      xProjection[x] += 1;
      yProjection[y] += 1;
    }
  }

  const xSpacing = detectDominantSpacing(xProjection, 2, 16);
  const ySpacing = detectDominantSpacing(yProjection, 2, 16);
  const candidates = [xSpacing, ySpacing].filter((value) => Number.isFinite(value));

  if (candidates.length === 0) {
    return {
      calibrated: false,
      confidence: 'low',
    };
  }

  const pixelsPerSmallBox = Math.max(2, Math.round(median(candidates)));
  const confidence = clampConfidence(candidates.length === 2 ? 0.9 : 0.7);

  return {
    calibrated: true,
    paperSpeedMmPerSec: 25,
    gainMmPerMv: 10,
    pixelsPerSmallBox,
    confidence,
  };
}

function interpolateSeries(samples) {
  const result = [...samples];
  let previousKnownIndex = -1;

  for (let index = 0; index < result.length; index += 1) {
    if (Number.isFinite(result[index])) {
      previousKnownIndex = index;
      continue;
    }

    let nextKnownIndex = index + 1;
    while (nextKnownIndex < result.length && !Number.isFinite(result[nextKnownIndex])) {
      nextKnownIndex += 1;
    }

    if (previousKnownIndex === -1 && nextKnownIndex < result.length) {
      result[index] = result[nextKnownIndex];
      continue;
    }

    if (nextKnownIndex >= result.length && previousKnownIndex !== -1) {
      result[index] = result[previousKnownIndex];
      continue;
    }

    if (previousKnownIndex !== -1 && nextKnownIndex < result.length) {
      const start = result[previousKnownIndex];
      const end = result[nextKnownIndex];
      const span = nextKnownIndex - previousKnownIndex;
      const progress = index - previousKnownIndex;
      result[index] = start + ((end - start) * progress) / span;
    }
  }

  return result.filter((value) => Number.isFinite(value));
}

function smoothSignal(signalSamples, radius = 1) {
  if (!signalSamples?.length || radius <= 0) {
    return signalSamples || [];
  }

  return signalSamples.map((_, index) => {
    let total = 0;
    let count = 0;

    for (let offset = -radius; offset <= radius; offset += 1) {
      const sampleIndex = index + offset;
      if (sampleIndex < 0 || sampleIndex >= signalSamples.length) {
        continue;
      }

      total += signalSamples[sampleIndex];
      count += 1;
    }

    return count > 0 ? total / count : signalSamples[index];
  });
}

function extractTraceFromBox(rawImage, box, options = {}) {
  const width = rawImage.info.width;
  const channels = rawImage.info.channels;
  const data = rawImage.data;
  const usableStartOffset = options.skipLabelArea
    ? Math.min(24, Math.max(10, Math.round(box.width * 0.08)))
    : 0;
  const rawSamples = [];
  let sampledColumns = 0;

  for (let x = box.x + usableStartOffset; x < box.x + box.width; x += 1) {
    const ys = [];

    for (let y = box.y + 4; y < box.y + box.height - 4; y += 1) {
      const index = (y * width + x) * channels;
      if (isDarkTracePixel(data, index)) {
        ys.push(y);
      }
    }

    if (ys.length > 0 && ys.length <= Math.max(16, Math.round(box.height * 0.18))) {
      ys.sort((first, second) => first - second);
      rawSamples.push(ys[Math.floor(ys.length / 2)]);
      sampledColumns += 1;
    } else {
      rawSamples.push(null);
    }
  }

  const coverage = rawSamples.length > 0 ? sampledColumns / rawSamples.length : 0;
  if (coverage < 0.35) {
    return {
      traceExtracted: false,
      coverage,
      confidence: 'low',
      failureReason: 'TRACE_PIXEL_COVERAGE_TOO_LOW',
    };
  }

  const interpolated = interpolateSeries(rawSamples);
  if (interpolated.length < Math.max(80, Math.round(box.width * 0.5))) {
    return {
      traceExtracted: false,
      coverage,
      confidence: 'low',
      failureReason: 'TRACE_SAMPLE_COUNT_TOO_LOW',
    };
  }

  const baselineY = median(interpolated);
  const signalSamples = interpolated.map((value) => Number((baselineY - value).toFixed(3)));
  const amplitude = quantile(signalSamples.map((value) => Math.abs(value)), 0.95);
  const minimumAmplitude = 3;
  if (amplitude < minimumAmplitude) {
    return {
      traceExtracted: false,
      coverage,
      confidence: 'low',
      failureReason: 'TRACE_AMPLITUDE_TOO_LOW',
    };
  }

  const confidenceScore = Math.min(0.98, coverage * 0.75 + Math.min(amplitude / 20, 0.25));

  return {
    traceExtracted: true,
    signalSamples,
    baselineSamples: new Array(signalSamples.length).fill(0),
    coverage,
    amplitude,
    baselineY,
    confidence: clampConfidence(confidenceScore),
  };
}

function detectPeaks(signalSamples, pixelsPerSecond) {
  if (!signalSamples?.length) return [];
  const smoothedSignal = smoothSignal(signalSamples, 1);
  const positivePeak = quantile(smoothedSignal, 0.985);
  const threshold = Math.max(5, positivePeak * 0.45);
  const minimumDistance = Math.max(16, Math.round(pixelsPerSecond * 0.35));
  const peaks = [];

  for (let index = 2; index < smoothedSignal.length - 2; index += 1) {
    const value = smoothedSignal[index];
    if (
      value < threshold ||
      value < smoothedSignal[index - 1] ||
      value < smoothedSignal[index + 1] ||
      value < smoothedSignal[index - 2] ||
      value < smoothedSignal[index + 2]
    ) {
      continue;
    }

    let refinedPeakIndex = index;
    const refinementStart = Math.max(0, index - 2);
    const refinementEnd = Math.min(signalSamples.length - 1, index + 2);
    for (let candidate = refinementStart; candidate <= refinementEnd; candidate += 1) {
      if (signalSamples[candidate] > signalSamples[refinedPeakIndex]) {
        refinedPeakIndex = candidate;
      }
    }

    const lastPeakIndex = peaks.length > 0 ? peaks[peaks.length - 1] : -minimumDistance;
    if (refinedPeakIndex - lastPeakIndex < minimumDistance) {
      if (signalSamples[refinedPeakIndex] > signalSamples[lastPeakIndex]) {
        peaks[peaks.length - 1] = refinedPeakIndex;
      }
      continue;
    }

    peaks.push(refinedPeakIndex);
  }

  return peaks;
}

function buildLeadMeasurement(lead, trace, peakIndex) {
  const signalSamples = trace.signalSamples || [];
  const positiveAmplitude = quantile(signalSamples, 0.98);
  const negativeAmplitude = Math.abs(quantile(signalSamples, 0.02));
  let qrsPolarity = 'unknown';

  if (positiveAmplitude > negativeAmplitude * 1.2 && positiveAmplitude > 5) {
    qrsPolarity = 'positive';
  } else if (negativeAmplitude > positiveAmplitude * 1.2 && negativeAmplitude > 5) {
    qrsPolarity = 'negative';
  } else if (positiveAmplitude > 4 && negativeAmplitude > 4) {
    qrsPolarity = 'biphasic';
  }

  const tailStart = Math.min(signalSamples.length - 1, Math.max(0, Math.floor(signalSamples.length * 0.55)));
  const tailSamples = signalSamples.slice(tailStart);
  const tailPositive = quantile(tailSamples, 0.9);
  const tailNegative = Math.abs(quantile(tailSamples, 0.1));
  let tWavePattern = 'unknown';

  if (tailPositive > tailNegative * 1.2 && tailPositive > 1.5) {
    tWavePattern = 'upright';
  } else if (tailNegative > tailPositive * 1.2 && tailNegative > 1.5) {
    tWavePattern = 'inverted';
  } else if (tailPositive > 3.2) {
    tWavePattern = 'hyperacute';
  } else if (tailPositive < 1 && tailNegative < 1) {
    tWavePattern = 'flat';
  }

  const qSearchStart = Math.max(0, peakIndex - 18);
  const qSearchEnd = Math.max(qSearchStart, peakIndex - 2);
  const qWavePresent =
    signalSamples.slice(qSearchStart, qSearchEnd).some((value) => value < -positiveAmplitude * 0.12) || false;

  return {
    lead,
    qrsPolarity,
    tWavePattern,
    qWavePresent,
    confidence: trace.confidence,
    evidenceRef: `waveform:${lead}`,
  };
}

function buildFiducial(lead, peakIndex, pixelsPerSecond, confidence) {
  const millisecondsPerPixel = 1000 / pixelsPerSecond;
  return {
    lead,
    qrsOnsetMs: Number(Math.max(0, (peakIndex - 4) * millisecondsPerPixel).toFixed(1)),
    jPointMs: Number(Math.max(0, (peakIndex + 6) * millisecondsPerPixel).toFixed(1)),
    tEndMs: Number(Math.max(0, (peakIndex + 30) * millisecondsPerPixel).toFixed(1)),
    confidence,
  };
}

function buildRhythmEvidence(trace, pixelsPerSecond) {
  if (!trace?.traceExtracted || !trace.signalSamples?.length) {
    return undefined;
  }

  const peaks = detectPeaks(trace.signalSamples, pixelsPerSecond);
  if (peaks.length < 2) {
    return {
      rhythmStripLead: 'RHYTHM_II',
      regularity: 'unknown',
      pBeforeQrs: 'not_assessable',
      confidence: 'low',
      evidenceRef: 'waveform:RHYTHM_II',
    };
  }

  const intervals = [];
  for (let index = 1; index < peaks.length; index += 1) {
    intervals.push(peaks[index] - peaks[index - 1]);
  }

  const upperQuartileInterval = quantile(intervals, 0.75);
  const lowerBound = Math.max(
    Math.round(pixelsPerSecond * 0.28),
    Math.round(upperQuartileInterval * 0.6)
  );
  const upperBound = Math.max(
    lowerBound + 1,
    Math.round(Math.max(upperQuartileInterval * 1.75, pixelsPerSecond * 1.8))
  );
  const dominantIntervals = intervals.filter(
    (interval) => interval >= lowerBound && interval <= upperBound
  );
  const rhythmIntervals = dominantIntervals.length > 0 ? dominantIntervals : intervals;

  const medianInterval = median(rhythmIntervals);
  const estimatedRateBpm = Math.round((60 * pixelsPerSecond) / medianInterval);
  const variance = rhythmIntervals.map((interval) => Math.abs(interval - medianInterval));
  const normalizedJitter = medianInterval > 0 ? median(variance) / medianInterval : 1;
  const regularity =
    normalizedJitter < 0.08 ? 'regular' : normalizedJitter < 0.2 ? 'irregular' : 'irregularly_irregular';
  const confidence = clampConfidence(
    Math.min(
      0.95,
      0.55 +
        Math.min(rhythmIntervals.length / 8, 0.25) +
        Math.max(0, 0.15 - normalizedJitter)
    )
  );

  return {
    rhythmStripLead: 'RHYTHM_II',
    regularity,
    estimatedRateBpm,
    pBeforeQrs: 'not_assessable',
    confidence,
    evidenceRef: 'waveform:RHYTHM_II',
  };
}

function buildEvidenceGate(packet) {
  const failedAssertions = [];
  const warnings = [];
  const uniqueLeadRegions = new Set(packet.leadRegions.map((region) => region.lead));
  const extractedTraceCount = packet.waveformTraces.filter((trace) => trace.traceExtracted).length;
  const hasUsableRawOcrText =
    typeof packet.secondaryOcr?.rawText === 'string' &&
    packet.secondaryOcr.rawText.trim().length > 0;

  if (!packet.sourceImage?.sha256) {
    failedAssertions.push('MISSING_OR_INVALID_SOURCE_IMAGE_HASH');
  }
  if (packet.imageQuality.status === 'unreadable') {
    failedAssertions.push('IMAGE_UNREADABLE');
  } else if (packet.imageQuality.status === 'limited') {
    warnings.push('IMAGE_QUALITY_LIMITED');
  }
  if (!packet.gridCalibration.calibrated) {
    failedAssertions.push('GRID_NOT_CALIBRATED');
  }
  if (uniqueLeadRegions.size < REQUIRED_TWELVE_LEADS.length) {
    failedAssertions.push('INSUFFICIENT_12_LEAD_REGION_DETECTION');
  }
  if (extractedTraceCount < REQUIRED_TWELVE_LEADS.length) {
    failedAssertions.push('INSUFFICIENT_WAVEFORM_TRACE_EXTRACTION');
  }
  if (packet.leadMeasurements.length === 0) {
    failedAssertions.push('MISSING_LEAD_LEVEL_WAVEFORM_MEASUREMENTS');
  }
  if (!hasUsableRawOcrText) {
    failedAssertions.push('MISSING_RAW_OCR_TEXT');
  }
  if (
    packet.rhythmEvidence &&
    !packet.waveformTraces.some(
      (trace) =>
        trace.lead === packet.rhythmEvidence.rhythmStripLead && trace.traceExtracted === true
    )
  ) {
    failedAssertions.push('RHYTHM_STRIP_UNAVAILABLE_FOR_RHYTHM_CLAIM');
  }
  if (packet.secondaryOcr?.printedMachineInterpretation && extractedTraceCount === 0) {
    failedAssertions.push('TEXT_ONLY_OCR_CANNOT_SUPPORT_CLINICAL_OUTPUT');
  }

  return {
    passed: failedAssertions.length === 0,
    failedAssertions: Array.from(new Set(failedAssertions)),
    warnings: Array.from(new Set(warnings)),
  };
}

function buildReviewOutput(packet) {
  const evidenceGate = buildEvidenceGate(packet);
  packet.evidenceGate = evidenceGate;

  if (!evidenceGate.passed) {
    return {
      outputType: 'medlens.ecg.waveform.physician_review_output.v1',
      status: 'blocked',
      failClosed: true,
      clinicalOutputAllowed: false,
      reason: evidenceGate.failedAssertions.includes('TEXT_ONLY_OCR_CANNOT_SUPPORT_CLINICAL_OUTPUT')
        ? 'TEXT_ONLY_OCR_CANNOT_SUPPORT_CLINICAL_OUTPUT'
        : 'WAVEFORM_EVIDENCE_GATE_FAILED',
      failedAssertions: evidenceGate.failedAssertions,
      warnings: evidenceGate.warnings,
      physicianActionRequired: true,
    };
  }

  return {
    outputType: 'medlens.ecg.waveform.physician_review_output.v1',
    status: 'ready_for_physician_review',
    failClosed: false,
    clinicalOutputAllowed: true,
    sourceImageHash: packet.sourceImage.sha256,
    imageQuality: packet.imageQuality,
    gridCalibration: packet.gridCalibration,
    leadMeasurements: packet.leadMeasurements,
    rhythmEvidence: packet.rhythmEvidence,
    reviewScope: 'waveform_evidence_review_only',
    reviewNote:
      'Waveform-derived ECG evidence is ready for physician review. This output is not an autonomous diagnosis and must be interpreted by a qualified clinician in clinical context.',
    warnings: evidenceGate.warnings,
    audit: packet.audit,
  };
}

export async function extractWaveformPacketFromImage({
  inputBuffer,
  sourceHash,
  file,
  metadata,
  imageQuality,
  textSupport,
}) {
  let rawImage;
  try {
    rawImage = await sharp(inputBuffer, { limitInputPixels: false })
      .rotate()
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
  } catch {
    return {
      packet: {
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
        waveformTraces: [],
        fiducials: [],
        leadMeasurements: [],
        secondaryOcr:
          textSupport.raw_ecg_relevant_text.length > 0
            ? {
                rawText: textSupport.raw_ecg_relevant_text.join('\n'),
                printedMeasurements: Object.fromEntries(
                  Object.entries(textSupport.ocr_extracted_values).filter(([, value]) => Boolean(value))
                ),
                printedMachineInterpretation:
                  textSupport.ocr_extracted_values.machine_interpretation_text || undefined,
              }
            : undefined,
        audit: {
          pipelineVersion: 'medlens-waveform-repair-v2',
          evidenceGateVersion: 'medlens-waveform-gate-v1.0.0',
          timestampIso: new Date().toISOString(),
        },
      },
      reviewOutput: {
        outputType: 'medlens.ecg.waveform.physician_review_output.v1',
        status: 'blocked',
        failClosed: true,
        clinicalOutputAllowed: false,
        reason: 'WAVEFORM_IMAGE_READ_FAILED',
        failedAssertions: ['IMAGE_UNREADABLE'],
        warnings: [],
        physicianActionRequired: true,
      },
    };
  }

  const calibration = detectGridCalibration(rawImage);
  const leadBoxes = buildLeadBoxes(rawImage.info.width, rawImage.info.height);
  const rhythmBox = buildRhythmBox(rawImage.info.width, rawImage.info.height);
  const pixelsPerSecond = (calibration.pixelsPerSmallBox || 4) * 25;
  const leadRegions = leadBoxes.map(({ lead, box }) => ({
    lead,
    boundingBoxPx: box,
    labelDetectedBy: 'layout',
    confidence: calibration.calibrated ? 'high' : 'medium',
  }));
  const waveformTraces = [];
  const fiducials = [];
  const leadMeasurements = [];

  for (const { lead, box } of [...leadBoxes, rhythmBox]) {
    const extractedTrace = extractTraceFromBox(rawImage, box, { skipLabelArea: lead !== 'RHYTHM_II' });

    if (!extractedTrace.traceExtracted) {
      waveformTraces.push({
        lead,
        traceExtracted: false,
        confidence: extractedTrace.confidence,
        failureReason: extractedTrace.failureReason,
      });
      continue;
    }

    waveformTraces.push({
      lead,
      traceExtracted: true,
      signalSamples: extractedTrace.signalSamples,
      baselineSamples: extractedTrace.baselineSamples,
      confidence: extractedTrace.confidence,
    });

    const peakIndices = detectPeaks(extractedTrace.signalSamples, pixelsPerSecond);
    const dominantPeakIndex = peakIndices[0] ?? Math.floor(extractedTrace.signalSamples.length * 0.42);

    fiducials.push(buildFiducial(lead, dominantPeakIndex, pixelsPerSecond, extractedTrace.confidence));

    if (lead !== 'RHYTHM_II') {
      leadMeasurements.push(buildLeadMeasurement(lead, extractedTrace, dominantPeakIndex));
    }
  }

  const rhythmTrace = waveformTraces.find((trace) => trace.lead === 'RHYTHM_II');
  const packet = {
    packetType: 'medlens.ecg.waveform.evidence_packet.v1',
    sourceImage: {
      sha256: sourceHash,
      mimeType: file.type || undefined,
      widthPx: rawImage.info.width,
      heightPx: rawImage.info.height,
    },
    imageQuality: {
      status: imageQuality.status,
      issues: [...imageQuality.issues],
    },
    gridCalibration: calibration,
    leadRegions,
    waveformTraces,
    fiducials,
    leadMeasurements,
    rhythmEvidence: buildRhythmEvidence(rhythmTrace, pixelsPerSecond),
    secondaryOcr:
      textSupport.raw_ecg_relevant_text.length > 0
        ? {
            rawText: textSupport.raw_ecg_relevant_text.join('\n'),
            printedMeasurements: Object.fromEntries(
              Object.entries(textSupport.ocr_extracted_values).filter(([, value]) => Boolean(value))
            ),
            printedMachineInterpretation:
              textSupport.ocr_extracted_values.machine_interpretation_text || undefined,
          }
        : undefined,
    audit: {
      pipelineVersion: 'medlens-waveform-repair-v2',
      evidenceGateVersion: 'medlens-waveform-gate-v1.0.0',
      timestampIso: new Date().toISOString(),
    },
  };

  return {
    packet,
    reviewOutput: buildReviewOutput(packet),
  };
}
