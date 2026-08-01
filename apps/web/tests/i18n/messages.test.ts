import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const enPath = resolve(__dirname, '../../src/messages/en.json');
const bnPath = resolve(__dirname, '../../src/messages/bn.json');

const en: Record<string, string> = JSON.parse(readFileSync(enPath, 'utf8'));
const bn: Record<string, string> = JSON.parse(readFileSync(bnPath, 'utf8'));

describe('i18n message files', () => {
  it('bn.json is non-empty', () => {
    expect(Object.keys(bn).length).toBeGreaterThan(10);
  });

  it('bn.json has the same keys as en.json (full bilingual coverage)', () => {
    const enKeys = Object.keys(en).sort();
    const bnKeys = Object.keys(bn).sort();
    expect(bnKeys).toEqual(enKeys);
  });

  it('no English placeholders remain in bn.json', () => {
    // crude heuristic: every bn value should NOT equal its en counterpart
    // (otherwise it's still an untranslated placeholder)
    for (const key of Object.keys(en)) {
      const enVal = en[key] ?? '';
      const bnVal = bn[key] ?? '';
      if (enVal.trim() === '') continue;
      // Many short tokens like "OK" or numbers are fine to match, but UI
      // strings of length >= 8 chars should not be identical.
      if (enVal.length >= 8) {
        expect(bnVal).not.toBe(enVal);
      }
    }
  });
});