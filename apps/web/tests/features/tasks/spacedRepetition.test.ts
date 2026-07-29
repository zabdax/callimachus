import { describe, it, expect } from 'vitest';
import { scheduleForFirstStudy } from '@/features/tasks/spacedRepetition';

describe('scheduleForFirstStudy', () => {
  it('returns 3 tasks at +7d, +14d, +30d from firstStudyDate', () => {
    const first = new Date('2026-07-29T10:00:00+06:00');
    const tasks = scheduleForFirstStudy({ subjectId: 's', chapterId: 'c' }, first);
    expect(tasks).toHaveLength(3);
    expect(tasks[0]!.scheduledFor.getTime() - first.getTime()).toBe(7 * 86400_000);
    expect(tasks[1]!.scheduledFor.getTime() - first.getTime()).toBe(14 * 86400_000);
    expect(tasks[2]!.scheduledFor.getTime() - first.getTime()).toBe(30 * 86400_000);
    expect(tasks.map((t) => t.type)).toEqual(['firstRevision', 'secondRevision', 'thirdRevision']);
  });
});
