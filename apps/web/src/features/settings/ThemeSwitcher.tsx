import { useState, useEffect } from 'react';
import { applyTheme, getStoredTheme, type Theme } from './theme';

const OPTIONS: Theme[] = ['light', 'dark', 'auto'];

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-medium">Theme</span>
      <select
        aria-label="Theme"
        value={theme}
        onChange={(e) => setTheme(e.target.value as Theme)}
        className="rounded-md border border-slate-300 px-2 py-1 bg-white"
      >
        {OPTIONS.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}