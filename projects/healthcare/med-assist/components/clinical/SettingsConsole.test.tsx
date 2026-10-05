import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getAuthConfigMock,
  probeApiBaseUrlMock,
  saveAuthConfigMock,
  getBridgeConfigMock,
  getBridgeRuntimeStatusMock,
  saveBridgeConfigMock,
} = vi.hoisted(() => ({
  getAuthConfigMock: vi.fn(),
  probeApiBaseUrlMock: vi.fn(),
  saveAuthConfigMock: vi.fn(),
  getBridgeConfigMock: vi.fn(),
  getBridgeRuntimeStatusMock: vi.fn(),
  saveBridgeConfigMock: vi.fn(),
}));

vi.mock('@/lib/api/auth-client', () => ({
  DEFAULT_AUTH_BASE_URL: 'https://medboard.sentrahai.com',
  getAuthConfig: getAuthConfigMock,
  probeApiBaseUrl: probeApiBaseUrlMock,
  saveAuthConfig: saveAuthConfigMock,
}));

vi.mock('@/lib/api/bridge-client', () => ({
  getBridgeConfig: getBridgeConfigMock,
  getBridgeRuntimeStatus: getBridgeRuntimeStatusMock,
  saveBridgeConfig: saveBridgeConfigMock,
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

describe('SettingsConsole legacy surface replacement', () => {
  beforeEach(() => {
    localStorage.clear();
    getAuthConfigMock.mockReset();
    probeApiBaseUrlMock.mockReset();
    saveAuthConfigMock.mockReset();
    getBridgeConfigMock.mockReset();
    getBridgeRuntimeStatusMock.mockReset();
    saveBridgeConfigMock.mockReset();

    getAuthConfigMock.mockResolvedValue({
      baseUrl: 'https://medboard.sentrahai.com',
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
  });

  it('renders the active operational settings owner with bridge/runtime status', async () => {
    render(<OperationalSettingsConsole />);

    expect(screen.getByRole('heading', { name: 'Pengaturan' })).toBeInTheDocument();
    expect(screen.getByText('Bridge status')).toBeInTheDocument();
    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(screen.getByText('Features')).toBeInTheDocument();
    expect(screen.queryByText(/ACARS|Logbook|Sentra User Online/i)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Runtime: server verified')).toBeInTheDocument();
    });
  });
});
