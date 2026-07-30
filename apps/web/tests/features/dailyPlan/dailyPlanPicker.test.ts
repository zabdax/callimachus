import { describe, it, expect } from 'vitest';
import { pickDailyPlan } from '@/features/dailyPlan/pickDailyPlan';

describe('pickDailyPlan', () => {
  it('sorts by scheduledFor and fits within 240 minutes', () => {
    const tasks = [
      { id: 'a', type: 'firstRevision', minutes: 30, scheduledFor: new Date('2026-08-05T08:00:00+06:00') },
      { id: 'b', type: 'secondRevision', minutes: 90, scheduledFor: new Date('2026-08-04T08:00:00+06:00') },
      { id: 'c', type: 'firstRevision', minutes: 60, scheduledFor: new Date('2026-08-04T07:00:00+06:00') },
      { id: 'd', type: 'thirdRevision', minutes: 60, scheduledFor: new Date('2026-08-04T09:00:00+06:00') },
      { id: 'e', type: 'firstRevision', minutes: 90, scheduledFor: new Date('2026-08-04T10:00:00+06:00') },
    ];
    const out = pickDailyPlan(tasks, 240);
    expect(out.map((t) => t.id)).toEqual(['c', 'b', 'd', 'a']);
  });
});
