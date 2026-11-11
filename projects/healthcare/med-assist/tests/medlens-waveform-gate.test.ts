import {
  assertNoLegacyClinicalContract,
  runMedLensWaveformEvidenceGate,
} from '@/lib/clinical/medlens/ecg-output-gate';
import { MEDLENS_WAVEFORM_NOT_IMPLEMENTED_REASON } from '@/lib/clinical/medlens/ecg-types';

const hash = 'a'.repeat(64);
const leads = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;

function makeValidPacket() {
  return {
    packetType: 'medlens.ecg.waveform.evidence_packet.v1' as const,
    sourceImage: { sha256: hash },
    imageQuality: { status: 'readable' as const, issues: [] },
    gridCalibration: {
      calibrated: true,
      paperSpeedMmPerSec: 25 as const,
      gainMmPerMv: 10 as const,
      pixelsPerSmallBox: 8,
      confidence: 'high' as const,
    },
    leadRegions: leads.map((lead, index) => ({
      lead,
      boundingBoxPx: { x: index * 10, y: 0, width: 10, height: 10 },
      labelDetectedBy: 'layout' as const,
      confidence: 'medium' as const,
    })),
    waveformTraces: leads.map((lead) => ({
      lead,
      traceExtracted: true,
      signalSamples: [0, 1, 0, -1, 0],
      baselineSamples: [0, 0, 0, 0, 0],
      confidence: 'medium' as const,
    })),
    fiducials: leads.map((lead) => ({
      lead,
      qrsOnsetMs: 120,
      jPointMs: 180,
      tEndMs: 260,
      confidence: 'medium' as const,
    })),
    leadMeasurements: leads.map((lead) => ({
      lead,
      stDeviationMm: 0,
      qrsPolarity: 'unknown' as const,
      tWavePattern: 'unknown' as const,
      confidence: 'medium' as const,
      evidenceRef: `waveform:${lead}`,
    })),
    rhythmEvidence: {
      rhythmStripLead: 'RHYTHM_II' as const,
      regularity: 'regular' as const,
      estimatedRateBpm: 82,
      pBeforeQrs: 'not_assessable' as const,
      confidence: 'medium' as const,
      evidenceRef: 'waveform:RHYTHM_II',
    },
    audit: {
      pipelineVersion: 'test',
      evidenceGateVersion: 'test',
      timestampIso: new Date().toISOString(),
    },
  };
}

describe('MedLens waveform evidence gate', () => {
  it('blocks text-only OCR output', () => {
    const result = runMedLensWaveformEvidenceGate({
      ...makeValidPacket(),
      gridCalibration: { calibrated: false, confidence: 'low' },
      leadRegions: [],
      waveformTraces: leads.map((lead) => ({
        lead,
        traceExtracted: false,
        confidence: 'low' as const,
        failureReason: MEDLENS_WAVEFORM_NOT_IMPLEMENTED_REASON,
      })),
      leadMeasurements: [],
      secondaryOcr: {
        rawText: 'RHYTHM STRIP II 25 mm/sec 1 cm/mV',
        printedMachineInterpretation: 'Acute inferior infarct',
      },
    });

    expect(result.passed).toBe(false);
    expect(result.failedAssertions).toContain('TEXT_ONLY_OCR_CANNOT_SUPPORT_CLINICAL_OUTPUT');
  });

  it('blocks missing source hash', () => {
    const result = runMedLensWaveformEvidenceGate({
      ...makeValidPacket(),
      sourceImage: { sha256: '' },
    });

    expect(result.passed).toBe(false);
    expect(result.failedAssertions).toContain('MISSING_OR_INVALID_SOURCE_IMAGE_HASH');
  });

  it('blocks unreadable image', () => {
    const result = runMedLensWaveformEvidenceGate({
      ...makeValidPacket(),
      imageQuality: { status: 'unreadable', issues: ['blurred'] },
    });

    expect(result.passed).toBe(false);
    expect(result.failedAssertions).toContain('IMAGE_UNREADABLE');
  });

  it('blocks uncalibrated grid', () => {
    const result = runMedLensWaveformEvidenceGate({
      ...makeValidPacket(),
      gridCalibration: { calibrated: false, confidence: 'low' },
    });

    expect(result.passed).toBe(false);
    expect(result.failedAssertions).toContain('GRID_NOT_CALIBRATED');
  });

  it('blocks missing 12-lead segmentation', () => {
    const result = runMedLensWaveformEvidenceGate({
      ...makeValidPacket(),
      leadRegions: [],
    });

    expect(result.passed).toBe(false);
    expect(result.failedAssertions).toContain('INSUFFICIENT_12_LEAD_REGION_DETECTION');
  });

  it('blocks missing waveform traces', () => {
    const result = runMedLensWaveformEvidenceGate({
      ...makeValidPacket(),
      waveformTraces: [],
    });

    expect(result.passed).toBe(false);
    expect(result.failedAssertions).toContain('INSUFFICIENT_WAVEFORM_TRACE_EXTRACTION');
  });

  it('blocks unsupported ST claim without baseline and J-point evidence', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const packet = makeValidPacket() as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    packet.waveformTraces = packet.waveformTraces.map((trace: any) => ({
      ...trace,
      baselineSamples: undefined,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    packet.fiducials = packet.fiducials.map((fiducial: any) => ({
      ...fiducial,
      jPointMs: undefined,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    packet.leadMeasurements = packet.leadMeasurements.map((measurement: any) => ({
      ...measurement,
      stDeviationMm: 2,
    }));

    const result = runMedLensWaveformEvidenceGate(packet);

    expect(result.passed).toBe(false);
    expect(result.failedAssertions).toContain(
      'UNSUPPORTED_ST_CLAIM_WITHOUT_BASELINE_OR_J_POINT_EVIDENCE'
    );
  });

  it('detects unsafe legacy clinical summary fields', () => {
    const violations = assertNoLegacyClinicalContract({
      clinicalSummary: 'Inferior STEMI',
      clinical_support: {
        summary: 'Unsafe summary',
      },
      diagnosis: 'STEMI',
      impression: 'Acute ischemia',
      interpretation: 'Inferior MI',
    });

    expect(violations).toEqual(
      expect.arrayContaining([
        'UNSAFE_LEGACY_FIELD:clinicalSummary',
        'UNSAFE_LEGACY_FIELD:clinical_support.summary',
        'UNSAFE_LEGACY_FIELD:diagnosis',
        'UNSAFE_LEGACY_FIELD:impression',
        'UNSAFE_LEGACY_FIELD:interpretation',
      ])
    );
  });
});
