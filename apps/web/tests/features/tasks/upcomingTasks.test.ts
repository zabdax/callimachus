import { describe, it, expect } from 'vitest';
import { normalizeTask } from '@/features/tasks/upcomingTasks';

describe('normalizeTask', () => {
  it('converts a Firestore-shaped object to a Task with Date', () => {
    const t = normalizeTask({
      id: 't1',
      uid: 'u1',
      subjectId: 's',
      chapterId: 'c',
      type: 'firstRevision',
      source: 'auto-sr',
      status: 'pending',
      scheduledFor: { toDate: () => new Date('2026-08-05T00:00:00+06:00') },
      createdAt: { toDate: () => new Date('2026-07-29T00:00:00+06:00') },
    });
    expect(t.scheduledFor).toBeInstanceOf(Date);
    expect(t.type).toBe('firstRevision');
    expect(t.id).toBe('t1');
  });
});