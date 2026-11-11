import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MiraPlanModelPicker } from './MiraPlanModelPicker';

import { MIRA_PLAN_MODEL_STORAGE_KEY } from '@/lib/diagnosis-engine/mira-plan-model';

const session = vi.hoisted(() => ({ role: 'doctor' as 'doctor' | 'nurse' | 'admin', checks: 0 }));

vi.mock('@/lib/api/auth-client', () => ({
  getStoredSession: async () => {
    session.checks += 1;
    return { user: { role: session.role } };
  },
}));

const items: Record<string, unknown> = {};

describe('MiraPlanModelPicker', () => {
  beforeEach(() => {
    for (const key of Object.keys(items)) delete items[key];
    vi.stubGlobal('browser', {
      storage: {
        local: {
          get: async (key: string) => (key in items ? { [key]: items[key] } : {}),
          set: async (values: Record<string, unknown>) => void Object.assign(items, values),
          remove: async (key: string) => void delete items[key],
        },
      },
    });
    vi.stubEnv('DEV', false);
    vi.stubEnv('SENTRA_DIAGNOSIS_ENGINE', 'mira');
    vi.stubEnv('VITE_MIRA_PLAN_MODELS', 'google/gemini-3.1-flash-lite:nitro,inception/mercury-2');
    session.role = 'doctor';
    session.checks = 0;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('lets an admin pick a planning model and stores it', async () => {
    session.role = 'admin';
    render(<MiraPlanModelPicker />);

    const select = await screen.findByLabelText('Model perencanaan MIRA');
    expect(select).toHaveValue('');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Default layanan',
      'google/gemini-3.1-flash-lite:nitro',
      'inception/mercury-2',
    ]);

    fireEvent.change(select, { target: { value: 'inception/mercury-2' } });
    await waitFor(() => expect(items[MIRA_PLAN_MODEL_STORAGE_KEY]).toBe('inception/mercury-2'));
  });

  it('shows the stored choice to an admin', async () => {
    session.role = 'admin';
    items[MIRA_PLAN_MODEL_STORAGE_KEY] = 'google/gemini-3.1-flash-lite:nitro';
    render(<MiraPlanModelPicker />);
    expect(await screen.findByLabelText('Model perencanaan MIRA')).toHaveValue(
      'google/gemini-3.1-flash-lite:nitro'
    );
  });

  it('is shown in a development build without an admin session', async () => {
    vi.stubEnv('DEV', true);
    render(<MiraPlanModelPicker />);
    expect(await screen.findByLabelText('Model perencanaan MIRA')).toBeInTheDocument();
  });

  it('is never shown to a physician', async () => {
    const { container } = render(<MiraPlanModelPicker />);
    await waitFor(() => expect(session.checks).toBe(1));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container).toBeEmptyDOMElement();
  });

  it('is hidden when the MIRA engine is off or no models are offered', () => {
    session.role = 'admin';
    vi.stubEnv('SENTRA_DIAGNOSIS_ENGINE', 'legacy');
    expect(render(<MiraPlanModelPicker />).container).toBeEmptyDOMElement();

    vi.stubEnv('SENTRA_DIAGNOSIS_ENGINE', 'mira');
    vi.stubEnv('VITE_MIRA_PLAN_MODELS', '');
    expect(render(<MiraPlanModelPicker />).container).toBeEmptyDOMElement();
  });
});
