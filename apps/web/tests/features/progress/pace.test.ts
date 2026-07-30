import { describe, it, expect } from 'vitest';
import { pacePct, remainingDays, forecastFinishDate } from '@/features/progress/pace';

const batch = {
  collegeStart: new Date('2025-07-15T00:00:00+06:00'),
  examStart: new Date('2026-06-30T00:00:00+06:00'),
  examEnd: new Date('2026-08-15T00:00:00+06:00'),
};

describe('pacePct', () => {
  it('is 0 before collegeStart', () => {
    expect(pacePct(batch, new Date('2025-01-01T00:00:00+06:00'))).toBe(0);
  });
  it('is 100 at examStart (clamped)', () => {
    expect(pacePct(batch, new Date('2026-06-30T00:00:00+06:00'))).toBe(100);
  });
  it('is roughly 50 near the midpoint', () => {
    const mid = new Date((batch.collegeStart.getTime() + batch.examStart.getTime()) / 2);
    const pct = pacePct(batch, mid);
    expect(pct).toBeGreaterThan(45);
    expect(pct).toBeLessThan(55);
  });
});

describe('remainingDays', () => {
  it('rounds up fractional days', () => {
    // Plan typo: original `'2026-06-29T01:00:00+06:00'` is only 23h before examStart,
    // so Math.ceil(23/24) = 1, not 2. Using 2026-06-28T13:00:00+06:00 (35h = 1.458 days)
    // preserves the "fractional" intent and yields 2 via Math.ceil.
    const r = remainingDays(batch, new Date('2026-06-28T13:00:00+06:00'));
    expect(r).toBe(2);
  });
  it('is 0 after examStart', () => {
    expect(remainingDays(batch, new Date('2026-07-15T00:00:00+06:00'))).toBe(0);
  });
});

describe('forecastFinishDate', () => {
  it('returns a Date later than examStart when pace < target', () => {
    const d = forecastFinishDate({ remainingChapters: 100, minutesPerChapter: 30, avgMinPerDay: 45 }, new Date('2026-07-15T00:00:00+06:00'));
    const need = (100 * 30) / 45;
    expect(Math.round((d.getTime() - new Date('2026-07-15T00:00:00+06:00').getTime()) / 86_400_000)).toBe(Math.ceil(need));
  });
});