import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('dev-only /__test/timer route', () => {
  const routerPath = resolve(__dirname, '../../src/app/router.tsx');
  const src = readFileSync(routerPath, 'utf8');

  it('is registered with a path of /__test/timer', () => {
    expect(src).toMatch(/path:\s*['"]\/__test\/timer['"]/);
  });

  it('is gated behind VITE_ENABLE_TEST_ROUTES so it never ships in prod', () => {
    expect(src).toMatch(/VITE_ENABLE_TEST_ROUTES/);
    expect(src).toMatch(/import\.meta\.env\.VITE_ENABLE_TEST_ROUTES\s*===\s*['"]true['"]/);
  });
});
