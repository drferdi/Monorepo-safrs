import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SentraAssistPanel, type SentraAssistPanelInputSnapshot } from './SentraAssistPanel';

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

describe('SentraAssistPanel workbench wiring', () => {
  const originalFetch = global.fetch;
  const originalAudioContext = global.AudioContext;
  const originalAudio = global.Audio;

  beforeEach(() => {
    global.fetch = vi.fn(async () => ({
      arrayBuffer: async () => new ArrayBuffer(8),
    })) as unknown as typeof fetch;
    global.AudioContext = MockAudioContext as unknown as typeof AudioContext;
    global.Audio = MockAudioElement as unknown as typeof Audio;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.AudioContext = originalAudioContext;
    global.Audio = originalAudio;
    vi.restoreAllMocks();
  });

  it('renders approved shell and mounts workbench in INFEREN surface', () => {
    render(
      <SentraAssistPanel
        workbench={<div data-testid="approved-workbench-child">Workbench V2</div>}
      />
    );

    expect(screen.getByRole('heading', { name: 'Sentra Assist' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'INFEREN' })).toBeInTheDocument();
    expect(screen.getByText('VITAL SIGNS - CARDIOPULMONARY METRICS')).toBeInTheDocument();
    expect(screen.getByTestId('approved-workbench-child')).toBeInTheDocument();
  });

  it('publishes shell input snapshot for clinical wiring', async () => {
    const handleInputChange = vi.fn((_: SentraAssistPanelInputSnapshot) => undefined);

    render(
      <SentraAssistPanel
        onInputChange={handleInputChange}
        workbench={<div data-testid="approved-workbench-child">Workbench V2</div>}
      />
    );

    fireEvent.change(screen.getByLabelText('Gejala atau keluhan pasien'), {
      target: { value: 'Nyeri dada sejak 2 hari dan sesak saat aktivitas' },
    });

    await waitFor(() => {
      expect(handleInputChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          gejala: 'Nyeri dada sejak 2 hari dan sesak saat aktivitas',
        })
      );
    });
  });

  it('renders clickable AutoComplete+ controls and applies returned shell patches', async () => {
    const handleAutocompleteGejala = vi
      .fn()
      .mockResolvedValue({ gejala: 'Batuk berdahak 3 hari, memberat malam hari' });
    const handleAutocompleteVitals = vi
      .fn()
      .mockResolvedValue({ sistolik: '138', diastolik: '86', nadi: '96' });

    render(
      <SentraAssistPanel
        {...({
          onAutocompleteGejala: handleAutocompleteGejala,
          onAutocompleteVitals: handleAutocompleteVitals,
        } as Record<string, unknown>)}
        workbench={<div data-testid="approved-workbench-child">Workbench V2</div>}
      />
    );

    fireEvent.change(screen.getByLabelText('Gejala atau keluhan pasien'), {
      target: { value: 'Batuk sejak 3 hari' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'AutoComplete+ Gejala' }));

    await waitFor(() =>
      expect(handleAutocompleteGejala).toHaveBeenCalledWith(
        expect.objectContaining({ gejala: 'Batuk sejak 3 hari' })
      )
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Gejala atau keluhan pasien')).toHaveValue(
        'Batuk berdahak 3 hari, memberat malam hari'
      )
    );

    fireEvent.click(screen.getByRole('button', { name: 'AutoComplete+ Vital Signs' }));

    await waitFor(() => expect(handleAutocompleteVitals).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByLabelText('SISTOLIK')).toHaveValue('138'));
    expect(screen.getByLabelText('DIASTOLIK')).toHaveValue('86');
    expect(screen.getByLabelText('NADI')).toHaveValue('96');
  });

  it('routes DEMOGRAF, OCR, and uplink actions through shell callbacks', async () => {
    const handleDemograf = vi.fn().mockResolvedValue(undefined);
    const handleOcr = vi.fn().mockResolvedValue(undefined);
    const handleUplink = vi.fn().mockResolvedValue(undefined);

    render(
      <SentraAssistPanel
        {...({
          onDemograf: handleDemograf,
          onOcr: handleOcr,
          onUplink: handleUplink,
        } as Record<string, unknown>)}
        workbench={<div data-testid="approved-workbench-child">Workbench V2</div>}
      />
    );

    fireEvent.change(screen.getByLabelText('Gejala atau keluhan pasien'), {
      target: { value: 'Sesak saat aktivitas' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'SENTRA UPLINK' }));
    fireEvent.click(screen.getByRole('button', { name: 'DEMOGRAF' }));
    fireEvent.click(screen.getByRole('button', { name: 'OCR' }));

    await waitFor(() => expect(handleDemograf).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(handleOcr).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(handleUplink).toHaveBeenCalledWith(
        expect.objectContaining({ gejala: 'Sesak saat aktivitas' })
      )
    );
  });

  it('keeps inputs, dropdowns, and tab surfaces interactive without stacked content', async () => {
    render(
      <SentraAssistPanel
        workbench={<div data-testid="approved-workbench-child">Workbench V2</div>}
        emergencyContent={<div data-testid="approved-emergency-child">Emergency</div>}
        settingsContent={<div data-testid="approved-settings-child">Settings</div>}
      />
    );

    const textarea = screen.getByLabelText('Gejala atau keluhan pasien');
    fireEvent.change(textarea, { target: { value: 'Nyeri ulu hati' } });
    expect(textarea).toHaveValue('Nyeri ulu hati');

    fireEvent.click(screen.getByRole('button', { name: 'Pilih RIWAYAT ALERGI' }));
    fireEvent.click(screen.getByRole('button', { name: 'Alergi obat' }));
    expect(screen.getByText('Alergi obat')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pilih STATUS KEHAMILAN' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tidak hamil' }));
    expect(screen.getByText('Tidak hamil')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pilih DISABILITAS' }));
    fireEvent.click(screen.getByRole('button', { name: 'Disabilitas fisik' }));
    expect(screen.getByText('Disabilitas fisik')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pilih OBESITAS' }));
    fireEvent.click(screen.getByRole('button', { name: 'Obesitas I' }));
    expect(screen.getByText('Obesitas I')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('SISTOLIK'), { target: { value: '132' } });
    fireEvent.change(screen.getByLabelText('DIASTOLIK'), { target: { value: '84' } });
    fireEvent.change(screen.getByLabelText('NADI'), { target: { value: '98' } });

    expect(screen.getByLabelText('SISTOLIK')).toHaveValue('132');
    expect(screen.getByLabelText('DIASTOLIK')).toHaveValue('84');
    expect(screen.getByLabelText('NADI')).toHaveValue('98');

    expect(screen.getByTestId('approved-workbench-child')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'EMERGENCY' }));
    await waitFor(() =>
      expect(screen.queryByTestId('approved-workbench-child')).not.toBeInTheDocument()
    );
    expect(screen.getByTestId('approved-emergency-child')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'PENGATURAN' }));
    await waitFor(() =>
      expect(screen.queryByTestId('approved-emergency-child')).not.toBeInTheDocument()
    );
    expect(screen.getByTestId('approved-settings-child')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'INFEREN' }));
    await waitFor(() => expect(screen.getByTestId('approved-workbench-child')).toBeInTheDocument());
  });
});
