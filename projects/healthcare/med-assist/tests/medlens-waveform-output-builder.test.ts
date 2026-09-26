import { buildMedLensWaveformReviewOutput } from '@/lib/clinical/medlens/ecg-output-gate';

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
    waveformTraces: [
      ...leads.map((lead) => ({
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
    secondaryOcr: {
      rawText: 'Machine interpretation: Normal ECG\nConfirmed readable printout',
    },
    audit: {
      pipelineVersion: 'test',
      evidenceGateVersion: 'test',
      timestampIso: new Date().toISOString(),
    },
  };
}

describe('MedLens waveform output builder', () => {
  it('blocks legacy clinicalSummary', () => {
    const output = buildMedLensWaveformReviewOutput(makeValidPacket(), [
      'UNSAFE_LEGACY_FIELD:clinicalSummary',
    ]);

    expect(output.status).toBe('blocked');
    if (output.status !== 'blocked') {
      throw new Error('Expected blocked waveform output');
    }
    expect(output.failClosed).toBe(true);
    expect(output.clinicalOutputAllowed).toBe(false);
    expect(output.reason).toBe('UNSAFE_LEGACY_FIELD_DETECTED');
  });

  it('blocks when waveform traces are missing', () => {
    const output = buildMedLensWaveformReviewOutput({
      ...makeValidPacket(),
      waveformTraces: [],
      leadMeasurements: [],
    });

    expect(output.status).toBe('blocked');
    expect(output.failClosed).toBe(true);
    expect(output.clinicalOutputAllowed).toBe(false);
  });

  it('allows physician-review output only when waveform evidence exists', () => {
    const output = buildMedLensWaveformReviewOutput(makeValidPacket());

    expect(output.status).toBe('ready_for_physician_review');
    if (output.status !== 'ready_for_physician_review') {
      throw new Error('Expected physician-review waveform output');
    }
    expect(output.clinicalOutputAllowed).toBe(true);
    expect(output.reviewScope).toBe('waveform_evidence_review_only');
  });
});
