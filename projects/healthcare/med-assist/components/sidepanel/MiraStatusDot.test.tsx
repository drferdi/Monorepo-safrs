import { render, screen, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MiraStatusDot } from './MiraStatusDot';

import { MIRA_STATUS_STORAGE_KEY } from '@/lib/diagnosis-engine/mira-supervisor';

type Listener = (changes: Record<string, { newValue?: unknown }>, area: string) => void;
const items: Record<string, unknown> = {};
const listeners: Listener[] = [];

describe('MiraStatusDot', () => {
  beforeEach(() => {
    for (const key of Object.keys(items)) delete items[key];
    listeners.length = 0;
    vi.stubGlobal('browser', {
      storage: {
        local: { get: async (key: string) => (key in items ? { [key]: items[key] } : {}) },
        onChanged: {
          addListener: (fn: Listener) => listeners.push(fn),
          removeListener: (fn: Listener) => listeners.splice(listeners.indexOf(fn), 1),
        },
      },
    });
    vi.stubEnv('SENTRA_DIAGNOSIS_ENGINE', 'mira');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('renders nothing in legacy mode', () => {
    vi.stubEnv('SENTRA_DIAGNOSIS_ENGINE', 'legacy');
    const { container } = render(<MiraStatusDot />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the stored state and follows storage changes', async () => {
    items[MIRA_STATUS_STORAGE_KEY] = { state: 'starting', checkedAt: 't' };
    render(<MiraStatusDot />);
    await waitFor(() => expect(screen.getByTitle('MIRA sedang menyala')).toHaveAttribute('data-state', 'starting'));
    act(() => listeners.forEach((fn) => fn({ [MIRA_STATUS_STORAGE_KEY]: { newValue: { state: 'ready', checkedAt: 't' } } }, 'local')));
    expect(screen.getByTitle('MIRA siap')).toHaveAttribute('data-state', 'ready');
  });

  it('names the install step when the host is missing', async () => {
    items[MIRA_STATUS_STORAGE_KEY] = { state: 'not-installed', checkedAt: 't' };
    render(<MiraStatusDot />);
    await waitFor(() => expect(screen.getByTitle('MIRA belum terpasang · jalankan install_host.ps1')).toBeInTheDocument());
  });
});
