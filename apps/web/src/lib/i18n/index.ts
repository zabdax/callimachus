import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/messages/en.json';
import bn from '@/messages/bn.json';

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, bn: { translation: bn } },
    lng: 'en',
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
