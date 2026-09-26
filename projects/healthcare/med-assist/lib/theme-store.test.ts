import { beforeEach, describe, expect, it } from 'vitest';
import { bootstrapThemeDocument, readPersistedTheme, THEME_STORAGE_KEY } from './theme-store';

describe('theme-store', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.removeAttribute('data-theme');
  });

  it('readPersistedTheme defaults to dark when storage empty', () => {
    expect(readPersistedTheme()).toBe('dark');
  });

  it('readPersistedTheme reads persisted zustand-shaped payload', () => {
    localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({ state: { theme: 'light' }, version: 0 })
    );
    expect(readPersistedTheme()).toBe('light');
  });

  it('bootstrapThemeDocument applies class and data-theme from storage', () => {
    localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({ state: { theme: 'light' }, version: 0 })
    );
    bootstrapThemeDocument();
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('bootstrapThemeDocument applies dark when storage says dark', () => {
    localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({ state: { theme: 'dark' }, version: 0 })
    );
    bootstrapThemeDocument();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
