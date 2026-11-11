import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/ThemeToggle', () => ({
  default: () => <div data-testid="theme-toggle">theme-toggle</div>,
}));

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      getURL: (assetPath: string) => `chrome-extension://test${assetPath}`,
    },
  },
}));

import { DashboardView } from './DashboardView';

describe('DashboardView', () => {
  it('renders signed-in welcome state and routes launch/logout actions', () => {
    const onLaunchConsole = vi.fn();
    const onLogout = vi.fn();

    render(
      <DashboardView
        user={{
          id: 'doctor-1',
          username: 'chief',
          name: 'Chief',
          role: 'doctor',
          facilityId: 'facility-1',
          facilityName: 'Puskesmas Balowerti',
          poli: 'Umum',
        }}
        onLaunchConsole={onLaunchConsole}
        onLogout={onLogout}
      />
    );

    expect(screen.getByText(/Selamat datang,/i)).toBeTruthy();
    expect(screen.getByText('Chief')).toBeTruthy();
    expect(screen.getByText(/Puskesmas Balowerti/i)).toBeTruthy();
    expect(screen.getByTestId('theme-toggle')).toBeTruthy();
    expect(screen.getByText('Sentra HAI')).toBeTruthy();
    expect(screen.getByText('RSIA Melinda')).toBeTruthy();
    expect(screen.getByText('Anthropic')).toBeTruthy();
    expect(screen.getByText('OpenAI')).toBeTruthy();
    expect(screen.queryByText('Moonshot Kimi AI')).toBeNull();
    expect(screen.queryByText('Langflow')).toBeNull();
    expect(screen.queryByText('Sidelab')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Masuk ke ASSIST/i }));
    expect(onLaunchConsole).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Logout/i }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('hides logout affordance when no authenticated user is present', () => {
    render(<DashboardView user={null} onLaunchConsole={vi.fn()} onLogout={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /Logout/i })).toBeNull();
    expect(screen.getByRole('button', { name: /Masuk ke ASSIST/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Login ke Crew/i })).toBeNull();
  });
});
