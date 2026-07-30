import { describe, it, expect } from 'vitest';
import { mergeUsersMap, monthKey, pruneCutoff } from '../src/rollUpLeaderboards';

describe('rollUpLeaderboards helpers', () => {
  it('mergeUsersMap sums per-uid durations', () => {
    const out = mergeUsersMap([{ users: { a: 10, b: 20 } }, { users: { a: 5, c: 7 } }]);
    expect(out).toEqual({ a: 15, b: 20, c: 7 });
  });
  it('monthKey is YYYY-MM', () => {
    expect(monthKey(new Date('2026-07-29T00:00:00+06:00'))).toBe('2026-07');
  });
  it('pruneCutoff is 30 days ago', () => {
    const d = new Date('2026-07-29T00:00:00+06:00');
    expect(pruneCutoff(d).toISOString().slice(0, 10)).toBe('2026-06-29');
  });
});
