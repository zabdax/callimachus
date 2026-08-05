import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'app.lang';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const value = (i18n.resolvedLanguage ?? i18n.language ?? 'en').split('-')[0];

  const onChange = (lng: string) => {
    void i18n.changeLanguage(lng);
    try {
      localStorage.setItem(STORAGE_KEY, lng);
    } catch {
      // localStorage unavailable (private mode) — silently fall back
    }
  };

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-medium">{t('settings.language')}</span>
      <select
        aria-label={t('settings.language')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-surface-2 bg-surface px-2 py-1 text-text"
      >
        <option value="en">{t('settings.language.en')}</option>
        <option value="bn">{t('settings.language.bn')}</option>
      </select>
    </label>
  );
}