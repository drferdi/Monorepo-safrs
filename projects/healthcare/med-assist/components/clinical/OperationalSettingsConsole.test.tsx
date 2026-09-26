import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getAuthConfigMock,
  probeApiBaseUrlMock,
  saveAuthConfigMock,
  getBridgeConfigMock,
  getBridgeRuntimeStatusMock,
  saveBridgeConfigMock,
  getStoredOpenAIConfigMock,
  saveStoredOpenAIConfigMock,
  isOpenAIAvailableMock,
} = vi.hoisted(() => ({
  getAuthConfigMock: vi.fn(),
  probeApiBaseUrlMock: vi.fn(),
  saveAuthConfigMock: vi.fn(),
  getBridgeConfigMock: vi.fn(),
  getBridgeRuntimeStatusMock: vi.fn(),
  saveBridgeConfigMock: vi.fn(),
  getStoredOpenAIConfigMock: vi.fn(),
  saveStoredOpenAIConfigMock: vi.fn(),
  isOpenAIAvailableMock: vi.fn(),
}));

vi.mock('@/lib/api/auth-client', () => ({
  getAuthConfig: getAuthConfigMock,
  probeApiBaseUrl: probeApiBaseUrlMock,
  saveAuthConfig: saveAuthConfigMock,
}));

vi.mock('@/lib/api/bridge-client', () => ({
  getBridgeConfig: getBridgeConfigMock,
  getBridgeRuntimeStatus: getBridgeRuntimeStatusMock,
  saveBridgeConfig: saveBridgeConfigMock,
}));

vi.mock('@/lib/iskandar-diagnosis-engine/openai-key-store', () => ({
  getStoredOpenAIConfig: getStoredOpenAIConfigMock,
  saveStoredOpenAIConfig: saveStoredOpenAIConfigMock,
}));

vi.mock('@/lib/iskandar-diagnosis-engine/llm-reasoner', () => ({
  isOpenAIAvailable: isOpenAIAvailableMock,
}));

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      getManifest: () => ({
        version: '2.1.0',
        version_name: 'Prototype 0.7',
      }),
    },
  },
}));

import { OperationalSettingsConsole } from './OperationalSettingsConsole';

import { SETTINGS_STORAGE_KEY } from '@/lib/app-identity';

