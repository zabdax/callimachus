export type Theme = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'app.theme';

/**
 * Applies the theme to <html>:
 *  - 'light' / 'dark' set the matching class
 *  - 'auto' removes the class so the CSS media query decides
 */
export function applyTheme(theme: Theme): void {
  const html = document.documentElement;
  html.classList.remove('dark', 'light');
  if (theme !== 'auto') html.classList.add(theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage unavailable (private mode) — silently fall back
  }
}

export function getStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'auto') return v;
  } catch {
    // ignore
  }
  return 'auto';
}