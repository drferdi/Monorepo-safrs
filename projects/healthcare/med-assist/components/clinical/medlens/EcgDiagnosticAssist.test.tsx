import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MEDLENS_ECG_DISCLAIMER } from '@/lib/clinical/medlens/ecg-types';
import type { MedlensEcgAnalyzeResponse } from '@/lib/clinical/medlens/ecg-types';
import { makeMedlensEcgAnalyzeResponse } from '@/tests/medlens-contract/ecg-contract-fixtures';

const { analyzeEcgImageMock } = vi.hoisted(() => ({
  analyzeEcgImageMock: vi.fn(),
}));

vi.mock('@/lib/api/medlens-client', () => ({
  medlensClient: {
    analyzeEcgImage: analyzeEcgImageMock,
  },
}));

import { EcgDiagnosticAssist } from './EcgDiagnosticAssist';

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
        'TEXT_ONLY_OCR_CANNOT_SUPPORT_CLINICAL_OUTPUT',
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
  } as unknown as MedlensEcgAnalyzeResponse);
}

describe('EcgDiagnosticAssist', () => {
  beforeEach(() => {
    analyzeEcgImageMock.mockReset();
    Object.assign(URL, {
      createObjectURL: vi.fn(() => 'blob:medlens-ecg-preview'),
      revokeObjectURL: vi.fn(),
    });
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('shows no ECG interpretation for empty upload attempts', async () => {
    render(<EcgDiagnosticAssist />);

    fireEvent.click(screen.getByRole('button', { name: /Analyze ECG Image/i }));

    expect(await screen.findByText(/Pilih gambar EKG terlebih dahulu/i)).toBeInTheDocument();
    expect(screen.queryByText(/Physician-Review Packet/i)).not.toBeInTheDocument();
  });

  it('renders waveform fail-closed state instead of OCR interpretation when evidence is incomplete', async () => {
    analyzeEcgImageMock.mockResolvedValueOnce(makeBlockedResponse());
    render(<EcgDiagnosticAssist />);

    const file = new File(['binary'], 'ekg.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText(/Upload gambar EKG/i), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyze ECG Image/i }));

    expect(await screen.findByText(/Waveform Evidence Incomplete/i)).toBeInTheDocument();
    expect(
      screen.getByText(/MedLens cannot produce ECG review output because waveform evidence is incomplete\./i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Required missing evidence/i)).toBeInTheDocument();
    expect(screen.getByText(/grid calibration/i)).toBeInTheDocument();
    expect(screen.getByText(/waveform trace extraction/i)).toBeInTheDocument();
    expect(screen.getByText(/Secondary OCR Support/i)).toBeInTheDocument();
    expect(screen.queryByText(/Extracted ECG Result/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sinus Bradycardia/i)).not.toBeInTheDocument();
  });

  it('does not render clinical MedLens output when raw OCR text is missing', async () => {
    analyzeEcgImageMock.mockResolvedValueOnce(
      makeMedlensEcgAnalyzeResponse({
        raw_ecg_relevant_text: [],
        waveform_evidence_packet: {
          secondaryOcr: {
            rawText: '',
          },
        },
        waveform_review_output: {
          outputType: 'medlens.ecg.waveform.physician_review_output.v1',
          status: 'blocked',
          failClosed: true,
          clinicalOutputAllowed: false,
          reason: 'WAVEFORM_EVIDENCE_GATE_FAILED',
          failedAssertions: ['MISSING_RAW_OCR_TEXT'],
          warnings: [],
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
      } as unknown as MedlensEcgAnalyzeResponse)
    );
    render(<EcgDiagnosticAssist />);

    const file = new File(['binary'], 'ekg.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText(/Upload gambar EKG/i), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyze ECG Image/i }));

    expect(await screen.findByText(/Waveform Evidence Incomplete/i)).toBeInTheDocument();
    expect(screen.getByText(/raw OCR text/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Physician-Review Packet/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Sinus Bradycardia/i)).not.toBeInTheDocument();
  });

  it('renders physician-review packet only when waveform evidence exists', async () => {
    analyzeEcgImageMock.mockResolvedValueOnce(makeMedlensEcgAnalyzeResponse());
    render(<EcgDiagnosticAssist />);

    const file = new File(['binary'], 'ekg.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText(/Upload gambar EKG/i), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyze ECG Image/i }));

    await waitFor(() => expect(analyzeEcgImageMock).toHaveBeenCalledWith(file));

    expect(
      await screen.findByRole('heading', { name: /Physician-Review Packet/i })
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Lead I/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Waveform Packet/i)).toBeInTheDocument();
    expect(screen.queryByText(/Extracted ECG Result/i)).not.toBeInTheDocument();
    expect(screen.getByText(MEDLENS_ECG_DISCLAIMER)).toBeInTheDocument();
  });

  it('copies evidence text and JSON result', async () => {
    analyzeEcgImageMock.mockResolvedValueOnce(makeMedlensEcgAnalyzeResponse());
    render(<EcgDiagnosticAssist />);

    const file = new File(['binary'], 'ekg.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText(/Upload gambar EKG/i), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyze ECG Image/i }));

    await screen.findByRole('heading', { name: /Physician-Review Packet/i });

    fireEvent.click(screen.getByRole('button', { name: /Copy Evidence/i }));
    fireEvent.click(screen.getByRole('button', { name: /Copy JSON/i }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(2);
  });

  it('shows graceful backend-unavailable guidance without developer instructions', async () => {
    analyzeEcgImageMock.mockRejectedValueOnce(
      new Error('MedLens belum tersedia untuk workspace ini. Coba lagi nanti atau hubungi admin.')
    );

    render(<EcgDiagnosticAssist />);

    const file = new File(['binary'], 'ekg.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText(/Upload gambar EKG/i), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyze ECG Image/i }));

    expect(await screen.findByText(/MedLens belum tersedia untuk workspace ini/i)).toBeInTheDocument();
    expect(screen.getByText(/^MedLens belum tersedia$/i)).toBeInTheDocument();
    expect(screen.queryByText(/node services\/medlens-local\/server\.mjs/i)).not.toBeInTheDocument();
  });

  it('shows runtime guidance but still allows a manual analysis attempt when runtime is not ready yet', async () => {
    analyzeEcgImageMock.mockRejectedValueOnce(
      new Error('MedLens belum tersedia untuk workspace ini. Coba lagi nanti atau hubungi admin.')
    );

    render(
      <EcgDiagnosticAssist
        runtimeStatus={{
          readiness: 'unavailable',
          message: 'MedLens belum tersedia untuk workspace ini. Coba lagi nanti atau hubungi admin.',
          serverReachable: true,
          serverAuthorized: true,
        }}
      />
    );

    const file = new File(['binary'], 'ekg.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText(/Upload gambar EKG/i), {
      target: { files: [file] },
    });

    expect(screen.getByRole('button', { name: /Analyze ECG Image/i })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: /Analyze ECG Image/i }));

    await waitFor(() => expect(analyzeEcgImageMock).toHaveBeenCalledWith(file));
    expect((await screen.findAllByText(/^MedLens belum tersedia$/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Coba lagi nanti atau hubungi admin/i).length).toBeGreaterThan(0);
  });
});
