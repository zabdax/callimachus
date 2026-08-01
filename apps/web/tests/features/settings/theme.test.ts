import { describe, it, expect } from 'vitest';
import { applyTheme, getStoredTheme, type Theme } from '@/features/settings/theme';

describe('theme helpers', () => {
  it('applyTheme(dark) sets html class to dark and stores "dark"', () => {
    document.documentElement.classList.remove('dark', 'light');
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('app.theme')).toBe('dark');
  });

  it('applyTheme(light) sets html class to light', () => {
    document.documentElement.classList.remove('dark', 'light');
    applyTheme('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('applyTheme(auto) clears class and stores "auto"', () => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add('dark');
    applyTheme('auto');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.classList.contains('light')).toBe(false);
    expect(localStorage.getItem('app.theme')).toBe('auto');
  });

  it('getStoredTheme returns stored value or "auto"', () => {
    localStorage.clear();
    expect(getStoredTheme()).toBe<Theme>('auto');
    localStorage.setItem('app.theme', 'dark');
    expect(getStoredTheme()).toBe<Theme>('dark');
  });
});