import { beforeEach, describe, expect, it, vi } from 'vitest';

const { analyzeEcgImageMock, isAcceptedEcgImageFileMock } = vi.hoisted(() => ({
  analyzeEcgImageMock: vi.fn(),
  isAcceptedEcgImageFileMock: vi.fn(),
}));

vi.mock('./medlens-client', () => ({
  analyzeEcgImage: analyzeEcgImageMock,
  isAcceptedEcgImageFile: isAcceptedEcgImageFileMock,
  medlensClient: {
    analyzeEcgImage: analyzeEcgImageMock,
  },
}));

import {
  analyzeEcgDiagnosticFile,
  isAcceptedEcgFile,
  medlensClient,
} from './ecg-diagnostic-client';

describe('ecg-diagnostic-client compatibility wrapper', () => {
  beforeEach(() => {
    analyzeEcgImageMock.mockReset();
    isAcceptedEcgImageFileMock.mockReset();
  });

  it('delegates accepted-file check to the new MedLens adapter', () => {
    const file = new File(['x'], 'ekg.png', { type: 'image/png' });
    isAcceptedEcgImageFileMock.mockReturnValueOnce(true);

    expect(isAcceptedEcgFile(file)).toBe(true);
    expect(isAcceptedEcgImageFileMock).toHaveBeenCalledWith(file);
  });

  it('delegates analysis call to medlensClient.analyzeEcgImage', async () => {
    const file = new File(['x'], 'ekg.png', { type: 'image/png' });
    analyzeEcgImageMock.mockResolvedValueOnce({ status: 'ok', module: 'ecg' });

    await expect(analyzeEcgDiagnosticFile(file)).resolves.toEqual({
      status: 'ok',
      module: 'ecg',
    });
    expect(medlensClient.analyzeEcgImage).toBe(analyzeEcgImageMock);
    expect(analyzeEcgImageMock).toHaveBeenCalledWith(file);
  });
});
