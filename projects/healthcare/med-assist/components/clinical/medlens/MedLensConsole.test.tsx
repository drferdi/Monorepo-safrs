import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeMedlensEcgAnalyzeResponse } from '@/tests/medlens-contract/ecg-contract-fixtures';

const { analyzeEcgImageMock, getRuntimeStatusMock } = vi.hoisted(() => ({
  analyzeEcgImageMock: vi.fn(),
  getRuntimeStatusMock: vi.fn(),
}));

vi.mock('@/lib/api/medlens-client', () => ({
  medlensClient: {
    analyzeEcgImage: analyzeEcgImageMock,
    getRuntimeStatus: getRuntimeStatusMock,
  },
}));

import { MedLensConsole } from './MedLensConsole';

function makeBlockedResponse() {
  return makeMedlensEcgAnalyzeResponse({
    waveform_evidence_packet: {
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
        failureReason: 'WAVEFORM_EXTRACTION_NOT_IMPLEMENTED',
      })),
      leadMeasurements: [],
    },
    waveform_review_output: {
      outputType: 'medlens.ecg.waveform.physician_review_output.v1',
      status: 'blocked',
      failClosed: true,
      clinicalOutputAllowed: false,
      reason: 'WAVEFORM_EXTRACTION_NOT_IMPLEMENTED',
      failedAssertions: [
        'GRID_NOT_CALIBRATED',
        'INSUFFICIENT_12_LEAD_REGION_DETECTION',
        'INSUFFICIENT_WAVEFORM_TRACE_EXTRACTION',
        'MISSING_LEAD_LEVEL_WAVEFORM_MEASUREMENTS',
      ],
      warnings: ['WAVEFORM_EXTRACTION_NOT_IMPLEMENTED'],
      physicianActionRequired: true,
    },
    audit_log: {
      outputPassedEvidenceGate: false,
      finalRenderedOutput: {
        status: 'insufficient_evidence',
        findingsCount: 0,
        redFlagsCount: 0,
      },
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

describe('MedLensConsole', () => {
  beforeEach(() => {
    analyzeEcgImageMock.mockReset();
    getRuntimeStatusMock.mockReset().mockResolvedValue({
      readiness: 'ready',
      message: 'MedLens siap dipakai untuk analisis ECG.',
      serverReachable: true,
      serverAuthorized: true,
    });
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  function uploadAndAnalyze(): File {
    const file = new File(['synthetic-ecg-image'], 'ekg.png', { type: 'image/png' });

    fireEvent.change(screen.getByLabelText(/Upload gambar EKG/i), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyze ECG Image/i }));

    return file;
  }

  it('renders Sentra MedLens with only CardioLens available in v1', async () => {
    render(<MedLensConsole />);

    expect(screen.getByText('Sentra MedLens')).toBeInTheDocument();
    expect(await screen.findByText(/MedLens siap dipakai untuk analisis ECG/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /CardioLens/i })).toBeEnabled();
    expect(screen.getByText('EKG Diagnostic Assist')).toBeInTheDocument();
  });

  it('drives the primary ECG upload workflow from console shell to waveform physician-review packet', async () => {
    analyzeEcgImageMock.mockResolvedValueOnce(makeMedlensEcgAnalyzeResponse());

    render(<MedLensConsole />);
    await screen.findByText(/MedLens siap dipakai untuk analisis ECG/i);

    const file = uploadAndAnalyze();

    expect(await screen.findByTestId('medlens-ecg-review-surface')).toBeInTheDocument();
    expect(analyzeEcgImageMock).toHaveBeenCalledWith(file);
    expect(screen.getByText('Sentra MedLens')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Physician-Review Packet/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Waveform Packet/i)).toBeInTheDocument();
    expect(screen.queryByText(/Extracted ECG Result/i)).not.toBeInTheDocument();
  });

  it('shows fail-closed review output from the console workflow when waveform evidence is insufficient', async () => {
    analyzeEcgImageMock.mockResolvedValueOnce(makeBlockedResponse());

    render(<MedLensConsole />);
    await screen.findByText(/MedLens siap dipakai untuk analisis ECG/i);
    uploadAndAnalyze();

    expect(await screen.findByText(/Waveform Evidence Incomplete/i)).toBeInTheDocument();
    expect(screen.queryByText(/Extracted ECG Result/i)).not.toBeInTheDocument();
  });

  it('shows unavailable guidance from the console workflow when backend MedLens is not ready', async () => {
    getRuntimeStatusMock.mockResolvedValueOnce({
      readiness: 'unavailable',
      message: 'MedLens belum tersedia untuk workspace ini. Coba lagi nanti atau hubungi admin.',
      serverReachable: true,
      serverAuthorized: true,
    });

    render(<MedLensConsole />);

    expect(await screen.findByText(/^MedLens belum tersedia$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Coba lagi nanti atau hubungi admin\.$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Analyze ECG Image/i })).toBeEnabled();
  });
});
