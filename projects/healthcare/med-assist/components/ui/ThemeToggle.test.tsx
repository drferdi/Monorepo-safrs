import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const useThemeStoreMock = vi.fn();

vi.mock('../../lib/theme-store', () => ({
  useThemeStore: () => useThemeStoreMock(),
}));

import ThemeToggle from './ThemeToggle';

describe('ThemeToggle', () => {
  it('renders dark mode state and calls toggleTheme on click', () => {
    const toggleTheme = vi.fn();
    useThemeStoreMock.mockReturnValue({ theme: 'dark', toggleTheme });

    render(<ThemeToggle />);

    const button = screen.getByRole('button', { name: /switch to light mode/i });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(button);
    expect(toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('updates aria state for light mode', () => {
    useThemeStoreMock.mockReturnValue({ theme: 'light', toggleTheme: vi.fn() });

    render(<ThemeToggle />);

    const button = screen.getByRole('button', { name: /switch to dark mode/i });
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });
});
