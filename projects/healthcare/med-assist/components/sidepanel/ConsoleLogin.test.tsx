import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConsoleLogin } from './ConsoleLogin';

const { mockLogin } = vi.hoisted(() => ({ mockLogin: vi.fn() }));

vi.mock('@/lib/api/auth-client', () => ({
  login: mockLogin,
  loginWithPasskey: vi.fn(),
  getAuthConfig: vi.fn(async () => ({ baseUrl: '' })),
}));

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  mockLogin.mockReset();
});

describe('ConsoleLogin', () => {
  // Chief, 2026-10-04: the sponsor page after login had a sound of its own; the only sound is
  // the welcome when the main UI opens.
  it('signs in without playing any sound', async () => {
    vi.useFakeTimers();
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    const user = { id: 'u-1', name: 'dr. Login Sintetis' };
    mockLogin.mockResolvedValue({ success: true, session: { user } });
    const onLoginSuccess = vi.fn();
    render(<ConsoleLogin onLoginSuccess={onLoginSuccess} />);

    fireEvent.change(screen.getByLabelText('Nama pengguna'), { target: { value: 'sintetis' } });
    fireEvent.change(screen.getByLabelText('Kata sandi'), { target: { value: 'rahasia-uji' } });
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(onLoginSuccess).toHaveBeenCalledWith(user);
    expect(play).not.toHaveBeenCalled();
  });

  // A MedBoard account that is not yet approved is refused; the user must read MedBoard's reason.
  it('shows the reason MedBoard refused the sign-in', async () => {
    mockLogin.mockResolvedValue({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Username/email atau password salah.' },
    });
    const onLoginSuccess = vi.fn();
    render(<ConsoleLogin onLoginSuccess={onLoginSuccess} />);

    fireEvent.change(screen.getByLabelText('Nama pengguna'), { target: { value: 'sintetis' } });
    fireEvent.change(screen.getByLabelText('Kata sandi'), { target: { value: 'salah-uji' } });
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Username/email atau password salah.'
    );
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });
});
