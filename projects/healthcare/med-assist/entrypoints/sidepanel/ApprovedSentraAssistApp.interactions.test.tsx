import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSendMessage } = vi.hoisted(() => ({
  mockSendMessage: vi.fn(),
}));

vi.mock('@/utils/messaging', () => ({
  sendMessage: mockSendMessage,
}));

vi.mock('@/components/sidepanel/ClinicalReasoningWorkbench', () => ({
  ClinicalReasoningWorkbench: () => <div data-testid="mock-workbench">Workbench</div>,
}));

import { ApprovedSentraAssistApp } from './ApprovedSentraAssistApp';

class MockAudioContext {
  decodeAudioData = vi.fn(async (buffer: ArrayBuffer) => buffer as unknown as AudioBuffer);
  createBufferSource() {
    return {
      buffer: null as AudioBuffer | null,
      connect: vi.fn(),
      start: vi.fn(),
    };
  }
  destination = {};
  close = vi.fn(async () => undefined);
}

class MockAudioElement {
  volume = 1;
  play = vi.fn(async () => undefined);
}

describe('ApprovedSentraAssistApp interactions', () => {
  const originalFetch = global.fetch;
  const originalAudioContext = global.AudioContext;
  const originalAudio = global.Audio;
  const originalChrome = (globalThis as typeof globalThis & { chrome?: unknown }).chrome;

  beforeEach(() => {
    global.fetch = vi.fn(async () => ({
      arrayBuffer: async () => new ArrayBuffer(8),
    })) as unknown as typeof fetch;
    global.AudioContext = MockAudioContext as unknown as typeof AudioContext;
    global.Audio = MockAudioElement as unknown as typeof Audio;

    mockSendMessage.mockReset();
    mockSendMessage.mockImplementation(async (type: string) => {
      if (type === 'scanMedicalHistory') {
        return { success: true, history: [] };
      }
      if (type === 'scanVisitHistory') {
        return { success: true, visits: [], diagnostics: [] };
      }
      if (type === 'scanClinicalContext') {
        return { success: true, context: {} };
      }
      return { success: true };
    });

    Object.defineProperty(globalThis, 'chrome', {
      configurable: true,
      value: {
        tabs: {
          query: vi.fn(async () => [{ id: 77 }]),
          sendMessage: vi.fn(async () => ({
            success: true,
            patient: {
              name: 'Tn. Budi',
              gender: 'L',
              age: 45,
              rm: 'RM-77',
              dob: '1980-01-01',
              bpjsStatus: 'aktif',
              kelurahan: 'Sukamaju',
            },
          })),
        },
      },
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.AudioContext = originalAudioContext;
    global.Audio = originalAudio;

    Object.defineProperty(globalThis, 'chrome', {
      configurable: true,
      value: originalChrome,
    });

    vi.restoreAllMocks();
  });

  it('reuses the existing demographic bridge when DEMOGRAF is clicked', async () => {
    render(<ApprovedSentraAssistApp />);

    await waitFor(() =>
      expect(
        (
          globalThis as typeof globalThis & {
            chrome: {
              tabs: { query: ReturnType<typeof vi.fn>; sendMessage: ReturnType<typeof vi.fn> };
            };
          }
        ).chrome.tabs.query
      ).toHaveBeenCalledTimes(1)
    );

    fireEvent.click(screen.getByRole('button', { name: 'DEMOGRAF' }));

    await waitFor(() =>
      expect(
        (
          globalThis as typeof globalThis & {
            chrome: {
              tabs: { query: ReturnType<typeof vi.fn>; sendMessage: ReturnType<typeof vi.fn> };
            };
          }
        ).chrome.tabs.query
      ).toHaveBeenCalledTimes(2)
    );

    expect(
      mockSendMessage.mock.calls.filter(([type]) => type === 'scanMedicalHistory')
    ).toHaveLength(2);
    expect(mockSendMessage.mock.calls.filter(([type]) => type === 'scanVisitHistory')).toHaveLength(
      2
    );
    expect(
      mockSendMessage.mock.calls.filter(([type]) => type === 'scanClinicalContext')
    ).toHaveLength(2);
  });
});
