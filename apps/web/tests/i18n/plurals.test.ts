import { describe, it, expect } from 'vitest';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const en = JSON.parse(
  readFileSync(resolve(__dirname, '../../src/messages/en.json'), 'utf8'),
);
const bn = JSON.parse(
  readFileSync(resolve(__dirname, '../../src/messages/bn.json'), 'utf8'),
);

async function makeI18n(lng: 'en' | 'bn') {
  const i = i18next.createInstance();
  await i.use(initReactI18next).init({
    resources: { en: { translation: en }, bn: { translation: bn } },
    lng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
  return i;
}

describe('ICU plural forms', () => {
  it('English: one renders singular for count=1', async () => {
    const i = await makeI18n('en');
    expect(i.t('streak.flame', { count: 1 })).toMatch(/1 day streak/);
  });

  it('English: other renders plural for count=5', async () => {
    const i = await makeI18n('en');
    expect(i.t('streak.flame', { count: 5 })).toMatch(/5 days streak/);
  });

  it('Bangla: renders the bn plural form', async () => {
    const i = await makeI18n('bn');
    const out = i.t('streak.flame', { count: 7 });
    expect(out).toMatch(/7/);
    expect(out).toMatch(/স্ট্রিক/);
  });
});