describe('OperationalSettingsConsole', () => {
  beforeEach(() => {
    localStorage.clear();
    getAuthConfigMock.mockReset();
    probeApiBaseUrlMock.mockReset();
    saveAuthConfigMock.mockReset();
    getBridgeConfigMock.mockReset();
    getBridgeRuntimeStatusMock.mockReset();
    saveBridgeConfigMock.mockReset();

    getAuthConfigMock.mockResolvedValue({
      baseUrl: 'https://crew.puskesmasbalowerti.com',
      automationToken: '',
    });
    getBridgeConfigMock.mockResolvedValue({ enabled: true, pollIntervalMinutes: 0.5 });
    getBridgeRuntimeStatusMock.mockResolvedValue({
      readiness: 'ready',
      message: 'Bridge siap dipakai.',
    });
    saveAuthConfigMock.mockResolvedValue(undefined);
    saveBridgeConfigMock.mockResolvedValue(undefined);
    probeApiBaseUrlMock.mockResolvedValue({
      ok: true,
      message: 'Server terjangkau',
    });

    getStoredOpenAIConfigMock.mockReset();
    saveStoredOpenAIConfigMock.mockReset();
    isOpenAIAvailableMock.mockReset();
    getStoredOpenAIConfigMock.mockResolvedValue({ apiKey: '' });
    saveStoredOpenAIConfigMock.mockResolvedValue(undefined);
    isOpenAIAvailableMock.mockResolvedValue(true);
  });

  it('renders the operational settings surface without ACARS experiment content', async () => {
    render(<OperationalSettingsConsole />);

    expect(screen.getByRole('heading', { name: 'Pengaturan' })).toBeInTheDocument();
    expect(screen.getByText('Bridge status')).toBeInTheDocument();
    expect(screen.getByText('Build')).toBeInTheDocument();
    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(screen.getByText('Features')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://kotakediri.epuskesmas.id')).toBeInTheDocument();
    expect(screen.queryByText(/ACARS/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Logbook/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sentra User Online/i)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Runtime: server verified')).toBeInTheDocument();
    });
  });

  it('hydrates persisted workspace settings and remote bridge/auth state on mount', async () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        toggles: { bridge: false, sounds: true },
        workspaceUrl: 'https://custom.epuskesmas.id',
      })
    );
    getAuthConfigMock.mockResolvedValue({
      baseUrl: 'https://crew.custom.id',
      automationToken: 'token-123',
    });
    getBridgeConfigMock.mockResolvedValue({ enabled: false, pollIntervalMinutes: 0.5 });
    getBridgeRuntimeStatusMock.mockResolvedValue({
      readiness: 'auth_required',
      message: 'Login Dashboard diperlukan.',
    });

    render(<OperationalSettingsConsole />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('https://custom.epuskesmas.id')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('https://crew.custom.id')).toBeInTheDocument();
    expect(screen.getByDisplayValue('token-123')).toBeInTheDocument();
    expect(screen.getByText('Runtime: auth required')).toBeInTheDocument();
    expect(screen.getByText('Login Dashboard diperlukan.')).toBeInTheDocument();
  });

  it('persists settings and saves auth + bridge config when user clicks save', async () => {
    render(<OperationalSettingsConsole />);

    const workspaceInput = await screen.findByDisplayValue('https://kotakediri.epuskesmas.id');
    const apiInput = screen.getByDisplayValue('https://crew.puskesmasbalowerti.com');
    const tokenInput = screen.getByPlaceholderText(
      /CREW_ACCESS_AUTOMATION_TOKEN/i
    ) as HTMLInputElement;

    fireEvent.change(workspaceInput, { target: { value: 'https://staging.epuskesmas.id' } });
    fireEvent.change(apiInput, { target: { value: 'https://crew.staging.id ' } });
    fireEvent.change(tokenInput, { target: { value: 'secure-token' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Settings/i }));

    await waitFor(() => {
      expect(saveAuthConfigMock).toHaveBeenCalledWith({
        baseUrl: 'https://crew.staging.id',
        automationToken: 'secure-token',
      });
    });

    expect(saveBridgeConfigMock).toHaveBeenCalledWith({ enabled: true });
    expect(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}')).toMatchObject({
      workspaceUrl: 'https://staging.epuskesmas.id',
      toggles: expect.objectContaining({
        'auto-fill': true,
        bridge: true,
      }),
    });
    expect(await screen.findByText('Saved!')).toBeInTheDocument();
  });

  it('probes API base URL and surfaces probe result to the operator', async () => {
    render(<OperationalSettingsConsole />);

    const apiInput = await screen.findByDisplayValue('https://crew.puskesmasbalowerti.com');
    fireEvent.change(apiInput, { target: { value: 'https://crew.probe.id' } });
    fireEvent.click(screen.getByRole('button', { name: /Test API/i }));

    await waitFor(() => {
      expect(probeApiBaseUrlMock).toHaveBeenCalledWith('https://crew.probe.id');
    });

    expect(await screen.findByText('Server terjangkau')).toBeInTheDocument();
  });

  it('renders the OpenAI reranker card and hydrates a stored key + model on mount', async () => {
    getStoredOpenAIConfigMock.mockResolvedValue({ apiKey: 'sk-stored', model: 'gpt-4o' });

    render(<OperationalSettingsConsole />);

    expect(screen.getByText('AI Reranker (OpenAI)')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByDisplayValue('sk-stored')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('gpt-4o')).toBeInTheDocument();
    expect(screen.getByText('Tersimpan (belum dites)')).toBeInTheDocument();
  });

  it('persists the OpenAI key + model to storage on save', async () => {
    render(<OperationalSettingsConsole />);

    const keyInput = (await screen.findByLabelText('OpenAI API Key')) as HTMLInputElement;
    const modelInput = screen.getByLabelText('OpenAI Model') as HTMLInputElement;

    fireEvent.change(keyInput, { target: { value: 'sk-new-key' } });
    fireEvent.change(modelInput, { target: { value: 'gpt-5.4-mini' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Settings/i }));

    await waitFor(() => {
      expect(saveStoredOpenAIConfigMock).toHaveBeenCalledWith({
        apiKey: 'sk-new-key',
        model: 'gpt-5.4-mini',
      });
    });
  });

  it('tests the OpenAI connection and shows a connected status', async () => {
    render(<OperationalSettingsConsole />);

    const keyInput = (await screen.findByLabelText('OpenAI API Key')) as HTMLInputElement;
    fireEvent.change(keyInput, { target: { value: 'sk-live' } });
    fireEvent.click(screen.getByRole('button', { name: /Test & Simpan Key/i }));

    await waitFor(() => {
      expect(saveStoredOpenAIConfigMock).toHaveBeenCalledWith({
        apiKey: 'sk-live',
        model: '',
      });
    });
    expect(isOpenAIAvailableMock).toHaveBeenCalled();
    expect(await screen.findByText('Terhubung ✓')).toBeInTheDocument();
  });
});
