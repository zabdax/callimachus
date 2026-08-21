import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/messages/en.json';
import bn from '@/messages/bn.json';

export const LANG_STORAGE_KEY = 'app.lang';
const SUPPORTED = ['en', 'bn'] as const;

function initialLanguage(): string {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored && (SUPPORTED as readonly string[]).includes(stored)) return stored;
  } catch {
    // localStorage unavailable (private mode) — fall through
  }
  return (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('bn')) ? 'bn' : 'en';
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, bn: { translation: bn } },
    lng: initialLanguage(),
    fallbackLng: 'en',
    // v4 enables i18next's plurals + ICU-style placeholders.
    compatibilityJSON: 'v4',
    interpolation: { escapeValue: false },
    saveMissing: true,
    missingKeyHandler: (_lng, _ns, key) => console.warn(`[i18n] missing ${key}`),
  });
}

export { i18n };
export const t = i18n.t.bind(i18n);
