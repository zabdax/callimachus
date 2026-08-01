import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

describe('storage.rules', () => {
  const rulesPath = resolve(__dirname, '../../../../storage.rules');
  const rules = readFileSync(rulesPath, 'utf8');

  it('denies reads and writes by default at the root', () => {
    expect(rules).toMatch(/rules_version\s*=\s*'2'/);
    expect(rules).toMatch(/service\s+firebase\.storage/);
    expect(rules).toMatch(/match\s+\/\{path=\*\*\}\s*\{[^}]*allow\s+read,\s*write:\s*if\s+false;/s);
  });

  it('allows uploads to paymentRequests/{uid}/{file} when uid matches the requester', () => {
    expect(rules).toMatch(
      /match\s+\/paymentRequests\/\{uid\}\/\{file\}\s*\{[^}]*allow\s+write:\s*if[^;]*request\.auth\.uid\s*==\s*uid/s,
    );
  });

  it('restricts allowed content type to image/*', () => {
    expect(rules).toMatch(/request\.resource\.contentType\.matches\(['"]image\/.*['"]\)/);
  });

  it('rejects reads from a non-owner and from anonymous users', () => {
    expect(rules).toMatch(
      /match\s+\/paymentRequests\/\{uid\}\/\{file\}\s*\{[^}]*allow\s+read:\s*if\s+request\.auth\s*!=\s*null\s*&&[^;]*uid/s,
    );
  });
});
