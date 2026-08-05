import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const cfg = readFileSync(resolve(__dirname, '../../vite.config.ts'), 'utf8');

describe('PWA manifest wiring', () => {
  it('vite.config.ts imports vite-plugin-pwa', () => {
    expect(cfg).toMatch(/from\s+['"]vite-plugin-pwa['"]/);
  });

  it('vite.config.ts declares the HSC manifest name', () => {
    expect(cfg).toMatch(/name:\s*['"]HSC Crackers['"]/);
    expect(cfg).toMatch(/theme_color:\s*['"]#2E5A88['"]/);
    expect(cfg).toMatch(/background_color:\s*['"]#0F1620['"]/);
  });

  it('does not runtime-cache private Firestore responses', () => {
    expect(cfg).toMatch(/Do not runtime-cache private Firestore responses/);
    expect(cfg).toMatch(/runtimeCaching:\s*\[\]/);
  });
});