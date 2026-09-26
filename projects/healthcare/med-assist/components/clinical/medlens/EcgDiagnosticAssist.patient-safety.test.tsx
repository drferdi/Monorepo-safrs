import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeMedlensEcgAnalyzeResponse } from '@/tests/medlens-contract/ecg-contract-fixtures';

import { EcgDiagnosticAssist } from './EcgDiagnosticAssist';

const { analyzeEcgImageMock } = vi.hoisted(() => ({
  analyzeEcgImageMock: vi.fn(),
}));

vi.mock('@/lib/api/medlens-client', () => ({
  medlensClient: {
    analyzeEcgImage: analyzeEcgImageMock,
  },
}));

describe('EcgDiagnosticAssist patient safety rendering', () => {
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

  it('renders fail-closed waveform status instead of OCR interpretation', async () => {
    analyzeEcgImageMock.mockResolvedValueOnce(
      makeMedlensEcgAnalyzeResponse({
        waveform_evidence_packet: {
          sourceImage: {
            sha256: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          },
          gridCalibration: {
            calibrated: false,
            confidence: 'low',
          },
          waveformTraces: [
            {
              lead: 'I',
              traceExtracted: false,
              confidence: 'low',
              failureReason: 'WAVEFORM_EXTRACTION_NOT_IMPLEMENTED',
            },
          ],
          leadRegions: [],
          leadMeasurements: [],
          fiducials: [],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    );

    render(<EcgDiagnosticAssist />);

    const file = new File(['binary'], 'ekg.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText(/Upload gambar EKG/i), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyze ECG Image/i }));

    await waitFor(() => expect(analyzeEcgImageMock).toHaveBeenCalledWith(file));

    expect(await screen.findByText(/Waveform Evidence Incomplete/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /MedLens cannot produce ECG review output because waveform evidence is incomplete\./i
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/grid calibration/i)).toBeInTheDocument();
    expect(screen.queryByText(/Sinus Bradycardia/i)).not.toBeInTheDocument();
  });

  it('renders physician-review packet only when waveform evidence is ready', async () => {
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
    expect(screen.getByText(/Waveform Packet/i)).toBeInTheDocument();
    expect(screen.queryByText(/Extracted ECG Result/i)).not.toBeInTheDocument();
  });
});
