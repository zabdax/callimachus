import { describe, it, expect } from 'vitest';
import { newNonce } from '../src/presenceNonce';

describe('presenceNonce.newNonce', () => {
  it('returns a 12-char alphanumeric', () => {
    const n = newNonce();
    expect(n).toMatch(/^[A-Z0-9]{12}$/);
  });

  it('two calls produce different values (probabilistic)', () => {
    const a = newNonce();
    const b = newNonce();
    expect(a).not.toBe(b);
  });
});
