import { describe, it, expect } from 'vitest';
import { hasConflict } from '@/features/dailyPlan/blocks';

const b = (startHour: number, durationMin: number, id = 'x') =>
  ({ id, startHour, durationMin, subjectId: 's', chapterId: 'c', completedAt: null as Date | null, date: '2026-07-30', uid: 'u1', source: 'manual' as const });

describe('hasConflict', () => {
  it('detects overlap on the same hour', () => {
    expect(hasConflict([b(9, 60, 'a')], b(9, 30, 'b'))).toBe(true);
  });
  it('allows adjacent blocks', () => {
    expect(hasConflict([b(9, 60, 'a')], b(10, 60, 'b'))).toBe(false);
  });
  it('ignores already-completed blocks', () => {
    expect(hasConflict([{ ...b(9, 60, 'a'), completedAt: new Date() }], b(9, 30, 'b'))).toBe(false);
  });
});
